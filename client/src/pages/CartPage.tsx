import { Alert, Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Skeleton, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Link } from "wouter";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { formatBdt } from "@/lib/format";
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
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { parseDecimalString } from "@shared/parseDecimalString";

function CartSkeleton() {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Stack key={i} direction="row" spacing={2} alignItems="center" py={2}>
          <Skeleton variant="rounded" width={88} height={88} sx={{ borderRadius: 2 }} />
          <Stack flex={1}>
            <Skeleton width="70%" />
            <Skeleton width="40%" />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export function CartPage() {
  const theme = useTheme();
  const brand = useSiteBrand();
  const { containerMaxWidth, minimalChrome, uiTemplate } = useStorefrontUiTemplate();
  const { data, isLoading } = useCart();
  const { text } = useStorefrontLanguage();
  const search = typeof window !== "undefined" ? new URL(window.location.href).searchParams : new URLSearchParams();
  const paymentStatus = (search.get("payment_status") ?? "").toLowerCase();
  const paymentReason = search.get("payment_reason") ?? "";
  const [paymentResultOpen, setPaymentResultOpen] = useState(Boolean(paymentStatus));

  const subtotal =
    data?.lines.reduce((s, l) => {
      const unit = l.variant ? parseDecimalString(l.variant.price) : parseDecimalString(l.product.price);
      return s + unit * l.line.quantity;
    }, 0) ?? 0;
  const lineCount = data?.lines.reduce((s, l) => s + l.line.quantity, 0) ?? 0;

  return (
    <>
      <Seo title={text("Shopping cart", "শপিং কার্ট")} description={text(`Review your ${brand} cart before checkout.`, `চেকআউটের আগে আপনার ${brand} কার্ট পর্যালোচনা করুন।`)} noindex canonicalPath="/cart" />
    <FadeInSection>
      <Box
        sx={{
          minHeight: "60vh",
          background: `linear-gradient(180deg, ${alpha(storefrontBrandMain(theme), 0.08)} 0%, ${theme.palette.background.default} 28%, ${theme.palette.background.default} 100%)`,
        }}
      >
        <Container maxWidth={containerMaxWidth} sx={{ py: { xs: 3, md: 4 } }}>
          <Typography
            variant={storefrontRetailTitleVariant(uiTemplate)}
            component="h1"
            gutterBottom
            sx={storefrontRetailTitleSx(uiTemplate)}
          >
            {text("Shopping cart", "শপিং কার্ট")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {lineCount > 0 ? `${lineCount} ${text(lineCount === 1 ? "item" : "items", "আইটেম")} · ${text("Review before checkout", "চেকআউটের আগে দেখুন")}` : text("Your saved items", "আপনার সংরক্ষিত পণ্য")}
          </Typography>

          {isLoading && <CartSkeleton />}
          {!isLoading && (!data?.lines.length ? (
            <Paper
              elevation={0}
              sx={{
                ...storefrontCatalogEmptyHintPaperSx(uiTemplate, { isError: false }),
                borderColor: alpha(storefrontBrandMain(theme), 0.45),
                maxWidth: 480,
                mx: "auto",
              }}
            >
              <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: "text.secondary", mb: 1, opacity: 0.75 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {text("Your cart is empty", "আপনার কার্ট খালি")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {text("Discover groceries, tech, fashion and more from trusted Bangladesh sellers.", "বাংলাদেশের বিশ্বস্ত বিক্রেতাদের কাছ থেকে গ্রোসারি, টেক, ফ্যাশনসহ আরও পণ্য আবিষ্কার করুন।")}
              </Typography>
              <Button component={Link} href="/shop" variant="contained" color="primary" size="large" sx={{ fontWeight: 800 }}>
                {text("Browse products", "পণ্য দেখুন")}
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: minimalChrome ? 2 : 3,
                    border: "1px solid",
                    borderColor: "divider",
                    overflow: "hidden",
                    boxShadow: minimalChrome ? "none" : "0 12px 40px rgba(11,11,11,0.05)",
                  }}
                >
                  <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} color="text.secondary" letterSpacing={0.5}>
                      {text("ITEMS", "আইটেমসমূহ")}
                    </Typography>
                  </Box>
                  <Stack divider={<Box sx={{ borderTop: "1px solid #f0f0f0", mx: { xs: 2, sm: 2.5 } }} />}>
                    {data.lines.map((row) => (
                      <CartLineRow key={row.line.id} row={row} />
                    ))}
                  </Stack>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    position: { md: "sticky" },
                    top: { md: 96 },
                    borderRadius: minimalChrome ? 2 : 3,
                    border: "1px solid",
                    borderColor: alpha(storefrontBrandMain(theme), 0.45),
                    bgcolor: alpha(storefrontBrandMain(theme), 0.08),
                    p: 2.5,
                    boxShadow: minimalChrome ? "none" : "0 16px 44px rgba(11,11,11,0.07)",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom letterSpacing={0.5}>
                    {text("ORDER SUMMARY", "অর্ডার সারসংক্ষেপ")}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 2, mb: 1 }}>
                    <Typography color="text.secondary">{text("Subtotal", "সাবটোটাল")}</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary">
                      {formatBdt(subtotal)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {text("Shipping calculated at checkout. COD available where the seller supports it.", "শিপিং চার্জ চেকআউটে নির্ধারিত হবে। ভেন্ডর সমর্থন করলে COD পাওয়া যাবে।")}
                  </Typography>
                  <Button
                    component={Link}
                    href="/checkout"
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    sx={{ py: 1.5, fontWeight: 800, boxShadow: (t) => `0 10px 28px ${alpha(storefrontBrandMain(t), 0.35)}` }}
                  >
                    {text("Proceed to checkout", "চেকআউটে যান")}
                  </Button>
                  <Stack spacing={1} sx={{ mt: 2.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocalShippingOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {text("Nationwide delivery from verified vendors", "যাচাইকৃত ভেন্ডরদের দেশব্যাপী ডেলিভারি")}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LockOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {text(`Secure checkout on ${brand}`, `${brand}-এ নিরাপদ চেকআউট`)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          ))}
        </Container>
      </Box>
      <Dialog open={paymentResultOpen} onClose={() => setPaymentResultOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment update</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Alert severity={paymentStatus === "cancel" || paymentStatus === "cancelled" ? "warning" : "error"}>
              {paymentStatus === "cancel" || paymentStatus === "cancelled"
                ? "Payment was cancelled."
                : paymentStatus === "failed"
                  ? "Payment failed."
                  : "Payment was not completed."}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {paymentReason || "Please try again or choose another payment method."}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentResultOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </FadeInSection>
    </>
  );
}
