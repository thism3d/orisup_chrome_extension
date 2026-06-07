ALTER TABLE "banners"
  ADD COLUMN IF NOT EXISTS "show_title" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "show_subtitle" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "show_button" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "show_shadow" boolean NOT NULL DEFAULT true;
