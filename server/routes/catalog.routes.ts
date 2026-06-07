import type { Express } from "express";
import { z } from "zod";
import * as storage from "../storage";

const uuidListSchema = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 48)
  )
  .pipe(z.array(z.string().uuid()).max(48));

export function registerCatalogRoutes(app: Express) {
  app.post("/api/public/newsletter", async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    await storage.subscribeNewsletterEmail(parsed.data.email, "footer");
    res.json({ ok: true });
  });

  app.get("/api/public/site-meta", async (_req, res) => {
    res.json(await storage.getPublicSiteMeta());
  });

  app.get("/api/categories", async (_req, res) => {
    res.json(await storage.listCategories());
  });

  app.get("/api/categories/tree", async (_req, res) => {
    res.json(await storage.listCategoryTree());
  });

  app.get("/api/banners", async (req, res) => {
    const placement = typeof req.query.placement === "string" ? req.query.placement : undefined;
    res.json(await storage.listBanners(placement));
  });

  app.get("/api/products", async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { rows, total } = await storage.listProductsPublic({
      categorySlug: q.category,
      vendorSlug: q.vendor,
      q: q.q,
      minPrice: q.minPrice ? parseFloat(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? parseFloat(q.maxPrice) : undefined,
      sort: q.sort as "newest" | "price_asc" | "price_desc" | undefined,
      limit: q.limit ? parseInt(q.limit, 10) : 24,
      offset: q.offset ? parseInt(q.offset, 10) : 0,
    });
    res.json({ items: rows, total });
  });

  app.get("/api/recommendations", async (req, res) => {
    const lim = Math.min(48, Math.max(1, parseInt(String(req.query.limit ?? "12"), 10) || 12));
    const userId = req.session?.userId as string | undefined;
    let recentIds: string[] | undefined;
    const rawRecent = typeof req.query.recent === "string" ? req.query.recent : undefined;
    if (rawRecent) {
      const parsed = uuidListSchema.safeParse(rawRecent);
      if (parsed.success) recentIds = parsed.data;
    }
    const rows = await storage.getRecommendedProductRows({
      userId,
      recentProductIds: recentIds,
      limit: lim,
    });
    res.json({ items: rows });
  });

  app.get("/api/products/by-ids", async (req, res) => {
    const raw = typeof req.query.ids === "string" ? req.query.ids : "";
    const parsed = uuidListSchema.safeParse(raw);
    if (!parsed.success || parsed.data.length === 0) {
      return res.json({ items: [] as const });
    }
    const items = await storage.listProductsPublicRowsByIds(parsed.data);
    res.json({ items });
  });

  app.get("/api/vendors/:slug", async (req, res) => {
    const v = await storage.getVendorBySlug(req.params.slug);
    if (!v || v.status !== "approved") return res.status(404).json({ error: "Vendor not found" });
    res.json({ id: v.id, slug: v.slug, name: v.name, logoUrl: v.logoUrl });
  });

  app.get("/api/products/:vendorSlug/:productSlug/reviews", async (req, res) => {
    const p = await storage.getProductBySlug(req.params.vendorSlug, req.params.productSlug);
    if (!p) return res.status(404).json({ error: "Not found" });
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10));
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const offset = (page - 1) * limit;
    const { items, total } = await storage.listApprovedReviewsForProduct(p.id, { limit, offset });
    res.json({ items, total, page, limit });
  });

  app.get("/api/products/:vendorSlug/:productSlug", async (req, res) => {
    const p = await storage.getProductBySlug(req.params.vendorSlug, req.params.productSlug);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });
}
