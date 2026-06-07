import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiJson } from "@/lib/api";
import type { ProductListRow } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { getRecentProductIdsLocal } from "@/lib/recentlyViewedLocal";
import { ProductRailSection } from "@/components/home/ProductRailSection";

type RecResponse = { items: ProductListRow[] };

export function ProductPageDiscovery({ excludeProductId }: { excludeProductId: string }) {
  const { user } = useAuth();
  const recentParam = useMemo(() => {
    const local = getRecentProductIdsLocal().filter((id) => id !== excludeProductId);
    const merged = [excludeProductId, ...local].slice(0, 20);
    return merged.join(",");
  }, [excludeProductId]);

  const recQ = useQuery({
    queryKey: ["recommendations", "pdp", user?.id, recentParam],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "10" });
      if (!user && recentParam) p.set("recent", recentParam);
      return apiJson<RecResponse>(`/api/recommendations?${p}`);
    },
  });

  const recItems = useMemo(
    () => (recQ.data?.items ?? []).filter((r) => r.product.id !== excludeProductId).slice(0, 8),
    [recQ.data?.items, excludeProductId]
  );

  return (
    <ProductRailSection
      title="Recommended for you"
      subtitle="Based on your browsing, wishlist, and orders."
      items={recItems}
      isLoading={recQ.isLoading}
    />
  );
}
