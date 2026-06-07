/**
 * Parse API/DB decimal strings that may use thousands separators (e.g. "13,500.00").
 */
export function parseDecimalString(raw: string | null | undefined): number {
  if (raw == null) return NaN;
  const s = String(raw).replace(/,/g, "").trim();
  if (!s) return NaN;
  return Number.parseFloat(s);
}
