/**
 * Single source of truth for order lifecycle states across server, admin UI,
 * vendor UI, and customer-facing pages.
 *
 * Lifecycle:
 *   pending -> confirmed -> at_warehouse -> assigned_to_courier
 *           -> in_transit -> out_for_delivery -> delivered            (happy path)
 *
 * Branches (terminal):
 *   - returned   (parcel rejected by customer / undeliverable)
 *   - cancelled  (admin or courier cancellation)
 *
 * Server-side, only transitions listed in ORDER_STATUS_TRANSITIONS are allowed.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "at_warehouse",
  "assigned_to_courier",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderStatusChipColor =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  at_warehouse: "At warehouse",
  assigned_to_courier: "Assigned to courier",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, OrderStatusChipColor> = {
  pending: "warning",
  confirmed: "primary",
  at_warehouse: "info",
  assigned_to_courier: "info",
  in_transit: "info",
  out_for_delivery: "info",
  delivered: "success",
  returned: "default",
  cancelled: "error",
};

/**
 * Allowed forward transitions per status. Empty array means terminal.
 * `cancelled` can be reached from any non-terminal state by privileged callers
 * (admin); the server route includes the explicit "cancel anytime" branch.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["at_warehouse", "cancelled"],
  at_warehouse: ["assigned_to_courier", "cancelled"],
  assigned_to_courier: ["in_transit", "returned", "cancelled"],
  in_transit: ["out_for_delivery", "returned", "cancelled"],
  out_for_delivery: ["delivered", "returned", "in_transit"],
  delivered: [],
  returned: [],
  cancelled: [],
};

export function isTerminalOrderStatus(s: string): boolean {
  return s === "delivered" || s === "returned" || s === "cancelled";
}

export function isOrderStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(s);
}

/** Returns true if `from` -> `to` is a permitted transition (idempotent same-state allowed). */
export function canTransitionOrderStatus(from: string, to: string): boolean {
  if (from === to) return true;
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false;
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses a vendor user is allowed to set on their own orders. */
export const VENDOR_SETTABLE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "at_warehouse",
  "cancelled",
];
