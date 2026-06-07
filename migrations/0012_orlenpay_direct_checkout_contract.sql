ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "provider" text,
  ADD COLUMN IF NOT EXISTS "provider_session_token" text,
  ADD COLUMN IF NOT EXISTS "status_detail" text,
  ADD COLUMN IF NOT EXISTS "callback_received_at" timestamp,
  ADD COLUMN IF NOT EXISTS "gateway_meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "payment_id" varchar NOT NULL REFERENCES "payments"("id") ON DELETE cascade,
  "direction" text NOT NULL,
  "kind" text NOT NULL,
  "status" text,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "error_message" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_events_payment_idx" ON "payment_events" ("payment_id");
CREATE INDEX IF NOT EXISTS "payment_events_kind_idx" ON "payment_events" ("kind");
CREATE INDEX IF NOT EXISTS "payment_events_status_idx" ON "payment_events" ("status");
