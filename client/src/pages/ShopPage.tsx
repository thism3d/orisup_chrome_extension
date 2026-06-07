import { Box, Breadcrumbs, Chip, Container, Link as MuiLink, Pagination, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  storefrontListingToolbarPaperSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
} from "@/lib/storefrontUiSurface";
import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { Link } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { Category, ProductListResponse } from "@/lib/types";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { ShopFiltersBar } from "@/components/shop/ShopFiltersBar";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import { FadeInSection } from "@/components/ui/FadeInSection";

const PAGE_SIZE = 24;

export function ShopPage({ categorySlug }: { categorySlug?: string }) {
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const {
    containerMaxWidth: shopContainerMaxWidth,
    minimalChrome: shopMinimal,
    uiTemplate,
    isOrynbd,
  } = useStorefrontUiTemplate();
  const productWellFlat = shopMinimal || isOrynbd;
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search), [search]);
  const q = params.get("q") ?? "";

  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [categorySlug, q, sort, minPrice, maxPrice]);

  const queryUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (categorySlug) p.set("category", categorySlug);
    if (q) p.set("q", q);
    if (sort) p.set("sort", sort);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String((page - 1) * PAGE_SIZE));
    return `/api/products?${p.toString()}`;
  }, [categorySlug, q, sort, minPrice, maxPrice, page]);

  const listQ = useQuery({
    queryKey: ["products", queryUrl],
    queryFn: () => apiJson<ProductListResponse>(queryUrl),
  });

  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const { isLoading, isError, error, refetch } = listQ;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterActive = sort !== "newest" || Boolean(minPrice.trim()) || Boolean(maxPrice.trim());

  const clearFilters = () => {
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<Category[]>("/api/categories"),
  });

  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) ?? null : null;
  const childCategories = useMemo(
    () => (activeCategory ? categories.filter((c) => c.parentId === activeCategory.id) : []),
    [activeCategory, categories],
  );

  const categoryLabel =
    categorySlug &&
    (activeCategory?.name ??
      categorySlug.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()));

  const title = categorySlug ? categoryLabel : q ? `${text("Search", "অনুসন্ধান")}: ${q}` : text("Shop", "শপ");
  const seoTitle = categorySlug ? `${categoryLabel} — ${text("Shop", "শপ")}` : q ? `${text("Search", "অনুসন্ধান")}: ${q}` : text("Shop all products", "সব পণ্য");
  const seoDesc = categorySlug
    ? `Browse ${categoryLabel} from verified ${brand} sellers with delivery across Bangladesh.`
    : q
      ? `Search results for “${q}” on ${brand} — multi-vendor marketplace.`
      : `Browse products from verified sellers across Bangladesh on ${brand}. Filters, sort, and cash on delivery.`;
  const canonicalPath = categorySlug ? `/c/${categorySlug}` : "/shop";

  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDesc}
        canonicalPath={canonicalPath}
        noindex={Boolean(q)}
      />
      <FadeInSection>
        <Container maxWidth={shopContainerMaxWidth} sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
          <Paper elevation={0} sx={storefrontListingToolbarPaperSx(uiTemplate)}>
            <Breadcrumbs sx={{ mb: 1.5 }} aria-label="breadcrumb" separator="›">
              <MuiLink component={Link} href="/" underline="hover" color="inherit" fontWeight={600}>
                {text("Home", "হোম")}
              </MuiLink>
              {(categorySlug || q) && (
                <MuiLink component={Link} href="/shop" underline="hover" color="inherit" fontWeight={600}>
                  {text("Shop", "শপ")}
                </MuiLink>
              )}
              <Typography color="text.primary" fontWeight={800} sx={{ maxWidth: { xs: "100%", sm: "none" } }}>
                {categorySlug ? categoryLabel : q ? `“${q}”` : text("All products", "সব পণ্য")}
              </Typography>
            </Breadcrumbs>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <Typography
                variant={storefrontRetailTitleVariant(uiTemplate)}
                component="h1"
                sx={{
                  ...storefrontRetailTitleSx(uiTemplate),
                  flex: "1 1 auto",
                  fontSize: { xs: "1.25rem", sm: uiTemplate === "orynbd" ? "1.65rem" : "1.5rem" },
                }}
              >
                {title}
              </Typography>
              {!isLoading && !isError ? (
                <Chip
                  label={
                    total <= PAGE_SIZE
                      ? `${total} ${text(total === 1 ? "product" : "products", "পণ্য")}`
                      : `${total} ${text("products", "পণ্য")} · ${text("page", "পৃষ্ঠা")} ${page} ${text("of", "এর")} ${pageCount}`
                  }
                  color="primary"
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 0.5,
                    boxShadow: (t) => `0 4px 14px ${alpha(storefrontBrandMain(t), 0.35)}`,
                  }}
                />
              ) : null}
            </Box>
            {(q || categorySlug) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, maxWidth: 720, lineHeight: 1.65 }}>
                {q
                  ? `Results on ${brand} for your search. Use filters to narrow by price.`
                  : `Browse ${categoryLabel} from multiple sellers — compare prices and delivery options.`}
              </Typography>
            )}
          </Paper>
          {childCategories.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexWrap: "nowrap",
                gap: 1,
                overflowX: "auto",
                pb: 1.25,
                mb: { xs: 1, md: 1.5 },
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {childCategories.map((child) => (
                <Chip
                  key={child.id}
                  component={Link}
                  href={`/c/${child.slug}`}
                  clickable
                  label={child.name}
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    flexShrink: 0,
                    borderRadius: 2,
                    "&:hover": { borderColor: "primary.main", color: "primary.main" },
                  }}
                />
              ))}
            </Box>
          ) : null}
          <ShopFiltersBar
            sort={sort}
            onSortChange={setSort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPrice={setMinPrice}
            onMaxPrice={setMaxPrice}
            filterActive={filterActive}
            onClearFilters={clearFilters}
          />
          <Box
            sx={(t) => ({
              borderRadius: { xs: productWellFlat ? 2 : 2.5, md: productWellFlat ? 2.5 : 3 },
              p: { xs: 1.25, sm: 2, md: 2.5 },
              bgcolor: alpha(t.palette.common.black, t.palette.mode === "light" ? 0.02 : 0.15),
              border: "1px solid",
              borderColor: "divider",
              boxShadow: productWellFlat ? (isOrynbd ? "0 4px 18px rgba(15,23,42,0.05)" : "none") : "0 8px 32px rgba(11,11,11,0.04)",
            })}
          >
            {isLoading ? (
              <ProductGridSkeleton count={12} />
            ) : isError ? (
              <CatalogEmptyHint isError message={error?.message} onRetry={() => void refetch()} />
            ) : items.length === 0 ? (
              <CatalogEmptyHint message={text("No products match your filters. Try clearing price range or search.", "আপনার ফিল্টারের সাথে কোনো পণ্য মেলেনি। মূল্য সীমা বা অনুসন্ধান পরিবর্তন করুন।")} onRetry={() => void refetch()} />
            ) : (
              <>
                <ProductGrid items={items} showDiscountBadge />
                {total > PAGE_SIZE ? (
                  <Pagination
                    color="primary"
                    shape="rounded"
                    count={pageCount}
                    page={page}
                    onChange={(_, value) => {
                      setPage(value);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    sx={{ display: "flex", justifyContent: "center", mt: { xs: 2.5, md: 3 }, pt: 1 }}
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                ) : null}
              </>
            )}
          </Box>
        </Container>
      </FadeInSection>
    </>
  );
}
