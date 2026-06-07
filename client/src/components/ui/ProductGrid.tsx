import { Grid } from "@mui/material";
import { ProductCard } from "./ProductCard";
import type { ProductListRow } from "@/lib/types";

type Props = {
  items: ProductListRow[];
  showNew?: boolean;
  showDiscountBadge?: boolean;
  /** First N cards eagerly load with fetchPriority=high (use only on above-the-fold grids). */
  eagerCount?: number;
};

export function ProductGrid({ items, showNew, showDiscountBadge, eagerCount = 0 }: Props) {
  return (
    <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
      {items.map((row, i) => (
        <Grid item xs={6} sm={4} md={3} key={row.product.id}>
          <ProductCard
            row={row}
            showNew={showNew}
            showDiscountBadge={showDiscountBadge}
            eager={i < eagerCount}
          />
        </Grid>
      ))}
    </Grid>
  );
}
