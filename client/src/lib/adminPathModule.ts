import type { AdminModuleKey } from "@shared/adminPermissions";

/** Must stay aligned with `ADMIN_MODULE_DEFS` in shared/adminPermissions.ts (every admin nav href). */
const PREFIX: [string, AdminModuleKey][] = [
  ["/", "dashboard"],
  ["/orders", "orders"],
  ["/products", "products"],
  ["/vendors", "vendors"],
  ["/couriers", "couriers"],
  ["/categories", "categories"],
  ["/banners", "banners"],
  ["/users", "users"],
  ["/roles", "roles"],
  ["/newsletter", "newsletter"],
  ["/reviews", "reviews"],
  ["/wishlist-stats", "wishlist_stats"],
  ["/profile", "dashboard"],
  ["/brand-trust-pages", "brand_trust"],
  ["/settings", "settings"],
  ["/payment-gateway", "payment_gateway"],
  ["/audit-logs", "audit_logs"],
];

export function adminModuleForPath(path: string): AdminModuleKey {
  const p = (path || "/").split("?")[0] || "/";
  const norm = p === "" ? "/" : p;
  if (norm === "/") return "dashboard";
  for (const [prefix, mod] of PREFIX) {
    if (prefix === "/") continue;
    if (norm === prefix || norm.startsWith(`${prefix}/`)) return mod;
  }
  return "dashboard";
}
