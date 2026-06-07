import type { Courier } from "../../shared/schema";
import { pathaoQuoteDeliveryForCart } from "../courier/pathao";
import type { ShippingAddressInput } from "../../shared/shippingAddressSchema";

export function pathaoCourierConfig(courier: Courier) {
  return {
    id: courier.id,
    apiBaseUrl: courier.apiBaseUrl,
    apiCredentials: courier.apiCredentials,
  };
}

/**
 * Server-side delivery fee for checkout. No Pathao courier → 0.
 * Pathao courier active → requires `pathaoCityId` and `pathaoZoneId` on the address payload.
 */
export async function computePathaoShippingFeeForCheckout(
  pathaoCourier: Courier | undefined,
  lineQuantities: number[],
  addr: ShippingAddressInput,
): Promise<{ ok: true; fee: number } | { ok: false; error: string }> {
  if (!pathaoCourier) return { ok: true, fee: 0 };
  const city = addr.pathaoCityId;
  const zone = addr.pathaoZoneId;
  if (city == null || zone == null || !Number.isFinite(city) || !Number.isFinite(zone)) {
    return { ok: false, error: "Select Pathao city and zone for delivery." };
  }
  const r = await pathaoQuoteDeliveryForCart(pathaoCourierConfig(pathaoCourier), {
    recipientCity: city,
    recipientZone: zone,
    lineQuantities,
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, fee: r.fee };
}

/** Persist Pathao + human-readable lines on the order JSON blob. */
export function buildShippingAddressRecord(addr: ShippingAddressInput): Record<string, unknown> {
  return {
    line1: addr.line1,
    line2: addr.line2 ?? "",
    city: addr.city,
    district: addr.district,
    postalCode: addr.postalCode ?? "",
    ...(addr.pathaoCityId != null ? { pathaoCityId: addr.pathaoCityId } : {}),
    ...(addr.pathaoZoneId != null ? { pathaoZoneId: addr.pathaoZoneId } : {}),
    ...(addr.pathaoAreaId != null ? { pathaoAreaId: addr.pathaoAreaId } : {}),
    ...(addr.pathaoCityName ? { pathaoCityName: addr.pathaoCityName } : {}),
    ...(addr.pathaoZoneName ? { pathaoZoneName: addr.pathaoZoneName } : {}),
    ...(addr.pathaoAreaName ? { pathaoAreaName: addr.pathaoAreaName } : {}),
  };
}
