import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import ViewQuiltRoundedIcon from "@mui/icons-material/ViewQuiltRounded";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson, apiUpload } from "@/lib/api";
import { mediaAbsoluteUrl } from "@/lib/site";
import { buildStorefrontPreviewUrl } from "@/lib/storefrontPreviewUrl";
import { normalizeStorefrontUiTemplateId, type StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";
import {
  STOREFRONT_THEME_IDS,
  STOREFRONT_THEME_SWATCHES,
  type StorefrontThemeId,
} from "@/theme/storefrontThemes";
import { AdminImageViewerDialog } from "./AdminImageViewerDialog";

type SettingsMap = Record<string, string>;
type SeoHealthResponse = {
  ok: boolean;
  generatedAt: string;
  canonical: {
    publicSiteUrl: string;
    robotsUrl: string;
    sitemapIndexUrl: string;
  };
  robots: {
    lineCount: number;
    preview: string[];
  };
  sitemap: {
    totalUrls: number;
    coreUrls: number;
    productUrls: number;
    categoryUrls: number;
    vendorUrls: number;
    staticUrls: number;
    samples: {
      core: string[];
      products: string[];
    };
  };
};

type TabKey = "general" | "contact" | "seo" | "branding" | "storefront" | "signin" | "internal" | "smtp" | "bulksmsbd";

type FieldDef = {
  key: string;
  tab: TabKey;
  label: string;
  helper: string;
  multiline?: boolean;
  upload?: boolean;
};

const FIELD_DEFS: FieldDef[] = [
  { key: "site_display_name", tab: "general", label: "Site display name", helper: "Short brand name (header, JSON-LD)." },
  { key: "storefront_notice", tab: "general", label: "Storefront notice", helper: "Short banner text for the storefront." },
  {
    key: "storefront_search_rotating_keywords",
    tab: "general",
    label: "Search rotating keywords",
    helper: "Comma or newline separated. Auto-rotates every 3s in the search box when empty.",
    multiline: true,
  },
  {
    key: "storefront_search_popular_keywords",
    tab: "general",
    label: "Search popular keywords",
    helper: "Comma or newline separated. Shown when users focus search input.",
    multiline: true,
  },
  { key: "site_title", tab: "seo", label: "Default page title", helper: "Home and fallback SEO title (may include brand)." },
  { key: "site_description", tab: "seo", label: "Meta description", helper: "Default description for storefront SEO.", multiline: true },
  { key: "site_keywords", tab: "seo", label: "Meta keywords", helper: "Comma-separated keywords (optional)." },
  { key: "logo_url", tab: "branding", label: "Logo URL", helper: "Site logo path or URL (JSON-LD, OG fallback).", upload: true },
  { key: "favicon_url", tab: "branding", label: "Favicon URL", helper: "Browser tab icon path or URL.", upload: true },
  { key: "og_image_url", tab: "branding", label: "Open Graph image URL", helper: "Default share image; leave empty to use logo.", upload: true },
  { key: "internal_notes", tab: "internal", label: "Internal notes", helper: "Private to admins only.", multiline: true },
  { key: "support_email", tab: "contact", label: "Public email", helper: "Support inbox shown in the footer, contact page, and mailto: links." },
  { key: "support_phone", tab: "contact", label: "Support phone (display)", helper: "Display text and call link in header/footer (e.g. +880 1XXX or 09XXX)." },
  { key: "contact_address", tab: "contact", label: "Office address", helper: "Multi-line; shown in footer and contact page.", multiline: true },
  { key: "contact_address_sub", tab: "contact", label: "Address note (optional)", helper: "Short line under the address, e.g. “Registered office · …”.", multiline: true },
  { key: "google_maps_open_url", tab: "contact", label: "Google Maps (open) URL", helper: "Full link for “Open in Google Maps”." },
  { key: "google_maps_embed_url", tab: "contact", label: "Google Maps embed URL", helper: "iframe src for the map on the contact page (or Google Maps share → embed HTML)." },
  { key: "social_facebook_url", tab: "contact", label: "Facebook URL", helper: "Footer and social; leave empty to hide the icon." },
  { key: "social_instagram_url", tab: "contact", label: "Instagram URL", helper: "" },
  { key: "social_x_url", tab: "contact", label: "X (Twitter) URL", helper: "" },
  { key: "social_whatsapp_url", tab: "contact", label: "WhatsApp URL", helper: "e.g. https://wa.me/8801XXXXXXXXX" },
  { key: "social_threads_url", tab: "contact", label: "Threads URL", helper: "" },
  { key: "social_tiktok_url", tab: "contact", label: "TikTok URL", helper: "" },
  { key: "social_pinterest_url", tab: "contact", label: "Pinterest URL", helper: "" },
  { key: "social_youtube_url", tab: "contact", label: "YouTube URL", helper: "" },
  { key: "smtp_host", tab: "smtp", label: "Host", helper: "SMTP Server address" },
  { key: "smtp_port", tab: "smtp", label: "Port", helper: "SMTP Port (typically 465 or 587)" },
  { key: "smtp_user", tab: "smtp", label: "Email", helper: "Authentication email" },
  { key: "smtp_pass", tab: "smtp", label: "Password", helper: "Authentication password" },
  { key: "smtp_from", tab: "smtp", label: "From Name", helper: "Sender display name" },
  { key: "smtp_subject", tab: "smtp", label: "Subject", helper: "Subject line for the OTP email" },
  { key: "smtp_text", tab: "smtp", label: "Text", helper: "Plain text email content. Use ${resetLink} for the URL.", multiline: true },
  { key: "smtp_html", tab: "smtp", label: "Message", helper: "HTML email content. Use ${resetLink} for the URL.", multiline: true },
  { key: "bulksmsbd_api_key", tab: "bulksmsbd", label: "API Key", helper: "BulkSMSBD API Key" },
  { key: "bulksmsbd_sender_id", tab: "bulksmsbd", label: "Sender ID", helper: "BulkSMSBD Sender ID" },
  { key: "bulksmsbd_otp_format", tab: "bulksmsbd", label: "SMS Format", helper: "Format for the OTP SMS. Use ${otp} to insert the code.", multiline: true },
];

const AUTH_SETTING_KEYS = [
  "auth_google_client_id",
  "auth_disable_google",
  "auth_single_login_session",
  "auth_facebook_app_id",
  "auth_facebook_app_secret",
  "auth_disable_facebook",
  "auth_webauthn_origins",
  "auth_webauthn_rp_id",
  "auth_webauthn_rp_name",
  "auth_disable_passkeys",
] as const;

const SAVE_KEYS = [
  ...FIELD_DEFS.map((d) => d.key),
  ...AUTH_SETTING_KEYS,
  "storefront_theme",
  "storefront_theme_overrides",
  "storefront_theme_primary",
  "storefront_theme_secondary",
  "storefront_ui_template",
] as const;

/** Shipped multi-domain defaults (each install still overrides via this screen). */
const THEME_TYPICAL_DOMAIN: Record<StorefrontThemeId, string> = {
  theme1: "orlenbd.com",
  theme2: "norexbd.com",
  theme3: "orynbd.com",
  theme4: "masumtradersbd.com",
  theme5: "uttorasteel.com",
  theme6: "adora.orlenbd.com",
};

const TEMPLATE_CARDS: {
  id: StorefrontUiTemplateId;
  title: string;
  subtitle: string;
  body: string;
  typicalDomain: string;
}[] = [
    {
      id: "orlenbd",
      title: "Orlenbd",
      subtitle: "Classic marketplace",
      body: "Category sidebar with hero carousel — best for dense catalogs and familiar e-commerce patterns.",
      typicalDomain: "orlenbd.com",
    },
    {
      id: "norexbd",
      title: "Norexbd",
      subtitle: "Minimal editorial",
      body: "Full-width hero, tighter vertical rhythm and narrower shop chrome — editorial / catalog feel.",
      typicalDomain: "norexbd.com",
    },
    {
      id: "orynbd",
      title: "Orynbd",
      subtitle: "Mega-store layout",
      body: "Circular category rail, dual promo banners, and dense product grids — catalog-heavy retail (Noon / Amazon-style browsing).",
      typicalDomain: "orynbd.com",
    },
    {
      id: "masumtraders",
      title: "MasumTraders",
      subtitle: "Grocery essentials",
      body: "Category-first grocery home with circular rails, dense essentials grid, flash deals, and quick daily-picks flow.",
      typicalDomain: "masumtradersbd.com",
    },
    {
      id: "uttorasteel",
      title: "UttoraSteel",
      subtitle: "Steel & workshop",
      body: "Industrial showroom home: hero, steel product lines, featured builds, flash deals, and room-based picks for beds, furniture, office, and kitchen steel goods.",
      typicalDomain: "uttorasteel.com",
    },
    {
      id: "adorashop",
      title: "Adora Shop",
      subtitle: "Fashion & lifestyle",
      body: "Dedicated fashion home: editorial hero, category rail, spotlight grid, promos, flash lane, tabbed picks, trust row, and brands — built for clothing & accessories.",
      typicalDomain: "adora.orlenbd.com",
    },
  ];

function storefrontThemeCardTitle(id: StorefrontThemeId): string {
  switch (id) {
    case "theme1":
      return "Theme 1 — Default";
    case "theme2":
      return "Theme 2 — Norex noir";
    case "theme3":
      return "Theme 3 — Coral";
    case "theme4":
      return "Theme 4 — Garden";
    case "theme5":
      return "Theme 5 — Steel";
    case "theme6":
      return "Theme 6 — Adora rose";
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

type ThemeOverrideMap = Partial<Record<StorefrontThemeId, { primary?: string; secondary?: string; text?: string }>>;
const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function normalizeHex(raw: string | undefined, fallback: string): string {
  const v = raw?.trim().toUpperCase();
  return v && HEX_RE.test(v) ? v : fallback;
}

function parseThemeOverrideMap(raw: string | undefined): ThemeOverrideMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ThemeOverrideMap = {};
    for (const id of STOREFRONT_THEME_IDS) {
      const item = (parsed as Record<string, unknown>)[id];
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const p = typeof rec.primary === "string" && HEX_RE.test(rec.primary.trim()) ? rec.primary.trim().toUpperCase() : undefined;
      const s =
        typeof rec.secondary === "string" && HEX_RE.test(rec.secondary.trim()) ? rec.secondary.trim().toUpperCase() : undefined;
      const t = typeof rec.text === "string" && HEX_RE.test(rec.text.trim()) ? rec.text.trim().toUpperCase() : undefined;
      if (p || s || t) out[id] = { ...(p ? { primary: p } : {}), ...(s ? { secondary: s } : {}), ...(t ? { text: t } : {}) };
    }
    return out;
  } catch {
    return {};
  }
}

function TabPanel({ tab, value, children }: { tab: TabKey; value: TabKey; children: React.ReactNode }) {
  if (value !== tab) return null;
  return (
    <Box role="tabpanel" id={`settings-tabpanel-${tab}`} aria-labelledby={`settings-tab-${tab}`} sx={{ pt: 3 }}>
      {children}
    </Box>
  );
}

function AssetPreviewBox({
  label,
  imageUrl,
  variant,
  onOpen,
}: {
  label: string;
  imageUrl: string;
  variant: "logo" | "favicon" | "og";
  onOpen?: (url: string) => void;
}) {
  const src = mediaAbsoluteUrl(imageUrl.trim());
  const ratio = variant === "og" ? "16 / 9" : variant === "favicon" ? "1 / 1" : "auto";
  const maxH = variant === "og" ? 140 : variant === "favicon" ? 64 : 48;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", height: "100%" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 0.75, bgcolor: "action.hover" }}>
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          minHeight: variant === "og" ? 120 : 88,
          aspectRatio: ratio,
          bgcolor: "background.default",
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt=""
            onClick={() => onOpen?.(imageUrl.trim())}
            sx={{
              maxWidth: "100%",
              maxHeight: maxH,
              objectFit: "contain",
              borderRadius: 1,
              cursor: "zoom-in",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <Typography variant="caption" color="text.disabled" align="center">
            Enter a URL or upload to preview
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function AssetField({
  def,
  value,
  onChange,
  disabled,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await apiUpload(file);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Stack spacing={1}>
      {uploadError ? (
        <Alert severity="error" onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
        <TextField
          label={def.label}
          helperText={def.helper}
          value={value}
          onChange={(ev) => {
            setUploadError(null);
            onChange(ev.target.value);
          }}
          fullWidth
          size="small"
        />
        <input ref={inputRef} type="file" hidden accept="image/*,.ico,.png,.svg,.webp,.jpg,.jpeg,.gif" onChange={onPick} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileRoundedIcon />}
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.5 } }}
        >
          Upload
        </Button>
      </Stack>
    </Stack>
  );
}

function BulkSmsBdBalanceWidget() {
  const qc = useQueryClient();
  const balanceQ = useQuery({
    queryKey: ["admin-bulksmsbd-balance"],
    queryFn: () => apiJson<{ balance: string }>("/api/admin/bulksmsbd/balance"),
    retry: false,
  });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="text.secondary">Current Balance</Typography>
          {balanceQ.isLoading ? (
            <Typography variant="h6" fontWeight={800}>Loading...</Typography>
          ) : balanceQ.isError ? (
            <Typography variant="body2" color="error">
              {(balanceQ.error as Error).message} (Save API key first)
            </Typography>
          ) : (
            <Typography variant="h6" fontWeight={800} color="primary">
              {balanceQ.data?.balance || "Unknown"}
            </Typography>
          )}
        </Box>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => void qc.invalidateQueries({ queryKey: ["admin-bulksmsbd-balance"] })}
          disabled={balanceQ.isFetching}
        >
          Refresh Balance
        </Button>
      </Stack>
    </Paper>
  );
}

