-- Tracks login generation for optional "single active session" enforcement.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "login_session_version" integer NOT NULL DEFAULT 0;
