import { parseDecimalString } from "@shared/parseDecimalString";

export function formatBdt(amount: string | number): string {
  const n = typeof amount === "string" ? parseDecimalString(amount) : amount;
  if (Number.isNaN(n)) return "৳0";
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
