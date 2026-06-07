-- Categories tree hierarchy: per-node image, parent index, parent FK with cascade.
-- Levels are enforced in application logic (max depth 2: root > sub > sub-sub).

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_url" text;

CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'categories_parent_id_fk'
  ) THEN
    ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fk";
  END IF;
END $$;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_parent_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE CASCADE;
