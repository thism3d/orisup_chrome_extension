import type { Express, Request, Response } from "express";
import { specificationsJsonField } from "../lib/specificationsJsonZod";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as storage from "../storage";
import { P, requirePlatformAdmin } from "../middleware/adminPermission";
import {
  createEmptyMatrix,
  isAllowed,
  parsePermissionMatrix,
  type AdminModuleKey,
} from "../../shared/adminPermissions";
import { importProductFromUrl } from "../lib/product-import";
import { enhanceImportedProductWithAi, toCategoryCatalogForAi } from "../lib/product-enhance";
import { enhanceProductImageFile } from "../lib/product-image-enhance";
import { compressImageBufferToWebp, compressProductImageRefToWebpUpload, writeWebpBufferToUploads } from "../lib/product-image-compress";
import { upload, uploadsDir } from "../config/upload";
import { getAdapter } from "../courier/index.ts";
import { getAdminDashboardAnalytics } from "../lib/adminAnalytics";
import { parseDecimalString } from "../../shared/parseDecimalString";
import { shippingAddressSchema } from "../../shared/shippingAddressSchema";
import { buildShippingAddressRecord, computePathaoShippingFeeForCheckout, pathaoCourierConfig } from "../lib/pathaoCheckoutQuote";
import { pathaoQuoteDeliveryForCart } from "../courier/pathao";
import { adminAuditMiddleware } from "../middleware/adminAuditMiddleware";
import { listAuditLogsAdminPaged } from "../lib/adminAudit";
import { siteBaseFromEnv } from "../lib/publicOrigin";

const userRoleSchema = z.enum(["customer", "vendor_staff", "platform_admin"]);

const partnerTypeSchema = z.enum(["manual", "pathao", "steadfast"]);

function buildWebhookUrl(req: Request, slug: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? req.protocol;
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0] ?? req.headers.host ?? "";
  return `${proto}://${host}/api/partners/couriers/${encodeURIComponent(slug)}/webhook`;
}

function readPagination(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const perPage = Math.min(100, Math.max(5, parseInt(String(req.query.perPage ?? "20"), 10) || 20));
  return { page, perPage, offset: (page - 1) * perPage, limit: perPage };
}

function sendPaged<T>(res: Response, items: T[], total: number, page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  res.json({ items, total, page, perPage, totalPages });
}

const SETTINGS_ALLOWED = [
  "site_display_name",
  "site_title",
  "site_description",
  "site_keywords",
  "logo_url",
  "favicon_url",
  "og_image_url",
  "support_email",
  "support_phone",
  "contact_address",
  "contact_address_sub",
  "google_maps_open_url",
  "google_maps_embed_url",
  "social_facebook_url",
  "social_instagram_url",
  "social_x_url",
  "social_tiktok_url",
  "social_pinterest_url",
  "social_youtube_url",
  "social_whatsapp_url",
  "social_threads_url",
  "storefront_notice",
  "storefront_search_rotating_keywords",
  "storefront_search_popular_keywords",
  "storefront_theme",
  "storefront_theme_overrides",
  "storefront_theme_primary",
  "storefront_theme_secondary",
  "storefront_ui_template",
  "orlenbd_direct_provider_checkout",
  "orlenpay_base_url",
  "orlenpay_public_key",
  "orlenpay_secret_key",
  "orlenpay_callback_secret",
  "orlenbd_public_base_url",
  "internal_notes",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "smtp_subject",
  "smtp_text",
  "smtp_html",
  "auth_google_client_id",
  "auth_disable_google",
  "auth_single_login_session",
  "auth_facebook_app_id",
  "auth_facebook_app_secret",
  "auth_disable_facebook",
  "auth_webauthn_origins",
  "auth_webauthn_rp_id",
  "auth_webauthn_rp_name",
  "auth_disable_passkeys",
  "bulksmsbd_api_key",
  "bulksmsbd_sender_id",
  "bulksmsbd_otp_format",
] as const;

const STOREFRONT_THEME_IDS = ["theme1", "theme2", "theme3", "theme4", "theme5", "theme6"] as const;
const STOREFRONT_UI_TEMPLATE_IDS = ["orlenbd", "norexbd", "orynbd", "masumtraders", "uttorasteel", "adorashop"] as const;
const importProductSchema = z.object({
  sourceUrl: z.string().url().max(2000),
  sourceHost: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  price: z.string().max(60),
  compareAtPrice: z.string().max(60).nullable(),
  description: z.string().max(20000),
  images: z.array(z.string().min(1).max(4000)).max(20),
});

const importEnhanceSchema = z.object({
  imported: importProductSchema,
  userInstructions: z.string().max(8000).optional(),
});

const productImageEnhanceSchema = z.object({
  imageUrl: z.string().min(1).max(4000),
  userInstructions: z.string().max(8000).optional(),
});

function normalizeStorefrontUiTemplateValue(raw: string): string {
  const t = z.enum(STOREFRONT_UI_TEMPLATE_IDS).safeParse(raw);
  return t.success ? t.data : "orlenbd";
}

function parseIsoDateParam(raw: unknown): Date | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const dashboardRangePreset = z.enum([
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
]);

async function userPerm(
  userId: string,
  mod: AdminModuleKey,
  act: "view" | "create" | "edit" | "delete"
) {
  const m = await storage.getEffectiveAdminPermissions(userId);
  return isAllowed(m, mod, act);
}

