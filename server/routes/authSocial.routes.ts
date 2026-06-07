import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import * as storage from "../storage";
import type { User } from "../../shared/schema";
import { verifyGoogleIdCredential } from "../lib/googleIdToken";
import {
  resolveDisableFacebookLogin,
  resolveDisableGoogleLogin,
  resolveDisablePasskeys,
  resolveFacebookAppId,
  resolveFacebookAppSecret,
  resolveGoogleClientId,
  resolvePublicAuthPayload,
  resolveWebAuthnOrigins,
  resolveWebAuthnRpId,
  resolveWebAuthnRpName,
} from "../lib/authSettings";
import { verifyFacebookAccessToken } from "../lib/facebookAccessToken";
import { finalizeAuthenticatedSession } from "../lib/authSession";
import { requireAuth } from "../middleware/auth";

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    hasPassword: !!(user.passwordHash && user.passwordHash.length > 0),
    avatarUrl: user.avatarUrl ?? null,
    googleSub: user.googleSub ?? null,
    facebookSub: user.facebookSub ?? null,
  };
}

/** Chrome/Google Password Manager can surface credential IDs with equivalent base64url encodings vs mobile enrollment. */
async function lookupPassKeyByCredentialId(credentialIdRaw: string) {
  const row = await storage.getPassKeyByCredentialId(credentialIdRaw);
  if (row) return row;
  try {
    const buf = isoBase64URL.toBuffer(credentialIdRaw);
    const canonical = isoBase64URL.fromBuffer(buf);
    if (canonical !== credentialIdRaw) {
      const alt = await storage.getPassKeyByCredentialId(canonical);
      if (alt) return alt;
    }
  } catch {
    /* ignore decode errors */
  }
  return undefined;
}

async function resolveGoogleLoginUser(
  g: Awaited<ReturnType<typeof verifyGoogleIdCredential>>,
  mode: "storefront" | "admin",
): Promise<
  | { ok: true; user: User }
  | { ok: false; status: number; error: string }
> {
  let user = await storage.getUserByGoogleSub(g.sub);
  if (!user && g.email) {
    const byEmail = await storage.getUserByEmail(g.email);
    if (byEmail) {
      if (byEmail.googleSub && byEmail.googleSub !== g.sub) {
        return { ok: false, status: 409, error: "This email is linked to a different Google account." };
      }
      if (!byEmail.googleSub) {
        await storage.setUserGoogleSub(byEmail.id, g.sub);
      }
      const fresh = await storage.getUserById(byEmail.id);
      user = fresh ?? byEmail;
    }
  }

  if (!user) {
    if (mode === "admin") {
      return {
        ok: false,
        status: 403,
        error:
          "No platform admin account linked to this Google user. Ask a super-admin to invite you first, then sign in with password once.",
      };
    }
    user = await storage.createUser({
      email: g.email,
      phone: null,
      passwordHash: null,
      googleSub: g.sub,
      avatarUrl: g.picture ?? null,
      fullName: g.name,
      role: "customer",
    });
  }

  await storage.maybeSetAvatarFromProvider(user.id, g.picture);

  if (mode === "storefront" && user.role === "platform_admin") {
    return {
      ok: false,
      status: 403,
      error:
        "Platform administrators cannot sign in here with Google. Use the administrator sign-in page.",
    };
  }

  if (mode === "admin" && user.role !== "platform_admin") {
    return {
      ok: false,
      status: 403,
      error:
        "This Google account does not belong to a platform administrator. Use the storefront sign-in.",
    };
  }

  const freshAfterAvatar = await storage.getUserById(user.id);
  return { ok: true, user: freshAfterAvatar ?? user };
}

async function resolveFacebookLoginUser(
  fb: Awaited<ReturnType<typeof verifyFacebookAccessToken>>,
  mode: "storefront" | "admin",
): Promise<
  | { ok: true; user: User }
  | { ok: false; status: number; error: string }
