import { Container, Stack, Box, Typography, IconButton } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useState } from "react";
import { LogoLink } from "./LogoLink";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { MainNavBar } from "./MainNavBar";
import { TopAnnouncementBar } from "./TopAnnouncementBar";
import { MobileStoreNavDrawer } from "./MobileStoreNavDrawer";
import type { Category } from "@/lib/types";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

type Props = { categories: Category[] };

/** Storefront header + nav — distinct structure per layout template (orlenbd / norexbd / orynbd). */
export function StoreHeader({ categories }: Props) {
  const template = useStorefrontLayoutTemplate();
  const { lang, toggleLang } = useStorefrontLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (template === "norexbd" || template === "adorashop") {
    return (
      <>
        <TopAnnouncementBar />
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            bgcolor: "background.paper",
          }}
        >
        {/* Mobile: white chrome (Norex + Adora); search uses default light styling */}
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            bgcolor: "background.paper",
            color: "text.primary",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1.15 }}>
              <IconButton
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                sx={{
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  flexShrink: 0,
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <HeaderSearch categories={categories} showCategorySelect={false} />
              </Box>
            </Stack>
          </Container>
        </Box>
        {/* Desktop */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ py: 1.15 }}>
              <LogoLink />
              <Box sx={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0, px: 1 }}>
                <HeaderSearch categories={categories} />
              </Box>
              <HeaderActions />
            </Stack>
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: template === "norexbd" ? "#FAFAFA" : "grey.50",
              }}
            >
              <MainNavBar categories={categories} />
            </Box>
          </Container>
        </Box>
        <MobileStoreNavDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          categories={categories}
          lang={lang}
          onToggleLang={toggleLang}
        />
        </Box>
      </>
    );
  }

  if (template === "orynbd") {
    return (
      <>
        <TopAnnouncementBar />
        <Box
          component="header"
          sx={{
            bgcolor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
          }}
        >
        <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={{ xs: 0, md: 1.25 }} sx={{ py: { xs: 0, md: 1.75 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 1.25, md: 2 }}
              alignItems={{ md: "center" }}
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ justifyContent: "space-between", width: { xs: "100%", md: "auto" }, display: { xs: "none", md: "flex" } }}
              >
                <LogoLink />
              </Stack>
              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  minWidth: 0,
                  maxWidth: { md: 820 },
                  mx: { xs: 0, md: "auto" },
                  display: { xs: "none", md: "block" },
                }}
              >
                <HeaderSearch categories={categories} />
              </Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: "none", md: "flex" } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, maxWidth: 140, lineHeight: 1.3 }}>
                  Delivering nationwide · COD available
                </Typography>
                <HeaderActions />
              </Stack>
            </Stack>
            </Stack>
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
              mx: { sm: -2 },
              px: { sm: 2 },
              py: 0.25,
            }}
          >
            <MainNavBar categories={categories} />
          </Box>
          <Box sx={{ display: { xs: "block", md: "none" }, py: 0.6 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
              >
                <MenuRoundedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <HeaderSearch categories={categories} showCategorySelect={false} />
              </Box>
            </Stack>
          </Box>
        </Container>
        <MobileStoreNavDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          categories={categories}
          lang={lang}
          onToggleLang={toggleLang}
        />
        </Box>
      </>
    );
  }

  if (template === "masumtraders") {
    return (
      <>
        <TopAnnouncementBar />
        <Box
          component="header"
          sx={{
            bgcolor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={{ xs: 0, md: 1.2 }} sx={{ py: { xs: 0, md: 1.5 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 1.2, md: 2 }}
                alignItems={{ md: "center" }}
                sx={{ display: { xs: "none", md: "flex" } }}
              >
                <LogoLink />
                <Box sx={{ flex: 1, width: "100%", minWidth: 0, maxWidth: { md: 820 }, mx: { xs: 0, md: "auto" } }}>
                  <HeaderSearch categories={categories} />
                </Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: "none", md: "flex" } }}>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800, maxWidth: 170, lineHeight: 1.25 }}>
                    Fresh grocery essentials · Fast delivery
                  </Typography>
                  <HeaderActions />
                </Stack>
              </Stack>
            </Stack>
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                mx: { sm: -2 },
                px: { sm: 2 },
                py: 0.3,
              }}
            >
              <MainNavBar categories={categories} />
            </Box>
            <Box sx={{ display: { xs: "block", md: "none" }, py: 0.6 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
                >
                  <MenuRoundedIcon />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HeaderSearch categories={categories} showCategorySelect={false} />
                </Box>
              </Stack>
            </Box>
          </Container>
          <MobileStoreNavDrawer
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            categories={categories}
            lang={lang}
            onToggleLang={toggleLang}
          />
        </Box>
      </>
    );
  }

  if (template === "uttorasteel") {
    return (
      <>
        <TopAnnouncementBar />
        <Box
          component="header"
          sx={{
            bgcolor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 14px rgba(15,23,42,0.08)",
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={{ xs: 0, md: 1.2 }} sx={{ py: { xs: 0, md: 1.5 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 1.2, md: 2 }}
                alignItems={{ md: "center" }}
                sx={{ display: { xs: "none", md: "flex" } }}
              >
                <LogoLink />
                <Box sx={{ flex: 1, width: "100%", minWidth: 0, maxWidth: { md: 820 }, mx: { xs: 0, md: "auto" } }}>
                  <HeaderSearch categories={categories} />
                </Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: "none", md: "flex" } }}>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800, maxWidth: 190, lineHeight: 1.25 }}>
                    Steel furniture · Workshop builds · COD where offered
                  </Typography>
                  <HeaderActions />
                </Stack>
              </Stack>
            </Stack>
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                mx: { sm: -2 },
                px: { sm: 2 },
                py: 0.3,
              }}
            >
              <MainNavBar categories={categories} />
            </Box>
            <Box sx={{ display: { xs: "block", md: "none" }, py: 0.6 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
                >
                  <MenuRoundedIcon />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HeaderSearch categories={categories} showCategorySelect={false} />
                </Box>
              </Stack>
            </Box>
          </Container>
          <MobileStoreNavDrawer
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            categories={categories}
            lang={lang}
            onToggleLang={toggleLang}
          />
        </Box>
      </>
    );
  }

  // orlenbd — classic marketplace chrome: promo bar scrolls; main bar + menu stay sticky
  return (
    <>
      <TopAnnouncementBar />
      <Box
        component="header"
        sx={{
          bgcolor: "#fff",
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: (t) => t.zIndex.appBar,
          boxShadow: "0 4px 24px rgba(11,11,11,0.06)",
          backdropFilter: "saturate(180%) blur(10px)",
          backgroundColor: "rgba(255,255,255,0.94)",
        }}
      >
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ py: { xs: 0, md: 2 }, display: { xs: "none", md: "flex" } }}
        >
          <LogoLink />
          <Box sx={{ flex: 1, display: "flex", px: 2, justifyContent: "center", minWidth: 0 }}>
            <HeaderSearch categories={categories} />
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <HeaderActions />
          </Stack>
        </Stack>
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            py: { xs: 1, sm: 1.2 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <HeaderSearch categories={categories} showCategorySelect={false} />
            </Box>
          </Stack>
        </Box>
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <MainNavBar categories={categories} />
        </Box>
      </Container>
      <MobileStoreNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        categories={categories}
        lang={lang}
        onToggleLang={toggleLang}
      />
      </Box>
    </>
  );
}
