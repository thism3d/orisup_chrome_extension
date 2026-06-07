import type { Request, Response, NextFunction } from "express";
import { buildAuditAction, inferAuditEntity, insertAuditLogRow } from "../lib/adminAudit";

const SKIP_PATH_PREFIXES = ["/api/admin/permissions/me"];

/**
 * After successful mutating admin API calls, record an audit row with the acting user (session).
 * Skips GET/HEAD/OPTIONS, 4xx/5xx, and unauthenticated requests.
 */
export function adminAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    try {
      if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
      if (res.statusCode >= 400) return;
      const fullPath = (req.originalUrl ?? req.url).split("?")[0] ?? req.path;
      if (SKIP_PATH_PREFIXES.some((p) => fullPath.startsWith(p))) return;
      const session = (req as Request & { session?: { userId?: string } }).session;
      const actorUserId = session?.userId ?? null;
      if (!actorUserId) return;
      const { entityType, entityId } = inferAuditEntity(fullPath);
      const action = buildAuditAction(req.method, fullPath);
      const xf = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
      void insertAuditLogRow({
        actorUserId,
        action,
        entityType,
        entityId,
        summary: `${req.method} ${fullPath} → ${res.statusCode}`,
        metadata: {},
        ip: xf ?? req.socket.remoteAddress ?? null,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        requestPath: fullPath,
        requestMethod: req.method,
        responseStatus: res.statusCode,
      });
    } catch {
      /* non-fatal */
    }
  });
  next();
}
