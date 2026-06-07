import {
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Skeleton,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Divider,
  Paper,
  Box,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Link, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { AddToCartSection } from "@/components/product/AddToCartSection";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { CatalogEmptyHint } from "@/components/home/CatalogEmptyHint";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontListingToolbarPaperSx, storefrontRetailTitleSx, storefrontRetailTitleVariant } from "@/lib/storefrontUiSurface";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { plainExcerpt } from "@/lib/seoText";
import { absoluteUrl, mediaAbsoluteUrl } from "@/lib/site";
import { StarRating } from "@/components/ui/StarRating";
import { ProductWishlistButton } from "@/components/product/ProductWishlistButton";
import { ProductReviewsPanel } from "@/components/product/ProductReviewsPanel";
import { ProductPageDiscovery } from "@/components/product/ProductPageDiscovery";
import { GeneralInfoTableBlock, ProductDescriptionPanel, SpecificationsTableBlock } from "@/components/product/ProductDetailSpecBlocks";
import { ProductKeyFeaturesAbovePrice } from "@/components/product/ProductKeyFeaturesAbovePrice";
import { FreeDeliveryBadge } from "@/components/ui/FreeDeliveryBadge";
import { useAuth } from "@/hooks/useAuth";
import { pushRecentProductIdLocal } from "@/lib/recentlyViewedLocal";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { formatBdt } from "@/lib/format";
import { parseDecimalString } from "@shared/parseDecimalString";

type ProductVariantRow = {
  id: string;
  productId: string;
  kind: string;
  name: string;
  value: string;
  price: string;
  stock: number;
  sortOrder: number;
};

type ProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  images: string[];
  vendorName: string;
  vendorSlug: string;
  reviewCount?: number;
  avgRating?: number;
  keyFeaturesJson?: { en: string; bn: string } | null;
  specificationsJson?: { label: string; value: string }[] | null;
  generalInfoJson?: { en: string; bn: string } | null;
  variants?: ProductVariantRow[];
  freeDeliveryEnabled?: boolean;
  freeDeliveryMinCartAmount?: string | null;
  freeDeliveryMinQuantity?: number | null;
};

