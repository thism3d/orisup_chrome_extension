import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { ProductListRow } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { getRecentProductIdsLocal } from "@/lib/recentlyViewedLocal";
import { ProductRailSection } from "@/components/home/ProductRailSection";

type RecResponse = { items: ProductListRow[] };

export function HomePersonalRails() {
  const { user } = useAuth();
  const recentParam = getRecentProductIdsLocal()
    .slice(0, 20)
    .join(",");

  const recQ = useQuery({
    queryKey: ["recommendations", "home", user?.id ?? "guest", recentParam],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "12" });
      if (!user && recentParam) p.set("recent", recentParam);
      return apiJson<RecResponse>(`/api/recommendations?${p}`);
    },
    staleTime: 60_000,
  });

  const viewedQ = useQuery({
    queryKey: ["recently-viewed-home", user?.id ?? "guest", recentParam],
    queryFn: async () => {
      if (user) return apiJson<RecResponse>("/api/me/recently-viewed?limit=12");
      if (!recentParam) return { items: [] };
      return apiJson<RecResponse>(`/api/products/by-ids?ids=${encodeURIComponent(recentParam)}`);
    },
    staleTime: 60_000,
  });

  return (
    <>
      <ProductRailSection
        title="Recently viewed"
        subtitle="Products you opened recently on this device."
        items={viewedQ.data?.items ?? []}
        isLoading={viewedQ.isLoading}
        eagerCount={4}
      />
      <ProductRailSection
        title="Recommended for you"
        subtitle="Inspired by your wishlist, history, and past orders."
        items={recQ.data?.items ?? []}
        isLoading={recQ.isLoading}
      />
    </>
  );
}
