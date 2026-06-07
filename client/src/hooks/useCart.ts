import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { CartLineRow } from "@/lib/types";
import { useCartFeedback } from "@/components/cart/CartFeedbackContext";

type CartResponse = { cartId: string; lines: CartLineRow[] };

export function useCart() {
  const qc = useQueryClient();
  const notify = useCartFeedback();
  const q = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiJson<CartResponse>("/api/cart"),
  });

  const setQty = useMutation({
    mutationFn: ({
      productId,
      quantity,
      variantId,
    }: {
      productId: string;
      quantity: number;
      variantId?: string | null;
    }) =>
      apiJson<CartResponse>("/api/cart/lines", {
        method: "POST",
        body: JSON.stringify({ productId, quantity, variantId: variantId ?? undefined }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      if (!notify) return;
      if (variables.quantity <= 0) notify("success", "Removed from cart");
      else if (variables.quantity > 1) notify("success", `Added ${variables.quantity} items to cart`);
      else notify("success", "Added to cart");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not update cart";
      notify?.("error", msg);
    },
  });

  const count = q.data?.lines.reduce((s, l) => s + l.line.quantity, 0) ?? 0;

  return { ...q, count, setQty };
}
