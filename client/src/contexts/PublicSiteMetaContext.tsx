import { createContext, useContext, type ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

const PublicSiteMetaContext = createContext<Record<string, string> | undefined>(undefined);

export function PublicSiteMetaProvider({
  value,
  children,
}: {
  value: Record<string, string> | undefined;
  children: ReactNode;
}) {
  return <PublicSiteMetaContext.Provider value={value}>{children}</PublicSiteMetaContext.Provider>;
}

/** Public storefront settings from `/api/public/site-meta` (undefined outside `StoreLayout`). */
export function usePublicSiteMeta(): Record<string, string> | undefined {
  return useContext(PublicSiteMetaContext);
}

/** Display name for copy and title suffix; falls back to `SITE_NAME`. */
export function useSiteBrand(): string {
  const m = usePublicSiteMeta();
  return m?.site_display_name?.trim() || SITE_NAME;
}
