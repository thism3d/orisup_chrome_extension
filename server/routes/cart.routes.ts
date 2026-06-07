import type { Express } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { ensureGuestCartId, resolveCart } from "../middleware/auth";
import { parseDecimalString } from "../../shared/parseDecimalString";
import { shippingAddressSchema } from "../../shared/shippingAddressSchema";
import { buildShippingAddressRecord, computePathaoShippingFeeForCheckout } from "../lib/pathaoCheckoutQuote";

const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
  variantId: z.string().uuid().optional().nullable(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  paymentMethod: z.enum(["cod", "bkash", "bkash_auto", "nagad", "rocket", "upay", "stripe"]),
  shippingAddress: shippingAddressSchema,
});

export function registerCartRoutes(app: Express) {
  app.get("/api/cart", ensureGuestCartId, async (req, res) => {
    try {
      const cart = await resolveCart(req);
      const lines = await storage.getCartWithLines(cart.id);
      res.json({ cartId: cart.id, lines });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/cart/lines", ensureGuestCartId, async (req, res) => {
    const parsed = cartLineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const cart = await resolveCart(req);
    try {
      await storage.setCartLineQuantity(
        cart.id,
        parsed.data.productId,
        parsed.data.quantity,
        parsed.data.variantId ?? null,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg === "VARIANT_REQUIRED" ||
        msg === "INVALID_VARIANT" ||
        msg === "INSUFFICIENT_STOCK" ||
        msg === "PRODUCT_NOT_FOUND"
      ) {
        const human =
          msg === "VARIANT_REQUIRED"
            ? "This product requires a variant (size/color) before adding to cart."
            : msg === "INVALID_VARIANT"
              ? "Invalid variant for this product."
              : msg === "PRODUCT_NOT_FOUND"
                ? "Product not found."
                : "Not enough stock for this item.";
        return res.status(400).json({ error: human });
      }
      throw e;
    }
    const lines = await storage.getCartWithLines(cart.id);
    res.json({ cartId: cart.id, lines });
  });

  app.post("/api/cart/clear", ensureGuestCartId, async (req, res) => {
    const cart = await resolveCart(req);
    await storage.clearCart(cart.id);
    const lines = await storage.getCartWithLines(cart.id);
    res.json({ cartId: cart.id, lines });
  });

  app.post("/api/orders/checkout", ensureGuestCartId, async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const cart = await resolveCart(req);
    if (parsed.data.paymentMethod !== "cod") {
      return res.status(400).json({ error: "Use /api/payments/initiate for online payment methods." });
    }
    const lines = await storage.getCartWithLines(cart.id);
    if (lines.length === 0) return res.status(400).json({ error: "Cart is empty" });
    const orderLines = [];
    for (const row of lines) {
      const qty = row.line.quantity;
      const variant = row.variant;
      const nVar = await storage.countVariantsForProduct(row.product.id);
      if (nVar > 0) {
        if (!variant) {
          return res.status(400).json({ error: `Choose a variant for ${row.product.title}` });
        }
        if (qty > variant.stock) {
          return res.status(400).json({ error: `Insufficient stock for ${row.product.title}` });
        }
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
        variantLabelSnapshot:
          variant && variant.name && variant.value ? `${variant.name}: ${variant.value}` : null,
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
    const shippingRecord = buildShippingAddressRecord(parsed.data.shippingAddress);
    try {
      const order = await storage.createOrderWithItems({
        userId: req.session.userId ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        paymentMethod: parsed.data.paymentMethod,
        shippingAddress: shippingRecord,
        lines: orderLines,
        shippingFee: shipQuote.fee.toFixed(2),
      });
      await storage.clearCart(cart.id);
      res.json({ orderId: order.id, orderNumber: order.orderNumber });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      res.status(400).json({ error: msg });
    }
  });
}
