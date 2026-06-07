import {
  Avatar,
  Breadcrumbs,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { ProductListResponse } from "@/lib/types";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { mediaAbsoluteUrl } from "@/lib/site";
import {
  storefrontListingToolbarPaperSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
  storefrontVendorHeroPaperSx,
} from "@/lib/storefrontUiSurface";

type VendorPub = { name: string; slug: string; logoUrl?: string | null };

export function VendorStorePage() {
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const theme = useTheme();
  const { uiTemplate, containerMaxWidth } = useStorefrontUiTemplate();
  const [, params] = useRoute("/v/:slug");
  const slug = params?.slug ?? "";

  const vendorQ = useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => apiJson<VendorPub>(`/api/vendors/${slug}`),
    enabled: Boolean(slug),
  });

  const productsQ = useQuery({
    queryKey: ["vendor-products", slug],
    queryFn: () => apiJson<ProductListResponse>(`/api/products?vendor=${encodeURIComponent(slug)}`),
    enabled: Boolean(slug) && vendorQ.isSuccess,
    select: (r) => r.items,
  });

  const vendor = vendorQ.data;
  const items = productsQ.data ?? [];

  if (vendorQ.isLoading) {
    return (
      <>
        <Seo title={text("Store", "স্টোর")} description={text(`Loading seller storefront on ${brand}.`, `${brand}-এ বিক্রেতার স্টোরফ্রন্ট লোড হচ্ছে।`)} />
        <Container maxWidth={containerMaxWidth} sx={{ py: 3 }}>
          <Skeleton width={280} height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
          <ProductGridSkeleton count={8} />
        </Container>
      </>
    );
  }

  if (vendorQ.isError || !vendor) {
    return (
      <>
        <Seo title={text("Store not found", "স্টোর পাওয়া যায়নি")} description={text(`This seller store is not available on ${brand}.`, `${brand}-এ এই বিক্রেতার স্টোর উপলব্ধ নয়।`)} />
        <FadeInSection>
          <Container maxWidth={containerMaxWidth} sx={{ py: 3 }}>
            <CatalogEmptyHint
              isError
              message={vendorQ.error instanceof Error ? vendorQ.error.message : text("This store is not available.", "এই স্টোরটি উপলব্ধ নয়।")}
              onRetry={() => void vendorQ.refetch()}
            />
            <Button component={Link} href="/shop" variant="contained" sx={{ mt: 2 }}>
              {text("Browse all shops", "সব দোকান দেখুন")}
            </Button>
          </Container>
        </FadeInSection>
      </>
    );
  }

  const initials = vendor.name.slice(0, 2).toUpperCase();

  return (
    <>
      <Seo
        title={text(`${vendor.name} — Store`, `${vendor.name} — স্টোর`)}
        description={text(`Shop products from ${vendor.name} on ${brand}. Verified seller with delivery across Bangladesh.`, `${brand}-এ ${vendor.name} থেকে পণ্য কিনুন। সারা দেশে ডেলিভারি—যাচাইকৃত বিক্রেতা।`)}
        canonicalPath={`/v/${slug}`}
        ogImage={mediaAbsoluteUrl(vendor.logoUrl ?? undefined)}
      />
    <FadeInSection>
      <Container maxWidth={containerMaxWidth} sx={{ py: 3 }}>
        <Paper elevation={0} sx={storefrontListingToolbarPaperSx(uiTemplate)}>
          <Breadcrumbs aria-label="breadcrumb">
            <MuiLink component={Link} href="/" underline="hover" color="inherit" fontWeight={600}>
              {text("Home", "হোম")}
            </MuiLink>
            <MuiLink component={Link} href="/shop" underline="hover" color="inherit" fontWeight={600}>
              {text("Shop", "শপ")}
            </MuiLink>
            <Typography color="text.primary" fontWeight={700}>
              {vendor.name}
            </Typography>
          </Breadcrumbs>
        </Paper>

        <Paper elevation={0} sx={storefrontVendorHeroPaperSx(uiTemplate)}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Avatar
              src={vendor.logoUrl ?? undefined}
              sx={{
                width: 72,
                height: 72,
                fontWeight: 800,
                fontSize: "1.25rem",
                bgcolor: alpha(storefrontBrandMain(theme), 0.18),
                color: "text.primary",
                border: "3px solid",
                borderColor: alpha(storefrontBrandMain(theme), 0.45),
              }}
            >
              {initials}
            </Avatar>
            <Stack flex={1} spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <StorefrontOutlinedIcon sx={{ color: "primary.dark", fontSize: 22 }} />
                <Typography
                  variant={storefrontRetailTitleVariant(uiTemplate)}
                  component="h1"
                  sx={storefrontRetailTitleSx(uiTemplate)}
                >
                  {vendor.name}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {text(`Official store on ${brand} · Cash on delivery available`, `${brand}-এ অফিসিয়াল স্টোর · ক্যাশ অন ডেলিভারি উপলব্ধ`)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
          {text("Products", "পণ্যসমূহ")}
        </Typography>
        {productsQ.isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : productsQ.isError ? (
          <CatalogEmptyHint
            isError
            message={productsQ.error instanceof Error ? productsQ.error.message : undefined}
            onRetry={() => void productsQ.refetch()}
          />
        ) : items.length === 0 ? (
          <CatalogEmptyHint message={text("This store has no listed products yet.", "এই স্টোরে এখনও কোনো তালিকাভুক্ত পণ্য নেই।")} />
        ) : (
          <ProductGrid items={items} showDiscountBadge />
        )}
      </Container>
    </FadeInSection>
    </>
  );
}
