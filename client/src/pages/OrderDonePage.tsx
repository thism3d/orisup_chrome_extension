import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Link, useRoute } from "wouter";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import {
  storefrontMessagePaperSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
} from "@/lib/storefrontUiSurface";

export function OrderDonePage() {
  const brand = useSiteBrand();
  const theme = useTheme();
  const { uiTemplate } = useStorefrontUiTemplate();
  const [, params] = useRoute("/order-done/:orderNumber");
  const orderNumber = params?.orderNumber ?? "";

  return (
    <>
      <Seo
        title="Order confirmed"
        description={`Thank you for your ${brand} order${orderNumber ? ` ${orderNumber}` : ""}.`}
        noindex
        canonicalPath={orderNumber ? `/order-done/${encodeURIComponent(orderNumber)}` : "/order-done"}
      />
    <FadeInSection>
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Paper elevation={0} sx={storefrontMessagePaperSx(uiTemplate)}>
          <Box
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 2,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.success.main, 0.16),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.main" }} />
          </Box>
          <Typography
            variant={storefrontRetailTitleVariant(uiTemplate)}
            component="h1"
            gutterBottom
            sx={storefrontRetailTitleSx(uiTemplate)}
          >
            Thank you!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
            Order{" "}
            <Box component="span" fontWeight={800} color="primary.main">
              {orderNumber}
            </Box>{" "}
            is confirmed.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We will contact you for delivery across Bangladesh. Keep your phone available for COD confirmation.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" flexWrap="wrap">
            {orderNumber && (
              <Button
                component={Link}
                href={`/account/orders/${encodeURIComponent(orderNumber)}`}
                variant="contained"
                color="primary"
                sx={{ fontWeight: 800 }}
              >
                Track this order
              </Button>
            )}
            <Button component={Link} href="/account/orders" variant="outlined" sx={{ fontWeight: 700 }}>
              All orders
            </Button>
            <Button component={Link} href="/" variant="outlined" color="inherit" sx={{ fontWeight: 700 }}>
              Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </FadeInSection>
    </>
  );
}
