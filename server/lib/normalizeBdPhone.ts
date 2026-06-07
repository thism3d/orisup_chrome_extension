/**
 * Normalize Bangladesh phone numbers for storage and courier APIs.
 *
 * Rules:
 * - Trim and remove common separators (spaces, dashes, parentheses, dots).
 * - If the string starts with `+88`, strip that prefix (so `+88017…` becomes `017…`).
 * - If digit-only and starts with `880` (country code without `+`), strip `880`.
 * - If the remaining value is 10 digits and does not start with `0`, prepend `0`
 *   (e.g. `1785418587` → `01785418587`).
 *
 * Idempotent: values already `01…` are unchanged.
 */
export function normalizeBdPhone(input: string): string {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "";

  let s = raw.replace(/[\s\-().]/g, "");
  if (!s) return raw.trim();

  if (s.startsWith("+88")) {
    s = s.slice(3);
  } else if (/^880\d{7,}$/.test(s)) {
    s = s.slice(3);
  }

  if (!/^\d+$/.test(s)) {
    return raw.replace(/[\s\-().]/g, "");
  }

  if (s.length === 10 && !s.startsWith("0")) {
    s = `0${s}`;
  }

  return s;
}

/** @deprecated Use {@link normalizeBdPhone}; kept for call-site clarity in courier adapters. */
export const normalizeBdPhoneForCourier = normalizeBdPhone;
