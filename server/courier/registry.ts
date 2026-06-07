import type { CourierAdapter, PartnerType } from "./types";
import { manualAdapter } from "./manual";
import { pathaoAdapter } from "./pathao";
import { steadfastAdapter } from "./steadfast";

const ADAPTERS: Record<PartnerType, CourierAdapter> = {
  manual: manualAdapter,
  pathao: pathaoAdapter,
  steadfast: steadfastAdapter,
};

export function isPartnerType(value: string): value is PartnerType {
  return value in ADAPTERS;
}

/**
 * Resolve an adapter by partner type, falling back to the manual adapter so
 * dispatch + status flows still work for couriers without an integration.
 */
export function getAdapter(partnerType: string): CourierAdapter {
  if (isPartnerType(partnerType)) return ADAPTERS[partnerType];
  return manualAdapter;
}

export function listPartnerTypes(): PartnerType[] {
  return Object.keys(ADAPTERS) as PartnerType[];
}
