-- Facebook Login: stable Graph user id on user row.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_sub" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_facebook_sub_key" ON "users" ("facebook_sub") WHERE "facebook_sub" IS NOT NULL;
