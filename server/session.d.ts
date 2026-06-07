import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    guestCartId?: string;
    /** Mirrors users.login_session_version when single-session mode is enabled. */
    loginSessionVersion?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      vendor?: { id: string };
    }
  }
}

export {};
