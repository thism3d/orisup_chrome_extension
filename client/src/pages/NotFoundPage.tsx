import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import { Link } from "wouter";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontMessagePaperSx, storefrontRetailTitleSx, storefrontRetailTitleVariant } from "@/lib/storefrontUiSurface";

export function NotFoundPage() {
  const brand = useSiteBrand();
  const theme = useTheme();
  const { uiTemplate } = useStorefrontUiTemplate();
  return (
    <>
      <Seo title="Page not found" description={`This page does not exist on ${brand}.`} noindex />
    <FadeInSection>
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Paper elevation={0} sx={storefrontMessagePaperSx(uiTemplate)}>
          <Box
            sx={{
              width: 88,
              height: 88,
              mx: "auto",
              mb: 2,
              borderRadius: "50%",
              bgcolor: alpha(storefrontBrandMain(theme), 0.2),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SearchOffOutlinedIcon sx={{ fontSize: 44, color: "primary.dark" }} />
          </Box>
          <Typography
            variant="overline"
            fontWeight={800}
            sx={{ color: "primary.dark", letterSpacing: 2, display: "block", mb: 0.5 }}
          >
            Error 404
          </Typography>
          <Typography
            variant={storefrontRetailTitleVariant(uiTemplate)}
            component="h1"
            gutterBottom
            sx={storefrontRetailTitleSx(uiTemplate)}
          >
            Page not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: "auto" }}>
            The link may be broken or the page was removed. Head back to the shop or home.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button
              component={Link}
              href="/"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<HomeOutlinedIcon />}
              sx={{ fontWeight: 800 }}
            >
              Home
            </Button>
            <Button
              component={Link}
              href="/shop"
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<StorefrontOutlinedIcon />}
              sx={{ fontWeight: 700, borderColor: "divider" }}
            >
              Browse shop
            </Button>
          </Stack>
        </Paper>
      </Container>
    </FadeInSection>
    </>
  );
}
