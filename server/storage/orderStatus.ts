import { eq } from "drizzle-orm";
import { db } from "../db";
import { orders, orderStatusHistory } from "../../shared/schema";
import {
  ORDER_STATUS_TRANSITIONS,
  isOrderStatus,
  isTerminalOrderStatus,
} from "../../shared/orderStatus";

/**
 * Update order status while enforcing the {@link ORDER_STATUS_TRANSITIONS} map.
 * Pass `{ force: true }` to bypass the map (used for admin cancellations and
 * idempotent partner webhook replays). Also stamps the lifecycle timestamps
 * (`pickedUpAt`, `deliveredAt`, `lastPartnerEventAt`) when the target status
 * implies them.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
  opts?: { force?: boolean; occurredAt?: Date; markPartnerEvent?: boolean; actorUserId?: string | null },
): Promise<{ ok: true; transitioned: boolean } | { ok: false; error: string }> {
  const [current] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!current) return { ok: false, error: "not_found" };

  const force = opts?.force === true;
  if (current.status === status) {
    if (note != null) {
      await db.insert(orderStatusHistory).values({ orderId, status, note });
    }
    if (opts?.markPartnerEvent) {
      await db
        .update(orders)
        .set({
          lastPartnerEventAt: opts.occurredAt ?? new Date(),
          updatedAt: new Date(),
          ...(opts.actorUserId ? { updatedByUserId: opts.actorUserId } : {}),
        })
        .where(eq(orders.id, orderId));
    }
    return { ok: true, transitioned: false };
  }

  if (!force) {
    if (!isOrderStatus(current.status) || !isOrderStatus(status)) {
      return { ok: false, error: "invalid_transition" };
    }
    if (isTerminalOrderStatus(current.status)) return { ok: false, error: "terminal" };
    const allowed = ORDER_STATUS_TRANSITIONS[current.status];
    if (!allowed.includes(status)) return { ok: false, error: "invalid_transition" };
  }

  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  const occurred = opts?.occurredAt ?? new Date();
  if (status === "in_transit" || status === "out_for_delivery") set.pickedUpAt = occurred;
  if (status === "delivered") set.deliveredAt = occurred;
  if (opts?.markPartnerEvent) set.lastPartnerEventAt = occurred;
  if (opts?.actorUserId) set.updatedByUserId = opts.actorUserId;

  await db.update(orders).set(set as Partial<(typeof orders.$inferInsert)>).where(eq(orders.id, orderId));
  await db.insert(orderStatusHistory).values({ orderId, status, note: note ?? null });
  return { ok: true, transitioned: true };
}
