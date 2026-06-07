/**
 * Orisup AliExpress Scraper Core
 * Shared scraping utilities for extracting product data from AliExpress pages
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function normalizeMoneyString(raw) {
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

function parseMoney(raw) {
  if (!raw || typeof raw !== "string") return 0;
  const matches = String(raw).match(/([0-9]+(?:[.,][0-9]+)*)/g);
  if (!matches?.length) return 0;
  const prices = matches
    .map((part) => Number(normalizeMoneyString(part)))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100000);
  return prices.length ? Math.max(...prices) : 0;
}

function isPlausiblePrice(value) {
  return Number.isFinite(value) && value > 0 && value < 10000;
}

function findPriceInText(text) {
  if (!text || typeof text !== "string") return 0;

  const currencyRegex = /(?:US\$|USD|\$|EUR|€|£|Rs\.|₹|৳)\s*[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?/g;
  const currencyMatches = text.match(currencyRegex) || [];
  const currencyPrices = currencyMatches
    .map((candidate) => parseMoney(candidate))
    .filter(isPlausiblePrice);
  if (currencyPrices.length) return Math.max(...currencyPrices);

  const contextRegex = /(?:price|amount|currentprice|minprice|discountprice|sale price|special price|offer price|list price|our price|was|now)[^0-9]{0,60}([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)/ig;
  const contextPrices = [];
  let contextMatch;
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

function extractPriceFromDoc(doc) {
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
    const el = doc.querySelector(selector);
    if (!el) continue;
    const raw = el.getAttribute("content") || el.textContent || "";
    const amount = parseMoney(raw);
    if (amount) return amount;
  }

  const bodyText = doc.body?.textContent || "";
  return findPriceInText(bodyText);
}

function extractProductIdFromUrl(url) {
  const m = url.match(/\/item\/(\d+)/);
  if (m) return m[1];
  const m2 = url.match(/\/(\d{8,15})\.html/);
  if (m2) return m2[1];
  return "";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  let clean = url.trim();
  if (clean.startsWith("//")) clean = "https:" + clean;
  // Remove size suffixes to get master image
  clean = clean.replace(/_[0-9]+x[0-9]+[a-z]*\.(?:jpg|png|webp|gif).*$/i, "");
  clean = clean.replace(/_[0-9]+x[0-9]+.*$/i, "");
  return clean;
}

// ── Embedded JSON Extraction ─────────────────────────────────────────────────

function extractEmbeddedJson(html) {
  // Try window.runParams (older AliExpress pages)
  const runParamsMatch = html.match(/window\.runParams\s*=\s*\{/);
  if (runParamsMatch) {
    const start = html.indexOf("{", runParamsMatch.index);
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
    const start = html.indexOf("{", dcDataMatch.index);
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
    let searchBack = dataMatch.index;
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

// ── Runtime Data Capture ─────────────────────────────────────────────────────

function captureRuntimeData() {
  const seen = new WeakSet();
  const safeCopy = (value, depth = 0) => {
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
        const copy = {};
        for (const key of Object.keys(value)) {
          try {
            const item = value[key];
            const safeItem = safeCopy(item, depth + 1);
            if (safeItem !== undefined) copy[key] = safeItem;
          } catch { /* ignore getter/proxy errors */ }
        }
        return copy;
      } catch { return null; }
    }
    return null;
  };

  const windowData = {};
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
      const value = window[key];
      if (value !== undefined) {
        windowData[key] = safeCopy(value);
      }
    } catch { /* ignore */ }
  }

  return windowData;
}

// ── Main Scrape Function ─────────────────────────────────────────────────────

