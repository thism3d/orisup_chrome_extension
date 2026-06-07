import { z } from "zod";

/** Accepts JSON numbers or numeric strings (e.g. from loose clients). */
function optionalPathaoPositiveInt() {
  return z.preprocess((val: unknown) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    const n = parseInt(String(val).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().int().positive().optional());
}

/** Checkout / order shipping payload; Pathao IDs optional when no active Pathao courier. */
export const shippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().optional(),
  pathaoCityId: optionalPathaoPositiveInt(),
  pathaoZoneId: optionalPathaoPositiveInt(),
  pathaoAreaId: optionalPathaoPositiveInt(),
  pathaoCityName: z.string().max(200).optional(),
  pathaoZoneName: z.string().max(200).optional(),
  pathaoAreaName: z.string().max(200).optional(),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
