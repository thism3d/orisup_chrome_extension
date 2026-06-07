import { randomUUID } from "node:crypto";
import type { CourierAdapter } from "./types";

/**
 * No-op adapter for couriers we do not have an API integration with. Admins
 * still record a tracking number manually and update statuses via the UI.
 *
 * Webhook verification always returns `false` because manual partners do not
 * push events to us; the partner-webhook route therefore rejects any inbound
 * traffic for `manual` couriers.
 */
export const manualAdapter: CourierAdapter = {
  partnerType: "manual",

  async testConnection() {
    return { ok: true, message: "Manual courier — no external API to ping." };
  },

  async createShipment({ order }) {
    return {
      ok: true,
      consignmentId: order.trackingNumber?.trim() || `manual-${randomUUID().slice(0, 8)}`,
      raw: { manual: true, note: "No external partner; consignment id generated locally." },
    };
  },

  async cancelShipment() {
    return { ok: true, raw: { manual: true } };
  },

  verifyWebhook() {
    return false;
  },

  parseWebhook() {
    return null;
  },
};
