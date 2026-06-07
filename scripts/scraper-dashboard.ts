import express, { Request, Response } from 'express';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// ---------------------------------------------------------------------------
// Configuration (reads from .env)
// ---------------------------------------------------------------------------
import 'dotenv/config';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://orisup_user:StrongPass123@127.0.0.1:5432/orisup_db';
const PORT = Number(process.env.SCRAPER_DASHBOARD_PORT) || 5099;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// PG pool
// ---------------------------------------------------------------------------
const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ---------------------------------------------------------------------------
// API – fetch scraped products with filters
// ---------------------------------------------------------------------------
app.get('/api/scraped', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (status.length) {
      conditions.push(`review_status = ANY($${values.length + 1})`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(title ILIKE $${values.length + 1} OR source_url ILIKE $${values.length + 1})`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM scraped_products ${whereClause} ORDER BY scraped_at DESC LIMIT 300`;
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ---------------------------------------------------------------------------
// API – fetch dashboard stats
// ---------------------------------------------------------------------------
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT review_status, COUNT(*) AS count
      FROM scraped_products
      GROUP BY review_status
    `);

    const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0, uploaded: 0, total: 0 };
    result.rows.forEach((row) => {
      const key = String(row.review_status || '').toLowerCase();
      stats[key] = Number(row.count) || 0;
      stats.total += Number(row.count) || 0;
    });

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ---------------------------------------------------------------------------
// Helper – Match Category
// ---------------------------------------------------------------------------
function matchCategory(title: string, categories: { id: string; name: string }[]): string | null {
  const t = title.toLowerCase();
  const rules: { keywords: string[]; name: string }[] = [
    { name: 'Beauty & Self Care', keywords: ['nail', 'beauty', 'hair', 'skin', 'makeup', 'care', 'face', 'brush', 'cosmetic', 'massage', 'spa', 'trimmer'] },
    { name: 'Smart Gadgets', keywords: ['earphone', 'headphone', 'earbud', 'tws', 'wireless', 'bluetooth', 'phone', 'charger', 'cable', 'stand', 'holder', 'gadget', 'smart', 'watch', 'clock', 'speaker'] },
    { name: 'Fashion & Nightwear', keywords: ['dress', 'shirt', 'pant', 'wear', 'cloth', 'fashion', 'nightwear', 'lingerie', 'bra', 'suit', 'jacket', 'shoe'] },
    { name: 'Smart Home & Decor', keywords: ['light', 'lamp', 'decor', 'home', 'kitchen', 'room', 'wall', 'table', 'clock', 'furniture', 'garden'] },
    { name: 'Premium Accessories', keywords: ['bag', 'wallet', 'sunglass', 'glass', 'ring', 'necklace', 'jewelry', 'bracelet', 'cap', 'hat', 'belt'] },
    { name: 'Travel & Privacy Essentials', keywords: ['travel', 'bag', 'luggage', 'pillow', 'privacy', 'lock', 'tracker', 'passport', 'case'] },
    { name: 'Health & Wellness', keywords: ['health', 'fitness', 'gym', 'yoga', 'belt', 'posture', 'support', 'band', 'wellness'] },
    { name: 'Perfumes & Fragrances', keywords: ['perfume', 'fragrance', 'scent', 'spray', 'oil', 'diffuser'] },
    { name: 'Couples & Intimacy', keywords: ['couple', 'intimacy', 'toy', 'adult', 'romantic', 'love'] },
    { name: 'Gift Collection', keywords: ['gift', 'box', 'set', 'present', 'birthday', 'anniversary'] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => t.includes(kw))) {
      const matched = categories.find((c) => c.name.toLowerCase() === rule.name.toLowerCase());
      if (matched) return matched.id;
    }
  }

  // Fallback to Trending Viral Products
  const fallback = categories.find((c) => c.name.toLowerCase().includes('trending'));
  if (fallback) return fallback.id;

  // Final fallback to first category
  return categories.length > 0 ? categories[0].id : null;
}

// ---------------------------------------------------------------------------
// API – approve & upload / reject
// ---------------------------------------------------------------------------
async function processUploadAndApprove(id: string, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM scraped_products WHERE id = $1 FOR UPDATE', [id]);
    if (rows.length === 0) throw new Error('Record not found');
    const prod = rows[0];

    // Check if already uploaded
    if (prod.uploaded_product_id) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, productId: prod.uploaded_product_id, status: prod.review_status });
    }

    const vendorId = 'b1b5723b-20f2-449b-87ee-f8e5ea13463c'; // Orisup vendor

    // Fetch categories for matching
    const catRes = await client.query('SELECT id, name FROM categories');
    const matchedCategoryId = matchCategory(prod.title || '', catRes.rows);

    const insertProdText = `
      INSERT INTO products (
        vendor_id, category_id, title, slug, description,
        price, compare_at_price, stock, images, status,
        key_features_json, specifications_json, general_info_json
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13
      ) RETURNING id`;
    const values = [
      vendorId,
      matchedCategoryId,
      prod.title,
      prod.slug,
      prod.description || '',
      prod.selling_price_bdt,
      prod.compare_at_price_bdt,
      prod.stock || 10,
      JSON.stringify(prod.downloaded_images || []),
      'active',
      JSON.stringify({ en: prod.title }),
      JSON.stringify(prod.specifications || []),
      JSON.stringify({ en: prod.description || '' }),
    ];
    const prodRes = await client.query(insertProdText, values);
    const newProdId = prodRes.rows[0].id;

    // Insert variants if any
    if (Array.isArray(prod.variants) && prod.variants.length) {
      const varVals: unknown[] = [newProdId];
      const varPlaceholders: string[] = [];
      prod.variants.forEach((v: any, i: number) => {
        const base = 2 + i * 7;
        varPlaceholders.push(`($1, $${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
        varVals.push(v.kind || 'custom');
        varVals.push(v.name || '');
        varVals.push(v.value || '');
        varVals.push(v.image || null);
        const priceBdt = v.price_usd
          ? Math.round(
              v.price_usd *
                (process.env.ALI_USD_TO_BDT_RATE ? Number(process.env.ALI_USD_TO_BDT_RATE) : 120) *
                (process.env.ALI_MARKUP_MULTIPLIER ? Number(process.env.ALI_MARKUP_MULTIPLIER) : 2.0)
            )
          : prod.selling_price_bdt;
        varVals.push(priceBdt);
        varVals.push(v.stock || 10);
        varVals.push(i);
      });
      const varQuery = `INSERT INTO product_variants (product_id, kind, name, value, image, price, stock, sort_order) VALUES ${varPlaceholders.join(',\n')}`;
      await client.query(varQuery, varVals);
    }

    // Update scraped_products record
    await client.query(
      "UPDATE scraped_products SET review_status = $1, uploaded_product_id = $2, reviewed_at = now(), uploaded_at = now() WHERE id = $3",
      ['approved', newProdId, id]
    );
    await client.query('COMMIT');
    res.json({ ok: true, productId: newProdId, status: 'approved' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
}

app.post('/api/scraped/:id/approve', async (req: Request, res: Response) => {
  await processUploadAndApprove(req.params.id, res);
});

app.post('/api/scraped/:id/upload', async (req: Request, res: Response) => {
  await processUploadAndApprove(req.params.id, res);
});

app.post('/api/scraped/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE scraped_products SET review_status = $1, reviewed_at = now() WHERE id = $2', [
      'rejected',
      id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ---------------------------------------------------------------------------
// Dashboard UI – static page in /public
// ---------------------------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use(express.static(publicDir));

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
});

export default app;
