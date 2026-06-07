import { Box, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link } from "wouter";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontAnnouncementBarSx } from "@/lib/storefrontUiSurface";

export function TopAnnouncementBar() {
  const template = useStorefrontLayoutTemplate();
  const { lang, toggleLang, text } = useStorefrontLanguage();
  return (
    <Box sx={{ ...storefrontAnnouncementBarSx(template), display: { xs: "none", md: "block" } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ display: { xs: "none", md: "flex" } }}
        >
          <Typography variant="inherit" sx={{ fontWeight: 600, letterSpacing: "0.01em" }}>
            {text("Enjoy free delivery on orders from ৳5,000 · Use code ", "৳৫,০০০+ অর্ডারে ফ্রি ডেলিভারি · কোড ব্যবহার করুন ")}
            <Box component="span" sx={{ fontWeight: 800 }}>
              FreeDelivery
            </Box>
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="flex-end">
            <MuiLink component={Link} href="/vendor" underline="hover" sx={{ color: "inherit", fontWeight: 600, opacity: 0.92 }}>
              {text("Become a vendor", "ভেন্ডর হোন")}
            </MuiLink>
            <Typography component="span" sx={{ opacity: 0.35 }}>
              |
            </Typography>
            <MuiLink href="#" underline="hover" sx={{ color: "inherit", opacity: 0.92 }} onClick={(e) => { e.preventDefault(); toggleLang(); }}>
              {lang === "bn" ? "English" : "বাংলা"}
            </MuiLink>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              BDT ৳
            </Typography>
            <MuiLink component={Link} href="/faq" underline="hover" sx={{ color: "inherit", fontWeight: 600, opacity: 0.92 }}>
              {text("Help", "সহায়তা")}
            </MuiLink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
