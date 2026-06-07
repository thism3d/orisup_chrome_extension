import { Box, Skeleton, Stack } from "@mui/material";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductListRow } from "@/lib/types";

type Props = {
  title: string;
  subtitle?: string;
  items: ProductListRow[];
  isLoading?: boolean;
  showDiscountBadge?: boolean;
  eagerCount?: number;
};

export function ProductRailSection({
  title,
  subtitle,
  items,
  isLoading,
  showDiscountBadge = true,
  eagerCount = 0,
}: Props) {
  if (!isLoading && items.length === 0) return null;

  return (
    <Box sx={{ py: { xs: 1, md: 2 } }}>
      <SectionHeading title={title} subtitle={subtitle} />
      {isLoading ? (
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
      ) : (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            overflowX: "auto",
            pb: 1,
            mx: { xs: -1, sm: 0 },
            px: { xs: 1, sm: 0 },
            scrollSnapType: "x mandatory",
            "& > *": { scrollSnapAlign: "start" },
          }}
        >
          {items.map((row, idx) => (
            <Box
              key={row.product.id}
              sx={{
                width: { xs: "46%", sm: 200, md: 220 },
                maxWidth: 240,
                flex: "0 0 auto",
              }}
            >
              <ProductCard row={row} showDiscountBadge={showDiscountBadge} eager={idx < eagerCount} />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
