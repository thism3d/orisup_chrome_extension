/**
 * One-time (or repeatable) backfill: set NULL creator/handler user ids to the platform admin user.
 * Resolves admin via PLATFORM_ADMIN_EMAIL / ORLENBD_ADMIN_EMAIL in .env, else first `platform_admin` user.
 *
 *   cd /path/to/orlenbd && npm run db:backfill-actors
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { pool } from "../server/db";
import { getPlatformAdminCredentialsFromEnv } from "../server/lib/platformAdminEnv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(repoRoot, ".env") });

async function resolveAdminUserId(): Promise<string | null> {
  const { email } = getPlatformAdminCredentialsFromEnv();
  if (email?.trim()) {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(trim(email)) = lower(trim($1)) LIMIT 1`,
      [email.trim()],
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }
  const r2 = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'platform_admin' ORDER BY created_at ASC LIMIT 1`,
  );
  return r2.rows[0]?.id ?? null;
}

type Spec = { table: string; created?: string; updated?: string };

const BACKFILL: Spec[] = [
  { table: "admin_access_roles", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "users", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "vendors", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "categories", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "products", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "banners", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "couriers", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "orders", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "content_pages", created: "created_by_user_id", updated: "updated_by_user_id" },
  { table: "product_reviews", updated: "updated_by_user_id" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const adminId = await resolveAdminUserId();
  if (!adminId) {
    console.error("Could not resolve a platform admin user (set PLATFORM_ADMIN_EMAIL + user in DB).");
    process.exit(1);
  }
  console.log(`Using admin user id: ${adminId}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const spec of BACKFILL) {
      if (spec.created) {
        const q = `UPDATE "${spec.table}" SET "${spec.created}" = $1 WHERE "${spec.created}" IS NULL`;
        const r = await client.query(q, [adminId]);
        console.log(`  ${spec.table}.${spec.created}: ${r.rowCount ?? 0} rows`);
      }
      if (spec.updated) {
        const q = `UPDATE "${spec.table}" SET "${spec.updated}" = $1 WHERE "${spec.updated}" IS NULL`;
        const r = await client.query(q, [adminId]);
        console.log(`  ${spec.table}.${spec.updated}: ${r.rowCount ?? 0} rows`);
      }
    }
    await client.query("COMMIT");
    console.log("Done.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
