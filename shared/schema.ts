import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  json,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = z.enum(["customer", "vendor_staff", "platform_admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

/**
 * Editable admin permission templates (matrix per module). `users.admin_role_id` points here for
 * `platform_admin` staff; when null, the user is treated as having full access (legacy superuser).
 */
export const adminAccessRoles = pgTable("admin_access_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  permissions: jsonb("permissions").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  /** FK to users — enforced in DB migration (avoid circular Drizzle refs). */
  createdByUserId: varchar("created_by_user_id"),
  updatedByUserId: varchar("updated_by_user_id"),
});

export type AdminAccessRole = typeof adminAccessRoles.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  phone: text("phone").unique(),
  /** Null for OAuth / passkey-only accounts until they set a password. */
  passwordHash: text("password_hash"),
  /** Google OAuth `sub` (stable account id); links Sign in with Google to this user row. */
  googleSub: text("google_sub").unique(),
  /** Facebook Login user id (`/me?id`) — links Sign in with Facebook to this row. */
  facebookSub: text("facebook_sub").unique(),
  fullName: text("full_name").notNull(),
  /** Profile photo: `/uploads/...` or provider CDN URL. */
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("customer"),
  adminRoleId: varchar("admin_role_id").references(() => adminAccessRoles.id, { onDelete: "set null" }),
  /** Bumped when user signs in while single-session mode is enabled; compared to express-session stash. */
  loginSessionVersion: integer("login_session_version").notNull().default(0),
  /** Who created this account (admin invite); FK enforced in DB migration. */
  createdByUserId: varchar("created_by_user_id"),
  /** Who last edited this row from admin; FK enforced in DB migration. */
  updatedByUserId: varchar("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

/** WebAuthn / passkey credentials bound to `users`. */
export const passKeyCredentials = pgTable(
  "pass_key_credentials",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: jsonb("transports").notNull().$type<string[]>().default([]),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    byUserIdx: index("pass_key_credentials_user_id_idx").on(t.userId),
  })
);

export type PassKeyCredential = typeof passKeyCredentials.$inferSelect;

/** Short-lived WebAuthn challenges (POST body round-trips challenge id after options). */
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challenge: text("challenge").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type WebauthnChallengeRow = typeof webauthnChallenges.$inferSelect;

/** Password reset tokens for forgot-password flow. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("pending"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  createdByUserId: varchar("created_by_user_id"),
  updatedByUserId: varchar("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export type Vendor = typeof vendors.$inferSelect;

export const vendorMembers = pgTable(
  "vendor_members",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendorId: varchar("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    memberRole: text("member_role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniq: uniqueIndex("vendor_members_user_vendor").on(t.userId, t.vendorId),
  })
);

export const categories = pgTable(
  "categories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    parentId: varchar("parent_id"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByUserId: varchar("created_by_user_id"),
    updatedByUserId: varchar("updated_by_user_id"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    parentIdx: index("categories_parent_idx").on(t.parentId),
  }),
);

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type Category = typeof categories.$inferSelect;

export const products = pgTable(
  "products",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: varchar("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
    stock: integer("stock").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("draft"),
    /** Bilingual HTML fragments for “key features” (separate from long description). */
    keyFeaturesJson: jsonb("key_features_json").$type<{ en: string; bn: string } | null>(),
    specificationsJson: jsonb("specifications_json").$type<{ label: string; value: string }[] | null>(),
    generalInfoJson: jsonb("general_info_json").$type<{ en: string; bn: string } | null>(),
    /** Waive Pathao/carrier fee at checkout when rules match (see min fields). */
    freeDeliveryEnabled: boolean("free_delivery_enabled").notNull().default(false),
    /** Minimum cart subtotal (BDT) for waiver; omit or null when only quantity rule is used. */
    freeDeliveryMinCartAmount: decimal("free_delivery_min_cart_amount", { precision: 12, scale: 2 }),
    /** Minimum units of this product in the cart for waiver; omit or null when only amount rule is used. */
    freeDeliveryMinQuantity: integer("free_delivery_min_quantity"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    createdByUserId: varchar("created_by_user_id"),
    updatedByUserId: varchar("updated_by_user_id"),
  },
  (t) => ({
    vendorSlug: uniqueIndex("products_vendor_slug").on(t.vendorId, t.slug),
  })
);

