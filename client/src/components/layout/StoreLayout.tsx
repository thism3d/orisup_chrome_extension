import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Fade,
  Stack,
  Link as MuiLink,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { apiJson } from "@/lib/api";
import { faviconMimeType } from "@/lib/favicon";
import { readInitialSiteMeta } from "@/lib/initialSiteMeta";
import type { Category } from "@/lib/types";
import { absoluteUrl, mediaAbsoluteUrl } from "@/lib/site";
import {
  STOREFRONT_PREVIEW_TEMPLATE_PARAM,
  STOREFRONT_PREVIEW_THEME_PARAM,
} from "@/lib/storefrontPreviewUrl";
import { CartFeedbackProvider } from "@/components/cart/CartFeedbackContext";
import { PublicSiteMetaProvider } from "@/contexts/PublicSiteMetaContext";
import { StorefrontUiTemplateProvider } from "@/contexts/StorefrontUiTemplateContext";
import { StorefrontLanguageProvider } from "@/contexts/StorefrontLanguageContext";
import { applyStorefrontCssVars, resetStorefrontCssVars } from "@/theme/applyStorefrontCssVars";
import { normalizeStorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";
import { getStorefrontThemeForLayout } from "@/theme/storefrontTemplateTheme";
import { normalizeStorefrontThemeId } from "@/theme/storefrontThemes";
import { StoreHeader } from "./StoreHeader";
import { TopPromotionBar } from "./TopPromotionBar";
import { StoreFooter } from "./StoreFooter";
import { ScrollToTopFab } from "./ScrollToTopFab";
import { MobileBottomBar } from "./MobileBottomBar";
import { StoreAuthModalProvider } from "@/contexts/StoreAuthModalContext";
import { StoreAuthDialog } from "@/components/storefront/StoreAuthDialog";

type Props = { children: ReactNode };

export function StoreLayout({ children }: Props) {
  const search = useSearch();
  const [path, setLocation] = useLocation();
  const previewParams = useMemo(() => new URLSearchParams(search), [search]);
  const previewThemeParam = previewParams.get(STOREFRONT_PREVIEW_THEME_PARAM);
  const previewTemplateParam = previewParams.get(STOREFRONT_PREVIEW_TEMPLATE_PARAM);
  const previewActive = Boolean(previewThemeParam || previewTemplateParam);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<Category[]>("/api/categories"),
  });

  const initialSiteMeta = useMemo(() => readInitialSiteMeta(), []);
  const { data: siteMeta, isPending: siteMetaPending } = useQuery({
    queryKey: ["public-site-meta"],
    queryFn: () => apiJson<Record<string, string>>("/api/public/site-meta"),
    initialData: initialSiteMeta,
    staleTime: 60_000,
  });

  /** Until meta loads, template/theme fall back to Orlenbd defaults — hide shell to avoid flash on other brands. */
  const storefrontShellPending = !previewActive && !siteMeta && siteMetaPending;

  const faviconHref = mediaAbsoluteUrl(siteMeta?.favicon_url) ?? absoluteUrl("/favicon.svg");
  const faviconType = faviconMimeType(siteMeta?.favicon_url);

  const mergedSiteMeta = useMemo(() => {
    const base: Record<string, string> = { ...(siteMeta ?? {}) };
    if (previewThemeParam?.trim()) {
      base.storefront_theme = normalizeStorefrontThemeId(previewThemeParam.trim());
    }
    if (previewTemplateParam?.trim()) {
      base.storefront_ui_template = normalizeStorefrontUiTemplateId(previewTemplateParam.trim());
    }
    return base;
  }, [siteMeta, previewThemeParam, previewTemplateParam]);

  const themeId = normalizeStorefrontThemeId(mergedSiteMeta.storefront_theme);
  const uiTemplateId = normalizeStorefrontUiTemplateId(mergedSiteMeta.storefront_ui_template);
  const themeOverrides = useMemo(() => {
    try {
      const raw = JSON.parse(mergedSiteMeta.storefront_theme_overrides || "{}") as Record<
        string,
        { primary?: string; secondary?: string; text?: string }
      >;
      const fromMap = raw?.[themeId] ?? {};
      return {
        primary: fromMap.primary ?? mergedSiteMeta.storefront_theme_primary,
        secondary: fromMap.secondary ?? mergedSiteMeta.storefront_theme_secondary,
        onLightText: fromMap.text,
      };
    } catch {
      return {
        primary: mergedSiteMeta.storefront_theme_primary,
        secondary: mergedSiteMeta.storefront_theme_secondary,
      };
    }
  }, [
    mergedSiteMeta.storefront_theme_overrides,
    mergedSiteMeta.storefront_theme_primary,
    mergedSiteMeta.storefront_theme_secondary,
    themeId,
  ]);
  const storefrontTheme = useMemo(
    () => getStorefrontThemeForLayout(themeId, uiTemplateId, themeOverrides),
    [themeId, uiTemplateId, themeOverrides],
  );

  const clearPreviewParams = () => {
    const next = new URLSearchParams(previewParams);
    next.delete(STOREFRONT_PREVIEW_THEME_PARAM);
    next.delete(STOREFRONT_PREVIEW_TEMPLATE_PARAM);
    const q = next.toString();
    setLocation(q ? `${window.location.pathname}?${q}` : window.location.pathname);
  };

  useEffect(() => {
    applyStorefrontCssVars(storefrontTheme);
    return () => resetStorefrontCssVars();
  }, [storefrontTheme]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [path, search]);

  return (
    <CartFeedbackProvider>
      <PublicSiteMetaProvider value={mergedSiteMeta}>
        <StorefrontUiTemplateProvider value={uiTemplateId}>
        <StorefrontLanguageProvider>
        <StoreAuthModalProvider>
        <Helmet>
          <link rel="icon" href={faviconHref} type={faviconType} />
          <link rel="shortcut icon" href={faviconHref} type={faviconType} />
          <meta name="theme-color" content={storefrontTheme.palette.brand.main} />
        </Helmet>
        <ThemeProvider theme={storefrontTheme}>
          <CssBaseline enableColorScheme />
          <Fade in={storefrontShellPending} timeout={180} mountOnEnter unmountOnExit>
            <Box
              aria-label="Loading storefront"
              aria-busy="true"
              sx={{
                position: "fixed",
                inset: 0,
                zIndex: (t) => t.zIndex.modal + 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#f8fafc",
              }}
            >
              <CircularProgress size={40} thickness={4} sx={{ color: "text.secondary" }} />
            </Box>
          </Fade>
          {previewActive ? (
            <Box
              sx={{
                py: 0.75,
                px: 2,
                textAlign: "center",
                bgcolor: "warning.dark",
                color: "warning.contrastText",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" component="span" sx={{ fontWeight: 700, mr: 1 }}>
                Storefront preview
              </Typography>
              <Typography variant="caption" component="span" sx={{ opacity: 0.95 }}>
                URL overrides are active (theme / layout). This is not saved until you change platform settings.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={clearPreviewParams}
                sx={{ ml: 1.5, py: 0, minHeight: 26, borderColor: "rgba(255,255,255,0.5)", color: "inherit" }}
              >
                Clear preview
              </Button>
            </Box>
          ) : null}
          <MuiLink
            href="#main-content"
            sx={{
              position: "absolute",
              left: 12,
              top: -100,
              zIndex: 9999,
              px: 2,
              py: 1,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              borderRadius: 1,
              fontWeight: 700,
              textDecoration: "none",
              "&:focus": { top: 12, outline: "2px solid", outlineColor: "secondary.main" },
            }}
          >
            Skip to main content
          </MuiLink>
          <Stack
            minHeight="100vh"
            data-storefront-ui-template={uiTemplateId}
            sx={(t) => {
              const b = storefrontBrandMain(t);
              return {
                bgcolor: "background.default",
                backgroundImage:
                  uiTemplateId === "norexbd"
                    ? `linear-gradient(180deg, ${alpha(b, 0.05)} 0%, #FFFFFF 32%)`
                    : uiTemplateId === "adorashop"
                      ? "none"
                      : uiTemplateId === "orynbd"
                        ? `linear-gradient(180deg, ${alpha(b, 0.16)} 0%, ${t.palette.background.default} 42%, ${alpha(b, 0.05)} 100%)`
                        : uiTemplateId === "masumtraders"
                          ? `linear-gradient(180deg, ${alpha(b, 0.15)} 0%, ${t.palette.background.default} 34%, ${alpha(b, 0.08)} 100%)`
                          : uiTemplateId === "uttorasteel"
                            ? `linear-gradient(180deg, ${alpha(b, 0.12)} 0%, ${t.palette.background.default} 38%, ${alpha(b, 0.06)} 100%)`
                            : `linear-gradient(180deg, ${alpha(b, 0.12)} 0%, ${t.palette.grey[50]} 22%, ${t.palette.background.default} 55%, ${alpha(b, 0.05)} 100%)`,
              };
            }}
          >
            <TopPromotionBar />
            <StoreHeader categories={categories} />
            <Box
              component="main"
              id="main-content"
              tabIndex={-1}
              sx={{
                flex: 1,
                pb: { xs: "calc(88px + env(safe-area-inset-bottom, 0px))", md: 0 },
              }}
            >
              {children}
            </Box>
            <StoreFooter />
            <MobileBottomBar />
            <ScrollToTopFab />
            <StoreAuthDialog />
          </Stack>
        </ThemeProvider>
        </StoreAuthModalProvider>
        </StorefrontLanguageProvider>
        </StorefrontUiTemplateProvider>
      </PublicSiteMetaProvider>
    </CartFeedbackProvider>
  );
}
