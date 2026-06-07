-- Courier partner integration: per-partner adapter config, expanded order
-- fulfillment columns, courier event log.

ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "partner_type" text NOT NULL DEFAULT 'manual';
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "api_base_url" text;
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "api_credentials" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "webhook_secret" text;
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "default_eta_hours" integer;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "partner_consignment_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "eta_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "picked_up_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "last_partner_event_at" timestamp;

CREATE TABLE IF NOT EXISTS "courier_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
	"courier_id" varchar REFERENCES "couriers"("id") ON DELETE SET NULL,
	"direction" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"status_before" text,
	"status_after" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "courier_events_order_idx" ON "courier_events" ("order_id");
CREATE INDEX IF NOT EXISTS "courier_events_courier_idx" ON "courier_events" ("courier_id");
