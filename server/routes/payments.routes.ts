import express, { type Express } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { ensureGuestCartId, resolveCart } from "../middleware/auth";
import { parseDecimalString } from "../../shared/parseDecimalString";
import {
  initiateOrlenpayDirectCheckout,
  OrlenpayGatewayError,
  verifyOrlenpaySignature,
} from "../lib/orlenpayClient";
import { shippingAddressSchema } from "../../shared/shippingAddressSchema";
import { buildShippingAddressRecord, computePathaoShippingFeeForCheckout } from "../lib/pathaoCheckoutQuote";

const providerSchema = z.enum(["bkash", "bkash_auto", "nagad", "rocket", "upay", "stripe"]);

const initiateSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  provider: providerSchema,
  shippingAddress: shippingAddressSchema,
});

const callbackSchema = z.object({
  payment_id: z.string().optional(),
  external_ref: z.string().optional(),
  reference_no: z.string().optional(),
  /** Same as reference_no on many OrlenPay payloads (order/client ref). */
  client_ref_no: z.string().optional(),
  merchant_reference_no: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  provider: z.string().optional(),
  provider_session_token: z.string().optional(),
});

/** Distinct non-empty ref strings from the callback (OrlenPay sends several aliases). */
function collectPaymentLookupRefs(data: z.infer<typeof callbackSchema>): string[] {
  const raw = [
    data.external_ref,
    data.reference_no,
    data.client_ref_no,
    data.merchant_reference_no,
    data.provider_session_token,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = typeof s === "string" ? s.trim() : "";
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

async function resolvePaymentForOrlenpayCallback(data: z.infer<typeof callbackSchema>) {
  const pid = typeof data.payment_id === "string" ? data.payment_id.trim() : "";
  if (pid) {
    const byId = await storage.getPaymentById(pid);
    if (byId) return byId;
  }
  for (const ref of collectPaymentLookupRefs(data)) {
    const byRef = await storage.getPaymentByExternalRef(ref);
    if (byRef) return byRef;
  }
  return undefined;
}

function normalizeCallbackStatus(input: string | undefined): "pending" | "processing" | "completed" | "failed" | "cancelled" {
  const s = (input ?? "").trim().toLowerCase();
  if (["success", "completed", "paid"].includes(s)) return "completed";
  if (["failed", "failure", "error"].includes(s)) return "failed";
  if (["cancelled", "canceled"].includes(s)) return "cancelled";
  if (["processing", "in_progress"].includes(s)) return "processing";
  return "pending";
}

export function registerPaymentRoutes(app: Express) {
  app.post("/api/payments/initiate", ensureGuestCartId, async (req, res) => {
    const platformSettings = await storage.getPlatformSettingsMap();
    const directFlag =
      (process.env.ORLENBD_DIRECT_PROVIDER_CHECKOUT ?? platformSettings.orlenbd_direct_provider_checkout ?? "false")
        .trim()
        .toLowerCase();
    if (directFlag !== "true") {
      return res.status(403).json({ error: "Direct provider checkout is disabled." });
    }
    const parsed = initiateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const cart = await resolveCart(req);
    const lines = await storage.getCartWithLines(cart.id);
    if (lines.length === 0) return res.status(400).json({ error: "Cart is empty" });

    const orderLines = [];
    for (const row of lines) {
      const qty = row.line.quantity;
      const variant = row.variant;
      const nVar = await storage.countVariantsForProduct(row.product.id);
      if (nVar > 0) {
        if (!variant) return res.status(400).json({ error: `Choose a variant for ${row.product.title}` });
        if (qty > variant.stock) return res.status(400).json({ error: `Insufficient stock for ${row.product.title}` });
      } else if (qty > row.product.stock) {
        return res.status(400).json({ error: `Insufficient stock for ${row.product.title}` });
      }

      const unitPriceStr = variant ? String(variant.price) : String(row.product.price);
      const price = parseDecimalString(unitPriceStr);
      const label =
        variant && variant.name && variant.value
          ? `${row.product.title} (${variant.name}: ${variant.value})`
          : row.product.title;

      orderLines.push({
        productId: row.product.id,
        title: label,
        price: unitPriceStr,
        quantity: qty,
        lineTotal: (price * qty).toFixed(2),
        variantId: variant?.id ?? null,
        variantLabelSnapshot: variant && variant.name && variant.value ? `${variant.name}: ${variant.value}` : null,
      });
    }

    const pathaoCourier = await storage.getDefaultPathaoCourier();
    if (pathaoCourier) {
      const a = parsed.data.shippingAddress;
      const city = a.pathaoCityId;
      const zone = a.pathaoZoneId;
      if (city == null || zone == null || !Number.isFinite(city) || !Number.isFinite(zone)) {
        return res.status(400).json({ error: "Select Pathao city and zone for delivery." });
      }
    }

    const subtotal = orderLines.reduce((acc, l) => acc + parseDecimalString(l.lineTotal), 0);
    const waived = await storage.orderLinesQualifyFreeDelivery(
      orderLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      subtotal,
    );
    const shipQuote = waived
      ? ({ ok: true as const, fee: 0 })
      : await computePathaoShippingFeeForCheckout(
          pathaoCourier,
          orderLines.map((l) => l.quantity),
          parsed.data.shippingAddress,
        );
    if (!shipQuote.ok) return res.status(400).json({ error: shipQuote.error });
    const shippingFee = shipQuote.fee;
    const grandTotal = subtotal + shippingFee;
    const shippingRecord = buildShippingAddressRecord(parsed.data.shippingAddress);
    const externalRef = `ORLENBD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    let provisionalOrderId: string | null = null;
    try {
      const order = await storage.createOrderWithItems({
        userId: req.session.userId ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        paymentMethod: parsed.data.provider,
        shippingAddress: shippingRecord,
        lines: orderLines,
        shippingFee: shippingFee.toFixed(2),
        initialPayment: {
          method: parsed.data.provider,
          amount: grandTotal.toFixed(2),
          status: "initiated",
          provider: parsed.data.provider,
          externalRef,
          gatewayMeta: { source: "orlenbd_direct_checkout" },
        },
        deferFulfillmentUntilPayment: true,
      });
      provisionalOrderId = order.id;

      const payment = await storage.getLatestPaymentForOrder(order.id);
      if (!payment) throw new Error("Payment row creation failed");

      const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? req.protocol;
      const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0] ?? req.get("host");
      const origin = `${proto}://${host}`;
      const returnUrl = `${origin}/checkout/payment-return?order=${encodeURIComponent(order.orderNumber)}&payment=${encodeURIComponent(payment.id)}`;
      const callbackUrl = `${origin}/api/payments/callback/orlenpay`;

      // Normalize to BD-style 11-digit local MSISDN: strip non-digits, keep last 11 when longer (e.g. 880171…).
      const customerMsisdnDigits = parsed.data.customerPhone.replace(/\D/g, "");
      const customerMsisdn =
        customerMsisdnDigits.length >= 11
          ? customerMsisdnDigits.slice(-11)
          : customerMsisdnDigits.length >= 10 && customerMsisdnDigits.length <= 15
            ? customerMsisdnDigits
            : undefined;

      const init = await initiateOrlenpayDirectCheckout(
        {
          amount: grandTotal.toFixed(2),
          provider: parsed.data.provider,
          clientRefNo: order.orderNumber,
          externalRef,
          callbackUrl,
          returnUrl,
          orderNumber: order.orderNumber,
          customerMsisdn,
        },
        origin,
        platformSettings
      );

      await storage.updatePaymentGatewayInitiation(payment.id, {
        status: "processing",
        externalRef: init.gatewayReference,
        providerSessionToken: init.providerSessionToken,
        statusDetail: "Initiated with OrlenPay",
        gatewayMeta: init.raw,
      });
      await storage.appendPaymentEvent({
        paymentId: payment.id,
        direction: "outbound",
        kind: "initiate",
        status: "processing",
        payload: init.raw,
      });

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: payment.id,
        redirectUrl: init.redirectUrl,
      });
    } catch (err) {
      if (provisionalOrderId) {
        await storage.abandonProvisionalCheckoutOrder(provisionalOrderId).catch(() => undefined);
      }
      let code: string | undefined;
      let message = err instanceof Error ? err.message : "Payment initiation failed";
      if (err instanceof OrlenpayGatewayError) {
        code = err.code;
        const c = (code ?? "").toLowerCase();
        if (c === "no_available_instant_device" || c === "no_available_instant_devices") {
          message = "Payment method is currently unavailable. Please choose another method or try again later.";
        }
      }
      return res.status(400).json({ error: message, code });
    }
  });

  app.post(
    "/api/payments/callback/orlenpay",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
    const platformSettings = await storage.getPlatformSettingsMap();
    const directFlag =
      (process.env.ORLENBD_DIRECT_PROVIDER_CHECKOUT ?? platformSettings.orlenbd_direct_provider_checkout ?? "false")
        .trim()
        .toLowerCase();
    if (directFlag !== "true") {
      return res.status(403).json({ error: "Direct provider checkout is disabled." });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    const signature =
      (req.headers["x-orlenpay-signature"] as string | undefined) ??
      (req.headers["x-callback-signature"] as string | undefined) ??
      (req.headers["x-signature"] as string | undefined) ??
      undefined;
    let isValidSignature = false;
    try {
      isValidSignature = verifyOrlenpaySignature(rawBody, signature, platformSettings);
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Callback secret misconfigured" });
    }
    if (!isValidSignature) {
      return res.status(401).json({ error: "Invalid callback signature" });
    }

    let bodyJson: unknown;
    try {
      bodyJson = rawBody.length > 0 ? JSON.parse(rawBody.toString("utf8")) : {};
    } catch {
      return res.status(400).json({ error: "Callback body is not valid JSON." });
    }

    const parsed = callbackSchema.safeParse(bodyJson);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const status = normalizeCallbackStatus(parsed.data.status);
    const payment = await resolvePaymentForOrlenpayCallback(parsed.data);

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    // Keep gateway merchant ref when present so later callbacks (e.g. cancelled) still match
    // `payments.externalRef` even if a prior `payment.processing` sent `reference_no` only.
    const nextExternalRef =
      parsed.data.external_ref?.trim() ||
      parsed.data.merchant_reference_no?.trim() ||
      parsed.data.reference_no?.trim() ||
      parsed.data.client_ref_no?.trim() ||
      payment.externalRef;

    await storage.markPaymentCallback({
      paymentId: payment.id,
      status,
      statusDetail: parsed.data.message ?? null,
      externalRef: nextExternalRef,
      providerSessionToken: parsed.data.provider_session_token ?? payment.providerSessionToken,
      gatewayMeta: parsed.data as Record<string, unknown>,
    });
    await storage.appendPaymentEvent({
      paymentId: payment.id,
      direction: "inbound",
      kind: "callback",
      status,
      payload: parsed.data as Record<string, unknown>,
    });

    return res.json({ ok: true });
  });

  app.get("/api/payments/:id/status", async (req, res) => {
    const p = await storage.getPaymentById(req.params.id);
    if (!p) return res.status(404).json({ error: "Payment not found" });
    return res.json({
      paymentId: p.id,
      status: p.status,
      statusDetail: p.statusDetail,
      orderId: p.orderId,
      externalRef: p.externalRef,
      callbackReceivedAt: p.callbackReceivedAt,
    });
  });
}
