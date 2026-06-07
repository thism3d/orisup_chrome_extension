import { z } from "zod";

/**
 * Keys match API middleware (`P.view("…")` etc.) and client routing (`adminPathModule`).
 * When adding a new admin sidebar destination: add an entry here and map its path in
 * `client/src/lib/adminPathModule.ts`.
 */
export const ADMIN_MODULE_DEFS = [
  { key: "dashboard", label: "Dashboard", description: "Home stats and overview" },
  { key: "orders", label: "Orders", description: "Orders list, details, status, delete" },
  { key: "products", label: "Products", description: "Catalog, import, images" },
  { key: "vendors", label: "Vendors", description: "Seller stores" },
  { key: "couriers", label: "Couriers", description: "Delivery and courier partners" },
  { key: "categories", label: "Categories", description: "Storefront categories" },
  { key: "banners", label: "Banners", description: "Hero and promo slots" },
  { key: "users", label: "Users", description: "Customer and staff accounts" },
  { key: "roles", label: "Roles & access", description: "Admin permission templates" },
  { key: "newsletter", label: "Newsletter", description: "Email subscribers" },
  { key: "reviews", label: "Reviews", description: "Product reviews moderation" },
  { key: "wishlist_stats", label: "Wishlist stats", description: "Top wishlisted products" },
  { key: "brand_trust", label: "Brand trust pages", description: "Legal and marketing copy" },
  { key: "settings", label: "Settings", description: "Platform settings" },
  { key: "payment_gateway", label: "Payment gateway", description: "Payment gateway / OrlenPay configuration" },
  { key: "audit_logs", label: "Audit logs", description: "Admin audit trail" },
] as const;

export const ADMIN_MODULE_KEYS = ADMIN_MODULE_DEFS.map((d) => d.key);
export type AdminModuleKey = (typeof ADMIN_MODULE_DEFS)[number]["key"];

export const crudSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

export type CrudFlags = z.infer<typeof crudSchema>;

export const permissionMatrixSchema = z
  .object(
    Object.fromEntries(ADMIN_MODULE_KEYS.map((k) => [k, crudSchema])) as Record<
      AdminModuleKey,
      typeof crudSchema
    >,
  )
  .strict();

export type AdminPermissionMatrix = z.infer<typeof permissionMatrixSchema>;

export function createFullAccessMatrix(): AdminPermissionMatrix {
  const row = (): CrudFlags => ({ view: true, create: true, edit: true, delete: true });
  return Object.fromEntries(ADMIN_MODULE_KEYS.map((k) => [k, row()])) as AdminPermissionMatrix;
}

export function createEmptyMatrix(): AdminPermissionMatrix {
  const row = (): CrudFlags => ({ view: false, create: false, edit: false, delete: false });
  return Object.fromEntries(ADMIN_MODULE_KEYS.map((k) => [k, row()])) as AdminPermissionMatrix;
}

export function parsePermissionMatrix(input: unknown): AdminPermissionMatrix {
  const empty = createEmptyMatrix();
  if (!input || typeof input !== "object") return empty;
  const o = input as Record<string, unknown>;
  const settingsRow =
    o.settings && typeof o.settings === "object" ? (o.settings as Record<string, unknown>) : null;

  for (const k of ADMIN_MODULE_KEYS) {
    const c = o[k];
    if (c && typeof c === "object") {
      const x = c as Record<string, unknown>;
      empty[k] = {
        view: Boolean(x.view),
        create: Boolean(x.create),
        edit: Boolean(x.edit),
        delete: Boolean(x.delete),
      };
    } else if (
      !Object.prototype.hasOwnProperty.call(o, k) &&
      (k === "payment_gateway" || k === "audit_logs") &&
      settingsRow
    ) {
      // Previously gated under `settings`; inherit so existing saved roles keep access.
      empty[k] = {
        view: Boolean(settingsRow.view),
        create: Boolean(settingsRow.create),
        edit: Boolean(settingsRow.edit),
        delete: Boolean(settingsRow.delete),
      };
    }
  }
  return empty;
}

export function isAllowed(
  m: AdminPermissionMatrix | null | undefined,
  mod: AdminModuleKey,
  action: keyof CrudFlags,
): boolean {
  if (!m) return true;
  return Boolean(m[mod]?.[action]);
}
