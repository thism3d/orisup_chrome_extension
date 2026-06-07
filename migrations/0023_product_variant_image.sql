-- Add image URL for product variants so scraped variant images can persist to live product options.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image text;