> {
  let user = await storage.getUserByFacebookSub(fb.sub);
  if (!user && fb.email) {
    const byEmail = await storage.getUserByEmail(fb.email);
    if (byEmail) {
      if (byEmail.facebookSub && byEmail.facebookSub !== fb.sub) {
        return { ok: false, status: 409, error: "This email is linked to a different Facebook account." };
      }
      if (!byEmail.facebookSub) {
        await storage.setUserFacebookSub(byEmail.id, fb.sub);
      }
      const fresh = await storage.getUserById(byEmail.id);
      user = fresh ?? byEmail;
    }
  }

  if (!user) {
    if (mode === "admin") {
      return {
        ok: false,
        status: 403,
        error:
          "No platform admin account linked to this Facebook user. Ask a super-admin to invite you first, then sign in with password once.",
      };
    }
    user = await storage.createUser({
      email: fb.email,
      phone: null,
      passwordHash: null,
      facebookSub: fb.sub,
      avatarUrl: fb.picture ?? null,
      fullName: (fb.name && fb.name.trim()) || fb.email || "Facebook user",
      role: "customer",
    });
  }

  await storage.maybeSetAvatarFromProvider(user.id, fb.picture);

  if (mode === "storefront" && user.role === "platform_admin") {
    return {
      ok: false,
      status: 403,
      error:
        "Platform administrators cannot sign in here with Facebook. Use the administrator sign-in page.",
    };
  }

  if (mode === "admin" && user.role !== "platform_admin") {
    return {
      ok: false,
      status: 403,
      error:
        "This Facebook account does not belong to a platform administrator. Use the storefront sign-in.",
    };
  }

  const freshFb = await storage.getUserById(user.id);
  return { ok: true, user: freshFb ?? user };
}

function platformAdminAllowsPasskey(role: string, mode: "storefront" | "admin"): boolean {
  if (mode === "admin") return role === "platform_admin";
  return role !== "platform_admin";
}

