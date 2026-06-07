-- Newsletter sign-ups (footer). Run via `npm run db:migrate` or apply manually if you do not use Drizzle migrate.
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
