import type { Express } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

const addressBody = z.object({
  label: z.string().max(120).nullable().optional(),
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().nullable().optional(),
  phone: z.string().min(8),
  isDefault: z.boolean().optional(),
  pathaoCityId: z.number().int().positive().nullable().optional(),
  pathaoZoneId: z.number().int().positive().nullable().optional(),
  pathaoAreaId: z.number().int().positive().nullable().optional(),
  pathaoCityName: z.string().max(200).nullable().optional(),
  pathaoZoneName: z.string().max(200).nullable().optional(),
  pathaoAreaName: z.string().max(200).nullable().optional(),
});

export function registerMeRoutes(app: Express) {
  app.get("/api/me/addresses", requireAuth, async (req, res) => {
    const list = await storage.listAddresses(req.session.userId!);
    res.json(list);
  });

  app.post("/api/me/addresses", requireAuth, async (req, res) => {
    const parsed = addressBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const row = await storage.createUserAddress(req.session.userId!, parsed.data);
    res.json(row);
  });

  app.patch("/api/me/addresses/:id", requireAuth, async (req, res) => {
    const parsed = addressBody.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: "No changes" });
    const r = await storage.updateUserAddress(req.session.userId!, req.params.id, parsed.data);
    if (!r.ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  app.delete("/api/me/addresses/:id", requireAuth, async (req, res) => {
    const ok = await storage.deleteUserAddress(req.session.userId!, req.params.id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  });

  app.patch("/api/me/profile", requireAuth, async (req, res) => {
    const avatarRefine = (s: string) => {
      const t = s.trim();
      return t.startsWith("/uploads/") || /^https?:\/\//i.test(t);
    };
    const schema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().min(10).nullable().optional(),
      avatarUrl: z
        .string()
        .max(2048)
        .nullable()
        .optional()
        .refine((v) => v == null || v === "" || avatarRefine(v), {
          message: "avatarUrl must be a /uploads/ path or https URL",
        }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const body = { ...parsed.data };
    if (body.avatarUrl === "") body.avatarUrl = null;
    const r = await storage.updateCustomerProfile(req.session.userId!, body);
    if (!r.ok) {
      const status = r.error === "not_found" ? 404 : 409;
      return res.status(status).json({ error: r.error });
    }
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        hasPassword: !!(user.passwordHash && user.passwordHash.length > 0),
        avatarUrl: user.avatarUrl ?? null,
        googleSub: user.googleSub ?? null,
        facebookSub: user.facebookSub ?? null,
      },
    });
  });

  app.get("/api/me/recently-viewed", requireAuth, async (req, res) => {
    const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit ?? "12"), 10) || 12));
    const rows = await storage.listRecentlyViewedProductRows(req.session.userId!, limit);
    const items = rows.map((r) => ({
      product: r.product,
      vendorSlug: r.vendorSlug,
      vendorName: r.vendorName,
      reviewCount: 0,
      avgRating: 0,
    }));
    const ids = items.map((i) => i.product.id);
    const stats = await storage.getReviewStatsForProductIds(ids);
    for (const it of items) {
      const s = stats[it.product.id];
      it.reviewCount = s?.reviewCount ?? 0;
      it.avgRating = s?.avgRating ?? 0;
    }
    res.json({ items });
  });

  app.post("/api/me/recently-viewed", requireAuth, async (req, res) => {
    const schema = z.object({ productId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    await storage.recordProductView(req.session.userId!, parsed.data.productId);
    res.json({ ok: true });
  });

  app.post("/api/me/password", requireAuth, async (req, res) => {
    const schema = z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(400).json({ error: "User not found" });
    const hasPw = !!(user.passwordHash && user.passwordHash.length > 0);
    const cur = parsed.data.currentPassword?.trim();
    if (hasPw) {
      if (
        !cur ||
        !(await bcrypt.compare(cur, user.passwordHash!))
      ) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
    } else if (cur?.length) {
      return res.status(400).json({ error: "No password set — leave current blank and submit a new password only." });
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await storage.setUserPasswordHash(req.session.userId!, passwordHash);
    res.json({ ok: true });
  });
}
