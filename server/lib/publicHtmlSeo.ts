import { BRAND_TRUST_SLUGS, type BrandTrustSlug } from "@shared/contentPageDefaults";
import * as storage from "../storage";

const TRUST_SLUG_SET = new Set<string>(BRAND_TRUST_SLUGS as unknown as string[]);

/** Matches `SITE_NAME` in `client/src/lib/site.ts` for title suffix rules. */
const SITE_NAME = "Orlenbd";

function stripHtml(raw: string | null | undefined, max: number): string {
  const base = (raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  return base.length <= max ? base : `${base.slice(0, max - 1)}…`;
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/-->/g, "--\\>");
}

function normalizePathname(raw: string): string {
  const p = (raw.split("?")[0] || "/").trim() || "/";
  if (!p.startsWith("/")) return `/${p}`;
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

/** Same rule as `Seo.tsx`: append ` | brand` unless title already contains brand or site name. */
function formatMetaTitle(primary: string, brand: string): string {
  const p = primary.trim();
  const b = brand.trim();
  if (!p) return b || SITE_NAME;
  if (p.includes(b) || p.includes(SITE_NAME)) return p;
  return `${p} | ${b}`;
}

/** Canonical URL with encoded path segments (non-ASCII slugs). */
function absoluteCanonical(origin: string, pathname: string): string {
  const base = origin.replace(/\/$/, "");
  if (pathname === "/" || pathname === "") return `${base}/`;
  const encoded = encodeURI(pathname);
  return `${base}${encoded}`;
}

function shouldNoindexPath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/vendor")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/account")) return true;
  if (pathname.startsWith("/order-done")) return true;
  if (pathname.startsWith("/checkout")) return true;
  if (pathname === "/cart" || pathname === "/wishlist" || pathname === "/login" || pathname === "/register") {
    return true;
  }
  return false;
}

function toAbs(origin: string, p: string): string {
  const t = p.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `${origin}${t.startsWith("/") ? t : `/${t}`}`;
}

function priceForSchema(price: string): string {
  return String(price).replace(/[^\d.]/g, "") || "0";
}

export type ResolvedPublicHtmlHead = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogType: "website" | "product";
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;
  /** Full `<script type="application/ld+json">…</script>` or empty. */
  jsonLdScript: string;
};

/**
 * Crawler-visible `<head>` fields for the first HTML response (SPA shell).
 * Route-specific title/description/canonical/robots/JSON-LD so URLs are not all identical in the raw HTML.
 *
 * @param searchParamsRaw - query string without leading `?` (e.g. `q=shoes&sort=newest`), from `req.url`.
 */
