import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStoreAuthModal } from "@/contexts/StoreAuthModalContext";

/** Deep link: opens the storefront registration tab in the auth dialog. */
export function RegisterPage() {
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const { openRegister } = useStoreAuthModal();

  useEffect(() => {
    openRegister();
  }, [openRegister]);

  return (
    <>
      <Seo
        title="Create account"
        description={`Join ${brand} to shop from verified sellers and track your orders.`}
        noindex
        canonicalPath="/register"
      />
      <FadeInSection>
        <Box sx={{ py: { xs: 4, sm: 8 }, px: 2, textAlign: "center", maxWidth: 480, mx: "auto" }}>
          <Typography variant="h6" gutterBottom fontWeight={800}>
            {text("Create account", "অ্যাকাউন্ট তৈরি")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text("Use the dialog to register or sign in.", "ডায়ালগ ব্যবহার করে রেজিস্টার করুন বা সাইন ইন করুন।")}
          </Typography>
        </Box>
      </FadeInSection>
    </>
  );
}