export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  image: text("image"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type ProductVariant = typeof productVariants.$inferSelect;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Product = typeof products.$inferSelect;

export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  ctaLabel: text("cta_label"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  placement: text("placement").notNull().default("hero"),
  showTitle: boolean("show_title").notNull().default(true),
  showSubtitle: boolean("show_subtitle").notNull().default(true),
  showButton: boolean("show_button").notNull().default(true),
  showShadow: boolean("show_shadow").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdByUserId: varchar("created_by_user_id"),
  updatedByUserId: varchar("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  district: text("district").notNull(),
  postalCode: text("postal_code"),
  phone: text("phone").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  pathaoCityId: integer("pathao_city_id"),
  pathaoZoneId: integer("pathao_zone_id"),
  pathaoAreaId: integer("pathao_area_id"),
  pathaoCityName: text("pathao_city_name"),
  pathaoZoneName: text("pathao_zone_name"),
  pathaoAreaName: text("pathao_area_name"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/** Registered courier / delivery partners (admin-managed). */
export const couriers = pgTable("couriers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  website: text("website"),
  trackingUrlTemplate: text("tracking_url_template"),
  phone: text("phone"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  /** One of `manual` | `pathao` | `steadfast`. Drives which adapter handles dispatch + webhooks. */
  partnerType: text("partner_type").notNull().default("manual"),
  apiBaseUrl: text("api_base_url"),
  /** Per-partner shape, e.g. `{clientId,clientSecret,storeId}` (Pathao) or `{apiKey,secretKey}` (Steadfast). */
  apiCredentials: jsonb("api_credentials").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  /** Shared HMAC secret used to verify inbound status webhooks from this partner. */
  webhookSecret: text("webhook_secret"),
  /**
   * Pathao only: exact value their dashboard shows for `X-Pathao-Merchant-Webhook-Integration-Secret`
   * on HTTP 200 responses. Often a UUID, separate from the webhook signing secret.
   */
  webhookIntegrationSecret: text("webhook_integration_secret"),
  defaultEtaHours: integer("default_eta_hours"),
  createdByUserId: varchar("created_by_user_id"),
  updatedByUserId: varchar("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type Courier = typeof couriers.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("cod"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  /** Delivery fee included in `total` (e.g. Pathao price-plan at checkout). */
  shippingFee: decimal("shipping_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingAddress: jsonb("shipping_address").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  courierId: varchar("courier_id").references(() => couriers.id, { onDelete: "set null" }),
  trackingNumber: text("tracking_number"),
  warehouseReceivedAt: timestamp("warehouse_received_at"),
  /** Carrier-side parcel reference returned from createShipment (consignment id, awb, etc.). */
  partnerConsignmentId: text("partner_consignment_id"),
  dispatchedAt: timestamp("dispatched_at"),
  etaAt: timestamp("eta_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  lastPartnerEventAt: timestamp("last_partner_event_at"),
  /** Admin who created the order (manual orders); storefront orders leave null. */
  createdByUserId: varchar("created_by_user_id"),
  /** Last admin/staff who modified fulfillment from the dashboard (FK in migration). */
  updatedByUserId: varchar("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type Order = typeof orders.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull(),
  titleSnapshot: text("title_snapshot").notNull(),
  variantId: varchar("variant_id"),
  variantLabelSnapshot: text("variant_label_snapshot"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;

export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  externalRef: text("external_ref"),
  provider: text("provider"),
  providerSessionToken: text("provider_session_token"),
  statusDetail: text("status_detail"),
  callbackReceivedAt: timestamp("callback_received_at"),
  gatewayMeta: jsonb("gateway_meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    paymentId: varchar("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    kind: text("kind").notNull(),
    status: text("status"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    paymentIdx: index("payment_events_payment_idx").on(t.paymentId),
    paymentKindIdx: index("payment_events_kind_idx").on(t.kind),
    paymentStatusIdx: index("payment_events_status_idx").on(t.status),
  })
);

/**
 * Bidirectional courier interaction log: outbound dispatch / cancel calls we
 * made to a partner, and inbound webhook events the partner pushed to us.
 * Used to power the "courier timeline" tab on the admin order modal.
 */
export const courierEvents = pgTable(
  "courier_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courierId: varchar("courier_id").references(() => couriers.id, { onDelete: "set null" }),
    direction: text("direction").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    statusBefore: text("status_before"),
    statusAfter: text("status_after"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    orderIdx: index("courier_events_order_idx").on(t.orderId),
    courierIdx: index("courier_events_courier_idx").on(t.courierId),
  })
);

export type CourierEvent = typeof courierEvents.$inferSelect;

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniq: uniqueIndex("wishlist_user_product").on(t.userId, t.productId),
  })
);

export const productReviews = pgTable(
  "product_reviews",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull().default("pending"),
    adminReply: text("admin_reply"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    updatedByUserId: varchar("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    uniqUserProduct: uniqueIndex("product_reviews_user_product").on(t.userId, t.productId),
  })
);

export const recentlyViewed = pgTable(
  "recently_viewed",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniqUserProduct: uniqueIndex("recently_viewed_user_product").on(t.userId, t.productId),
  })
);

/**
 * express-session store via connect-pg-simple (`tableName: "session"` in server/index.ts).
 * Must stay in Drizzle schema so `drizzle-kit push` does not treat this table as orphan and drop it.
 */
export const sessionStore = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (t) => ({
    expireIdx: index("IDX_session_expire").on(t.expire),
  })
);

/** Key–value settings editable from the admin panel (site copy, contacts, etc.). */
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

/** Immutable admin activity log (HTTP mutations under /api/admin). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    actorUserId: varchar("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestPath: text("request_path").notNull(),
    requestMethod: text("request_method").notNull(),
    responseStatus: integer("response_status").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    actorIdx: index("audit_logs_actor_idx").on(t.actorUserId),
    entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("audit_logs_created_idx").on(t.createdAt),
    actionIdx: index("audit_logs_action_idx").on(t.action),
  }),
);

export type AuditLogRow = typeof auditLogs.$inferSelect;

/**
 * Brand trust pages (about / contact / terms / privacy / returns / warranty / faq / payments).
 * One row per slug; English fields are required, Bangla mirrors are optional with EN fallback.
 */
export const contentPages = pgTable("content_pages", {
  slug: varchar("slug", { length: 64 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  kicker: varchar("kicker", { length: 80 }).notNull().default(""),
  titleEn: varchar("title_en", { length: 200 }).notNull(),
  introEn: text("intro_en").notNull().default(""),
  bodyEn: text("body_en").notNull().default(""),
  metaDescriptionEn: varchar("meta_description_en", { length: 320 }).notNull().default(""),
  titleBn: varchar("title_bn", { length: 200 }).notNull().default(""),
  introBn: text("intro_bn").notNull().default(""),
  bodyBn: text("body_bn").notNull().default(""),
  metaDescriptionBn: varchar("meta_description_bn", { length: 320 }).notNull().default(""),
  createdByUserId: varchar("created_by_user_id"),
  updatedByUserId: varchar("updated_by_user_id"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type ContentPage = typeof contentPages.$inferSelect;

/** Newsletter sign-ups from the storefront footer (and other sources). */
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  source: text("source").notNull().default("footer"),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export const carts = pgTable(
  "carts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestSessionId: varchar("guest_session_id", { length: 64 }),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    userCart: uniqueIndex("carts_user_id").on(t.userId),
    guestCart: uniqueIndex("carts_guest_session").on(t.guestSessionId),
  })
);

export const cartLines = pgTable(
  "cart_lines",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    cartId: varchar("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniqNoVariant: uniqueIndex("cart_line_cart_product_novar")
      .on(t.cartId, t.productId)
      .where(sql`${t.variantId} is null`),
    uniqVariant: uniqueIndex("cart_line_cart_variant_line")
      .on(t.cartId, t.variantId)
      .where(sql`${t.variantId} is not null`),
  })
);
