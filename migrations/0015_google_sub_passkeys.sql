-- Google Sign-In + WebAuthn passkeys; password_hash optional for OAuth-only users.

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_key" ON "users" ("google_sub") WHERE "google_sub" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "pass_key_credentials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL UNIQUE,
  "public_key" text NOT NULL,
  "counter" integer NOT NULL DEFAULT 0,
  "transports" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "label" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pass_key_credentials_user_id_idx" ON "pass_key_credentials" ("user_id");

CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge" text NOT NULL,
  "user_id" varchar REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "webauthn_challenges_expires_at_idx" ON "webauthn_challenges" ("expires_at");
