import { Button, Container, Paper, Typography } from "@mui/material";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { ProductListRow } from "@/lib/types";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/ProductGridSkeleton";
import { RequireRole } from "@/components/auth/RequireRole";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import {
  storefrontCatalogEmptyHintPaperSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
} from "@/lib/storefrontUiSurface";

type Row = { product: ProductListRow["product"]; vendorSlug: string; vendorName: string };

export function WishlistPage() {
  return (
    <RequireRole roles={["customer", "vendor_staff", "platform_admin"]}>
      <WishlistInner />
    </RequireRole>
  );
}

function WishlistInner() {
  const { containerMaxWidth, uiTemplate } = useStorefrontUiTemplate();
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const { data = [], isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => apiJson<Row[]>("/api/wishlist"),
  });

  const items: ProductListRow[] = data.map((r) => ({
    product: r.product,
    vendorSlug: r.vendorSlug,
    vendorName: r.vendorName,
  }));

  return (
    <>
      <Seo title={text("Wishlist", "ইচ্ছেতালিকা")} description={text(`Your saved products on ${brand}.`, `${brand}-এ আপনার সংরক্ষিত পণ্যসমূহ।`)} noindex canonicalPath="/wishlist" />
    <FadeInSection>
      <Container maxWidth={containerMaxWidth} sx={{ py: { xs: 3, md: uiTemplate === "orynbd" ? 4 : 3 } }}>
        <Typography
          variant={storefrontRetailTitleVariant(uiTemplate)}
          component="h1"
          gutterBottom
          sx={storefrontRetailTitleSx(uiTemplate)}
        >
          {text("Wishlist", "ইচ্ছেতালিকা")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {text("Saved items from product pages — buy them anytime.", "প্রোডাক্ট পেজ থেকে সংরক্ষিত আইটেম — যেকোনো সময় কিনতে পারবেন।")}
        </Typography>
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <Paper elevation={0} sx={storefrontCatalogEmptyHintPaperSx(uiTemplate, { isError: false })}>
            <FavoriteBorderOutlinedIcon sx={{ fontSize: 56, color: "text.secondary", mb: 1, opacity: 0.75 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {text("No saved items", "কোনো সংরক্ষিত আইটেম নেই")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {text("Tap the heart on products you love — they will show up here.", "যে পণ্য পছন্দ, সেখানে হার্ট চাপুন — সেগুলো এখানে দেখাবে।")}
            </Typography>
            <Button component={Link} href="/shop" variant="contained" color="primary" sx={{ fontWeight: 800 }}>
              {text("Discover products", "পণ্য খুঁজুন")}
            </Button>
          </Paper>
        ) : (
          <ProductGrid items={items} showDiscountBadge />
        )}
      </Container>
    </FadeInSection>
    </>
  );
}
