import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeBdPhoneForCourier } from "../lib/normalizeBdPhone";
import type { CourierAdapter } from "./types";
import { tenSecondTimeout } from "./types";
import type { OrderStatus } from "@shared/orderStatus";

/**
 * Pathao Merchant API v3 adapter.
 *
 * Outbound:
 *   1. POST {base}/aladdin/api/v1/issue-token  (OAuth2 client credentials)
 *   2. POST {base}/aladdin/api/v1/orders        (create shipment)
 *
 * Inbound webhook:
 *   - Header `X-Pathao-Signature` / `X-Signature` is HMAC-SHA256(rawBody, webhookSecret) hex (optional `sha256=` prefix).
 *   - Successful callbacks respond with **HTTP 202** and echo `webhook_integration_secret` as
 *     `X-Pathao-Merchant-Webhook-Integration-Secret` (Pathao checklist UUID — not the signing secret).
 *   - Body uses dot events such as `order.pickup-cancelled` plus `consignment_id` / `merchant_order_id`.
 *
 * Required `api_credentials` shape:
 *   { clientId, clientSecret, username, password, storeId,
 *     recipientCityId, recipientZoneId, recipientAreaId? }
 * City/zone IDs come from Pathao merchant dashboard / location APIs (not free text).
 */

export type PathaoCredentials = {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  storeId?: string | number;
  /** Default Pathao recipient_city (integer). Configure in admin courier credentials. */
  recipientCityId?: string | number;
  recipientZoneId?: string | number;
  recipientAreaId?: string | number;
};

/** Minimal courier row for Pathao Aladdin calls (store + OAuth + lists). */
export type PathaoCourierConfig = {
  id: string;
  apiBaseUrl: string | null;
  apiCredentials: Record<string, unknown> | null;
};

const CITY_LIST_TTL_MS = 6 * 60 * 60 * 1000;
const cityListCache = new Map<string, { expiresAt: number; payload: unknown }>();

type PathaoTokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const TOKEN_CACHE = new Map<string, PathaoTokenCacheEntry>();

export function readPathaoCredentials(courier: { apiCredentials: Record<string, unknown> | null }): PathaoCredentials {
  const c = (courier.apiCredentials ?? {}) as Record<string, unknown>;
  const num = (v: unknown): string | number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.trim());
      return Number.isFinite(n) ? n : v.trim();
    }
    return undefined;
  };
  return {
    clientId: typeof c.clientId === "string" ? c.clientId : undefined,
    clientSecret: typeof c.clientSecret === "string" ? c.clientSecret : undefined,
    username: typeof c.username === "string" ? c.username : undefined,
    password: typeof c.password === "string" ? c.password : undefined,
    storeId: c.storeId as string | number | undefined,
    recipientCityId: num(c.recipientCityId ?? c.recipient_city_id),
    recipientZoneId: num(c.recipientZoneId ?? c.recipient_zone_id),
    recipientAreaId: num(c.recipientAreaId ?? c.recipient_area_id),
  };
}

/** Extract human-readable detail from Pathao JSON error responses (422, etc.). */
function formatPathaoApiMessage(json: unknown): string {
  if (json == null || typeof json !== "object") return "";
  const o = json as Record<string, unknown>;
  const parts: string[] = [];
  const msg = o.message ?? o.error_message ?? o.error;
  if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
  if (Array.isArray(o.errors)) {
    for (const e of o.errors) {
      if (typeof e === "string" && e.trim()) parts.push(e.trim());
      else if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        parts.push(String((e as { message: string }).message).trim());
      }
    }
  } else if (o.errors && typeof o.errors === "object") {
    /** Pathao 422 often uses `{ errors: { field: ["msg"] } }`. */
    for (const [key, val] of Object.entries(o.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string" && item.trim()) parts.push(`${key}: ${item.trim()}`);
        }
      } else if (typeof val === "string" && val.trim()) {
        parts.push(`${key}: ${val.trim()}`);
      }
    }
  }
  if (o.data && typeof o.data === "object") {
    const nested = formatPathaoApiMessage(o.data);
    if (nested) parts.push(nested);
  }
  return parts.filter(Boolean).join(" — ");
}

