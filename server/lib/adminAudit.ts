import { db } from "../db";
import { auditLogs, users } from "../../shared/schema";
import { SYSTEM_STAFF_REF, type SystemStaffRef } from "../../shared/systemStaff";
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map `/api/admin/...` path to coarse entity type + id when present (UUID or content slug). */
export function inferAuditEntity(pathname: string): { entityType: string; entityId: string | null } {
  const path = pathname.replace(/\?.*$/, "");
  const segments = path.replace(/^\/api\/admin\/?/i, "").split("/").filter(Boolean);
  const resource = segments[0] ?? "unknown";
  const map: Record<string, string> = {
    products: "product",
    orders: "order",
    users: "user",
    vendors: "vendor",
    categories: "category",
    banners: "banner",
    couriers: "courier",
    settings: "settings",
    "brand-trust-pages": "content_page",
    "access-roles": "admin_role",
    "newsletter-subscribers": "newsletter_subscriber",
    reviews: "review",
    "payment-gateway": "payment_gateway",
    "product-images": "product_media",
    permissions: "permission",
    stats: "dashboard",
    "dashboard": "dashboard",
  };
  const entityType = map[resource] ?? resource;
  let entityId: string | null = null;
  if (segments[1]) {
    if (UUID_RE.test(segments[1])) entityId = segments[1];
    else if (entityType === "content_page") entityId = segments[1];
  }
  return { entityType, entityId };
}

export function buildAuditAction(method: string, pathname: string): string {
  return `${method} ${pathname.replace(/\?.*$/, "")}`;
}

export async function insertAuditLogRow(entry: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  metadata?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  requestPath: string;
  requestMethod: string;
  responseStatus: number;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
    metadata: entry.metadata ?? {},
    ip: entry.ip,
    userAgent: entry.userAgent,
    requestPath: entry.requestPath,
    requestMethod: entry.requestMethod,
    responseStatus: entry.responseStatus,
  });
}

export type AuditLogListRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  requestPath: string;
  requestMethod: string;
  responseStatus: number;
  createdAt: Date;
  actor:
    | {
        id: string;
        fullName: string;
        email: string | null;
        avatarUrl: string | null;
      }
    | SystemStaffRef;
};

export async function listAuditLogsAdminPaged(opts: {
  q?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  createdFrom?: Date;
  createdToExclusive?: Date;
  limit: number;
  offset: number;
}): Promise<{ items: AuditLogListRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = Math.max(opts.offset, 0);
  const filters: SQL[] = [];
  if (opts.q?.trim()) {
    const t = `%${opts.q.trim()}%`;
    filters.push(
      or(
        ilike(auditLogs.action, t),
        ilike(auditLogs.entityType, t),
        ilike(auditLogs.summary, t),
        ilike(auditLogs.requestPath, t),
        sql`${auditLogs.metadata}::text ilike ${t}`
      )!
    );
  }
  if (opts.action?.trim()) {
    filters.push(ilike(auditLogs.action, `%${opts.action.trim()}%`));
  }
  if (opts.entityType?.trim()) {
    filters.push(eq(auditLogs.entityType, opts.entityType.trim()));
  }
  if (opts.entityId?.trim()) {
    filters.push(eq(auditLogs.entityId, opts.entityId.trim()));
  }
  if (opts.actorUserId?.trim()) {
    filters.push(eq(auditLogs.actorUserId, opts.actorUserId.trim()));
  }
  if (opts.createdFrom) {
    filters.push(gte(auditLogs.createdAt, opts.createdFrom));
  }
  if (opts.createdToExclusive) {
    filters.push(lt(auditLogs.createdAt, opts.createdToExclusive));
  }
  const whereClause = filters.length ? and(...filters) : undefined;

  const countBase = db.select({ n: sql<number>`count(*)::int` }).from(auditLogs);
  const [countRow] = whereClause ? await countBase.where(whereClause) : await countBase;
  const total = Number(countRow?.n ?? 0);

  const actorIdCol = users.id;
  const actorName = users.fullName;
  const actorEmail = users.email;
  const actorAvatar = users.avatarUrl;

  const qb = db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
      requestPath: auditLogs.requestPath,
      requestMethod: auditLogs.requestMethod,
      responseStatus: auditLogs.responseStatus,
      createdAt: auditLogs.createdAt,
      actorId: actorIdCol,
      actorFullName: actorName,
      actorEmail,
      actorAvatarUrl: actorAvatar,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id));

  const chained = whereClause ? qb.where(whereClause) : qb;
  const rows = await chained.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);

  const items: AuditLogListRow[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    requestPath: r.requestPath,
    requestMethod: r.requestMethod,
    responseStatus: r.responseStatus,
    createdAt: r.createdAt,
    actor:
      r.actorId != null
        ? {
            id: r.actorId,
            fullName: r.actorFullName ?? "?",
            email: r.actorEmail ?? null,
            avatarUrl: r.actorAvatarUrl ?? null,
          }
        : SYSTEM_STAFF_REF,
  }));

  return { items, total };
}
