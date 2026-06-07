import { useMemo } from "react";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";
import { resolveStorefrontContact } from "@/lib/storefrontContactFromMeta";

export function useStorefrontContact() {
  const meta = usePublicSiteMeta();
  return useMemo(() => resolveStorefrontContact(meta), [meta]);
}
