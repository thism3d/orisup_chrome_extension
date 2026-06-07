/**
 * Create or update platform admin from env; always applies password from .env (explicit reset).
 * Server boot only ensures the admin exists and preserves an existing password_hash — use this script to sync .env.
 * Prefer PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD (any install).
 * Legacy: ORLENBD_ADMIN_EMAIL / ORLENBD_ADMIN_PASSWORD still work.
 *
 * Loads `<repo>/.env` explicitly (works even if cwd differs).
 * If vars are missing: ensure .env is readable by the user running npm (not root-only), e.g.
 *   sudo chown admin93:admin93 /var/www/norexbd/.env
 *
 *   cd /var/www/norexbd && npm run admin:upsert
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import * as storage from "../server/storage";
import { getPlatformAdminCredentialsFromEnv } from "../server/lib/platformAdminEnv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(repoRoot, ".env") });

async function main() {
  const { email, password } = getPlatformAdminCredentialsFromEnv();
  if (!email || !password) {
    console.error(
      "Missing PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD (or ORLENBD_ADMIN_*) in .env or shell.\n" +
        `Looked for: ${path.join(repoRoot, ".env")}\n` +
        "If you use PLATFORM_ADMIN_* already: git pull (old script only knew ORLENBD_*), and ensure the app user can read .env (not chmod 600 root-only).",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const r = await storage.upsertPlatformAdmin(email, hash, "Platform Admin");
  console.log(`${r.action === "created" ? "Created" : "Updated"} platform admin (${r.userId}): ${email.toLowerCase()}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
