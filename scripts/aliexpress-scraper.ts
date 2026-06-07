/**
 * AliExpress Product Scraper
 *
 * Usage:
 *   npx tsx scripts/aliexpress-scraper.ts <url1> [url2] [url3] ...
 *   npx tsx scripts/aliexpress-scraper.ts --file urls.txt
 *
 * Environment (optional, reads from .env):
 *   ALI_USD_TO_BDT_RATE  — exchange rate (default 120)
 *   ALI_MARKUP_MULTIPLIER — selling price multiplier (default 2.0)
 *   DATABASE_URL           — postgres connection string
 */

import "dotenv/config";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import puppeteer from "puppeteer-core";

// ── Config ──────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://orisup_user:StrongPass123@127.0.0.1:5432/orisup_db";
const USD_TO_BDT = Number(process.env.ALI_USD_TO_BDT_RATE) || 120;
const MARKUP = Number(process.env.ALI_MARKUP_MULTIPLIER) || 2.0;
const UPLOADS_DIR = path.resolve(process.env.ORLENBD_UPLOADS_DIR || "./uploads");
const DELAY_MS = 2000; // delay between scrapes to avoid rate-limiting

// ── Helpers ─────────────────────────────────────────────────────────────────
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function normalizeMoneyString(raw: string): string {
  let cleaned = String(raw || "").trim().replace(/\u00A0/g, " ");
  cleaned = cleaned.replace(/[\s\u00A0]+/g, "");
  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  if (hasDot && hasComma) {
    if (cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (hasComma) {
    const commaParts = cleaned.split(",");
    if (commaParts.length > 2) {
      cleaned = cleaned.replace(/,/g, "");
    } else if (commaParts[1].length === 3) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/,/g, ".");
    }
  }

  return cleaned.replace(/[^0-9.]/g, "");
}

function parseMoney(raw: string): number {
  if (!raw || typeof raw !== "string") return 0;
  const matches = String(raw).match(/([0-9]+(?:[.,][0-9]+)*)/g);
  if (!matches?.length) return 0;
  const prices = matches
    .map((part) => Number(normalizeMoneyString(part)))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100000);
  return prices.length ? Math.max(...prices) : 0;
}

function isPlausiblePrice(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 10000;
}

