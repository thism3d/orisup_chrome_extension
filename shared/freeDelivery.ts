import { parseDecimalString } from "./parseDecimalString";

/** Columns needed to evaluate checkout free-delivery rules (matches `products`). */
export type ProductFreeDeliveryFields = {
  freeDeliveryEnabled: boolean;
  /** Minimum cart subtotal (all lines) required; null/empty → rule not applied. */
  freeDeliveryMinCartAmount: string | null;
  /** Minimum quantity of this product in the cart; null → rule not applied. */
  freeDeliveryMinQuantity: number | null;
};

function minCartAmountThreshold(p: ProductFreeDeliveryFields): number | null {
  if (p.freeDeliveryMinCartAmount == null || p.freeDeliveryMinCartAmount === "") return null;
  const n = parseDecimalString(String(p.freeDeliveryMinCartAmount));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function minQtyThreshold(p: ProductFreeDeliveryFields): number | null {
  const q = p.freeDeliveryMinQuantity;
  if (q == null || !Number.isFinite(Number(q))) return null;
  const n = Number(q);
  if (n <= 0) return null;
  return n;
}

/**
 * One cart line qualifies for waived delivery fee if:
 * - `freeDeliveryEnabled`, and
 * - no thresholds → always; otherwise cart subtotal and/or line quantity thresholds apply.
 * When both thresholds are set, meeting either counts (OR).
 */
export function productLineQualifiesFreeDelivery(
  product: ProductFreeDeliveryFields,
  lineQuantity: number,
  cartSubtotal: number,
): boolean {
  if (!product.freeDeliveryEnabled) return false;
  const minAmt = minCartAmountThreshold(product);
  const minQty = minQtyThreshold(product);
  const hasAmt = minAmt != null;
  const hasQty = minQty != null;

  if (!hasAmt && !hasQty) return true;

  const amtOk = hasAmt && cartSubtotal + 1e-9 >= minAmt!;
  const qtyOk = hasQty && lineQuantity >= minQty!;

  if (hasAmt && hasQty) return amtOk || qtyOk;
  if (hasAmt) return amtOk;
  return qtyOk;
}

/**
 * True only when every line qualifies for waived delivery (same carrier fee rules).
 * Empty cart → false.
 */
export function cartQualifiesForFreeDelivery(
  cartSubtotal: number,
  lines: Array<{ product: ProductFreeDeliveryFields; quantity: number }>,
): boolean {
  if (lines.length === 0) return false;
  return lines.every((l) => productLineQualifiesFreeDelivery(l.product, l.quantity, cartSubtotal));
}
