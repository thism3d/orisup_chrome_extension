import { eq, and, or, sql, desc, isNull, lt } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  adminAccessRoles,
  passKeyCredentials,
  webauthnChallenges,
  passwordResetTokens,
  type User,
} from "../../shared/schema";
import { normalizeBdPhone } from "../lib/normalizeBdPhone";

export async function getUserById(id: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return u;
}

/** Atomic bump for express-session binding (single active session feature). Returns new generation. */
export async function bumpUserLoginSessionVersion(userId: string): Promise<number> {
  const [row] = await db
    .update(users)
    .set({
      loginSessionVersion: sql`${users.loginSessionVersion} + 1`,
    })
    .where(eq(users.id, userId))
    .returning({ loginSessionVersion: users.loginSessionVersion });
  return Number(row?.loginSessionVersion ?? 0);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const norm = normalizeEmail(email);
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${norm}`)
    .limit(1);
  return u;
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const norm = normalizeBdPhone(phone);
  const keys: string[] = [];
  if (norm) keys.push(norm);
  /** Legacy rows may store 10-digit form without leading 0. */
  if (norm.length === 11 && norm.startsWith("0")) keys.push(norm.slice(1));
  const uniq = Array.from(new Set(keys.filter(Boolean)));
  if (uniq.length === 0) return undefined;
  if (uniq.length === 1) {
    const only = uniq[0];
    if (!only) return undefined;
    const [u] = await db.select().from(users).where(eq(users.phone, only)).limit(1);
    return u;
  }
  const a = uniq[0];
  const b = uniq[1];
  if (!a || !b) return undefined;
  const [u] = await db
    .select()
    .from(users)
    .where(or(eq(users.phone, a), eq(users.phone, b)))
    .limit(1);
  return u;
}

export async function createUser(data: {
  email?: string | null;
  phone?: string | null;
  passwordHash?: string | null;
  googleSub?: string | null;
  facebookSub?: string | null;
  avatarUrl?: string | null;
  fullName: string;
  role: string;
  adminRoleId?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}): Promise<User> {
  const phoneStored =
    data.phone != null && String(data.phone).trim()
      ? normalizeBdPhone(String(data.phone))
      : null;
  const [u] = await db
    .insert(users)
    .values({
      email: data.email ?? null,
      phone: phoneStored && phoneStored.length > 0 ? phoneStored : null,
      passwordHash: data.passwordHash ?? null,
      googleSub: data.googleSub ?? null,
      facebookSub: data.facebookSub ?? null,
      avatarUrl: data.avatarUrl?.trim() || null,
      fullName: data.fullName,
      role: data.role,
      adminRoleId: data.adminRoleId ?? null,
      createdByUserId: data.createdByUserId ?? null,
      updatedByUserId: data.updatedByUserId ?? data.createdByUserId ?? null,
    })
    .returning();
  return u;
}

/** Sets avatar from OAuth only when the user has not set one yet (no upload / prior URL). */
export async function maybeSetAvatarFromProvider(userId: string, pictureUrl: string | null | undefined): Promise<void> {
  const u = pictureUrl?.trim();
  if (!u) return;
  await db
    .update(users)
    .set({ avatarUrl: u })
    .where(and(eq(users.id, userId), or(isNull(users.avatarUrl), eq(users.avatarUrl, ""))));
}

/** Invite flow from dashboard — password required; validates access role FK when assigning an admin permission template. */
export async function insertUserByAdmin(
  payload: {
    fullName: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
    role: "customer" | "vendor_staff" | "platform_admin";
    adminRoleId: string | null;
  },
  actorUserId?: string | null,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const phone = payload.phone?.trim() ? normalizeBdPhone(payload.phone.trim()) : null;
  const email = payload.email?.trim().toLowerCase() || null;
  if (!email && !phone) return { ok: false, error: "Email or phone is required" };

  const emailNorm = email;
  if (emailNorm && (await getUserByEmail(emailNorm))) return { ok: false, error: "Email already registered" };
  if (phone && (await getUserByPhone(phone))) return { ok: false, error: "Phone already registered" };

  const adminRoleId = payload.role === "platform_admin" ? payload.adminRoleId : null;
  if (adminRoleId) {
    const [ar] = await db
      .select({ id: adminAccessRoles.id })
      .from(adminAccessRoles)
      .where(eq(adminAccessRoles.id, adminRoleId))
      .limit(1);
    if (!ar) return { ok: false, error: "Access role not found" };
  }

  try {
    const user = await createUser({
      email: emailNorm,
      phone,
      passwordHash: payload.passwordHash,
      fullName: payload.fullName.trim(),
      role: payload.role,
      adminRoleId,
      createdByUserId: actorUserId ?? null,
      updatedByUserId: actorUserId ?? null,
    });
    return { ok: true, user };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create user";
    return { ok: false, error: msg };
  }
}

export async function getUserByGoogleSub(sub: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.googleSub, sub)).limit(1);
  return u;
}

export async function setUserGoogleSub(userId: string, googleSub: string): Promise<void> {
  await db.update(users).set({ googleSub }).where(eq(users.id, userId));
}

export async function getUserByFacebookSub(sub: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.facebookSub, sub)).limit(1);
  return u;
}

export async function setUserFacebookSub(userId: string, facebookSub: string): Promise<void> {
  await db.update(users).set({ facebookSub }).where(eq(users.id, userId));
}

/** Passkeys stored for `/api/me/passkeys` and WebAuthn login. */
export async function listPassKeysForUser(userId: string) {
  return db
    .select({
      id: passKeyCredentials.id,
      credentialId: passKeyCredentials.credentialId,
      label: passKeyCredentials.label,
      createdAt: passKeyCredentials.createdAt,
    })
    .from(passKeyCredentials)
    .where(eq(passKeyCredentials.userId, userId))
    .orderBy(desc(passKeyCredentials.createdAt));
}

export async function getPassKeyByCredentialId(credentialIdBase64Url: string) {
  const [row] = await db
    .select()
    .from(passKeyCredentials)
    .where(eq(passKeyCredentials.credentialId, credentialIdBase64Url))
    .limit(1);
  return row;
}

export async function insertPassKeyCredential(opts: {
  userId: string;
  credentialId: string;
  publicKeyBase64Url: string;
  counter: number;
  transports: string[];
  label?: string | null;
}) {
  const [row] = await db
    .insert(passKeyCredentials)
    .values({
      userId: opts.userId,
      credentialId: opts.credentialId,
      publicKey: opts.publicKeyBase64Url,
      counter: opts.counter,
      transports: opts.transports,
      label: opts.label ?? null,
    })
    .returning({ id: passKeyCredentials.id });
  return row;
}

export async function updatePassKeyCounter(credentialPk: string, counter: number) {
  await db.update(passKeyCredentials).set({ counter }).where(eq(passKeyCredentials.id, credentialPk));
}

/** Credential ids + transports for WebAuthn `allowCredentials` / exclude lists. */
export async function listPassKeyRowsForWebAuthn(userId: string) {
  return db
    .select({
      credentialId: passKeyCredentials.credentialId,
      transports: passKeyCredentials.transports,
    })
    .from(passKeyCredentials)
    .where(eq(passKeyCredentials.userId, userId));
}

export async function deletePassKeyForUser(credentialRowId: string, userId: string): Promise<boolean> {
  const r = await db
    .delete(passKeyCredentials)
    .where(and(eq(passKeyCredentials.id, credentialRowId), eq(passKeyCredentials.userId, userId)))
    .returning({ id: passKeyCredentials.id });
  return r.length > 0;
}

/** Remove expired rows (best-effort; safe to call on each challenge flow). */
export async function pruneExpiredWebauthnChallenges() {
  await db.delete(webauthnChallenges).where(lt(webauthnChallenges.expiresAt, new Date()));
}

export async function insertWebauthnChallenge(opts: {
  challenge: string;
  userId: string | null;
  kind: "registration" | "authentication";
}): Promise<{ id: string }> {
  await pruneExpiredWebauthnChallenges();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const [row] = await db
    .insert(webauthnChallenges)
    .values({
      challenge: opts.challenge,
      userId: opts.userId,
      kind: opts.kind,
      expiresAt,
    })
    .returning({ id: webauthnChallenges.id });
  return row!;
}

/** Delete and return row if matches id + kind + not expired (single use). */
export async function consumeWebauthnChallenge(id: string, kind: "registration" | "authentication") {
  const [row] = await db
    .delete(webauthnChallenges)
    .where(and(eq(webauthnChallenges.id, id), eq(webauthnChallenges.kind, kind)))
    .returning();
  if (!row) return undefined;
  if (row.expiresAt < new Date()) return undefined;
  return { challenge: row.challenge, userId: row.userId ?? null };
}

/** Password reset token management */
export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
    used: false,
  });
}

export async function getPasswordResetToken(token: string) {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
    .limit(1);
  return row;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
}

export async function expireOldPasswordResetTokens(): Promise<void> {
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
}

