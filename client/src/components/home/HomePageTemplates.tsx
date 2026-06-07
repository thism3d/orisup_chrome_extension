import { Box, Container, Grid, Skeleton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { PageSection } from "@/components/ui/PageSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeaturedSplitSection } from "@/components/home/FeaturedSplitSection";
import { DealsTabbedGrid } from "@/components/home/DealsTabbedGrid";
import { TopSellersStrip } from "@/components/home/TopSellersStrip";
import { BrandLogoStrip } from "@/components/home/BrandLogoStrip";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { WelcomeJoinCard } from "@/components/home/WelcomeJoinCard";
import { WeeklyDealsAside } from "@/components/home/WeeklyDealsAside";
import { TrustFeaturesBar } from "@/components/home/TrustFeaturesBar";
import { SuperDealsSection } from "@/components/home/SuperDealsSection";
import { PromoSplitBanners } from "@/components/home/PromoSplitBanners";
import { CategoryMosaic } from "@/components/home/CategoryMosaic";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { HomePersonalRails } from "@/components/home/HomePersonalRails";
import { NorexTrendingProducts } from "@/components/home/NorexTrendingProducts";
import { OrynCategoryCircles } from "@/components/home/OrynCategoryCircles";
import { OrynDenseProductGrid } from "@/components/home/OrynDenseProductGrid";
import { useAuth } from "@/hooks/useAuth";
import type { Banner, Category, ProductListRow } from "@/lib/types";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

export type HomeTemplateSharedProps = {
  setLoc: (path: string) => void;
  categories: Category[];
  heroBanners: Banner[];
  products: ProductListRow[];
  homeLoading: boolean;
  productsError: boolean;
  productsErrorMessage?: string;
  refetchHome: () => void;
  tabItems: { label: string; items: ProductListRow[] }[];
  categoriesLoading: boolean;
  productsLoading: boolean;
};

/** Classic marketplace: sidebar categories + hero carousel (default). */
export function HomeTemplateClassic(props: HomeTemplateSharedProps) {
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
  const { user, loading: authLoading } = useAuth();
  const showWelcomeCard = !user;
  const reserveWelcomeSlot = authLoading || showWelcomeCard;

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          background: `linear-gradient(165deg, ${alpha(storefrontBrandMain(t), 0.1)} 0%, rgba(255,255,255,0) 50%), #fff`,
          overflowX: { xs: "clip", md: "visible" },
        })}
      >
        <Box sx={{ py: { xs: 0, md: 0 } }}>
          <Container maxWidth="xl" disableGutters sx={{ px: 0 }}>
            <FadeInSection>
              {homeLoading ? (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: 1,
                    aspectRatio: { xs: "16 / 9", sm: "16 / 9", md: "21 / 9" },
                    minHeight: { xs: 180, sm: 220 },
                    maxHeight: { md: 520 },
                    borderRadius: { xs: 0, sm: 2, md: 2.5 },
                    mt: { xs: 0, md: 1 },
                  }}
                />
              ) : (
                <Box sx={{ mt: 0 }}>
                  <HeroCarousel banners={heroBanners} variant="showcase" />
                </Box>
              )}
            </FadeInSection>
          </Container>
        </Box>
      </Box>

      <Box sx={{ display: { xs: reserveWelcomeSlot ? "block" : "none", md: "block" } }}>
        <PageSection>
          <FadeInSection delayMs={20}>
            <Container maxWidth="xl">
              <Grid container spacing={2} alignItems="stretch">
                {reserveWelcomeSlot ? (
                  <Grid item xs={12} sm={5} md={4}>
                    {showWelcomeCard ? <WelcomeJoinCard /> : <Box sx={{ minHeight: 220 }} aria-hidden="true" />}
                  </Grid>
                ) : null}
                <Grid
                  item
                  xs={12}
                  sm={reserveWelcomeSlot ? 7 : 12}
                  md={reserveWelcomeSlot ? 8 : 12}
                  sx={{ display: { xs: "none", md: "block" } }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: "text.primary" }}>
                    {text("Weekly best deals", "সপ্তাহের সেরা অফার")}
                  </Typography>
                  <WeeklyDealsAside items={products} isLoading={productsLoading} />
                </Grid>
              </Grid>
            </Container>
          </FadeInSection>
        </PageSection>
      </Box>

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageSection bg="muted">
          <FadeInSection delayMs={40}>
            <TrustFeaturesBar />
          </FadeInSection>
        </PageSection>
      </Box>

      <PageSection flushTop>
        <FadeInSection delayMs={80}>
          <SuperDealsSection
            items={products}
            isLoading={productsLoading}
            isError={productsError}
            errorMessage={productsErrorMessage}
            onRetry={refetchHome}
          />
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={90}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Choose category", "শ্রেণি বেছে নিন")}
              subtitle={text("Jump straight into the aisle you need.", "প্রয়োজনীয় বিভাগে সোজা চলে যান।")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            ) : (
              <CategoryMosaic categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={100}>
          <Container maxWidth="xl">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={120}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Featured for you", "আপনার জন্য নির্বাচিত")}
              subtitle={text(
                "Hand-picked products from verified sellers — refreshed often.",
                "যাচাইকৃত বিক্রেতাদের বাছাই করা পণ্য—নিয়মিত আপডেট।",
              )}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <FeaturedSplitSection sideProducts={products.slice(0, 4)} gridProducts={products.slice(4, 12)} />
            )}
            <HomePersonalRails />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={160}>
          <Container maxWidth="xl">
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

      <PageSection bg="muted">
        <FadeInSection delayMs={180}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Weekly top sellers", "সপ্তাহের সর্বোচ্চ বিক্রি")}
              subtitle={text("Stores shoppers love right now.", "ক্রেতারা এখন যেসব দোকান পছন্দ করছেন।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={200}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Top brands", "শীর্ষ ব্র্যান্ড")}
              subtitle={text("Shop names you already trust.", "আপনার পরিচিত ও বিশ্বস্ত ব্র্যান্ড।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}

/** Minimal: full-width hero, tighter vertical rhythm, fewer visual bands — editorial / catalog feel. */
export function HomeTemplateMinimal(props: HomeTemplateSharedProps) {
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
  const { user, loading: authLoading } = useAuth();
  const showWelcomeCard = !user;
  const reserveWelcomeSlot = authLoading || showWelcomeCard;

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          background:
            t.palette.mode === "dark"
              ? `linear-gradient(160deg, ${alpha(storefrontBrandMain(t), 0.72)} 0%, ${alpha(
                  storefrontBrandMain(t),
                  0.22,
                )} 26%, ${t.palette.background.default} 48%, ${t.palette.background.default} 100%), ${t.palette.background.default}`
              : `linear-gradient(165deg, ${alpha(storefrontBrandMain(t), 0.1)} 0%, rgba(255,255,255,0) 50%), #fff`,
          overflowX: { xs: "clip", md: "visible" },
        })}
      >
        <Box sx={{ py: { xs: 0, md: 0 } }}>
          <Container maxWidth="lg" disableGutters sx={{ px: 0 }}>
            <FadeInSection>
              {homeLoading ? (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: 1,
                    aspectRatio: { xs: "16 / 9", sm: "16 / 9", md: "21 / 9" },
                    minHeight: { xs: 180, sm: 220 },
                    maxHeight: { md: 520 },
                    borderRadius: { xs: 0, sm: 2, md: 2.5 },
                    mt: { xs: 0, md: 1 },
                    bgcolor: (th) => (th.palette.mode === "dark" ? "grey.900" : "grey.200"),
                  }}
                />
              ) : (
                <Box sx={{ mt: 0 }}>
                  <HeroCarousel banners={heroBanners} variant="showcase" autoMs={7200} />
                </Box>
              )}
            </FadeInSection>
          </Container>
        </Box>
      </Box>

      <Box sx={{ display: { xs: reserveWelcomeSlot ? "block" : "none", md: "block" } }}>
        <PageSection density="compact">
          <FadeInSection delayMs={20}>
            <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
              <Grid container spacing={2} alignItems="stretch">
                {reserveWelcomeSlot ? (
                  <Grid item xs={12} sm={5} md={4}>
                    {showWelcomeCard ? <WelcomeJoinCard /> : <Box sx={{ minHeight: 220 }} aria-hidden="true" />}
                  </Grid>
                ) : null}
                <Grid
                  item
                  xs={12}
                  sm={reserveWelcomeSlot ? 7 : 12}
                  md={reserveWelcomeSlot ? 8 : 12}
                  sx={{ display: { xs: "none", md: "block" } }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: "text.primary" }}>
                    {text("Weekly best deals", "সপ্তাহের সেরা অফার")}
                  </Typography>
                  <WeeklyDealsAside items={products} isLoading={productsLoading} />
                </Grid>
              </Grid>
            </Container>
          </FadeInSection>
        </PageSection>
      </Box>

      <PageSection density="compact">
        <FadeInSection delayMs={40}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Trending products", "চলতি ট্রেন্ড")}
              subtitle={text("What shoppers are adding to cart this week.", "এই সপ্তাহে ক্রেতারা কার্টে কী যোগ করছেন।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={4} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : (
              <NorexTrendingProducts items={products} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageSection bg="muted" density="compact">
          <FadeInSection delayMs={30}>
            <Container maxWidth="lg">
              <TrustFeaturesBar />
            </Container>
          </FadeInSection>
        </PageSection>
      </Box>

      <PageSection density="compact" flushTop>
        <FadeInSection delayMs={60}>
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
        <FadeInSection delayMs={70}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Shop by category", "ক্যাটাগরি অনুযায়ী")}
              subtitle={text("Jump into a department.", "নিজের বিভাগে যান।")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
            ) : (
              <CategoryMosaic categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted" density="compact">
        <FadeInSection delayMs={80}>
          <Container maxWidth="lg">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact">
        <FadeInSection delayMs={100}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Featured picks", "নির্বাচিত পণ্য")}
              subtitle={text("Curated from verified sellers.", "যাচাইকৃত বিক্রেতাদের বাছাই।")}
              actionLabel={text("Shop all", "সব পণ্য")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <FeaturedSplitSection sideProducts={products.slice(0, 4)} gridProducts={products.slice(4, 12)} />
            )}
            <HomePersonalRails />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact">
        <FadeInSection delayMs={140}>
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

      <PageSection bg="muted" density="compact">
        <FadeInSection delayMs={160}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Top stores", "শীর্ষ দোকান")}
              subtitle={text("Visit seller storefronts.", "বিক্রেতাদের দোকান ঘুরে দেখুন।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection density="compact">
        <FadeInSection delayMs={180}>
          <Container maxWidth="lg">
            <SectionHeading
              title={text("Brands", "ব্র্যান্ড")}
              subtitle={text("Names you know.", "চেনা নাম।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}

/** Orynbd: marketplace layout — circular categories, promo grid, dense product rails (reference: multi-category retail). */
export function HomeTemplateOrynbd(props: HomeTemplateSharedProps) {
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
  const { user, loading: authLoading } = useAuth();
  const showWelcomeCard = !user;
  const reserveWelcomeSlot = authLoading || showWelcomeCard;

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          background: `linear-gradient(165deg, ${alpha(storefrontBrandMain(t), 0.1)} 0%, rgba(255,255,255,0) 50%), #fff`,
          overflowX: { xs: "clip", md: "visible" },
        })}
      >
        <Box sx={{ py: { xs: 0, md: 0 } }}>
          <Container maxWidth="xl" disableGutters sx={{ px: 0 }}>
            <FadeInSection>
              {homeLoading ? (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: 1,
                    aspectRatio: { xs: "16 / 9", sm: "16 / 9", md: "21 / 9" },
                    minHeight: { xs: 180, sm: 220 },
                    maxHeight: { md: 520 },
                    borderRadius: { xs: 0, sm: 2, md: 2.5 },
                    mt: { xs: 0, md: 1 },
                  }}
                />
              ) : (
                <Box sx={{ mt: 0 }}>
                  <HeroCarousel banners={heroBanners} variant="showcase" />
                </Box>
              )}
            </FadeInSection>
          </Container>
        </Box>
      </Box>

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageSection>
          <FadeInSection delayMs={20}>
            <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
              <Grid container spacing={2} alignItems="stretch">
                {reserveWelcomeSlot ? (
                  <Grid item xs={12} sm={5} md={4}>
                    {showWelcomeCard ? <WelcomeJoinCard /> : <Box sx={{ minHeight: 220 }} aria-hidden="true" />}
                  </Grid>
                ) : null}
                <Grid
                  item
                  xs={12}
                  sm={reserveWelcomeSlot ? 7 : 12}
                  md={reserveWelcomeSlot ? 8 : 12}
                  sx={{ display: { xs: "none", md: "block" } }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: "text.primary" }}>
                    {text("Weekly best deals", "সপ্তাহের সেরা অফার")}
                  </Typography>
                  <WeeklyDealsAside items={products} isLoading={productsLoading} />
                </Grid>
              </Grid>
            </Container>
          </FadeInSection>
        </PageSection>
      </Box>

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageSection>
          <FadeInSection delayMs={60}>
            <TrustFeaturesBar />
          </FadeInSection>
        </PageSection>
      </Box>

      <PageSection bg="muted">
        <FadeInSection delayMs={80}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Today's best deals for you", "আজকের সেরা ডিল আপনার জন্য")}
              subtitle={text("Fresh markdowns from verified sellers.", "যাচাইকৃত বিক্রেতাদের নতুন মূল্যছাড়।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={10} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <OrynDenseProductGrid items={products.slice(0, 20)} showDiscountBadge eagerCount={10} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={100}>
          <Container maxWidth="xl">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted" flushTop>
        <FadeInSection delayMs={120}>
          <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
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

      <PageSection>
        <FadeInSection delayMs={140}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Explore popular categories", "জনপ্রিয় ক্যাটাগরি")}
              subtitle={text("Jump straight into the aisle you need.", "প্রয়োজনীয় বিভাগে সোজা যান।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            ) : (
              <OrynCategoryCircles categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={160}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Featured for you", "আপনার জন্য নির্বাচিত")}
              subtitle={text("Hand-picked products from verified sellers.", "যাচাইকৃত বিক্রেতাদের বাছাই করা পণ্য।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <FeaturedSplitSection sideProducts={products.slice(0, 4)} gridProducts={products.slice(4, 12)} />
            )}
            <HomePersonalRails />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={180}>
          <Container maxWidth="xl">
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

      <PageSection bg="muted">
        <FadeInSection delayMs={200}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Weekly top sellers", "সপ্তাহের সর্বোচ্চ বিক্রি")}
              subtitle={text("Stores shoppers love right now.", "ক্রেতারা এখন যেসব দোকান পছন্দ করছেন।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={220}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Top brands", "শীর্ষ ব্র্যান্ড")}
              subtitle={text("Shop names you already trust.", "আপনার পরিচিত ও বিশ্বস্ত ব্র্যান্ড।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}

/** MasumTraders: grocery-first layout — circular categories, essentials grid, and daily deal rails. */
export function HomeTemplateMasumTraders(props: HomeTemplateSharedProps) {
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

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          background: `linear-gradient(165deg, ${alpha(storefrontBrandMain(t), 0.12)} 0%, rgba(255,255,255,0) 52%), #fff`,
          overflowX: { xs: "clip", md: "visible" },
        })}
      >
        <Box sx={{ py: { xs: 0, md: 0 } }}>
          <Container maxWidth="xl" disableGutters sx={{ px: 0 }}>
            <FadeInSection>
              {homeLoading ? (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: 1,
                    aspectRatio: { xs: "16 / 9", sm: "16 / 9", md: "21 / 9" },
                    minHeight: { xs: 180, sm: 220 },
                    maxHeight: { md: 520 },
                    borderRadius: { xs: 0, sm: 2, md: 2.5 },
                    mt: { xs: 0, md: 1 },
                  }}
                />
              ) : (
                <Box sx={{ mt: 0 }}>
                  <HeroCarousel banners={heroBanners} variant="showcase" />
                </Box>
              )}
            </FadeInSection>
          </Container>
        </Box>
      </Box>

      <PageSection>
        <FadeInSection delayMs={20}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Shop by category", "ক্যাটাগরি অনুযায়ী কেনাকাটা")}
              subtitle={text("Quick access to grocery aisles you use every day.", "প্রতিদিনের প্রয়োজনীয় বিভাগগুলোতে দ্রুত যান।")}
            />
            {categoriesLoading ? <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} /> : <OrynCategoryCircles categories={categories} />}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted" flushTop>
        <FadeInSection delayMs={40}>
          <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
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

      <PageSection>
        <FadeInSection delayMs={60}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Today's essentials", "আজকের প্রয়োজনীয় পণ্য")}
              subtitle={text("Fast-moving grocery picks from trusted sellers.", "বিশ্বস্ত বিক্রেতাদের দ্রুত বিক্রিত গ্রোসারি পণ্য।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={10} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <OrynDenseProductGrid items={products.slice(0, 20)} showDiscountBadge eagerCount={10} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={80}>
          <Container maxWidth="xl">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={100}>
          <Container maxWidth="xl">
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

      <PageSection bg="muted">
        <FadeInSection delayMs={120}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Shop by department", "বিভাগ অনুযায়ী কেনাকাটা")}
              subtitle={text("Browse complete departments and discover more.", "সম্পূর্ণ বিভাগ ঘুরে দেখুন এবং আরও পণ্য আবিষ্কার করুন।")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            ) : (
              <CategoryMosaic categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={140}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Top sellers", "টপ সেলার")}
              subtitle={text("Most trusted grocery stores right now.", "এই মুহূর্তে সবচেয়ে বিশ্বস্ত গ্রোসারি স্টোরগুলো।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={160}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Popular brands", "জনপ্রিয় ব্র্যান্ড")}
              subtitle={text("Everyday names for daily essentials.", "দৈনন্দিন প্রয়োজনের পরিচিত ব্র্যান্ডগুলো।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}

/** UttoraSteel: steel furniture & workshop — showroom hero, product lines, featured builds, industrial rails. */
export function HomeTemplateUttoraSteel(props: HomeTemplateSharedProps) {
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

  return (
    <>
      <Box
        component="section"
        sx={(t) => ({
          background: `linear-gradient(165deg, ${alpha(storefrontBrandMain(t), 0.14)} 0%, rgba(255,255,255,0) 48%), #fff`,
          overflowX: { xs: "clip", md: "visible" },
        })}
      >
        <Box sx={{ py: { xs: 0, md: 0 } }}>
          <Container maxWidth="xl" disableGutters sx={{ px: 0 }}>
            <FadeInSection>
              {homeLoading ? (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: 1,
                    aspectRatio: { xs: "16 / 9", sm: "16 / 9", md: "21 / 9" },
                    minHeight: { xs: 180, sm: 220 },
                    maxHeight: { md: 520 },
                    borderRadius: { xs: 0, sm: 2, md: 2.5 },
                    mt: { xs: 0, md: 1 },
                  }}
                />
              ) : (
                <Box sx={{ mt: 0 }}>
                  <HeroCarousel banners={heroBanners} variant="showcase" />
                </Box>
              )}
            </FadeInSection>
          </Container>
        </Box>
      </Box>

      <PageSection>
        <FadeInSection delayMs={20}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Steel product lines", "স্টিল পণ্যের লাইন")}
              subtitle={text(
                "Beds, chairs, tables, kitchen racks, and office steel — built to last.",
                "বিছানা, চেয়ার, টেবিল, কিচেন র্যাক, অফিস স্টিল—দীর্ঘস্থায়ী।",
              )}
            />
            {categoriesLoading ? <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} /> : <OrynCategoryCircles categories={categories} />}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={40}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Showroom picks", "শোরুম পিক")}
              subtitle={text("Featured steel builds from verified workshops.", "যাচাইকৃত ওয়ার্কশপের বাছাই করা স্টিলের তৈরি।")}
              actionLabel={text("View all", "সব দেখুন")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <FeaturedSplitSection sideProducts={products.slice(0, 4)} gridProducts={products.slice(4, 12)} />
            )}
            <HomePersonalRails />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection flushTop>
        <FadeInSection delayMs={55}>
          <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
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

      <PageSection bg="muted">
        <FadeInSection delayMs={70}>
          <Container maxWidth="xl">
            <PromoSplitBanners />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={85}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Heavy-duty builds", "হেভি-ডিউটি তৈরি")}
              subtitle={text("Dense grid of steel furniture and workshop essentials.", "স্টিল ফার্নিচার ও কারখানার জরুরি জিনিস—এক ঝলকে অনেক পণ্য।")}
              actionLabel={text("Shop steel", "স্টিল কেনাকাটা")}
              onAction={() => setLoc("/shop")}
            />
            {productsLoading ? (
              <ProductGridSkeleton count={12} />
            ) : productsError ? (
              <CatalogEmptyHint isError message={productsErrorMessage} onRetry={refetchHome} />
            ) : products.length === 0 ? (
              <CatalogEmptyHint onRetry={refetchHome} />
            ) : (
              <OrynDenseProductGrid items={products.slice(0, 20)} showDiscountBadge eagerCount={10} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={100}>
          <Container maxWidth="xl">
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

      <PageSection>
        <FadeInSection delayMs={115}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Shop by use", "ব্যবহার অনুযায়ী কেনাকাটা")}
              subtitle={text("Bedroom, office, kitchen, and more.", "বেডরুম, অফিস, কিচেন ও আরও।")}
            />
            {categoriesLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            ) : (
              <CategoryMosaic categories={categories} />
            )}
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection bg="muted">
        <FadeInSection delayMs={130}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Trusted workshops", "বিশ্বস্ত ওয়ার্কশপ")}
              subtitle={text("Top sellers in steel and metal goods.", "স্টিল ও ধাতব পণ্যে সর্বাধিক বিক্রি।")}
            />
            <TopSellersStrip items={products} isLoading={productsLoading} />
          </Container>
        </FadeInSection>
      </PageSection>

      <PageSection>
        <FadeInSection delayMs={145}>
          <Container maxWidth="xl">
            <SectionHeading
              title={text("Steel brands", "স্টিল ব্র্যান্ড")}
              subtitle={text("Names you know for quality metalwork.", "মানসম্মত মেটালওয়ার্কের পরিচিত নাম।")}
            />
            <BrandLogoStrip />
          </Container>
        </FadeInSection>
      </PageSection>
    </>
  );
}
