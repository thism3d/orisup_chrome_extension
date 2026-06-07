import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useLocation } from "wouter";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useStoreAuthModal } from "@/contexts/StoreAuthModalContext";

/** Deep link: opens the storefront sign-in dialog (Daraz-style modal). */
export function LoginPage() {
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const { user, loading } = useAuth();
  const [, setLoc] = useLocation();
  const { openLogin } = useStoreAuthModal();

  useEffect(() => {
    openLogin();
  }, [openLogin]);

  useEffect(() => {
    if (!loading && user?.role === "platform_admin") {
      setLoc("/admin");
    }
  }, [loading, user, setLoc]);

  if (!loading && user?.role === "platform_admin") {
    return (
      <>
        <Seo title={text("Sign in", "সাইন ইন")} description={text(`Sign in to ${brand}`, `${brand}-এ সাইন ইন করুন`)} noindex canonicalPath="/login" />
        <Box sx={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">{text("Redirecting…", "রিডাইরেক্ট করা হচ্ছে…")}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <Seo
        title={text("Sign in", "সাইন ইন")}
        description={text(`Sign in to ${brand} to track orders, save addresses, and checkout faster.`, `${brand}-এ সাইন ইন করে অর্ডার ট্র্যাক, ঠিকানা সংরক্ষণ এবং দ্রুত চেকআউট করুন।`)}
        noindex
        canonicalPath="/login"
      />
      <FadeInSection>
        <Box sx={{ py: { xs: 4, sm: 8 }, px: 2, textAlign: "center", maxWidth: 480, mx: "auto" }}>
          <Typography variant="h6" gutterBottom fontWeight={800}>
            {text("Sign in", "সাইন ইন")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text("Use the dialog to sign in or create an account.", "ডায়ালগ ব্যবহার করে সাইন ইন করুন বা অ্যাকাউন্ট তৈরি করুন।")}
          </Typography>
        </Box>
      </FadeInSection>
    </>
  );
}
