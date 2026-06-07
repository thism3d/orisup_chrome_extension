ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "updated_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
