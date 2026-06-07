import { type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { PublicSiteMetaProvider } from "@/contexts/PublicSiteMetaContext";
import { absoluteUrl, mediaAbsoluteUrl } from "@/lib/site";

/**
 * Fetches `/api/public/site-meta` once for admin/vendor portals so `useSiteBrand`, `Seo`, etc.
 * match the storefront. Also sets favicon when configured.
 */
export function PortalSiteMetaProvider({ children }: { children: ReactNode }) {
  const { data: siteMeta } = useQuery({
    queryKey: ["public-site-meta"],
    queryFn: () => apiJson<Record<string, string>>("/api/public/site-meta"),
    staleTime: 60_000,
  });

  const faviconHref = mediaAbsoluteUrl(siteMeta?.favicon_url) ?? absoluteUrl("/favicon.svg");

  return (
    <PublicSiteMetaProvider value={siteMeta}>
      <Helmet>
        <link rel="icon" href={faviconHref} type="image/svg+xml" />
      </Helmet>
      {children}
    </PublicSiteMetaProvider>
  );
}
