-- Orders: persisted delivery fee (Pathao / future couriers).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(12, 2) NOT NULL DEFAULT 0;
UPDATE orders SET shipping_fee = 0 WHERE shipping_fee IS NULL;

-- Saved addresses: Pathao location IDs for checkout and admin.
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_city_id integer;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_zone_id integer;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_area_id integer;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_city_name text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_zone_name text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pathao_area_name text;
