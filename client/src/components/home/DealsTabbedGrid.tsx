import { Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { ProductRowSwiper } from "@/components/ui/ProductRowSwiper";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import type { ProductListRow } from "@/lib/types";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

type Props = {
  byTab: { label: string; slug?: string; items: ProductListRow[] }[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

export function DealsTabbedGrid({ byTab, isLoading, isError, errorMessage, onRetry }: Props) {
  const { text } = useStorefrontLanguage();
  const [i, setI] = useState(0);
  const tab = byTab[i] ?? byTab[0];
  const items = tab?.items ?? [];
  const anyProducts = byTab.some((t) => t.items.length > 0);

  return (
    <>
      <SectionHeading title={text("Explore best deals", "সেরা অফার দেখুন")} />
      <Tabs
        value={i}
        onChange={(_, v) => setI(v)}
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          minHeight: { xs: 48, sm: 44 },
          px: { xs: 0, sm: 0 },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: "3px 3px 0 0",
            bgcolor: "brand.main",
          },
          "& .MuiTab-root": {
            fontWeight: 700,
            textTransform: "none",
            minHeight: 48,
            px: { xs: 1.5, sm: 2 },
            fontSize: { xs: "0.85rem", sm: "0.875rem" },
            transition: "color 0.2s ease, background 0.2s ease",
            borderRadius: 1,
            "&.Mui-selected": { color: "primary.main" },
          },
          "& .MuiTabs-scrollButtons": {
            borderRadius: 1,
            "&.Mui-disabled": { opacity: 0.25 },
          },
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {byTab.map((t, idx) => (
          <Tab key={t.label} label={t.label} value={idx} />
        ))}
      </Tabs>
      {isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : isError ? (
        <CatalogEmptyHint isError message={errorMessage} onRetry={onRetry} />
      ) : !anyProducts ? (
        <CatalogEmptyHint onRetry={onRetry} />
      ) : items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No items in this tab — try another category above.
        </Typography>
      ) : (
        <ProductRowSwiper items={items} showDiscountBadge eagerCount={3} />
      )}
    </>
  );
}
