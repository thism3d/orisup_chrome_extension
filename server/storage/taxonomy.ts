import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import { categories, banners, vendors, vendorMembers, type Category, type Vendor } from "../../shared/schema";
import { buildCategoryTree, type CategoryNode } from "../../shared/categoryTree";

export async function getVendorMembershipForUser(
  userId: string,
): Promise<{ vendor: Vendor; memberRole: string } | undefined> {
  const rows = await db
    .select({
      vendor: vendors,
      memberRole: vendorMembers.memberRole,
    })
    .from(vendorMembers)
    .innerJoin(vendors, eq(vendorMembers.vendorId, vendors.id))
    .where(eq(vendorMembers.userId, userId))
    .limit(1);
  return rows[0];
}

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

/**
 * Returns all categories assembled into a sorted nested tree (root -> sub -> sub-sub).
 * Cheaper than N+1 — issues a single SELECT and assembles in memory.
 */
export async function listCategoryTree(): Promise<CategoryNode<Category>[]> {
  const rows = await listCategories();
  return buildCategoryTree(rows);
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const [c] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return c;
}

export async function listBanners(placement?: string) {
  if (placement) {
    return db
      .select()
      .from(banners)
      .where(and(eq(banners.active, true), eq(banners.placement, placement)))
      .orderBy(asc(banners.sortOrder));
  }
  return db
    .select()
    .from(banners)
    .where(eq(banners.active, true))
    .orderBy(asc(banners.sortOrder));
}
