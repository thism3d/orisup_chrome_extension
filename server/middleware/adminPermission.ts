import type { RequestHandler } from "express";
import * as storage from "../storage";
import type { AdminModuleKey } from "../../shared/adminPermissions";
import { isAllowed } from "../../shared/adminPermissions";
import { ensureLoginSessionStillValid } from "./auth";

type Action = "view" | "create" | "edit" | "delete";

/** `platform_admin` only — used for /api/admin/permissions/me so the shell can load before route checks. */
export const requirePlatformAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Login required" });
    return;
  }
  const still = await ensureLoginSessionStillValid(req, res);
  if (!still) {
    res.status(401).json({ error: "Session ended — you may have signed in from another browser. Sign in again." });
    return;
  }
  const u = await storage.getUserById(req.session.userId);
  if (!u || u.role !== "platform_admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
};

/**
 * Require session user to be `platform_admin` and have the given module/action in their matrix.
 * Users with `admin_role_id` null have full access.
 */
export function requireAdminPermission(module: AdminModuleKey, action: Action): RequestHandler {
  return async (req, res, next) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Login required" });
      return;
    }
    const still = await ensureLoginSessionStillValid(req, res);
    if (!still) {
      res.status(401).json({ error: "Session ended — you may have signed in from another browser. Sign in again." });
      return;
    }
    const u = await storage.getUserById(req.session.userId);
    if (!u || u.role !== "platform_admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const matrix = await storage.getEffectiveAdminPermissions(u.id);
    if (!isAllowed(matrix, module, action)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/** Shorthand: `P.view("orders")` */
export const P = {
  view: (m: AdminModuleKey) => requireAdminPermission(m, "view"),
  create: (m: AdminModuleKey) => requireAdminPermission(m, "create"),
  edit: (m: AdminModuleKey) => requireAdminPermission(m, "edit"),
  delete: (m: AdminModuleKey) => requireAdminPermission(m, "delete"),
};
