import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Local default only — on the VPS, set DATABASE_URL in .env or push will be skipped in deploy.sh (avoids hanging on localhost).
const url =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/orlenbd";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  /**
   * Only diff/push `public` — avoids interactive multi-schema prompts over non-TTY SSH (shared DBs).
   * Do not pass `--schemaFilters` on the CLI for the same thing: drizzle-kit then skips this file and errors (dialect/schema undefined).
   */
  schemaFilter: ["public"],
  dbCredentials: {
    url,
  },
});
