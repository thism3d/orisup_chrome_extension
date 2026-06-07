import type { Express } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerProductReviewRoutes(app: Express) {
  app.post("/api/products/:productId/reviews", requireAuth, async (req, res) => {
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().max(200).optional(),
      body: z.string().min(10).max(4000),
      locale: z.enum(["en", "bn"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const r = await storage.createProductReview(req.session.userId!, {
      productId: req.params.productId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      locale: parsed.data.locale ?? "en",
    });
    if (!r.ok) return res.status(r.error === "You already reviewed this product" ? 409 : 400).json({ error: r.error });
    res.status(201).json({ ok: true });
  });
}
