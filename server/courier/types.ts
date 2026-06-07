import type { Courier, Order, OrderItem } from "@shared/schema";
import type { OrderStatus } from "@shared/orderStatus";

export type PartnerType = "manual" | "pathao" | "steadfast";

/**
 * Outcome shape for outbound calls (createShipment / cancelShipment).
 * `raw` carries the partner's full response so we can persist it on the
 * `courier_events` row for debugging.
 */
export type AdapterOutcome<T> =
  | ({ ok: true; raw: unknown } & T)
  | { ok: false; error: string; raw?: unknown };

export interface CreateShipmentInput {
  order: Order;
  items: OrderItem[];
  courier: Courier;
  /** Public-facing webhook URL the partner should call back. Some carriers require it on the create call. */
  webhookUrl?: string;
}

export interface CreateShipmentResult {
  consignmentId: string;
  etaAt?: Date;
}

export interface CancelShipmentInput {
  order: Order;
  courier: Courier;
}

/** Optional fields a carrier may echo back when the shipment is successfully cancelled. */
export interface CancelShipmentResult {
  cancelledAt?: Date;
}

export interface VerifyWebhookInput {
  headers: Record<string, string | string[] | undefined>;
  /** Verbatim request body bytes — required for HMAC verification. */
  rawBody: Buffer;
  courier: Courier;
}

/**
 * Parsed webhook event. `internalStatus` is the mapped {@link OrderStatus};
 * if undefined, the webhook is purely informational and should not transition
 * the order (still logged as a `courier_events` row for the timeline).
 */
export interface ParsedWebhook {
  partnerStatus: string;
  internalStatus?: OrderStatus;
  partnerConsignmentId?: string;
  occurredAt?: Date;
  note?: string;
}

export interface CourierAdapter {
  partnerType: PartnerType;
  /** Optional cheap connectivity check (e.g. issue OAuth token, fetch balance). */
  testConnection?(courier: Courier): Promise<{ ok: true; message: string } | { ok: false; error: string }>;
  createShipment(input: CreateShipmentInput): Promise<AdapterOutcome<CreateShipmentResult>>;
  cancelShipment(input: CancelShipmentInput): Promise<AdapterOutcome<CancelShipmentResult>>;
  verifyWebhook(input: VerifyWebhookInput): boolean;
  parseWebhook(body: unknown): ParsedWebhook | null;
}

/** Convenience: a 10-second AbortSignal for outbound HTTP calls. */
export function tenSecondTimeout(): AbortSignal {
  // Node 18+ ships AbortSignal.timeout; fall back to a manual controller for older runtimes.
  if (typeof (AbortSignal as unknown as { timeout?: (n: number) => AbortSignal }).timeout === "function") {
    return (AbortSignal as unknown as { timeout: (n: number) => AbortSignal }).timeout(10_000);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), 10_000).unref?.();
  return c.signal;
}
