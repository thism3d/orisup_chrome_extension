import type { Express } from "express";
import { z } from "zod";
import { ensureGuestCartId, resolveCart } from "../middleware/auth";
import * as storage from "../storage";
import { parseDecimalString } from "../../shared/parseDecimalString";
import {
  pathaoListCities,
  pathaoListZones,
  pathaoListAreas,
  pathaoQuoteDeliveryForCart,
} from "../courier/pathao";
import { pathaoCourierConfig } from "../lib/pathaoCheckoutQuote";

export function registerPathaoStoreRoutes(app: Express) {
  app.get("/api/store/pathao/cities", async (_req, res) => {
    const c = await storage.getDefaultPathaoCourier();
    if (!c) return res.status(503).json({ error: "Pathao is not configured for this store." });
    const r = await pathaoListCities(pathaoCourierConfig(c));
    if (!r.ok) return res.status(502).json({ error: r.error });
    res.json({ cities: r.cities.map((x) => ({ id: x.city_id, name: x.city_name })) });
  });

  app.get("/api/store/pathao/cities/:cityId/zones", async (req, res) => {
    const cityId = Number(req.params.cityId);
    if (!Number.isFinite(cityId) || cityId <= 0) return res.status(400).json({ error: "Invalid city id" });
    const c = await storage.getDefaultPathaoCourier();
    if (!c) return res.status(503).json({ error: "Pathao is not configured for this store." });
    const r = await pathaoListZones(pathaoCourierConfig(c), cityId);
    if (!r.ok) return res.status(502).json({ error: r.error });
    res.json({ zones: r.zones.map((x) => ({ id: x.zone_id, name: x.zone_name })) });
  });

  app.get("/api/store/pathao/zones/:zoneId/areas", async (req, res) => {
    const zoneId = Number(req.params.zoneId);
    if (!Number.isFinite(zoneId) || zoneId <= 0) return res.status(400).json({ error: "Invalid zone id" });
    const c = await storage.getDefaultPathaoCourier();
    if (!c) return res.status(503).json({ error: "Pathao is not configured for this store." });
    const r = await pathaoListAreas(pathaoCourierConfig(c), zoneId);
    if (!r.ok) return res.status(502).json({ error: r.error });
    res.json({
      areas: r.areas.map((x) => ({
        id: x.area_id,
        name: x.area_name,
        homeDeliveryAvailable: x.home_delivery_available,
        pickupAvailable: x.pickup_available,
      })),
    });
  });

  const quoteBody = z.object({
    pathaoCityId: z.coerce.number().int().positive(),
    pathaoZoneId: z.coerce.number().int().positive(),
    pathaoAreaId: z.coerce.number().int().positive().optional(),
  });

  app.post("/api/store/pathao/quote", ensureGuestCartId, async (req, res) => {
    const parsed = quoteBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const c = await storage.getDefaultPathaoCourier();
    if (!c) return res.status(503).json({ error: "Pathao is not configured for this store." });
    const cart = await resolveCart(req);
    const lines = await storage.getCartWithLines(cart.id);
    if (lines.length === 0) return res.status(400).json({ error: "Cart is empty" });
    const qtys = lines.map((row) => row.line.quantity);
    const r = await pathaoQuoteDeliveryForCart(pathaoCourierConfig(c), {
      recipientCity: parsed.data.pathaoCityId,
      recipientZone: parsed.data.pathaoZoneId,
      lineQuantities: qtys,
    });
    if (!r.ok) return res.status(502).json({ error: r.error });
    const cartSubtotal = lines.reduce((s, row) => {
      const unit = row.variant
        ? parseDecimalString(String(row.variant.price))
        : parseDecimalString(String(row.product.price));
      return s + unit * row.line.quantity;
    }, 0);
    const waived = await storage.orderLinesQualifyFreeDelivery(
      lines.map((row) => ({ productId: row.product.id, quantity: row.line.quantity })),
      cartSubtotal,
    );
    const feeNum = waived ? 0 : r.fee;
    res.json({
      shippingFee: feeNum.toFixed(2),
      currency: "BDT",
      freeDeliveryApplied: waived,
    });
  });
}
