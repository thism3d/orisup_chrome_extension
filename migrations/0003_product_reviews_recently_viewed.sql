-- Product reviews (moderated) and per-user recently viewed products.
CREATE TABLE IF NOT EXISTS product_reviews (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  title text,
  body text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'pending',
  admin_reply text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_user_product ON product_reviews(user_id, product_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_status ON product_reviews(product_id, status);

CREATE TABLE IF NOT EXISTS recently_viewed (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recently_viewed_user_product ON recently_viewed(user_id, product_id);
CREATE INDEX IF NOT EXISTS recently_viewed_user_viewed ON recently_viewed(user_id, viewed_at DESC);
