import { z } from "zod";

const specificationRowSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

/** Strips incomplete rows ({ label/value } after trim empty) before validation; empty list becomes null. */
export const specificationsJsonField = () =>
  z.preprocess((raw: unknown) => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!Array.isArray(raw)) return raw;
    const out: { label: string; value: string }[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const label = String(o.label ?? "").trim();
      const value = String(o.value ?? "").trim();
      if (!label || !value) continue;
      out.push({ label, value });
    }
    return out.length ? out : null;
  }, z.array(specificationRowSchema).nullable().optional());