function splitBilingualDescription(raw: string | null | undefined): { en?: string; bn?: string } {
  const html = raw?.trim() ?? "";
  if (!html) return {};
  const enMatch = html.match(/<div[^>]*data-lang=["']en["'][^>]*>([\s\S]*?)<\/div>/i);
  const bnMatch = html.match(/<div[^>]*data-lang=["']bn["'][^>]*>([\s\S]*?)<\/div>/i);
  if (enMatch || bnMatch) {
    return {
      en: enMatch?.[1]?.trim(),
      bn: bnMatch?.[1]?.trim(),
    };
  }
  const marker = html.toLowerCase().indexOf("বাংলা বিবরণ");
  if (marker >= 0) {
    return { en: html.slice(0, marker).trim(), bn: html.slice(marker).trim() };
  }
  return { en: html };
}

function wrapBilingualHtmlPair(en?: string | null, bn?: string | null): string | null {
  const e = en?.trim() ?? "";
  const b = bn?.trim() ?? "";
  if (!e && !b) return null;
  return `<div data-lang="en">${e}</div><div data-lang="bn">${b}</div>`;
}

function discountPct(price: string, compare: string | null): number | null {
  if (!compare) return null;
  const p = parseDecimalString(price);
  const c = parseDecimalString(compare);
  if (!c || c <= p || Number.isNaN(p)) return null;
  return Math.round((1 - p / c) * 100);
}

function ProductSkeleton() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Skeleton variant="rectangular" sx={{ pt: "90%", borderRadius: 2 }} />
      </Grid>
      <Grid item xs={12} md={6}>
        <Skeleton width="80%" height={40} />
        <Skeleton width="40%" height={28} sx={{ mt: 2 }} />
        <Skeleton width="100%" height={80} sx={{ mt: 2 }} />
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Skeleton width={100} height={40} />
          <Skeleton width={140} height={40} />
        </Stack>
      </Grid>
    </Grid>
  );
}

export function ProductPage() {
  const { containerMaxWidth, uiTemplate, minimalChrome } = useStorefrontUiTemplate();
  const flatPdp = minimalChrome || uiTemplate === "orynbd";
  /** Same shell as `StoreHeader` (`maxWidth` xl/lg) so the PDP is centered and columns stay balanced. */
  const pdpContainerProps = {
    maxWidth: containerMaxWidth,
    sx: {
      width: "100%",
      px: { xs: 1.5, sm: 2 },
      py: { xs: 1.5, md: 2.5 },
    },
  };
  const brand = useSiteBrand();
  const { user } = useAuth();
  const { lang, text } = useStorefrontLanguage();
  const qc = useQueryClient();
  const [, params] = useRoute("/p/:vendorSlug/:productSlug");
  const url = `/api/products/${params?.vendorSlug}/${params?.productSlug}`;
  const [imgIdx, setImgIdx] = useState(0);
  const [detailTab, setDetailTab] = useState(0);
  /** Measured width of the buy box column so hover-zoom can fill the full remaining PDP side. */
  const rightInfoColRef = useRef<HTMLDivElement | null>(null);
  const [rightColumnWidthPx, setRightColumnWidthPx] = useState(0);

  const { data: p, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["product", url],
    queryFn: () => apiJson<ProductDetail>(url),
    enabled: Boolean(params?.vendorSlug && params?.productSlug),
  });

  const variants = p?.variants ?? [];
  const variantIdsKey = variants.map((v) => v.id).join(",");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    setImgIdx(0);
  }, [p?.id]);

  useEffect(() => {
    if (!p) return;
    const vlist = p.variants ?? [];
    if (vlist.length > 0) {
      const sorted = [...vlist].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
      setSelectedVariantId(sorted[0]!.id);
    } else {
      setSelectedVariantId(null);
    }
  }, [p?.id, variantIdsKey]);

  useEffect(() => {
    if (!p) return;
    const hasDetail =
      Boolean(p.description?.trim()) ||
      (p.specificationsJson?.length ?? 0) > 0 ||
      Boolean(p.generalInfoJson?.en?.trim() || p.generalInfoJson?.bn?.trim());
    setDetailTab(hasDetail ? 0 : 1);
  }, [p?.id, p?.description, p?.keyFeaturesJson, p?.specificationsJson, p?.generalInfoJson]);

  useLayoutEffect(() => {
    const el = rightInfoColRef.current;
    if (!el) {
      setRightColumnWidthPx(0);
      return;
    }
    const apply = () => {
      setRightColumnWidthPx(Math.round(el.getBoundingClientRect().width));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p?.id]);

  useEffect(() => {
    if (!p?.id) return;
    if (user) {
      void (async () => {
        try {
          await apiJson("/api/me/recently-viewed", {
            method: "POST",
            body: JSON.stringify({ productId: p.id }),
          });
          void qc.invalidateQueries({ queryKey: ["recently-viewed-pdp"] });
          void qc.invalidateQueries({ queryKey: ["recently-viewed-home"] });
          void qc.invalidateQueries({ queryKey: ["recommendations", "home"] });
        } catch {
          /* ignore */
        }
      })();
    } else {
      pushRecentProductIdLocal(p.id);
      void qc.invalidateQueries({ queryKey: ["recommendations", "pdp"] });
      void qc.invalidateQueries({ queryKey: ["recommendations", "home"] });
      void qc.invalidateQueries({ queryKey: ["recently-viewed-pdp"] });
      void qc.invalidateQueries({ queryKey: ["recently-viewed-home"] });
    }
  }, [p?.id, user?.id, qc]);

  if (isLoading) {
    return (
      <>
        <Seo title="Product" description={`Loading product on ${brand}.`} />
        <Container {...pdpContainerProps}>
          <Skeleton width={320} height={24} sx={{ mb: 2 }} />
          <ProductSkeleton />
        </Container>
      </>
    );
  }

  if (isError || !p) {
    return (
      <>
        <Seo title="Product unavailable" description={`This product may have been removed from ${brand}.`} />
        <Container {...pdpContainerProps} sx={{ ...pdpContainerProps.sx, py: 3 }}>
          <CatalogEmptyHint
            isError
            message={error instanceof Error ? error.message : "This product may have been removed."}
            onRetry={() => void refetch()}
          />
          <Button component={Link} href="/shop" variant="contained" sx={{ mt: 2 }} size="large">
            Back to shop
          </Button>
        </Container>
      </>
    );
  }

  const imgs = p.images?.length ? p.images : [];
  const vRows = [...(p.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const effectiveVariantId = selectedVariantId ?? vRows[0]?.id ?? null;
  const selectedVariant = effectiveVariantId ? vRows.find((v) => v.id === effectiveVariantId) ?? null : null;
  const displayPrice = selectedVariant ? selectedVariant.price : p.price;
  const displayStock = selectedVariant ? selectedVariant.stock : p.stock;
  const splitDesc = splitBilingualDescription(p.description);
  const visibleDescription = lang === "bn" ? splitDesc.bn || splitDesc.en || p.description : splitDesc.en || p.description;
  const path = `/p/${params!.vendorSlug}/${params!.productSlug}`;
  const desc =
    plainExcerpt(p.seoDescription || visibleDescription, 160) ||
    text(
      `Buy ${p.title} from ${p.vendorName} on ${brand} with delivery in Bangladesh.`,
      `${brand}-এ ${p.vendorName} থেকে ${p.title} কিনুন। বাংলাদেশজুড়ে ডেলিভারি সুবিধা পাওয়া যাবে।`
    );
  const imageUrls = imgs.map((u) => mediaAbsoluteUrl(u)).filter(Boolean) as string[];
  const rc = p.reviewCount ?? 0;
  const ar = p.avgRating ?? 0;
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: desc,
    ...(imageUrls.length ? { image: imageUrls } : {}),
    brand: { "@type": "Brand", name: p.vendorName },
    ...(rc > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(ar),
            reviewCount: String(rc),
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "BDT",
      price: String(displayPrice).replace(/[^\d.]/g, "") || displayPrice,
      availability:
        displayStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const pct = discountPct(displayPrice, p.compareAtPrice);
  const lowStock = displayStock > 0 && displayStock <= 8;

  const deliveryPanel = (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {p.freeDeliveryEnabled ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={800} color="success.main">
            {text("Free delivery on this product", "এই পণ্যে বিনামূল্যে ডেলিভারি")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            {text(
              "When every product in your cart qualifies under its rules, the Pathao delivery fee can be waived. If any item does not qualify, the standard delivery fee applies to the whole order.",
              "আপনার কার্টের প্রতিটি পণ্য তার নিয়ম অনুযায়ী যোগ্য হলে পাথাও ডেলিভারি ফি মওকুফ হতে পারে। কোনো পণ্য যোগ্য না হলে পুরো অর্ডারে সাধারণ ডেলিভারি ফি প্রযোজ্য।",
            )}
          </Typography>
          {(() => {
            const rawAmt = p.freeDeliveryMinCartAmount?.trim() ?? "";
            const minQty = p.freeDeliveryMinQuantity;
            const amtN = rawAmt ? parseDecimalString(rawAmt) : NaN;
            const hasAmt = Number.isFinite(amtN) && amtN > 0;
            const hasQty = minQty != null && Number.isFinite(Number(minQty)) && Number(minQty) > 0;
            if (!hasAmt && !hasQty) {
              return (
                <Typography variant="body2" color="text.secondary">
                  {text(
                    "No minimum cart total or quantity is required for this item beyond seller settings.",
                    "বিক্রেতার সেটিং ছাড়া এই পণ্যের জন্য ন্যূনতম কার্ট বা পরিমাণ লাগবে না।",
                  )}
                </Typography>
              );
            }
            return (
              <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary" }}>
                {hasAmt ? (
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    {text("Cart subtotal at least ", "কার্টের মোট কমপক্ষে ")}
                    {formatBdt(rawAmt)}
                  </Typography>
                ) : null}
                {hasQty ? (
                  <Typography component="li" variant="body2">
                    {text(
                      `At least ${minQty} of this product in the cart`,
                      `কার্টে এই পণ্য কমপক্ষে ${String(minQty)} টি`,
                    )}
                  </Typography>
                ) : null}
                {hasAmt && hasQty ? (
                  <Typography variant="caption" component="p" sx={{ mt: 1, mb: 0 }}>
                    {text(
                      "If both rules are set for this product, meeting either one is enough for this line item.",
                      "এই পণ্যের জন্য দুটো শর্ত সেট থাকলে, লাইন আইটেমের জন্য যেকোনো একটি পূরণ হলেই হবে।",
                    )}
                  </Typography>
                ) : null}
              </Box>
            );
          })()}
        </Stack>
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
        {text(
          "Orders are fulfilled by the seller.",
          "অর্ডার বিক্রেতা দ্বারা পূরণ করা হয়।",
        )}{" "}
        <strong>{text("Cash on delivery", "ক্যাশ অন ডেলিভারি")}</strong>{" "}
        {text(
          "is available where the seller and courier support it. Delivery time depends on your area — the seller may contact you after purchase.",
          "বিক্রেতা ও কুরিয়ার সাপোর্ট করলে পাওয়া যাবে। ডেলিভারি সময় আপনার এলাকার উপর নির্ভর করে — কেনার পর বিক্রেতা আপনার সাথে যোগাযোগ করতে পারে।",
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
        {text("For returns and exchanges, see our", "রিটার্ন ও এক্সচেঞ্জের জন্য আমাদের")}{" "}
        <MuiLink component={Link} href="/returns" fontWeight={700} underline="hover">
          {text("return policy", "রিটার্ন নীতি")}
        </MuiLink>{" "}
        {text(
          "and contact the seller or support if the item is not as described.",
          "দেখুন এবং পণ্য বর্ণনার সাথে না মিললে বিক্রেতা বা সাপোর্টে যোগাযোগ করুন।",
        )}
      </Typography>
    </Stack>
  );

  return (
    <>
      <Seo
        title={p.seoTitle || p.title}
        description={desc}
        keywords={p.seoKeywords || undefined}
        canonicalPath={path}
        ogType="product"
        ogImage={imageUrls[0]}
        jsonLd={productLd}
      />
      <FadeInSection>
        <Container {...pdpContainerProps}>
          <Paper elevation={0} sx={storefrontListingToolbarPaperSx(uiTemplate)}>
            <Breadcrumbs sx={{ mb: 1 }} aria-label="breadcrumb" separator="›">
              <MuiLink component={Link} href="/" underline="hover" color="inherit" fontWeight={600}>
                {text("Home", "হোম")}
              </MuiLink>
              <MuiLink component={Link} href="/shop" underline="hover" color="inherit" fontWeight={600}>
                {text("Shop", "শপ")}
              </MuiLink>
              <Typography color="text.primary" fontWeight={700} noWrap sx={{ maxWidth: { xs: 200, sm: 480 } }}>
                {p.title}
              </Typography>
            </Breadcrumbs>
          </Paper>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            <Grid
              item
              xs={12}
              md={6}
              sx={{ minWidth: 0, overflow: "visible", position: "relative", zIndex: 2 }}
            >
              <Card
                elevation={0}
                sx={(t) => ({
                  p: { xs: 1.5, md: 1.5 },
                  borderRadius: flatPdp ? 2 : 3,
                  border: "1px solid",
                  borderColor: "divider",
                  /* Solid surface so the image block fills the card (no “empty” tinted band above the image). */
                  background: t.palette.background.paper,
                  boxShadow: flatPdp
                    ? uiTemplate === "orynbd"
                      ? "0 8px 28px rgba(15,23,42,0.07)"
                      : "none"
                    : "0 22px 60px rgba(11,11,11,0.08)",
                  /* Allow absolute hover-zoom to extend to the right over the next column. */
                  overflow: "visible",
                })}
              >
                <Box sx={{ position: "relative" }}>
                  {p.freeDeliveryEnabled ? <FreeDeliveryBadge placement="overlay" /> : null}
                  <ProductImageGallery
                    images={imgs}
                    active={imgIdx}
                    onSelect={setImgIdx}
                    ratio="92%"
                    productTitle={p.title}
                    hoverZoomWidth={rightColumnWidthPx > 0 ? rightColumnWidthPx : undefined}
                  />
                </Box>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
              sx={{ position: "relative", zIndex: 1, minWidth: 0, overflow: "visible" }}
            >
              <Box ref={rightInfoColRef} sx={{ width: "100%" }}>
                <Stack spacing={2.25}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                    {brand}
                  </Typography>
                  {pct != null && pct > 0 ? (
                    <Chip label={text(`Save ${pct}%`, `${pct}% সেভ করুন`)} size="small" color="error" sx={{ fontWeight: 800 }} />
                  ) : null}
                  {lowStock ? (
                    <Chip label={text("Selling fast", "দ্রুত বিক্রি হচ্ছে")} size="small" color="warning" sx={{ fontWeight: 700 }} variant="outlined" />
                  ) : null}
                </Stack>

                <Typography
                  variant={storefrontRetailTitleVariant(uiTemplate)}
                  component="h1"
                  sx={{
                    ...storefrontRetailTitleSx(uiTemplate),
                    lineHeight: 1.2,
                    fontSize: { xs: "1.35rem", sm: "1.75rem", md: uiTemplate === "orynbd" ? "2.125rem" : "2rem" },
                  }}
                >
                  {p.title}
                </Typography>

                {rc > 0 ? (
                  <Box>
                    <StarRating value={ar} count={rc} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {text("No reviews yet", "এখনও কোনো রিভিউ নেই")}
                  </Typography>
                )}

                {(() => {
                  const kfBilingual = wrapBilingualHtmlPair(p.keyFeaturesJson?.en, p.keyFeaturesJson?.bn);
                  return kfBilingual ? (
                    <ProductKeyFeaturesAbovePrice
                      bilingualRaw={kfBilingual}
                      lang={lang}
                      title={text("Key features", "মূল বৈশিষ্ট্য")}
                    />
                  ) : null;
                })()}

                <Paper
                  elevation={0}
                  sx={(t) => ({
                    p: { xs: 2, sm: 2.25 },
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(storefrontBrandMain(t), 0.22)}`,
                    bgcolor: alpha(storefrontBrandMain(t), 0.06),
                  })}
                >
                  <PriceDisplay price={displayPrice} compareAtPrice={p.compareAtPrice} size="lg" />
                </Paper>

                {vRows.length > 0 ? (
                  <FormControl fullWidth size="small">
                    <InputLabel id="variant-select-label">{text("Option", "অপশন")}</InputLabel>
                    <Select
                      labelId="variant-select-label"
                      label={text("Option", "অপশন")}
                      value={effectiveVariantId ?? ""}
                      onChange={(e) => setSelectedVariantId(String(e.target.value))}
                    >
                      {vRows.map((v) => (
                          <MenuItem key={v.id} value={v.id}>
                            {v.name}: {v.value} — {text(`${v.stock} in stock`, `${v.stock} স্টক`)}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                ) : null}

                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  <Chip
                    icon={<PaymentsOutlinedIcon sx={{ fontSize: "18px !important" }} />}
                    label={text("Cash on delivery", "ক্যাশ অন ডেলিভারি")}
                    size="small"
                    sx={(t) => ({
                      fontWeight: 700,
                      bgcolor: alpha(storefrontBrandMain(t), 0.12),
                      border: `1px solid ${alpha(storefrontBrandMain(t), 0.35)}`,
                    })}
                  />
                  <Chip
                    icon={<LocalShippingOutlinedIcon sx={{ fontSize: "18px !important" }} />}
                    label={text("Bangladesh-wide shipping", "সারা বাংলাদেশে শিপিং")}
                    size="small"
                    sx={{ fontWeight: 700, bgcolor: "grey.100", border: "1px solid", borderColor: "divider" }}
                  />
                  {p.freeDeliveryEnabled ? <FreeDeliveryBadge /> : null}
                  <Chip
                    icon={<VerifiedUserOutlinedIcon sx={{ fontSize: "18px !important" }} />}
                    label={text("Verified sellers", "যাচাইকৃত বিক্রেতা")}
                    size="small"
                    sx={{ fontWeight: 700, bgcolor: "grey.100", border: "1px solid", borderColor: "divider" }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <AddToCartSection
                      productId={p.id}
                      stock={displayStock}
                      variantId={vRows.length > 0 ? effectiveVariantId : null}
                    />
                  </Box>
                  <ProductWishlistButton productId={p.id} size="large" />
                </Stack>

                <Card
                  elevation={0}
                  sx={(t) => ({
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(storefrontBrandMain(t), 0.25)}`,
                    bgcolor: alpha(storefrontBrandMain(t), 0.05),
                  })}
                >
                  <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <StorefrontOutlinedIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                        Sold by
                      </Typography>
                    </Stack>
                    <Button
                      component={Link}
                      href={`/v/${p.vendorSlug}`}
                      color="primary"
                      sx={{ fontWeight: 800, fontSize: "1rem", p: 0, minWidth: 0, justifyContent: "flex-start" }}
                    >
                      {p.vendorName}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.5 }}>
                      Visit the store page for more items from this seller.
                    </Typography>
                  </CardContent>
                </Card>
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: { xs: 1, md: 2 } }} />
              <Card
                elevation={0}
                sx={{
                  borderRadius: flatPdp ? 2 : 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  boxShadow: flatPdp
                    ? uiTemplate === "orynbd"
                      ? "0 6px 24px rgba(15,23,42,0.06)"
                      : "none"
                    : "0 16px 48px rgba(11,11,11,0.06)",
                }}
              >
                <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
                  <Tabs
                    value={detailTab}
                    onChange={(_, v) => setDetailTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                      minHeight: 52,
                      "& .MuiTab-root": { fontWeight: 800, textTransform: "none", minHeight: 52 },
                      "& .Mui-selected": { color: "primary.main" },
                      "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "brand.main" },
                    }}
                  >
                    <Tab label={text("Product details", "পণ্যের বিস্তারিত")} />
                    <Tab label={text("Delivery & returns", "ডেলিভারি ও রিটার্ন")} />
                    <Tab label={text("Reviews", "রিভিউ")} />
                  </Tabs>
                </Box>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  {detailTab === 0 ? (
                    <Stack spacing={2.5}>
                      <SpecificationsTableBlock
                        rows={p.specificationsJson}
                        title={text("Specifications", "স্পেসিফিকেশন")}
                      />
                      {(() => {
                        const giBilingual = wrapBilingualHtmlPair(p.generalInfoJson?.en, p.generalInfoJson?.bn);
                        return giBilingual ? (
                          <GeneralInfoTableBlock
                            bilingualRaw={giBilingual}
                            lang={lang}
                            title={text("General information", "সাধারণ তথ্য")}
                            detailLabel={text("Detail", "বিস্তারিত")}
                          />
                        ) : null;
                      })()}
                      <ProductDescriptionPanel
                        text={p.description}
                        preferredLang={lang}
                        title={text("Product description", "পণ্যের বর্ণনা")}
                      />
                      {!p.description?.trim() &&
                      !(p.specificationsJson && p.specificationsJson.length) &&
                      !wrapBilingualHtmlPair(p.generalInfoJson?.en, p.generalInfoJson?.bn) ? (
                        <Typography color="text.secondary" sx={{ px: 0.5 }}>
                          {text(
                            "No written description for this item. See photos and seller info.",
                            "এই পণ্যের লিখিত বর্ণনা নেই। ছবি ও বিক্রেতার তথ্য দেখুন।",
                          )}
                        </Typography>
                      ) : null}
                    </Stack>
                  ) : null}
                  {detailTab === 1 ? deliveryPanel : null}
                  {detailTab === 2 ? (
                    <ProductReviewsPanel
                      vendorSlug={params!.vendorSlug!}
                      productSlug={params!.productSlug!}
                      productId={p.id}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <ProductPageDiscovery excludeProductId={p.id} />
            </Grid>
          </Grid>
        </Container>
      </FadeInSection>
    </>
  );
}
