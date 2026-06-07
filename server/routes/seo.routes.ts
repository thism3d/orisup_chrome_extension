import type { Express } from "express";
import * as storage from "../storage";
import { siteBaseFromEnv } from "../lib/publicOrigin";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function absLoc(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return xmlEscape(encodeURI(`${base}${p}`));
}

function buildUrlSetXml(base: string, rows: storage.SitemapUrlEntry[]): string {
  const urls = rows
    .map((e) => {
      const loc = absLoc(base, e.path);
      const last = e.lastmod ? `<lastmod>${xmlEscape(e.lastmod)}</lastmod>` : "";
      return `<url><loc>${loc}</loc>${last}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

function buildSitemapIndexXml(base: string, paths: string[]): string {
  const now = new Date().toISOString();
  const body = paths
    .map((p) => `<sitemap><loc>${absLoc(base, p)}</loc><lastmod>${xmlEscape(now)}</lastmod></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (req, res) => {
    const base = siteBaseFromEnv();
    const body = [
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
      "",
      `Sitemap: ${base}/sitemap.xml`,
      "",
    ].join("\n");
    res.type("text/plain; charset=utf-8").send(body);
  });

  app.get("/sitemap.xml", async (req, res) => {
    const base = siteBaseFromEnv();
    try {
      const all = await storage.listPublicSitemapEntries();
      const seen = new Set<string>();
      const rows = all.filter((r) => {
        if (seen.has(r.path)) return false;
        seen.add(r.path);
        return true;
      });
      const core = rows.filter((r) => !r.path.startsWith("/p/"));
      const products = rows.filter((r) => r.path.startsWith("/p/"));
      const chunkSize = 5000;
      const productChunks = Math.max(1, Math.ceil(products.length / chunkSize));
      const indexPaths = ["/sitemaps/core.xml", ...Array.from({ length: productChunks }, (_, i) => `/sitemaps/products-${i + 1}.xml`)];
      const xml = buildSitemapIndexXml(base, indexPaths);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.type("application/xml; charset=utf-8").send(xml);
      // Warm cache by referencing `core` to avoid unused warning when product list empty.
      void core;
    } catch (e) {
      res.status(500).type("text/plain").send("Sitemap unavailable");
    }
  });

  app.get("/sitemaps/core.xml", async (req, res) => {
    const base = siteBaseFromEnv();
    try {
      const all = await storage.listPublicSitemapEntries();
      const seen = new Set<string>();
      const rows = all.filter((r) => {
        if (seen.has(r.path)) return false;
        seen.add(r.path);
        return !r.path.startsWith("/p/");
      });
      const xml = buildUrlSetXml(base, rows);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.type("application/xml; charset=utf-8").send(xml);
    } catch {
      res.status(500).type("text/plain").send("Sitemap unavailable");
    }
  });

  app.get("/sitemaps/products-:chunk.xml", async (req, res) => {
    const base = siteBaseFromEnv();
    const chunkNo = Number.parseInt(String(req.params.chunk || "1"), 10);
    if (!Number.isFinite(chunkNo) || chunkNo < 1) {
      return res.status(400).type("text/plain").send("Invalid chunk");
    }
    try {
      const all = await storage.listPublicSitemapEntries();
      const seen = new Set<string>();
      const products = all.filter((r) => {
        if (!r.path.startsWith("/p/")) return false;
        if (seen.has(r.path)) return false;
        seen.add(r.path);
        return true;
      });
      const chunkSize = 5000;
      const start = (chunkNo - 1) * chunkSize;
      const rows = products.slice(start, start + chunkSize);
      if (rows.length === 0) return res.status(404).type("text/plain").send("Chunk not found");
      const xml = buildUrlSetXml(base, rows);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.type("application/xml; charset=utf-8").send(xml);
    } catch {
      res.status(500).type("text/plain").send("Sitemap unavailable");
    }
  });
}
