import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  sql,
  inArray,
  gte,
  lt,
  lte,
  like,
  isNotNull,
  isNull,
  notInArray,
  ne,
  exists,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import {
  users,
  vendors,
  vendorMembers,
  categories,
  products,
  productVariants,
  banners,
  carts,
  cartLines,
  orders,
  orderItems,
  orderStatusHistory,
  payments,
  paymentEvents,
  couriers,
  courierEvents,
  wishlistItems,
  productReviews,
  recentlyViewed,
  addresses,
  platformSettings,
  contentPages,
  newsletterSubscribers,
  adminAccessRoles,
  type User,
  type Vendor,
  type Product,
  type ProductVariant,
  type Category,
  type Courier,
  type CourierEvent,
  type Order,
} from "../../shared/schema";
import { getAdapter } from "../courier/index.ts";
import {
  createFullAccessMatrix,
  parsePermissionMatrix,
  type AdminPermissionMatrix,
} from "../../shared/adminPermissions";
import {
  BD_BULK_CATEGORIES,
  BD_BULK_VENDORS,
  BD_BULK_SLUG_PREFIX,
  buildBdBulkProductRows,
} from "../data/bd-bulk-catalog";
import { parseDecimalString } from "../../shared/parseDecimalString";
import { cartQualifiesForFreeDelivery } from "../../shared/freeDelivery";
import { shippingAddressSchema } from "../../shared/shippingAddressSchema";
import { buildShippingAddressRecord, computePathaoShippingFeeForCheckout } from "../lib/pathaoCheckoutQuote";
import { normalizeBdPhone } from "../lib/normalizeBdPhone";
import { wouldCreateCycle, wouldExceedDepth, type CategoryTreeRow } from "../../shared/categoryTree";
import { toActorRef, type AdminActorRef } from "./actors";
import { updateOrderStatus } from "./orderStatus";
import {
  ORDER_STATUS_TRANSITIONS,
  isOrderStatus,
  isTerminalOrderStatus,
  type OrderStatus,
} from "../../shared/orderStatus";
import {
  getUserById,
  bumpUserLoginSessionVersion,
  getUserByEmail,
  getUserByPhone,
  createUser,
  maybeSetAvatarFromProvider,
  insertUserByAdmin,
  getUserByGoogleSub,
  setUserGoogleSub,
  getUserByFacebookSub,
  setUserFacebookSub,
  listPassKeysForUser,
  getPassKeyByCredentialId,
  insertPassKeyCredential,
  updatePassKeyCounter,
  listPassKeyRowsForWebAuthn,
  deletePassKeyForUser,
  pruneExpiredWebauthnChallenges,
  insertWebauthnChallenge,
  consumeWebauthnChallenge,
} from "./usersAccount";
import {
  getVendorMembershipForUser,
  listCategories,
  listCategoryTree,
  getCategoryBySlug,
  listBanners,
} from "./taxonomy";

export async function getReviewStatsForProductIds(
  productIds: string[]
): Promise<Record<string, { reviewCount: number; avgRating: number }>> {
  if (productIds.length === 0) return {};
  const rows = await db
    .select({
      productId: productReviews.productId,
      reviewCount: sql<number>`count(*)::int`,
      avgRating: sql<number>`coalesce(avg(${productReviews.rating})::float, 0)`,
    })
    .from(productReviews)
    .where(and(eq(productReviews.status, "approved"), inArray(productReviews.productId, productIds)))
    .groupBy(productReviews.productId);
  const out: Record<string, { reviewCount: number; avgRating: number }> = {};
  for (const r of rows) {
    out[r.productId] = { reviewCount: Number(r.reviewCount), avgRating: Number(r.avgRating) };
  }
  return out;
}

export async function listProductsPublic(filters: {
  categorySlug?: string;
  vendorSlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(filters.limit ?? 24, 100);
  const offset = filters.offset ?? 0;

  let categoryId: string | undefined;
  if (filters.categorySlug) {
    const c = await getCategoryBySlug(filters.categorySlug);
    categoryId = c?.id;
  }

  let vendorId: string | undefined;
  if (filters.vendorSlug) {
    const [v] = await db.select().from(vendors).where(eq(vendors.slug, filters.vendorSlug)).limit(1);
    vendorId = v?.id;
  }

  const conditions = [eq(products.status, "active"), eq(vendors.status, "approved")];

  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (vendorId) conditions.push(eq(products.vendorId, vendorId));
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(products.title, term), ilike(products.description, term))!);
  }
  if (filters.minPrice != null) {
    conditions.push(gte(sql`${products.price}::numeric`, filters.minPrice));
  }
  if (filters.maxPrice != null) {
    conditions.push(lte(sql`${products.price}::numeric`, filters.maxPrice));
  }

  const orderBy =
    filters.sort === "price_asc"
      ? [asc(products.price)]
      : filters.sort === "price_desc"
        ? [desc(products.price)]
        : [desc(products.createdAt)];

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(whereClause);

  const total = Number(countRow?.n ?? 0);

  const rows = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const ids = Array.from(new Set(rows.map((r) => r.product.id)));
  const stats = await getReviewStatsForProductIds(ids);
  const rowsWithReviews = rows.map((r) => {
    const s = stats[r.product.id];
    return {
      ...r,
      reviewCount: s?.reviewCount ?? 0,
      avgRating: s?.avgRating ?? 0,
    };
  });

  return { rows: rowsWithReviews, total };
}

export async function getProductBySlug(
  vendorSlug: string,
  productSlug: string
): Promise<
  | (Product & {
      vendorName: string;
      vendorSlug: string;
      reviewCount: number;
      avgRating: number;
      variants: ProductVariant[];
    })
  | undefined
> {
  const [row] = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(
      and(
        eq(vendors.slug, vendorSlug),
        eq(products.slug, productSlug),
        eq(products.status, "active"),
        eq(vendors.status, "approved")
      )
    )
    .limit(1);
  if (!row) return undefined;
  const stats = await getReviewStatsForProductIds([row.product.id]);
  const s = stats[row.product.id];
  const variants = await listVariantsForProduct(row.product.id);
  return {
    ...row.product,
    vendorName: row.vendorName,
    vendorSlug: row.vendorSlug,
    reviewCount: s?.reviewCount ?? 0,
    avgRating: s?.avgRating ?? 0,
    variants,
  };
}

export async function listVariantsForProduct(productId: string): Promise<ProductVariant[]> {
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
}

export async function countVariantsForProduct(productId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return Number(r?.n ?? 0);
}

export async function replaceProductVariants(
  productId: string,
  rows: Array<{
    kind: string;
    name: string;
    value: string;
    image?: string;
    price: string;
    stock: number;
    sortOrder?: number;
  }>,
) {
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  if (rows.length === 0) return;
  await db.insert(productVariants).values(
    rows.map((r, i) => ({
      productId,
      kind: r.kind,
      name: r.name,
      value: r.value,
      image: r.image,
      price: r.price,
      stock: r.stock,
      sortOrder: r.sortOrder ?? i,
    })),
  );
}

