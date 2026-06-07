import type { Express } from "express";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerCustomerOrderRoutes(app: Express) {
  app.get("/api/orders/me", requireAuth, async (req, res) => {
    const list = await storage.listOrdersForUser(req.session.userId!);
    res.json(list);
  });

  app.get("/api/orders/me/:orderNumber", requireAuth, async (req, res) => {
    const detail = await storage.getCustomerOrderByNumber(req.session.userId!, req.params.orderNumber);
    if (!detail) return res.status(404).json({ error: "Order not found" });
    res.json(detail);
  });

  app.post("/api/orders/me/:orderNumber/cancel", requireAuth, async (req, res) => {
    const r = await storage.cancelCustomerOrderByNumber(req.session.userId!, req.params.orderNumber);
    if (!r.ok) {
      if (r.error === "not_found") return res.status(404).json({ error: "Order not found" });
      if (r.error === "invalid_state") return res.status(400).json({ error: "Only pending orders can be cancelled." });
      return res.status(400).json({ error: "Could not cancel order." });
    }
    return res.json({ ok: true });
  });
}
