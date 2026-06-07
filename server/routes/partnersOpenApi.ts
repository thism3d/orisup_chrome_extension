import { ORDER_STATUSES } from "@shared/orderStatus";

/**
 * OpenAPI 3.1 description of the partner-facing surface (status webhook +
 * tracking statuses). Served at `GET /api/partners/openapi.json` and rendered
 * inside the admin docs panel.
 */
export function buildPartnersOpenApi(serverUrl: string): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Orlenbd Courier Partner API",
      version: "1.0.0",
      description: [
        "Inbound webhook endpoint Orlenbd exposes for registered courier partners.",
        "Each courier is identified by a slug; the configured webhook secret is used",
        "to verify HMAC-SHA256 signatures on incoming webhook bodies.",
      ].join(" "),
      contact: { name: "Orlenbd platform team" },
    },
    servers: [{ url: serverUrl, description: "Current server" }],
    tags: [{ name: "Webhooks" }],
    paths: {
      "/api/partners/couriers/{slug}/webhook": {
        post: {
          tags: ["Webhooks"],
          summary: "Push a status update for a parcel",
          description: [
            "Partners call this whenever a parcel changes state (picked up, in",
            "transit, delivered, etc.). Orlenbd verifies the HMAC signature, maps",
            "the partner status to our internal lifecycle, and updates the order.",
            "Pathao dashboard Webhook integration POSTs a synthetic `event` payload; we reply with **202** and `X-Pathao-Merchant-Webhook-Integration-Secret` when `webhook_integration_secret` is configured.",
          ].join(" "),
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Slug of the courier configured in admin (e.g. `pathao`).",
            },
            {
              name: "X-Pathao-Signature",
              in: "header",
              required: false,
              schema: { type: "string" },
              description: "HMAC-SHA256 hex digest of the raw body, keyed with the configured `webhook_secret`. Pathao only.",
            },
            {
              name: "X-Steadfast-Signature",
              in: "header",
              required: false,
              schema: { type: "string" },
              description: "HMAC-SHA256 hex digest of the raw body, keyed with the configured `webhook_secret`. Steadfast only.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PartnerWebhookPayload" },
                examples: {
                  pathao: {
                    summary: "Pathao parcel in transit",
                    value: {
                      event: "order.in-transit",
                      consignment_id: "DL121224VS8TTJ",
                      merchant_order_id: "ORL1778162133201964",
                      updated_at: "2024-12-27 23:52:32",
                      timestamp: "2024-12-27T17:52:32+00:00",
                      store_id: 130820,
                    },
                  },
                  steadfast: {
                    summary: "Steadfast in_transit",
                    value: {
                      consignment_id: 998877,
                      tracking_code: "SDF-AAB-998877",
                      invoice: "ORD-000123",
                      status: "in_transit",
                      updated_at: "2026-04-27T08:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "202": {
              description: [
                "Pathao Merchant webhooks (including dashboard connectivity test): respond with **202** and",
                "`X-Pathao-Merchant-Webhook-Integration-Secret` when `webhook_integration_secret` is configured.",
                "Connectivity tests return `ignored: pathao_connectivity_test`; live events return `orderStatus` when applicable.",
              ].join(" "),
              headers: {
                "X-Pathao-Merchant-Webhook-Integration-Secret": {
                  schema: { type: "string" },
                  description: "Exact UUID from Pathao webhook validation UI (stored as `webhook_integration_secret`).",
                },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      ignored: { type: "string", nullable: true },
                      orderStatus: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            "200": {
              description: [
                "Webhook accepted for non-Pathao partners (unknown payloads still return 200 to stop retries).",
                "Steadfast: JSON body as documented.",
              ].join(" "),
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      orderStatus: { type: "string", nullable: true },
                      ignored: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            "401": { description: "Signature missing or invalid." },
            "503": {
              description: "Pathao connectivity test refused: `webhook_integration_secret` (dashboard UUID) not configured for this courier.",
            },
            "404": { description: "Unknown courier slug." },
          },
        },
      },
      "/api/partners/openapi.json": {
        get: {
          tags: ["Webhooks"],
          summary: "Machine-readable OpenAPI document",
          responses: {
            "200": {
              description: "OpenAPI 3.1 JSON.",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        OrderStatus: {
          type: "string",
          enum: ORDER_STATUSES,
          description:
            "Internal Orlenbd lifecycle status. Partners do not need to send these directly; they send their own status names and we map them via the per-partner adapter.",
        },
        PartnerWebhookPayload: {
          type: "object",
          description:
            "Loose envelope. Pathao uses `event`/`consignment_id`/`order_status`; Steadfast uses `status`/`consignment_id`/`tracking_code`. We map to OrderStatus per partner.",
          additionalProperties: true,
          properties: {
            event: { type: "string", description: "Pathao event name (e.g. `pickup`, `delivered`, `return`)." },
            status: { type: "string", description: "Steadfast delivery status." },
            consignment_id: {
              oneOf: [{ type: "string" }, { type: "integer" }],
              description: "Carrier-side parcel reference returned to us at create time.",
            },
            tracking_code: { type: "string", description: "Steadfast-specific tracking code." },
            merchant_order_id: { type: "string", description: "Pathao echoes our `order_number`." },
            invoice: { type: "string", description: "Steadfast echoes our `order_number`." },
            order_status: { type: "string", description: "Human-readable partner status (Pathao)." },
            updated_at: { type: "string", format: "date-time" },
            note: { type: "string" },
          },
        },
      },
    },
  };
}
