import { Box, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import { ProductRowSwiper } from "@/components/ui/ProductRowSwiper";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import type { ProductListRow } from "@/lib/types";
import { CountdownTimer, useFlashSaleEnd } from "./CountdownTimer";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

type Props = {
  items: ProductListRow[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

export function SuperDealsSection({ items, isLoading, isError, errorMessage, onRetry }: Props) {
  const { text } = useStorefrontLanguage();
  const end = useFlashSaleEnd();
  const slice = items.slice(0, 8);

  return (
    <Box
      sx={(t) => ({
        background: `linear-gradient(180deg, ${alpha(storefrontBrandMain(t), 0.14)} 0%, ${alpha(storefrontBrandMain(t), 0.04)} 42%, rgba(247,247,247,0.98) 55%, #f7f7f7 100%)`,
        borderRadius: { xs: 0, md: 3 },
        py: { xs: 2, md: 4.5 },
        px: { xs: 0, md: 0 },
        border: { xs: "none", md: `1px solid ${alpha(storefrontBrandMain(t), 0.38)}` },
        boxShadow: { xs: "none", md: "0 28px 72px rgba(11,11,11,0.07)" },
        borderBottom: { xs: `1px solid ${alpha(storefrontBrandMain(t), 0.12)}`, md: "none" },
      })}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1.25, md: 2.5 }, gap: { xs: 1.25, md: 2 }, px: { xs: 1.5, sm: 0 } }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" fontWeight={800} sx={{ color: "primary.main", letterSpacing: 2 }}>
              {text("Super deals", "সুপার অফার")}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
              {text("Flash sale", "ফ্ল্যাশ সেল")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {text(
                "Limited-time prices from verified vendors — ends this week.",
                "যাচাইকৃত বিক্রেতাদের সীমিত সময়ের দাম—এই সপ্তাহেই শেষ।",
              )}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <CountdownTimer target={end} />
            <Typography
              component={Link}
              href="/shop"
              variant="body2"
              fontWeight={700}
              sx={{
                color: "text.primary",
                textDecoration: "none",
                position: "relative",
                py: 0.5,
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: "100%",
                  height: 2,
                  bgcolor: "brand.main",
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.25s ease",
                },
                "&:hover::after": { transform: "scaleX(1)" },
              }}
            >
              {text("View all →", "সব দেখুন ›")}
            </Typography>
          </Stack>
        </Stack>
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : isError ? (
          <CatalogEmptyHint isError message={errorMessage} onRetry={onRetry} />
        ) : slice.length === 0 ? (
          <CatalogEmptyHint onRetry={onRetry} />
        ) : (
          <ProductRowSwiper items={slice} showDiscountBadge flashSaleStyle eagerCount={3} />
        )}
      </Container>
    </Box>
  );
}