/** When variants exist, list/PDP “from” price uses min variant; stock is total across variants. */
export async function syncProductPriceStockFromVariants(productId: string) {
  const vars = await listVariantsForProduct(productId);
  if (vars.length === 0) return;
  let min = Number(vars[0].price);
  let sumStock = 0;
  for (const v of vars) {
    const pr = Number(v.price);
    if (Number.isFinite(pr) && pr < min) min = pr;
    sumStock += v.stock;
  }
  await db
    .update(products)
    .set({
      price: min.toFixed(2),
      stock: sumStock,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}

export async function getOrCreateCart(opts: { userId?: string; guestSessionId?: string }) {
  if (opts.userId) {
    const [existing] = await db.select().from(carts).where(eq(carts.userId, opts.userId)).limit(1);
    if (existing) return existing;
    const [c] = await db.insert(carts).values({ userId: opts.userId }).returning();
    return c;
  }
  if (opts.guestSessionId) {
    const [existing] = await db
      .select()
      .from(carts)
      .where(eq(carts.guestSessionId, opts.guestSessionId))
      .limit(1);
    if (existing) return existing;
    const [c] = await db.insert(carts).values({ guestSessionId: opts.guestSessionId }).returning();
    return c;
  }
  throw new Error("cart requires user or guest");
}

export async function mergeGuestCartToUser(guestSessionId: string, userId: string) {
  const [guestCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.guestSessionId, guestSessionId))
    .limit(1);
  if (!guestCart) return;
  const userCart = await getOrCreateCart({ userId });
  const lines = await db.select().from(cartLines).where(eq(cartLines.cartId, guestCart.id));
  for (const line of lines) {
    const variantPart =
      line.variantId != null && line.variantId !== ""
        ? eq(cartLines.variantId, line.variantId)
        : isNull(cartLines.variantId);
    const [existing] = await db
      .select()
      .from(cartLines)
      .where(and(eq(cartLines.cartId, userCart.id), eq(cartLines.productId, line.productId), variantPart))
      .limit(1);
    if (existing) {
      await db
        .update(cartLines)
        .set({ quantity: existing.quantity + line.quantity })
        .where(eq(cartLines.id, existing.id));
    } else {
      await db.insert(cartLines).values({
        cartId: userCart.id,
        productId: line.productId,
        variantId: line.variantId && line.variantId.length ? line.variantId : null,
        quantity: line.quantity,
      });
    }
  }
  await db.delete(carts).where(eq(carts.id, guestCart.id));
}

export async function getCartWithLines(cartId: string) {
  const lines = await db
    .select({
      line: cartLines,
      product: products,
      variant: productVariants,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(cartLines)
    .innerJoin(products, eq(cartLines.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(productVariants, eq(cartLines.variantId, productVariants.id))
    .where(eq(cartLines.cartId, cartId));
  if (lines.length === 0) {
    return [];
  }
  const productIds = Array.from(new Set(lines.map((r) => r.product.id)));
  const countsRows = await db
    .select({
      productId: productVariants.productId,
      n: sql<number>`count(*)::int`,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .groupBy(productVariants.productId);
  const countMap = new Map(countsRows.map((r) => [r.productId, Number(r.n)]));
  return lines.map((row) => ({
    ...row,
    productVariantCount: countMap.get(row.product.id) ?? 0,
  }));
}

/** True only if every line’s product waives carrier fee given current cart subtotal and quantities. */
export async function orderLinesQualifyFreeDelivery(
  lines: Array<{ productId: string; quantity: number }>,
  cartSubtotal: number,
): Promise<boolean> {
  if (lines.length === 0) return false;
  const ids = Array.from(new Set(lines.map((l) => l.productId)));
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const map = new Map(rows.map((p) => [p.id, p]));
  const pack = lines.flatMap((l) => {
    const p = map.get(l.productId);
    if (!p) return [];
    return [{ product: p, quantity: l.quantity }];
  });
  return cartQualifiesForFreeDelivery(cartSubtotal, pack);
}

/** Remove a payment_pending order created for gateway checkout when OrlenPay initiate fails (cascades payments/items/history). */
export async function abandonProvisionalCheckoutOrder(orderId: string): Promise<void> {
  await db.delete(orders).where(eq(orders.id, orderId));
}

export async function verifyVariantBelongsToProduct(
  variantId: string,
  productId: string,
): Promise<boolean> {
  const [r] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .limit(1);
  return Boolean(r);
}

export async function setCartLineQuantity(
  cartId: string,
  productId: string,
  quantity: number,
  variantId?: string | null,
) {
  const variantPart =
    variantId != null && variantId !== ""
      ? eq(cartLines.variantId, variantId)
      : isNull(cartLines.variantId);

  // Removal must not require a variant id (lines can exist with null variant_id for variant products).
  if (quantity <= 0) {
    await db
      .delete(cartLines)
      .where(and(eq(cartLines.cartId, cartId), eq(cartLines.productId, productId), variantPart));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
    return;
  }

  const nVar = await countVariantsForProduct(productId);
  if (nVar > 0 && (!variantId || variantId === "")) {
    throw new Error("VARIANT_REQUIRED");
  }
  if (variantId && variantId.length > 0) {
    const ok = await verifyVariantBelongsToProduct(variantId, productId);
    if (!ok) throw new Error("INVALID_VARIANT");
  }

  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!p) throw new Error("PRODUCT_NOT_FOUND");
  if (variantId && variantId.length > 0) {
    const [pv] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
    if (!pv || pv.stock < quantity) throw new Error("INSUFFICIENT_STOCK");
  } else if (nVar === 0 && p.stock < quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const [existing] = await db
    .select()
    .from(cartLines)
    .where(and(eq(cartLines.cartId, cartId), eq(cartLines.productId, productId), variantPart))
    .limit(1);
  if (existing) {
    await db.update(cartLines).set({ quantity }).where(eq(cartLines.id, existing.id));
  } else {
    await db.insert(cartLines).values({
      cartId,
      productId,
      quantity,
      variantId: variantId && variantId.length ? variantId : null,
    });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function listWishlist(userId: string) {
  return db
    .select({ product: products, vendorSlug: vendors.slug, vendorName: vendors.name })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(eq(wishlistItems.userId, userId));
}

export async function toggleWishlist(userId: string, productId: string) {
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);
  if (existing) {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
    return { added: false };
  }
  await db.insert(wishlistItems).values({ userId, productId });
  return { added: true };
}

export async function isInWishlist(userId: string, productId: string) {
  const [r] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);
  return !!r;
}

export async function countWishlistItems(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  return Number(r?.n ?? 0);
}

const RECENTLY_VIEWED_MAX = 30;

export async function listApprovedReviewsForProduct(
  productId: string,
  opts: { limit: number; offset: number }
) {
  const { limit, offset } = opts;
  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")));
  const total = Number(countRow?.n ?? 0);
  const items = await db
    .select({
      id: productReviews.id,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      locale: productReviews.locale,
      adminReply: productReviews.adminReply,
      createdAt: productReviews.createdAt,
      authorName: users.fullName,
    })
    .from(productReviews)
    .innerJoin(users, eq(productReviews.userId, users.id))
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")))
    .orderBy(desc(productReviews.createdAt))
    .limit(limit)
    .offset(offset);
  return { items, total };
}

export async function createProductReview(
  userId: string,
  data: { productId: string; rating: number; title?: string; body: string; locale: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [p] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
  if (!p || p.status !== "active") return { ok: false, error: "Product not found" };
  const [dup] = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(and(eq(productReviews.userId, userId), eq(productReviews.productId, data.productId)))
    .limit(1);
  if (dup) return { ok: false, error: "You already reviewed this product" };
  await db.insert(productReviews).values({
    userId,
    productId: data.productId,
    rating: data.rating,
    title: data.title?.trim() || null,
    body: data.body.trim(),
    locale: data.locale === "bn" ? "bn" : "en",
    status: "pending",
  });
  return { ok: true };
}

export async function listReviewsAdminPaged(opts: {
  status?: "pending" | "approved" | "rejected";
  limit: number;
  offset: number;
}) {
  const conditions: SQL[] = [];
  if (opts.status) conditions.push(eq(productReviews.status, opts.status));
  const whereClause = conditions.length ? and(...conditions) : sql`true`;

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productReviews)
    .where(whereClause);
  const total = Number(countRow?.n ?? 0);

  const rvAuthor = alias(users, "review_author");
  const rvHandler = alias(users, "review_handler");
  const raw = await db
    .select({
      review: productReviews,
      productTitle: products.title,
      productSlug: products.slug,
      vendorSlug: vendors.slug,
      vendorName: vendors.name,
      userEmail: rvAuthor.email,
      userFullName: rvAuthor.fullName,
      aId: rvAuthor.id,
      aName: rvAuthor.fullName,
      aEmail: rvAuthor.email,
      aAvatar: rvAuthor.avatarUrl,
      hId: rvHandler.id,
      hName: rvHandler.fullName,
      hEmail: rvHandler.email,
      hAvatar: rvHandler.avatarUrl,
    })
    .from(productReviews)
    .innerJoin(products, eq(productReviews.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .innerJoin(rvAuthor, eq(productReviews.userId, rvAuthor.id))
    .leftJoin(rvHandler, eq(productReviews.updatedByUserId, rvHandler.id))
    .where(whereClause)
    .orderBy(desc(productReviews.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);

  const items = raw.map((r) => ({
    review: r.review,
    productTitle: r.productTitle,
    productSlug: r.productSlug,
    vendorSlug: r.vendorSlug,
    vendorName: r.vendorName,
    userEmail: r.userEmail,
    userFullName: r.userFullName,
    creator: toActorRef({ id: r.aId, fullName: r.aName, email: r.aEmail, avatarUrl: r.aAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));

  return { items, total };
}

export async function updateReviewAdmin(
  reviewId: string,
  patch: { status?: "pending" | "approved" | "rejected"; adminReply?: string | null },
  actorUserId?: string | null,
): Promise<boolean> {
  const [existing] = await db.select().from(productReviews).where(eq(productReviews.id, reviewId)).limit(1);
  if (!existing) return false;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.adminReply !== undefined) set.adminReply = patch.adminReply;
  if (actorUserId) set.updatedByUserId = actorUserId;
  await db.update(productReviews).set(set).where(eq(productReviews.id, reviewId));
  return true;
}

export async function recordProductView(userId: string, productId: string): Promise<void> {
  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!p || p.status !== "active") return;
  await db
    .insert(recentlyViewed)
    .values({ userId, productId, viewedAt: new Date() })
    .onConflictDoUpdate({
      target: [recentlyViewed.userId, recentlyViewed.productId],
      set: { viewedAt: new Date() },
    });
  const rows = await db
    .select({ id: recentlyViewed.id })
    .from(recentlyViewed)
    .where(eq(recentlyViewed.userId, userId))
    .orderBy(desc(recentlyViewed.viewedAt));
  if (rows.length > RECENTLY_VIEWED_MAX) {
    const drop = rows.slice(RECENTLY_VIEWED_MAX).map((x) => x.id);
    if (drop.length) await db.delete(recentlyViewed).where(inArray(recentlyViewed.id, drop));
  }
}

export async function listRecentlyViewedProductRows(userId: string, limit: number) {
  const lim = Math.min(Math.max(limit, 1), 48);
  return db
    .select({
      product: products,
      vendorSlug: vendors.slug,
      vendorName: vendors.name,
      viewedAt: recentlyViewed.viewedAt,
    })
    .from(recentlyViewed)
    .innerJoin(products, eq(recentlyViewed.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(
      and(eq(recentlyViewed.userId, userId), eq(products.status, "active"), eq(vendors.status, "approved"))
    )
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(lim);
}

async function collectUserInterestCategoryIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const wl = await db
    .select({ categoryId: products.categoryId })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, userId));
  for (const r of wl) if (r.categoryId) ids.add(r.categoryId);

  const rv = await db
    .select({ categoryId: products.categoryId })
    .from(recentlyViewed)
    .innerJoin(products, eq(recentlyViewed.productId, products.id))
    .where(eq(recentlyViewed.userId, userId));
  for (const r of rv) if (r.categoryId) ids.add(r.categoryId);

  const ord = await db
    .select({ categoryId: products.categoryId })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.status, ["delivered", "shipped"]),
        isNotNull(products.categoryId)
      )
    );
  for (const r of ord) if (r.categoryId) ids.add(r.categoryId);

  return Array.from(ids);
}

async function collectCategoryIdsFromProductIds(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return [];
  const rows = await db
    .select({ categoryId: products.categoryId })
    .from(products)
    .where(and(inArray(products.id, productIds), isNotNull(products.categoryId)));
  return Array.from(new Set(rows.map((r) => r.categoryId!).filter(Boolean)));
}

export async function listProductsPublicRowsByIds(productIds: string[]) {
  const unique = Array.from(new Set(productIds)).slice(0, 48);
  if (unique.length === 0) return [];
  const rows = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(
      and(
        inArray(products.id, unique),
        eq(products.status, "active"),
        eq(vendors.status, "approved")
      )
    );
  const orderIndex = new Map(unique.map((id, i) => [id, i]));
  rows.sort((a, b) => (orderIndex.get(a.product.id) ?? 999) - (orderIndex.get(b.product.id) ?? 999));
  const stats = await getReviewStatsForProductIds(rows.map((r) => r.product.id));
  return rows.map((r) => {
    const s = stats[r.product.id];
    return {
      ...r,
      reviewCount: s?.reviewCount ?? 0,
      avgRating: s?.avgRating ?? 0,
    };
  });
}

export async function getRecommendedProductRows(opts: {
  userId?: string;
  recentProductIds?: string[];
  limit: number;
}): Promise<
  {
    product: Product;
    vendorName: string;
    vendorSlug: string;
    reviewCount: number;
    avgRating: number;
  }[]
> {
  const limit = Math.min(Math.max(opts.limit, 1), 48);
  let categoryIds: string[] = [];
  const excludeIds = new Set<string>();

  if (opts.userId) {
    categoryIds = await collectUserInterestCategoryIds(opts.userId);
    const wl = await db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, opts.userId));
    for (const w of wl) excludeIds.add(w.productId);
  }

  // Guest-only: URL `recent` drives category hints + exclusions. Logged-in uses DB signals only (plan).
  const recent = opts.userId
    ? []
    : (opts.recentProductIds ?? []).filter(Boolean).slice(0, 20);
  for (const id of recent) excludeIds.add(id);
  if (recent.length) {
    const fromGuest = await collectCategoryIdsFromProductIds(recent);
    categoryIds = Array.from(new Set(categoryIds.concat(fromGuest)));
  }

  if (categoryIds.length === 0) {
    const { rows } = await listProductsPublic({ limit, offset: 0 });
    return rows.map((r) => ({
      product: r.product,
      vendorName: r.vendorName,
      vendorSlug: r.vendorSlug,
      reviewCount: r.reviewCount,
      avgRating: r.avgRating,
    }));
  }

  const conditions: SQL[] = [
    eq(products.status, "active"),
    eq(vendors.status, "approved"),
    inArray(products.categoryId, categoryIds),
  ];
  if (excludeIds.size > 0) conditions.push(notInArray(products.id, Array.from(excludeIds)));
  const whereClause = and(...conditions);

  const picked = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit * 2);

  const dedup = picked.filter((r) => !excludeIds.has(r.product.id)).slice(0, limit);
  const stats = await getReviewStatsForProductIds(dedup.map((r) => r.product.id));
  return dedup.map((r) => {
    const s = stats[r.product.id];
    return {
      product: r.product,
      vendorName: r.vendorName,
      vendorSlug: r.vendorSlug,
      reviewCount: s?.reviewCount ?? 0,
      avgRating: s?.avgRating ?? 0,
    };
  });
}

export async function listTopWishlistedProductsAdmin(opts: { limit: number; offset: number }) {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);

  const wishAgg = db
    .select({
      productId: wishlistItems.productId,
      wishCount: sql<number>`count(*)::int`,
    })
    .from(wishlistItems)
    .groupBy(wishlistItems.productId)
    .as("wish_agg");

  const distinctProducts = db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .groupBy(wishlistItems.productId)
    .as("wish_distinct");

  const [[totalRow], slice] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(distinctProducts),
    db
      .select({ productId: wishAgg.productId, wishCount: wishAgg.wishCount })
      .from(wishAgg)
      .orderBy(desc(wishAgg.wishCount))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRow?.n ?? 0);
  if (slice.length === 0) return { items: [], total };

  const ids = slice.map((s) => s.productId);
  const details = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(inArray(products.id, ids));
  const map = new Map(details.map((d) => [d.product.id, d]));
  const items = slice
    .map((s) => {
      const d = map.get(s.productId);
      if (!d) return null;
      return { ...d, wishCount: Number(s.wishCount) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return { items, total };
}

export async function createOrderWithItems(data: {
  userId?: string | null;
  customerName: string;
  customerPhone: string;
  shippingAddress: Record<string, unknown>;
  paymentMethod: string;
  lines: {
    productId: string;
    title: string;
    price: string;
    quantity: number;
    lineTotal: string;
    variantId?: string | null;
    variantLabelSnapshot?: string | null;
  }[];
  /** Optional initial payment row (e.g. admin-created orders). */
  initialPayment?: {
    method: string;
    amount: string;
    status?: string;
    provider?: string | null;
    externalRef?: string | null;
    providerSessionToken?: string | null;
    statusDetail?: string | null;
    gatewayMeta?: Record<string, unknown>;
  };
  /** For online gateways: create provisional order, finalize only after successful callback. */
  deferFulfillmentUntilPayment?: boolean;
  /** Delivery fee (BDT); included in `total` with subtotal. */
  shippingFee?: string | number;
  /** Manual orders created by an admin (dashboard). */
  createdByUserId?: string | null;
}) {
  const subtotal = data.lines.reduce((s, l) => s + parseDecimalString(l.lineTotal), 0);
  const ship = parseDecimalString(String(data.shippingFee ?? 0));
  const total = subtotal + ship;
  const orderNumber = `ORL${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return db.transaction(async (tx) => {
    const productIds = Array.from(new Set(data.lines.map((l) => l.productId)));
    const productRows = await tx.select().from(products).where(inArray(products.id, productIds));
    const productById = new Map(productRows.map((p) => [p.id, p]));

    const variantCountRows = await tx
      .select({
        productId: productVariants.productId,
        n: sql<number>`count(*)::int`,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .groupBy(productVariants.productId);
    const variantCountByProduct = new Map(variantCountRows.map((r) => [r.productId, Number(r.n)]));

    for (const l of data.lines) {
      const p = productById.get(l.productId);
      if (!p) throw new Error(`Product missing for ${l.title}`);
      const variantCount = variantCountByProduct.get(l.productId) ?? 0;
      if (variantCount > 0) {
        if (!l.variantId) throw new Error(`Choose a variant for ${l.title}`);
        const [pv] = await tx
          .select()
          .from(productVariants)
          .where(and(eq(productVariants.id, l.variantId), eq(productVariants.productId, l.productId)))
          .limit(1);
        if (!pv) throw new Error(`Invalid variant for ${l.title}`);
        if (pv.stock < l.quantity) throw new Error(`Insufficient stock for ${l.title}`);
      } else if (p.stock < l.quantity) {
        throw new Error(`Insufficient stock for ${l.title}`);
      }
    }

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: data.userId ?? null,
        status: data.deferFulfillmentUntilPayment ? "payment_pending" : "pending",
        paymentMethod: data.paymentMethod,
        subtotal: subtotal.toFixed(2),
        shippingFee: ship.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: data.shippingAddress,
        customerName: data.customerName,
        customerPhone: normalizeBdPhone(data.customerPhone),
        createdByUserId: data.createdByUserId ?? null,
        updatedByUserId: data.createdByUserId ?? null,
      })
      .returning();

    for (const l of data.lines) {
      const [p] = await tx.select().from(products).where(eq(products.id, l.productId)).limit(1);
      if (!p) throw new Error("Product missing");
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: l.productId,
        titleSnapshot: l.title,
        price: l.price,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
        variantId: l.variantId ?? null,
        variantLabelSnapshot: l.variantLabelSnapshot ?? null,
      });
      if (data.deferFulfillmentUntilPayment) {
        // Stock is reserved only after payment callback confirms success.
        continue;
      }
      if (l.variantId) {
        const [pv] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, l.variantId))
          .limit(1);
        if (pv) {
          await tx
            .update(productVariants)
            .set({ stock: pv.stock - l.quantity, updatedAt: new Date() })
            .where(eq(productVariants.id, l.variantId));
        }
        const vars = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, l.productId));
        if (vars.length > 0) {
          let min = Number(vars[0].price);
          let sumStock = 0;
          for (const v of vars) {
            const pr = Number(v.price);
            if (Number.isFinite(pr) && pr < min) min = pr;
            sumStock += v.stock;
          }
          await tx
            .update(products)
            .set({
              price: min.toFixed(2),
              stock: sumStock,
              updatedAt: new Date(),
            })
            .where(eq(products.id, l.productId));
        }
      } else {
        await tx
          .update(products)
          .set({ stock: p.stock - l.quantity, updatedAt: new Date() })
          .where(eq(products.id, l.productId));
      }
    }

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: data.deferFulfillmentUntilPayment ? "payment_pending" : "pending",
      note: data.deferFulfillmentUntilPayment ? "Awaiting payment confirmation" : "Order placed",
    });
    if (data.initialPayment) {
      await tx.insert(payments).values({
        orderId: order.id,
        method: data.initialPayment.method,
        amount: data.initialPayment.amount,
        status: data.initialPayment.status ?? "pending",
        provider: data.initialPayment.provider ?? null,
        externalRef: data.initialPayment.externalRef ?? null,
        providerSessionToken: data.initialPayment.providerSessionToken ?? null,
        statusDetail: data.initialPayment.statusDetail ?? null,
        gatewayMeta: data.initialPayment.gatewayMeta ?? {},
        updatedAt: new Date(),
      });
    }
    return order;
  });
}

export async function clearCart(cartId: string) {
  await db.delete(cartLines).where(eq(cartLines.cartId, cartId));
}

export async function listOrdersForUser(userId: string) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function cancelCustomerOrderByNumber(
  userId: string,
  orderNumber: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [o] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)))
    .limit(1);
  if (!o) return { ok: false, error: "not_found" };
  if (!(o.status === "pending" || o.status === "payment_pending")) {
    return { ok: false, error: "invalid_state" };
  }
  const r = await updateOrderStatus(
    o.id,
    "cancelled",
    "Cancelled by customer",
    o.status === "payment_pending" ? { force: true } : undefined,
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function getCustomerOrderByNumber(userId: string, orderNumber: string) {
  const [o] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)))
    .limit(1);
  if (!o) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, o.id))
    .orderBy(asc(orderStatusHistory.createdAt));
  return { order: o, items, history };
}

export async function getLatestPaymentForOrder(orderId: string) {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return row;
}

export async function updatePaymentGatewayInitiation(
  paymentId: string,
  patch: {
    status?: string;
    provider?: string | null;
    externalRef?: string | null;
    providerSessionToken?: string | null;
    statusDetail?: string | null;
    gatewayMeta?: Record<string, unknown>;
  }
) {
  const set: Partial<typeof payments.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.provider !== undefined) set.provider = patch.provider;
  if (patch.externalRef !== undefined) set.externalRef = patch.externalRef;
  if (patch.providerSessionToken !== undefined) set.providerSessionToken = patch.providerSessionToken;
  if (patch.statusDetail !== undefined) set.statusDetail = patch.statusDetail;
  if (patch.gatewayMeta !== undefined) set.gatewayMeta = patch.gatewayMeta;
  await db.update(payments).set(set).where(eq(payments.id, paymentId));
}

export async function appendPaymentEvent(data: {
  paymentId: string;
  direction: "outbound" | "inbound" | "internal";
  kind: string;
  status?: string | null;
  payload?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  await db.insert(paymentEvents).values({
    paymentId: data.paymentId,
    direction: data.direction,
    kind: data.kind,
    status: data.status ?? null,
    payload: data.payload ?? {},
    errorMessage: data.errorMessage ?? null,
  });
}

export async function getPaymentById(paymentId: string) {
  const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  return row;
}

export async function getPaymentByExternalRef(externalRef: string) {
  const [row] = await db.select().from(payments).where(eq(payments.externalRef, externalRef)).limit(1);
  return row;
}

export async function markPaymentCallback(data: {
  paymentId: string;
  status: string;
  statusDetail?: string | null;
  externalRef?: string | null;
  providerSessionToken?: string | null;
  gatewayMeta?: Record<string, unknown>;
}) {
  const [current] = await db.select().from(payments).where(eq(payments.id, data.paymentId)).limit(1);
  if (!current) return;
  await db
    .update(payments)
    .set({
      status: data.status,
      statusDetail: data.statusDetail ?? null,
      externalRef: data.externalRef ?? null,
      providerSessionToken: data.providerSessionToken ?? null,
      callbackReceivedAt: new Date(),
      gatewayMeta: data.gatewayMeta ?? {},
      updatedAt: new Date(),
    })
    .where(eq(payments.id, data.paymentId));

  if (data.status === "completed") {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, current.orderId)).limit(1);
      if (!order) return;
      if (order.status === "payment_pending") {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const item of items) {
          const [p] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (!p) throw new Error(`Product missing for ${item.titleSnapshot}`);
          if (item.variantId) {
            const [pv] = await tx
              .select()
              .from(productVariants)
              .where(and(eq(productVariants.id, item.variantId), eq(productVariants.productId, item.productId)))
              .limit(1);
            if (!pv) throw new Error(`Invalid variant for ${item.titleSnapshot}`);
            if (pv.stock < item.quantity) throw new Error(`Insufficient stock for ${item.titleSnapshot}`);
            await tx
              .update(productVariants)
              .set({ stock: pv.stock - item.quantity, updatedAt: new Date() })
              .where(eq(productVariants.id, item.variantId));
            const vars = await tx.select().from(productVariants).where(eq(productVariants.productId, item.productId));
            if (vars.length > 0) {
              let min = Number(vars[0].price);
              let sumStock = 0;
              for (const v of vars) {
                const pr = Number(v.price);
                if (Number.isFinite(pr) && pr < min) min = pr;
                sumStock += v.stock;
              }
              await tx
                .update(products)
                .set({ price: min.toFixed(2), stock: sumStock, updatedAt: new Date() })
                .where(eq(products.id, item.productId));
            }
          } else {
            if (p.stock < item.quantity) throw new Error(`Insufficient stock for ${item.titleSnapshot}`);
            await tx
              .update(products)
              .set({ stock: p.stock - item.quantity, updatedAt: new Date() })
              .where(eq(products.id, item.productId));
          }
        }
      }

      await tx.update(orders).set({ status: "confirmed", updatedAt: new Date() }).where(eq(orders.id, current.orderId));
      await tx.insert(orderStatusHistory).values({
        orderId: current.orderId,
        status: "confirmed",
        note: "Payment confirmed via gateway callback",
      });
    });
  } else if (data.status === "failed" || data.status === "cancelled") {
    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.id, current.orderId), eq(orders.status, "payment_pending")));
    await db.insert(orderStatusHistory).values({
      orderId: current.orderId,
      status: "cancelled",
      note: data.status === "cancelled" ? "Payment cancelled by user/provider" : "Payment failed via gateway callback",
    });
  }
}

export type AdminOrderListRow = typeof orders.$inferSelect & {
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listOrdersAdminPaged(opts: {
  q?: string;
  status?: string;
  createdFrom?: Date | null;
  createdToExclusive?: Date | null;
  limit: number;
  offset: number;
}): Promise<{ items: AdminOrderListRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(
      or(
        ilike(orders.orderNumber, t),
        ilike(orders.customerName, t),
        ilike(orders.customerPhone, t),
        exists(
          db
            .select({ one: sql`1` })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(
              and(
                eq(orderItems.orderId, orders.id),
                or(ilike(products.title, t), ilike(products.slug, t))
              )
            )
        )
      )!
    );
  }
  if (opts.status?.trim()) {
    filters.push(eq(orders.status, opts.status.trim()));
  }
  if (opts.createdFrom) {
    filters.push(gte(orders.createdAt, opts.createdFrom));
  }
  if (opts.createdToExclusive) {
    filters.push(lt(orders.createdAt, opts.createdToExclusive));
  }
  /** Hide cancelled by default; include when searching or when status filter is set (any value). */
  const excludeCancelled = !opts.q?.trim() && !opts.status?.trim();
  if (excludeCancelled) {
    filters.push(ne(orders.status, "cancelled"));
  }
  const whereClause = filters.length ? and(...filters) : undefined;

  const countBase = db.select({ n: sql<number>`count(*)::int` }).from(orders);
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);

  const oCreator = alias(users, "order_creator");
  const oHandler = alias(users, "order_handler");
  const qb = db
    .select({
      order: orders,
      cId: oCreator.id,
      cName: oCreator.fullName,
      cEmail: oCreator.email,
      cAvatar: oCreator.avatarUrl,
      hId: oHandler.id,
      hName: oHandler.fullName,
      hEmail: oHandler.email,
      hAvatar: oHandler.avatarUrl,
    })
    .from(orders)
    .leftJoin(oCreator, eq(orders.createdByUserId, oCreator.id))
    .leftJoin(oHandler, eq(orders.updatedByUserId, oHandler.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  const items: AdminOrderListRow[] = raw.map((r) => ({
    ...r.order,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function listOrdersForVendor(vendorId: string) {
  const vendorProductIds = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.vendorId, vendorId));
  const ids = vendorProductIds.map((p) => p.id);
  if (ids.length === 0) return [];
  const orderIds = await db
    .selectDistinct({ orderId: orderItems.orderId })
    .from(orderItems)
    .where(inArray(orderItems.productId, ids));
  const oids = orderIds.map((o) => o.orderId);
  if (oids.length === 0) return [];
  return db
    .select()
    .from(orders)
    .where(inArray(orders.id, oids))
    .orderBy(desc(orders.createdAt));
}

export async function getVendorDashboardStats(vendorId: string) {
  const [[pc], [ac], [oc], [rev]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.vendorId, vendorId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.vendorId, vendorId), eq(products.status, "active"))),
    db
      .select({ n: sql<number>`count(distinct ${orderItems.orderId})::int` })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.vendorId, vendorId)),
    db
      .select({
        sum: sql<string>`coalesce(sum(${orderItems.lineTotal}::numeric), 0)::text`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.vendorId, vendorId)),
  ]);
  return {
    productCount: Number(pc?.n ?? 0),
    activeProductCount: Number(ac?.n ?? 0),
    orderCount: Number(oc?.n ?? 0),
    revenueLineItemsBdt: rev?.sum ?? "0",
  };
}

export async function getOrderWithItems(orderId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { order: o, items };
}

export type AdminVendorListRow = Vendor & {
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listVendorsAdminPaged(opts: {
  q?: string;
  status?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AdminVendorListRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(or(ilike(vendors.name, t), ilike(vendors.slug, t), ilike(vendors.contactEmail, t))!);
  }
  if (opts.status && ["pending", "approved", "suspended"].includes(opts.status)) {
    filters.push(eq(vendors.status, opts.status));
  }
  const whereClause = filters.length ? and(...filters) : undefined;

  const countBase = db.select({ n: sql<number>`count(*)::int` }).from(vendors);
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);

  const vCreator = alias(users, "vendor_creator");
  const vHandler = alias(users, "vendor_handler");
  const qb = db
    .select({
      vendor: vendors,
      cId: vCreator.id,
      cName: vCreator.fullName,
      cEmail: vCreator.email,
      cAvatar: vCreator.avatarUrl,
      hId: vHandler.id,
      hName: vHandler.fullName,
      hEmail: vHandler.email,
      hAvatar: vHandler.avatarUrl,
    })
    .from(vendors)
    .leftJoin(vCreator, eq(vendors.createdByUserId, vCreator.id))
    .leftJoin(vHandler, eq(vendors.updatedByUserId, vHandler.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(desc(vendors.createdAt)).limit(limit).offset(offset);
  const items: AdminVendorListRow[] = raw.map((r) => ({
    ...r.vendor,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

/** Sitemap line item (path starts with `/`). */
export type SitemapUrlEntry = {
  path: string;
  lastmod?: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
};

function w3cDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const SITEMAP_MAX_PRODUCTS = 50_000;

/** All indexable public storefront URLs (products, categories, vendors, static info pages). */
export async function listPublicSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const entries: SitemapUrlEntry[] = [];

  const evergreen: [string, SitemapUrlEntry["changefreq"], string][] = [
    ["/", "daily", "1.0"],
    ["/shop", "daily", "0.95"],
    ["/categories", "weekly", "0.8"],
  ];
  for (const [p, c, pr] of evergreen) {
    entries.push({ path: p, changefreq: c, priority: pr });
  }

  /** Brand Trust Pages — emitted only when enabled in admin (so disabled pages disappear from SEO too). */
  const trustPagePriority: Record<string, string> = {
    about: "0.65",
    contact: "0.7",
    faq: "0.65",
    privacy: "0.55",
    terms: "0.55",
    returns: "0.55",
    warranty: "0.55",
    payments: "0.5",
  };
  try {
    const trustRows = await listContentPagesAdmin();
    for (const r of trustRows) {
      if (!r.enabled) continue;
      const path = `/${r.slug}`;
      entries.push({
        path,
        lastmod: r.updatedAt ? w3cDate(r.updatedAt) : undefined,
        changefreq: "monthly",
        priority: trustPagePriority[r.slug] ?? "0.55",
      });
    }
  } catch {
    // table not yet created — fall back so sitemap still works during first deploy
    for (const slug of BRAND_TRUST_SLUGS) {
      entries.push({ path: `/${slug}`, changefreq: "monthly", priority: trustPagePriority[slug] ?? "0.55" });
    }
  }

  const cats = await db.select({ slug: categories.slug, createdAt: categories.createdAt }).from(categories);
  for (const c of cats) {
    entries.push({
      path: `/c/${c.slug}`,
      lastmod: c.createdAt ? w3cDate(c.createdAt) : undefined,
      changefreq: "weekly",
      priority: "0.75",
    });
  }

  const vrows = await db
    .select({ slug: vendors.slug, createdAt: vendors.createdAt })
    .from(vendors)
    .where(eq(vendors.status, "approved"));
  for (const v of vrows) {
    entries.push({
      path: `/v/${v.slug}`,
      lastmod: v.createdAt ? w3cDate(v.createdAt) : undefined,
      changefreq: "weekly",
      priority: "0.65",
    });
  }

  const prods = await db
    .select({ vs: vendors.slug, ps: products.slug, u: products.updatedAt })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(and(eq(products.status, "active"), eq(vendors.status, "approved")))
    .orderBy(desc(products.updatedAt))
    .limit(SITEMAP_MAX_PRODUCTS);
  for (const r of prods) {
    entries.push({
      path: `/p/${r.vs}/${r.ps}`,
      lastmod: r.u ? w3cDate(r.u) : undefined,
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  return entries;
}

/** @deprecated use listPublicSitemapEntries; leading-slash paths, de-duplicated */
export async function listPublicSitemapPaths(): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of await listPublicSitemapEntries()) {
    if (seen.has(e.path)) continue;
    seen.add(e.path);
    out.push(e.path);
  }
  return out;
}

export async function getAdminDashboardStats() {
  const [
    [vendorsTotal],
    [vendorsPending],
    [categoriesTotal],
    [bannersTotal],
    [ordersTotal],
    [ordersPending],
    [productsTotal],
    [approvedVendors],
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(vendors),
    db.select({ n: sql<number>`count(*)::int` }).from(vendors).where(eq(vendors.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(categories),
    db.select({ n: sql<number>`count(*)::int` }).from(banners),
    db.select({ n: sql<number>`count(*)::int` }).from(orders),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(products),
    db.select({ n: sql<number>`count(*)::int` }).from(vendors).where(eq(vendors.status, "approved")),
  ]);

  return {
    vendors: Number(vendorsTotal?.n ?? 0),
    vendorsPending: Number(vendorsPending?.n ?? 0),
    vendorsApproved: Number(approvedVendors?.n ?? 0),
    categories: Number(categoriesTotal?.n ?? 0),
    banners: Number(bannersTotal?.n ?? 0),
    orders: Number(ordersTotal?.n ?? 0),
    ordersPending: Number(ordersPending?.n ?? 0),
    products: Number(productsTotal?.n ?? 0),
  };
}

export async function updateVendorStatus(id: string, status: string) {
  await db.update(vendors).set({ status }).where(eq(vendors.id, id));
}

export async function updateVendorAdmin(
  id: string,
  patch: {
    status?: "pending" | "approved" | "suspended";
    commissionRate?: string;
    name?: string;
    slug?: string;
    logoUrl?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (patch.slug !== undefined) {
    const [dup] = await db.select().from(vendors).where(eq(vendors.slug, patch.slug)).limit(1);
    if (dup && dup.id !== id) return { ok: false, error: "Slug already in use" };
  }
  const set: Record<string, unknown> = {};
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.commissionRate !== undefined) set.commissionRate = patch.commissionRate;
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.logoUrl !== undefined) set.logoUrl = patch.logoUrl;
  if (patch.contactPhone !== undefined) set.contactPhone = patch.contactPhone;
  if (patch.contactEmail !== undefined) set.contactEmail = patch.contactEmail;
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length === 0) return { ok: true };
  await db.update(vendors).set(set as Partial<Vendor>).where(eq(vendors.id, id));
  return { ok: true };
}

export async function getVendorById(id: string): Promise<Vendor | undefined> {
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  return v;
}

export async function createVendorAdmin(
  data: {
    name: string;
    slug: string;
    status?: "pending" | "approved" | "suspended";
    commissionRate?: string;
    logoUrl?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  },
  actorUserId?: string | null,
): Promise<Vendor> {
  const [dup] = await db.select().from(vendors).where(eq(vendors.slug, data.slug)).limit(1);
  if (dup) throw new Error("Slug already in use");
  const actor = actorUserId ?? null;
  const [v] = await db
    .insert(vendors)
    .values({
      name: data.name.trim(),
      slug: data.slug.trim(),
      status: data.status ?? "pending",
      commissionRate: data.commissionRate ?? "0",
      logoUrl: data.logoUrl ?? null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  if (!v) throw new Error("Insert failed");
  return v;
}

export async function deleteVendorAdmin(vendorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [cnt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.vendorId, vendorId));
  if (Number(cnt?.n ?? 0) > 0) {
    return { ok: false, error: "Delete or reassign products before removing this vendor" };
  }
  await db.delete(vendors).where(eq(vendors.id, vendorId));
  return { ok: true };
}

export async function bulkDeleteVendorsByAdmin(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  for (const id of Array.from(new Set(ids)).filter(Boolean)) {
    const r = await deleteVendorAdmin(id);
    if (r.ok) deleted++;
    else errors.push(`${id}: ${r.error}`);
  }
  return { deleted, errors };
}

export async function bulkSetVendorStatus(
  ids: string[],
  status: "pending" | "approved" | "suspended",
  actorUserId?: string | null,
): Promise<number> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return 0;
  await db
    .update(vendors)
    .set({ status, ...(actorUserId ? { updatedByUserId: actorUserId } : {}) })
    .where(inArray(vendors.id, unique));
  return unique.length;
}

export async function deleteOrderAdmin(orderId: string): Promise<void> {
  await db.delete(orders).where(eq(orders.id, orderId));
}

export async function bulkUpdateOrderStatus(
  ids: string[],
  status: string,
  note?: string,
  actorUserId?: string | null,
): Promise<number> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  // Admin bulk applies ⇒ force-mode so a single illegal transition does not block the whole batch.
  const force = true;
  let n = 0;
  for (const id of unique) {
    const r = await updateOrderStatus(id, status, note, { force, actorUserId });
    if (r.ok) n++;
  }
  return n;
}

const DEFAULT_ADDRESS_BLOCK = `Salma Kunj
House-7, Road-3, Bank Colony
Holding No: 177/5/1
East Rampura
Dhaka North – 1219, Bangladesh`;

const DEFAULT_MAPS_OPEN =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(
    "Salma Kunj, House-7, Road-3, Bank Colony, Holding 177/5/1, East Rampura, Dhaka North 1219, Bangladesh",
  );

const DEFAULT_MAPS_EMBED =
  "https://maps.google.com/maps?q=" +
  encodeURIComponent(
    "Salma Kunj, House-7, Road-3, Bank Colony, Holding 177/5/1, East Rampura, Dhaka North 1219, Bangladesh",
  ) +
  "&hl=en&z=16&output=embed";

export const DEFAULT_PLATFORM_SETTINGS: Record<string, string> = {
  site_display_name: "Orlenbd",
  site_title: "Orlenbd — Online shopping in Bangladesh",
  site_description: "Shop electronics, fashion, home and more from verified sellers across Bangladesh.",
  site_keywords: "orlenbd, bangladesh, online shop, marketplace, COD",
  logo_url: "/orlenbd-logo.png",
  favicon_url: "/favicon.svg",
  og_image_url: "",
  support_email: "info.orlenbd@gmail.com",
  support_phone: "+880 1616-536106",
  contact_address: DEFAULT_ADDRESS_BLOCK,
  contact_address_sub:
    "Registered office · Online marketplace connecting buyers and independent sellers.",
  google_maps_open_url: DEFAULT_MAPS_OPEN,
  google_maps_embed_url: DEFAULT_MAPS_EMBED,
  social_facebook_url: "https://www.facebook.com/orlenbd",
  social_instagram_url: "",
  social_x_url: "https://x.com/orlenbd",
  social_tiktok_url: "https://www.tiktok.com/@orlenbd",
  social_pinterest_url: "https://www.pinterest.com/orlenbd/",
  social_youtube_url: "https://www.youtube.com/@orlenbd",
  social_whatsapp_url: "https://wa.me/8801616536106",
  social_threads_url: "",
  storefront_notice: "",
  storefront_search_rotating_keywords: "solar panel, mini fan, power bank, wireless headphones, rice cooker",
  storefront_search_popular_keywords:
    "solar panel, mini fan, power bank, rechargeable fan, charger fan, rice cooker, wireless headphones, gaming keyboard",
  storefront_theme: "theme1",
  storefront_theme_overrides: "",
  storefront_theme_primary: "",
  storefront_theme_secondary: "",
  storefront_ui_template: "orlenbd",
  orlenbd_direct_provider_checkout: "true",
  orlenpay_base_url: "https://pay.orlenbd.com",
  orlenpay_public_key: "",
  orlenpay_secret_key: "",
  orlenpay_callback_secret: "",
  orlenbd_public_base_url: "https://orlenbd.com",
  internal_notes: "",
  smtp_host: "mail.orlenbd.com",
  smtp_port: "465",
  smtp_user: "support@orlenbd.com",
  smtp_pass: "@Nexro2026",
  smtp_from: "Orlendb Support",
  smtp_subject: "Password Reset Request",
  smtp_text: "You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.",
  smtp_html: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; text-align: center; border: 1px solid #eaeaea; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <h2 style="color: #333333; margin-bottom: 20px; font-size: 24px; font-weight: 700;">Password Reset Request</h2>
  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
    We received a request to reset your password for your account. Click the button below to choose a new password.
  </p>
  <a href="\${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset Password</a>
  <p style="color: #777777; font-size: 14px; margin-top: 30px; word-break: break-all;">
    Or copy and paste this link into your browser:<br>
    <a href="\${resetLink}" style="color: #2563eb; text-decoration: underline;">\${resetLink}</a>
  </p>
  <p style="color: #999999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
    This link will expire in 1 hour. If you did not request this password reset, please safely ignore this email.
  </p>
</div>`,
  bulksmsbd_otp_format: "Your OTP is ${otp} for orlenbd.com.",
};

export const PUBLIC_SITE_META_KEYS = [
  "site_display_name",
  "site_title",
  "site_description",
  "site_keywords",
  "logo_url",
  "favicon_url",
  "og_image_url",
  "support_email",
  "support_phone",
  "contact_address",
  "contact_address_sub",
  "google_maps_open_url",
  "google_maps_embed_url",
  "social_facebook_url",
  "social_instagram_url",
  "social_x_url",
  "social_tiktok_url",
  "social_pinterest_url",
  "social_youtube_url",
  "social_whatsapp_url",
  "social_threads_url",
  "storefront_notice",
  "storefront_search_rotating_keywords",
  "storefront_search_popular_keywords",
  "storefront_theme",
  "storefront_theme_overrides",
  "storefront_theme_primary",
  "storefront_theme_secondary",
  "storefront_ui_template",
] as const;

/** DB may still hold `/orlenbd-logo.svg` from older defaults; PNG is the shipped asset. */
function normalizePlatformLogoUrl(url: string): string {
  if (/orlenbd-logo\.svg/i.test(url)) return url.replace(/orlenbd-logo\.svg/gi, "orlenbd-logo.png");
  return url;
}

const STOREFRONT_UI_TEMPLATE_ENV = new Set(["orlenbd", "norexbd", "orynbd", "masumtraders", "uttorasteel", "adorashop"]);
const STOREFRONT_THEME_ENV = new Set(["theme1", "theme2", "theme3", "theme4", "theme5", "theme6"]);

/**
 * Apply optional .env defaults for platform settings (e.g. second hostname / norexbd.com).
 * Merged before DB rows; any key saved in `platform_settings` still wins.
 */
function applyEnvDefaultPlatformSettings(m: Record<string, string>): void {
  const put = (key: string, val: string | undefined) => {
    const v = val?.trim();
    if (v) m[key] = v;
  };
  put("site_display_name", process.env.DEFAULT_SITE_DISPLAY_NAME);
  put("site_title", process.env.DEFAULT_SITE_TITLE);
  put("site_description", process.env.DEFAULT_SITE_DESCRIPTION);
  put("site_keywords", process.env.DEFAULT_SITE_KEYWORDS);
  put("logo_url", process.env.DEFAULT_LOGO_URL);
  put("favicon_url", process.env.DEFAULT_FAVICON_URL);
  put("og_image_url", process.env.DEFAULT_OG_IMAGE_URL);
  put("storefront_notice", process.env.DEFAULT_STOREFRONT_NOTICE);
  /** Per-domain / per-install (norexbd.com, orynbd.com, etc.) when DB has no row yet. */
  put("support_email", process.env.DEFAULT_SUPPORT_EMAIL);
  put("support_phone", process.env.DEFAULT_SUPPORT_PHONE);
  put("contact_address", process.env.DEFAULT_CONTACT_ADDRESS);
  put("contact_address_sub", process.env.DEFAULT_CONTACT_ADDRESS_SUB);
  put("google_maps_open_url", process.env.DEFAULT_GOOGLE_MAPS_OPEN_URL);
  put("google_maps_embed_url", process.env.DEFAULT_GOOGLE_MAPS_EMBED_URL);
  put("social_facebook_url", process.env.DEFAULT_SOCIAL_FACEBOOK_URL);
  put("social_instagram_url", process.env.DEFAULT_SOCIAL_INSTAGRAM_URL);
  put("social_x_url", process.env.DEFAULT_SOCIAL_X_URL);
  put("social_tiktok_url", process.env.DEFAULT_SOCIAL_TIKTOK_URL);
  put("social_pinterest_url", process.env.DEFAULT_SOCIAL_PINTEREST_URL);
  put("social_youtube_url", process.env.DEFAULT_SOCIAL_YOUTUBE_URL);
  put("social_whatsapp_url", process.env.DEFAULT_SOCIAL_WHATSAPP_URL);
  put("social_threads_url", process.env.DEFAULT_SOCIAL_THREADS_URL);

  const tpl = process.env.DEFAULT_STOREFRONT_UI_TEMPLATE?.trim();
  if (tpl && STOREFRONT_UI_TEMPLATE_ENV.has(tpl)) m.storefront_ui_template = tpl;

  const th = process.env.DEFAULT_STOREFRONT_THEME?.trim();
  if (th && STOREFRONT_THEME_ENV.has(th)) m.storefront_theme = th;
}

export async function getPlatformSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettings);
  const m = { ...DEFAULT_PLATFORM_SETTINGS };
  applyEnvDefaultPlatformSettings(m);
  for (const r of rows) {
    m[r.key] = r.value;
  }
  if (m.logo_url) m.logo_url = normalizePlatformLogoUrl(m.logo_url);
  return m;
}

export async function getPublicSiteMeta(): Promise<Record<string, string>> {
  const full = await getPlatformSettingsMap();
  const out: Record<string, string> = {};
  for (const k of PUBLIC_SITE_META_KEYS) {
    out[k] = full[k] ?? DEFAULT_PLATFORM_SETTINGS[k] ?? "";
  }
  return out;
}

export async function upsertPlatformSettings(updates: Record<string, string>) {
  const now = new Date();
  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(platformSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: now },
      });
  }
}

