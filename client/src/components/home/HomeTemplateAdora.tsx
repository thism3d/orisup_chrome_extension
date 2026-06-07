import { Box, Button, Container, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { PageSection } from "@/components/ui/PageSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { OrynCategoryCircles } from "@/components/home/OrynCategoryCircles";
import { PromoSplitBanners } from "@/components/home/PromoSplitBanners";
import { SuperDealsSection } from "@/components/home/SuperDealsSection";
import { DealsTabbedGrid } from "@/components/home/DealsTabbedGrid";
import { TrustFeaturesBar } from "@/components/home/TrustFeaturesBar";
import { TopSellersStrip } from "@/components/home/TopSellersStrip";
import { BrandLogoStrip } from "@/components/home/BrandLogoStrip";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { ProductCard } from "@/components/ui/ProductCard";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import type { HomeTemplateSharedProps } from "@/components/home/HomePageTemplates";

/**
 * Adora Shop — dedicated fashion home: editorial hero band, category rail, spotlight grid,
 * promos, flash lane, tabbed picks, trust row, and brands (not a clone of Norex minimal).
 */
export function HomeTemplateAdora(props: HomeTemplateSharedProps) {
  const {
    setLoc,
    categories,
    heroBanners,
    products,
    homeLoading,
    productsError,
    productsErrorMessage,
    refetchHome,
    tabItems,
    categoriesLoading,
    productsLoading,
  } = props;

  const { text } = useStorefrontLanguage();
  const spotlight = products.slice(0, 3);
  const runway = products.slice(3, 11);

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(145deg, ${alpha(storefrontBrandMain(t), 0.14)} 0%, ${alpha(storefrontBrandMain(t), 0.04)} 38%, #fff 72%)`,
        })}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: 0 }}>
          <FadeInSection>
            {homeLoading ? (
              <Skeleton
                variant="rectangular"
                sx={{
                  width: 1,
                  aspectRatio: { xs: "4 / 5", sm: "16 / 9", md: "2 / 1" },
                  minHeight: { xs: 220, sm: 260 },
                  maxHeight: { md: 480 },
                  borderRadius: { xs: 0, sm: 2, md: 3 },
                }}
              />
            ) : (
              <Box sx={{ px: { xs: 0, sm: 0 }, pt: { xs: 0, md: 1 }, pb: { xs: 0, md: 0.5 } }}>
                <HeroCarousel banners={heroBanners} variant="showcase" autoMs={6800} />
              </Box>
            )}
          </FadeInSection>
        </Container>

        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="overline"
                fontWeight={800}
                sx={{ color: "primary.main", letterSpacing: "0.22em", display: "block", mb: 1.5 }}
              >
                {text("New season", "নতুন মৌসুম")}
              </Typography>
              <Typography variant="h3" component="h1" fontWeight={800} sx={{ letterSpacing: "-0.03em", lineHeight: 1.08, mb: 2 }}>
                {text("Style that moves with you.", "চলাফেরার সঙ্গে মানানসই স্টাইল।")}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, lineHeight: 1.65, mb: 2.5 }}>
                {text(
                  "Fresh drops in casual wear, footwear, and accessories — easy checkout and dependable delivery.",
                  "ক্যাজুয়াল পোশাক, জুতা ও অ্যাকসেসরিজে নতুন কালেকশন—সহজ অর্ডার ও নির্ভরযোগ্য ডেলিভারি।",
                )}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button component={Link} href="/shop" variant="contained" color="primary" size="large" sx={{ fontWeight: 800, px: 3 }}>
                  {text("Shop collection", "কালেকশন দেখুন")}
                </Button>
                <Button component={Link} href="/categories" variant="outlined" color="inherit" size="large" sx={{ fontWeight: 700 }}>
                  {text("Browse categories", "ক্যাটাগরি")}
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              {productsLoading ? (
                <ProductGridSkeleton count={2} />
              ) : productsError ? (
                <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
              ) : spotlight.length === 0 ? (
                <CatalogEmptyHint onRetry={refetchHome} />
              ) : (
                <Grid container spacing={2}>
                  {spotlight.map((row, i) => (
                    <Grid item xs={6} key={row.product.id}>
                      <ProductCard row={row} showNew={i === 0} eager={i < 2} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>

      <PageSection density="compact">
        <FadeInSection delayMs={40}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Shop by category", "ক্যাটাগরি অনুযায়ী")}
              subtitle={text("Tap a look and go straight to the aisle.", "এক ট্যাপেই শুরু করুন।")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            ) : (
              <OrynCategoryCircles categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted" density="compact">
        <FadeInSection delayMs={60}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("The spotlight", "স্পটলাইট")}
              subtitle={text("Pieces we are loving this week.", "এই সপ্তাহে আমাদের পছন্দের পণ্য।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : runway.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <ProductGrid items={runway} showDiscountBadge eagerCount={4} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact">
        <FadeInSection delayMs={80}>
          <Container maxWidth="lg">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact" flushTop>
        <FadeInSection delayMs={100}>
          <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
            <SuperDealsSection
              items={products}
              isLoading={productsLoading}
              isError={productsError}
              errorMessage={productsErrorMessage}
              onRetry={refetchHome}
            />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact">
        <FadeInSection delayMs={120}>
          <Container maxWidth="lg">
            <DealsTabbedGrid
              byTab={tabItems}
              isLoading={productsLoading}
              isError={productsError}
              errorMessage={productsErrorMessage}
              onRetry={refetchHome}
            />
          </Container>
        </FadeInSection>
      </PageSection>

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageSection bg="muted" density="compact">
          <FadeInSection delayMs={140}>
            <Container maxWidth="lg">
              <TrustFeaturesBar />
            </Container>
          </FadeInSection>
        </PageSection>
      </Box>

      <PageSection density="compact">
        <FadeInSection delayMs={160}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Stores shoppers love", "ক্রেতাদের প্রিয় দোকান")}
              subtitle={text("Popular picks flying off the shelf.", "দ্রুত বিক্রি হচ্ছে এমন পণ্য।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted" density="compact">
        <FadeInSection delayMs={180}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Brands we carry", "আমাদের ব্র্যান্ড")}
              subtitle={text("Names you can shop with confidence.", "যেসব নাম নিয়ে আত্মবিশ্বাসী থাকবেন।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}
