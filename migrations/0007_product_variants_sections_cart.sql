-- Product detail sections (AI + manual)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS key_features_json jsonb,
ADD COLUMN IF NOT EXISTS specifications_json jsonb,
ADD COLUMN IF NOT EXISTS general_info_json jsonb;

-- Variants (per-option price + stock)
CREATE TABLE IF NOT EXISTS product_variants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  value text NOT NULL,
  price numeric(12, 2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);

-- Cart lines: optional variant + partial unique indexes
ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS variant_id varchar REFERENCES product_variants(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS cart_line_cart_product;

CREATE UNIQUE INDEX IF NOT EXISTS cart_line_cart_product_novar
  ON cart_lines (cart_id, product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_line_cart_variant_line
  ON cart_lines (cart_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- Order line snapshots
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id varchar;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label_snapshot text;
