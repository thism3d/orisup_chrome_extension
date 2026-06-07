import { Helmet } from "react-helmet-async";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";
import { SITE_NAME, absoluteUrl, getSiteUrl, mediaAbsoluteUrl } from "@/lib/site";

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

type Props = {
  title: string;
  /** If omitted, uses platform `site_description` from `/api/public/site-meta` when inside the storefront layout, then the built-in default. */
  description?: string;
  /** Overrides default keyword merge; when omitted on indexable pages, platform `site_keywords` is used. */
  keywords?: string;
  /** Path only, e.g. `/shop` — builds canonical URL */
  canonicalPath?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: "website" | "product" | "article";
  jsonLd?: JsonLd;
};

const DEFAULT_DESC =
  "Orlenbd — Bangladesh multi-vendor marketplace. Electronics, fashion, home, groceries & more. Cash on delivery.";

export function Seo({
  title,
  description,
  keywords,
  canonicalPath,
  noindex,
  ogImage,
  ogType = "website",
  jsonLd,
}: Props) {
  const meta = usePublicSiteMeta();
  const brandName = meta?.site_display_name?.trim() || SITE_NAME;
  const resolvedDescription =
    description?.trim() || meta?.site_description?.trim() || DEFAULT_DESC;
  const resolvedKeywords =
    keywords?.trim() || (!noindex ? meta?.site_keywords?.trim() : undefined) || undefined;
  const resolvedOg =
    ogImage?.trim() ||
    mediaAbsoluteUrl(meta?.og_image_url?.trim() || meta?.logo_url) ||
    absoluteUrl("/orlenbd-logo.png");

  const alreadySuffixed =
    title.includes(brandName) || title.includes(SITE_NAME);
  const fullTitle = alreadySuffixed ? title : `${title} | ${brandName}`;
  const canonical = canonicalPath ? absoluteUrl(canonicalPath) : undefined;
  const og = resolvedOg;
  const site = getSiteUrl();

  const graph =
    jsonLd == null
      ? null
      : Array.isArray(jsonLd)
        ? { "@context": "https://schema.org", "@graph": jsonLd }
        : jsonLd;
  const ldJson = graph ? JSON.stringify(graph) : null;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {resolvedKeywords ? <meta name="keywords" content={resolvedKeywords} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}
      />
      <meta property="og:site_name" content={brandName} />
      <meta property="og:locale" content="en_BD" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:type" content={ogType} />
      {canonical ? <meta property="og:url" content={canonical} /> : <meta property="og:url" content={site} />}
      {og ? <meta property="og:image" content={og} /> : null}
      {og ? <meta property="og:image:alt" content={title} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      {og ? <meta name="twitter:image" content={og} /> : null}
      {ldJson ? (
        <script type="application/ld+json" data-orlenbd-jsonld>
          {ldJson}
        </script>
      ) : null}
    </Helmet>
  );
}