async function scrapeAliExpressProduct() {
  const url = window.location.href;
  const productId = extractProductIdFromUrl(url);
  const html = document.documentElement.innerHTML;

  // Capture runtime data from page
  const runtimeData = captureRuntimeData();
  const embedded = extractEmbeddedJson(html) || {};

  // ── Title ──
  let title = "";

  // From JSON-LD
  const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const el of ldScripts) {
    try {
      const ld = JSON.parse(el.textContent);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item?.["@type"]?.toLowerCase?.()?.includes("product") && item.name) {
          title = String(item.name).trim();
        }
      }
    } catch { /* skip */ }
  }

  if (!title) {
    title = (
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document.querySelector('meta[name="title"]')?.getAttribute("content") ||
      document.querySelector("h1")?.textContent ||
      document.title ||
      ""
    ).trim();
  }

  // Try from embedded data
  if (!title && embedded) {
    const walkForKey = (obj, key) => {
      if (!obj || typeof obj !== "object") return "";
      if (typeof obj[key] === "string" && obj[key]) return obj[key];
      for (const v of Object.values(obj)) {
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

  // ── Price ──
  let priceUsd = 0;
  let scrapedCurrency = "USD";

  // From JSON-LD offers
  for (const el of ldScripts) {
    try {
      const ld = JSON.parse(el.textContent);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item?.offers) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers?.price) {
            priceUsd = parseMoney(String(offers.price));
            if (offers.priceCurrency) scrapedCurrency = offers.priceCurrency;
            if (priceUsd) break;
          }
        }
      }
    } catch { /* skip */ }
  }

  if (!priceUsd) {
    priceUsd = extractPriceFromDoc(document);
  }

  // Try embedded data
  if (!priceUsd && embedded) {
    const walkForPrice = (obj) => {
      if (!obj || typeof obj !== "object") return 0;
      for (const key of ["minPrice", "formattedPrice", "minAmount", "actMinPrice", "discountPrice", "price", "value"]) {
        if (obj[key]) {
          const p = parseMoney(String(obj[key]));
          if (p > 0) return p;
        }
      }
      for (const v of Object.values(obj)) {
        const found = walkForPrice(v);
        if (found) return found;
      }
      return 0;
    };
    priceUsd = walkForPrice(embedded);
  }

  // ── Images ──
  const imageUrls = new Set();

  // Global regex match across the entire HTML for all alicdn images
  const cdnRegex = /(?:https:)?\/\/[a-z0-9_.-]+\.alicdn\.com\/[a-z0-9\/_.-]+\.(?:jpg|png|webp)/gi;
  const matches = html.match(cdnRegex) || [];

  for (const m of matches) {
    let u = m.trim();
    if (u.startsWith("//")) u = "https:" + u;
    u = normalizeImageUrl(u);

    const lower = u.toLowerCase();
    if (!lower.includes("icon") && !lower.includes("logo") && !lower.includes("spinner") &&
        !lower.includes("tracking") && !lower.includes("banner") && !lower.includes("head") &&
        !lower.endsWith(".gif")) {
      imageUrls.add(u);
    }
  }

  // Also grab from og:image
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
  if (ogImage?.startsWith("http")) imageUrls.add(ogImage);

  // Grab from image gallery elements
  const gallerySelectors = [
    '.images-view-wrap img',
    '.image-viewer img',
    '.gallery-image img',
    '[data-pl="product-img"] img',
    '.magnifier-image',
    '.item-gallery img'
  ];
  for (const sel of gallerySelectors) {
    const imgs = document.querySelectorAll(sel);
    for (const img of imgs) {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-image');
      if (src) {
        const normalized = normalizeImageUrl(src);
        if (normalized) imageUrls.add(normalized);
      }
    }
  }

  const uniqueImages = Array.from(imageUrls).slice(0, 25);

  // ── Description ──
  let description = "";

  // Try to find description container
  const descSelectors = [
    '#nav-description',
    '#product-description',
    '.product-description',
    '.description',
    '#description',
    '.detail-desc',
    '#product-detail',
    '[id*="desc"]',
    '[class*="desc"]'
  ];

  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerHTML.trim().length > 200) {
      description = el.innerHTML;
      break;
    }
  }

  // Try meta description
  if (!description) {
    description = (
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      ""
    ).trim();
  }

  // ── Variants ──
  const variants = [];
  const seenVariantKeys = new Set();
  const normalizeValue = (value) => String(value || "").trim();

  const addVariant = (kind, name, value, price_usd = 0, image) => {
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

  const extractVariantFromNode = (obj) => {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj.skuPropertyList) || Array.isArray(obj.skuProperties) || Array.isArray(obj.skuProps)) {
      const list = obj.skuPropertyList || obj.skuProperties || obj.skuProps;
      for (const prop of list) {
        const name = normalizeValue(prop.skuPropertyName || prop.propertyName || prop.name || "Option");
        const kind = normalizeValue(name);
        const values = prop.skuPropertyValues || prop.propertyValueList || prop.propertyValues || prop.skuValues;
        if (Array.isArray(values)) {
          for (const v of values) {
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

    if (Array.isArray(obj.skuValueList)) {
      for (const v of obj.skuValueList) {
        const name = normalizeValue(v.name || obj.name || "Option");
        const value = normalizeValue(v.value || v.propertyValueDisplayName || v.propertyValueName || "");
        const image = normalizeImageUrl(v.imageUrl || v.imgUrl || v.imagePath || v.thumbnailUrl);
        const price = Number(v.price || v.priceUsd || 0) || priceUsd;
        addVariant(name, name, value, price, image);
      }
    }

    for (const v of Object.values(obj)) {
      if (typeof v === "object") extractVariantFromNode(v);
    }
  };

  if (embedded) extractVariantFromNode(embedded);
  if (runtimeData) extractVariantFromNode(runtimeData);

  // Also try DOM-based variant extraction
  const skuSelectors = [
    '.sku-property',
    '.sku-property-item',
    '[data-sku-property]',
    '.sku-item',
    '.property-item'
  ];
  for (const sel of skuSelectors) {
    const props = document.querySelectorAll(sel);
    for (const prop of props) {
      const titleEl = prop.querySelector('.sku-title, .property-title, .sku-name, [class*="title"]');
      const name = titleEl?.textContent?.trim() || "Option";
      const kind = name.toLowerCase().includes('color') ? 'color' :
                   name.toLowerCase().includes('size') ? 'size' : 'custom';

      const valueEls = prop.querySelectorAll('.sku-property-value, .property-value, .sku-value, [class*="value"], img');
      for (const vel of valueEls) {
        const value = vel.textContent?.trim() || vel.getAttribute('title') || vel.getAttribute('alt');
        const imgSrc = vel.getAttribute('src') || vel.getAttribute('data-src');
        if (value) {
          addVariant(kind, name, value, priceUsd, imgSrc);
        }
      }
    }
  }

  // ── Specifications ──
  const specifications = [];
  if (embedded) {
    const walkForSpecs = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj.productPropList) || Array.isArray(obj.properties)) {
        const list = obj.productPropList || obj.properties;
        for (const item of list) {
          const label = String(item.attrName || item.name || "");
          const value = String(item.attrValue || item.value || "");
          if (label && value) specifications.push({ label, value });
        }
      }
      for (const v of Object.values(obj)) {
        if (typeof v === "object") walkForSpecs(v);
      }
    };
    walkForSpecs(embedded);
  }

  // Also try table-based specs on the page
  if (specifications.length === 0) {
    const specRows = document.querySelectorAll('table.product-specs tr, .product-props li, [class*="specification"] li, .specification-item');
    for (const el of specRows) {
      const cells = el.querySelectorAll("td, span, [class*='name'], [class*='value']");
      if (cells.length >= 2) {
        const label = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();
        if (label && value) specifications.push({ label, value });
      }
    }
  }

  // ── Return Scraped Data ──
  return {
    source_url: url,
    source_host: new URL(url).hostname,
    ali_product_id: productId,
    title,
    slug: toSlug(title),
    description,
    original_price_usd: priceUsd,
    original_price_bdt: 0, // Calculated later
    selling_price_bdt: 0,  // Calculated later
    compare_at_price_bdt: 0, // Calculated later
    images: uniqueImages,
    downloaded_images: [], // Will be populated by image downloader
    variants,
    specifications,
  };
}

// ── Export for module use ────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.OrisupScraper = {
    scrapeAliExpressProduct,
    toSlug,
    parseMoney,
    normalizeImageUrl,
    extractProductIdFromUrl,
  };
}