/* ---------------------------------------------------------------- Brand Trust Pages */

import {
  BRAND_TRUST_SLUGS,
  CONTENT_PAGE_DEFAULTS,
  applyContentPageTokens,
  type BrandTrustSlug,
  type ContentPageDefault,
} from "../../shared/contentPageDefaults";

export type ContentPageRow = {
  slug: BrandTrustSlug;
  enabled: boolean;
  kicker: string;
  titleEn: string;
  introEn: string;
  bodyEn: string;
  metaDescriptionEn: string;
  titleBn: string;
  introBn: string;
  bodyBn: string;
  metaDescriptionBn: string;
  updatedAt: Date;
  /** Set when row exists in DB; omitted for default-only rows. */
  creator?: AdminActorRef;
  handler?: AdminActorRef;
};

export type ResolvedContentPage = ContentPageRow & {
  /** Token-substituted English body (`{{brand}}` etc. replaced from platform_settings). */
  resolvedBodyEn: string;
  resolvedIntroEn: string;
  resolvedTitleEn: string;
  resolvedMetaEn: string;
  resolvedBodyBn: string;
  resolvedIntroBn: string;
  resolvedTitleBn: string;
  resolvedMetaBn: string;
};

const BRAND_TRUST_SLUG_SET = new Set<string>(BRAND_TRUST_SLUGS);

