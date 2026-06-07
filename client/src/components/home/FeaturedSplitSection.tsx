import { Grid, Card, CardMedia, Typography, Button, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { Link } from "wouter";
import { ProductGrid } from "@/components/ui/ProductGrid";
import type { ProductListRow } from "@/lib/types";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { resizedImg } from "@/lib/responsiveImg";

type Props = { sideProducts: ProductListRow[]; gridProducts: ProductListRow[] };

export function FeaturedSplitSection({ sideProducts, gridProducts }: Props) {
  const { isNorexbd, isAdoraShop, isOrynbd } = useStorefrontUiTemplate();
  const softPromo = isNorexbd || isAdoraShop;
  const promoRaw = sideProducts[0]?.product.images?.[0];
  const promoImg = promoRaw ? resizedImg(promoRaw, 768) || promoRaw : undefined;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5} sx={{ display: { xs: "none", md: "block" } }}>
        <Card
          sx={(t) => ({
            borderRadius: 2.5,
            overflow: "hidden",
            height: "100%",
            minHeight: 320,
            border: `1px solid ${alpha(storefrontBrandMain(t), 0.4)}`,
            boxShadow: "0 22px 56px rgba(11,11,11,0.09)",
            transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.32s ease",
            "&:hover": {
              transform: "translateY(-6px) scale(1.01)",
              boxShadow: `0 32px 72px rgba(11,11,11,0.14), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.25)}`,
            },
          })}
        >
          <CardMedia
            component="div"
            sx={(t) => ({
              height: "100%",
              minHeight: 320,
              position: "relative",
              overflow: "hidden",
              backgroundImage: `linear-gradient(125deg, ${alpha(storefrontBrandMain(t), softPromo ? 0.14 : isOrynbd ? 0.2 : 0.24)} 0%, ${alpha(storefrontBrandMain(t), softPromo ? 0.22 : isOrynbd ? 0.3 : 0.4)} 40%, ${alpha(storefrontBrandMain(t), softPromo ? 0.16 : isOrynbd ? 0.24 : 0.32)} 100%)`,
              backgroundSize: "220% 220%",
              animation: "obGradientShift 10s ease infinite",
              "@keyframes obGradientShift": {
                "0%": { backgroundPosition: "0% 40%" },
                "50%": { backgroundPosition: "100% 60%" },
                "100%": { backgroundPosition: "0% 40%" },
              },
              display: "flex",
              alignItems: "flex-end",
              p: 3,
              "&::before": promoImg && promoImg.trim() !== ""
                ? {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${promoImg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right -12px center",
                    backgroundSize: "58%",
                    opacity: 0.2,
                    mixBlendMode: "multiply",
                    pointerEvents: "none",
                  }
                : undefined,
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0%, transparent 45%)",
                pointerEvents: "none",
              },
            })}
          >
            <Stack spacing={1.25} sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="overline" fontWeight={800} sx={{ color: "rgba(11,11,11,0.55)", letterSpacing: 1.2 }}>
                Curated for you
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#0B0B0B" sx={{ letterSpacing: -0.3 }}>
                Happy picks for every home
              </Typography>
              <Button
                component={Link}
                href="/shop"
                variant="contained"
                color="secondary"
                size="medium"
                sx={{
                  alignSelf: "flex-start",
                  fontWeight: 800,
                  boxShadow: "0 8px 24px rgba(11,11,11,0.15)",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                Browse collection
              </Button>
            </Stack>
          </CardMedia>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <ProductGrid items={sideProducts} eagerCount={6} />
      </Grid>
      <Grid item xs={12}>
        <ProductGrid items={gridProducts} showNew eagerCount={6} />
      </Grid>
    </Grid>
  );
}
