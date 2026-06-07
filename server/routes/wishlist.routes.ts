import type { Express } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerWishlistRoutes(app: Express) {
  app.get("/api/wishlist/count", requireAuth, async (req, res) => {
    const count = await storage.countWishlistItems(req.session.userId!);
    res.json({ count });
  });

  app.get("/api/wishlist", requireAuth, async (req, res) => {
    res.json(await storage.listWishlist(req.session.userId!));
  });

  app.post("/api/wishlist/toggle", requireAuth, async (req, res) => {
    const schema = z.object({ productId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const r = await storage.toggleWishlist(req.session.userId!, parsed.data.productId);
    res.json(r);
  });

  app.get("/api/wishlist/check/:productId", requireAuth, async (req, res) => {
    const ok = await storage.isInWishlist(req.session.userId!, req.params.productId);
    res.json({ inWishlist: ok });
  });
}