export function isBrandTrustSlug(slug: string): slug is BrandTrustSlug {
  return BRAND_TRUST_SLUG_SET.has(slug);
}

export function listBrandTrustSlugs(): readonly BrandTrustSlug[] {
  return BRAND_TRUST_SLUGS;
}

export function getContentPageDefault(slug: BrandTrustSlug): ContentPageDefault {
  return CONTENT_PAGE_DEFAULTS[slug];
}

function rowFromDefault(d: ContentPageDefault, updatedAt: Date = new Date()): ContentPageRow {
  return {
    slug: d.slug,
    enabled: true,
    kicker: d.kicker,
    titleEn: d.titleEn,
    introEn: d.introEn,
    bodyEn: d.bodyEn,
    metaDescriptionEn: d.metaDescriptionEn,
    titleBn: d.titleBn,
    introBn: d.introBn,
    bodyBn: d.bodyBn,
    metaDescriptionBn: d.metaDescriptionBn,
    updatedAt,
  };
}

async function getContactTokens(): Promise<{
  brand: string;
  phone: string;
  email: string;
  address: string;
}> {
  const m = await getPlatformSettingsMap();
  return {
    brand: m.site_display_name || "",
    phone: m.support_phone || "",
    email: m.support_email || "",
    address: m.contact_address || "",
  };
}

function resolvePage(row: ContentPageRow, tok: { brand: string; phone: string; email: string; address: string }): ResolvedContentPage {
  const sub = (s: string) => applyContentPageTokens(s, tok);
  return {
    ...row,
    resolvedTitleEn: sub(row.titleEn),
    resolvedIntroEn: sub(row.introEn),
    resolvedBodyEn: sub(row.bodyEn),
    resolvedMetaEn: sub(row.metaDescriptionEn),
    resolvedTitleBn: sub(row.titleBn),
    resolvedIntroBn: sub(row.introBn),
    resolvedBodyBn: sub(row.bodyBn),
    resolvedMetaBn: sub(row.metaDescriptionBn),
  };
}

export async function listContentPagesAdmin(): Promise<ContentPageRow[]> {
  const cr = alias(users, "content_page_creator");
  const hr = alias(users, "content_page_handler");
  const joined = await db
    .select({
      row: contentPages,
      cId: cr.id,
      cName: cr.fullName,
      cEmail: cr.email,
      cAvatar: cr.avatarUrl,
      hId: hr.id,
      hName: hr.fullName,
      hEmail: hr.email,
      hAvatar: hr.avatarUrl,
    })
    .from(contentPages)
    .leftJoin(cr, eq(contentPages.createdByUserId, cr.id))
    .leftJoin(hr, eq(contentPages.updatedByUserId, hr.id));
  const byKey = new Map<string, ContentPageRow>();
  for (const r of joined) {
    const row = r.row;
    byKey.set(row.slug, {
      slug: row.slug as BrandTrustSlug,
      enabled: row.enabled,
      kicker: row.kicker,
      titleEn: row.titleEn,
      introEn: row.introEn,
      bodyEn: row.bodyEn,
      metaDescriptionEn: row.metaDescriptionEn,
      titleBn: row.titleBn,
      introBn: row.introBn,
      bodyBn: row.bodyBn,
      metaDescriptionBn: row.metaDescriptionBn,
      updatedAt: row.updatedAt,
      creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
      handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
    });
  }
  return BRAND_TRUST_SLUGS.map((s) => byKey.get(s) ?? rowFromDefault(CONTENT_PAGE_DEFAULTS[s]));
}

export async function getContentPageBySlug(slug: BrandTrustSlug): Promise<ContentPageRow | null> {
  const [r] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!r) {
    return rowFromDefault(CONTENT_PAGE_DEFAULTS[slug]);
  }
  return {
    slug: r.slug as BrandTrustSlug,
    enabled: r.enabled,
    kicker: r.kicker,
    titleEn: r.titleEn,
    introEn: r.introEn,
    bodyEn: r.bodyEn,
    metaDescriptionEn: r.metaDescriptionEn,
    titleBn: r.titleBn,
    introBn: r.introBn,
    bodyBn: r.bodyBn,
    metaDescriptionBn: r.metaDescriptionBn,
    updatedAt: r.updatedAt,
  };
}

export async function getResolvedContentPage(slug: BrandTrustSlug): Promise<ResolvedContentPage | null> {
  const row = await getContentPageBySlug(slug);
  if (!row || !row.enabled) return null;
  const tok = await getContactTokens();
  return resolvePage(row, tok);
}

export async function listResolvedContentPagesPublic(): Promise<ResolvedContentPage[]> {
  const tok = await getContactTokens();
  const rows = await listContentPagesAdmin();
  return rows.filter((r) => r.enabled).map((r) => resolvePage(r, tok));
}

export type ContentPageUpdate = {
  enabled?: boolean;
  kicker?: string;
  titleEn?: string;
  introEn?: string;
  bodyEn?: string;
  metaDescriptionEn?: string;
  titleBn?: string;
  introBn?: string;
  bodyBn?: string;
  metaDescriptionBn?: string;
};

export async function upsertContentPage(
  slug: BrandTrustSlug,
  payload: ContentPageUpdate,
  actorUserId?: string | null,
): Promise<ContentPageRow> {
  const def = CONTENT_PAGE_DEFAULTS[slug];
  const [existingRow] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  /** Use existing DB row as the merge base so partial PATCH-style updates don't wipe the
   *  unspecified fields back to bundled defaults. Fall back to defaults only when the row
   *  has not been seeded yet. */
  const base: ContentPageRow = existingRow
    ? {
        slug: existingRow.slug as BrandTrustSlug,
        enabled: existingRow.enabled,
        kicker: existingRow.kicker,
        titleEn: existingRow.titleEn,
        introEn: existingRow.introEn,
        bodyEn: existingRow.bodyEn,
        metaDescriptionEn: existingRow.metaDescriptionEn,
        titleBn: existingRow.titleBn,
        introBn: existingRow.introBn,
        bodyBn: existingRow.bodyBn,
        metaDescriptionBn: existingRow.metaDescriptionBn,
        updatedAt: existingRow.updatedAt,
      }
    : rowFromDefault(def);
  const now = new Date();
  const merged = {
    slug,
    enabled: payload.enabled ?? base.enabled,
    kicker: payload.kicker ?? base.kicker,
    titleEn: (payload.titleEn ?? base.titleEn).trim() || def.titleEn,
    introEn: payload.introEn ?? base.introEn,
    bodyEn: payload.bodyEn ?? base.bodyEn,
    metaDescriptionEn: payload.metaDescriptionEn ?? base.metaDescriptionEn,
    titleBn: payload.titleBn ?? base.titleBn,
    introBn: payload.introBn ?? base.introBn,
    bodyBn: payload.bodyBn ?? base.bodyBn,
    metaDescriptionBn: payload.metaDescriptionBn ?? base.metaDescriptionBn,
    updatedAt: now,
    createdByUserId: actorUserId ?? null,
    updatedByUserId: actorUserId ?? null,
  };
  await db
    .insert(contentPages)
    .values(merged)
    .onConflictDoUpdate({
      target: contentPages.slug,
      set: {
        enabled: merged.enabled,
        kicker: merged.kicker,
        titleEn: merged.titleEn,
        introEn: merged.introEn,
        bodyEn: merged.bodyEn,
        metaDescriptionEn: merged.metaDescriptionEn,
        titleBn: merged.titleBn,
        introBn: merged.introBn,
        bodyBn: merged.bodyBn,
        metaDescriptionBn: merged.metaDescriptionBn,
        updatedAt: now,
        ...(actorUserId ? { updatedByUserId: actorUserId } : {}),
      },
    });
  return { ...merged, slug };
}

export async function resetContentPageToDefault(slug: BrandTrustSlug): Promise<ContentPageRow> {
  return upsertContentPage(slug, {
    enabled: true,
    kicker: CONTENT_PAGE_DEFAULTS[slug].kicker,
    titleEn: CONTENT_PAGE_DEFAULTS[slug].titleEn,
    introEn: CONTENT_PAGE_DEFAULTS[slug].introEn,
    bodyEn: CONTENT_PAGE_DEFAULTS[slug].bodyEn,
    metaDescriptionEn: CONTENT_PAGE_DEFAULTS[slug].metaDescriptionEn,
    titleBn: CONTENT_PAGE_DEFAULTS[slug].titleBn,
    introBn: CONTENT_PAGE_DEFAULTS[slug].introBn,
    bodyBn: CONTENT_PAGE_DEFAULTS[slug].bodyBn,
    metaDescriptionBn: CONTENT_PAGE_DEFAULTS[slug].metaDescriptionBn,
  });
}

/** Insert any missing slug rows on app boot so the table mirrors the bundled defaults. */
export async function seedDefaultContentPagesIfMissing(): Promise<void> {
  const existing = await db.select({ slug: contentPages.slug }).from(contentPages);
  const have = new Set(existing.map((r) => r.slug));
  const now = new Date();
  for (const slug of BRAND_TRUST_SLUGS) {
    if (have.has(slug)) continue;
    const d = CONTENT_PAGE_DEFAULTS[slug];
    await db
      .insert(contentPages)
      .values({
        slug,
        enabled: true,
        kicker: d.kicker,
        titleEn: d.titleEn,
        introEn: d.introEn,
        bodyEn: d.bodyEn,
        metaDescriptionEn: d.metaDescriptionEn,
        titleBn: d.titleBn,
        introBn: d.introBn,
        bodyBn: d.bodyBn,
        metaDescriptionBn: d.metaDescriptionBn,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: contentPages.slug });
  }
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  adminRoleId: string | null;
  createdAt: Date;
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listUsersAdminPaged(opts: {
  q?: string;
  role?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const uCreator = alias(users, "user_creator");
  const uHandler = alias(users, "user_handler");
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(or(ilike(users.email, t), ilike(users.fullName, t), ilike(users.phone, t))!);
  }
  if (opts.role && ["customer", "vendor_staff", "platform_admin"].includes(opts.role)) {
    filters.push(eq(users.role, opts.role));
  }
  const whereClause = filters.length ? and(...filters) : undefined;

  const countBase = db.select({ n: sql<number>`count(*)::int` }).from(users);
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);

  const qb = db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      adminRoleId: users.adminRoleId,
      createdAt: users.createdAt,
      cId: uCreator.id,
      cName: uCreator.fullName,
      cEmail: uCreator.email,
      cAvatar: uCreator.avatarUrl,
      hId: uHandler.id,
      hName: uHandler.fullName,
      hEmail: uHandler.email,
      hAvatar: uHandler.avatarUrl,
    })
    .from(users)
    .leftJoin(uCreator, eq(users.createdByUserId, uCreator.id))
    .leftJoin(uHandler, eq(users.updatedByUserId, uHandler.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const items: AdminUserRow[] = raw.map((r) => ({
    id: r.id,
    email: r.email,
    phone: r.phone,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl ?? null,
    role: r.role,
    adminRoleId: r.adminRoleId,
    createdAt: r.createdAt,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function getAdminUserById(id: string): Promise<AdminUserRow | undefined> {
  const uCreator = alias(users, "user_creator_detail");
  const uHandler = alias(users, "user_handler_detail");
  const [r] = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      adminRoleId: users.adminRoleId,
      createdAt: users.createdAt,
      cId: uCreator.id,
      cName: uCreator.fullName,
      cEmail: uCreator.email,
      cAvatar: uCreator.avatarUrl,
      hId: uHandler.id,
      hName: uHandler.fullName,
      hEmail: uHandler.email,
      hAvatar: uHandler.avatarUrl,
    })
    .from(users)
    .leftJoin(uCreator, eq(users.createdByUserId, uCreator.id))
    .leftJoin(uHandler, eq(users.updatedByUserId, uHandler.id))
    .where(eq(users.id, id))
    .limit(1);
  if (!r) return undefined;
  return {
    id: r.id,
    email: r.email,
    phone: r.phone,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl ?? null,
    role: r.role,
    adminRoleId: r.adminRoleId,
    createdAt: r.createdAt,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  };
}

export async function deleteUserByAdmin(
  userId: string,
  actorUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userId === actorUserId) return { ok: false, error: "Cannot delete your own account" };
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return { ok: false, error: "User not found" };
  if (existing.role === "platform_admin") {
    const admins = await countUsersWithRole("platform_admin");
    if (admins <= 1) return { ok: false, error: "Cannot delete the last platform administrator" };
  }
  const [vm] = await db.select().from(vendorMembers).where(eq(vendorMembers.userId, userId)).limit(1);
  if (vm) return { ok: false, error: "Remove vendor membership before deleting this user" };
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}

export async function bulkDeleteUsersByAdmin(
  ids: string[],
  actorUserId: string
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  const unique = Array.from(new Set(ids)).filter(Boolean);
  for (const id of unique) {
    const r = await deleteUserByAdmin(id, actorUserId);
    if (r.ok) deleted++;
    else errors.push(`${id}: ${r.error}`);
  }
  return { deleted, errors };
}

export async function countUsersWithRole(role: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.role, role));
  return Number(r?.n ?? 0);
}

