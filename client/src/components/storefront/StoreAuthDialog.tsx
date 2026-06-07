import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter/use-browser-location";
import { useStoreAuthModal, type StoreAuthModalTab } from "@/contexts/StoreAuthModalContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { usePublicSiteMeta, useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { mediaAbsoluteUrl } from "@/lib/site";
import { resizedImg } from "@/lib/responsiveImg";
import { useLocation } from "wouter";

/**
 * Daraz-style centered auth dialog: tabs for sign in / create account, dimmed backdrop.
 */
export function StoreAuthDialog() {
  const { open, tab, setTab, close } = useStoreAuthModal();
  const { text } = useStorefrontLanguage();
  const meta = usePublicSiteMeta();
  const brand = useSiteBrand();
  const logoSrc = resizedImg(mediaAbsoluteUrl(meta?.logo_url?.trim()) ?? "/orlenbd-logo.png", 192);
  const qc = useQueryClient();
  const [, setLoc] = useLocation();
  const search = useSearch();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const afterLoginPath = useMemo(() => {
    const n = new URLSearchParams(search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) return n;
    return "/";
  }, [search]);

  const afterAuth = async () => {
    await qc.invalidateQueries({ queryKey: ["me"] });
    close();
    setLoc(afterLoginPath);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      scroll="body"
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(4px)" } },
      }}
      PaperProps={{
        elevation: 8,
        sx: { borderRadius: fullScreen ? 0 : 2 },
      }}
    >
      <DialogTitle sx={{ position: "relative", pr: 5, pt: 2, pb: 0 }}>
        <IconButton
          aria-label={text("Close", "বন্ধ")}
          onClick={close}
          sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pt: 0.5,
            pb: 1.5,
            px: 6,
          }}
        >
          <Box
            component="img"
            src={logoSrc}
            alt={brand}
            width={120}
            height={40}
            decoding="async"
            sx={{
              height: { xs: 36, sm: 40 },
              width: "auto",
              maxWidth: "min(220px, 100%)",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Box>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as StoreAuthModalTab)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 800, minHeight: 44 },
          }}
        >
          <Tab value="login" label={text("Sign in", "সাইন ইন")} />
          <Tab value="register" label={text("Create account", "অ্যাকাউন্ট তৈরি")} />
        </Tabs>
      </DialogTitle>
      <DialogContent sx={{ pt: 3.5, pb: 3 }}>
        <Stack spacing={2}>
          {tab === "login" ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {text(
                  "Use your email or phone and password, or continue with Google, Facebook, or a passkey.",
                  "ইমেইল বা ফোন ও পাসওয়ার্ড দিন, অথবা Google, Facebook বা পাসকি ব্যবহার করুন।",
                )}
              </Typography>
              <LoginForm
                showRegisterLink={false}
                onLoginSuccess={() => void afterAuth()}
                onLoginFailure={(err, body) => {
                  const msg = err.message;
                  if (!msg.includes("Platform administrators") && !msg.includes("/admin/login")) {
                    return false;
                  }
                  const e = body.email?.trim();
                  close();
                  setLoc(e ? `/admin/login?e=${encodeURIComponent(e)}` : "/admin/login");
                  return true;
                }}
              />
              <Typography variant="body2" textAlign="center">
                {text("No account?", "অ্যাকাউন্ট নেই?")}{" "}
                <Typography
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => setTab("register")}
                  sx={{
                    border: "none",
                    background: "none",
                    p: 0,
                    cursor: "pointer",
                    color: "primary.main",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  {text("Create account", "অ্যাকাউন্ট তৈরি করুন")}
                </Typography>
              </Typography>
            </>
          ) : (
            <>
              <RegisterForm
                variant="modal"
                onRegistered={() => void afterAuth()}
                onRequestLogin={() => setTab("login")}
              />
            </>
          )}
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {text("By continuing you agree to our terms and privacy policy.", "চালিয়ে গেলে আপনি আমাদের শর্ত ও গোপনীয়তা নীতিতে সম্মত হন।")}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
