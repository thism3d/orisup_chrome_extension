-- Couriers / delivery partners + order fulfillment fields.

CREATE TABLE IF NOT EXISTS "couriers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website" text,
	"tracking_url_template" text,
	"phone" text,
	"notes" text,
	"active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "couriers_slug_unique" UNIQUE("slug")
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courier_id" varchar REFERENCES "couriers"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "warehouse_received_at" timestamp;

-- Grant couriers module on system / full-access roles (merge into JSONB permissions).
UPDATE "admin_access_roles"
SET "permissions" = COALESCE("permissions", '{}'::jsonb) || '{"couriers": {"view": true, "create": true, "edit": true, "delete": true}}'::jsonb
WHERE "is_system" = true;