export async function updateUserAdmin(
  userId: string,
  patch: {
    role?: "customer" | "vendor_staff" | "platform_admin";
    fullName?: string;
    adminRoleId?: string | null;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "last_admin" }> {
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return { ok: false, error: "not_found" };

  if (patch.role !== undefined && patch.role !== existing.role) {
    if (existing.role === "platform_admin") {
      const admins = await countUsersWithRole("platform_admin");
      if (admins <= 1) return { ok: false, error: "last_admin" };
    }
  }

  const set: {
    role?: string;
    fullName?: string;
    adminRoleId?: string | null;
    updatedByUserId?: string | null;
  } = {};
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.adminRoleId !== undefined) {
    if (existing.role !== "platform_admin" && patch.adminRoleId !== null) {
      // ignore invalid assignment
    } else {
      set.adminRoleId = patch.adminRoleId;
    }
  }
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(users).set(set).where(eq(users.id, userId));
  return { ok: true };
}

export type AdminProductRow = {
  id: string;
  vendorId: string;
  title: string;
  slug: string;
  price: string;
  stock: number;
  status: string;
  updatedAt: Date;
  vendorName: string;
  vendorSlug: string;
  images: string[];
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listProductsAdminPaged(opts: {
  q?: string;
  status?: string;
  vendorId?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AdminProductRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(
      or(
        ilike(products.title, t),
        ilike(products.slug, t),
        ilike(vendors.name, t),
        ilike(vendors.slug, t)
      )!
    );
  }
  if (opts.status === "active" || opts.status === "draft") {
    filters.push(eq(products.status, opts.status));
  }
  if (opts.vendorId?.trim()) {
    filters.push(eq(products.vendorId, opts.vendorId.trim()));
  }
  const whereClause = filters.length ? and(...filters) : undefined;

  const countBase = db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id));
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);

  const pCreator = alias(users, "product_creator");
  const pHandler = alias(users, "product_handler");
  const qb = db
    .select({
      id: products.id,
      vendorId: products.vendorId,
      title: products.title,
      slug: products.slug,
      images: products.images,
      price: products.price,
      stock: products.stock,
      status: products.status,
      updatedAt: products.updatedAt,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
      cId: pCreator.id,
      cName: pCreator.fullName,
      cEmail: pCreator.email,
      cAvatar: pCreator.avatarUrl,
      hId: pHandler.id,
      hName: pHandler.fullName,
      hEmail: pHandler.email,
      hAvatar: pHandler.avatarUrl,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(pCreator, eq(products.createdByUserId, pCreator.id))
    .leftJoin(pHandler, eq(products.updatedByUserId, pHandler.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(desc(products.updatedAt)).limit(limit).offset(offset);
  const items: AdminProductRow[] = raw.map((r) => ({
    id: r.id,
    vendorId: r.vendorId,
    title: r.title,
    slug: r.slug,
    images: r.images,
    price: r.price,
    stock: r.stock,
    status: r.status,
    updatedAt: r.updatedAt,
    vendorName: r.vendorName,
    vendorSlug: r.vendorSlug,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function getAdminProductById(productId: string) {
  const [row] = await db
    .select({
      product: products,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(eq(products.id, productId))
    .limit(1);
  if (!row) return undefined;
  const variants = await listVariantsForProduct(productId);
  return { ...row, variants };
}

export async function updateProductAdmin(
  productId: string,
  patch: { status?: "draft" | "active" },
  actorUserId?: string | null,
) {
  const set: { status?: string; updatedAt: Date; updatedByUserId?: string | null } = { updatedAt: new Date() };
  if (patch.status !== undefined) set.status = patch.status;
  if (actorUserId) set.updatedByUserId = actorUserId;
  await db.update(products).set(set).where(eq(products.id, productId));
}

export async function updateProductAdminFull(
  productId: string,
  patch: {
    vendorId?: string;
    title?: string;
    slug?: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    price?: string;
    compareAtPrice?: string | null;
    stock?: number;
    status?: "draft" | "active";
    categoryId?: string | null;
    images?: string[];
    keyFeaturesJson?: { en: string; bn: string } | null;
    specificationsJson?: { label: string; value: string }[] | null;
    generalInfoJson?: { en: string; bn: string } | null;
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
    variants?: Array<{
      kind: string;
      name: string;
      value: string;
      price: string;
      stock: number;
      sortOrder?: number;
    }>;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!existing) return { ok: false, error: "Not found" };
  const nextVendorId = patch.vendorId ?? existing.vendorId;
  if (patch.vendorId !== undefined) {
    const [v] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, patch.vendorId)).limit(1);
    if (!v) return { ok: false, error: "Vendor not found" };
  }
  if (patch.slug !== undefined && (patch.slug !== existing.slug || nextVendorId !== existing.vendorId)) {
    const [dup] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.vendorId, nextVendorId), eq(products.slug, patch.slug)))
      .limit(1);
    if (dup && dup.id !== productId) return { ok: false, error: "Slug already used for this vendor" };
  }
  const u: {
    vendorId?: string;
    title?: string;
    slug?: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    price?: string;
    compareAtPrice?: string | null;
    stock?: number;
    status?: string;
    categoryId?: string | null;
    images?: string[];
    keyFeaturesJson?: { en: string; bn: string } | null;
    specificationsJson?: { label: string; value: string }[] | null;
    generalInfoJson?: { en: string; bn: string } | null;
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
    updatedByUserId?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (actorUserId) u.updatedByUserId = actorUserId;
  if (patch.vendorId !== undefined) u.vendorId = patch.vendorId;
  if (patch.title !== undefined) u.title = patch.title;
  if (patch.slug !== undefined) u.slug = patch.slug;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.seoTitle !== undefined) u.seoTitle = patch.seoTitle;
  if (patch.seoDescription !== undefined) u.seoDescription = patch.seoDescription;
  if (patch.seoKeywords !== undefined) u.seoKeywords = patch.seoKeywords;
  if (patch.price !== undefined) u.price = patch.price;
  if (patch.compareAtPrice !== undefined) u.compareAtPrice = patch.compareAtPrice;
  if (patch.stock !== undefined) u.stock = patch.stock;
  if (patch.status !== undefined) u.status = patch.status;
  if (patch.categoryId !== undefined) u.categoryId = patch.categoryId;
  if (patch.images !== undefined) u.images = patch.images;
  if (patch.keyFeaturesJson !== undefined) u.keyFeaturesJson = patch.keyFeaturesJson;
  if (patch.specificationsJson !== undefined) u.specificationsJson = patch.specificationsJson;
  if (patch.generalInfoJson !== undefined) u.generalInfoJson = patch.generalInfoJson;
  const enabledAfter =
    patch.freeDeliveryEnabled !== undefined ? patch.freeDeliveryEnabled : existing.freeDeliveryEnabled;
  if (patch.freeDeliveryEnabled !== undefined) u.freeDeliveryEnabled = patch.freeDeliveryEnabled;
  if (!enabledAfter) {
    u.freeDeliveryMinCartAmount = null;
    u.freeDeliveryMinQuantity = null;
  } else {
    if (patch.freeDeliveryMinCartAmount !== undefined) u.freeDeliveryMinCartAmount = patch.freeDeliveryMinCartAmount;
    if (patch.freeDeliveryMinQuantity !== undefined) u.freeDeliveryMinQuantity = patch.freeDeliveryMinQuantity;
  }
  await db.update(products).set(u).where(eq(products.id, productId));
  if (patch.variants !== undefined) {
    await replaceProductVariants(productId, patch.variants);
    await syncProductPriceStockFromVariants(productId);
  }
  return { ok: true };
}

export async function deleteProductsByIds(ids: string[]): Promise<number> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return 0;
  await db.delete(products).where(inArray(products.id, unique));
  return unique.length;
}

export async function bulkSetProductStatus(
  ids: string[],
  status: "draft" | "active",
  actorUserId?: string | null,
): Promise<number> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return 0;
  await db
    .update(products)
    .set({
      status,
      updatedAt: new Date(),
      ...(actorUserId ? { updatedByUserId: actorUserId } : {}),
    })
    .where(inArray(products.id, unique));
  return unique.length;
}

export async function getAdminOrderById(orderId: string) {
  const rows = await db
    .select({ order: orders, courier: couriers })
    .from(orders)
    .leftJoin(couriers, eq(orders.courierId, couriers.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt));
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt));
  const c = row.courier;
  const courier =
    c?.id != null
      ? {
          id: c.id,
          name: c.name,
          slug: c.slug,
          website: c.website,
          trackingUrlTemplate: c.trackingUrlTemplate,
          phone: c.phone,
          active: c.active,
          partnerType: c.partnerType,
        }
      : null;
  return {
    order: row.order,
    courier,
    items,
    history,
    payments: paymentRows,
    discounts: {
      storedHistorically: false as const,
      message:
        "Compare-at and discount amounts are not stored on order line items; only snapshot title, unit price, and line total are kept.",
    },
  };
}

export async function updateAdminOrderFulfillment(
  orderId: string,
  patch: {
    courierId?: string | null;
    trackingNumber?: string | null;
    warehouseReceivedAt?: Date | null;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [orderRow] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, courierId: orders.courierId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!orderRow) return { ok: false, error: "not_found" };
  if (
    patch.courierId === undefined &&
    patch.trackingNumber === undefined &&
    patch.warehouseReceivedAt === undefined
  ) {
    return { ok: true };
  }
  if (patch.courierId) {
    const [cr] = await db.select().from(couriers).where(eq(couriers.id, patch.courierId)).limit(1);
    if (!cr) return { ok: false, error: "invalid_courier" };
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.courierId !== undefined) set.courierId = patch.courierId;
  if (patch.trackingNumber !== undefined) set.trackingNumber = patch.trackingNumber;
  if (patch.warehouseReceivedAt !== undefined) set.warehouseReceivedAt = patch.warehouseReceivedAt;
  if (actorUserId) set.updatedByUserId = actorUserId;

  const courierIdAfter = patch.courierId !== undefined ? patch.courierId : orderRow.courierId;
  if (courierIdAfter) {
    const [c] = await db
      .select({ partnerType: couriers.partnerType })
      .from(couriers)
      .where(eq(couriers.id, courierIdAfter))
      .limit(1);
    if (c?.partnerType === "pathao") {
      /** Pathao `merchant_order_id` is always our public order_number; tracking field stays aligned. */
      set.trackingNumber = orderRow.orderNumber;
    }
  }

  await db.update(orders).set(set as Partial<(typeof orders.$inferInsert)>).where(eq(orders.id, orderId));
  return { ok: true };
}

export async function updateAdminOrderCustomer(
  orderId: string,
  patch: { customerName?: string; customerPhone?: string },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  if (patch.customerName === undefined && patch.customerPhone === undefined) return { ok: true };
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: "not_found" };
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.customerName !== undefined) set.customerName = patch.customerName.trim();
  if (patch.customerPhone !== undefined) set.customerPhone = normalizeBdPhone(patch.customerPhone);
  if (actorUserId) set.updatedByUserId = actorUserId;
  await db.update(orders).set(set as Partial<(typeof orders.$inferInsert)>).where(eq(orders.id, orderId));
  return { ok: true };
}

export async function updateAdminOrderShipping(
  orderId: string,
  patch: {
    shippingAddress?: Record<string, unknown>;
    shippingFee?: string | number;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: "not_found" };
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.shippingAddress !== undefined) set.shippingAddress = patch.shippingAddress;
  if (patch.shippingFee !== undefined) {
    const ship = parseDecimalString(String(patch.shippingFee));
    const sub = parseDecimalString(String(o.subtotal));
    set.shippingFee = ship.toFixed(2);
    set.total = (sub + ship).toFixed(2);
  }
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length <= 1) return { ok: true };
  await db.update(orders).set(set as Partial<(typeof orders.$inferInsert)>).where(eq(orders.id, orderId));
  return { ok: true };
}

export async function adminCreateOrderFromPayload(data: {
  userId?: string | null;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  shippingAddress: Record<string, unknown>;
  lines: { productId: string; quantity: number; variantId?: string | null }[];
  actorUserId?: string | null;
}) {
  const createdBy = data.actorUserId ?? null;
  if (!data.lines?.length) throw new Error("Add at least one line item");
  const builtLines: Parameters<typeof createOrderWithItems>[0]["lines"] = [];
  for (const l of data.lines) {
    const qty = l.quantity;
    if (!Number.isFinite(qty) || qty < 1) throw new Error("Invalid quantity");
    const [p] = await db.select().from(products).where(eq(products.id, l.productId)).limit(1);
    if (!p) throw new Error("Product not found");
    if (p.status !== "active") throw new Error(`${p.title} is not available for sale`);
    const nVar = await countVariantsForProduct(l.productId);
    let variantId = l.variantId ?? null;
    let pv: ProductVariant | null = null;
    if (nVar > 0) {
      if (!variantId) throw new Error(`Choose a variant for ${p.title}`);
      const [pvRow] = await db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, l.productId)))
        .limit(1);
      if (!pvRow) throw new Error(`Invalid variant for ${p.title}`);
      if (pvRow.stock < qty) throw new Error(`Insufficient stock for ${p.title}`);
      pv = pvRow;
    } else {
      variantId = null;
      if (p.stock < qty) throw new Error(`Insufficient stock for ${p.title}`);
    }
    const unitPriceStr = pv ? String(pv.price) : String(p.price);
    const price = parseDecimalString(unitPriceStr);
    const label =
      pv && pv.name && pv.value ? `${p.title} (${pv.name}: ${pv.value})` : p.title;
    builtLines.push({
      productId: l.productId,
      title: label,
      price: unitPriceStr,
      quantity: qty,
      lineTotal: (price * qty).toFixed(2),
      variantId,
      variantLabelSnapshot: pv && pv.name && pv.value ? `${pv.name}: ${pv.value}` : null,
    });
  }
  const subtotal = builtLines.reduce((s, line) => s + parseDecimalString(line.lineTotal), 0);
  const waiveShip =
    builtLines.length > 0 &&
    (await orderLinesQualifyFreeDelivery(
      builtLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      subtotal,
    ));
  const addrParsed = shippingAddressSchema.safeParse(data.shippingAddress);
  if (!addrParsed.success) throw new Error("Invalid shipping address");
  const pathaoCourier = await getDefaultPathaoCourier();
  if (!pathaoCourier) {
    return createOrderWithItems({
      userId: data.userId ?? null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      lines: builtLines,
      shippingFee: "0",
      initialPayment: { method: data.paymentMethod, amount: subtotal.toFixed(2), status: "pending" },
      createdByUserId: createdBy,
    });
  }
  if (addrParsed.data.pathaoCityId == null || addrParsed.data.pathaoZoneId == null) {
    return createOrderWithItems({
      userId: data.userId ?? null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      lines: builtLines,
      shippingFee: "0",
      initialPayment: { method: data.paymentMethod, amount: subtotal.toFixed(2), status: "pending" },
      createdByUserId: createdBy,
    });
  }
  const shipQuote = waiveShip
    ? ({ ok: true as const, fee: 0 })
    : await computePathaoShippingFeeForCheckout(pathaoCourier, builtLines.map((l) => l.quantity), addrParsed.data);
  if (!shipQuote.ok) throw new Error(shipQuote.error);
  const shipFee = shipQuote.fee;
  const grand = subtotal + shipFee;
  const shippingRecord = buildShippingAddressRecord(addrParsed.data);
  return createOrderWithItems({
    userId: data.userId ?? null,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    paymentMethod: data.paymentMethod,
    shippingAddress: shippingRecord,
    lines: builtLines,
    shippingFee: shipFee.toFixed(2),
    initialPayment: { method: data.paymentMethod, amount: grand.toFixed(2), status: "pending" },
    createdByUserId: createdBy,
  });
}