function pathaoResponseLooksFailed(json: unknown): { failed: boolean; reason?: string } {
  if (json == null || typeof json !== "object") return { failed: false };
  const o = json as Record<string, unknown>;
  if (o.error === true) {
    const m = typeof o.message === "string" ? o.message : "Pathao returned error: true";
    return { failed: true, reason: m };
  }
  if (o.success === false) {
    const m = typeof o.message === "string" ? o.message : "Pathao success: false";
    return { failed: true, reason: m };
  }
  return { failed: false };
}

export async function issuePathaoToken(baseUrl: string, creds: PathaoCredentials): Promise<string> {
  const cacheKey = `${baseUrl}::${creds.clientId ?? ""}::${creds.username ?? ""}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error("Pathao credentials missing (clientId, clientSecret, username, password required).");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/aladdin/api/v1/issue-token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      username: creds.username,
      password: creds.password,
      grant_type: "password",
    }),
    signal: tenSecondTimeout(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pathao token error ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Pathao token response missing access_token.");
  const expiresAt = Date.now() + (json.expires_in ? json.expires_in * 1000 : 60 * 60 * 1000) - 60_000;
  TOKEN_CACHE.set(cacheKey, { token: json.access_token, expiresAt });
  return json.access_token;
}

/** @internal */
function readCreds(courier: { apiCredentials: Record<string, unknown> | null }): PathaoCredentials {
  return readPathaoCredentials(courier);
}

/** @internal */
async function issueToken(baseUrl: string, creds: PathaoCredentials): Promise<string> {
  return issuePathaoToken(baseUrl, creds);
}

/**
 * Pathao returns cities/zones in `data` or nested `data.data` (WooCommerce bridge shape).
 */
function extractPathaoListData(json: unknown): unknown[] {
  if (json == null || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  const d = o.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && Array.isArray((d as Record<string, unknown>).data)) {
    return (d as Record<string, unknown>).data as unknown[];
  }
  return [];
}

export type PathaoCityRow = { city_id: number; city_name: string };
export type PathaoZoneRow = { zone_id: number; zone_name: string };
export type PathaoAreaRow = {
  area_id: number;
  area_name: string;
  home_delivery_available?: boolean;
  pickup_available?: boolean;
};

export async function pathaoListCities(courier: PathaoCourierConfig): Promise<{ ok: true; cities: PathaoCityRow[] } | { ok: false; error: string }> {
  if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
  const creds = readCreds(courier);
  const cacheKey = courier.id;
  const hit = cityListCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    const cities = hit.payload as PathaoCityRow[];
    return { ok: true, cities };
  }
  let token: string;
  try {
    token = await issueToken(courier.apiBaseUrl, creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const base = courier.apiBaseUrl.replace(/\/+$/, "");
  const url = `${base}/aladdin/api/v1/countries/1/city-list`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: tenSecondTimeout(),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: formatPathaoApiMessage(json) || `Pathao city-list ${res.status}` };
  }
  const raw = extractPathaoListData(json);
  const cities: PathaoCityRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.city_id ?? r.id);
    const name = typeof r.city_name === "string" ? r.city_name : typeof r.name === "string" ? r.name : "";
    if (Number.isFinite(id) && id > 0 && name) cities.push({ city_id: id, city_name: name });
  }
  cityListCache.set(cacheKey, { expiresAt: Date.now() + CITY_LIST_TTL_MS, payload: cities });
  return { ok: true, cities };
}

export async function pathaoListZones(
  courier: PathaoCourierConfig,
  cityId: number,
): Promise<{ ok: true; zones: PathaoZoneRow[] } | { ok: false; error: string }> {
  if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
  if (!Number.isFinite(cityId) || cityId <= 0) return { ok: false, error: "Invalid city id." };
  const creds = readCreds(courier);
  let token: string;
  try {
    token = await issueToken(courier.apiBaseUrl, creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const base = courier.apiBaseUrl.replace(/\/+$/, "");
  const url = `${base}/aladdin/api/v1/cities/${cityId}/zone-list`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: tenSecondTimeout(),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: formatPathaoApiMessage(json) || `Pathao zone-list ${res.status}` };
  }
  const raw = extractPathaoListData(json);
  const zones: PathaoZoneRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.zone_id ?? r.id);
    const name = typeof r.zone_name === "string" ? r.zone_name : typeof r.name === "string" ? r.name : "";
    if (Number.isFinite(id) && id > 0 && name) zones.push({ zone_id: id, zone_name: name });
  }
  return { ok: true, zones };
}

export async function pathaoListAreas(
  courier: PathaoCourierConfig,
  zoneId: number,
): Promise<{ ok: true; areas: PathaoAreaRow[] } | { ok: false; error: string }> {
  if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
  if (!Number.isFinite(zoneId) || zoneId <= 0) return { ok: false, error: "Invalid zone id." };
  const creds = readCreds(courier);
  let token: string;
  try {
    token = await issueToken(courier.apiBaseUrl, creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const base = courier.apiBaseUrl.replace(/\/+$/, "");
  const url = `${base}/aladdin/api/v1/zones/${zoneId}/area-list`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: tenSecondTimeout(),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: formatPathaoApiMessage(json) || `Pathao area-list ${res.status}` };
  }
  const raw = extractPathaoListData(json);
  const areas: PathaoAreaRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.area_id ?? r.id);
    const name = typeof r.area_name === "string" ? r.area_name : typeof r.name === "string" ? r.name : "";
    if (Number.isFinite(id) && id > 0 && name) {
      areas.push({
        area_id: id,
        area_name: name,
        home_delivery_available: typeof r.home_delivery_available === "boolean" ? r.home_delivery_available : undefined,
        pickup_available: typeof r.pickup_available === "boolean" ? r.pickup_available : undefined,
      });
    }
  }
  return { ok: true, areas };
}

export type PathaoPricePlanParams = {
  itemWeight: number;
  recipientCity: number;
  recipientZone: number;
  itemType?: number;
  deliveryType?: number;
};

/**
 * POST /aladdin/api/v1/merchant/price-plan — delivery fee estimate.
 */
export async function pathaoMerchantPricePlan(
  courier: PathaoCourierConfig,
  params: PathaoPricePlanParams,
): Promise<{ ok: true; fee: number; raw: unknown } | { ok: false; error: string; raw?: unknown }> {
  if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
  const creds = readCreds(courier);
  if (!creds.storeId) return { ok: false, error: "Pathao storeId missing in api_credentials." };
  let token: string;
  try {
    token = await issueToken(courier.apiBaseUrl, creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const storeId = Number(creds.storeId);
  if (!Number.isFinite(storeId) || storeId <= 0) return { ok: false, error: "Pathao storeId must be a positive number." };
  const w = Math.max(0.5, Math.min(10, params.itemWeight));
  const body = {
    store_id: storeId,
    item_type: params.itemType ?? 2,
    delivery_type: params.deliveryType ?? 48,
    item_weight: w,
    recipient_city: params.recipientCity,
    recipient_zone: params.recipientZone,
  };
  const url = `${courier.apiBaseUrl.replace(/\/+$/, "")}/aladdin/api/v1/merchant/price-plan`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: tenSecondTimeout(),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      error: formatPathaoApiMessage(json) || `Pathao price-plan ${res.status}`,
      raw: json ?? undefined,
    };
  }
  const fail = pathaoResponseLooksFailed(json);
  if (fail.failed) {
    return { ok: false, error: fail.reason ?? "Pathao price-plan rejected", raw: json ?? undefined };
  }
  let fee = NaN;
  if (json && typeof json === "object") {
    const d = (json as Record<string, unknown>).data;
    if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      const fp = o.final_price ?? o.finalPrice;
      const p = o.price;
      if (typeof fp === "number" && Number.isFinite(fp)) fee = fp;
      else if (typeof fp === "string" && Number.isFinite(Number(fp))) fee = Number(fp);
      else if (typeof p === "number" && Number.isFinite(p)) fee = p;
      else if (typeof p === "string" && Number.isFinite(Number(p))) fee = Number(p);
    }
  }
  if (!Number.isFinite(fee) || fee < 0) {
    return { ok: false, error: "Pathao price-plan: could not parse delivery fee from response.", raw: json ?? undefined };
  }
  return { ok: true, fee: Math.round(fee * 100) / 100, raw: json };
}

/** Heuristic parcel weight (kg) for Pathao when products have no weight column. */
export function pathaoDefaultItemWeightKgFromLineQuantities(quantities: number[]): number {
  const sum = quantities.reduce((a, q) => a + Math.max(0, q), 0);
  return Math.max(0.5, Math.min(10, sum * 0.5));
}

/** Price-plan using cart line quantities for default item weight. */
export async function pathaoQuoteDeliveryForCart(
  courier: PathaoCourierConfig,
  input: { recipientCity: number; recipientZone: number; lineQuantities: number[] },
): Promise<{ ok: true; fee: number; raw: unknown } | { ok: false; error: string; raw?: unknown }> {
  const w = pathaoDefaultItemWeightKgFromLineQuantities(input.lineQuantities);
  return pathaoMerchantPricePlan(courier, {
    itemWeight: w,
    recipientCity: input.recipientCity,
    recipientZone: input.recipientZone,
  });
}

function pathaoIdsFromShippingAddress(addr: Record<string, unknown>): {
  cityId?: number;
  zoneId?: number;
  areaId?: number;
} {
  const pickNum = (...keys: string[]): number | undefined => {
    for (const k of keys) {
      const v = addr[k];
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.trim()) : NaN;
      if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
    return undefined;
  };
  return {
    cityId: pickNum("pathaoCityId", "pathao_city_id", "recipientCityId", "recipient_city"),
    zoneId: pickNum("pathaoZoneId", "pathao_zone_id", "recipientZoneId", "recipient_zone"),
    areaId: pickNum("pathaoAreaId", "pathao_area_id", "recipientAreaId", "recipient_area"),
  };
}

/**
 * Pathao Merchant webhooks send `event` like `order.pickup-requested` (dots + hyphens).
 * We normalize to snake_case (`order_pickup_requested`) and map here.
 *
 * `__info` means: do not change `orders.status`; we still append a customer-facing
 * timeline note on `order_status_history` when the webhook is processed.
 */
const PATHAO_INFO = "__info" as const;
type PathaoWebhookTarget = OrderStatus | typeof PATHAO_INFO;

/** Dot-notation + legacy short names → internal status or informational-only marker. */
const PATHAO_EVENT_TO_TARGET: Record<string, PathaoWebhookTarget> = {
  // --- Merchant API v3 style (`order.*`) ---
  order_created: PATHAO_INFO,
  order_updated: PATHAO_INFO,
  order_pickup_requested: "assigned_to_courier",
  order_assigned_for_pickup: "assigned_to_courier",
  order_picked: "in_transit",
  order_pickup_failed: "assigned_to_courier",
  order_pickup_cancelled: "cancelled",
  order_at_the_sorting_hub: "in_transit",
  order_in_transit: "in_transit",
  order_received_at_last_mile_hub: "in_transit",
  order_on_hold: PATHAO_INFO,
  order_assigned_for_delivery: "out_for_delivery",
  order_delivered: "delivered",
  order_partial_delivery: "delivered",
  order_returned: "returned",
  order_delivery_failed: PATHAO_INFO,
  order_paid: PATHAO_INFO,
  order_paid_return: "returned",
  order_exchanged: "delivered",
  order_return_id_created: PATHAO_INFO,
  order_return_in_transit: PATHAO_INFO,
  order_returned_to_merchant: "returned",
  // --- Legacy / alternate short keys (no `order.` prefix) ---
  pickup_requested: "assigned_to_courier",
  assigned_for_pickup: "assigned_to_courier",
  pickup: "in_transit",
  pickup_failed: "assigned_to_courier",
  pickup_cancelled: "cancelled",
  at_the_sorting_hub: "in_transit",
  in_the_sorting_hub: "in_transit",
  in_transit: "in_transit",
  received_at_last_mile_hub: "in_transit",
  on_hold: PATHAO_INFO,
  out_for_delivery: "out_for_delivery",
  assigned_for_delivery: "out_for_delivery",
  delivered: "delivered",
  partial_delivery: "delivered",
  return: "returned",
  returned: "returned",
  paid_return: "returned",
  exchange: "delivered",
  cancelled: "cancelled",
};

/** Human `order_status` / slug values (older payloads) → internal status. */
const PATHAO_ORDER_STATUS_SLUG_MAP: Record<string, OrderStatus> = {
  pickup_requested: "assigned_to_courier",
  assigned_to_hub: "assigned_to_courier",
  assigned_for_pickup: "assigned_to_courier",
  pickup: "in_transit",
  at_sorting_hub: "in_transit",
  at_the_sorting_hub: "in_transit",
  in_transit: "in_transit",
  received_at_last_mile_hub: "in_transit",
  on_hold: "in_transit",
  out_for_delivery: "out_for_delivery",
  assigned_for_delivery: "out_for_delivery",
  delivered: "delivered",
  partial_delivered: "delivered",
  partial_delivery: "delivered",
  return: "returned",
  returned: "returned",
  cancelled: "cancelled",
};

function normalizeEvent(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "_")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function normalizePathaoConsignmentId(raw: string): string {
  return String(raw).trim().replace(/^#+/, "").trim();
}

function pickHeader(headers: Record<string, string | string[] | undefined>, canonical: string): string | undefined {
  const want = canonical.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== want) continue;
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return undefined;
}

function sanitizePartnerReason(reason: unknown): string | undefined {
  if (typeof reason !== "string") return undefined;
  const t = reason.trim();
  if (!t) return undefined;
  if (/might not be present|this field might not/i.test(t)) return undefined;
  return t.length > 200 ? `${t.slice(0, 197)}…` : t;
}

/** Short customer-facing sentence for timeline / notes (English; storefront may localize later). */
function pathaoCustomerNote(eventNorm: string, reason?: string): string {
  const suffix = reason ? ` — ${reason}` : "";
  const notes: Record<string, string> = {
    order_created: "Your delivery partner registered this shipment.",
    order_updated: "Your courier updated this shipment.",
    order_pickup_requested: "Pickup has been requested from your courier.",
    order_assigned_for_pickup: "A courier rider is assigned for pickup.",
    order_picked: "Your parcel was picked up by the courier.",
    order_pickup_failed: "Pickup could not be completed. The courier may try again.",
    order_pickup_cancelled: "Pickup was cancelled by the delivery partner.",
    order_at_the_sorting_hub: "Your parcel arrived at the courier sorting hub.",
    order_in_transit: "Your parcel is on the way.",
    order_received_at_last_mile_hub: "Your parcel reached the delivery hub near you.",
    order_on_hold: "Your parcel is temporarily on hold with the courier.",
    order_assigned_for_delivery: "A rider is on the way to deliver your parcel.",
    order_delivered: "Your parcel was delivered.",
    order_partial_delivery: "Your parcel was partially delivered.",
    order_returned: "Your parcel is being returned.",
    order_delivery_failed: "Delivery could not be completed. The courier may try again.",
    order_paid: "Courier billing was updated for this shipment.",
    order_paid_return: "Return payment was recorded by the courier.",
    order_exchanged: "An exchange was completed by the courier.",
    order_return_id_created: "A return shipment was created by the courier.",
    order_return_in_transit: "Your return parcel is on the way back.",
    order_returned_to_merchant: "The return reached the sender location.",
  };
  const base = notes[eventNorm] ?? "Your courier sent a delivery update.";
  return `${base}${suffix}`.trim();
}

function pathaoTargetFromBody(eventNorm: string, orderStatusSlug: string): PathaoWebhookTarget | undefined {
  const direct = PATHAO_EVENT_TO_TARGET[eventNorm];
  if (direct !== undefined) return direct;
  if ((eventNorm === "order_status" || eventNorm === "order_status_update") && orderStatusSlug) {
    return PATHAO_ORDER_STATUS_SLUG_MAP[orderStatusSlug] ?? PATHAO_INFO;
  }
  /** Unknown future `order.*` events: still accept and record a timeline entry. */
  if (eventNorm.startsWith("order_")) return PATHAO_INFO;
  return undefined;
}

/**
 * Pathao’s webhook TEST uses a synthetic `event` without a real order. Known shapes:
 * `{ "event": "webhook integration" }`, `{ "event": "Webhook Integration" }`,
 * `{ "event": "webhook.integration" }` (see Pathao dashboard docs).
 * Signature may be missing or not match our HMAC (Pathao’s automated test); the merchant
 * dashboard expects **HTTP 202** plus `X-Pathao-Merchant-Webhook-Integration-Secret`.
 */
export function pathaoIsDashboardConnectivityPing(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const raw = (body as Record<string, unknown>).event;
  return typeof raw === "string" && normalizeEvent(raw) === "webhook_integration";
}

export const pathaoAdapter: CourierAdapter = {
  partnerType: "pathao",

  async testConnection(courier) {
    if (!courier.apiBaseUrl) return { ok: false, error: "API base URL is not set." };
    try {
      const token = await issueToken(courier.apiBaseUrl, readPathaoCredentials(courier));
      return { ok: true, message: `Issued token (${token.slice(0, 6)}…)` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async createShipment({ order, items, courier }) {
    if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
    const creds = readCreds(courier);
    if (!creds.storeId) return { ok: false, error: "Pathao storeId missing in api_credentials." };
    let token: string;
    try {
      token = await issueToken(courier.apiBaseUrl, creds);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const addr = (order.shippingAddress ?? {}) as Record<string, unknown>;
    const description = items
      .slice(0, 4)
      .map((it) => `${it.titleSnapshot} ×${it.quantity}`)
      .join(", ");
    const itemQty = items.reduce((n, it) => n + Number(it.quantity || 0), 0);
    const codAmount = order.paymentMethod === "cod" ? Number(order.total) : 0;

    const fromAddr = pathaoIdsFromShippingAddress(addr);
    const cityNum = fromAddr.cityId ?? Number(creds.recipientCityId);
    const zoneNum = fromAddr.zoneId ?? Number(creds.recipientZoneId);
    const areaFromAddr = fromAddr.areaId;
    const areaFromCreds = creds.recipientAreaId != null ? Number(creds.recipientAreaId) : NaN;
    const areaNum = Number.isFinite(areaFromAddr as number) && (areaFromAddr as number) > 0 ? areaFromAddr! : areaFromCreds;

    if (!Number.isFinite(cityNum) || cityNum <= 0 || !Number.isFinite(zoneNum) || zoneNum <= 0) {
      return {
        ok: false,
        error:
          "Pathao: set recipient city and zone on the order shipping address (checkout Pathao location), " +
          "or set default recipient city ID and zone ID in courier api_credentials (admin → Couriers → Pathao). " +
          "Use IDs from the Pathao merchant dashboard or their cities/zones APIs — they are not the same as free-text address fields.",
      };
    }
    const itemWeight = pathaoDefaultItemWeightKgFromLineQuantities(items.map((it) => Number(it.quantity || 0)));

    const body: Record<string, unknown> = {
      store_id: creds.storeId,
      merchant_order_id: order.orderNumber,
      recipient_name: order.customerName,
      recipient_phone: normalizeBdPhoneForCourier(order.customerPhone),
      recipient_address: [addr.line1, addr.line2, addr.city, addr.district, addr.postalCode]
        .filter(Boolean)
        .join(", "),
      recipient_city: cityNum,
      recipient_zone: zoneNum,
      delivery_type: 48, // 48 = normal delivery, 12 = on-demand. Tunable later.
      item_type: 2,
      item_quantity: Math.max(1, itemQty),
      item_weight: itemWeight,
      amount_to_collect: codAmount,
      item_description: description.slice(0, 250),
    };
    if (Number.isFinite(areaNum) && areaNum > 0) {
      body.recipient_area = areaNum;
    }

    const url = `${courier.apiBaseUrl.replace(/\/+$/, "")}/aladdin/api/v1/orders`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: tenSecondTimeout(),
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const json = (await res.json().catch(() => null)) as
      | { data?: { consignment_id?: string | number; merchant_order_id?: string } }
      | { consignment_id?: string | number }
      | null;
    if (!res.ok) {
      const detail = formatPathaoApiMessage(json);
      const err = detail ? `Pathao create order ${res.status}: ${detail}` : `Pathao create order ${res.status}`;
      return { ok: false, error: err, raw: json ?? undefined };
    }
    const failCreate = pathaoResponseLooksFailed(json);
    if (failCreate.failed) {
      return {
        ok: false,
        error: `Pathao create order rejected: ${failCreate.reason ?? "unknown"}`,
        raw: json ?? undefined,
      };
    }
    const rawCid =
      (json && "data" in json && json.data?.consignment_id != null && json.data.consignment_id) ||
      (json && "consignment_id" in json && json.consignment_id != null && json.consignment_id) ||
      null;
    const consignmentId =
      rawCid == null ? undefined : typeof rawCid === "number" ? String(Math.trunc(rawCid)) : String(rawCid).trim();
    if (!consignmentId) {
      return { ok: false, error: "Pathao create order: missing consignment_id in response.", raw: json ?? undefined };
    }
    return { ok: true, consignmentId, raw: json };
  },

  async cancelShipment({ order, courier }) {
    if (!courier.apiBaseUrl) return { ok: false, error: "Pathao API base URL is not set." };
    if (!order.partnerConsignmentId) return { ok: false, error: "Order has no consignment id to cancel." };
    const creds = readCreds(courier);
    let token: string;
    try {
      token = await issueToken(courier.apiBaseUrl, readCreds(courier));
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const url = `${courier.apiBaseUrl.replace(/\/+$/, "")}/aladdin/api/v1/orders/${encodeURIComponent(
      order.partnerConsignmentId,
    )}/cancel`;
    const cancelBody: Record<string, unknown> = {};
    if (creds.storeId != null && String(creds.storeId).trim()) {
      cancelBody.store_id = creds.storeId;
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(cancelBody),
        signal: tenSecondTimeout(),
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = formatPathaoApiMessage(json);
      const err = detail ? `Pathao cancel ${res.status}: ${detail}` : `Pathao cancel ${res.status}`;
      return { ok: false, error: err, raw: json ?? undefined };
    }
    const fail = pathaoResponseLooksFailed(json);
    if (fail.failed) {
      const detail = formatPathaoApiMessage(json);
      return {
        ok: false,
        error: detail || fail.reason || "Pathao cancel rejected",
        raw: json ?? undefined,
      };
    }
    return { ok: true, raw: json };
  },

  verifyWebhook({ headers, rawBody, courier }) {
    const secret = (courier.webhookSecret ?? "").trim();
    if (!secret) return false;
    const sig = pickHeader(headers, "x-pathao-signature") ?? pickHeader(headers, "x-signature");
    if (!sig) return false;
    const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
    const trimmed = sig.replace(/^sha256=/i, "").trim().replace(/^0x/i, "");
    if (trimmed.toLowerCase() === expectedHex.toLowerCase()) return true;
    try {
      const a = Buffer.from(trimmed, "hex");
      const b = Buffer.from(expectedHex, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parseWebhook(body) {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const strKey = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;
    const numKey = (v: unknown): string | undefined =>
      typeof v === "number" && Number.isFinite(v) ? String(Math.trunc(v)) : undefined;

    const eventSrc = strKey(b.event) ?? "";
    if (!eventSrc) return null;
    const eventNorm = normalizeEvent(eventSrc);
    if (eventNorm.startsWith("store_")) return null;

    const statusSrcRaw =
      strKey(b.order_status) ??
      strKey(b.orderStatus as string | undefined) ??
      strKey(b.order_status_slug) ??
      strKey(b.status) ??
      "";
    const statusSlug = statusSrcRaw ? normalizeEvent(statusSrcRaw) : "";

    const target = pathaoTargetFromBody(eventNorm, statusSlug);
    if (target === undefined) return null;

    const internalStatus: OrderStatus | undefined = target === PATHAO_INFO ? undefined : target;

    const consignmentRaw =
      strKey(b.consignment_id) ??
      numKey(b.consignment_id) ??
      strKey(b.consignmentId) ??
      numKey(b.consignmentId);
    const consignment = consignmentRaw ? normalizePathaoConsignmentId(consignmentRaw) : undefined;

    const reason = sanitizePartnerReason(b.reason ?? b.message);
    const note = pathaoCustomerNote(eventNorm, reason);

    const occurredRaw = (b.updated_at ?? b.timestamp ?? b.created_at) as string | undefined;
    const occurredAt = occurredRaw ? new Date(occurredRaw) : undefined;

    const partnerStatus = eventNorm || statusSlug || "unknown";

    return {
      partnerStatus,
      internalStatus,
      partnerConsignmentId: consignment,
      occurredAt: occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt : undefined,
      note,
    };
  },
};
