import type { NextFunction, Request, Response } from "express";

/**
 * 301 to PUBLIC_SITE_URL when the request origin differs (e.g. www, http, or port).
 * Use with TRUSTED reverse proxy (X-Forwarded-*) and app.set("trust proxy", 1) in production.
 * ENFORCE_CANONICAL_ORIGIN=true
 */
export function canonicalHostMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.ENFORCE_CANONICAL_ORIGIN !== "true") return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/uploads/")) return next();

  const wantRaw = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (!wantRaw) return next();
  let want: URL;
  try {
    want = new URL(wantRaw);
  } catch {
    return next();
  }

  const xfh = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0]!.trim();
  if (!xfh) return next();
  const xfp = (req.get("x-forwarded-proto") || req.protocol || "http").toString().split(",")[0]!.trim();
  const proto = xfp === "https" ? "https" : "http";
  const hostWithPort = xfh.toLowerCase();
  let current: URL;
  try {
    current = new URL(`${proto}://${hostWithPort}${req.originalUrl || req.url || "/"}`);
  } catch {
    return next();
  }
  if (current.origin === want.origin) return next();
  res.redirect(301, `${want.origin}${current.pathname}${current.search}`);
}
