-- Admin access roles: permission matrix for platform_admin users (users.admin_role_id).
-- NULL admin_role_id = full access (superuser).

CREATE TABLE IF NOT EXISTS "admin_access_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"permissions" jsonb NOT NULL,
	"is_system" boolean NOT NULL DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_access_roles_slug_unique" UNIQUE("slug")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_role_id" varchar REFERENCES "admin_access_roles"("id") ON DELETE SET NULL;
