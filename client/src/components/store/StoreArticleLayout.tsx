import type { ReactNode } from "react";
import { Box, Breadcrumbs, Chip, Container, Link as MuiLink, Paper, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import { Seo } from "@/components/seo/Seo";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import {
  storefrontAccountContainerMaxWidth,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
} from "@/lib/storefrontUiSurface";
import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";

type Props = {
  title: string;
  description: string;
  canonicalPath: string;
  /** Shown under title; default last updated note */
  updated?: string;
  /** Optional pill above the title, e.g. “Legal” */
  kicker?: string;
  /** One-line lead under the title */
  intro?: string;
  /** When true, content spans the full storefront width (Brand Trust / legal pages). */
  fullWidth?: boolean;
  children: ReactNode;
};

export function StoreArticleLayout({
  title,
  description,
  canonicalPath,
  updated = "Last updated: April 2026",
  kicker,
  intro,
  fullWidth = false,
  children,
}: Props) {
  const { uiTemplate } = useStorefrontUiTemplate();
  const titleVariant = storefrontRetailTitleVariant(uiTemplate);
  const theme = useTheme();
  const brand = storefrontBrandMain(theme);
  const siteName = useSiteBrand();
  const pageUrl = absoluteUrl(canonicalPath);
  const webPageLd = {
    "@type": "WebPage" as const,
    name: title,
    description,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite" as const,
      name: siteName,
      url: getSiteUrl(),
    },
  };
  const prose = {
    "& h2": {
      fontSize: uiTemplate === "orynbd" ? "1.2rem" : "1.125rem",
      fontWeight: 800,
      mt: 0,
      mb: 1.25,
      letterSpacing: uiTemplate === "norexbd" ? -0.15 : -0.2,
    },
    "& h2:not(:first-of-type)": { mt: 2.5 },
    "& p": { mb: 2, lineHeight: 1.78, color: "text.primary" },
    "& ul": { pl: 2.5, mb: 2 },
    "& li": { mb: 0.75, lineHeight: 1.65 },
  } as const;

  return (
    <>
      <Seo title={title} description={description} canonicalPath={canonicalPath} jsonLd={webPageLd} />
      <Box
        sx={{
          background: `linear-gradient(180deg, ${alpha(brand, 0.1)} 0%, ${theme.palette.background.default} 40%)`,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <FadeInSection>
          <Container
            maxWidth={fullWidth ? "xl" : storefrontAccountContainerMaxWidth(uiTemplate)}
            sx={{
              width: "100%",
              /* Match StoreHeader shell width so trust pages don’t sit in a narrow column. */
              px: fullWidth ? { xs: 1.5, sm: 2 } : undefined,
              py: { xs: 3, md: uiTemplate === "orynbd" ? 6 : 5 },
              pb: { xs: 5, md: uiTemplate === "orynbd" ? 8 : 7 },
            }}
          >
            <Breadcrumbs sx={{ mb: 2 }} aria-label="breadcrumb">
              <MuiLink component={Link} href="/" underline="hover" color="inherit" fontWeight={600}>
                Home
              </MuiLink>
              <Typography color="text.primary" fontWeight={700}>
                {title}
              </Typography>
            </Breadcrumbs>
            {kicker ? (
              <Chip label={kicker} size="small" color="primary" variant="outlined" sx={{ mb: 1.5, fontWeight: 700 }} />
            ) : null}
            <Typography variant={titleVariant} component="h1" gutterBottom sx={storefrontRetailTitleSx(uiTemplate)}>
              {title}
            </Typography>
            {intro ? (
              <Typography
                variant="h6"
                component="p"
                sx={{
                  fontWeight: 500,
                  color: "text.secondary",
                  mb: 1.5,
                  lineHeight: 1.5,
                  maxWidth: fullWidth ? "none" : 720,
                }}
              >
                {intro}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {updated}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3, md: 4 },
                borderRadius: 3,
                boxShadow: "0 12px 48px rgba(15, 23, 42, 0.06)",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box component="article" sx={prose}>
                {children}
              </Box>
            </Paper>
          </Container>
        </FadeInSection>
      </Box>
    </>
  );
}
