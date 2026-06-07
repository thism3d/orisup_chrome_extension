import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as storage from "../storage";
import { P } from "../middleware/adminPermission";
import { sanitizeContentHtml } from "../lib/sanitizeContentHtml";
import { BRAND_TRUST_SLUGS } from "../../shared/contentPageDefaults";

/** Strip every HTML tag and decode the few entities we'd care about — used to keep page
 *  titles, meta descriptions, and the kicker chip strictly plain-text before persisting. */
function toPlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const slugSchema = z.enum(BRAND_TRUST_SLUGS);

const updateSchema = z
  .object({
    enabled: z.boolean().optional(),
    kicker: z.string().max(80).optional(),
    titleEn: z.string().min(1).max(200).optional(),
    introEn: z.string().max(2000).optional(),
    bodyEn: z.string().max(80000).optional(),
    metaDescriptionEn: z.string().max(320).optional(),
    titleBn: z.string().max(200).optional(),
    introBn: z.string().max(2000).optional(),
    bodyBn: z.string().max(80000).optional(),
    metaDescriptionBn: z.string().max(320).optional(),
  })
  .strict();

function rowToAdminPayload(row: storage.ContentPageRow) {
  return {
    slug: row.slug,
    enabled: row.enabled,
    kicker: row.kicker,
    titleEn: row.titleEn,
    introEn: row.introEn,
    bodyEn: row.bodyEn,
    metaDescriptionEn: row.metaDescriptionEn,
    titleBn: row.titleBn,
    introBn: row.introBn,
    bodyBn: row.bodyBn,
    metaDescriptionBn: row.metaDescriptionBn,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    creator: row.creator ?? null,
    handler: row.handler ?? null,
  };
}

function resolvedToPublicPayload(p: storage.ResolvedContentPage) {
  return {
    slug: p.slug,
    kicker: p.kicker,
    en: {
      title: p.resolvedTitleEn,
      intro: p.resolvedIntroEn,
      body: p.resolvedBodyEn,
      metaDescription: p.resolvedMetaEn,
    },
    bn: {
      title: p.resolvedTitleBn,
      intro: p.resolvedIntroBn,
      body: p.resolvedBodyBn,
      metaDescription: p.resolvedMetaBn,
    },
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

export function registerBrandTrustPageRoutes(app: Express) {
  /** Public: lightweight index of which trust pages are enabled (used by footer/storefront). */
  app.get("/api/public/content-pages", async (_req: Request, res: Response) => {
    try {
      const list = await storage.listResolvedContentPagesPublic();
      res.setHeader("Cache-Control", "public, max-age=120");
      res.json({
        items: list.map((p) => ({
          slug: p.slug,
          enabled: p.enabled,
          titleEn: p.resolvedTitleEn,
          titleBn: p.resolvedTitleBn,
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
        })),
      });
    } catch {
      res.json({ items: [] });
    }
  });

  /** Public: full body for a single page (with brand tokens already substituted). */
  app.get("/api/public/content-pages/:slug", async (req: Request, res: Response) => {
    const parsed = slugSchema.safeParse(req.params.slug);
    if (!parsed.success) return res.status(404).json({ error: "Not found" });
    try {
      const p = await storage.getResolvedContentPage(parsed.data);
      if (!p) return res.status(404).json({ error: "Not found" });
      res.setHeader("Cache-Control", "public, max-age=120");
      res.json(resolvedToPublicPayload(p));
    } catch {
      res.status(500).json({ error: "Failed to load content page" });
    }
  });

  /** Admin: list all 8 trust pages with metadata for the index screen. */
  app.get("/api/admin/brand-trust-pages", P.view("brand_trust"), async (_req: Request, res: Response) => {
    const rows = await storage.listContentPagesAdmin();
    res.json({ items: rows.map(rowToAdminPayload) });
  });

  /** Admin: full row for the editor screen. */
  app.get("/api/admin/brand-trust-pages/:slug", P.view("brand_trust"), async (req: Request, res: Response) => {
    const parsed = slugSchema.safeParse(req.params.slug);
    if (!parsed.success) return res.status(404).json({ error: "Not found" });
    const row = await storage.getContentPageBySlug(parsed.data);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(rowToAdminPayload(row));
  });

  /** Admin: upsert trust page; sanitises HTML body before save. */
  app.put("/api/admin/brand-trust-pages/:slug", P.edit("brand_trust"), async (req: Request, res: Response) => {
    const slugParsed = slugSchema.safeParse(req.params.slug);
    if (!slugParsed.success) return res.status(404).json({ error: "Not found" });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const data = parsed.data;
    const payload: storage.ContentPageUpdate = {
      ...data,
      kicker: data.kicker !== undefined ? toPlainText(data.kicker) : undefined,
      titleEn: data.titleEn !== undefined ? toPlainText(data.titleEn) : undefined,
      titleBn: data.titleBn !== undefined ? toPlainText(data.titleBn) : undefined,
      metaDescriptionEn: data.metaDescriptionEn !== undefined ? toPlainText(data.metaDescriptionEn) : undefined,
      metaDescriptionBn: data.metaDescriptionBn !== undefined ? toPlainText(data.metaDescriptionBn) : undefined,
      bodyEn: data.bodyEn !== undefined ? sanitizeContentHtml(data.bodyEn) : undefined,
      bodyBn: data.bodyBn !== undefined ? sanitizeContentHtml(data.bodyBn) : undefined,
      introEn: data.introEn !== undefined ? sanitizeContentHtml(data.introEn) : undefined,
      introBn: data.introBn !== undefined ? sanitizeContentHtml(data.introBn) : undefined,
    };
    const row = await storage.upsertContentPage(slugParsed.data, payload, req.session.userId!);
    res.json(rowToAdminPayload(row));
  });

  /** Admin: revert a slug to its bundled default copy. */
  app.post(
    "/api/admin/brand-trust-pages/:slug/reset",
    P.edit("brand_trust"),
    async (req: Request, res: Response) => {
      const slugParsed = slugSchema.safeParse(req.params.slug);
      if (!slugParsed.success) return res.status(404).json({ error: "Not found" });
      const row = await storage.resetContentPageToDefault(slugParsed.data);
      res.json(rowToAdminPayload(row));
    },
  );
}
