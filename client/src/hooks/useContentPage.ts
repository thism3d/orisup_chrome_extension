import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStorefrontContact } from "@/hooks/useStorefrontContact";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import {
  CONTENT_PAGE_DEFAULTS,
  applyContentPageTokens,
  type BrandTrustSlug,
} from "../../../shared/contentPageDefaults";

type ContentPagePayload = {
  slug: BrandTrustSlug;
  kicker: string;
  en: { title: string; intro: string; body: string; metaDescription: string };
  bn: { title: string; intro: string; body: string; metaDescription: string };
  updatedAt: string;
};

export type ContentPageView = {
  slug: BrandTrustSlug;
  kicker: string;
  title: string;
  intro: string;
  body: string;
  metaDescription: string;
  isLoading: boolean;
};

/** Picks Bangla when language is BN and a non-empty BN value exists, otherwise English. */
function pickWithFallback(lang: "en" | "bn", en: string, bn: string): string {
  if (lang === "bn" && bn.trim()) return bn;
  return en;
}

/**
 * Resolves the live content for a Brand Trust page.
 *
 * Order of precedence:
 *   1. Server response (admin-edited row) with `{{brand}}/{{phone}}/{{email}}/{{address}}`
 *      tokens already substituted from `platform_settings`.
 *   2. Bundled default copy from `shared/contentPageDefaults.ts`, with tokens substituted
 *      client-side from `useStorefrontContact()`. This keeps SSR/initial paint correct
 *      even before the API responds.
 */
export function useContentPage(slug: BrandTrustSlug): ContentPageView {
  const { lang } = useStorefrontLanguage();
  const brand = useSiteBrand();
  const contact = useStorefrontContact();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/public/content-pages", slug],
    queryFn: () => apiJson<ContentPagePayload>(`/api/public/content-pages/${slug}`),
    staleTime: 1000 * 60,
    retry: false,
  });

  return useMemo(() => {
    const def = CONTENT_PAGE_DEFAULTS[slug];
    const tokens = {
      brand,
      phone: contact.supportPhoneDisplay || "",
      email: contact.supportEmail || "",
      address: contact.addressBlock || "",
    };
    const fallbackTitle = pickWithFallback(lang, def.titleEn, def.titleBn);
    const fallbackIntro = pickWithFallback(lang, def.introEn, def.introBn);
    const fallbackBody = pickWithFallback(lang, def.bodyEn, def.bodyBn);
    const fallbackMeta = pickWithFallback(lang, def.metaDescriptionEn, def.metaDescriptionBn);

    if (!data || isError) {
      return {
        slug,
        kicker: def.kicker,
        title: applyContentPageTokens(fallbackTitle, tokens),
        intro: applyContentPageTokens(fallbackIntro, tokens),
        body: applyContentPageTokens(fallbackBody, tokens),
        metaDescription: applyContentPageTokens(fallbackMeta, tokens),
        isLoading,
      };
    }

    const title = pickWithFallback(lang, data.en.title, data.bn.title) || applyContentPageTokens(fallbackTitle, tokens);
    const intro = pickWithFallback(lang, data.en.intro, data.bn.intro);
    const body = pickWithFallback(lang, data.en.body, data.bn.body);
    const metaDescription = pickWithFallback(lang, data.en.metaDescription, data.bn.metaDescription);

    return {
      slug,
      kicker: data.kicker || def.kicker,
      title,
      intro,
      body,
      metaDescription,
      isLoading: false,
    };
  }, [brand, contact.addressBlock, contact.supportEmail, contact.supportPhoneDisplay, data, isError, isLoading, lang, slug]);
}

/** Lightweight index (slug + enabled) used by footers / sitemaps. */
type ContentPagesIndex = {
  items: Array<{ slug: BrandTrustSlug; enabled: boolean; titleEn: string; titleBn: string }>;
};

export function useContentPagesIndex() {
  return useQuery({
    queryKey: ["/api/public/content-pages"],
    queryFn: () => apiJson<ContentPagesIndex>("/api/public/content-pages"),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
