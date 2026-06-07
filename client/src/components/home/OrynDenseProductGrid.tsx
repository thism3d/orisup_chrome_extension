import { Box } from "@mui/material";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductListRow } from "@/lib/types";

type Props = {
  items: ProductListRow[];
  showDiscountBadge?: boolean;
  /** First N product images load eagerly (above-the-fold on large breakpoints). */
  eagerCount?: number;
};

/** Orynbd layout: wide marketplace grid (up to 5 columns on xl). */
export function OrynDenseProductGrid({ items, showDiscountBadge, eagerCount = 0 }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 1.5, sm: 2 },
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
          md: "repeat(4, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
      }}
    >
      {items.map((row, idx) => (
        <Box key={row.product.id} sx={{ minWidth: 0 }}>
          <ProductCard row={row} showDiscountBadge={showDiscountBadge} eager={idx < eagerCount} />
        </Box>
      ))}
    </Box>
  );
}