export async function resolvePublicHtmlHeadSeo(
  pathnameRaw: string,
  searchParamsRaw: string | undefined,
  siteMeta: Record<string, string>,
  opts?: { publicOrigin?: string },
): Promise<ResolvedPublicHtmlHead> {
  const pathname = normalizePathname(pathnameRaw);
  const origin = (opts?.publicOrigin ?? (process.env.PUBLIC_SITE_URL || "https://orlenbd.com")).replace(/\/$/, "");
  const searchParams = new URLSearchParams((searchParamsRaw || "").replace(/^\?/, ""));
  const searchQ = searchParams.get("q")?.trim() ?? "";
  const hasSearchQuery = searchQ.length > 0;

  const brand = siteMeta.site_display_name?.trim() || "Orlenbd";
  const defaultTitle =
    siteMeta.site_title?.trim() || `${brand} — Online shopping in Bangladesh`;
  const defaultDescription =
    siteMeta.site_description?.trim() ||
    "Shop electronics, fashion, home and more from verified sellers across Bangladesh.";
  const defaultKeywords =
    siteMeta.site_keywords?.trim() || "orlenbd, bangladesh, online shop, marketplace, COD";
  const defaultOgImage = siteMeta.og_image_url?.trim() || siteMeta.logo_url?.trim() || "/orlenbd-logo.png";
  const ogImageDefaultAbs = toAbs(origin, defaultOgImage);

  const canonicalUrl = absoluteCanonical(origin, pathname);

  const baseNoindex = shouldNoindexPath(pathname);
  const baseRobots = baseNoindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  if (baseNoindex) {
    const title = formatMetaTitle(defaultTitle, brand);
    return {
      title,
      description: defaultDescription,
      keywords: defaultKeywords,
      canonicalUrl,
      robots: baseRobots,
      ogTitle: title,
      ogDescription: defaultDescription,
      ogUrl: canonicalUrl,
      ogImage: ogImageDefaultAbs,
      ogType: "website",
      ogImageAlt: brand,
      twitterTitle: title,
      twitterDescription: defaultDescription,
      jsonLdScript: "",
    };
  }

  const parts = pathname.split("/").filter(Boolean);
  let title = defaultTitle;
  let description = defaultDescription;
  let keywords = defaultKeywords;
  let ogImage = ogImageDefaultAbs;
  let jsonLd: unknown = null;
  let soft404 = false;
  let ogType: "website" | "product" = "website";

  /** Matches `ShopPage` Seo: `noindex={Boolean(q)}` for `/shop` and `/c/:slug` listing with search. */
  const searchNoindex = hasSearchQuery && (pathname === "/shop" || (parts[0] === "c" && parts.length === 2));

  const badStructure =
    (parts[0] === "c" && parts.length !== 2) ||
    (parts[0] === "v" && parts.length !== 2) ||
    (parts[0] === "p" && parts.length !== 3);
  if (badStructure) {
    soft404 = true;
    title = `Page not found — ${brand}`;
    description = `The page ${pathname} was not found on ${brand}.`;
  } else if (pathname === "/" || parts.length === 0) {
    const site = `${origin}/`;
    const logo = toAbs(origin, siteMeta.logo_url?.trim() || "/orlenbd-logo.png");
    jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${site}#organization`,
          name: brand,
          url: site,
          logo,
        },
        {
          "@type": "WebSite",
          "@id": `${site}#website`,
          url: site,
          name: brand,
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${origin}/shop?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };
  } else if (parts.length === 1 && parts[0] === "shop") {
    if (searchNoindex) {
      title = `Search: “${searchQ}” — Shop`;
      description = `Search results for “${searchQ}” on ${brand} — multi-vendor marketplace.`;
      keywords = `${searchQ}, ${brand}, shop, Bangladesh`;
    } else {
      title = `Shop all products`;
      description = `Browse products from verified sellers across Bangladesh on ${brand}. Filters, sort, and cash on delivery.`;
      keywords = `${brand}, shop, marketplace, Bangladesh, COD`;
    }
  } else if (parts.length === 1 && parts[0] === "categories") {
    title = `Browse all categories`;
    description = `Explore the full ${brand} category tree — from electronics and fashion to groceries and home essentials.`;
    keywords = `${brand}, categories, Bangladesh`;
  } else if (parts.length === 1 && TRUST_SLUG_SET.has(parts[0])) {
    const slug = parts[0] as BrandTrustSlug;
    const page = await storage.getResolvedContentPage(slug);
    if (page) {
      title = page.resolvedTitleEn;
      description =
        stripHtml(page.resolvedMetaEn, 160) || stripHtml(page.resolvedIntroEn, 160) || defaultDescription;
    } else {
      soft404 = true;
      title = `Page unavailable — ${brand}`;
      description = defaultDescription;
    }
  } else if (parts[0] === "c" && parts.length === 2) {
    const cat = await storage.getCategoryBySlug(parts[1]);
    if (cat) {
      if (searchNoindex) {
        title = `Search: “${searchQ}” — ${cat.name}`;
        description = `Search results for “${searchQ}” in ${cat.name} on ${brand}.`;
        keywords = `${searchQ}, ${cat.name}, ${brand}`;
      } else {
        title = `${cat.name} — Shop`;
        description = `Browse ${cat.name} from verified ${brand} sellers with delivery across Bangladesh.`;
        keywords = `${cat.name}, ${brand}, Bangladesh, shop`;
        if (cat.imageUrl?.trim()) ogImage = toAbs(origin, cat.imageUrl);
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat.name,
          description,
          url: canonicalUrl,
        };
      }
    } else {
      soft404 = true;
      title = `Category not found — ${brand}`;
      description = `This category is not available on ${brand}.`;
    }
  } else if (parts[0] === "v" && parts.length === 2) {
    const v = await storage.getVendorBySlug(parts[1]);
    if (v && v.status === "approved") {
      title = `${v.name} — Store`;
      description = `Shop products from ${v.name} on ${brand}. Verified seller with delivery across Bangladesh.`;
      keywords = `${v.name}, ${brand}, vendor, shop`;
      if (v.logoUrl?.trim()) ogImage = toAbs(origin, v.logoUrl);
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Store",
        name: v.name,
        url: canonicalUrl,
      };
    } else {
      soft404 = true;
      title = `Store not found — ${brand}`;
      description = `This seller store is not available on ${brand}.`;
    }
  } else if (parts[0] === "p" && parts.length === 3) {
    const p = await storage.getProductBySlug(parts[1], parts[2]);
    if (p) {
      const path = `/p/${parts[1]}/${parts[2]}`;
      const desc =
        stripHtml(p.seoDescription, 160) ||
        stripHtml(p.description, 160) ||
        `Buy ${p.title} from ${p.vendorName} on ${brand} with delivery in Bangladesh.`;
      title = p.seoTitle?.trim() || p.title;
      description = desc;
      keywords = p.seoKeywords?.trim() || `${p.title}, ${p.vendorName}, ${brand}, Bangladesh`;
      const imgs = Array.isArray(p.images) ? p.images : [];
      const imageUrls = imgs.map((u) => toAbs(origin, u)).filter(Boolean);
      if (imageUrls.length) ogImage = imageUrls[0]!;
      ogType = "product";
      const rc = p.reviewCount ?? 0;
      const ar = p.avgRating ?? 0;
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description: desc,
        ...(imageUrls.length ? { image: imageUrls } : {}),
        brand: { "@type": "Brand", name: p.vendorName },
        ...(rc > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(ar),
                reviewCount: String(rc),
              },
            }
          : {}),
        offers: {
          "@type": "Offer",
          url: absoluteCanonical(origin, path),
          priceCurrency: "BDT",
          price: priceForSchema(String(p.price)),
          availability:
            p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        },
      };
    } else {
      soft404 = true;
      title = `Product not found — ${brand}`;
      description = `This product may have been removed from ${brand}.`;
    }
  } else {
    soft404 = true;
    title = `Page not found — ${brand}`;
    description = `The page ${pathname} was not found on ${brand}.`;
  }

  let robots = baseRobots;
  if (soft404 || searchNoindex) {
    robots = "noindex, nofollow";
  }

  const rawTitleForOgAlt = title.length > 120 ? `${title.slice(0, 119)}…` : title;
  const titleFormatted = formatMetaTitle(title, brand);
  const jsonLdScript = jsonLd
    ? `<script type="application/ld+json">${escapeJsonForScript(jsonLd)}</script>`
    : "";

  return {
    title: titleFormatted,
    description,
    keywords,
    canonicalUrl,
    robots,
    ogTitle: titleFormatted,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogImage,
    ogType,
    ogImageAlt: rawTitleForOgAlt,
    twitterTitle: titleFormatted,
    twitterDescription: description,
    jsonLdScript,
  };
}
