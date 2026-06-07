import { Box, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useMemo } from "react";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

export function TrustFeaturesBar() {
  const { text } = useStorefrontLanguage();
  const items = useMemo(
    () => [
      {
        icon: LocalShippingOutlinedIcon,
        title: text("Free delivery", "বিনামূল্যে ডেলিভারি"),
        sub: text("On eligible orders nationwide", "নির্দিষ্ট অর্ডারে সারা দেশে"),
      },
      {
        icon: VerifiedUserOutlinedIcon,
        title: text("Verified vendors", "যাচাইকৃত বিক্রেতা"),
        sub: text("Curated marketplace", "বাছাই করা মার্কেটপ্লেস"),
      },
      {
        icon: WorkspacePremiumOutlinedIcon,
        title: text("Quality items", "ভালো মানের পণ্য"),
        sub: text("Easy returns policy", "সহজ ফেরত নীতি"),
      },
      {
        icon: HeadsetMicOutlinedIcon,
        title: text("24/7 support", "২৪ ঘণ্টা সহায়তা"),
        sub: text("We are here to help", "সাহায্যের জন্য আমরা আছি"),
      },
    ],
    [text],
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3.5 } }}>
      <Grid container spacing={2}>
        {items.map(({ icon: Icon, title, sub }) => (
          <Grid item xs={6} md={3} key={title}>
            <Paper
              elevation={0}
              sx={{
                p: 2.25,
                height: "100%",
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "#fff",
                transition: "transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: (t) => `0 16px 40px rgba(11,11,11,0.08), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.35)}`,
                  borderColor: (t) => alpha(storefrontBrandMain(t), 0.45),
                  "& .ob-trust-icon-wrap": {
                    transform: "scale(1.06) rotate(-2deg)",
                    bgcolor: (t) => alpha(storefrontBrandMain(t), 0.22),
                  },
                },
              }}
            >
              <Stack direction="row" spacing={1.75} alignItems="center">
                <Box
                  className="ob-trust-icon-wrap"
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (t) => alpha(storefrontBrandMain(t), 0.16),
                    transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.24s ease",
                  }}
                >
                  <Icon sx={{ fontSize: 28, color: "primary.dark" }} />
                </Box>
                <Stack spacing={0}>
                  <Typography fontWeight={800} fontSize="0.95rem" letterSpacing={-0.2}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                    {sub}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
