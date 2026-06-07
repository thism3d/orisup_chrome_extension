-- Audit trail + denormalized creator/handler for admin list views

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "summary" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip" text,
  "user_agent" text,
  "request_path" text NOT NULL,
  "request_method" text NOT NULL,
  "response_status" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "admin_access_roles" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "admin_access_roles" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