export function registerAuthSocialRoutes(app: Express) {
  app.get("/api/auth/public-config", async (_req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    res.json(resolvePublicAuthPayload(platform));
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisableGoogleLogin(platform)) {
      return res.status(503).json({ error: "Google Sign-In is disabled for this site." });
    }
    const audience = resolveGoogleClientId(platform);
    if (!audience) {
      return res
        .status(503)
        .json({
          error:
            "Google Sign-In is not configured. Add GOOGLE_CLIENT_ID to the server environment or Google Client ID under Admin → Settings → Sign-in.",
        });
    }
    const parsed = z
      .object({
        credential: z.string().min(20),
        mode: z.enum(["storefront", "admin"]).default("storefront"),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let g: Awaited<ReturnType<typeof verifyGoogleIdCredential>>;
    try {
      g = await verifyGoogleIdCredential(parsed.data.credential, audience);
    } catch (e) {
      return res.status(401).json({ error: e instanceof Error ? e.message : "Invalid Google credential" });
    }

    const resolved = await resolveGoogleLoginUser(g, parsed.data.mode);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    await finalizeAuthenticatedSession(req, resolved.user, platform);
    return res.json({ user: serializeUser(resolved.user) });
  });

  app.post("/api/auth/facebook", async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisableFacebookLogin(platform)) {
      return res.status(503).json({ error: "Facebook Login is disabled for this site." });
    }
    const appId = resolveFacebookAppId(platform);
    const appSecret = resolveFacebookAppSecret(platform);
    if (!appId || !appSecret) {
      return res.status(503).json({
        error:
          "Facebook Login is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET or use Admin → Settings → Sign-in & social login.",
      });
    }

    const parsed = z
      .object({
        accessToken: z.string().min(20),
        mode: z.enum(["storefront", "admin"]).default("storefront"),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let profile: Awaited<ReturnType<typeof verifyFacebookAccessToken>>;
    try {
      profile = await verifyFacebookAccessToken(parsed.data.accessToken, appId, appSecret);
    } catch (e) {
      return res.status(401).json({ error: e instanceof Error ? e.message : "Invalid Facebook token" });
    }

    const resolved = await resolveFacebookLoginUser(profile, parsed.data.mode);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    await finalizeAuthenticatedSession(req, resolved.user, platform);
    return res.json({ user: serializeUser(resolved.user) });
  });

  app.post("/api/auth/passkey/login-options", async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisablePasskeys(platform)) {
      return res.status(503).json({ error: "Passkeys are disabled." });
    }
    const parsed = z
      .object({
        mode: z.enum(["storefront", "admin"]),
        email: z.string().email().trim().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const rpId = resolveWebAuthnRpId(req, platform);
    let allowCredentials:
      | { id: string; transports?: AuthenticatorTransportFuture[] }[]
      | undefined;

    if (parsed.data.email) {
      const u = await storage.getUserByEmail(parsed.data.email);
      if (!u) return res.status(404).json({ error: "No account with this email." });
      if (!platformAdminAllowsPasskey(u.role, parsed.data.mode)) {
        const msg =
          parsed.data.mode === "admin"
            ? "Use the storefront login for customer and seller accounts."
            : "Administrators cannot use passkey login on this page. Go to Administrator sign-in.";
        return res.status(403).json({ error: msg });
      }
      const rows = await storage.listPassKeyRowsForWebAuthn(u.id);
      if (!rows.length) return res.status(404).json({ error: "This account has no passkeys yet." });
      allowCredentials = rows.map((r) => ({
        id: r.credentialId,
        transports: r.transports as AuthenticatorTransportFuture[],
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: "preferred",
      timeout: 60000,
    });

    const { id: challengeId } = await storage.insertWebauthnChallenge({
      challenge: options.challenge,
      userId: null,
      kind: "authentication",
    });

    return res.json({ options, challengeId });
  });

  app.post("/api/auth/passkey/login-verify", async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisablePasskeys(platform)) {
      return res.status(503).json({ error: "Passkeys are disabled." });
    }
    const parsed = z
      .object({
        mode: z.enum(["storefront", "admin"]),
        challengeId: z.string().uuid(),
        credential: z.unknown(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const consumed = await storage.consumeWebauthnChallenge(parsed.data.challengeId, "authentication");
    if (!consumed)
      return res.status(400).json({ error: "Passkey login session expired — try again." });

    const response = parsed.data.credential as AuthenticationResponseJSON;
    const credId =
      typeof response?.id === "string" ? response.id : undefined;
    if (!credId) return res.status(400).json({ error: "Invalid passkey payload." });

    const row = await lookupPassKeyByCredentialId(credId);
    if (!row) return res.status(401).json({ error: "Unrecognized passkey." });

    const user = await storage.getUserById(row.userId);
    if (!user) return res.status(401).json({ error: "User not found." });

    if (!platformAdminAllowsPasskey(user.role, parsed.data.mode)) {
      const msg =
        parsed.data.mode === "admin"
          ? "This passkey belongs to an account that is not a platform administrator."
          : "Use Administrator sign-in for platform admin accounts.";
      return res.status(403).json({ error: msg });
    }

    const rpId = resolveWebAuthnRpId(req, platform);
    const expectedOrigin = resolveWebAuthnOrigins(req, platform);
    let publicKeyBuf: Uint8Array;
    try {
      publicKeyBuf = isoBase64URL.toBuffer(row.publicKey);
    } catch {
      return res.status(500).json({ error: "Stored passkey public key format is corrupt." });
    }

    const webAuthnCredential: WebAuthnCredential = {
      id: row.credentialId,
      publicKey: publicKeyBuf,
      counter: row.counter,
    };

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: consumed.challenge,
        expectedOrigin,
        expectedRPID: rpId,
        credential: webAuthnCredential,
      });
      if (!verification.verified) {
        return res.status(401).json({ error: "Passkey verification failed." });
      }
      await storage.updatePassKeyCounter(row.id, verification.authenticationInfo.newCounter);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[passkey-login-verify]", e instanceof Error ? e.message : e);
      }
      return res.status(401).json({ error: "Passkey verification failed." });
    }

    await finalizeAuthenticatedSession(req, user, platform);
    return res.json({ user: serializeUser(user) });
  });

  app.get("/api/me/passkeys", requireAuth, async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisablePasskeys(platform)) {
      return res.json([]);
    }
    const rows = await storage.listPassKeysForUser(req.session.userId!);
    return res.json(rows);
  });

  app.delete("/api/me/passkeys/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id;
    const ok = await storage.deletePassKeyForUser(id, req.session.userId!);
    if (!ok) return res.status(404).json({ error: "Passkey not found." });
    return res.json({ ok: true });
  });

  app.post("/api/me/passkeys/register-options", requireAuth, async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisablePasskeys(platform)) {
      return res.status(503).json({ error: "Passkeys are disabled." });
    }
    const parsedBody = z
      .object({ preferPlatformAuthenticator: z.boolean().optional() })
      .safeParse(typeof req.body === "object" && req.body !== null ? req.body : {});
    const preferPcHello = parsedBody.success && parsedBody.data.preferPlatformAuthenticator === true;

    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Session invalid." });

    const rpId = resolveWebAuthnRpId(req, platform);
    const existing = await storage.listPassKeyRowsForWebAuthn(user.id);

    const options = await generateRegistrationOptions({
      rpName: resolveWebAuthnRpName(platform),
      rpID: rpId,
      userID: isoUint8Array.fromUTF8String(user.id),
      userName: user.email ?? user.phone ?? user.id,
      userDisplayName: user.fullName,
      attestationType: "none",
      excludeCredentials: existing.map((r) => ({
        id: r.credentialId,
        transports: r.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        /** Windows Hello expects user verification (PIN / biometrics). */
        userVerification: preferPcHello ? "required" : "preferred",
      },
      ...(preferPcHello ? { preferredAuthenticatorType: "localDevice" as const } : {}),
    });

    const { id: challengeId } = await storage.insertWebauthnChallenge({
      challenge: typeof options.challenge === "string" ? options.challenge : String(options.challenge),
      userId: user.id,
      kind: "registration",
    });

    return res.json({ options, challengeId });
  });

  app.post("/api/me/passkeys/register-verify", requireAuth, async (req: Request, res: Response) => {
    const platform = await storage.getPlatformSettingsMap();
    if (resolveDisablePasskeys(platform)) {
      return res.status(503).json({ error: "Passkeys are disabled." });
    }
    const parsed = z
      .object({
        challengeId: z.string().uuid(),
        credential: z.unknown(),
        label: z.string().max(120).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const consumed = await storage.consumeWebauthnChallenge(parsed.data.challengeId, "registration");
    if (!consumed || consumed.userId !== req.session.userId) {
      return res.status(400).json({ error: "Passkey enrollment session expired — try again." });
    }

    const response = parsed.data.credential as RegistrationResponseJSON;
    const rpId = resolveWebAuthnRpId(req, platform);

    try {
      const verified = await verifyRegistrationResponse({
        response,
        expectedChallenge: consumed.challenge,
        expectedOrigin: resolveWebAuthnOrigins(req, platform),
        expectedRPID: rpId,
      });
      if (!verified.verified || !verified.registrationInfo) {
        return res.status(400).json({ error: "Passkey enrollment could not be verified." });
      }
      const cred = verified.registrationInfo.credential;
      const publicKeyB64 = isoBase64URL.fromBuffer(cred.publicKey);
      const transports = (cred.transports ?? []).filter((t) => typeof t === "string");
      await storage.insertPassKeyCredential({
        userId: req.session.userId!,
        credentialId: cred.id,
        publicKeyBase64Url: publicKeyB64,
        counter: cred.counter,
        transports,
        label: parsed.data.label?.trim() || null,
      });
    } catch (e) {
      const name =
        e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "";
      const hint =
        name === "InvalidStateError"
          ? "This passkey is already linked — try signing in with passkey instead of registering again."
          : e instanceof Error
            ? e.message
            : "Passkey enrollment could not be verified.";
      return res.status(400).json({ error: hint });
    }

    return res.json({ ok: true });
  });
}