export function AdminSettingsPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsMap>({});
  const [tab, setTab] = useState<TabKey>("general");
  const [smtpMsgTab, setSmtpMsgTab] = useState<"write" | "preview">("write");
  const [assetPreview, setAssetPreview] = useState<{ title: string; url: string } | null>(null);

  const settingsQ = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiJson<SettingsMap>("/api/admin/settings"),
  });
  const seoHealthQ = useQuery({
    queryKey: ["admin-seo-health"],
    queryFn: () => apiJson<SeoHealthResponse>("/api/admin/seo/health"),
  });

  useEffect(() => {
    if (settingsQ.data) {
      const next = { ...settingsQ.data };
      if (next.storefront_ui_template !== undefined) {
        next.storefront_ui_template = normalizeStorefrontUiTemplateId(next.storefront_ui_template);
      }
      setForm(next);
    }
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: (body: SettingsMap) =>
      apiJson<SettingsMap>("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      const next = { ...data };
      if (next.storefront_ui_template !== undefined) {
        next.storefront_ui_template = normalizeStorefrontUiTemplateId(next.storefront_ui_template);
      }
      setForm(next);
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: ["public-site-meta"] });
      void qc.invalidateQueries({ queryKey: ["auth-public-config"] });
    },
  });

  const handleSave = () => {
    const body: SettingsMap = {};
    for (const k of SAVE_KEYS) {
      body[k] = form[k] ?? "";
    }
    save.mutate(body);
  };

  const themeValue =
    form.storefront_theme && STOREFRONT_THEME_IDS.includes(form.storefront_theme as (typeof STOREFRONT_THEME_IDS)[number])
      ? form.storefront_theme
      : "theme1";
  const templateValue = normalizeStorefrontUiTemplateId(form.storefront_ui_template);
  const themeOverrideMap = parseThemeOverrideMap(form.storefront_theme_overrides);

  const previewCurrentHome = buildStorefrontPreviewUrl({
    theme: themeValue,
    template: templateValue,
    path: "/",
  });
  const previewCurrentShop = buildStorefrontPreviewUrl({
    theme: themeValue,
    template: templateValue,
    path: "/shop",
  });

  const busy = save.isPending || settingsQ.isLoading;

  const fieldsFor = (t: TabKey) => FIELD_DEFS.filter((d) => d.tab === t);

  return (
    <Box sx={{ width: "100%", maxWidth: 1280 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "flex-start" }} sx={{ mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Platform display name, contacts, SEO, assets, and storefront appearance. Public values are exposed via{" "}
            <Typography component="span" variant="body2" sx={{ fontFamily: "monospace" }}>
              /api/public/site-meta
            </Typography>
            .
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveRoundedIcon />}
          onClick={handleSave}
          disabled={busy}
          sx={{ fontWeight: 800, flexShrink: 0 }}
        >
          Save changes
        </Button>
      </Stack>

      {save.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(save.error as Error).message}
        </Alert>
      ) : null}
      {save.isSuccess ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => save.reset()}>
          Settings saved.
        </Alert>
      ) : null}

      <Paper sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as TabKey)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            px: { xs: 1, sm: 2 },
            bgcolor: "action.hover",
          }}
        >
          <Tab id="settings-tab-general" label="General" value="general" />
          <Tab id="settings-tab-contact" label="Contact & social" value="contact" />
          <Tab id="settings-tab-seo" label="SEO & metadata" value="seo" />
          <Tab id="settings-tab-branding" label="Branding & previews" value="branding" />
          <Tab id="settings-tab-storefront" label="Storefront themes" value="storefront" />
          <Tab id="settings-tab-signin" label="Sign-in & passkeys" value="signin" icon={<VpnKeyRoundedIcon fontSize="small" />} iconPosition="start" sx={{ gap: 0.75 }} />
          <Tab id="settings-tab-internal" label="Internal" value="internal" />
          <Tab id="settings-tab-smtp" label="SMTP Setting" value="smtp" />
          <Tab id="settings-tab-bulksmsbd" label="BulkSMSBD" value="bulksmsbd" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <TabPanel tab="general" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              {fieldsFor("general").map((def) => (
                <TextField
                  key={def.key}
                  label={def.label}
                  helperText={def.helper}
                  value={form[def.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline={def.multiline}
                  minRows={def.multiline ? 3 : 1}
                />
              ))}
            </Stack>
          </TabPanel>

          <TabPanel tab="contact" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 800 }}>
              {fieldsFor("contact").map((def) => (
                <TextField
                  key={def.key}
                  label={def.label}
                  helperText={def.helper}
                  value={form[def.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline={def.multiline}
                  minRows={def.multiline ? 3 : 1}
                />
              ))}
            </Stack>
          </TabPanel>

          <TabPanel tab="seo" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              {fieldsFor("seo").map((def) => (
                <TextField
                  key={def.key}
                  label={def.label}
                  helperText={def.helper}
                  value={form[def.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline={def.multiline}
                  minRows={def.multiline ? 3 : 1}
                />
              ))}

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight={800}>
                  SEO health
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quick check for canonical host, robots sitemap link, and current sitemap URL counts.
                </Typography>
              </Stack>

              {seoHealthQ.isError ? (
                <Alert severity="error">
                  {(seoHealthQ.error as Error).message}
                </Alert>
              ) : null}

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700}>
                      Canonical: {seoHealthQ.data?.canonical.publicSiteUrl ?? "…"}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void seoHealthQ.refetch()}
                      disabled={seoHealthQ.isFetching}
                    >
                      Refresh
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Generated: {seoHealthQ.data?.generatedAt ? new Date(seoHealthQ.data.generatedAt).toLocaleString() : "—"}
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      component="a"
                      href={seoHealthQ.data?.canonical.robotsUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInNewRoundedIcon />}
                      disabled={!seoHealthQ.data?.canonical.robotsUrl}
                    >
                      Open robots.txt
                    </Button>
                    <Button
                      component="a"
                      href={seoHealthQ.data?.canonical.sitemapIndexUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInNewRoundedIcon />}
                      disabled={!seoHealthQ.data?.canonical.sitemapIndexUrl}
                    >
                      Open sitemap.xml
                    </Button>
                  </Stack>

                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Total URLs</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.totalUrls ?? "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Products</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.productUrls ?? "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Categories</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.categoryUrls ?? "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Vendors</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.vendorUrls ?? "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Core</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.coreUrls ?? "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Static</Typography>
                      <Typography variant="body2" fontWeight={700}>{seoHealthQ.data?.sitemap.staticUrls ?? "—"}</Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            </Stack>
          </TabPanel>

          <TabPanel tab="branding" value={tab}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <Stack spacing={2.5}>
                  {fieldsFor("branding").map((def) => (
                    <AssetField
                      key={def.key}
                      def={def}
                      value={form[def.key] ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, [def.key]: v }))}
                      disabled={busy}
                    />
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} lg={5}>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ letterSpacing: 0.02 }}>
                  Live previews
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Updates as you type or upload. Uses the same URL resolution as the storefront.
                </Typography>
                <Stack spacing={2}>
                  <AssetPreviewBox
                    label="Logo"
                    imageUrl={form.logo_url ?? ""}
                    variant="logo"
                    onOpen={(url) => setAssetPreview({ title: "Logo", url })}
                  />
                  <AssetPreviewBox
                    label="Favicon"
                    imageUrl={form.favicon_url ?? ""}
                    variant="favicon"
                    onOpen={(url) => setAssetPreview({ title: "Favicon", url })}
                  />
                  <AssetPreviewBox
                    label="Open Graph (share image)"
                    imageUrl={(form.og_image_url?.trim() ? form.og_image_url : form.logo_url) ?? ""}
                    variant="og"
                    onOpen={(url) => setAssetPreview({ title: "Open Graph image", url })}
                  />
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel tab="storefront" value={tab}>
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
                <Button
                  component="a"
                  href={previewCurrentHome}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  color="primary"
                  startIcon={<OpenInNewRoundedIcon />}
                  sx={{ fontWeight: 800 }}
                >
                  Full storefront — home
                </Button>
                <Button
                  component="a"
                  href={previewCurrentShop}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  startIcon={<OpenInNewRoundedIcon />}
                  sx={{ fontWeight: 700 }}
                >
                  Full storefront — shop
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
                  Opens your saved color + layout in a new tab. For unsaved picks, use each card&apos;s preview link (URL
                  preview mode).
                </Typography>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={1} alignItems="center">
                <PaletteRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Color theme
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 800 }}>
                Controls buttons, links, and accents across the public shop. Combine with a layout template below. For the
                production brands ship with typical domain hints (Theme 1 → orlenbd.com, Theme 2 → norexbd.com, and so on) —
                any pairing is allowed per site.
              </Typography>
              <Grid container spacing={2}>
                {STOREFRONT_THEME_IDS.map((id) => {
                  const sw = STOREFRONT_THEME_SWATCHES[id];
                  const selected = themeValue === id;
                  const override = themeOverrideMap[id] ?? {};
                  const swatchPrimary = normalizeHex(override.primary, sw.primary);
                  const swatchSecondary = normalizeHex(override.secondary, sw.secondary);
                  const swatchText = normalizeHex(override.text, "#1F2937");
                  const setThemeOverride = (patch: { primary?: string; secondary?: string; text?: string }) => {
                    setForm((f) => {
                      const map = parseThemeOverrideMap(f.storefront_theme_overrides);
                      const next = { ...(map[id] ?? {}), ...patch };
                      if (!next.primary && !next.secondary && !next.text) {
                        delete map[id];
                      } else {
                        map[id] = next;
                      }
                      return {
                        ...f,
                        storefront_theme_overrides: JSON.stringify(map),
                        ...(selected
                          ? {
                            storefront_theme_primary: next.primary ?? "",
                            storefront_theme_secondary: next.secondary ?? "",
                          }
                          : {}),
                      };
                    });
                  };
                  const previewUrl = buildStorefrontPreviewUrl({ theme: id, template: templateValue, path: "/" });
                  return (
                    <Grid item xs={12} sm={6} md={4} key={id}>
                      <Card variant="outlined" sx={{ height: "100%", borderWidth: selected ? 2 : 1, borderColor: selected ? "primary.main" : "divider" }}>
                        <CardActionArea
                          onClick={() =>
                            setForm((f) => {
                              const map = parseThemeOverrideMap(f.storefront_theme_overrides);
                              const o = map[id] ?? {};
                              return {
                                ...f,
                                storefront_theme: id,
                                storefront_theme_primary: o.primary ?? "",
                                storefront_theme_secondary: o.secondary ?? "",
                              };
                            })
                          }
                          sx={{ height: "100%", alignItems: "stretch" }}
                        >
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 1,
                                  background: `linear-gradient(135deg, ${swatchPrimary} 42%, ${swatchSecondary} 42%)`,
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              />
                              <Typography variant="subtitle2" fontWeight={800}>
                                {storefrontThemeCardTitle(id)}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                              {sw.description}
                            </Typography>
                            <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
                              {sw.label}
                            </Typography>
                            {selected ? (
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
                                <TextField
                                  label="Primary"
                                  type="color"
                                  size="small"
                                  value={swatchPrimary}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setThemeOverride({ primary: e.target.value.toUpperCase() })}
                                  inputProps={{ "aria-label": "Theme primary color" }}
                                  sx={{ width: 118 }}
                                />
                                <TextField
                                  label="Secondary"
                                  type="color"
                                  size="small"
                                  value={swatchSecondary}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setThemeOverride({ secondary: e.target.value.toUpperCase() })}
                                  inputProps={{ "aria-label": "Theme secondary color" }}
                                  sx={{ width: 118 }}
                                />
                                <TextField
                                  label="Link/Price/Tab text"
                                  type="color"
                                  size="small"
                                  value={swatchText}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setThemeOverride({ text: e.target.value.toUpperCase() })}
                                  inputProps={{ "aria-label": "Theme on-light text color" }}
                                  sx={{ width: 146 }}
                                />
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setThemeOverride({ primary: undefined, secondary: undefined, text: undefined });
                                  }}
                                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                                >
                                  Reset
                                </Button>
                              </Stack>
                            ) : null}
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                              Typical domain: {THEME_TYPICAL_DOMAIN[id]}
                            </Typography>
                            <Button
                              component="a"
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              variant="outlined"
                              startIcon={<OpenInNewRoundedIcon />}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ fontWeight: 700 }}
                            >
                              Full view (this palette)
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1} alignItems="center">
                <ViewQuiltRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Layout template
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 800 }}>
                Home page structure, typography, and card chrome. Uses the color theme above for accents — it does not replace
                your palette. Layout templates cover Orlenbd, Norexbd, Orynbd, MasumTraders, and UttoraSteel-style storefronts.
              </Typography>
              <Grid container spacing={2}>
                {TEMPLATE_CARDS.map((tm) => {
                  const selected = templateValue === tm.id;
                  const previewUrl = buildStorefrontPreviewUrl({ theme: themeValue, template: tm.id, path: "/" });
                  return (
                    <Grid item xs={12} sm={6} md={4} key={tm.id}>
                      <Card variant="outlined" sx={{ height: "100%", borderWidth: selected ? 2 : 1, borderColor: selected ? "primary.main" : "divider" }}>
                        <CardActionArea onClick={() => setForm((f) => ({ ...f, storefront_ui_template: tm.id }))} sx={{ height: "100%" }}>
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                              {tm.title}
                            </Typography>
                            <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ display: "block", mb: 1 }}>
                              {tm.subtitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 56 }}>
                              {tm.body}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                              Typical domain: {tm.typicalDomain}
                            </Typography>
                            <Button
                              component="a"
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              variant="outlined"
                              startIcon={<OpenInNewRoundedIcon />}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ fontWeight: 700 }}
                            >
                              Full view (this layout)
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </TabPanel>

          <TabPanel tab="signin" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} gutterBottom>
                  Environment overrides
                </Typography>
                <Typography variant="body2">
                  Non-empty server environment variables override these dashboard values — useful for VPS secrets. Checked first:{" "}
                  <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.8rem", display: "block", mt: 0.75 }}>
                    GOOGLE_CLIENT_ID, DISABLE_GOOGLE_LOGIN=true, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET,
                    DISABLE_FACEBOOK_LOGIN=true, DISABLE_PASSKEYS=true, FORCE_SINGLE_LOGIN_SESSION=true,
                    DISABLE_SINGLE_LOGIN_SESSION=true, WEBAUTHN_ORIGINS, WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME,
                    PUBLIC_SITE_URL (adds WebAuthn origins)
                  </Box>
                </Typography>
              </Alert>
              <Stack direction="row" spacing={1} alignItems="center">
                <VpnKeyRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Google Sign-In with Google Identity Services
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Create an OAuth Client ID for a <strong>Web application</strong> in Google Cloud Console. Add Authorized JavaScript
                origins for this site (production and local dev URLs). Paste the Client ID below — same value is sent to browsers for the
                sign-in widget.
              </Typography>
              <TextField
                label="Google OAuth Client ID (Web)"
                placeholder="xxxxxxxx.apps.googleusercontent.com"
                helperText='Example: "...apps.googleusercontent.com". Leave empty here if you configure GOOGLE_CLIENT_ID on the server only.'
                value={form.auth_google_client_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_google_client_id: e.target.value }))}
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(form.auth_disable_google ?? "") === "1"}
                    onChange={(_, ck) =>
                      setForm((f) => ({
                        ...f,
                        auth_disable_google: ck ? "1" : "",
                      }))
                    }
                  />
                }
                label="Hide Google Sign-In"
              />
              <Typography variant="caption" color="text.secondary">
                Equivalent to DISABLE_GOOGLE_LOGIN=true when checked (env wins if set). Client ID stays stored for turning it back on.
              </Typography>
              <Divider />
              <Stack direction="row" spacing={1} alignItems="center">
                <VpnKeyRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Facebook Login
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Create a Facebook app → Facebook Login → Web. Add your site domains and OAuth redirect URIs (your storefront origin plus{" "}
                <code>http://localhost:5173/</code>
                {" "}for dev). The App Secret is sensitive — prefer FACEBOOK_APP_SECRET in server env when possible.
              </Typography>
              <TextField
                label="Facebook App ID"
                placeholder="digits from developer dashboard"
                value={form.auth_facebook_app_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_facebook_app_id: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Facebook App Secret"
                type="password"
                placeholder="prefer env FACEBOOK_APP_SECRET in production"
                value={form.auth_facebook_app_secret ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_facebook_app_secret: e.target.value }))}
                fullWidth
                size="small"
                helperText="Stored in platform settings — leave empty here if you rely on FACEBOOK_APP_ID / FACEBOOK_APP_SECRET env only."
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(form.auth_disable_facebook ?? "") === "1"}
                    onChange={(_, ck) =>
                      setForm((f) => ({
                        ...f,
                        auth_disable_facebook: ck ? "1" : "",
                      }))
                    }
                  />
                }
                label="Hide Facebook Login"
              />
              <Typography variant="caption" color="text.secondary">
                Equivalent to DISABLE_FACEBOOK_LOGIN=true when checked. The storefront only shows Facebook when App ID + App Secret resolve and this is unchecked.
              </Typography>
              <Divider />
              <Stack direction="row" spacing={1} alignItems="center">
                <VpnKeyRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800}>
                  WebAuthn (passkeys)
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Allowed origins must match exactly how shoppers open your site (<code style={{ wordBreak: "break-all" }}>https://yoursite.com</code>). Use
                a comma-separated list if you serve both apex and www, or localhost for testing.
              </Typography>
              <TextField
                label="Allowed WebAuthn origins"
                placeholder="https://orlenbd.com,https://www.orlenbd.com,http://localhost:5173"
                helperText='Optional if unset: derived per-request from forwarded Host/Proto headers. Overrides database when WEBAUTHN_ORIGINS is set in env.'
                value={form.auth_webauthn_origins ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_webauthn_origins: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="RP ID (hostname only)"
                placeholder="orlenbd.com"
                helperText="Normally your public hostname without port. localhost is allowed for development. Overrides when WEBAUTHN_RP_ID env is set."
                value={form.auth_webauthn_rp_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_webauthn_rp_id: e.target.value.trim() }))}
                fullWidth
                size="small"
              />
              <TextField
                label="RP display name"
                placeholder="Same as site display name or brand"
                helperText="Shown in the passkey / security prompt. Falls back to site display name when empty."
                value={form.auth_webauthn_rp_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auth_webauthn_rp_name: e.target.value }))}
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(form.auth_disable_passkeys ?? "") === "1"}
                    onChange={(_, ck) =>
                      setForm((f) => ({
                        ...f,
                        auth_disable_passkeys: ck ? "1" : "",
                      }))
                    }
                  />
                }
                label="Disable passkeys (password and social buttons stay available when configured)"
              />
              <Typography variant="caption" color="text.secondary">
                Equivalent to DISABLE_PASSKEYS=true when checked (env wins if DISABLE_PASSKEYS is set server-side).
              </Typography>
              <Divider />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(form.auth_single_login_session ?? "") === "1"}
                    onChange={(_, ck) =>
                      setForm((f) => ({
                        ...f,
                        auth_single_login_session: ck ? "1" : "",
                      }))
                    }
                  />
                }
                label="Allow only one active login per account (new sign-in logs out other browsers)"
              />
              <Typography variant="caption" color="text.secondary">
                When enabled, signing in elsewhere bumps a server-side token so older tabs get 401 on the next API call. Env{" "}
                <code style={{ wordBreak: "break-all" }}>FORCE_SINGLE_LOGIN_SESSION=true</code> forces this on;
                DISABLE_SINGLE_LOGIN_SESSION=true keeps multiple sessions regardless of this checkbox.
              </Typography>
            </Stack>
          </TabPanel>

          <TabPanel tab="internal" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              {fieldsFor("internal").map((def) => (
                <TextField
                  key={def.key}
                  label={def.label}
                  helperText={def.helper}
                  value={form[def.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline={def.multiline}
                  minRows={def.multiline ? 4 : 1}
                />
              ))}
            </Stack>
          </TabPanel>

          <TabPanel tab="smtp" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              {fieldsFor("smtp")
                .filter((def) => def.key !== "smtp_html")
                .map((def) => (
                  <TextField
                    key={def.key}
                    label={def.label}
                    helperText={def.helper}
                    value={form[def.key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                    fullWidth
                    size="small"
                    multiline={def.multiline}
                    minRows={def.multiline ? 4 : 1}
                  />
                ))}

              <Box>
                <Tabs
                  value={smtpMsgTab}
                  onChange={(_, v) => setSmtpMsgTab(v as "write" | "preview")}
                  sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                  <Tab label="Write" value="write" />
                  <Tab label="Preview" value="preview" />
                </Tabs>
                {smtpMsgTab === "write" ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      HTML email content. Use <code>{`\${resetLink}`}</code> for the URL.
                    </Typography>
                    <TextField
                      label="HTML email template"
                      helperText="Paste or edit the email HTML here. Use ${resetLink} for the reset URL."
                      value={form["smtp_html"] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, smtp_html: e.target.value }))}
                      fullWidth
                      size="small"
                      multiline
                      minRows={14}
                      sx={{ fontFamily: "monospace" }}
                    />
                  </Box>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      minHeight: 250,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      overflow: "auto",
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: (form["smtp_html"] ?? "").replace(
                          /\$\{resetLink\}/g,
                          `${import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin}/reset-password?token=example-token`
                        ),
                      }}
                    />
                  </Paper>
                )}
              </Box>
            </Stack>
          </TabPanel>

          <TabPanel tab="bulksmsbd" value={tab}>
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              {fieldsFor("bulksmsbd").map((def) => (
                <TextField
                  key={def.key}
                  label={def.label}
                  helperText={def.helper}
                  value={form[def.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline={def.multiline}
                  minRows={def.multiline ? 4 : 1}
                />
              ))}

              <Divider />
              
              <Box>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                  Account Balance
                </Typography>
                <BulkSmsBdBalanceWidget />
              </Box>
            </Stack>
          </TabPanel>

          <Divider sx={{ mt: 2 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
            <Button variant="outlined" onClick={() => setTab("storefront")} disabled={busy}>
              Storefront themes
            </Button>
            <Button variant="contained" color="primary" startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={busy} sx={{ fontWeight: 800 }}>
              Save changes
            </Button>
          </Stack>
        </Box>
      </Paper>
      <AdminImageViewerDialog
        open={Boolean(assetPreview)}
        onClose={() => setAssetPreview(null)}
        images={assetPreview?.url ? [assetPreview.url] : []}
        initialIndex={0}
        title={assetPreview?.title ?? "Asset preview"}
      />
    </Box>
  );
}
