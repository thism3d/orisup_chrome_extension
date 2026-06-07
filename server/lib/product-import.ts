import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { uploadsDir } from "../config/upload";

type ImportResult = {
  sourceUrl: string;
  sourceHost: string;
  title: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  /** Sanitized HTML for rich-text product description */
  description: string;
  images: string[];
};

const NOISE_PATTERNS: RegExp[] = [
  /download app/i,
  /customer care/i,
  /terms/i,
  /privacy/i,
  /follow us/i,
  /copyright/i,
  /login/i,
  /sign up/i,
  /help center/i,
  /become a seller/i,
  /daraz international/i,
  /payment methods/i,
  /you may also like/i,
  /ratings? & reviews?/i,
  /questions about this product/i,
  /sold by/i,
  /chat now/i,
];

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(s: string) {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asAbs(base: string, maybeUrl: string) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return "";
  }
}

function firstNonEmpty(values: Array<string | undefined | null>) {
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return "";
}

function parseMoney(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return n.toString();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Reject script/JSON/CSS/HTML noise that used to leak into descriptions */
function isGarbageLine(line: string): boolean {
  const l = line.trim();
  if (!l) return true;
  if (l.length < 3) return true;
  if (NOISE_PATTERNS.some((re) => re.test(l))) return true;
  if (/window\.__|window\.[a-zA-Z]/.test(l)) return true;
  if (/\bif\s*\(typeof\s+window/.test(l)) return true;
  if (/\bfunction\s*\(/.test(l)) return true;
  if (/\bcatch\s*\(/.test(l)) return true;
  if (/\bconsole\./.test(l)) return true;
  if (/^\s*\}\s*catch/.test(l)) return true;
  if (/^\s*\}\s*$/.test(l) && l.length < 40) return true;
  if (/["']@type["']\s*:\s*["']?Product/.test(l)) return true;
  if (/"@context"\s*:\s*"https?:\/\/schema\.org/.test(l)) return true;
  if (/\{@type|"@type"|@context/.test(l)) return true;
  if (/schema\.org/.test(l) && /"offers"|"brand"|"sku"/.test(l)) return true;
  if (/<\/?[a-z][a-z0-9]*[\s>\/]/i.test(l)) return true;
  if (/itemprop=|itemscope|itemtype=/.test(l)) return true;
  if (/display:\s*(inline|block)|fill:\s*currentColor|font-size:\s*1em|width:\s*1em/.test(l)) return true;
  if (/\bget:\s*function|createXHR\s*:\s*function/.test(l)) return true;
  if (/quality:\s*['"]q\d+['"]/.test(l)) return true;
  if (/^\s*id:\s*['"]?\d+['"]?,\s*$/.test(l)) return true;
  if (/currency:\s*['"][A-Z]{3}['"]/.test(l) && /domain:/.test(l)) return true;
  if (l.length > 400 && /[{}]/.test(l)) return true;
  return false;
}

/** Turn plain product copy into minimal safe HTML (paragraphs + optional h3 for short heading lines) */
function plainTextToDescriptionHtml(raw: string, opts?: { isDaraz?: boolean }): string {
  let t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  if (opts?.isDaraz) {
    const markers = [
      "Performance & Battery Runtime",
      "Walton Merlin",
      "Smart Features & Build",
      "Quick Tips for Better Battery Life",
      "Specifications of",
      "Product details of",
    ];
    for (const m of markers) {
      const re = new RegExp(`(\\S[^\\n]*?)\\s*(${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      t = t.replace(re, "$1\n\n$2\n");
    }
  }

  const chunks = t
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const parts: string[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split(/\n/).map((x) => x.trim()).filter(Boolean);
    for (const line of lines) {
      if (isGarbageLine(line)) continue;
      const isShortHeading =
        line.length <= 90 &&
        /^[A-Z]/.test(line) &&
        (line.includes("&") || line.endsWith(":") || /Runtime|Features|Tips|Specifications|details/i.test(line));
      if (isShortHeading && !line.includes(". ")) {
        parts.push(`<h3>${escapeHtml(line.replace(/:\s*$/, ""))}</h3>`);
      } else {
        parts.push(`<p>${escapeHtml(line)}</p>`);
      }
    }
  }

  const html = parts.join("");
  return html || `<p>${escapeHtml(normalizeText(raw))}</p>`;
}

function extractJsonLdProducts($: cheerio.CheerioAPI): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsedLd = JSON.parse(raw) as unknown;
      const asArr = Array.isArray(parsedLd) ? parsedLd : [parsedLd];
      for (const item of asArr) {
        if (item && typeof item === "object") {
          const t = String((item as Record<string, unknown>)["@type"] ?? "").toLowerCase();
          if (t.includes("product")) out.push(item as Record<string, unknown>);
        }
      }
    } catch {
      /* ignore */
    }
  });
  return out;
}

function getOfferPrice(ld: Record<string, unknown>): string {
  const offers = ld.offers;
  if (!offers || typeof offers !== "object") return "";
  const o = offers as Record<string, unknown>;
  if (Array.isArray(o)) {
    const first = o[0] as Record<string, unknown> | undefined;
    return first ? String(first.price ?? "") : "";
  }
  return String(o.price ?? "");
}

function isLikelyProductImageUrl(u: string): boolean {
  if (!/^https?:\/\//i.test(u)) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com|facebook\.com|tiktok\.com/i.test(u)) return false;
  if (/\.(svg)(\?|$)/i.test(u)) return false;
  if (/logo|icon|sprite|placeholder|banner-ad|payment/i.test(u)) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$|_)/i.test(u) || /\/p\/[a-f0-9]{8,}/i.test(u) || /slatic\.net|daraz|lazada|img\./i.test(u);
}

function extFromContentType(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return ".jpg";
  if (ct.includes("image/svg")) return ".svg";
  return ".jpg";
}

function extFromUrl(u: string): string {
  try {
    const p = new URL(u).pathname.toLowerCase();
    if (p.endsWith(".png")) return ".png";
    if (p.endsWith(".webp")) return ".webp";
    if (p.endsWith(".gif")) return ".gif";
    if (p.endsWith(".jpeg") || p.endsWith(".jpg")) return ".jpg";
    if (p.endsWith(".svg")) return ".svg";
  } catch {
    /* ignore */
  }
  return "";
}

async function downloadImageToUploads(imageUrl: string): Promise<string | null> {
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    if (ct && !ct.toLowerCase().startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    /** Drop tiny thumbs / tracking pixels (admin policy: min 15 KiB). */
    if (buf.length < 15 * 1024) return null;
    const ext = extFromUrl(imageUrl) || extFromContentType(ct);
    const hash = crypto.createHash("sha1").update(imageUrl).digest("hex").slice(0, 12);
    const filename = `ob-import-${Date.now()}-${hash}${ext}`;
    const abs = path.join(uploadsDir, filename);
    fs.writeFileSync(abs, buf);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

async function persistImportedImages(images: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const u of images) {
    const local = await downloadImageToUploads(u);
    if (local) out.push(local);
  }
  return out;
}

export async function importProductFromUrl(url: string): Promise<ImportResult> {
  const parsed = new URL(url);
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Only http(s) URLs are supported.");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
  const html = await res.text();

  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();

  const isDaraz = /(^|\.)daraz\./i.test(parsed.hostname);

  const jsonLdProducts = extractJsonLdProducts($);
  const ld = jsonLdProducts[0] ?? {};

  const title = normalizeText(
    firstNonEmpty([
      String(ld.name ?? ""),
      $('meta[property="og:title"]').attr("content"),
      $('meta[name="twitter:title"]').attr("content"),
      isDaraz ? $(".pdp-mod-product-badge-title, h1.pdp-product-name, h1").first().text() : "",
      $("h1").first().text(),
      $("title").first().text(),
    ])
  );
  if (!title) throw new Error("Could not extract product title.");

  const offerPrice = getOfferPrice(ld);
  const price = parseMoney(
    firstNonEmpty([
      offerPrice,
      $('meta[property="product:price:amount"]').attr("content"),
      $('meta[itemprop="price"]').attr("content"),
      $('[itemprop="price"]').attr("content"),
      isDaraz ? $('[class*="price-current"], [class*="pdp-price-type"]').first().text() : "",
      $(".pdp-price, .price").first().text(),
    ])
  );

  const compareAtPriceRaw = parseMoney(
    firstNonEmpty([
      isDaraz ? $('[class*="price-original"], [class*="pdp-price-type--original"]').first().text() : "",
      $(".price--original, .original-price").first().text(),
    ])
  );
  const compareAtPrice =
    compareAtPriceRaw && Number(compareAtPriceRaw) > Number(price || 0) ? compareAtPriceRaw : null;

  const imagesRaw = new Set<string>();
  const addImage = (u: string) => {
    const abs = asAbs(url, u.trim());
    if (!abs || !isLikelyProductImageUrl(abs)) return;
    imagesRaw.add(abs);
  };

  const ldImages = ld.image;
  if (Array.isArray(ldImages)) ldImages.forEach((i) => addImage(String(i)));
  else if (typeof ldImages === "string") addImage(ldImages);

  addImage($('meta[property="og:image"]').attr("content") ?? "");
  $("img").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("data-ks-lazyload");
    if (!src) return;
    const alt = ($(img).attr("alt") ?? "").toLowerCase();
    if (alt && /(logo|icon|payment|banner)/i.test(alt)) return;
    addImage(src);
  });

  const images = await persistImportedImages(Array.from(imagesRaw).slice(0, 12));

  const ldDescription = typeof ld.description === "string" ? ld.description.trim() : "";
  const itempropDesc = $('[itemprop="description"]').first().text().trim();
  const darazDetailHtml = isDaraz
    ? $(".detail-content, .pdp-product-detail, #module_product_detail, .html-content").first().text().trim()
    : "";

  let descriptionSource = "";
  if (ldDescription.length >= itempropDesc.length && ldDescription.length >= darazDetailHtml.length) {
    descriptionSource = ldDescription;
  } else if (itempropDesc.length >= darazDetailHtml.length) {
    descriptionSource = itempropDesc;
  } else {
    descriptionSource = darazDetailHtml;
  }

  if (!descriptionSource && isDaraz) {
    const pageText = $("body").text();
    const start = pageText.search(/product details of/i);
    const end = pageText.search(/ratings?\s*&\s*reviews?/i);
    if (start >= 0) {
      const slice = end > start ? pageText.slice(start, end) : pageText.slice(start);
      descriptionSource = slice.replace(/^[\s\S]*?product details of\s*/i, "").trim();
    }
  }

  let descriptionHtml = "";
  if (descriptionSource) {
    descriptionHtml = plainTextToDescriptionHtml(descriptionSource, { isDaraz });
  } else {
    const pageText = $("body").text();
    const lines = pageText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !isGarbageLine(s));
    const filtered = lines.filter((l) => scoreHeuristic(l) >= 2).slice(0, 40);
    const fallback = filtered.join("\n\n") || title;
    descriptionHtml = plainTextToDescriptionHtml(fallback, { isDaraz });
  }

  return {
    sourceUrl: url,
    sourceHost: parsed.hostname,
    title,
    slug: toSlug(title),
    price: price || "",
    compareAtPrice,
    description: descriptionHtml,
    images,
  };
}

function scoreHeuristic(line: string): number {
  let score = 0;
  if (line.length >= 20 && line.length <= 300) score += 2;
  if (/\d/.test(line)) score += 1;
  if (/(watt|rpm|voltage|warranty|battery|motor|mm|inch|kg|bdt|tk)/i.test(line)) score += 2;
  if (isGarbageLine(line)) score -= 10;
  return score;
}
