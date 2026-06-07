import { z } from "zod";
import type { Category } from "@shared/schema";
import type { CategoryNode } from "@shared/categoryTree";
import { openAiResponsesPlainText, openAiStructuredOutput, openAiWebSearchEnabled } from "./openai";

/** Minimal tree sent to OpenAI — ids match `categories.id` rows (root / sub / leaf). */
export type CategoryCatalogAiNode = {
  id: string;
  name: string;
  /** 0 = category, 1 = subcategory, 2 = sub-subcategory (deepest; preferred when it fits). */
  depth: number;
  children: CategoryCatalogAiNode[];
};

export function toCategoryCatalogForAi(nodes: CategoryNode<Category>[], depth = 0): CategoryCatalogAiNode[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    depth,
    children: toCategoryCatalogForAi(n.children, depth + 1),
  }));
}

export function collectCategoryCatalogIds(nodes: CategoryCatalogAiNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (n: CategoryCatalogAiNode) => {
    ids.add(n.id);
    for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return ids;
}

export type ImportedProductInput = {
  sourceUrl: string;
  sourceHost: string;
  title: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  description: string;
  images: string[];
};

export type ProductEnhanceRequest = {
  imported: ImportedProductInput;
  /** Optional admin instructions (tone, emphasis, what to include/avoid). */
  userInstructions?: string | null;
  brandContext: {
    siteDisplayName: string;
    siteTitle: string;
    siteDescription: string;
    siteKeywords: string;
    storefrontTheme: string;
    storefrontTemplate: string;
  };
  /** Full storefront category tree — when non-empty, the model selects the best-matching catalog id. */
  categoryCatalog: CategoryCatalogAiNode[];
};

const aiSchema = z.object({
  title: z.string().min(3).max(220),
  shortDescriptionEn: z.string().min(10).max(700),
  shortDescriptionBn: z.string().min(10).max(900),
  /** Short, meaningful narrative for the product description area (hard cap 1200 chars). */
  descriptionHtmlEn: z.string().min(20).max(1200),
  descriptionHtmlBn: z.string().min(20).max(1200),
  keyFeaturesEn: z.array(z.string().min(2).max(220)).max(14),
  keyFeaturesBn: z.array(z.string().min(2).max(260)).max(14),
  specs: z.array(z.object({ label: z.string().min(1).max(120), value: z.string().min(1).max(500) })).max(30),
  generalInformationHtmlEn: z.string().min(10).max(2200),
  generalInformationHtmlBn: z.string().min(10).max(2600),
  seo: z.object({
    titleEn: z.string().min(8).max(180),
    descriptionEn: z.string().min(30).max(320),
    keywordsEn: z.string().min(5).max(480),
    titleBn: z.string().min(8).max(220),
    descriptionBn: z.string().min(30).max(420),
    keywordsBn: z.string().min(5).max(520),
  }),
  imageReview: z.object({
    bestPrimaryIndex: z.number().int().nonnegative(),
    notes: z.string().min(3).max(700),
  }),
  categorySuggestion: z.object({
    /** Most specific matching node id from categoryCatalog — null if unsure or catalog empty. */
    leafCategoryId: z.union([z.string().uuid(), z.null()]),
  }),
});

export type ProductEnhanceOutput = z.infer<typeof aiSchema>;

export type ProductEnhanceResult = {
  ok: boolean;
  warning?: string;
  model?: string;
  enhanced?: ProductEnhanceOutput;
};

const ALLOWED_TAGS = new Set(["p", "h3", "ul", "li", "table", "tbody", "tr", "td", "strong"]);

function sanitizeLimitedHtml(html: string): string {
  let safe = html;
  safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  safe = safe.replace(/\sstyle\s*=\s*(['"]).*?\1/gi, "");
  safe = safe.replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi, (m, tagName: string) => {
    const lower = tagName.toLowerCase();
    return ALLOWED_TAGS.has(lower) ? m : "";
  });
  return safe.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bulletsToHtml(items: string[]): string {
  if (!items.length) return "";
  const lis = items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  return `<ul>${lis}</ul>`;
}

function buildSystemPrompt(): string {
  return [
    "You are a senior ecommerce merchandiser + copy editor for a multi-vendor marketplace (not the original retailer site that supplied the import).",
    "Return ONLY valid JSON that conforms to the schema.",
    "If the user payload includes userAdditionalInstructions (non-empty), follow those constraints in tone, focus, and what to emphasize or avoid, while still satisfying the schema and safety rules below.",
    "MANDATORY REBRANDING: brandContext names THIS marketplace. The import often comes from a third-party source (see imported.sourceHost). You MUST rebrand for our storefront:",
    "- Remove the source retailer, competitor, or their domain from titles, short descriptions, SEO, and product body copy. Do not present the listing as 'from' that store.",
    "- Do not use the source site name in first-person or 'we' as if you were that retailer. If you need a storefront identity, use brandContext.siteDisplayName (or the marketplace positioning implied by brandContext) — never the competitor.",
    "- Replace phrases like 'at [competitor]', 'Sold by [competitor]', or '[competitor] offers' with neutral marketplace-appropriate text (e.g. shopping on this marketplace, Orlenbd [or siteDisplayName] marketplace, verified sellers) unless a fact (e.g. brand of the product itself like ASUS) is a manufacturer brand.",
    "- Manufacturer / product-line brands in the data (e.g. AMD, Samsung) may stay. Retailer/shop names from the source URL must not appear as the seller of record.",
    "Goals:",
    "1) Use the noisy imported HTML/text plus any webResearchNotes (if provided) to infer accurate, shopper-ready copy.",
    "2) Produce bilingual EN + BN content and SEO fields.",
    "3) descriptionHtmlEn / descriptionHtmlBn: SHORT, meaningful product story, max 1200 characters each; use <p> for paragraphs only; no duplicate blocks from the import.",
    "   No site navigation, cart, unrelated products, 'Compare', EMI blocks, or third-party boilerplate.",
    "4) keyFeatures: plain strings, one 'Label: value' style line per string when it helps; otherwise a crisp feature sentence. Arrays only, no HTML.",
    "5) specs: label/value rows for a specifications table; technical or measurable facts (not long prose).",
    "6) generalInformationHtmlEn/Bn: compact (1–3 <p> blocks) — warranty, returns, in-box, region; or <p>Not specified on materials we found.</p>.",
    "7) Pick bestPrimaryIndex over imported image URLs (0 = first image).",
    "8) categoryCatalog / categorySuggestion:",
    "- When categoryCatalog has nodes (see user JSON), categorySuggestion.leafCategoryId MUST be exactly one catalog id from categoryCatalog or null if truly uncertain.",
    "- Each node has depth: 0 = root category only, 1 = subcategory, 2 = sub-subcategory (leaf tier).",
    "- MANDATORY priority when choosing leafCategoryId: (1) FIRST prefer a matching depth-2 (sub-subcategory) id; (2) if no depth-2 node fits well, choose a matching depth-1 (subcategory) id; (3) ONLY if neither applies, choose a depth-0 (root category) id. Never pick a shallow node when a deeper descendant is an equally good or better semantic match.",
    "- categoryCatalog is a tree { id, name, depth, children }; every id is a valid catalog row.",
    "Rules:",
    "- Do not invent hard technical specs unless strongly implied; prefer 'Not specified' when unsure.",
    "- Keep claims realistic and non-deceptive.",
    "- HTML fields must use safe basic tags only: p, h3, ul, li, table, tbody, tr, td, strong.",
    "- Do not prefix description fields with 'EN:' or 'BN:'.",
  ].join("\n");
}

function buildUserPrompt(input: ProductEnhanceRequest, webResearchNotes: string): string {
  const extra = input.userInstructions?.trim();
  const catalog = input.categoryCatalog?.length ? input.categoryCatalog : null;
  return JSON.stringify(
    {
      brandContext: input.brandContext,
      imported: input.imported,
      categoryCatalog: catalog,
      webResearchNotes: webResearchNotes || null,
      userAdditionalInstructions: extra || null,
      instruction:
        "Produce final merchandised fields for this marketplace. Rebrand: strip competitor/source site branding; use brandContext.siteDisplayName for marketplace context where appropriate. Ignore navigation, footers, unrelated SKUs, and duplicate blocks from the import. For categorySuggestion: follow strict depth priority — sub-subcategory (depth 2) before subcategory (depth 1) before category (depth 0) whenever categoryCatalog is present.",
    },
    null,
    2,
  );
}

const jsonSchemaForOpenAi = {
  name: "product_enhance_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      shortDescriptionEn: { type: "string" },
      shortDescriptionBn: { type: "string" },
      descriptionHtmlEn: { type: "string" },
      descriptionHtmlBn: { type: "string" },
      keyFeaturesEn: { type: "array", items: { type: "string" } },
      keyFeaturesBn: { type: "array", items: { type: "string" } },
      specs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
      generalInformationHtmlEn: { type: "string" },
      generalInformationHtmlBn: { type: "string" },
      seo: {
        type: "object",
        additionalProperties: false,
        properties: {
          titleEn: { type: "string" },
          descriptionEn: { type: "string" },
          keywordsEn: { type: "string" },
          titleBn: { type: "string" },
          descriptionBn: { type: "string" },
          keywordsBn: { type: "string" },
        },
        required: ["titleEn", "descriptionEn", "keywordsEn", "titleBn", "descriptionBn", "keywordsBn"],
      },
      imageReview: {
        type: "object",
        additionalProperties: false,
        properties: {
          bestPrimaryIndex: { type: "integer" },
          notes: { type: "string" },
        },
        required: ["bestPrimaryIndex", "notes"],
      },
      categorySuggestion: {
        type: "object",
        additionalProperties: false,
        properties: {
          leafCategoryId: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
        },
        required: ["leafCategoryId"],
      },
    },
    required: [
      "title",
      "shortDescriptionEn",
      "shortDescriptionBn",
      "descriptionHtmlEn",
      "descriptionHtmlBn",
      "keyFeaturesEn",
      "keyFeaturesBn",
      "specs",
      "generalInformationHtmlEn",
      "generalInformationHtmlBn",
      "seo",
      "imageReview",
      "categorySuggestion",
    ],
  },
} as const;

async function gatherWebResearchNotes(input: ProductEnhanceRequest): Promise<string> {
  if (!openAiWebSearchEnabled()) return "";
  const userExtra = input.userInstructions?.trim();
  const research = await openAiResponsesPlainText({
    instructions: [
      "You have web search. Find authoritative pages about this exact product model.",
      "Summarize: key specs, box contents, ports, warranty region, and notable caveats.",
      "Do not write as the source retailer. Notes are for a marketplace listing — do not use the source store name as the seller. Output plain text bullet notes only (no JSON). Max ~1200 words.",
      userExtra ? `Prioritize information relevant to this user request: ${userExtra}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    input: [
      `Product title: ${input.imported.title}`,
      `Source listing URL: ${input.imported.sourceUrl}`,
      `Host: ${input.imported.sourceHost}`,
      `Noisy excerpt (trim mentally): ${input.imported.description.slice(0, 4000)}`,
      userExtra ? `User enhancement instructions (respect when choosing sources/angles): ${userExtra}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    tools: [{ type: "web_search_preview" }],
    /** Web research can be slow; allow generous time and retries (see openai.ts). */
    timeoutMs: 120_000,
    maxAttempts: 3,
  });
  if (!research.ok) return `(Web search unavailable: ${research.error})`;
  return research.text;
}

export async function enhanceImportedProductWithAi(
  input: ProductEnhanceRequest,
): Promise<ProductEnhanceResult> {
  let webNotes = "";
  if (openAiWebSearchEnabled()) {
    webNotes = await gatherWebResearchNotes(input);
  }

  const ai = await openAiStructuredOutput<ProductEnhanceOutput>({
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input, webNotes) },
    ],
    jsonSchema: jsonSchemaForOpenAi,
    /** Large structured product payload: use long per-attempt window + built-in retries in openai.ts */
    timeoutMs: 180_000,
    maxAttempts: 3,
  });

  if (!ai.ok) {
    return { ok: false, warning: ai.error, model: ai.model };
  }

  const parsed = aiSchema.safeParse(ai.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const detail = first
      ? `${first.path.length ? first.path.join(".") + ": " : ""}${first.message}`
      : "schema mismatch";
    return {
      ok: false,
      warning: `AI output failed validation — ${detail}`,
      model: ai.model,
    };
  }

  const imgLen = input.imported.images.length;
  const idx =
    imgLen === 0 ? 0 : Math.max(0, Math.min(parsed.data.imageReview.bestPrimaryIndex, imgLen - 1));

  const catalogIds = collectCategoryCatalogIds(input.categoryCatalog);
  let leafId = parsed.data.categorySuggestion.leafCategoryId;
  let categoryWarning: string | undefined;
  if (!catalogIds.size) {
    leafId = null;
  } else if (leafId !== null && !catalogIds.has(leafId)) {
    categoryWarning = "AI returned a category id not in the current catalog — ignored.";
    leafId = null;
  }

  const normalized: ProductEnhanceOutput = {
    ...parsed.data,
    descriptionHtmlEn: sanitizeLimitedHtml(parsed.data.descriptionHtmlEn),
    descriptionHtmlBn: sanitizeLimitedHtml(parsed.data.descriptionHtmlBn),
    generalInformationHtmlEn: sanitizeLimitedHtml(parsed.data.generalInformationHtmlEn),
    generalInformationHtmlBn: sanitizeLimitedHtml(parsed.data.generalInformationHtmlBn),
    imageReview: {
      ...parsed.data.imageReview,
      bestPrimaryIndex: idx,
    },
    categorySuggestion: { leafCategoryId: leafId },
  };

  return {
    ok: true,
    model: ai.model,
    enhanced: normalized,
    warning: categoryWarning,
  };
}
