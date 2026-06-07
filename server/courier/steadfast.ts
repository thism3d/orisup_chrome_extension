import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeBdPhoneForCourier } from "../lib/normalizeBdPhone";
import type { CourierAdapter } from "./types";
import { tenSecondTimeout } from "./types";
import type { OrderStatus } from "@shared/orderStatus";

/**
 * Steadfast Courier Limited adapter.
 *
 * Outbound:
 *   - Auth headers `Api-Key` + `Secret-Key` from `api_credentials`.
 *   - POST {base}/api/v1/create_order
 *   - GET  {base}/api/v1/get_balance         (used for testConnection)
 *   - DELETE {base}/api/v1/cancel_order/{id} (used for cancelShipment)
 *
 * Inbound webhook:
 *   - Optional header `X-Steadfast-Signature` is HMAC-SHA256(rawBody, webhookSecret) hex.
 *   - When the signature header is absent the partner can pass the secret as
 *     `?token=...` query — that fallback lives in the route, not the adapter.
 *
 * Required `api_credentials` shape:
 *   { apiKey, secretKey }
 */

type SteadfastCredentials = {
  apiKey?: string;
  secretKey?: string;
};

function readCreds(courier: { apiCredentials: Record<string, unknown> | null }): SteadfastCredentials {
  return (courier.apiCredentials ?? {}) as SteadfastCredentials;
}

const STEADFAST_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "assigned_to_courier",
  in_review: "assigned_to_courier",
  hold: "assigned_to_courier",
  in_transit: "in_transit",
  unknown: "in_transit",
  delivered_approval_pending: "out_for_delivery",
  partial_delivered_approval_pending: "out_for_delivery",
  cancelled_approval_pending: "in_transit",
  unknown_approval_pending: "in_transit",
  delivered: "delivered",
  partial_delivered: "delivered",
  return: "returned",
  returned: "returned",
  cancelled: "cancelled",
};

function normalizeStatus(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
}

function authHeaders(creds: SteadfastCredentials): Record<string, string> {
  return {
    "Api-Key": creds.apiKey ?? "",
    "Secret-Key": creds.secretKey ?? "",
    "content-type": "application/json",
    accept: "application/json",
  };
}

export const steadfastAdapter: CourierAdapter = {
  partnerType: "steadfast",

  async testConnection(courier) {
    if (!courier.apiBaseUrl) return { ok: false, error: "API base URL is not set." };
    const creds = readCreds(courier);
    if (!creds.apiKey || !creds.secretKey) return { ok: false, error: "Steadfast apiKey/secretKey missing." };
    try {
      const res = await fetch(`${courier.apiBaseUrl.replace(/\/+$/, "")}/api/v1/get_balance`, {
        method: "GET",
        headers: authHeaders(creds),
        signal: tenSecondTimeout(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Steadfast ${res.status}: ${text || res.statusText}` };
      }
      const json = (await res.json().catch(() => null)) as { current_balance?: number } | null;
      return {
        ok: true,
        message: json?.current_balance != null ? `Balance: ${json.current_balance}` : "OK",
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async createShipment({ order, courier }) {
    if (!courier.apiBaseUrl) return { ok: false, error: "Steadfast API base URL is not set." };
    const creds = readCreds(courier);
    if (!creds.apiKey || !creds.secretKey) return { ok: false, error: "Steadfast apiKey/secretKey missing." };
    const addr = (order.shippingAddress ?? {}) as Record<string, unknown>;
    const recipientAddress = [addr.line1, addr.line2, addr.city, addr.district, addr.postalCode]
      .filter(Boolean)
      .join(", ");
    const codAmount = order.paymentMethod === "cod" ? Number(order.total) : 0;
    const body = {
      invoice: order.orderNumber,
      recipient_name: order.customerName,
      recipient_phone: normalizeBdPhoneForCourier(order.customerPhone),
      recipient_address: recipientAddress,
      cod_amount: codAmount,
      note: "",
    };
    let res: Response;
    try {
      res = await fetch(`${courier.apiBaseUrl.replace(/\/+$/, "")}/api/v1/create_order`, {
        method: "POST",
        headers: authHeaders(creds),
        body: JSON.stringify(body),
        signal: tenSecondTimeout(),
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const json = (await res.json().catch(() => null)) as
      | { consignment?: { consignment_id?: string | number; tracking_code?: string } }
      | null;
    if (!res.ok) return { ok: false, error: `Steadfast create_order ${res.status}`, raw: json ?? undefined };
    const consignmentId =
      json?.consignment?.consignment_id != null
        ? String(json.consignment.consignment_id)
        : json?.consignment?.tracking_code;
    if (!consignmentId) {
      return {
        ok: false,
        error: "Steadfast create_order: missing consignment_id/tracking_code in response.",
        raw: json ?? undefined,
      };
    }
    return { ok: true, consignmentId, raw: json };
  },

  async cancelShipment({ order, courier }) {
    if (!courier.apiBaseUrl) return { ok: false, error: "Steadfast API base URL is not set." };
    if (!order.partnerConsignmentId) return { ok: false, error: "Order has no consignment id to cancel." };
    const creds = readCreds(courier);
    let res: Response;
    try {
      res = await fetch(
        `${courier.apiBaseUrl.replace(/\/+$/, "")}/api/v1/cancel_order/${encodeURIComponent(order.partnerConsignmentId)}`,
        {
          method: "DELETE",
          headers: authHeaders(creds),
          signal: tenSecondTimeout(),
        },
      );
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: `Steadfast cancel ${res.status}`, raw: json ?? undefined };
    return { ok: true, raw: json };
  },

  verifyWebhook({ headers, rawBody, courier }) {
    const secret = courier.webhookSecret;
    if (!secret) return false;
    const headerValue =
      headers["x-steadfast-signature"] ?? headers["X-Steadfast-Signature"] ?? headers["x-signature"];
    const sig = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!sig) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parseWebhook(body) {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const statusRaw =
      (b.status ?? b.delivery_status ?? b.consignment_status ?? "") as string | undefined;
    const status = typeof statusRaw === "string" ? normalizeStatus(statusRaw) : "";
    const internalStatus = STEADFAST_STATUS_MAP[status];
    const consignment =
      (typeof b.consignment_id === "string" && b.consignment_id) ||
      (typeof b.consignment_id === "number" && String(b.consignment_id)) ||
      (typeof b.tracking_code === "string" && b.tracking_code) ||
      undefined;
    const occurredRaw = (b.updated_at ?? b.created_at) as string | undefined;
    const occurredAt = occurredRaw ? new Date(occurredRaw) : undefined;
    return {
      partnerStatus: status || "unknown",
      internalStatus,
      partnerConsignmentId: consignment,
      occurredAt: occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt : undefined,
      note: typeof b.note === "string" ? b.note : undefined,
    };
  },
};
