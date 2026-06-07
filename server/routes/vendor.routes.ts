import type { Express, Request } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { specificationsJsonField } from "../lib/specificationsJsonZod";
import { requireAuth, requireVendor } from "../middleware/auth";

const variantRowSchema = z.object({
  kind: z.enum(["size", "color", "custom"]),
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  price: z.preprocess((v) => (typeof v === "string" ? v.replace(/,/g, "").trim() : v), z.string().min(1)),
  stock: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
});

const productBody = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().nullable().optional(),
  seoTitle: z.string().max(220).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  seoKeywords: z.string().max(1000).nullable().optional(),
  price: z.preprocess((v) => (typeof v === "string" ? v.replace(/,/g, "").trim() : v), z.string().min(1)),
  compareAtPrice: z.preprocess(
    (v) => (v == null || v === "" ? null : typeof v === "string" ? v.replace(/,/g, "").trim() : v),
    z.string().min(1).nullable().optional(),
  ),
  stock: z.number().int().min(0),
  images: z.array(z.string()).default([]),
  status: z.enum(["draft", "active"]),
  freeDeliveryEnabled: z.boolean().optional().default(false),
  freeDeliveryMinCartAmount: z.preprocess(
    (v) =>
      v === undefined
        ? undefined
        : v == null || v === ""
          ? null
          : typeof v === "string"
            ? v.replace(/,/g, "").trim()
            : v,
    z.string().min(1).nullable().optional(),
  ),
  freeDeliveryMinQuantity: z.union([z.number().int().min(1), z.null()]).optional(),
  keyFeaturesJson: z
    .object({ en: z.string(), bn: z.string() })
    .nullable()
    .optional(),
  specificationsJson: specificationsJsonField(),
  generalInfoJson: z
    .object({ en: z.string(), bn: z.string() })
    .nullable()
    .optional(),
  variants: z.array(variantRowSchema).optional(),
});

export function registerVendorRoutes(app: Express) {
  app.post("/api/vendor/apply", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (await storage.getVendorMembershipForUser(user.id)) {
      return res.status(400).json({ error: "Already a vendor" });
    }
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const v = await storage.createVendorForUser({
        userId: user.id,
        name: parsed.data.name,
        slug: parsed.data.slug,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
      });
      res.json(v);
    } catch {
      res.status(400).json({ error: "Slug may already be taken" });
    }
  });

  app.get("/api/vendor/me", requireAuth, async (req, res) => {
    const m = await storage.getVendorMembershipForUser(req.session.userId!);
    if (!m) return res.json({ vendor: null });
    res.json({ vendor: m.vendor, memberRole: m.memberRole });
  });

  app.get("/api/vendor/stats", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    res.json(await storage.getVendorDashboardStats(vid));
  });

  app.get("/api/vendor/products", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    res.json(await storage.listProductsForVendor(vid));
  });

  app.post("/api/vendor/products", requireVendor, async (req, res) => {
    const parsed = productBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const vid = (req as Request).vendor!.id;
    const d = parsed.data;
    const { freeDeliveryEnabled, freeDeliveryMinCartAmount, freeDeliveryMinQuantity, ...rest } = d;
    try {
      res.json(
        await storage.createProductForVendor(vid, {
          ...rest,
          freeDeliveryEnabled,
          freeDeliveryMinCartAmount: freeDeliveryEnabled ? freeDeliveryMinCartAmount ?? null : null,
          freeDeliveryMinQuantity: freeDeliveryEnabled ? freeDeliveryMinQuantity ?? null : null,
          actorUserId: req.session.userId!,
        }),
      );
    } catch {
      res.status(400).json({ error: "Duplicate slug for this shop" });
    }
  });

  app.patch("/api/vendor/products/:id", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    const partial = productBody.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ error: partial.error.flatten() });
    try {
      const p = await storage.updateProductVendor(vid, req.params.id, partial.data, req.session.userId!);
      if (!p) return res.status(404).json({ error: "Not found" });
      res.json(p);
    } catch (e) {
      if (e instanceof Error && e.message === "DUPLICATE_PRODUCT_SLUG") {
        return res.status(400).json({ error: "Slug already used for this shop" });
      }
      throw e;
    }
  });

  app.get("/api/vendor/orders", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    res.json(await storage.listOrdersForVendor(vid));
  });

  app.get("/api/vendor/orders/:id", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    const detail = await storage.getVendorOrderDetailForVendor(vid, req.params.id);
    if (!detail) return res.status(404).json({ error: "Not found" });
    res.json(detail);
  });

  app.delete("/api/vendor/products/:id", requireVendor, async (req, res) => {
    const vid = (req as Request).vendor!.id;
    const ok = await storage.deleteProductForVendor(vid, req.params.id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  app.patch("/api/vendor/orders/:id/status", requireVendor, async (req, res) => {
    // Vendors can only set the early-lifecycle statuses; everything from
    // assigned_to_courier onwards is owned by ops/the courier partner.
    const schema = z.object({
      status: z.enum(["pending", "confirmed", "at_warehouse", "cancelled"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const vid = (req as Request).vendor!.id;
    const full = await storage.getOrderWithItems(req.params.id);
    if (!full) return res.status(404).json({ error: "Not found" });
    const myProducts = await storage.listProductsForVendor(vid);
    const ids = new Set(myProducts.map((p) => p.id));
    if (!full.items.some((i) => ids.has(i.productId))) {
      return res.status(403).json({ error: "Order does not include your products" });
    }
    const r = await storage.updateOrderStatus(req.params.id, parsed.data.status, undefined, {
      force: parsed.data.status === "cancelled",
      actorUserId: req.session.userId!,
    });
    if (!r.ok) {
      if (r.error === "not_found") return res.status(404).json({ error: "Order not found" });
      if (r.error === "invalid_transition" || r.error === "terminal")
        return res.status(409).json({ error: "Invalid status transition." });
      return res.status(400).json({ error: r.error });
    }
    res.json({ ok: true });
  });
}