function findPriceInText(text: string): number {
  if (!text || typeof text !== "string") return 0;

  const currencyRegex = /(?:US\$|USD|\$|EUR|€|£|Rs\.|₹|৳)\s*[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?/g;
  const currencyMatches = text.match(currencyRegex) || [];
  const currencyPrices = currencyMatches
    .map((candidate) => parseMoney(candidate))
    .filter(isPlausiblePrice);
  if (currencyPrices.length) return Math.max(...currencyPrices);

  const contextRegex = /(?:price|amount|currentprice|minprice|discountprice|sale price|special price|offer price|list price|our price|was|now)[^0-9]{0,60}([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)/ig;
  const contextPrices: number[] = [];
  let contextMatch: RegExpExecArray | null;
  while ((contextMatch = contextRegex.exec(text))) {
    const value = parseMoney(contextMatch[1]);
    if (isPlausiblePrice(value)) contextPrices.push(value);
  }
  if (contextPrices.length) return Math.max(...contextPrices);

  const candidates = text.match(/(?:[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)/g) || [];
  const prices = candidates
    .map((candidate) => parseMoney(candidate))
    .filter(isPlausiblePrice);
  if (!prices.length) return 0;

  return Math.min(...prices);
}

function extractPrice($: cheerio.CheerioAPI): number {
  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[itemprop="price"]',
    'meta[name="price"]',
    '[itemprop="price"]',
    '[data-role="price"]',
    '[data-auto="productPrice"]',
    '.price-current',
    '.product-price-current',
    '.product-price-value',
    '.product-price',
    '.product_price',
    '.price',
    '.value',
    '#product-price',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (!element.length) continue;
    const raw = element.attr("content") || element.text() || "";
    const amount = parseMoney(raw);
    if (amount) return amount;
  }

  const bodyText = $("body").text();
  return findPriceInText(bodyText);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function asAbs(base: string, maybeUrl: string): string {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return "";
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── Image downloader ────────────────────────────────────────────────────────
async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.aliexpress.com/",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    if (ct && !ct.toLowerCase().startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5 * 1024) return null; // skip tiny images

    let ext = ".jpg";
    if (ct?.includes("png")) ext = ".png";
    else if (ct?.includes("webp")) ext = ".webp";
    else if (ct?.includes("gif")) ext = ".gif";

    const hash = crypto.createHash("sha1").update(imageUrl).digest("hex").slice(0, 12);
    const filename = `ali-scrape-${Date.now()}-${hash}${ext}`;
    const abs = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(abs, buf);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

// ── AliExpress-specific extraction ──────────────────────────────────────────
interface ScrapedVariant {
  kind: string;
  name: string;
  value: string;
  price_usd: number;
  image?: string;
}

interface ScrapedSpec {
  label: string;
  value: string;
}

interface ScrapedProduct {
  source_url: string;
  source_host: string;
  ali_product_id: string;
  title: string;
  slug: string;
  description: string;
  original_price_usd: number;
  original_price_bdt: number;
  selling_price_bdt: number;
  compare_at_price_bdt: number;
  images: string[];
  downloaded_images: string[];
  variants: ScrapedVariant[];
  specifications: ScrapedSpec[];
}

/**
 * Try to parse embedded JSON data from AliExpress pages.
 * AliExpress embeds product data in various script tags.
 */
function extractEmbeddedJson(html: string): Record<string, unknown> | null {
  // Try window.runParams (older AliExpress pages)
  const runParamsMatch = html.match(/window\.runParams\s*=\s*\{/);
  if (runParamsMatch) {
    const start = html.indexOf("{", runParamsMatch.index!);
    let depth = 0;
    let end = start;
    for (let i = start; i < html.length && i < start + 200000; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    try {
      return JSON.parse(html.slice(start, end));
    } catch { /* continue */ }
  }

  // Try window._d_c_.DCData (newer AliExpress pages)
  const dcDataMatch = html.match(/window\._d_c_\s*\.\s*DCData\s*=\s*\{/);
  if (dcDataMatch) {
    const start = html.indexOf("{", dcDataMatch.index!);
    let depth = 0;
    let end = start;
    for (let i = start; i < html.length && i < start + 200000; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    try {
      return JSON.parse(html.slice(start, end));
    } catch { /* continue */ }
  }

  // Try data-sku / data-module (newer AliExpress)
  const dataMatch = html.match(/"pageModule"\s*:\s*\{/);
  if (dataMatch) {
    // Find the enclosing { for the entire data object
    let searchBack = dataMatch.index!;
    while (searchBack > 0 && html[searchBack] !== "{") searchBack--;
    let depth = 0;
    let end = searchBack;
    for (let i = searchBack; i < html.length && i < searchBack + 500000; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    try {
      return JSON.parse(html.slice(searchBack, end));
    } catch { /* continue */ }
  }

  // Try __NEXT_DATA__ (SSR pages)
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      return JSON.parse(nextDataMatch[1]);
    } catch { /* continue */ }
  }

  return null;
}

function extractProductIdFromUrl(url: string): string {
  // AliExpress URL patterns:
  // /item/1234567890.html
  // /item/1234567890
  const m = url.match(/\/item\/(\d+)/);
  if (m) return m[1];
  // /productdetail/.../1234567890.html
  const m2 = url.match(/\/(\d{8,15})\.html/);
  if (m2) return m2[1];
  return "";
}

async function processDescriptionHtml(descHtml: string, downloadedImages: string[]): Promise<string> {
  if (!descHtml) return "";
  const $desc = cheerio.load(descHtml, null, false);

  const imgEls = $desc("img").toArray();
  console.log(`  🖼️  Found ${imgEls.length} images inside rich description`);

  let count = 0;
  for (const el of imgEls) {
    const src = $desc(el).attr("src") || $desc(el).attr("data-src");
    if (src && (src.startsWith("http") || src.startsWith("//"))) {
      let u = src.trim();
      if (u.startsWith("//")) u = "https:" + u;

      const local = await downloadImage(u);
      if (local) {
        $desc(el).attr("src", local);
        $desc(el).removeAttr("data-src");
        if (!downloadedImages.includes(local)) downloadedImages.push(local);
        count++;
      }
    }
  }
  console.log(`  ⬇️  Downloaded & replaced ${count} description images locally`);
  return $desc.html();
}

async function captureAliExpressRuntimeJson(page: puppeteer.Page): Promise<Record<string, unknown>> {
  try {
    return await page.evaluate(() => {
      const seen = new WeakSet();
      const safeCopy = (value: unknown, depth = 0): unknown => {
        if (depth > 5 || value == null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        if (Array.isArray(value)) {
          try {
            return value.map((item) => safeCopy(item, depth + 1));
          } catch { return null; }
        }
        if (typeof value === 'object') {
          try {
            if (seen.has(value)) return null;
            seen.add(value);
            const copy: Record<string, unknown> = {};
            for (const key of Object.keys(value as Record<string, unknown>)) {
              try {
                const item = (value as Record<string, unknown>)[key];
                const safeItem = safeCopy(item, depth + 1);
                if (safeItem !== undefined) copy[key] = safeItem;
              } catch { /* ignore getter/proxy errors */ }
            }
            return copy;
          } catch { return null; }
        }
        return null;
      };

      const windowData: Record<string, unknown> = {};
      const candidateKeys = [
        'runParams',
        '_d_c_',
        'pageConfig',
        'pageData',
        'itemModule',
        'skuModule',
        'skuCore',
        '__INITIAL_STATE__',
        '__PRELOADED_STATE__',
        '__pageConfig__'
      ];

      for (const key of candidateKeys) {
        try {
          const value = (window as any)[key];
          if (value !== undefined) {
            windowData[key] = safeCopy(value);
          }
        } catch { /* ignore */ }
      }

      return windowData;
    });
  } catch (e) {
    console.log(`  ⚠️  Failed to capture runtime JSON: ${e instanceof Error ? e.message : String(e)}`);
    return {};
  }
}

async function scrapeAliExpressProduct(url: string): Promise<ScrapedProduct> {
  const parsed = new URL(url);
  const productId = extractProductIdFromUrl(url);

  console.log(`  📡  Launching local Google Chrome for ${url}...`);

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1400,900",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");

  let mtopDescUrl = "";
  let mtopPriceVal = 0;
  let mtopCurrency = "USD";
  const capturedApiData: unknown[] = [];

  page.on("response", async (res) => {
    const u = res.url();
    const shouldCapture = /mtop\.aliexpress\.pdp|asyncPCDetail|getDesc|itemdetail|sku|skuProperty|skuCore|pdp/.test(u);
    if (!shouldCapture) return;

    try {
      const text = await res.text();
      const clean = text.replace(/^\s*[a-zA-Z0-9_]+\s*\(/, "").replace(/\)\s*$/, "");
      const json = JSON.parse(clean);
      const mtopData = json.data?.result || json.data?.data || json.data || json;
      if (mtopData && typeof mtopData === "object") {
        capturedApiData.push(mtopData);
      }
      if (mtopData?.DESC?.pcDescUrl) {
        mtopDescUrl = mtopData.DESC.pcDescUrl;
        console.log(`  🔗  Intercepted pcDescUrl: ${mtopDescUrl}`);
      }
      if (mtopData?.PRICE) {
        const pInfo = mtopData.PRICE.targetSkuPriceInfo || Object.values(mtopData.PRICE.skuPriceInfoMap || {})[0];
        if (pInfo) {
          const saleStr = pInfo.salePriceString || pInfo.salePriceLocal || "";
          const orig = pInfo.originalPrice || {};
          const cur = orig.currency || mtopData.PRICE.currency || "USD";
          const match = saleStr.match(/[0-9,.]+/);
          if (match) {
            const val = parseFloat(match[0].replace(/,/g, ""));
            if (val > 0) {
              mtopPriceVal = val;
              mtopCurrency = cur;
              console.log(`  💲  Intercepted MTOP Price: ${mtopPriceVal} ${mtopCurrency}`);
            }
          }
        }
      }
    } catch { /* skip */ }
  });

  console.log(`  📡  Navigating & waiting for AliExpress CSR/MTOP rendering...`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
  } catch (e) {
    console.log(`  ⚠️  Page navigation timed out or caught error, continuing with available DOM...`);
  }
  await new Promise((r) => setTimeout(r, 6000));

  console.log(`  📜  Scrolling down to trigger lazy loading...`);
  await page.evaluate(() => window.scrollBy(0, 1500));
  await new Promise((r) => setTimeout(r, 3000));

  console.log(`  🖱️  Clicking 'Description' tab and 'View More' buttons to expand full description...`);
  await page.evaluate(() => {
    // 1. Click the Description tab anchor link first
    const descTabs = Array.from(document.querySelectorAll('a[href*="#nav-description"], a[title*="Description"], li[data-spm*="description"]'));
    for (const tab of descTabs) {
      if (tab instanceof HTMLElement && tab.offsetHeight > 0) {
        tab.click();
      }
    }

    // 2. Click any View More / Show More buttons
    const btns = Array.from(document.querySelectorAll("button, a, div")).filter((el) =>
      el.textContent?.toLowerCase().includes("view more") || el.textContent?.toLowerCase().includes("show more")
    );
    for (const btn of btns) {
      if (btn instanceof HTMLElement && btn.offsetHeight > 0) {
        btn.click();
        break;
      }
    }
  });
  await new Promise((r) => setTimeout(r, 3000));

  const runtimeSnapshot = await captureAliExpressRuntimeJson(page);
  const html = await page.content();
  let rawDescHtml = "";

  if (mtopDescUrl) {
    console.log(`  📡  Fetching pristine rich description HTML from intercepted MTOP URL...`);
    try {
      const descRes = await fetch(mtopDescUrl, { headers: { "User-Agent": UA } });
      if (descRes.ok) {
        rawDescHtml = await descRes.text();
        console.log(`  ✅  Successfully fetched pristine rich description (${rawDescHtml.length} bytes)`);
      }
    } catch (e) {
      console.log(`  ⚠️  Failed to fetch mtopDescUrl: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!rawDescHtml) {
    rawDescHtml = await page.evaluate(() => {
      const containers = document.querySelectorAll("#nav-description, #product-description, .product-description, .description, #description, .detail-desc, #product-detail, [id*=\"desc\"], [class*=\"desc\"]");
      for (const c of containers) {
        if (c && c.innerHTML.trim().length > 200) {
          return c.innerHTML;
        }
      }
      return null;
    }) || "";
  }

  await browser.close();

  const $ = cheerio.load(html);
  const embedded = extractEmbeddedJson(html) || {};
  const runtimeData = runtimeSnapshot || {};

  // ── Title ──
  let title = "";
  // From JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).contents().text());
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item?.["@type"]?.toLowerCase?.()?.includes("product") && item.name) {
          title = String(item.name).trim();
        }
      }
    } catch { /* skip */ }
  });

  if (!title) {
    title = (
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("h1").first().text() ||
      $("title").text() ||
      ""
    ).trim();
  }

  // Try from embedded data
  if (!title && embedded) {
    const walkForKey = (obj: unknown, key: string): string => {
      if (!obj || typeof obj !== "object") return "";
      const o = obj as Record<string, unknown>;
      if (typeof o[key] === "string" && o[key]) return o[key] as string;
      for (const v of Object.values(o)) {
        const found = walkForKey(v, key);
        if (found) return found;
      }
      return "";
    };
    title = walkForKey(embedded, "subject") || walkForKey(embedded, "title") || walkForKey(embedded, "productTitle");
  }

  if (!title) throw new Error("Could not extract product title");
  // Clean up title
  title = title.replace(/\s+/g, " ").replace(/\|.*$/, "").replace(/-\s*AliExpress.*$/i, "").trim();

  console.log(`  📦 Title: ${title}`);

  // ── Price ──
  let priceUsd = 0;
  let scrapedCurrency = "USD";

  if (mtopPriceVal > 0) {
    priceUsd = mtopPriceVal;
    scrapedCurrency = mtopCurrency;
  } else {
    // From JSON-LD offers
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const ld = JSON.parse($(el).contents().text());
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item?.offers) {
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offers?.price) {
              priceUsd = parseMoney(String(offers.price));
              if (priceUsd) return false;
            }
          }
        }
      } catch { /* skip */ }
    });

    if (!priceUsd) {
      priceUsd = extractPrice($);
    }

    // Try embedded data
    if (!priceUsd && embedded) {
      const walkForPrice = (obj: unknown): number => {
        if (!obj || typeof obj !== "object") return 0;
        const o = obj as Record<string, unknown>;
        for (const key of ["minPrice", "formattedPrice", "minAmount", "actMinPrice", "discountPrice", "price", "value"]) {
          if (o[key]) {
            const p = parseMoney(String(o[key]));
            if (p > 0) return p;
          }
        }
        for (const v of Object.values(o)) {
          const found = walkForPrice(v);
          if (found) return found;
        }
        return 0;
      };
      priceUsd = walkForPrice(embedded);
    }
  }

  console.log(`  💲 Scraped Price: ${priceUsd} ${scrapedCurrency}`);

  // ── Images ──
  const imageUrls = new Set<string>();

  // Global regex match across the entire HTML for all alicdn images
  const cdnRegex = /(?:https:)?\/\/[a-z0-9_.-]+\.alicdn\.com\/[a-z0-9\/_.-]+\.(?:jpg|png|webp)/ig;
  const matches = html.match(cdnRegex) || [];

  for (const m of matches) {
    let u = m.trim();
    if (u.startsWith("//")) u = "https:" + u;
    // Remove size suffixes to get master image
    u = u.replace(/_[0-9]+x[0-9]+[a-z]*\.(?:jpg|png|webp|gif).*$/i, "");
    u = u.replace(/_[0-9]+x[0-9]+.*$/i, "");

    const lower = u.toLowerCase();
    if (!lower.includes("icon") && !lower.includes("logo") && !lower.includes("spinner") && !lower.includes("tracking") && !lower.includes("banner") && !lower.includes("head") && !lower.endsWith(".gif")) {
      imageUrls.add(u);
    }
  }

  // Also grab from og:image just in case
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage?.startsWith("http")) imageUrls.add(ogImage);

  const uniqueImages = Array.from(imageUrls).slice(0, 25);
  console.log(`  🖼️  Found ${uniqueImages.length} unique master images`);

  // Download images
  const downloadedImages: string[] = [];
  for (const imgUrl of uniqueImages) {
    const local = await downloadImage(imgUrl);
    if (local) downloadedImages.push(local);
  }
  console.log(`  ⬇️  Downloaded ${downloadedImages.length} images locally`);

  // ── Description ──
  let description = await processDescriptionHtml(rawDescHtml || "", downloadedImages);

  if (!description) {
    description = (
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('[itemprop="description"]').first().text() ||
      ""
    ).trim();
  }

  // ── Variants ──
  const variants: ScrapedVariant[] = [];
  const seenVariantKeys = new Set<string>();
  const normalizeValue = (value: unknown) => String(value || "").trim();
  const normalizeImageUrl = (url: unknown) => {
    if (!url || typeof url !== "string") return undefined;
    let clean = url.trim();
    if (clean.startsWith("//")) clean = "https:" + clean;
    return clean;
  };

  const addVariant = (kind: string, name: string, value: string, price_usd = 0, image?: string) => {
    const key = [kind || "custom", name || "", value || ""].map((p) => p.toLowerCase()).join("|");
    if (!value || seenVariantKeys.has(key)) return;
    seenVariantKeys.add(key);
    variants.push({
      kind: kind.includes("color") ? "color" : kind.includes("size") ? "size" : "custom",
      name: name || "Option",
      value,
      price_usd,
      image: normalizeImageUrl(image),
    });
  };

  const extractVariantFromNode = (obj: unknown): void => {
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;

    if (Array.isArray(o.skuPropertyList) || Array.isArray(o.skuProperties) || Array.isArray(o.skuProps)) {
      const list = (o.skuPropertyList || o.skuProperties || o.skuProps) as Record<string, unknown>[];
      for (const prop of list) {
        const name = normalizeValue(prop.skuPropertyName || prop.propertyName || prop.name || "Option");
        const kind = normalizeValue(name);
        const values = prop.skuPropertyValues || prop.propertyValueList || prop.propertyValues || prop.skuValues;
        if (Array.isArray(values)) {
          for (const v of values as Record<string, unknown>[]) {
            const value = normalizeValue(v.propertyValueDisplayName || v.propertyValueName || v.name || v.value);
            const image = normalizeImageUrl(
              v.skuPropertyImagePath || v.imageUrl || v.imagePath || v.propertyValueImagePath || v.imgUrl || v.pictureUrl
            );
            const price = Number(v.price || v.skuPrice || v.priceUsd || 0) || priceUsd;
            addVariant(kind, name, value, price, image);
          }
        }
      }
    }

    if (Array.isArray(o.skuValueList)) {
      for (const v of o.skuValueList as Record<string, unknown>[]) {
        const name = normalizeValue(v.name || o.name || "Option");
        const value = normalizeValue(v.value || v.propertyValueDisplayName || v.propertyValueName || "");
        const image = normalizeImageUrl(v.imageUrl || v.imgUrl || v.imagePath || v.thumbnailUrl);
        const price = Number(v.price || v.priceUsd || 0) || priceUsd;
        addVariant(name, name, value, price, image);
      }
    }

    for (const v of Object.values(o)) {
      if (typeof v === "object") extractVariantFromNode(v);
    }
  };

  if (embedded) extractVariantFromNode(embedded);
  if (runtimeData) extractVariantFromNode(runtimeData);
  for (const source of capturedApiData) {
    extractVariantFromNode(source);
  }

  const allImagePaths = new Set<string>();
  const collectImageLists = (obj: unknown): void => {
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.imagePathList) || Array.isArray(o.summImagePathList) || Array.isArray(o.imageList)) {
      const array = (o.imagePathList || o.summImagePathList || o.imageList) as unknown[];
      for (const item of array) {
        if (typeof item === "string") {
          const clean = normalizeImageUrl(item);
          if (clean) allImagePaths.add(clean);
        }
      }
    }
    for (const v of Object.values(o)) {
      if (typeof v === "object") collectImageLists(v);
    }
  };

  if (embedded) collectImageLists(embedded);
  if (runtimeData) collectImageLists(runtimeData);
  for (const source of capturedApiData) {
    collectImageLists(source);
  }

  const imageCandidates = Array.from(allImagePaths);
  if (imageCandidates.length && variants.some((variant) => variant.kind === "color" && !variant.image)) {
    const colorVariants = variants.filter((variant) => variant.kind === "color");
    if (colorVariants.length > 0 && colorVariants.length === imageCandidates.length) {
      colorVariants.forEach((variant, index) => {
        if (!variant.image) {
          variant.image = imageCandidates[index];
        }
      });
    }
  }

  // ── Specifications ──
  const specifications: ScrapedSpec[] = [];
  if (embedded) {
    const walkForSpecs = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      const o = obj as Record<string, unknown>;
      if (Array.isArray(o.productPropList) || Array.isArray(o.properties)) {
        const list = (o.productPropList || o.properties) as Record<string, unknown>[];
        for (const item of list) {
          const label = String(item.attrName || item.name || "");
          const value = String(item.attrValue || item.value || "");
          if (label && value) specifications.push({ label, value });
        }
      }
      for (const v of Object.values(o)) {
        if (typeof v === "object") walkForSpecs(v);
      }
    };
    walkForSpecs(embedded);
  }

  // Also try table-based specs on the page
  if (specifications.length === 0) {
    $("table.product-specs tr, .product-props li, [class*='specification'] li").each((_, el) => {
      const cells = $(el).find("td, span");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (label && value) specifications.push({ label, value });
      }
    });
  }

  // ── Calculate BDT prices ──
  let priceBdt = 0;
  let sellingBdt = 0;

  if (scrapedCurrency.toUpperCase() === "BDT") {
    // The scraped price is ALREADY in BDT!!!
    priceBdt = Math.round(priceUsd);
    // Calculate selling price in BDT by applying markup directly to the BDT price
    sellingBdt = Math.round(priceBdt * MARKUP);
    // Also back-calculate priceUsd for the database record
    priceUsd = Number((priceBdt / USD_TO_BDT).toFixed(2));
  } else {
    // The scraped price is in USD
    priceBdt = Math.round(priceUsd * USD_TO_BDT);
    sellingBdt = Math.round(priceUsd * USD_TO_BDT * MARKUP);
  }

  const compareAtBdt = sellingBdt > priceBdt ? Math.round(sellingBdt * 1.3) : 0;

  return {
    source_url: url,
    source_host: parsed.hostname,
    ali_product_id: productId,
    title,
    slug: toSlug(title),
    description,
    original_price_usd: priceUsd,
    original_price_bdt: priceBdt,
    selling_price_bdt: sellingBdt,
    compare_at_price_bdt: compareAtBdt,
    images: uniqueImages,
    downloaded_images: downloadedImages,
    variants,
    specifications,
  };
}

// ── Database ────────────────────────────────────────────────────────────────
async function saveToDb(pool: pg.Pool, product: ScrapedProduct): Promise<string> {
  const query = `
    INSERT INTO scraped_products (
      source_url, source_host, ali_product_id, title, slug, description,
      original_price_usd, original_price_bdt, selling_price_bdt, compare_at_price_bdt,
      images, downloaded_images, variants, specifications,
      stock, review_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16
    )
    RETURNING id
  `;

  const values = [
    product.source_url,
    product.source_host,
    product.ali_product_id,
    product.title,
    product.slug,
    product.description,
    product.original_price_usd,
    product.original_price_bdt,
    product.selling_price_bdt,
    product.compare_at_price_bdt,
    JSON.stringify(product.images),
    JSON.stringify(product.downloaded_images),
    JSON.stringify(product.variants),
    JSON.stringify(product.specifications),
    10, // default stock
    "pending",
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  let urls: string[] = [];

  if (args.includes("--file")) {
    const fileIdx = args.indexOf("--file") + 1;
    if (fileIdx >= args.length) {
      console.error("❌ --file requires a path argument");
      process.exit(1);
    }
    const filePath = args[fileIdx];
    const content = fs.readFileSync(filePath, "utf-8");
    urls = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && l.startsWith("http"));
  } else {
    urls = args.filter((a) => a.startsWith("http"));
  }

  if (urls.length === 0) {
    console.log(`
🔧 AliExpress Product Scraper for Orisup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
  npx tsx scripts/aliexpress-scraper.ts <url1> [url2] ...
  npx tsx scripts/aliexpress-scraper.ts --file urls.txt

Config (via .env):
  ALI_USD_TO_BDT_RATE=${USD_TO_BDT}
  ALI_MARKUP_MULTIPLIER=${MARKUP}

Current settings:
  Exchange rate: 1 USD = ${USD_TO_BDT} BDT
  Markup: ${MARKUP}x
  Selling price formula: USD × ${USD_TO_BDT} × ${MARKUP}
    `);
    process.exit(0);
  }

  console.log(`\n🚀 AliExpress Scraper — Starting`);
  console.log(`   Rate: 1 USD = ${USD_TO_BDT} BDT | Markup: ${MARKUP}x`);
  console.log(`   Products to scrape: ${urls.length}\n`);

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${ i + 1}/${urls.length}] ──────────────────────────────────────`);

    try {
      const product = await scrapeAliExpressProduct(url);
      const id = await saveToDb(pool, product);

      console.log(`  ✅ Saved! ID: ${id}`);
      console.log(`  💰 USD: $${product.original_price_usd} → BDT: ৳${product.selling_price_bdt}`);
      console.log(`  🔖 Variants: ${product.variants.length} | Specs: ${product.specifications.length}`);
      success++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    // Delay between requests to avoid rate-limiting
    if (i < urls.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  await pool.end();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Done! Success: ${success} | Failed: ${failed}`);
  console.log(`\n📊 View scraped products:`);
  console.log(`   npx tsx scripts/scraper-dashboard.ts`);
  console.log(`   Then open http://localhost:5099\n`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
