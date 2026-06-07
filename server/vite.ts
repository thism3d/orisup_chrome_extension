import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import type { Server } from "http";
import { fileURLToPath } from "url";
import { uploadsDir } from "./config/upload";
import * as storage from "./storage";
import { siteBaseFromEnv } from "./lib/publicOrigin";
import { resolvePublicHtmlHeadSeo } from "./lib/publicHtmlSeo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "orlenbd") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function faviconMimeType(url: string): string {
  const raw = (url || "").toLowerCase();
  if (raw.endsWith(".png")) return "image/png";
  if (raw.endsWith(".ico")) return "image/x-icon";
  if (raw.endsWith(".gif")) return "image/gif";
  if (raw.endsWith(".webp")) return "image/webp";
  if (raw.endsWith(".jpg") || raw.endsWith(".jpeg")) return "image/jpeg";
  return "image/svg+xml";
}

type HomeBootstrap = { hero: unknown[]; categories: unknown[]; banners: unknown[] };

let homeBootstrapCache: { data: HomeBootstrap; expiresAt: number } | null = null;
const HOME_BOOTSTRAP_TTL_MS = 30_000;

async function getHomeBootstrap(): Promise<HomeBootstrap> {
  const now = Date.now();
  if (homeBootstrapCache && homeBootstrapCache.expiresAt > now) {
    return homeBootstrapCache.data;
  }
  try {
    const [hero, categories, banners] = await Promise.all([
      storage.listBanners("hero").catch(() => []),
      storage.listCategories().catch(() => []),
      storage.listBanners("top_promo").catch(() => []),
    ]);
    const data: HomeBootstrap = { hero, categories, banners };
    homeBootstrapCache = { data, expiresAt: now + HOME_BOOTSTRAP_TTL_MS };
    return data;
  } catch {
    return { hero: [], categories: [], banners: [] };
  }
}

function pickLcpHeroImage(hero: unknown[]): string {
  const first = Array.isArray(hero) ? (hero[0] as { imageUrl?: string } | undefined) : undefined;
  const raw = first?.imageUrl?.trim();
  if (!raw) return "";

  const base = raw.split("?")[0]?.split("#")[0] ?? raw;
  const toResized = (filename: string) => `/uploads/r/1024/${filename}`;
  // Route uploaded heroes through the resizer so the preload payload is small.
  if (base.startsWith("/uploads/r/")) return base;
  if (base.startsWith("/uploads/")) {
    const filename = base.slice("/uploads/".length);
    if (/^[A-Za-z0-9._-]+$/.test(filename)) return toResized(filename);
    return raw;
  }
  if (/^https?:\/\//i.test(base)) {
    try {
      const u = new URL(base);
      if (u.pathname.startsWith("/uploads/r/")) return u.pathname;
      if (u.pathname.startsWith("/uploads/")) {
        const filename = u.pathname.slice("/uploads/".length).split("/")[0] ?? "";
        if (/^[A-Za-z0-9._-]+$/.test(filename)) {
          return `${u.origin}${toResized(filename)}`;
        }
      }
    } catch {
      return raw;
    }
  }
  return raw;
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/-->/g, "--\\>");
}

function extractQueryString(reqUrl: string): string {
  const q = reqUrl.indexOf("?");
  return q === -1 ? "" : reqUrl.slice(q + 1);
}

