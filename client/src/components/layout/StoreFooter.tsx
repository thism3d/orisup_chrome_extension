import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PinterestIcon from "@mui/icons-material/Pinterest";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import XIcon from "@mui/icons-material/X";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { useStorefrontContact } from "@/hooks/useStorefrontContact";
import { useContentPagesIndex } from "@/hooks/useContentPage";
import type { BrandTrustSlug } from "../../../../shared/contentPageDefaults";
import { LogoLink } from "./LogoLink";
import { PAYMENT_METHOD_IMAGES } from "@/lib/paymentMethods";
import { apiJson } from "@/lib/api";
import { getSiteUrl } from "@/lib/site";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

const linkSx = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  transition: "color 0.2s ease, transform 0.2s ease, padding-left 0.2s ease",
  "&:hover": { color: "primary.main", transform: "translateX(2px)", pl: 0.25 },
} as const;

function FooterColTitle({ children }: { children: string }) {
  const template = useStorefrontLayoutTemplate();
  const oryn = template === "orynbd";
  const norex = template === "norexbd";
  const adora = template === "adorashop";
  const minimalRail = norex || adora;
  const orlen = template === "orlenbd";
  return (
    <Typography
      variant="subtitle2"
      fontWeight={800}
      gutterBottom
      component="p"
      sx={{
        letterSpacing: oryn ? "-0.02em" : minimalRail ? "0.06em" : orlen ? "0.1em" : "0.04em",
        textTransform: oryn || minimalRail ? "none" : "uppercase",
        fontSize: oryn ? "1rem" : minimalRail ? "0.7rem" : orlen ? "0.78rem" : "0.72rem",
        color: oryn ? "text.primary" : orlen ? "grey.800" : "text.secondary",
        mb: orlen ? 2 : 1.5,
        pb: orlen ? 1 : 0,
        borderBottom: orlen ? "2px solid" : "none",
        borderColor: orlen ? (t) => alpha(storefrontBrandMain(t), 0.45) : "transparent",
        fontWeight: orlen ? 700 : 800,
      }}
    >
      {children}
    </Typography>
  );
}

