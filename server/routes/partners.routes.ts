import type { Express, Request, Response } from "express";
import express from "express";
import * as storage from "../storage";
import { getAdapter } from "../courier/index.ts";
import { pathaoIsDashboardConnectivityPing, normalizePathaoConsignmentId } from "../courier/pathao.ts";
import { buildPartnersOpenApi } from "./partnersOpenApi";

/**
 * Partner-facing surface. Decoupled from the admin auth so couriers can post
 * status webhooks unauthenticated; we verify HMAC signatures using the
 * per-courier `webhook_secret`.
 *
 * Pathao expects `X-Pathao-Merchant-Webhook-Integration-Secret` on success responses
 * (exact UUID from their checklist, stored as `webhook_integration_secret`).
 * Signing uses `webhook_secret` for `X-Pathao-Signature` on real events.
 *
 * Dashboard **Webhook integration TEST** POSTs `{ "event": "webhook integration" }` (variants).
 * That probe must receive **HTTP 202** plus the integration header — not 401/200-only.
 *
 * IMPORTANT: the webhook handler needs the verbatim request body for HMAC
 * verification, so we mount `express.raw` on this exact route. JSON bodies are
 * parsed manually inside the handler (NOT by the global `express.json` middleware,
 * which would strip the bytes the adapter needs).
 */
function pathaoMerchantIntegrationHeaderValue(courier: {
  partnerType: string;
  webhookIntegrationSecret: string | null;
}): string | null {
  if (courier.partnerType !== "pathao") return null;
  const v = (courier.webhookIntegrationSecret ?? "").trim();
  return v || null;
}

function setPathaoMerchantAckHeaders(
  res: Response,
  courier: { partnerType: string; webhookSecret: string | null; webhookIntegrationSecret: string | null },
) {
  const value = pathaoMerchantIntegrationHeaderValue(courier);
  if (value) res.setHeader("X-Pathao-Merchant-Webhook-Integration-Secret", value);
}

export function registerPartnerRoutes(app: Express) {
  app.post(
    "/api/partners/couriers/:slug/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      try {
        const slug = req.params.slug;
        const courier = await storage.getCourierBySlug(slug);
        if (!courier) return res.status(404).json({ ok: false, error: "Unknown courier slug." });
        if (!courier.active) return res.status(403).json({ ok: false, error: "Courier is inactive." });

        const rawBody = (req.body as Buffer) ?? Buffer.alloc(0);
        const adapter = getAdapter(courier.partnerType);
        const headers = req.headers as Record<string, string | string[] | undefined>;

        let parsedBody: unknown;
        try {
          parsedBody = rawBody.length > 0 ? JSON.parse(rawBody.toString("utf8")) : {};
        } catch {
          return res.status(400).json({ ok: false, error: "Body is not valid JSON." });
        }

        let verified = adapter.verifyWebhook({
          headers,
          rawBody,
          courier,
        });
        const isPathaoPing =
          courier.partnerType === "pathao" && pathaoIsDashboardConnectivityPing(parsedBody);
        /** Dashboard test payload: do not reject if HMAC fails (their probe may omit or mismatch sig). */
        if (!verified && isPathaoPing) {
          verified = true;
        }
        if (!verified) {
          // Allow query-token fallback for partners that cannot send signature headers.
          const tokenParam = typeof req.query.token === "string" ? req.query.token : undefined;
          const queryFallbackOk =
            !!tokenParam && !!courier.webhookSecret && tokenParam === courier.webhookSecret;
          if (!queryFallbackOk) {
            // eslint-disable-next-line no-console
            if (courier.partnerType === "pathao") {
              console.warn(
                `[partners] Pathao webhook rejected: invalid signature slug=${slug} hasSecret=${Boolean(courier.webhookSecret?.trim())}`,
              );
            }
            return res.status(401).json({ ok: false, error: "Invalid signature." });
          }
        }

        if (isPathaoPing) {
          const ack = pathaoMerchantIntegrationHeaderValue(courier);
          if (!ack) {
            return res.status(503).json({
              ok: false,
              error:
                "Pathao integration UUID missing: set Pathao integration response secret in admin (Couriers).",
            });
          }
          setPathaoMerchantAckHeaders(res, courier);
          // eslint-disable-next-line no-console
          console.info(`[partners] Pathao webhook connectivity probe 202 slug=${slug}`);
          return res.status(202).json({ ok: true, ignored: "pathao_connectivity_test" });
        }

        const event = adapter.parseWebhook(parsedBody);
        if (!event) {
          // Body shape we cannot interpret — still acknowledge so partner stops retrying.
          setPathaoMerchantAckHeaders(res, courier);
          const code = courier.partnerType === "pathao" ? 202 : 200;
          return res.status(code).json({ ok: true, ignored: true });
        }

        const order = await resolveOrderForEvent(event.partnerConsignmentId, parsedBody);
        if (!order) {
          // Unknown order — log to console and acknowledge so partners do not retry forever.
          // We intentionally do not 404 here.
          setPathaoMerchantAckHeaders(res, courier);
          const code = courier.partnerType === "pathao" ? 202 : 200;
          return res.status(code).json({ ok: true, ignored: "unknown_order" });
        }

        await storage.applyPartnerStatus(
          order.id,
          event.internalStatus,
          event.partnerStatus,
          (parsedBody as Record<string, unknown>) ?? {},
          { occurredAt: event.occurredAt, courierId: courier.id, note: event.note },
        );

        setPathaoMerchantAckHeaders(res, courier);
        const okCode = courier.partnerType === "pathao" ? 202 : 200;
        res.status(okCode).json({ ok: true, orderStatus: event.internalStatus ?? null });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("partner webhook error:", e);
        res.status(500).json({ ok: false, error: "Internal error." });
      }
    },
  );

  app.get("/api/partners/openapi.json", (req: Request, res: Response) => {
    const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? req.protocol;
    const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0] ?? req.headers.host ?? "";
    const serverUrl = `${proto}://${host}`;
    res.json(buildPartnersOpenApi(serverUrl));
  });
}

async function resolveOrderForEvent(
  consignmentId: string | undefined,
  body: unknown,
): Promise<{ id: string } | undefined> {
  if (consignmentId) {
    const normalized = normalizePathaoConsignmentId(consignmentId);
    const o =
      (await storage.getOrderByConsignmentId(normalized)) ||
      (normalized !== consignmentId ? await storage.getOrderByConsignmentId(consignmentId) : undefined);
    if (o) return o;
  }
  // Fall back to merchant_order_id (Pathao) / invoice (Steadfast) which both echo our order_number.
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const asId = (v: unknown): string | undefined => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
    return undefined;
  };
  const merchantOrderId =
    asId(b.merchant_order_id) ||
    asId(b.invoice) ||
    asId(b.order_number) ||
    undefined;
  if (merchantOrderId) {
    const o = await storage.getOrderByOrderNumber(merchantOrderId);
    if (o) return o;
  }
  return undefined;
}
