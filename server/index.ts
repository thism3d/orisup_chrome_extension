import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import * as storage from "./storage";
import { getPlatformAdminCredentialsFromEnv } from "./lib/platformAdminEnv";
import { canonicalHostMiddleware } from "./middleware/canonicalHost";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Webhooks that verify HMAC over the verbatim POST body must skip global JSON parsing
// so route-level `express.raw` sees the original bytes (partner couriers, OrlenPay cash-in).
const RAW_BODY_WEBHOOK_PATH_RE =
  /^\/api\/partners\/couriers\/[^/]+\/webhook$|^\/api\/payments\/callback\/orlenpay$/;
const skipGlobalBodyParserIfRawWebhook = (
  middleware: express.RequestHandler,
): express.RequestHandler => (req, res, next) => {
  if (RAW_BODY_WEBHOOK_PATH_RE.test(req.path)) return next();
  return middleware(req, res, next);
};
app.use(skipGlobalBodyParserIfRawWebhook(express.json({ limit: "10mb" })));
app.use(skipGlobalBodyParserIfRawWebhook(express.urlencoded({ extended: false, limit: "10mb" })));

const PgSession = connectPgSimple(session);
const useSecureCookies = process.env.SECURE_COOKIES === "true";

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "orlenbd-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      sameSite: useSecureCookies ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const pathName = req.path;
  res.on("finish", () => {
    if (pathName.startsWith("/api")) {
      log(`${req.method} ${pathName} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

app.use(canonicalHostMiddleware);

const httpServer = createServer(app);
registerRoutes(app);

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

(async () => {
  const { email: adminEmail, password: adminPassword } = getPlatformAdminCredentialsFromEnv();
  if (adminEmail && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 10);
    const r = await storage.upsertPlatformAdmin(adminEmail, hash, "Platform Admin", {
      overwriteExistingPassword: false,
    });
    log(`${r.action === "created" ? "Created" : "Ensured"} platform admin: ${adminEmail}`);
  } else if (process.env.NODE_ENV === "production") {
    log(
      "Warning: PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD (or ORLENBD_ADMIN_*) not set — run `npm run admin:upsert` or add them to .env",
    );
  }

  try {
    await storage.ensureDefaultAdminAccessRoles();
  } catch (e) {
    log(`Warning: ensureDefaultAdminAccessRoles: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await storage.seedDefaultContentPagesIfMissing();
  } catch (e) {
    log(`Brand-trust pages seed skipped: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5010", 10);
  const listenOpts: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform === "linux") {
    listenOpts.reusePort = true;
  }
  httpServer.listen(listenOpts, () => {
    log(`orlenbd serving on port ${port}`);
  });
})();
