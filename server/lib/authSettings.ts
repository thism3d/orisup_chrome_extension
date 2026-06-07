import type { Request } from "express";

/**
 * Google / Facebook Sign-In / WebAuthn: env vars override dashboard values when non-empty so
 * deployments can still force credentials without relying on DB.
 */

/** `www.shop.com` and `shop.com` must share RP ID (`shop.com`) so passkeys work on both hosts. */
function stripLeadingWww(hostname: string): string {
  const h = hostname.trim().toLowerCase();
  return h.startsWith("www.") && h.length > 4 ? h.slice(4) : h;
}

function addWwwVariants(origins: string[]): string[] {
  const next = new Set<string>();
  for (const raw of origins) {
    const o = raw.trim().replace(/\/$/, "");
    if (!o) continue;
    next.add(o);
    try {
      const u = new URL(o);
      const host = u.hostname.toLowerCase();
      const proto = u.protocol;
      const port = u.port ? `:${u.port}` : "";
      if (host.startsWith("www.") && host.length > 4) {
        next.add(`${proto}//${host.slice(4)}${port}`);
      } else if (
        host !== "localhost" &&
        host !== "127.0.0.1" &&
        host !== "::1"
      ) {
        next.add(`${proto}//www.${host}${port}`);
      }
    } catch {
      /* ignore malformed */
    }
  }
  return Array.from(next);
}

function publicSiteOriginFromEnv(): string | null {
  const raw = process.env.PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.replace(/\/$/, "")).origin;
  } catch {
    return null;
  }
}

export function resolveGoogleClientId(platform: Record<string, string>): string {
  const env = process.env.GOOGLE_CLIENT_ID?.trim();
  if (env) return env;
  return platform.auth_google_client_id?.trim() || "";
}

export function resolveDisableGoogleLogin(platform: Record<string, string>): boolean {
  if (process.env.DISABLE_GOOGLE_LOGIN === "true") return true;
  return platform.auth_disable_google?.trim() === "1";
}

export function resolveDisableFacebookLogin(platform: Record<string, string>): boolean {
  if (process.env.DISABLE_FACEBOOK_LOGIN === "true") return true;
  return platform.auth_disable_facebook?.trim() === "1";
}

export function resolveFacebookAppId(platform: Record<string, string>): string {
  const env = process.env.FACEBOOK_APP_ID?.trim();
  if (env) return env;
  return platform.auth_facebook_app_id?.trim() || "";
}

export function resolveFacebookAppSecret(platform: Record<string, string>): string {
  const env = process.env.FACEBOOK_APP_SECRET?.trim();
  if (env) return env;
  return platform.auth_facebook_app_secret?.trim() || "";
}

export function resolveDisablePasskeys(platform: Record<string, string>): boolean {
  if (process.env.DISABLE_PASSKEYS === "true") return true;
  return platform.auth_disable_passkeys?.trim() === "1";
}

/** Prefer env FORCE_SINGLE_LOGIN_SESSION / DISABLE_*; dashboard `auth_single_login_session=1` when env silent. */
export function resolveSingleLoginSessionEnabled(platform: Record<string, string>): boolean {
  if (process.env.DISABLE_SINGLE_LOGIN_SESSION === "true") return false;
  if (process.env.FORCE_SINGLE_LOGIN_SESSION === "true") return true;
  return platform.auth_single_login_session?.trim() === "1";
}

export function resolveWebAuthnRpId(req: Request, platform: Record<string, string>): string {
  const env = process.env.WEBAUTHN_RP_ID?.trim();
  if (env) return env.toLowerCase();
  const db = platform.auth_webauthn_rp_id?.trim();
  if (db) return db.toLowerCase();
  const hostRaw =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.get("host") ||
    "localhost";
  const hostOnly = (hostRaw.split(":")[0] ?? hostRaw).toLowerCase();
  return stripLeadingWww(hostOnly);
}

export function resolveWebAuthnRpName(platform: Record<string, string>): string {
  const env = process.env.WEBAUTHN_RP_NAME?.trim();
  if (env) return env;
  const db = platform.auth_webauthn_rp_name?.trim();
  if (db) return db;
  return (
    process.env.DEFAULT_SITE_DISPLAY_NAME?.trim() ||
    platform.site_display_name?.trim() ||
    "Orlenbd"
  );
}

/** All acceptable WebAuthn origins — includes apex + www pairs and PUBLIC_SITE_URL to fix desktop/Google PM mismatches. */
export function resolveWebAuthnOrigins(req: Request, platform: Record<string, string>): string[] {
  const bases: string[] = [];
  const siteOrigin = publicSiteOriginFromEnv();
  if (siteOrigin) bases.push(siteOrigin);

  const raw = process.env.WEBAUTHN_ORIGINS?.trim() || platform.auth_webauthn_origins?.trim();
  if (raw) {
    bases.push(
      ...raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
    req.protocol ||
    "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.get("host") ||
    "localhost";

  bases.push(`${proto}://${host}`);

  const unique = Array.from(new Set(bases.map((b) => b.replace(/\/$/, ""))));
  return addWwwVariants(unique);
}

/** Client-only: empty when login is disabled or not fully configured — never exposes secrets. */
export function resolvePublicAuthPayload(platform: Record<string, string>): {
  googleClientId: string;
  facebookAppId: string;
  passkeysEnabled: boolean;
} {
  const googleConfigured = !!resolveGoogleClientId(platform);
  const googleClientId =
    googleConfigured && !resolveDisableGoogleLogin(platform) ? resolveGoogleClientId(platform) : "";
  const fbId = resolveFacebookAppId(platform);
  const fbSecret = resolveFacebookAppSecret(platform);
  const facebookConfigured = !!(fbId && fbSecret);
  const facebookAppId =
    facebookConfigured && !resolveDisableFacebookLogin(platform) ? fbId : "";
  const passkeysEnabled = !resolveDisablePasskeys(platform);
  return { googleClientId, facebookAppId, passkeysEnabled };
}
