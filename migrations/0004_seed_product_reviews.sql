-- Sample approved reviews in Bangla and English (skip if no customer user or no active products).
-- Safe to re-run: skips pairs that already have a review from the same user.

INSERT INTO product_reviews (product_id, user_id, rating, title, body, locale, status)
SELECT
  prods.id,
  cust.id,
  CASE WHEN prods.n % 2 = 0 THEN 5 ELSE 4 END,
  NULL,
  CASE WHEN prods.n % 2 = 0
    THEN 'দামে ভালো, প্যাকেজিং ঠিকঠাক। ডেলিভারি সময়মতো হয়েছে।'
    ELSE 'Fast delivery and exactly as described. Would buy again.'
  END,
  CASE WHEN prods.n % 2 = 0 THEN 'bn' ELSE 'en' END,
  'approved'
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at) AS n
  FROM products
  WHERE status = 'active'
  LIMIT 6
) prods
CROSS JOIN (
  SELECT id FROM users WHERE role = 'customer' ORDER BY created_at LIMIT 1
) cust
WHERE NOT EXISTS (
  SELECT 1 FROM product_reviews r WHERE r.product_id = prods.id AND r.user_id = cust.id
);
