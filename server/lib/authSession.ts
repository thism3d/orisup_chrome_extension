import type { Request } from "express";
import * as storage from "../storage";
import type { User } from "../../shared/schema";
import { resolveSingleLoginSessionEnabled } from "./authSettings";

/**
 * Ends guest cart linkage, sets authenticated user id, and optionally rotates login session binding.
 */
export async function finalizeAuthenticatedSession(req: Request, user: User, platform: Record<string, string>) {
  req.session.userId = user.id;
  if (req.session.guestCartId) {
    await storage.mergeGuestCartToUser(req.session.guestCartId, user.id);
    req.session.guestCartId = undefined;
  }

  if (resolveSingleLoginSessionEnabled(platform)) {
    const version = await storage.bumpUserLoginSessionVersion(user.id);
    req.session.loginSessionVersion = version;
  } else {
    delete req.session.loginSessionVersion;
  }
}
