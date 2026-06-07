import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function useWishlistCheck(productId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist-check", productId],
    queryFn: () => apiJson<{ inWishlist: boolean }>(`/api/wishlist/check/${productId}`),
    enabled: Boolean(user && productId),
  });
}

export function useWishlistToggle(productId: string | undefined) {
  const { user } = useAuth();
  const [, setLoc] = useLocation();
  const qc = useQueryClient();
  const checkQ = useWishlistCheck(productId);

  const toggle = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("No product");
      return apiJson<{ added: boolean }>("/api/wishlist/toggle", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
      void qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      if (productId) void qc.invalidateQueries({ queryKey: ["wishlist-check", productId] });
    },
  });

  const requireLoginAndToggle = () => {
    if (!user) {
      setLoc(`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`);
      return;
    }
    toggle.mutate();
  };

  return {
    inWishlist: checkQ.data?.inWishlist ?? false,
    toggle: () => requireLoginAndToggle(),
    busy: toggle.isPending,
    isLoggedIn: Boolean(user),
  };
}
