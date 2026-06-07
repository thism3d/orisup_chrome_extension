import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { CategoryNode } from "@/lib/types";

/**
 * Storefront category tree (root > sub > sub-sub).
 * Cached under `["categories-tree"]` so any mutation in admin can invalidate
 * both this and the legacy flat `["categories"]` key in one call.
 */
export function useCategoryTree() {
  return useQuery({
    queryKey: ["categories-tree"],
    queryFn: () => apiJson<CategoryNode[]>("/api/categories/tree"),
    staleTime: 60_000,
  });
}