export function registerAdminRoutes(app: Express) {
  app.use("/api/admin", adminAuditMiddleware);

  app.get("/api/admin/audit-logs", P.view("audit_logs"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const actorUserId = typeof req.query.actorUserId === "string" ? req.query.actorUserId : undefined;
    const createdFrom = parseIsoDateParam(req.query.createdFrom);
    const createdToExclusive = parseIsoDateParam(req.query.createdToExclusive);
    const { items, total } = await listAuditLogsAdminPaged({
      q,
      action,
      entityType,
      entityId,
      actorUserId,
      createdFrom,
      createdToExclusive,
      limit,
      offset,
    });
    sendPaged(res, items, total, page, perPage);
  });

  app.get("/api/admin/permissions/me", requirePlatformAdmin, async (req, res) => {
    const uid = req.session.userId!;
    const u = await storage.getUserById(uid);
    const permissions = await storage.getEffectiveAdminPermissions(uid);
    res.json({
      adminRoleId: u?.adminRoleId ?? null,
      permissions,
    });
  });

  app.get("/api/admin/access-roles", requirePlatformAdmin, async (req, res) => {
    const uid = req.session.userId!;
    const forRoles = await userPerm(uid, "roles", "view");
    const forUsers = await userPerm(uid, "users", "edit");
    if (!forRoles && !forUsers) return res.status(403).json({ error: "Forbidden" });
    res.json({ items: await storage.listAdminAccessRoles() });
  });

  app.post("/api/admin/access-roles", P.create("roles"), async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(120),
      slug: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).optional(),
      permissions: z.record(z.unknown()).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const matrix = parsePermissionMatrix(parsed.data.permissions ?? createEmptyMatrix());
    try {
      const row = await storage.createAdminAccessRole(
        {
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description,
          permissions: matrix,
        },
        req.session.userId!,
      );
      res.json(row);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Create failed" });
    }
  });

  app.patch("/api/admin/access-roles/:id", P.edit("roles"), async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(120).optional(),
      slug: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).optional(),
      permissions: z.record(z.unknown()).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const patch: Parameters<typeof storage.updateAdminAccessRole>[1] = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;
    if (parsed.data.permissions !== undefined) {
      patch.permissions = parsePermissionMatrix(parsed.data.permissions ?? createEmptyMatrix());
    }
    const row = await storage.updateAdminAccessRole(req.params.id, patch, req.session.userId!);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });

  app.delete("/api/admin/access-roles/:id", P.delete("roles"), async (req, res) => {
    const r = await storage.deleteAdminAccessRole(req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.get("/api/admin/stats", P.view("dashboard"), async (_req, res) => {
    res.json(await storage.getAdminDashboardStats());
  });

  app.get("/api/admin/bulksmsbd/balance", requirePlatformAdmin, async (req, res) => {
    try {
      const platform = await storage.getPlatformSettingsMap();
      const apiKey = platform.bulksmsbd_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: "API Key not configured" });
      }
      const response = await fetch(`http://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(apiKey)}`);
      const data = await response.json();
      res.json({ balance: data.balance !== undefined ? String(data.balance) : "Error fetching" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to fetch balance" });
    }
  });

  app.get("/api/admin/dashboard/analytics", P.view("dashboard"), async (req, res) => {
    const raw = typeof req.query.range === "string" ? req.query.range.trim() : "this_month";
    const parsed = dashboardRangePreset.safeParse(raw);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid range" });
    }
    try {
      const data = await getAdminDashboardAnalytics(parsed.data);
      res.json(data);
    } catch (e) {
      console.error("[admin-dashboard-analytics]", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Analytics failed" });
    }
  });

  app.get("/api/admin/vendors", P.view("vendors"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const status =
      req.query.status === "pending" || req.query.status === "approved" || req.query.status === "suspended"
        ? req.query.status
        : undefined;
    const { items, total } = await storage.listVendorsAdminPaged({ q, status, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/vendors", P.create("vendors"), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
      status: z.enum(["pending", "approved", "suspended"]).optional(),
      commissionRate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).optional(),
      logoUrl: z.string().nullable().optional(),
      contactPhone: z.string().nullable().optional(),
      contactEmail: z.string().email().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const v = await storage.createVendorAdmin(
        {
          name: parsed.data.name,
          slug: parsed.data.slug,
          status: parsed.data.status,
          commissionRate: parsed.data.commissionRate,
          logoUrl: parsed.data.logoUrl,
          contactPhone: parsed.data.contactPhone,
          contactEmail: parsed.data.contactEmail,
        },
        req.session.userId!,
      );
      res.json(v);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Create failed" });
    }
  });

  app.get("/api/admin/vendors/:id", P.view("vendors"), async (req, res) => {
    const v = await storage.getVendorById(req.params.id);
    if (!v) return res.status(404).json({ error: "Not found" });
    res.json(v);
  });

  app.patch("/api/admin/vendors/:id", P.edit("vendors"), async (req, res) => {
    const raw = req.body && typeof req.body === "object" ? { ...req.body } : {};
    if (raw.contactEmail === "") raw.contactEmail = null;
    const schema = z.object({
      status: z.enum(["pending", "approved", "suspended"]).optional(),
      commissionRate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).optional(),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
      logoUrl: z.string().nullable().optional(),
      contactPhone: z.string().nullable().optional(),
      contactEmail: z.string().email().nullable().optional(),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: "No changes" });
    const result = await storage.updateVendorAdmin(req.params.id, parsed.data, req.session.userId!);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ ok: true });
  });

  app.delete("/api/admin/vendors/:id", P.delete("vendors"), async (req, res) => {
    const r = await storage.deleteVendorAdmin(req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.post("/api/admin/vendors/bulk", requirePlatformAdmin, async (req, res) => {
    const schema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("delete"), ids: z.array(z.string().uuid()).min(1) }),
      z.object({
        action: z.literal("set_status"),
        ids: z.array(z.string().uuid()).min(1),
        status: z.enum(["pending", "approved", "suspended"]),
      }),
    ]);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const uid = req.session.userId!;
    if (parsed.data.action === "delete") {
      if (!(await userPerm(uid, "vendors", "delete")))
        return res.status(403).json({ error: "Forbidden" });
      const out = await storage.bulkDeleteVendorsByAdmin(parsed.data.ids);
      return res.json(out);
    }
    if (!(await userPerm(uid, "vendors", "edit"))) return res.status(403).json({ error: "Forbidden" });
    const n = await storage.bulkSetVendorStatus(parsed.data.ids, parsed.data.status, uid);
    res.json({ updated: n });
  });

  app.get("/api/admin/couriers", P.view("couriers"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const active =
      req.query.active === "true" || req.query.active === "false" ? (req.query.active as "true" | "false") : undefined;
    const { items, total } = await storage.listCouriersAdminPaged({ q, active, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/couriers", P.create("couriers"), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      website: z.string().max(2000).nullable().optional(),
      trackingUrlTemplate: z.string().max(2000).nullable().optional(),
      phone: z.string().max(80).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      active: z.boolean().optional(),
      partnerType: partnerTypeSchema.optional(),
      apiBaseUrl: z.string().max(500).nullable().optional(),
      apiCredentials: z.record(z.unknown()).optional(),
      webhookSecret: z.string().max(500).nullable().optional(),
      webhookIntegrationSecret: z.string().max(500).nullable().optional(),
      defaultEtaHours: z.number().int().min(0).max(720).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const c = await storage.createCourierAdmin(parsed.data, req.session.userId!);
      res.json(c);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      res.status(400).json({ error: msg });
    }
  });

  app.get("/api/admin/couriers/:id", P.view("couriers"), async (req, res) => {
    const c = await storage.getCourierById(req.params.id);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json({ ...c, webhookUrl: buildWebhookUrl(req, c.slug) });
  });

  app.patch("/api/admin/couriers/:id", P.edit("couriers"), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      website: z.string().max(2000).nullable().optional(),
      trackingUrlTemplate: z.string().max(2000).nullable().optional(),
      phone: z.string().max(80).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      active: z.boolean().optional(),
      partnerType: partnerTypeSchema.optional(),
      apiBaseUrl: z.string().max(500).nullable().optional(),
      apiCredentials: z.record(z.unknown()).optional(),
      webhookSecret: z.string().max(500).nullable().optional(),
      webhookIntegrationSecret: z.string().max(500).nullable().optional(),
      defaultEtaHours: z.number().int().min(0).max(720).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: "No changes" });
    const r = await storage.updateCourierAdmin(req.params.id, parsed.data, req.session.userId!);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.delete("/api/admin/couriers/:id", P.delete("couriers"), async (req, res) => {
    const r = await storage.deleteCourierAdmin(req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.post("/api/admin/couriers/:id/test-connection", P.edit("couriers"), async (req, res) => {
    const courier = await storage.getCourierById(req.params.id);
    if (!courier) return res.status(404).json({ error: "Not found" });
    const adapter = getAdapter(courier.partnerType);
    if (!adapter.testConnection) return res.json({ ok: true, message: "No connection check for this partner.", latencyMs: 0 });
    const start = Date.now();
    try {
      const r = await adapter.testConnection(courier);
      const latencyMs = Date.now() - start;
      if (!r.ok) return res.status(400).json({ ok: false, error: r.error, latencyMs });
      res.json({ ok: true, message: r.message, latencyMs });
    } catch (e) {
      const latencyMs = Date.now() - start;
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "Unknown error", latencyMs });
    }
  });

  app.get("/api/admin/categories", P.view("categories"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const { items, total } = await storage.listCategoriesAdminPaged({ q, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.get("/api/admin/categories/tree", P.view("categories"), async (_req, res) => {
    res.json(await storage.listCategoryTree());
  });

  app.post("/api/admin/categories", P.create("categories"), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      parentId: z.string().uuid().nullable().optional(),
      imageUrl: z.string().min(1).max(4000).nullable().optional(),
      sortOrder: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const result = await storage.createCategory(parsed.data, req.session.userId!);
    if (!result.ok) {
      const status = result.error === "max_depth" ? 422 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result.category);
  });

  app.patch("/api/admin/categories/:id", P.edit("categories"), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      parentId: z.string().uuid().nullable().optional(),
      imageUrl: z.string().min(1).max(4000).nullable().optional(),
      sortOrder: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const result = await storage.updateCategoryAdmin(req.params.id, parsed.data, req.session.userId!);
    if (!result.ok) {
      const status = result.error === "max_depth" || result.error === "cycle" ? 422 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json({ ok: true });
  });

  app.delete("/api/admin/categories/:id", P.delete("categories"), async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/admin/categories/:id/audit-log", P.view("categories"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const { items, total } = await listAuditLogsAdminPaged({
      entityType: "category",
      entityId: req.params.id,
      limit,
      offset,
    });
    sendPaged(res, items, total, page, perPage);
  });

  app.get("/api/admin/banners", P.view("banners"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const placement = typeof req.query.placement === "string" ? req.query.placement : undefined;
    const active =
      req.query.active === "true" || req.query.active === "false" ? req.query.active : undefined;
    const { items, total } = await storage.listBannersAdminPaged({
      q,
      placement,
      active,
      limit,
      offset,
    });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/banners", P.create("banners"), async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      imageUrl: z.string().min(1),
      linkUrl: z.string().optional(),
      placement: z.string().optional(),
      sortOrder: z.number().optional(),
      showTitle: z.boolean().optional(),
      showSubtitle: z.boolean().optional(),
      showButton: z.boolean().optional(),
      showShadow: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await storage.createBanner({ ...parsed.data, actorUserId: req.session.userId! }));
  });

  app.patch("/api/admin/banners/:id", P.edit("banners"), async (req, res) => {
    const schema = z.object({
      title: z.string().min(1).optional(),
      subtitle: z.string().nullable().optional(),
      ctaLabel: z.string().nullable().optional(),
      imageUrl: z.string().min(1).optional(),
      linkUrl: z.string().nullable().optional(),
      placement: z.string().optional(),
      sortOrder: z.number().optional(),
      showTitle: z.boolean().optional(),
      showSubtitle: z.boolean().optional(),
      showButton: z.boolean().optional(),
      showShadow: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    await storage.updateBannerAdmin(req.params.id, parsed.data, req.session.userId!);
    res.json({ ok: true });
  });

  app.delete("/api/admin/banners/:id", P.delete("banners"), async (req, res) => {
    await storage.deleteBanner(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/admin/banners/bulk", requirePlatformAdmin, async (req, res) => {
    if (!(await userPerm(req.session.userId!, "banners", "delete")))
      return res.status(403).json({ error: "Forbidden" });
    const schema = z.object({ ids: z.array(z.string().uuid()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const n = await storage.deleteBannersByIds(parsed.data.ids);
    res.json({ deleted: n });
  });

  app.get("/api/admin/orders", P.view("orders"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : undefined;
    const createdFrom = parseIsoDateParam(req.query.createdFrom ?? req.query.from);
    const createdToExclusive =
      parseIsoDateParam(req.query.createdToExclusive ?? req.query.toExclusive) ??
      parseIsoDateParam(req.query.to);
    const { items, total } = await storage.listOrdersAdminPaged({
      q,
      status,
      createdFrom,
      createdToExclusive,
      limit,
      offset,
    });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/orders", P.create("orders"), async (req, res) => {
    const lineSchema = z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1),
      variantId: z.string().uuid().optional().nullable(),
    });
    const schema = z.object({
      userId: z.string().uuid().optional().nullable(),
      customerName: z.string().min(1),
      customerPhone: z.string().min(10),
      paymentMethod: z.enum(["cod", "manual"]),
      shippingAddress: shippingAddressSchema,
      lines: z.array(lineSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const order = await storage.adminCreateOrderFromPayload({
        userId: parsed.data.userId ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        paymentMethod: parsed.data.paymentMethod,
        shippingAddress: parsed.data.shippingAddress,
        lines: parsed.data.lines,
        actorUserId: req.session.userId!,
      });
      res.json({ orderId: order.id, orderNumber: order.orderNumber });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      res.status(400).json({ error: msg });
    }
  });

  app.get("/api/admin/orders/:id/detail", P.view("orders"), async (req, res) => {
    const full = await storage.getAdminOrderById(req.params.id);
    if (!full) return res.status(404).json({ error: "Not found" });
    res.json(full);
  });

  app.post("/api/admin/orders/:id/pathao-quote", P.view("orders"), async (req, res) => {
    const schema = z.object({
      pathaoCityId: z.coerce.number().int().positive(),
      pathaoZoneId: z.coerce.number().int().positive(),
      pathaoAreaId: z.coerce.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const detail = await storage.getAdminOrderById(req.params.id);
    if (!detail) return res.status(404).json({ error: "Not found" });
    const pathaoCourier = await storage.getDefaultPathaoCourier();
    if (!pathaoCourier) return res.status(503).json({ error: "Pathao is not configured." });
    const qtys = detail.items.map((it) => it.quantity);
    const r = await pathaoQuoteDeliveryForCart(pathaoCourierConfig(pathaoCourier), {
      recipientCity: parsed.data.pathaoCityId,
      recipientZone: parsed.data.pathaoZoneId,
      lineQuantities: qtys,
    });
    if (!r.ok) return res.status(502).json({ error: r.error });
    res.json({ shippingFee: r.fee.toFixed(2), currency: "BDT" });
  });

  app.patch("/api/admin/orders/:id", P.edit("orders"), async (req, res) => {
    const schema = z.object({
      courierId: z.string().uuid().nullable().optional(),
      trackingNumber: z.string().max(500).nullable().optional(),
      warehouseReceivedAt: z.union([z.string().min(1), z.null()]).optional(),
      shippingAddress: shippingAddressSchema.optional(),
      shippingFee: z.union([z.string(), z.number()]).optional(),
      customerName: z.string().min(1).optional(),
      customerPhone: z.string().min(10).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const uid = req.session.userId!;
    const hasFulfillment =
      parsed.data.courierId !== undefined ||
      parsed.data.trackingNumber !== undefined ||
      parsed.data.warehouseReceivedAt !== undefined;
    const hasShipping = parsed.data.shippingAddress !== undefined || parsed.data.shippingFee !== undefined;
    const hasCustomer = parsed.data.customerName !== undefined || parsed.data.customerPhone !== undefined;
    if (!hasFulfillment && !hasShipping && !hasCustomer) {
      return res.status(400).json({
        error:
          "Provide courierId, trackingNumber, warehouseReceivedAt, shippingAddress, shippingFee, customerName, and/or customerPhone",
      });
    }
    if (hasCustomer) {
      const custR = await storage.updateAdminOrderCustomer(req.params.id, {
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
      }, uid);
      if (!custR.ok) return res.status(404).json({ error: "Not found" });
    }
    if (parsed.data.shippingAddress !== undefined) {
      const detail = await storage.getAdminOrderById(req.params.id);
      if (!detail) return res.status(404).json({ error: "Not found" });
      const subtotal = parseDecimalString(String(detail.order.subtotal));
      const waived = await storage.orderLinesQualifyFreeDelivery(
        detail.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        subtotal,
      );
      const pathaoCourier = await storage.getDefaultPathaoCourier();
      const shipQuote = waived
        ? ({ ok: true as const, fee: 0 })
        : await computePathaoShippingFeeForCheckout(
            pathaoCourier,
            detail.items.map((it) => it.quantity),
            parsed.data.shippingAddress,
          );
      if (!shipQuote.ok) return res.status(400).json({ error: shipQuote.error });
      const feeStr =
        parsed.data.shippingFee !== undefined ? String(parsed.data.shippingFee) : shipQuote.fee.toFixed(2);
      const shipR = await storage.updateAdminOrderShipping(req.params.id, {
        shippingAddress: buildShippingAddressRecord(parsed.data.shippingAddress),
        shippingFee: feeStr,
      }, uid);
      if (!shipR.ok) return res.status(404).json({ error: "Not found" });
    } else if (parsed.data.shippingFee !== undefined) {
      const shipR = await storage.updateAdminOrderShipping(req.params.id, {
        shippingFee: parsed.data.shippingFee,
      }, uid);
      if (!shipR.ok) return res.status(404).json({ error: "Not found" });
    }
    if (hasFulfillment) {
      let wh: Date | null | undefined;
      if (parsed.data.warehouseReceivedAt !== undefined) {
        if (parsed.data.warehouseReceivedAt === null) {
          wh = null;
        } else {
          const d = new Date(parsed.data.warehouseReceivedAt);
          if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid warehouseReceivedAt" });
          wh = d;
        }
      }
      const r = await storage.updateAdminOrderFulfillment(req.params.id, {
        courierId: parsed.data.courierId,
        trackingNumber: parsed.data.trackingNumber,
        warehouseReceivedAt: wh,
      }, uid);
      if (!r.ok) {
        if (r.error === "not_found") return res.status(404).json({ error: "Not found" });
        if (r.error === "invalid_courier") return res.status(400).json({ error: "Invalid courier" });
        return res.status(400).json({ error: r.error });
      }
    }
    res.json({ ok: true });
  });

  app.patch("/api/admin/orders/:id/status", P.edit("orders"), async (req, res) => {
    const schema = z
      .object({
        status: z.string().min(1),
        note: z.string().optional(),
      })
      .superRefine((val, ctx) => {
        if (val.status === "cancelled" && (!val.note || !val.note.trim())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cancel reason (note) is required", path: ["note"] });
        }
      });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    // Admins can always cancel (force bypasses the transition map). Other transitions are validated.
    const force = parsed.data.status === "cancelled";
    const r = await storage.updateOrderStatus(
      req.params.id,
      parsed.data.status,
      parsed.data.note?.trim(),
      { force, actorUserId: req.session.userId! },
    );
    if (!r.ok) {
      if (r.error === "not_found") return res.status(404).json({ error: "Order not found" });
      if (r.error === "invalid_transition")
        return res.status(409).json({ error: "Invalid status transition for this order's current status." });
      if (r.error === "terminal")
        return res.status(409).json({ error: "Order is already in a terminal status." });
      return res.status(400).json({ error: r.error });
    }
    res.json({ ok: true });
  });

  app.delete("/api/admin/orders/:id", P.delete("orders"), async (req, res) => {
    await storage.deleteOrderAdmin(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/admin/orders/:id/dispatch", P.edit("orders"), async (req, res) => {
    const schema = z.object({ courierId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const courier = await storage.getCourierById(parsed.data.courierId);
    if (!courier) return res.status(404).json({ error: "Courier not found" });
    const webhookUrl = buildWebhookUrl(req, courier.slug);
    const r = await storage.dispatchOrderToCourier(req.params.id, parsed.data.courierId, {
      webhookUrl,
      actorUserId: req.session.userId!,
    });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });

  app.post("/api/admin/orders/:id/cancel-shipment", P.edit("orders"), async (req, res) => {
    const schema = z.object({ note: z.string().min(1, "Cancel reason is required") });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const r = await storage.cancelOrderShipment(req.params.id, parsed.data.note.trim(), req.session.userId!);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.get("/api/admin/orders/:id/events", P.view("orders"), async (req, res) => {
    const order = await storage.getAdminOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    const { events, history } = await storage.listCourierTimeline(req.params.id);
    res.json({ events, history });
  });

  app.post("/api/admin/orders/bulk", requirePlatformAdmin, async (req, res) => {
    const schema = z.discriminatedUnion("action", [
      z.object({
        action: z.literal("set_status"),
        ids: z.array(z.string().uuid()).min(1),
        status: z.string().min(1),
        note: z.string().optional(),
      }),
      z.object({ action: z.literal("delete"), ids: z.array(z.string().uuid()).min(1) }),
    ]);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const uid = req.session.userId!;
    if (parsed.data.action === "set_status") {
      if (parsed.data.status === "cancelled" && !parsed.data.note?.trim()) {
        return res.status(400).json({ error: "Cancel reason (note) is required for bulk cancel" });
      }
      if (!(await userPerm(uid, "orders", "edit"))) return res.status(403).json({ error: "Forbidden" });
      const n = await storage.bulkUpdateOrderStatus(
        parsed.data.ids,
        parsed.data.status,
        parsed.data.note?.trim(),
        uid,
      );
      return res.json({ updated: n });
    }
    if (!(await userPerm(uid, "orders", "delete"))) return res.status(403).json({ error: "Forbidden" });
    for (const id of parsed.data.ids) {
      await storage.deleteOrderAdmin(id);
    }
    res.json({ deleted: parsed.data.ids.length });
  });

  app.get("/api/admin/users", P.view("users"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const role =
      req.query.role === "customer" || req.query.role === "vendor_staff" || req.query.role === "platform_admin"
        ? req.query.role
        : undefined;
    const { items, total } = await storage.listUsersAdminPaged({ q, role, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/users", P.create("users"), async (req, res) => {
    const schema = z
      .object({
        fullName: z.string().min(1).max(240),
        email: z.string().email().trim().toLowerCase().optional(),
        phone: z.string().trim().min(8).max(32).optional(),
        password: z.string().min(6).max(200),
        role: userRoleSchema,
        adminRoleId: z.string().uuid().nullable().optional(),
      })
      .refine((d) => Boolean(d.email?.trim() || d.phone?.trim()), { message: "Email or phone required" });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const email = parsed.data.email?.trim() ? parsed.data.email.trim().toLowerCase() : null;
    const phone = parsed.data.phone?.trim() ? parsed.data.phone.trim() : null;

    const adminRoleId =
      parsed.data.role === "platform_admin" ? (parsed.data.adminRoleId ?? null) : null;

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const out = await storage.insertUserByAdmin(
      {
        fullName: parsed.data.fullName,
        email,
        phone,
        passwordHash,
        role: parsed.data.role,
        adminRoleId,
      },
      req.session.userId!,
    );

    if (!out.ok) return res.status(400).json({ error: out.error });

    const row = await storage.getAdminUserById(out.user.id);
    if (!row) return res.status(500).json({ error: "User created but could not be loaded" });
    res.status(201).json(row);
  });

  app.get("/api/admin/users/:id", P.view("users"), async (req, res) => {
    const u = await storage.getAdminUserById(req.params.id);
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(u);
  });

  app.patch("/api/admin/users/:id", P.edit("users"), async (req, res) => {
    const schema = z.object({
      role: userRoleSchema.optional(),
      fullName: z.string().min(1).optional(),
      adminRoleId: z.string().uuid().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const result = await storage.updateUserAdmin(req.params.id, parsed.data, req.session.userId!);
    if (!result.ok) {
      if (result.error === "not_found") return res.status(404).json({ error: "User not found" });
      return res.status(400).json({ error: "Cannot remove the last platform administrator" });
    }
    res.json({ ok: true });
  });

  app.delete("/api/admin/users/:id", P.delete("users"), async (req, res) => {
    const actorId = req.session.userId!;
    const r = await storage.deleteUserByAdmin(req.params.id, actorId);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.post("/api/admin/users/bulk", requirePlatformAdmin, async (req, res) => {
    if (!(await userPerm(req.session.userId!, "users", "delete")))
      return res.status(403).json({ error: "Forbidden" });
    const schema = z.object({ ids: z.array(z.string().uuid()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await storage.bulkDeleteUsersByAdmin(parsed.data.ids, req.session.userId!);
    res.json(out);
  });

  app.get("/api/admin/products", P.view("products"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const status =
      req.query.status === "active" || req.query.status === "draft" ? req.query.status : undefined;
    const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
    const { items, total } = await storage.listProductsAdminPaged({
      q,
      status,
      vendorId,
      limit,
      offset,
    });
    sendPaged(res, items, total, page, perPage);
  });

  app.get("/api/admin/products/:id", P.view("products"), async (req, res) => {
    const row = await storage.getAdminProductById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });

  app.post("/api/admin/products/import-from-url", P.create("products"), async (req, res) => {
    const schema = z.object({ url: z.string().url().max(2000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const out = await importProductFromUrl(parsed.data.url);
      res.json(out);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not import from URL";
      res.status(400).json({ error: msg });
    }
  });

  app.post("/api/admin/products/import-create-draft", P.create("products"), async (req, res) => {
    const schema = z.object({
      url: z.string().url().max(2000),
      vendorId: z.string().uuid(),
      categoryId: z.string().uuid().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const imported = await importProductFromUrl(parsed.data.url);
      const baseSlug = imported.slug || "imported-product";
      const status: "draft" = "draft";

      const created = await storage.createProductForVendor(parsed.data.vendorId, {
        categoryId: parsed.data.categoryId ?? null,
        title: imported.title,
        slug: baseSlug,
        description: imported.description || null,
        seoTitle: imported.title || null,
        seoDescription: null,
        seoKeywords: null,
        price: imported.price || "0",
        compareAtPrice: imported.compareAtPrice,
        stock: 0,
        images: imported.images,
        status,
        actorUserId: req.session.userId!,
      });

      res.status(201).json({ imported, product: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not import and create draft";
      res.status(400).json({ error: msg });
    }
  });

  app.post("/api/admin/products/import-enhance", P.edit("products"), async (req, res) => {
    const parsed = importEnhanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const meta = await storage.getPublicSiteMeta();
    const categoryTree = await storage.listCategoryTree();
    const result = await enhanceImportedProductWithAi({
      imported: parsed.data.imported,
      userInstructions: parsed.data.userInstructions?.trim() || null,
      brandContext: {
        siteDisplayName: meta.site_display_name ?? "",
        siteTitle: meta.site_title ?? "",
        siteDescription: meta.site_description ?? "",
        siteKeywords: meta.site_keywords ?? "",
        storefrontTheme: meta.storefront_theme ?? "theme1",
        storefrontTemplate: meta.storefront_ui_template ?? "orlenbd",
      },
      categoryCatalog: toCategoryCatalogForAi(categoryTree),
    });

    if (!result.ok) {
      console.warn("[ai-import-enhance] fallback", {
        sourceUrl: parsed.data.imported.sourceUrl,
        sourceHost: parsed.data.imported.sourceHost,
        model: result.model ?? "unknown",
        warning: result.warning ?? "unknown_warning",
        at: new Date().toISOString(),
      });
      return res.json({
        ok: false,
        warning: result.warning ?? "AI enhancement failed",
        model: result.model,
        fallbackRaw: parsed.data.imported,
      });
    }

    console.info("[ai-import-enhance] success", {
      sourceUrl: parsed.data.imported.sourceUrl,
      sourceHost: parsed.data.imported.sourceHost,
      model: result.model ?? "unknown",
      at: new Date().toISOString(),
    });
    return res.json({
      ok: true,
      model: result.model,
      enhanced: result.enhanced,
      warning: result.warning,
    });
  });

  app.post("/api/admin/product-images/enhance", P.edit("products"), async (req, res) => {
    const parsed = productImageEnhanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const meta = await storage.getPublicSiteMeta();
    const logo = meta.logo_url?.trim() || null;
    const r = await enhanceProductImageFile({
      sourceImageRef: parsed.data.imageUrl,
      logoUrl: logo,
      userInstructions: parsed.data.userInstructions?.trim() || null,
    });
    if (!r.ok) {
      return res.status(400).json({ error: r.error });
    }
    if (r.warning) {
      console.info("[product-image-enhance] warning", { at: new Date().toISOString() });
    }
    return res.json({ ok: true, url: r.url, warning: r.warning });
  });

  /** Multipart upload: saves as WebP (resize + compress). Product images only; use instead of /api/upload. */
  app.post(
    "/api/admin/product-images/upload",
    requirePlatformAdmin,
    async (req, res, next) => {
      const uid = req.session.userId!;
      if (!(await userPerm(uid, "products", "create")) && !(await userPerm(uid, "products", "edit"))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    },
    (req, res, next) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          return res.status(400).json({ error: msg });
        }
        next();
      });
    },
    async (req, res) => {
      if (!req.file) return res.status(400).json({ error: "file required" });
      const abs = path.join(uploadsDir, req.file.filename);
      try {
        const buf = await fs.readFile(abs);
        const webp = await compressImageBufferToWebp(buf);
        await fs.unlink(abs);
        const { url } = await writeWebpBufferToUploads(webp);
        return res.json({ url });
      } catch (e) {
        await fs.unlink(abs).catch(() => {});
        return res.status(400).json({ error: e instanceof Error ? e.message : "Could not process image" });
      }
    },
  );

  /** Load image from http(s) or /uploads/, write optimized WebP to /uploads/. */
  app.post("/api/admin/product-images/compress", requirePlatformAdmin, async (req, res) => {
    const uid = req.session.userId!;
    if (!(await userPerm(uid, "products", "create")) && !(await userPerm(uid, "products", "edit"))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const schema = z.object({ imageUrl: z.string().min(1).max(4000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const { url } = await compressProductImageRefToWebpUpload(parsed.data.imageUrl);
      return res.json({ ok: true, url });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : "Compression failed" });
    }
  });

  const variantRowSchema = z.object({
    kind: z.enum(["size", "color", "custom"]),
    name: z.string().min(1).max(80),
    value: z.string().min(1).max(120),
    price: z.preprocess((v) => (typeof v === "string" ? v.replace(/,/g, "").trim() : v), z.string().min(1)),
    stock: z.number().int().min(0),
    sortOrder: z.number().int().optional(),
  });

  const moneyString = z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/,/g, "").trim() : v),
    z.string().min(1),
  );

  app.post("/api/admin/products", P.create("products"), async (req, res) => {
    const schema = z.object({
      vendorId: z.string().uuid(),
      categoryId: z.string().uuid().nullable().optional(),
      title: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
      description: z.string().nullable().optional(),
      seoTitle: z.string().max(220).nullable().optional(),
      seoDescription: z.string().max(320).nullable().optional(),
      seoKeywords: z.string().max(1000).nullable().optional(),
      price: moneyString,
      compareAtPrice: z.preprocess(
        (v) => (v == null || v === "" ? null : typeof v === "string" ? v.replace(/,/g, "").trim() : v),
        z.string().min(1).nullable().optional(),
      ),
      stock: z.number().int().min(0),
      freeDeliveryEnabled: z.boolean().optional().default(false),
      freeDeliveryMinCartAmount: z.preprocess(
        (v) =>
          v === undefined
            ? undefined
            : v == null || v === ""
              ? null
              : typeof v === "string"
                ? v.replace(/,/g, "").trim()
                : v,
        z.string().min(1).nullable().optional(),
      ),
      freeDeliveryMinQuantity: z.union([z.number().int().min(1), z.null()]).optional(),
      images: z.array(z.string().min(1)).default([]),
      status: z.enum(["draft", "active"]).default("draft"),
      keyFeaturesJson: z
        .object({ en: z.string(), bn: z.string() })
        .nullable()
        .optional(),
      specificationsJson: specificationsJsonField(),
      generalInfoJson: z
        .object({ en: z.string(), bn: z.string() })
        .nullable()
        .optional(),
      variants: z.array(variantRowSchema).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const created = await storage.createProductForVendor(parsed.data.vendorId, {
        categoryId: parsed.data.categoryId ?? null,
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        seoTitle: parsed.data.seoTitle ?? null,
        seoDescription: parsed.data.seoDescription ?? null,
        seoKeywords: parsed.data.seoKeywords ?? null,
        price: parsed.data.price,
        compareAtPrice: parsed.data.compareAtPrice ?? null,
        stock: parsed.data.stock,
        images: parsed.data.images,
        status: parsed.data.status,
        keyFeaturesJson: parsed.data.keyFeaturesJson ?? null,
        specificationsJson: parsed.data.specificationsJson ?? null,
        generalInfoJson: parsed.data.generalInfoJson ?? null,
        freeDeliveryEnabled: parsed.data.freeDeliveryEnabled,
        freeDeliveryMinCartAmount: parsed.data.freeDeliveryEnabled
          ? parsed.data.freeDeliveryMinCartAmount ?? null
          : null,
        freeDeliveryMinQuantity: parsed.data.freeDeliveryEnabled
          ? parsed.data.freeDeliveryMinQuantity ?? null
          : null,
        variants: parsed.data.variants,
        actorUserId: req.session.userId!,
      });
      res.status(201).json(created);
    } catch {
      res.status(400).json({ error: "Could not create product" });
    }
  });

  app.patch("/api/admin/products/:id", P.edit("products"), async (req, res) => {
    const schema = z
      .object({
        vendorId: z.string().uuid().optional(),
        status: z.enum(["draft", "active"]).optional(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        description: z.string().nullable().optional(),
        seoTitle: z.string().max(220).nullable().optional(),
        seoDescription: z.string().max(320).nullable().optional(),
        seoKeywords: z.string().max(1000).nullable().optional(),
        price: z.preprocess(
          (v) => (v === undefined ? undefined : typeof v === "string" ? v.replace(/,/g, "").trim() : v),
          z.string().min(1).optional(),
        ),
        compareAtPrice: z.preprocess(
          (v) =>
            v === undefined
              ? undefined
              : v == null || v === ""
                ? null
                : typeof v === "string"
                  ? v.replace(/,/g, "").trim()
                  : v,
          z.string().min(1).nullable().optional(),
        ),
        stock: z.number().int().min(0).optional(),
        freeDeliveryEnabled: z.boolean().optional(),
        freeDeliveryMinCartAmount: z.preprocess(
          (v) =>
            v === undefined
              ? undefined
              : v == null || v === ""
                ? null
                : typeof v === "string"
                  ? v.replace(/,/g, "").trim()
                  : v,
          z.string().min(1).nullable().optional(),
        ),
        freeDeliveryMinQuantity: z.union([z.number().int().min(1), z.null()]).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        images: z.array(z.string().min(1)).optional(),
        keyFeaturesJson: z
          .object({ en: z.string(), bn: z.string() })
          .nullable()
          .optional(),
        specificationsJson: specificationsJsonField(),
        generalInfoJson: z
          .object({ en: z.string(), bn: z.string() })
          .nullable()
          .optional(),
        variants: z.array(variantRowSchema).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, { message: "No changes" });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const r = await storage.updateProductAdminFull(req.params.id, parsed.data, req.session.userId!);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.delete("/api/admin/products/:id", P.delete("products"), async (req, res) => {
    const n = await storage.deleteProductsByIds([req.params.id]);
    if (n === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  app.post("/api/admin/products/bulk", requirePlatformAdmin, async (req, res) => {
    const schema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("delete"), ids: z.array(z.string().uuid()).min(1) }),
      z.object({
        action: z.literal("set_status"),
        ids: z.array(z.string().uuid()).min(1),
        status: z.enum(["draft", "active"]),
      }),
    ]);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const uid = req.session.userId!;
    if (parsed.data.action === "delete") {
      if (!(await userPerm(uid, "products", "delete")))
        return res.status(403).json({ error: "Forbidden" });
      const n = await storage.deleteProductsByIds(parsed.data.ids);
      return res.json({ deleted: n });
    }
    if (!(await userPerm(uid, "products", "edit"))) return res.status(403).json({ error: "Forbidden" });
    const n = await storage.bulkSetProductStatus(parsed.data.ids, parsed.data.status, uid);
    res.json({ updated: n });
  });

  app.get("/api/admin/settings", P.view("settings"), async (_req, res) => {
    res.json(await storage.getPlatformSettingsMap());
  });

  app.put("/api/admin/settings", P.edit("settings"), async (req, res) => {
    const schema = z.record(z.string(), z.string().max(12000));
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updates: Record<string, string> = {};
    for (const k of SETTINGS_ALLOWED) {
      if (parsed.data[k] === undefined) continue;
      let v = String(parsed.data[k]);
      if (k === "storefront_theme") {
        const t = z.enum(STOREFRONT_THEME_IDS).safeParse(v);
        v = t.success ? t.data : "theme1";
      }
      if (k === "storefront_ui_template") {
        v = normalizeStorefrontUiTemplateValue(v);
      }
      if (k === "storefront_theme_overrides") {
        try {
          const parsedOverrides = JSON.parse(v || "{}") as unknown;
          if (!parsedOverrides || typeof parsedOverrides !== "object" || Array.isArray(parsedOverrides)) {
            v = "{}";
          } else {
            const out: Record<string, { primary?: string; secondary?: string; text?: string }> = {};
            for (const [themeId, colors] of Object.entries(parsedOverrides as Record<string, unknown>)) {
              if (!STOREFRONT_THEME_IDS.includes(themeId as (typeof STOREFRONT_THEME_IDS)[number])) continue;
              if (!colors || typeof colors !== "object" || Array.isArray(colors)) continue;
              const c = colors as Record<string, unknown>;
              const norm = (raw: unknown) =>
                typeof raw === "string" && /^#([0-9a-fA-F]{6})$/.test(raw.trim()) ? raw.trim().toUpperCase() : undefined;
              const primary = norm(c.primary);
              const secondary = norm(c.secondary);
              const text = norm(c.text);
              if (primary || secondary || text) out[themeId] = { ...(primary ? { primary } : {}), ...(secondary ? { secondary } : {}), ...(text ? { text } : {}) };
            }
            v = JSON.stringify(out);
          }
        } catch {
          v = "{}";
        }
      }
      if (k === "storefront_theme_primary" || k === "storefront_theme_secondary") {
        const color = v.trim();
        v = /^#([0-9a-fA-F]{6})$/.test(color) ? color.toUpperCase() : "";
      }
      if (
        k === "auth_disable_passkeys" ||
        k === "auth_disable_google" ||
        k === "auth_disable_facebook" ||
        k === "auth_single_login_session"
      ) {
        const flag = v.trim();
        v = flag === "1" ? "1" : "";
      }
      updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid keys" });
    }
    await storage.upsertPlatformSettings(updates);
    res.json(await storage.getPlatformSettingsMap());
  });

  app.get("/api/admin/seo/health", P.view("settings"), async (_req, res) => {
    const base = siteBaseFromEnv();
    const robotsLines = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /vendor",
      "Disallow: /api/",
      "Disallow: /cart",
      "Disallow: /checkout",
      "Disallow: /account/",
      "Disallow: /wishlist",
      "Disallow: /order-done/",
      "Disallow: /checkout/payment-return",
      `Sitemap: ${base}/sitemap.xml`,
    ];

    const all = await storage.listPublicSitemapEntries();
    const seen = new Set<string>();
    const rows = all.filter((r) => {
      if (seen.has(r.path)) return false;
      seen.add(r.path);
      return true;
    });

    const productPaths = rows.filter((r) => r.path.startsWith("/p/")).map((r) => r.path);
    const categoryPaths = rows.filter((r) => r.path.startsWith("/c/")).map((r) => r.path);
    const vendorPaths = rows.filter((r) => r.path.startsWith("/v/")).map((r) => r.path);
    const corePaths = rows.filter((r) => !r.path.startsWith("/p/")).map((r) => r.path);
    const staticPaths = rows
      .filter((r) => !r.path.startsWith("/p/") && !r.path.startsWith("/c/") && !r.path.startsWith("/v/"))
      .map((r) => r.path);

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      canonical: {
        publicSiteUrl: base,
        robotsUrl: `${base}/robots.txt`,
        sitemapIndexUrl: `${base}/sitemap.xml`,
      },
      robots: {
        lineCount: robotsLines.length,
        preview: robotsLines,
      },
      sitemap: {
        totalUrls: rows.length,
        coreUrls: corePaths.length,
        productUrls: productPaths.length,
        categoryUrls: categoryPaths.length,
        vendorUrls: vendorPaths.length,
        staticUrls: staticPaths.length,
        samples: {
          core: corePaths.slice(0, 8),
          products: productPaths.slice(0, 8),
        },
      },
    });
  });

  app.post("/api/admin/payment-gateway/verify", P.view("payment_gateway"), async (req, res) => {
    const schema = z
      .object({
        orlenpay_base_url: z.string().optional(),
        orlenpay_public_key: z.string().optional(),
        orlenpay_secret_key: z.string().optional(),
      })
      .optional();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const settings = await storage.getPlatformSettingsMap();
    const baseUrlRaw = (parsed.data?.orlenpay_base_url ?? settings.orlenpay_base_url ?? "").trim();
    const publicKey = (parsed.data?.orlenpay_public_key ?? settings.orlenpay_public_key ?? "").trim();
    const secretKey = (parsed.data?.orlenpay_secret_key ?? settings.orlenpay_secret_key ?? "").trim();

    if (!baseUrlRaw || !publicKey || !secretKey) {
      const message = "Missing ORLENPAY_BASE_URL / ORLENPAY_PUBLIC_KEY / ORLENPAY_SECRET_KEY";
      return res.status(400).json({
        ok: false,
        error: message,
        message,
      });
    }

    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    const healthUrl = `${baseUrl}/api`;
    const authProbeUrl = `${baseUrl}/api/v3/deposit/order-status?reference_no=ORLENBD-CONNECTION-CHECK`;

    try {
      const healthRes = await fetch(healthUrl, { method: "GET" });
      const healthBody = await healthRes.text();
      const authRes = await fetch(authProbeUrl, {
        method: "GET",
        headers: {
          "public-key": publicKey,
          "secret-key": secretKey,
        },
      });
      const authBody = await authRes.text();

      const authOk = [200, 404, 422].includes(authRes.status);
      if (!authOk) {
        let backendReason = "";
        try {
          const parsedAuth = JSON.parse(authBody) as { message?: unknown };
          if (typeof parsedAuth.message === "string" && parsedAuth.message.trim()) {
            backendReason = parsedAuth.message.trim();
          }
        } catch {
          // ignore non-JSON auth body
        }
        const message = backendReason
          ? `Payment provider reachable but credentials were rejected: ${backendReason}`
          : "Payment provider reachable but credentials were rejected.";
        return res.status(400).json({
          ok: false,
          error: message,
          message,
          details: {
            health_status: healthRes.status,
            auth_status: authRes.status,
            auth_body: authBody.slice(0, 500),
            health_body: healthBody.slice(0, 500),
          },
        });
      }

      return res.json({
        ok: true,
        message: "Connection successful. Payment provider is reachable and credentials are accepted.",
        details: {
          health_status: healthRes.status,
          auth_status: authRes.status,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection test failed";
      return res.status(400).json({
        ok: false,
        error: message,
        message,
      });
    }
  });

  app.get("/api/admin/newsletter-subscribers", P.view("newsletter"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const { items, total } = await storage.listNewsletterSubscribersAdminPaged({ q, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.post("/api/admin/newsletter-subscribers", P.create("newsletter"), async (req, res) => {
    const schema = z.object({ email: z.string().email(), source: z.string().max(64).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const r = await storage.adminAddNewsletterSubscriber(parsed.data.email, parsed.data.source ?? "admin");
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.delete("/api/admin/newsletter-subscribers/:id", P.delete("newsletter"), async (req, res) => {
    const r = await storage.adminDeleteNewsletterSubscriber(req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  app.get("/api/admin/reviews", P.view("reviews"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const status =
      req.query.status === "pending" || req.query.status === "approved" || req.query.status === "rejected"
        ? req.query.status
        : undefined;
    const { items, total } = await storage.listReviewsAdminPaged({ status, limit, offset });
    sendPaged(res, items, total, page, perPage);
  });

  app.patch("/api/admin/reviews/:id", P.edit("reviews"), async (req, res) => {
    const schema = z.object({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      adminReply: z.string().max(2000).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: "No changes" });
    const ok = await storage.updateReviewAdmin(req.params.id, parsed.data, req.session.userId ?? null);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  app.get("/api/admin/wishlist-stats", P.view("wishlist_stats"), async (req, res) => {
    const { page, perPage, offset, limit } = readPagination(req);
    const { items, total } = await storage.listTopWishlistedProductsAdmin({ limit, offset });
    sendPaged(res, items, total, page, perPage);
  });
}
