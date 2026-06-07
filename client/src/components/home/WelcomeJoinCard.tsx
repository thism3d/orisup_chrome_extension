import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { useStoreAuthModal } from "@/contexts/StoreAuthModalContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

export function WelcomeJoinCard() {
  const { user } = useAuth();
  const { text } = useStorefrontLanguage();
  const { openLogin, openRegister } = useStoreAuthModal();

  if (user) return null;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 2.25,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F7F7F7 100%)",
        height: "100%",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        "&:hover": {
          boxShadow: (t) => `0 18px 44px rgba(11,11,11,0.09), 0 0 0 1px ${storefrontBrandMain(t)}40`,
          borderColor: "brand.main",
        },
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={800}>
          {text("Welcome to our marketplace", "আমাদের মার্কেটে স্বাগতম")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {text(
            "Sign in to track orders, save a wishlist, and checkout faster.",
            "অর্ডার দেখতে, পছন্দের তালিকা রাখতে ও দ্রুত কেনাকাটা করতে সাইন ইন করুন।",
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button type="button" onClick={() => openRegister()} variant="contained" color="primary" size="small">
            {text("Join us", "অ্যাকাউন্ট খুলুন")}
          </Button>
          <Button type="button" onClick={() => openLogin()} variant="outlined" color="inherit" size="small">
            {text("Sign in", "লগ ইন")}
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=70"
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover" }}
          />
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&q=70"
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover" }}
          />
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=120&q=70"
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover" }}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
