import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import * as storage from "../storage";
import { resolveSingleLoginSessionEnabled } from "../lib/authSettings";

/** Returns false if concurrent login bumped the account token — session is destroyed server-side. */
export async function ensureLoginSessionStillValid(req: Request, _res?: Response): Promise<boolean> {
  const uid = req.session.userId;
  if (!uid) return true;

  const platform = await storage.getPlatformSettingsMap();
  if (!resolveSingleLoginSessionEnabled(platform)) return true;

  const user = await storage.getUserById(uid);
  if (!user) {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    }).catch(() => undefined);
    return false;
  }

  const dbV = user.loginSessionVersion ?? 0;
  const sV = req.session.loginSessionVersion;

  if (sV === undefined) {
    if (dbV === 0) {
      req.session.loginSessionVersion = 0;
      return true;
    }
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    }).catch(() => undefined);
    return false;
  }

  if (sV !== dbV) {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    }).catch(() => undefined);
    return false;
  }

  return true;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required" });
  }
  void ensureLoginSessionStillValid(req, res).then((ok) => {
    if (!ok) {
      res.status(401).json({ error: "Session ended — you may have signed in from another browser. Sign in again." });
      return;
    }
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required" });
  }
  void ensureLoginSessionStillValid(req, res).then((ok) => {
    if (!ok) {
      res.status(401).json({ error: "Session ended — you may have signed in from another browser. Sign in again." });
      return;
    }
    storage
      .getUserById(req.session.userId!)
      .then((u) => {
        if (!u || u.role !== "platform_admin") {
          return res.status(403).json({ error: "Admin only" });
        }
        next();
      })
      .catch(next);
  });
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required" });
  }
  void ensureLoginSessionStillValid(req, res).then((ok) => {
    if (!ok) {
      res.status(401).json({ error: "Session ended — you may have signed in from another browser. Sign in again." });
      return;
    }
    storage
      .getVendorMembershipForUser(req.session.userId!)
      .then((m) => {
        if (!m) {
          return res.status(403).json({ error: "Vendor access only" });
        }
        req.vendor = { id: m.vendor.id };
        next();
      })
      .catch(next);
  });
}

export function ensureGuestCartId(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId && !req.session.guestCartId) {
    req.session.guestCartId = randomUUID();
  }
  next();
}

export async function resolveCart(req: Request) {
  if (req.session.userId) {
    return storage.getOrCreateCart({ userId: req.session.userId });
  }
  const gid = req.session.guestCartId;
  if (!gid) throw new Error("No guest cart");
  return storage.getOrCreateCart({ guestSessionId: gid });
}
