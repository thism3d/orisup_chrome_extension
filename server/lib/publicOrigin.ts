import type { Request } from "express";

/** Env-configured storefront origin (`https://orlenbd.com` or `https://www.orlenbd.com`). No trailing slash. */
export function siteBaseFromEnv(): string {
  return (process.env.PUBLIC_SITE_URL || "https://orlenbd.com").replace(/\/$/, "");
}

/**
 * When `PUBLIC_ORIGIN_MIRROR_REQUEST_HOST=true`: use the inbound request hostname (apex or www) for absolute
 * URLs in SSR HTML and sitemap/robots feeds, iff it matches the hostname in `PUBLIC_SITE_URL` or the alternate
 * `www.` / bare form. Keeps canonicals and sitemap `<loc>` aligned with dual-host CDN setups until 301 unify.
 */
export function resolveMirroredPublicOrigin(req: Request): string {
  const fallback = siteBaseFromEnv();
  if ((process.env.PUBLIC_ORIGIN_MIRROR_REQUEST_HOST ?? "").trim().toLowerCase() !== "true") return fallback;

  let wantHost: string;
  try {
    wantHost = new URL(fallback).hostname.toLowerCase();
  } catch {
    return fallback;
  }
  const altHost = wantHost.startsWith("www.") ? wantHost.slice(4) : `www.${wantHost}`;

  const forwarded = req.get("x-forwarded-host") || req.get("host") || "";
  const trimmed = forwarded.split(",")[0]!.trim().toLowerCase();
  const reqHost = trimmed.includes(":") ? trimmed.split(":")[0]! : trimmed;
  if (!reqHost) return fallback;
  if (reqHost !== wantHost && reqHost !== altHost) return fallback;

  let proto: "http" | "https";
  try {
    proto = (new URL(fallback).protocol.replace(":", "") as "http" | "https") || "https";
  } catch {
    proto = "https";
  }
  const xfProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (xfProto === "https" || xfProto === "http") proto = xfProto;

  return `${proto}://${reqHost}`;
}