export type AdminCourierListRow = Courier & {
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listCouriersAdminPaged(opts: {
  q?: string;
  active?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AdminCourierListRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(or(ilike(couriers.name, t), ilike(couriers.slug, t), ilike(couriers.phone, t))!);
  }
  if (opts.active === "true") filters.push(eq(couriers.active, true));
  if (opts.active === "false") filters.push(eq(couriers.active, false));
  const whereClause = filters.length ? and(...filters) : undefined;
  const countBase = db.select({ n: sql<number>`count(*)::int` }).from(couriers);
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);
  const crCreator = alias(users, "courier_creator");
  const crHandler = alias(users, "courier_handler");
  const qb = db
    .select({
      courier: couriers,
      cId: crCreator.id,
      cName: crCreator.fullName,
      cEmail: crCreator.email,
      cAvatar: crCreator.avatarUrl,
      hId: crHandler.id,
      hName: crHandler.fullName,
      hEmail: crHandler.email,
      hAvatar: crHandler.avatarUrl,
    })
    .from(couriers)
    .leftJoin(crCreator, eq(couriers.createdByUserId, crCreator.id))
    .leftJoin(crHandler, eq(couriers.updatedByUserId, crHandler.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(asc(couriers.name)).limit(limit).offset(offset);
  const items: AdminCourierListRow[] = raw.map((r) => ({
    ...r.courier,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function getCourierById(id: string): Promise<Courier | undefined> {
  const [c] = await db.select().from(couriers).where(eq(couriers.id, id)).limit(1);
  return c;
}

export type CourierAdminInput = {
  name: string;
  slug: string;
  website?: string | null;
  trackingUrlTemplate?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
  partnerType?: string;
  apiBaseUrl?: string | null;
  apiCredentials?: Record<string, unknown>;
  webhookSecret?: string | null;
  webhookIntegrationSecret?: string | null;
  defaultEtaHours?: number | null;
};

export async function createCourierAdmin(data: CourierAdminInput, actorUserId?: string | null): Promise<Courier> {
  const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "courier";
  const [dup] = await db.select().from(couriers).where(eq(couriers.slug, slug)).limit(1);
  if (dup) throw new Error("Slug already in use");
  const actor = actorUserId ?? null;
  const [c] = await db
    .insert(couriers)
    .values({
      name: data.name.trim(),
      slug,
      website: data.website?.trim() || null,
      trackingUrlTemplate: data.trackingUrlTemplate?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      active: data.active ?? true,
      partnerType: (data.partnerType?.trim() || "manual") as Courier["partnerType"],
      apiBaseUrl: data.apiBaseUrl?.trim() || null,
      apiCredentials: data.apiCredentials ?? {},
      webhookSecret: data.webhookSecret?.trim() || null,
      webhookIntegrationSecret: data.webhookIntegrationSecret?.trim() || null,
      defaultEtaHours: data.defaultEtaHours ?? null,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  if (!c) throw new Error("Insert failed");
  return c;
}

export async function updateCourierAdmin(
  id: string,
  patch: Partial<CourierAdminInput>,
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (patch.slug !== undefined) {
    const slug = patch.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "courier";
    const [dup] = await db.select().from(couriers).where(eq(couriers.slug, slug)).limit(1);
    if (dup && dup.id !== id) return { ok: false, error: "Slug already in use" };
    patch = { ...patch, slug };
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name.trim();
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.website !== undefined) set.website = patch.website?.trim() || null;
  if (patch.trackingUrlTemplate !== undefined) set.trackingUrlTemplate = patch.trackingUrlTemplate?.trim() || null;
  if (patch.phone !== undefined) set.phone = patch.phone?.trim() || null;
  if (patch.notes !== undefined) set.notes = patch.notes?.trim() || null;
  if (patch.active !== undefined) set.active = patch.active;
  if (patch.partnerType !== undefined) set.partnerType = patch.partnerType;
  if (patch.apiBaseUrl !== undefined) set.apiBaseUrl = patch.apiBaseUrl?.trim() || null;
  if (patch.apiCredentials !== undefined) set.apiCredentials = patch.apiCredentials;
  if (patch.webhookSecret !== undefined) set.webhookSecret = patch.webhookSecret?.trim() || null;
  if (patch.webhookIntegrationSecret !== undefined)
    set.webhookIntegrationSecret = patch.webhookIntegrationSecret?.trim() || null;
  if (patch.defaultEtaHours !== undefined) set.defaultEtaHours = patch.defaultEtaHours ?? null;
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length <= 1) return { ok: true };
  await db.update(couriers).set(set as Partial<Courier>).where(eq(couriers.id, id));
  return { ok: true };
}

export async function deleteCourierAdmin(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [cnt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.courierId, id));
  if (Number(cnt?.n ?? 0) > 0) {
    return { ok: false, error: "Courier is assigned to orders; deactivate instead of deleting." };
  }
  await db.delete(couriers).where(eq(couriers.id, id));
  return { ok: true };
}

export async function getCourierBySlug(slug: string): Promise<Courier | undefined> {
  const [c] = await db.select().from(couriers).where(eq(couriers.slug, slug)).limit(1);
  return c;
}

/** First active Pathao courier (storefront location APIs + default quotes). */
export async function getDefaultPathaoCourier(): Promise<Courier | undefined> {
  const [c] = await db
    .select()
    .from(couriers)
    .where(and(eq(couriers.active, true), eq(couriers.partnerType, "pathao")))
    .orderBy(asc(couriers.createdAt))
    .limit(1);
  return c;
}

/**
 * Append a row to the courier_events log. `payload` is stored verbatim so we
 * can audit / replay partner traffic later.
 */
export async function recordCourierEvent(input: {
  orderId: string;
  courierId?: string | null;
  direction: "outbound" | "inbound";
  kind: string;
  payload: Record<string, unknown>;
  statusBefore?: string | null;
  statusAfter?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  await db.insert(courierEvents).values({
    orderId: input.orderId,
    courierId: input.courierId ?? null,
    direction: input.direction,
    kind: input.kind,
    payload: input.payload,
    statusBefore: input.statusBefore ?? null,
    statusAfter: input.statusAfter ?? null,
    errorMessage: input.errorMessage ?? null,
  });
}

/**
 * Dispatch an order to a courier partner: calls the adapter's createShipment,
 * persists the consignment id + dispatched_at + eta_at, transitions the order
 * to `assigned_to_courier`, and writes a courier_events row.
 */
export async function dispatchOrderToCourier(
  orderId: string,
  courierId: string,
  opts?: { webhookUrl?: string; actorUserId?: string | null },
): Promise<
  | { ok: true; consignmentId: string; etaAt: Date | null; partnerType: string }
  | { ok: false; error: string }
> {
  const [orderRow] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!orderRow) return { ok: false, error: "Order not found." };
  const [courier] = await db.select().from(couriers).where(eq(couriers.id, courierId)).limit(1);
  if (!courier) return { ok: false, error: "Courier not found." };
  if (!courier.active) return { ok: false, error: "Courier is inactive." };

  if (orderRow.status !== "at_warehouse") {
    return {
      ok: false,
      error: `Order must be at_warehouse to dispatch (currently ${orderRow.status}).`,
    };
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const adapter = getAdapter(courier.partnerType);

  const result = await adapter.createShipment({
    order: orderRow,
    items,
    courier,
    webhookUrl: opts?.webhookUrl,
  });

  if (!result.ok) {
    await recordCourierEvent({
      orderId,
      courierId,
      direction: "outbound",
      kind: "create_shipment",
      payload: { error: result.error, raw: result.raw ?? null },
      statusBefore: orderRow.status,
      statusAfter: orderRow.status,
      errorMessage: result.error,
    });
    return { ok: false, error: result.error };
  }

  const etaAt =
    result.etaAt ??
    (courier.defaultEtaHours != null
      ? new Date(Date.now() + courier.defaultEtaHours * 60 * 60 * 1000)
      : null);

  await db
    .update(orders)
    .set({
      courierId: courier.id,
      partnerConsignmentId: result.consignmentId,
      trackingNumber:
        courier.partnerType === "pathao"
          ? orderRow.orderNumber
          : orderRow.trackingNumber ?? result.consignmentId,
      dispatchedAt: new Date(),
      etaAt,
      updatedAt: new Date(),
      ...(opts?.actorUserId ? { updatedByUserId: opts.actorUserId } : {}),
    })
    .where(eq(orders.id, orderId));

  const transition = await updateOrderStatus(
    orderId,
    "assigned_to_courier",
    `Dispatched to ${courier.name} (consignment ${result.consignmentId})`,
    { actorUserId: opts?.actorUserId },
  );

  await recordCourierEvent({
    orderId,
    courierId,
    direction: "outbound",
    kind: "create_shipment",
    payload: { consignmentId: result.consignmentId, raw: result.raw },
    statusBefore: orderRow.status,
    statusAfter: transition.ok ? "assigned_to_courier" : orderRow.status,
  });

  return {
    ok: true,
    consignmentId: result.consignmentId,
    etaAt,
    partnerType: courier.partnerType,
  };
}

/**
 * Cancel an in-flight shipment via the partner API and transition the order
 * to `cancelled`. Records both the outbound call and the resulting status
 * change in courier_events.
 */
export async function cancelOrderShipment(
  orderId: string,
  note: string,
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [orderRow] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!orderRow) return { ok: false, error: "Order not found." };
  if (!orderRow.courierId) return { ok: false, error: "Order has no assigned courier to cancel." };
  const [courier] = await db.select().from(couriers).where(eq(couriers.id, orderRow.courierId)).limit(1);
  if (!courier) return { ok: false, error: "Courier not found." };
  const adapter = getAdapter(courier.partnerType);
  const result = await adapter.cancelShipment({ order: orderRow, courier });
  await recordCourierEvent({
    orderId,
    courierId: courier.id,
    direction: "outbound",
    kind: "cancel_shipment",
    payload: result.ok ? { raw: result.raw } : { error: result.error, raw: result.raw ?? null },
    statusBefore: orderRow.status,
    statusAfter: result.ok ? "cancelled" : orderRow.status,
    errorMessage: result.ok ? null : result.error,
  });
  if (!result.ok) return { ok: false, error: result.error };
  await updateOrderStatus(orderId, "cancelled", note, { force: true, actorUserId });
  return { ok: true };
}

/**
 * Apply a status transition triggered by a partner webhook. Always
 * stamps `lastPartnerEventAt`. Logs the inbound event regardless of whether
 * the status actually changed (so the timeline shows the heartbeat).
 */
export async function applyPartnerStatus(
  orderId: string,
  internalStatus: OrderStatus | undefined,
  partnerStatus: string,
  payload: Record<string, unknown>,
  opts?: { occurredAt?: Date; courierId?: string | null; note?: string },
): Promise<void> {
  const [orderRow] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!orderRow) return;
  const before = orderRow.status;
  let after = before;
  let errorMessage: string | null = null;

  const timelineNote = (opts?.note ?? "").trim() || undefined;

  if (internalStatus) {
    let force = false;
    if (isOrderStatus(before) && isOrderStatus(internalStatus)) {
      const allowed = ORDER_STATUS_TRANSITIONS[before].includes(internalStatus);
      if (!allowed && internalStatus === "cancelled" && !isTerminalOrderStatus(before)) {
        force = true;
      }
      if (!allowed && internalStatus === "returned" && !isTerminalOrderStatus(before)) {
        force = true;
      }
    }
    const r = await updateOrderStatus(orderId, internalStatus, opts?.note, {
      occurredAt: opts?.occurredAt,
      markPartnerEvent: true,
      force,
    });
    if (r.ok) after = internalStatus;
    else errorMessage = r.error;
  } else if (timelineNote) {
    await db.insert(orderStatusHistory).values({
      orderId,
      status: before,
      note: timelineNote,
    });
    await db
      .update(orders)
      .set({ lastPartnerEventAt: opts?.occurredAt ?? new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  } else {
    await db
      .update(orders)
      .set({ lastPartnerEventAt: opts?.occurredAt ?? new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }
  await recordCourierEvent({
    orderId,
    courierId: opts?.courierId ?? null,
    direction: "inbound",
    kind: "status_update",
    payload: { partnerStatus, ...payload },
    statusBefore: before,
    statusAfter: after,
    errorMessage,
  });
}

/**
 * Merged courier timeline used by the admin order modal: status history rows
 * (admin-driven) interleaved with courier_events rows (partner-driven).
 */
export async function listCourierTimeline(orderId: string): Promise<{
  events: CourierEvent[];
  history: { status: string; note: string | null; createdAt: Date }[];
}> {
  const events = await db
    .select()
    .from(courierEvents)
    .where(eq(courierEvents.orderId, orderId))
    .orderBy(asc(courierEvents.createdAt));
  const history = await db
    .select({ status: orderStatusHistory.status, note: orderStatusHistory.note, createdAt: orderStatusHistory.createdAt })
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt));
  return { events, history };
}

export async function getOrderByConsignmentId(
  consignmentId: string,
): Promise<Order | undefined> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.partnerConsignmentId, consignmentId))
    .limit(1);
  return o;
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined> {
  const [o] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return o;
}

export async function createVendorForUser(data: {
  userId: string;
  name: string;
  slug: string;
  contactPhone?: string;
  contactEmail?: string;
}) {
  const [v] = await db
    .insert(vendors)
    .values({
      name: data.name,
      slug: data.slug,
      status: "pending",
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
    })
    .returning();
  await db.insert(vendorMembers).values({
    userId: data.userId,
    vendorId: v.id,
    memberRole: "owner",
  });
  await db.update(users).set({ role: "vendor_staff" }).where(eq(users.id, data.userId));
  return v;
}

export type CreateCategoryInput = {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

export async function createCategory(
  data: CreateCategoryInput,
  actorUserId?: string | null,
): Promise<{ ok: true; category: Category } | { ok: false; error: string }> {
  const trimmedSlug = data.slug.trim();
  if (!trimmedSlug || !data.name.trim()) {
    return { ok: false, error: "Name and slug are required" };
  }
  const [dup] = await db.select().from(categories).where(eq(categories.slug, trimmedSlug)).limit(1);
  if (dup) return { ok: false, error: "Slug already in use" };
  if (data.parentId) {
    const allRows = (await listCategories()) as CategoryTreeRow[];
    if (wouldExceedDepth(allRows, data.parentId)) {
      return { ok: false, error: "max_depth" };
    }
  }
  const actor = actorUserId ?? null;
  const [c] = await db
    .insert(categories)
    .values({
      name: data.name.trim(),
      slug: trimmedSlug,
      parentId: data.parentId ?? null,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  return { ok: true, category: c };
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

export type AdminCategoryListRow = Category & {
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listCategoriesAdminPaged(opts: { q?: string; limit: number; offset: number }): Promise<{
  items: AdminCategoryListRow[];
  total: number;
}> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(or(ilike(categories.name, t), ilike(categories.slug, t))!);
  }
  const whereClause = filters.length ? and(...filters) : undefined;
  const countB = db.select({ n: sql<number>`count(*)::int` }).from(categories);
  const [countRow] = whereClause ? await countB.where(whereClause) : await countB;
  const total = Number(countRow?.n ?? 0);
  const catCr = alias(users, "cat_creator");
  const catH = alias(users, "cat_handler");
  const qb = db
    .select({
      category: categories,
      cId: catCr.id,
      cName: catCr.fullName,
      cEmail: catCr.email,
      cAvatar: catCr.avatarUrl,
      hId: catH.id,
      hName: catH.fullName,
      hEmail: catH.email,
      hAvatar: catH.avatarUrl,
    })
    .from(categories)
    .leftJoin(catCr, eq(categories.createdByUserId, catCr.id))
    .leftJoin(catH, eq(categories.updatedByUserId, catH.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(asc(categories.sortOrder), asc(categories.name)).limit(limit).offset(offset);
  const items: AdminCategoryListRow[] = raw.map((r) => ({
    ...r.category,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function updateCategoryAdmin(
  id: string,
  patch: {
    name?: string;
    slug?: string;
    parentId?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
  },
  actorUserId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (patch.slug !== undefined) {
    const [dup] = await db.select().from(categories).where(eq(categories.slug, patch.slug)).limit(1);
    if (dup && dup.id !== id) return { ok: false, error: "Slug already in use" };
  }
  if (patch.parentId !== undefined && patch.parentId) {
    const allRows = (await listCategories()) as CategoryTreeRow[];
    if (wouldCreateCycle(allRows, patch.parentId, id)) {
      return { ok: false, error: "cycle" };
    }
    if (wouldExceedDepth(allRows, patch.parentId, id)) {
      return { ok: false, error: "max_depth" };
    }
  }
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.parentId !== undefined) set.parentId = patch.parentId;
  if (patch.imageUrl !== undefined) set.imageUrl = patch.imageUrl;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length === 0) return { ok: true };
  await db.update(categories).set(set as Partial<Category>).where(eq(categories.id, id));
  return { ok: true };
}

export async function createBanner(data: {
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  placement?: string;
  sortOrder?: number;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showButton?: boolean;
  showShadow?: boolean;
  actorUserId?: string | null;
}) {
  const actor = data.actorUserId ?? null;
  const [b] = await db
    .insert(banners)
    .values({
      title: data.title,
      subtitle: data.subtitle ?? null,
      ctaLabel: data.ctaLabel ?? null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl ?? null,
      placement: data.placement ?? "hero",
      sortOrder: data.sortOrder ?? 0,
      showTitle: data.showTitle ?? true,
      showSubtitle: data.showSubtitle ?? true,
      showButton: data.showButton ?? true,
      showShadow: data.showShadow ?? true,
      active: true,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  return b;
}

export async function listBannersAdmin() {
  return db.select().from(banners).orderBy(asc(banners.placement), asc(banners.sortOrder));
}

export type AdminBannerListRow = typeof banners.$inferSelect & {
  creator: AdminActorRef;
  handler: AdminActorRef;
};

export async function listBannersAdminPaged(opts: {
  q?: string;
  placement?: string;
  active?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AdminBannerListRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(or(ilike(banners.title, t), ilike(banners.subtitle, t))!);
  }
  if (opts.placement?.trim()) filters.push(eq(banners.placement, opts.placement.trim()));
  if (opts.active === "true") filters.push(eq(banners.active, true));
  if (opts.active === "false") filters.push(eq(banners.active, false));
  const whereClause = filters.length ? and(...filters) : undefined;
  const countB = db.select({ n: sql<number>`count(*)::int` }).from(banners);
  const [countRow] = whereClause ? await countB.where(whereClause) : await countB;
  const total = Number(countRow?.n ?? 0);
  const bCr = alias(users, "banner_creator");
  const bH = alias(users, "banner_handler");
  const qb = db
    .select({
      banner: banners,
      cId: bCr.id,
      cName: bCr.fullName,
      cEmail: bCr.email,
      cAvatar: bCr.avatarUrl,
      hId: bH.id,
      hName: bH.fullName,
      hEmail: bH.email,
      hAvatar: bH.avatarUrl,
    })
    .from(banners)
    .leftJoin(bCr, eq(banners.createdByUserId, bCr.id))
    .leftJoin(bH, eq(banners.updatedByUserId, bH.id));
  const chained = whereClause ? qb.where(whereClause) : qb;
  const raw = await chained.orderBy(asc(banners.placement), asc(banners.sortOrder)).limit(limit).offset(offset);
  const items: AdminBannerListRow[] = raw.map((r) => ({
    ...r.banner,
    creator: toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
    handler: toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
  }));
  return { items, total };
}

export async function updateBannerAdmin(
  id: string,
  patch: {
    title?: string;
    subtitle?: string | null;
    ctaLabel?: string | null;
    imageUrl?: string;
    linkUrl?: string | null;
    placement?: string;
    sortOrder?: number;
    showTitle?: boolean;
    showSubtitle?: boolean;
    showButton?: boolean;
    showShadow?: boolean;
    active?: boolean;
  },
  actorUserId?: string | null,
) {
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.subtitle !== undefined) set.subtitle = patch.subtitle;
  if (patch.ctaLabel !== undefined) set.ctaLabel = patch.ctaLabel;
  if (patch.imageUrl !== undefined) set.imageUrl = patch.imageUrl;
  if (patch.linkUrl !== undefined) set.linkUrl = patch.linkUrl;
  if (patch.placement !== undefined) set.placement = patch.placement;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
  if (patch.showTitle !== undefined) set.showTitle = patch.showTitle;
  if (patch.showSubtitle !== undefined) set.showSubtitle = patch.showSubtitle;
  if (patch.showButton !== undefined) set.showButton = patch.showButton;
  if (patch.showShadow !== undefined) set.showShadow = patch.showShadow;
  if (patch.active !== undefined) set.active = patch.active;
  if (actorUserId) set.updatedByUserId = actorUserId;
  if (Object.keys(set).length === 0) return;
  await db.update(banners).set(set as Partial<typeof banners.$inferInsert>).where(eq(banners.id, id));
}

export async function deleteBannersByIds(ids: string[]): Promise<number> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return 0;
  await db.delete(banners).where(inArray(banners.id, unique));
  return unique.length;
}

export async function deleteBanner(id: string) {
  await db.delete(banners).where(eq(banners.id, id));
}

/** Same rules as admin product slug: lowercase letters, digits, hyphens. */
export function normalizeProductSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Picks the first free slug for this vendor: `base`, `base-2`, `base-3`, …
 * (matches legacy import-create-draft numbering.)
 */
export async function allocateUniqueProductSlug(vendorId: string, desired: string): Promise<string> {
  let base = normalizeProductSlug(desired);
  if (!base) base = "product";
  for (let i = 0; i < 500; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.vendorId, vendorId), eq(products.slug, candidate)))
      .limit(1);
    if (!row) return candidate;
  }
  throw new Error("Could not allocate a unique product slug.");
}

export async function createProductForVendor(
  vendorId: string,
  data: {
    categoryId?: string | null;
    title: string;
    slug: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    price: string;
    compareAtPrice?: string | null;
    stock: number;
    images: string[];
    status: string;
    keyFeaturesJson?: { en: string; bn: string } | null;
    specificationsJson?: { label: string; value: string }[] | null;
    generalInfoJson?: { en: string; bn: string } | null;
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
    variants?: Array<{
      kind: string;
      name: string;
      value: string;
      price: string;
      stock: number;
      sortOrder?: number;
    }>;
    /** Admin or vendor user who created the product. */
    actorUserId?: string | null;
  }
) {
  const slug = await allocateUniqueProductSlug(vendorId, data.slug);
  const freeOn = Boolean(data.freeDeliveryEnabled);
  const actor = data.actorUserId ?? null;
  const [p] = await db
    .insert(products)
    .values({
      vendorId,
      categoryId: data.categoryId ?? null,
      title: data.title,
      slug,
      description: data.description ?? null,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoKeywords: data.seoKeywords ?? null,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      stock: data.stock,
      images: data.images,
      status: data.status,
      keyFeaturesJson: data.keyFeaturesJson ?? null,
      specificationsJson: data.specificationsJson ?? null,
      generalInfoJson: data.generalInfoJson ?? null,
      freeDeliveryEnabled: freeOn,
      freeDeliveryMinCartAmount: freeOn ? data.freeDeliveryMinCartAmount ?? null : null,
      freeDeliveryMinQuantity: freeOn ? data.freeDeliveryMinQuantity ?? null : null,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  if (data.variants && data.variants.length > 0) {
    await replaceProductVariants(p.id, data.variants);
    await syncProductPriceStockFromVariants(p.id);
    const [fresh] = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
    return fresh ?? p;
  }
  return p;
}

export async function updateProductVendor(
  vendorId: string,
  productId: string,
  data: Partial<{
    categoryId: string | null;
    title: string;
    slug: string;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    price: string;
    compareAtPrice: string | null;
    stock: number;
    images: string[];
    status: string;
    keyFeaturesJson: { en: string; bn: string } | null;
    specificationsJson: { label: string; value: string }[] | null;
    generalInfoJson: { en: string; bn: string } | null;
    freeDeliveryEnabled: boolean;
    freeDeliveryMinCartAmount: string | null;
    freeDeliveryMinQuantity: number | null;
    variants: Array<{
      kind: string;
      name: string;
      value: string;
      price: string;
      stock: number;
      sortOrder?: number;
    }>;
  }>,
  actorUserId?: string | null,
) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
    .limit(1);
  if (!existing) return undefined;
  if (data.slug !== undefined && data.slug !== existing.slug) {
    const [dup] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.vendorId, vendorId), eq(products.slug, data.slug)))
      .limit(1);
    if (dup && dup.id !== productId) {
      throw new Error("DUPLICATE_PRODUCT_SLUG");
    }
  }
  const { variants, ...rest } = data;
  const cleaned = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  ) as Partial<typeof rest>;
  const enabledAfter =
    cleaned.freeDeliveryEnabled !== undefined ? cleaned.freeDeliveryEnabled : existing.freeDeliveryEnabled;
  const restNoFree = { ...cleaned } as Record<string, unknown>;
  delete restNoFree.freeDeliveryEnabled;
  delete restNoFree.freeDeliveryMinCartAmount;
  delete restNoFree.freeDeliveryMinQuantity;
  const setPatch: Record<string, unknown> = { ...restNoFree, updatedAt: new Date() };
  if (actorUserId) setPatch.updatedByUserId = actorUserId;
  if (cleaned.freeDeliveryEnabled !== undefined) setPatch.freeDeliveryEnabled = cleaned.freeDeliveryEnabled;
  if (!enabledAfter) {
    setPatch.freeDeliveryMinCartAmount = null;
    setPatch.freeDeliveryMinQuantity = null;
  } else {
    if (cleaned.freeDeliveryMinCartAmount !== undefined)
      setPatch.freeDeliveryMinCartAmount = cleaned.freeDeliveryMinCartAmount;
    if (cleaned.freeDeliveryMinQuantity !== undefined)
      setPatch.freeDeliveryMinQuantity = cleaned.freeDeliveryMinQuantity;
  }
  if (Object.keys(cleaned).length > 0) {
    await db.update(products).set(setPatch as Partial<(typeof products.$inferInsert)>).where(eq(products.id, productId));
  } else if (variants !== undefined && actorUserId) {
    await db
      .update(products)
      .set({ updatedByUserId: actorUserId, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }
  if (variants !== undefined) {
    await replaceProductVariants(productId, variants);
    await syncProductPriceStockFromVariants(productId);
  }
  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return p;
}

export async function listProductsForVendor(vendorId: string) {
  return db.select().from(products).where(eq(products.vendorId, vendorId)).orderBy(desc(products.updatedAt));
}

export async function getVendorBySlug(slug: string) {
  const [v] = await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1);
  return v;
}

export async function listAddresses(userId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function getUserAddress(userId: string, id: string) {
  const [r] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .limit(1);
  return r;
}

export async function createUserAddress(
  userId: string,
  data: {
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    district: string;
    postalCode?: string | null;
    phone: string;
    isDefault?: boolean;
    pathaoCityId?: number | null;
    pathaoZoneId?: number | null;
    pathaoAreaId?: number | null;
    pathaoCityName?: string | null;
    pathaoZoneName?: string | null;
    pathaoAreaName?: string | null;
  }
) {
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  const [row] = await db
    .insert(addresses)
    .values({
      userId,
      label: data.label ?? null,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      district: data.district,
      postalCode: data.postalCode ?? null,
      phone: normalizeBdPhone(data.phone),
      isDefault: data.isDefault ?? false,
      pathaoCityId: data.pathaoCityId ?? null,
      pathaoZoneId: data.pathaoZoneId ?? null,
      pathaoAreaId: data.pathaoAreaId ?? null,
      pathaoCityName: data.pathaoCityName?.trim() || null,
      pathaoZoneName: data.pathaoZoneName?.trim() || null,
      pathaoAreaName: data.pathaoAreaName?.trim() || null,
    })
    .returning();
  return row;
}

export async function updateUserAddress(
  userId: string,
  id: string,
  patch: Partial<{
    label: string | null;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
    postalCode: string | null;
    phone: string;
    isDefault: boolean;
    pathaoCityId: number | null;
    pathaoZoneId: number | null;
    pathaoAreaId: number | null;
    pathaoCityName: string | null;
    pathaoZoneName: string | null;
    pathaoAreaName: string | null;
  }>
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  const existing = await getUserAddress(userId, id);
  if (!existing) return { ok: false, error: "not_found" };
  if (patch.isDefault === true) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  const set: Record<string, unknown> = {};
  if (patch.label !== undefined) set.label = patch.label;
  if (patch.line1 !== undefined) set.line1 = patch.line1;
  if (patch.line2 !== undefined) set.line2 = patch.line2;
  if (patch.city !== undefined) set.city = patch.city;
  if (patch.district !== undefined) set.district = patch.district;
  if (patch.postalCode !== undefined) set.postalCode = patch.postalCode;
  if (patch.phone !== undefined) set.phone = normalizeBdPhone(String(patch.phone));
  if (patch.isDefault !== undefined) set.isDefault = patch.isDefault;
  if (patch.pathaoCityId !== undefined) set.pathaoCityId = patch.pathaoCityId;
  if (patch.pathaoZoneId !== undefined) set.pathaoZoneId = patch.pathaoZoneId;
  if (patch.pathaoAreaId !== undefined) set.pathaoAreaId = patch.pathaoAreaId;
  if (patch.pathaoCityName !== undefined) set.pathaoCityName = patch.pathaoCityName?.trim() || null;
  if (patch.pathaoZoneName !== undefined) set.pathaoZoneName = patch.pathaoZoneName?.trim() || null;
  if (patch.pathaoAreaName !== undefined) set.pathaoAreaName = patch.pathaoAreaName?.trim() || null;
  if (Object.keys(set).length === 0) return { ok: true };
  await db
    .update(addresses)
    .set(
      set as {
        label?: string | null;
        line1?: string;
        line2?: string | null;
        city?: string;
        district?: string;
        postalCode?: string | null;
        phone?: string;
        isDefault?: boolean;
        pathaoCityId?: number | null;
        pathaoZoneId?: number | null;
        pathaoAreaId?: number | null;
        pathaoCityName?: string | null;
        pathaoZoneName?: string | null;
        pathaoAreaName?: string | null;
      }
    )
    .where(eq(addresses.id, id));
  return { ok: true };
}

export async function deleteUserAddress(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  return deleted.length > 0;
}

export async function updateCustomerProfile(
  userId: string,
  patch: { fullName?: string; email?: string | null; phone?: string | null; avatarUrl?: string | null }
): Promise<{ ok: true } | { ok: false; error: "not_found" | "email_taken" | "phone_taken" }> {
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return { ok: false, error: "not_found" };
  if (patch.email !== undefined && patch.email !== existing.email) {
    const norm = patch.email?.trim().toLowerCase() ?? null;
    if (norm) {
      const taken = await getUserByEmail(norm);
      if (taken && taken.id !== userId) return { ok: false, error: "email_taken" };
    }
  }
  if (patch.phone !== undefined) {
    const pNorm =
      patch.phone == null || !String(patch.phone).trim() ? null : normalizeBdPhone(String(patch.phone));
    if (pNorm) {
      const taken = await getUserByPhone(pNorm);
      if (taken && taken.id !== userId) return { ok: false, error: "phone_taken" };
    }
  }
  const set: { fullName?: string; email?: string | null; phone?: string | null; avatarUrl?: string | null } = {};
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.email !== undefined) set.email = patch.email?.trim().toLowerCase() || null;
  if (patch.phone !== undefined) {
    set.phone =
      patch.phone == null || !String(patch.phone).trim() ? null : normalizeBdPhone(String(patch.phone));
  }
  if (patch.avatarUrl !== undefined) {
    const a = patch.avatarUrl?.trim();
    set.avatarUrl = a || null;
  }
  if (Object.keys(set).length === 0) return { ok: true };
  await db.update(users).set(set).where(eq(users.id, userId));
  return { ok: true };
}

export async function setUserPasswordHash(userId: string, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function deleteProductForVendor(vendorId: string, productId: string): Promise<boolean> {
  const removed = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
    .returning({ id: products.id });
  return removed.length > 0;
}

export async function getVendorOrderDetailForVendor(vendorId: string, orderId: string) {
  const full = await getOrderWithItems(orderId);
  if (!full) return undefined;
  const myIds = await db.select({ id: products.id }).from(products).where(eq(products.vendorId, vendorId));
  const idSet = new Set(myIds.map((r) => r.id));
  const myItems = full.items.filter((i) => idSet.has(i.productId));
  if (myItems.length === 0) return undefined;
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt));
  const lineSubtotal = myItems.reduce((s, i) => s + parseFloat(i.lineTotal), 0);
  return { order: full.order, items: myItems, history, lineSubtotal: lineSubtotal.toFixed(2) };
}

export async function subscribeNewsletterEmail(
  email: string,
  source = "footer"
): Promise<{ ok: true; created: boolean }> {
  const norm = email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, norm))
    .limit(1);
  if (existing) return { ok: true, created: false };
  await db.insert(newsletterSubscribers).values({ email: norm, source });
  return { ok: true, created: true };
}

export async function listNewsletterSubscribersAdminPaged(opts: {
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ items: (typeof newsletterSubscribers.$inferSelect)[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim().toLowerCase()}%`;
    filters.push(ilike(newsletterSubscribers.email, t));
  }
  const whereClause = filters.length ? and(...filters) : undefined;
  const countB = db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers);
  const [countRow] = whereClause ? await countB.where(whereClause) : await countB;
  const total = Number(countRow?.n ?? 0);
  const listB = db
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt))
    .limit(limit)
    .offset(offset);
  const items = whereClause ? await listB.where(whereClause) : await listB;
  return { items, total };
}

export async function adminAddNewsletterSubscriber(
  email: string,
  source: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const norm = email.trim().toLowerCase();
  if (!norm.includes("@")) return { ok: false, error: "Invalid email" };
  const [ex] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, norm)).limit(1);
  if (ex) return { ok: false, error: "Email already subscribed" };
  await db.insert(newsletterSubscribers).values({ email: norm, source: source || "admin" });
  return { ok: true };
}

export async function adminDeleteNewsletterSubscriber(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await db
    .delete(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, id))
    .returning({ id: newsletterSubscribers.id });
  if (r.length === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

/**
 * If no user with this email: insert platform_admin with the given hash.
 * If user exists: set role, fullName, and optionally password hash.
 *
 * `overwriteExistingPassword` (default true): when false, an existing non-empty `password_hash`
 * is left unchanged so boot-time .env does not undo a password set via the admin UI. Use
 * `npm run admin:upsert` to force-reset from .env.
 */
export async function upsertPlatformAdmin(
  email: string,
  passwordHash: string,
  fullName: string,
  options?: { overwriteExistingPassword?: boolean }
): Promise<{ action: "created" | "updated"; userId: string }> {
  const overwriteExistingPassword = options?.overwriteExistingPassword !== false;
  const norm = email.trim().toLowerCase();
  const [byEmail] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${norm}`)
    .limit(1);
  if (byEmail) {
    const hasStoredPassword = !!(byEmail.passwordHash && String(byEmail.passwordHash).length > 0);
    const applyEnvPassword = overwriteExistingPassword || !hasStoredPassword;
    await db
      .update(users)
      .set(
        applyEnvPassword
          ? {
              email: norm,
              passwordHash,
              fullName,
              role: "platform_admin",
            }
          : {
              email: norm,
              fullName,
              role: "platform_admin",
            },
      )
      .where(eq(users.id, byEmail.id));
    return { action: "updated", userId: byEmail.id };
  }
  const [u] = await db
    .insert(users)
    .values({
      email: norm,
      phone: null,
      passwordHash,
      fullName,
      role: "platform_admin",
    })
    .returning();
  return { action: "created", userId: u.id };
}

/** Demo catalog with remote images (Unsplash) for a polished storefront preview. */
export async function seedMarketplaceCatalogIfEmpty(): Promise<{ seeded: boolean; details: string }> {
  const [pubRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(and(eq(products.status, "active"), eq(vendors.status, "approved")));
  const pubCount = Number(pubRow?.n ?? 0);
  if (pubCount >= 12) {
    return { seeded: false, details: `Storefront already has ${pubCount} live products` };
  }

  const ensureCat = async (name: string, slug: string, sortOrder: number) => {
    const ex = await getCategoryBySlug(slug);
    if (ex) return ex;
    const created = await createCategory({ name, slug, sortOrder });
    return created.ok ? created.category : ex;
  };

  await ensureCat("Electronics", "electronics", 1);
  await ensureCat("Fashion", "fashion", 2);
  await ensureCat("Home & Living", "home-living", 3);
  await ensureCat("Health & Beauty", "health-beauty", 4);
  await ensureCat("Sports & Outdoor", "sports-outdoor", 5);

  let [vendor] = await db.select().from(vendors).where(eq(vendors.slug, "orlenbd-showcase")).limit(1);
  if (!vendor) {
    [vendor] = await db
      .insert(vendors)
      .values({
        slug: "orlenbd-showcase",
        name: "Orlenbd Showcase",
        status: "approved",
        commissionRate: "0",
      })
      .returning();
  }

  const cat = async (slug: string) => {
    const c = await getCategoryBySlug(slug);
    return c?.id ?? null;
  };

  type DemoP = {
    title: string;
    slug: string;
    price: string;
    compareAtPrice: string | null;
    categorySlug: string;
    image: string;
  };

  const demo: DemoP[] = [
    {
      title: "Minimalist wrist watch",
      slug: "minimalist-wrist-watch",
      price: "2499",
      compareAtPrice: "3299",
      categorySlug: "fashion",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Smartphone Pro Max",
      slug: "smartphone-pro-max",
      price: "45999",
      compareAtPrice: "52999",
      categorySlug: "electronics",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Wireless headphones",
      slug: "wireless-headphones",
      price: "3999",
      compareAtPrice: "5499",
      categorySlug: "electronics",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Ultrabook laptop",
      slug: "ultrabook-laptop",
      price: "68999",
      compareAtPrice: "74999",
      categorySlug: "electronics",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Running sneakers",
      slug: "running-sneakers",
      price: "4299",
      compareAtPrice: "5999",
      categorySlug: "sports-outdoor",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "DSLR camera kit",
      slug: "dslr-camera-kit",
      price: "52999",
      compareAtPrice: "58999",
      categorySlug: "electronics",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Modern fabric sofa",
      slug: "modern-fabric-sofa",
      price: "32999",
      compareAtPrice: "39999",
      categorySlug: "home-living",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Evening dress",
      slug: "evening-dress",
      price: "3599",
      compareAtPrice: "4999",
      categorySlug: "fashion",
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Skincare essentials set",
      slug: "skincare-essentials-set",
      price: "1899",
      compareAtPrice: "2499",
      categorySlug: "health-beauty",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Microwave oven",
      slug: "microwave-oven",
      price: "8999",
      compareAtPrice: "10999",
      categorySlug: "home-living",
      image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Travel backpack",
      slug: "travel-backpack",
      price: "2199",
      compareAtPrice: "2899",
      categorySlug: "sports-outdoor",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85",
    },
    {
      title: "Tablet 11 inch",
      slug: "tablet-11-inch",
      price: "22999",
      compareAtPrice: "26999",
      categorySlug: "electronics",
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=85",
    },
  ];

  let inserted = 0;
  for (const p of demo) {
    const [exists] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.vendorId, vendor.id), eq(products.slug, p.slug)))
      .limit(1);
    if (exists) continue;
    await db.insert(products).values({
      vendorId: vendor.id,
      categoryId: await cat(p.categorySlug),
      title: p.title,
      slug: p.slug,
      description: "Quality product from Orlenbd showcase store. Cash on delivery available across Bangladesh.",
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: 80,
      images: [p.image],
      status: "active",
    });
    inserted++;
  }

  const [bCount] = await db.select({ n: sql<number>`count(*)::int` }).from(banners);
  let bannersInserted = false;
  if ((bCount?.n ?? 0) === 0) {
    bannersInserted = true;
    await db.insert(banners).values([
      {
        title: "Always your multivendor marketplace",
        subtitle: "Fashion, tech & home — delivered across Bangladesh",
        imageUrl:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=85",
        linkUrl: "/shop",
        sortOrder: 0,
        placement: "hero",
        active: true,
      },
      {
        title: "Flash deals every week",
        subtitle: "Up to 40% off on electronics & more",
        imageUrl:
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=85",
        linkUrl: "/shop",
        sortOrder: 1,
        placement: "hero",
        active: true,
      },
    ]);
  }

  return {
    seeded: inserted > 0 || bannersInserted,
    details: `Inserted ${inserted} demo products; ensured categories & showcase vendor; hero banners ${bannersInserted ? "added" : "unchanged"}`,
  };
}

/** ~1000 BDT-priced demo products for Bangladesh categories; idempotent via slug prefix bdk-. */
export async function seedBangladeshBulkCatalog(): Promise<{
  inserted: number;
  skipped: boolean;
  message: string;
}> {
  const [cntRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(like(products.slug, `${BD_BULK_SLUG_PREFIX}%`));
  const have = Number(cntRow?.n ?? 0);
  if (have >= 1000) {
    return {
      inserted: 0,
      skipped: true,
      message: `Store already has ${have} BD bulk products (${BD_BULK_SLUG_PREFIX}*). Use DB admin to remove if you need a full re-seed.`,
    };
  }

  for (const c of BD_BULK_CATEGORIES) {
    const ex = await getCategoryBySlug(c.slug);
    if (!ex) await createCategory({ name: c.name, slug: c.slug, sortOrder: c.sortOrder });
  }

  const vendorIdBySlug = new Map<string, string>();
  for (const v of BD_BULK_VENDORS) {
    let [row] = await db.select().from(vendors).where(eq(vendors.slug, v.slug)).limit(1);
    if (!row) {
      [row] = await db
        .insert(vendors)
        .values({
          slug: v.slug,
          name: v.name,
          status: "approved",
          commissionRate: "0",
        })
        .returning();
    } else if (row.status !== "approved") {
      await db.update(vendors).set({ status: "approved" }).where(eq(vendors.id, row.id));
    }
    vendorIdBySlug.set(v.slug, row!.id);
  }

  const catIdBySlug = new Map<string, string | null>();
  for (const c of BD_BULK_CATEGORIES) {
    const cat = await getCategoryBySlug(c.slug);
    catIdBySlug.set(c.slug, cat?.id ?? null);
  }

  const allRows = buildBdBulkProductRows(1000);
  let inserted = 0;
  const chunkSize = 80;

  for (const v of BD_BULK_VENDORS) {
    const vendorId = vendorIdBySlug.get(v.slug)!;
    const slice = allRows.filter((r) => r.vendorSlug === v.slug);
    const slugs = slice.map((r) => r.slug);
    const existing = new Set<string>();
    for (let i = 0; i < slugs.length; i += 200) {
      const part = slugs.slice(i, i + 200);
      const found = await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(eq(products.vendorId, vendorId), inArray(products.slug, part)));
      found.forEach((f) => existing.add(f.slug));
    }
    const toInsert = slice.filter((r) => !existing.has(r.slug));
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const values = chunk.map((r) => ({
        vendorId,
        categoryId: catIdBySlug.get(r.categorySlug) ?? null,
        title: r.title,
        slug: r.slug,
        description: r.description,
        price: r.price,
        compareAtPrice: r.compareAtPrice,
        stock: r.stock,
        images: r.images,
        status: "active" as const,
      }));
      if (values.length) {
        await db.insert(products).values(values);
        inserted += values.length;
      }
    }
  }

  return {
    inserted,
    skipped: false,
    message: `Inserted ${inserted} products (${BD_BULK_VENDORS.length} vendors, ${BD_BULK_CATEGORIES.length} categories).`,
  };
}

const FULL_ACCESS_SLUG = "full-access";

export async function ensureDefaultAdminAccessRoles(): Promise<void> {
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(adminAccessRoles);
  if (Number(c?.n ?? 0) > 0) return;
  const matrix = createFullAccessMatrix();
  await db.insert(adminAccessRoles).values({
    name: "Full access",
    slug: FULL_ACCESS_SLUG,
    description: "Unrestricted access to all admin areas (default template).",
    permissions: matrix as unknown as Record<string, unknown>,
    isSystem: true,
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "role";
}

export async function getEffectiveAdminPermissions(userId: string): Promise<AdminPermissionMatrix> {
  const [u] = await db
    .select({ adminRoleId: users.adminRoleId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u?.adminRoleId) {
    return createFullAccessMatrix();
  }
  const [r] = await db
    .select({ permissions: adminAccessRoles.permissions })
    .from(adminAccessRoles)
    .where(eq(adminAccessRoles.id, u.adminRoleId))
    .limit(1);
  if (!r) {
    return createFullAccessMatrix();
  }
  return parsePermissionMatrix(r.permissions);
}

export type AdminAccessRoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: AdminPermissionMatrix;
  creator: AdminActorRef;
  handler: AdminActorRef;
};

function rowToAccessRole(
  r: typeof adminAccessRoles.$inferSelect,
  creator: AdminActorRef,
  handler: AdminActorRef,
): AdminAccessRoleRow {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    permissions: parsePermissionMatrix(r.permissions),
    creator,
    handler,
  };
}

export async function listAdminAccessRoles(): Promise<AdminAccessRoleRow[]> {
  const arC = alias(users, "access_role_creator");
  const arH = alias(users, "access_role_handler");
  const rows = await db
    .select({
      role: adminAccessRoles,
      cId: arC.id,
      cName: arC.fullName,
      cEmail: arC.email,
      cAvatar: arC.avatarUrl,
      hId: arH.id,
      hName: arH.fullName,
      hEmail: arH.email,
      hAvatar: arH.avatarUrl,
    })
    .from(adminAccessRoles)
    .leftJoin(arC, eq(adminAccessRoles.createdByUserId, arC.id))
    .leftJoin(arH, eq(adminAccessRoles.updatedByUserId, arH.id))
    .orderBy(asc(adminAccessRoles.name));
  return rows.map((r) =>
    rowToAccessRole(
      r.role,
      toActorRef({ id: r.cId, fullName: r.cName, email: r.cEmail, avatarUrl: r.cAvatar }),
      toActorRef({ id: r.hId, fullName: r.hName, email: r.hEmail, avatarUrl: r.hAvatar }),
    ),
  );
}

export async function getAdminAccessRoleById(id: string): Promise<AdminAccessRoleRow | undefined> {
  const arC = alias(users, "access_role_creator");
  const arH = alias(users, "access_role_handler");
  const [row] = await db
    .select({
      role: adminAccessRoles,
      cId: arC.id,
      cName: arC.fullName,
      cEmail: arC.email,
      cAvatar: arC.avatarUrl,
      hId: arH.id,
      hName: arH.fullName,
      hEmail: arH.email,
      hAvatar: arH.avatarUrl,
    })
    .from(adminAccessRoles)
    .leftJoin(arC, eq(adminAccessRoles.createdByUserId, arC.id))
    .leftJoin(arH, eq(adminAccessRoles.updatedByUserId, arH.id))
    .where(eq(adminAccessRoles.id, id))
    .limit(1);
  return row
    ? rowToAccessRole(
        row.role,
        toActorRef({ id: row.cId, fullName: row.cName, email: row.cEmail, avatarUrl: row.cAvatar }),
        toActorRef({ id: row.hId, fullName: row.hName, email: row.hEmail, avatarUrl: row.hAvatar }),
      )
    : undefined;
}

export async function createAdminAccessRole(
  data: {
    name: string;
    slug?: string;
    description?: string;
    permissions: AdminPermissionMatrix;
  },
  actorUserId?: string | null,
): Promise<AdminAccessRoleRow> {
  const slug = data.slug?.trim() || slugify(data.name);
  const actor = actorUserId ?? null;
  const [r] = await db
    .insert(adminAccessRoles)
    .values({
      name: data.name.trim(),
      slug,
      description: data.description?.trim() ?? "",
      permissions: data.permissions as unknown as Record<string, unknown>,
      isSystem: false,
      createdByUserId: actor,
      updatedByUserId: actor,
    })
    .returning();
  if (!r) throw new Error("insert failed");
  const again = await getAdminAccessRoleById(r.id);
  if (again) return again;
  throw new Error("insert failed to reload");
}

export async function updateAdminAccessRole(
  id: string,
  data: { name?: string; slug?: string; description?: string; permissions?: AdminPermissionMatrix },
  actorUserId?: string | null,
): Promise<AdminAccessRoleRow | null> {
  const [existing] = await db.select().from(adminAccessRoles).where(eq(adminAccessRoles.id, id)).limit(1);
  if (!existing) return null;
  const patch: Partial<{
    name: string;
    slug: string;
    description: string;
    permissions: unknown;
    updatedAt: Date;
    updatedByUserId: string | null;
  }> = { updatedAt: new Date() };
  if (actorUserId) patch.updatedByUserId = actorUserId;
  if (data.name !== undefined && !existing.isSystem) patch.name = data.name.trim();
  if (data.slug !== undefined && !existing.isSystem) patch.slug = data.slug.trim() || slugify(data.name ?? existing.name);
  if (data.description !== undefined) patch.description = data.description.trim();
  if (data.permissions !== undefined) patch.permissions = data.permissions;
  if (Object.keys(patch).length <= 1) {
    return (await getAdminAccessRoleById(id)) ?? null;
  }
  const [r] = await db
    .update(adminAccessRoles)
    .set(patch)
    .where(eq(adminAccessRoles.id, id))
    .returning();
  if (!r) return null;
  return (await getAdminAccessRoleById(id)) ?? null;
}

export async function deleteAdminAccessRole(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db.select().from(adminAccessRoles).where(eq(adminAccessRoles.id, id)).limit(1);
  if (!existing) return { ok: false, error: "Not found" };
  if (existing.isSystem) return { ok: false, error: "Cannot delete a system role" };
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.adminRoleId, id));
  if (Number(c?.n ?? 0) > 0) {
    return { ok: false, error: "Role is assigned to one or more users" };
  }
  await db.delete(adminAccessRoles).where(eq(adminAccessRoles.id, id));
  return { ok: true };
}
