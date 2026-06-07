-- Per-product Pathao/checkout free delivery overrides (thresholds optional).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS free_delivery_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_delivery_min_cart_amount decimal(12, 2),
  ADD COLUMN IF NOT EXISTS free_delivery_min_quantity integer;