async function injectPublicSiteMeta(template: string, requestPath: string, reqUrlForQuery: string, req: Request): Promise<string> {
  const siteMeta = await storage.getPublicSiteMeta();
  const homeBootstrap = await getHomeBootstrap();
  const lcpHeroImage = pickLcpHeroImage(homeBootstrap.hero);
  const publicOrigin = siteBaseFromEnv();
  const seo = await resolvePublicHtmlHeadSeo(requestPath, extractQueryString(reqUrlForQuery), siteMeta, {
    publicOrigin,
  });
  const siteTitle = seo.title;
  const siteDescription = seo.description;
  const siteName = siteMeta.site_display_name?.trim() || "Orlenbd";
  const themeColor =
    /^#([0-9a-fA-F]{6})$/.test(siteMeta.storefront_theme_primary || "")
      ? (siteMeta.storefront_theme_primary || "").toUpperCase()
      : siteMeta.storefront_theme === "theme2"
        ? "#0284C7"
        : siteMeta.storefront_theme === "theme3"
          ? "#EA580C"
          : siteMeta.storefront_theme === "theme4"
            ? "#16A34A"
            : siteMeta.storefront_theme === "theme5"
              ? "#64748B"
              : siteMeta.storefront_theme === "theme6"
                ? "#C02673"
                : "#C6E300";
  const faviconUrl = siteMeta.favicon_url?.trim() || "/favicon.svg";
  const faviconMime = faviconMimeType(faviconUrl);
  const ogTitle = seo.ogTitle;
  const ogDescription = seo.ogDescription;
  const ogImage = seo.ogImage;
  const siteKeywords = seo.keywords;

  const toAbs = (p: string) => {
    const t = p.trim();
    if (!t) return `${publicOrigin}/orlenbd-logo.png`;
    if (/^https?:\/\//i.test(t)) return t;
    return `${publicOrigin}${t.startsWith("/") ? t : `/${t}`}`;
  };
  const ogImageAbs = /^https?:\/\//i.test(ogImage) ? ogImage : toAbs(ogImage);
  const faviconUrlAbs = toAbs(faviconUrl);

  // LCP hero preload: emitted only when a hero image is configured. Otherwise leave the slot empty.
  const lcpHeroPreloadTag = lcpHeroImage
    ? `<link rel="preload" as="image" fetchpriority="high" href="${escapeHtml(lcpHeroImage)}">`
    : "";

  return template
    .replaceAll("__PUBLIC_ORIGIN__", escapeHtml(publicOrigin))
    .replaceAll("__THEME_COLOR__", escapeHtml(themeColor))
    .replaceAll("__FAVICON_URL__", escapeHtml(faviconUrlAbs))
    .replaceAll("__FAVICON_MIME__", escapeHtml(faviconMime))
    .replaceAll("__SITE_TITLE__", escapeHtml(siteTitle))
    .replaceAll("__SITE_DESCRIPTION__", escapeHtml(siteDescription))
    .replaceAll("__SITE_KEYWORDS__", escapeHtml(siteKeywords))
    .replaceAll("__SITE_NAME__", escapeHtml(siteName))
    .replaceAll("__OG_TITLE__", escapeHtml(ogTitle))
    .replaceAll("__OG_DESCRIPTION__", escapeHtml(ogDescription))
    .replaceAll("__OG_IMAGE__", escapeHtml(ogImageAbs))
    .replaceAll("__OG_TYPE__", escapeHtml(seo.ogType))
    .replaceAll("__OG_IMAGE_ALT__", escapeHtml(seo.ogImageAlt))
    .replaceAll("__TWITTER_TITLE__", escapeHtml(seo.twitterTitle))
    .replaceAll("__TWITTER_DESCRIPTION__", escapeHtml(seo.twitterDescription))
    .replaceAll("__SEO_CANONICAL_URL__", escapeHtml(seo.canonicalUrl))
    .replaceAll("__SEO_ROBOTS__", escapeHtml(seo.robots))
    .replaceAll("__SEO_OG_URL__", escapeHtml(seo.ogUrl))
    .replaceAll("__SEO_JSONLD__", seo.jsonLdScript)
    .replaceAll("__LCP_HERO_PRELOAD__", lcpHeroPreloadTag)
    .replaceAll("__PUBLIC_SITE_META_JSON__", escapeJsonForScript(siteMeta))
    .replaceAll("__PUBLIC_HOME_BOOTSTRAP_JSON__", escapeJsonForScript(homeBootstrap));
}

export async function setupVite(app: Express, server: Server) {
  const viteLoader = new Function("return import('vite')");
  const viteModule = await viteLoader();
  const { createServer: createViteServer, createLogger } = viteModule;
  const viteLogger = createLogger();

  const reactLoader = new Function("return import('@vitejs/plugin-react')");
  const reactModule = await reactLoader();

  const clientRoot = path.resolve(__dirname, "..", "client");
  const projectRoot = path.resolve(__dirname, "..");

  const vite = await createViteServer({
    root: clientRoot,
    plugins: [reactModule.default()],
    resolve: {
      alias: {
        "@": path.resolve(clientRoot, "src"),
        "@shared": path.resolve(projectRoot, "shared"),
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    customLogger: {
      ...viteLogger,
      error: (msg: string, options: { error?: Error }) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    appType: "custom",
  });

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      etag: true,
      lastModified: true,
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}.cache${path.sep}`)) {
          res.status(404).end();
        }
      },
    }),
  );

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.join(clientRoot, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await injectPublicSiteMeta(template, req.path || "/", req.url || "", req);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${Date.now()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const fromBundle = path.join(__dirname, "public");
  const distPath = fs.existsSync(fromBundle)
    ? fromBundle
    : path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build client first: ${distPath} missing`);
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // /uploads — original images. Resizer route (/uploads/r/:w/:filename) is registered earlier in
  // routes/index.ts and matches first. 30-day cache for the originals; ETag still negotiates revalidation.
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      etag: true,
      lastModified: true,
      // Internal resizer cache directory must not be served raw.
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}.cache${path.sep}`)) {
          res.status(404).end();
        }
      },
    }),
  );

  // /assets — Vite-emitted JS/CSS with content hashes in the filename. Safe for `immutable` 1y.
  const assetsDir = path.join(distPath, "assets");
  if (fs.existsSync(assetsDir)) {
    app.use(
      "/assets",
      express.static(assetsDir, {
        maxAge: "1y",
        immutable: true,
        etag: false,
        lastModified: false,
      }),
    );
  }

  // All other static files (favicon, /orlenbd-logo.png, robots.txt, etc.) — modest cache, no index.html.
  app.use(
    express.static(distPath, {
      index: false,
      maxAge: "1d",
      etag: true,
      lastModified: true,
    }),
  );

  // index.html MUST always go through the template injector so __PUBLIC_SITE_META_JSON__ et al. get
  // replaced — otherwise the browser sees the literal placeholder and throws ReferenceError.
  app.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    try {
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      const page = await injectPublicSiteMeta(template, req.path || "/", req.url || "", req);
      res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          // HTML carries dynamic site-meta + LCP preload, so don't let CDNs/browsers cache it.
          "Cache-Control": "no-cache, no-store, must-revalidate",
        })
        .end(page);
    } catch (err) {
      next(err);
    }
  });
}