export function StoreFooter() {
  const template = useStorefrontLayoutTemplate();
  const norex = template === "norexbd";
  const brand = useSiteBrand();
  const siteHost = (() => {
    try {
      return new URL(getSiteUrl()).hostname;
    } catch {
      return "";
    }
  })();
  const narrow = norex || template === "adorashop";
  const oryn = template === "orynbd";
  const orlen = template === "orlenbd";
  const masum = template === "masumtraders";
  const masumOrSteel = masum || template === "uttorasteel";
  const containerMaxWidth = narrow ? "lg" : "xl";
  const { text } = useStorefrontLanguage();
  const contact = useStorefrontContact();
  const { data: trustIndex } = useContentPagesIndex();

  /** While the index is loading we keep links visible (no layout flash); after load we hide
   * any link whose page is disabled in admin (mirrors the sitemap behaviour). */
  const isTrustEnabled = (slug: BrandTrustSlug) => {
    if (!trustIndex) return true;
    const item = trustIndex.items.find((i) => i.slug === slug);
    return !item || item.enabled;
  };

  const socialBtnSx = {
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "#fff",
    transition: "all 0.2s ease",
    "&:hover": { borderColor: "brand.main", color: "brand.main", transform: "translateY(-2px)" },
  } as const;

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: norex ? "#FFFFFF" : narrow ? "grey.200" : orlen ? "grey.50" : "grey.100",
        pt: narrow ? { xs: 3, md: 4 } : oryn ? { xs: 5, md: 7 } : masumOrSteel ? { xs: 4.5, md: 6.5 } : { xs: 4, md: 6 },
        pb: orlen || masumOrSteel ? 3 : 2,
        mt: "auto",
        borderTop: narrow ? "2px solid" : "1px solid",
        borderColor: norex ? (t) => alpha(storefrontBrandMain(t), 0.14) : "divider",
        position: "relative",
        overflow: "hidden",
        "&::before":
          norex
            ? {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: (t) =>
                  `linear-gradient(90deg, transparent 12%, ${storefrontBrandMain(t)} 50%, transparent 88%)`,
              }
            : narrow
              ? { display: "none" }
              : {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: oryn ? 5 : masumOrSteel ? 4 : 3,
                  background: (t) =>
                    `linear-gradient(90deg, ${t.palette.brand.main}, ${t.palette.brand.dark}, ${t.palette.brand.main})`,
                },
      }}
    >
      <Container maxWidth={containerMaxWidth}>
        <Grid container spacing={{ xs: narrow ? 2.5 : 3, md: narrow ? 3.5 : 4 }} columnSpacing={{ md: 3 }}>
          <Grid item xs={12} md={3}>
            <LogoLink />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 380, lineHeight: 1.75 }}>
              {text(
                `${brand} — trusted multi-vendor marketplace for Bangladesh. Shop electronics, fashion, home & more with verified sellers.`,
                `${brand} — বাংলাদেশের বিশ্বস্ত মাল্টি-ভেন্ডর মার্কেটপ্লেস। ইলেকট্রনিকস, ফ্যাশন, হোমসহ আরও পণ্য কিনুন যাচাইকৃত বিক্রেতাদের কাছ থেকে।`
              )}
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 1, mt: 2.5 }}>
              {[
                text("Secure checkout", "নিরাপদ চেকআউট"),
                text("Verified sellers", "যাচাইকৃত বিক্রেতা"),
                text("COD where offered", "COD যেখানে প্রযোজ্য"),
              ].map((label) => (
                <Box
                  key={label}
                  sx={{
                    px: 1.25,
                    py: 0.45,
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#FAFAFA",
                    typography: "caption",
                    fontWeight: 600,
                    color: "text.secondary",
                    fontSize: "0.6875rem",
                    letterSpacing: "0.02em",
                  }}
                >
                  {label}
                </Box>
              ))}
            </Stack>
            <Typography
              variant="overline"
              component="p"
              sx={{
                display: "block",
                mt: 3,
                mb: 1,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "grey.800",
                fontSize: "0.72rem",
              }}
            >
              {text("Follow us", "ফলো করুন")}
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
              {[
                { u: contact.social.facebook, t: "Facebook", Icon: FacebookIcon },
                { u: contact.social.instagram, t: "Instagram", Icon: InstagramIcon },
                { u: contact.social.whatsapp, t: text("WhatsApp", "হোয়াটসঅ্যাপ"), Icon: WhatsAppIcon },
                { u: contact.social.x, t: "X (Twitter)", Icon: XIcon },
                { u: contact.social.threads, t: "Threads", Icon: ForumOutlinedIcon },
                { u: contact.social.tiktok, t: "TikTok", Icon: TikTokIcon },
                { u: contact.social.pinterest, t: "Pinterest", Icon: PinterestIcon },
                { u: contact.social.youtube, t: "YouTube", Icon: YouTubeIcon },
              ]
                .filter((r) => Boolean(r.u))
                .map((r) => (
                  <Tooltip key={r.t} title={r.t}>
                    <IconButton
                      component="a"
                      href={r.u!}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      aria-label={r.t}
                      sx={socialBtnSx}
                    >
                      <r.Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ))}
            </Stack>
          </Grid>
          <Grid item xs={6} sm={6} md={2}>
            <FooterColTitle>{text("Customer care", "গ্রাহক সেবা")}</FooterColTitle>
            <Stack spacing={1.1}>
              {isTrustEnabled("faq") ? (
                <Typography component={Link} href="/faq" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Help & FAQ", "সাহায্য ও জিজ্ঞাসা")}
                </Typography>
              ) : null}
              {isTrustEnabled("contact") ? (
                <Typography component={Link} href="/contact" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Contact us", "যোগাযোগ করুন")}
                </Typography>
              ) : null}
              {isTrustEnabled("returns") ? (
                <Typography component={Link} href="/returns" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Return policy", "রিটার্ন নীতি")}
                </Typography>
              ) : null}
              {isTrustEnabled("warranty") ? (
                <Typography component={Link} href="/warranty" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Warranty policy", "ওয়ারেন্টি নীতি")}
                </Typography>
              ) : null}
              <Typography component={Link} href="/account/orders" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                {text("Track order", "অর্ডার ট্র্যাক")}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={6} md={2}>
            <FooterColTitle>{`Sell on ${brand}`}</FooterColTitle>
            <Stack spacing={1.1}>
              <Typography component={Link} href="/vendor" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                {text("Vendor portal", "ভেন্ডর পোর্টাল")}
              </Typography>
              <Typography component={Link} href="/register" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                {text("Create account", "অ্যাকাউন্ট তৈরি")}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FooterColTitle>{text("Company & legal", "কোম্পানি ও আইন")}</FooterColTitle>
            <Stack spacing={1.1}>
              {isTrustEnabled("about") ? (
                <Typography component={Link} href="/about" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("About us", "আমাদের সম্পর্কে")}
                </Typography>
              ) : null}
              {isTrustEnabled("privacy") ? (
                <Typography component={Link} href="/privacy" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Privacy policy", "প্রাইভেসি নীতি")}
                </Typography>
              ) : null}
              {isTrustEnabled("terms") ? (
                <Typography component={Link} href="/terms" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Terms & conditions", "শর্তাবলি")}
                </Typography>
              ) : null}
              {isTrustEnabled("payments") ? (
                <Typography component={Link} href="/payments" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Payment disclosures", "পেমেন্ট তথ্য")}
                </Typography>
              ) : null}
              {isTrustEnabled("returns") ? (
                <Typography component={Link} href="/returns" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Returns & refunds", "রিটার্ন ও রিফান্ড")}
                </Typography>
              ) : null}
              {isTrustEnabled("warranty") ? (
                <Typography component={Link} href="/warranty" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("Warranty", "ওয়ারেন্টি")}
                </Typography>
              ) : null}
              {isTrustEnabled("faq") ? (
                <Typography component={Link} href="/faq" variant="body2" sx={{ ...linkSx, fontWeight: 500, color: "text.primary" }}>
                  {text("FAQ", "প্রশ্নোত্তর")}
                </Typography>
              ) : null}
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FooterColTitle>{text("Get in touch", "যোগাযোগ")}</FooterColTitle>
            <Stack spacing={1.75}>
              {contact.addressBlock ? (
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <PlaceOutlinedIcon sx={{ fontSize: 22, color: "text.secondary", mt: 0.15, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, whiteSpace: "pre-line" }}>
                      {contact.addressBlock}
                    </Typography>
                    {contact.addressSub ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.55 }}>
                        {contact.addressSub}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.55 }}>
                        {text(
                          "Registered office · Online marketplace connecting buyers and independent sellers.",
                          "নিবন্ধিত কার্যালয় · ক্রেতা ও স্বাধীন বিক্রেতাদের সংযোগকারী অনলাইন মার্কেটপ্লেস।"
                        )}
                      </Typography>
                    )}
                    {contact.mapsOpenUrl ? (
                      <Typography
                        component="a"
                        href={contact.mapsOpenUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ ...linkSx, display: "inline-block", mt: 0.75, fontWeight: 700, color: "primary.dark" }}
                      >
                        {text("Open in Google Maps →", "গুগল ম্যাপে খুলুন →")}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              ) : null}
              {contact.supportPhoneDisplay ? (
                <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                  <PhoneOutlinedIcon sx={{ fontSize: 22, color: "text.secondary", flexShrink: 0 }} />
                  <Typography
                    component="a"
                    href={contact.supportPhoneTel}
                    variant="body2"
                    sx={{ ...linkSx, display: "inline", fontWeight: 600, color: "text.primary" }}
                  >
                    {contact.supportPhoneDisplay}
                  </Typography>
                </Stack>
              ) : null}
              {contact.supportEmail ? (
                <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                  <EmailOutlinedIcon sx={{ fontSize: 22, color: "text.secondary", flexShrink: 0 }} />
                  <Typography
                    component="a"
                    href={`mailto:${contact.supportEmail}`}
                    variant="body2"
                    sx={{
                      ...linkSx,
                      display: "inline",
                      fontWeight: 600,
                      color: "text.primary",
                      wordBreak: "break-all",
                    }}
                  >
                    {contact.supportEmail}
                  </Typography>
                </Stack>
              ) : null}
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, display: "block" }}>
                {text(
                  "We aim to respond within 24–48 business hours. For order issues, include your order number.",
                  "২৪–৪৮ কর্মঘণ্টার মধ্যে উত্তর দেওয়ার চেষ্টা করি। অর্ডার সমস্যার জন্য অর্ডার নম্বর উল্লেখ করুন।"
                )}
              </Typography>
              {isTrustEnabled("contact") ? (
                <Typography
                  component={Link}
                  href="/contact"
                  variant="body2"
                  sx={{ ...linkSx, fontWeight: 700, color: "primary.dark", mt: 0.5 }}
                >
                  {text("Contact form →", "যোগাযোগ ফর্ম →")}
                </Typography>
              ) : null}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: { xs: 2, md: 2.5 }, mb: { xs: 2.5, md: 3 }, borderColor: "divider" }} />
            <FooterColTitle>{text("We accept", "আমরা গ্রহণ করি")}</FooterColTitle>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, lineHeight: 1.65, maxWidth: 640 }}>
              {text(
                "Secure payments and local wallets (availability varies by seller). Checkout uses industry-standard encryption where supported by your bank or wallet provider.",
                "নিরাপদ পেমেন্ট ও স্থানীয় ওয়ালেট (ভেন্ডরভেদে প্রাপ্যতা ভিন্ন হতে পারে)। আপনার ব্যাংক বা ওয়ালেট প্রদানকারী যেখানে সমর্থন করে সেখানে চেকআউটে শিল্প-মানক এনক্রিপশন ব্যবহৃত হয়।"
              )}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                alignItems: "center",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              }}
            >
              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                sx={{
                  gap: 1.25,
                  alignItems: "center",
                  justifyContent: "flex-start",
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: orlen || masumOrSteel ? "0 12px 40px rgba(11,11,11,0.06)" : "0 8px 28px rgba(11,11,11,0.05)",
                }}
              >
                {PAYMENT_METHOD_IMAGES.map(({ src, alt }) => (
                  <Box
                    key={src}
                    component="img"
                    src={src}
                    alt={alt}
                    width={72}
                    height={28}
                    loading="lazy"
                    decoding="async"
                    sx={{
                      height: 28,
                      maxWidth: 72,
                      width: "auto",
                      objectFit: "contain",
                      opacity: 0.92,
                      transition: "opacity 0.2s ease, transform 0.2s ease",
                      "&:hover": { opacity: 1, transform: "scale(1.06)" },
                    }}
                  />
                ))}
              </Stack>

              <Box
                sx={{
                  justifySelf: { xs: "start", md: "end" },
                  alignSelf: "center",
                  px: 1.5,
                  py: 1.1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  minHeight: 44,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: "0.02em" }}>
                  Powered by
                </Typography>
                <Box
                  component="img"
                  src="/orlenpay-logo.png"
                  alt="OrlenPay"
                  width={80}
                  height={24}
                  loading="lazy"
                  decoding="async"
                  sx={{ height: 24, width: "auto", objectFit: "contain", display: "block", mt: "1px" }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <PaperishNewsletter />

        <Divider sx={{ my: 3, borderColor: "divider" }} />

        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent="center"
          alignItems="center"
          gap={{ xs: 1.25, sm: 2 }}
          sx={{ mb: 1.5 }}
        >
          {isTrustEnabled("contact") ? (
            <Typography component={Link} href="/contact" variant="caption" color="text.secondary" sx={{ ...linkSx, display: "inline" }}>
              {text("Contact", "যোগাযোগ")}
            </Typography>
          ) : null}
          {isTrustEnabled("contact") && isTrustEnabled("privacy") ? (
            <Typography component="span" variant="caption" color="text.disabled">
              ·
            </Typography>
          ) : null}
          {isTrustEnabled("privacy") ? (
            <Typography component={Link} href="/privacy" variant="caption" color="text.secondary" sx={{ ...linkSx, display: "inline" }}>
              {text("Privacy", "প্রাইভেসি")}
            </Typography>
          ) : null}
          {isTrustEnabled("privacy") && isTrustEnabled("terms") ? (
            <Typography component="span" variant="caption" color="text.disabled">
              ·
            </Typography>
          ) : null}
          {isTrustEnabled("terms") ? (
            <Typography component={Link} href="/terms" variant="caption" color="text.secondary" sx={{ ...linkSx, display: "inline" }}>
              {text("Terms", "শর্তাবলি")}
            </Typography>
          ) : null}
          {isTrustEnabled("terms") && isTrustEnabled("payments") ? (
            <Typography component="span" variant="caption" color="text.disabled">
              ·
            </Typography>
          ) : null}
          {isTrustEnabled("payments") ? (
            <Typography component={Link} href="/payments" variant="caption" color="text.secondary" sx={{ ...linkSx, display: "inline" }}>
              {text("Payments info", "পেমেন্ট তথ্য")}
            </Typography>
          ) : null}
        </Stack>
        <Box sx={{ textAlign: "center", pt: 0.5, pb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 500 }}>
            © {new Date().getFullYear()} {brand}
            {siteHost ? ` (${siteHost})` : ""}. {text("All rights reserved.", "সমস্ত অধিকার সংরক্ষিত।")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, maxWidth: 520, mx: "auto", lineHeight: 1.5, opacity: 0.9 }}>
            {text(
              "Product listings, prices, and fulfilment are offered by independent sellers unless stated otherwise.",
              "পণ্য তালিকা, মূল্য ও ফুলফিলমেন্ট স্বাধীন বিক্রেতাদের দ্বারা প্রদত্ত, যদি না অন্যথা উল্লেখ থাকে।"
            )}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function PaperishNewsletter() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) return;
    setBusy(true);
    setErr("");
    try {
      await apiJson("/api/public/newsletter", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not subscribe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
        borderRadius: 3,
        p: { xs: 2.5, sm: 3.5 },
        mt: 5,
        transition: "box-shadow 0.35s ease, transform 0.35s ease",
        boxShadow: "0 20px 56px rgba(11,11,11,0.22)",
        border: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(storefrontBrandMain(theme), 0.22)} 0%, transparent 70%)`,
          pointerEvents: "none",
        },
        "&:hover": { boxShadow: "0 24px 64px rgba(11,11,11,0.28)" },
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.3 }}>
            Newsletter & coupons
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.88, maxWidth: 480 }}>
            Get deals and new arrivals in your inbox. No spam — unsubscribe anytime.
          </Typography>
        </Grid>
        <Grid item xs={12} md={5}>
          {done ? (
            <Typography fontWeight={700} sx={{ color: "brand.main", textAlign: { xs: "left", md: "right" } }}>
              Thanks! Check your inbox soon.
            </Typography>
          ) : (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
              <TextField
                placeholder="Email address"
                size="small"
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(err)}
                helperText={err || undefined}
                sx={{
                  flex: 1,
                  bgcolor: "#fff",
                  borderRadius: 2,
                  input: { color: "#0B0B0B" },
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ fontWeight: 800, whiteSpace: "nowrap", px: 2.5 }}
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "…" : "Subscribe"}
              </Button>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
