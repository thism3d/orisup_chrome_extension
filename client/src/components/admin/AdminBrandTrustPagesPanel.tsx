import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { apiJson } from "@/lib/api";
import { AdminRichTextEditor } from "./AdminRichTextEditor";
import { BRAND_TRUST_SLUGS, type BrandTrustSlug } from "../../../../shared/contentPageDefaults";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type TrustPageRow = {
  slug: BrandTrustSlug;
  enabled: boolean;
  kicker: string;
  titleEn: string;
  introEn: string;
  bodyEn: string;
  metaDescriptionEn: string;
  titleBn: string;
  introBn: string;
  bodyBn: string;
  metaDescriptionBn: string;
  updatedAt: string;
  creator?: StaffRef;
  handler?: StaffRef;
};

const SLUG_LABELS: Record<BrandTrustSlug, string> = {
  about: "About us",
  contact: "Contact us",
  terms: "Terms & conditions",
  privacy: "Privacy policy",
  returns: "Return & refund policy",
  warranty: "Warranty policy",
  faq: "Help & FAQ",
  payments: "Payment disclosures",
};

const SLUG_PATHS: Record<BrandTrustSlug, string> = {
  about: "/about",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
  returns: "/returns",
  warranty: "/warranty",
  faq: "/faq",
  payments: "/payments",
};

export function AdminBrandTrustPagesPanel() {
  const [matchEditor, params] = useRoute<{ slug: string }>("/brand-trust-pages/:slug");
  if (matchEditor && params?.slug && BRAND_TRUST_SLUGS.includes(params.slug as BrandTrustSlug)) {
    return <BrandTrustPageEditor slug={params.slug as BrandTrustSlug} />;
  }
  return <BrandTrustPagesList />;
}

function BrandTrustPagesList() {
  const showToast = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/brand-trust-pages"],
    queryFn: () => apiJson<{ items: TrustPageRow[] }>("/api/admin/brand-trust-pages"),
  });
  const errToastRef = useRef(false);
  useEffect(() => {
    if (error && !errToastRef.current) {
      errToastRef.current = true;
      showToast(`Failed to load: ${(error as Error).message}`, "error");
    }
    if (!error) errToastRef.current = false;
  }, [error, showToast]);
  const items = useMemo(() => {
    const byKey = new Map((data?.items ?? []).map((r) => [r.slug, r]));
    return BRAND_TRUST_SLUGS.map((s) => byKey.get(s)).filter(Boolean) as TrustPageRow[];
  }, [data]);

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
          Brand Trust Pages
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage the editable copy for the marketing/legal pages your customers see in the storefront. Changes appear immediately on the live site after saving. English is the source of truth; Bangla is optional and falls back to English when empty.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Page</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Path</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Title (EN)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Updated</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No pages yet — they will be seeded automatically on next server start.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.slug} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{SLUG_LABELS[row.slug]}</TableCell>
                    <TableCell>
                      <Typography component="code" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {SLUG_PATHS[row.slug]}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.titleEn}
                    </TableCell>
                    <TableCell>
                      {row.enabled ? (
                        <Chip label="Live" size="small" color="success" sx={{ fontWeight: 700 }} />
                      ) : (
                        <Chip label="Hidden" size="small" sx={{ fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                      {new Date(row.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      <AdminStaffCell staff={row.creator ?? null} dense />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      <AdminStaffCell staff={row.handler ?? null} dense />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open live page">
                        <IconButton size="small" component="a" href={SLUG_PATHS[row.slug]} target="_blank" rel="noopener noreferrer">
                          <OpenInNewRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        size="small"
                        component={Link}
                        href={`/brand-trust-pages/${row.slug}`}
                        startIcon={<EditRoundedIcon />}
                        sx={{ ml: 1, fontWeight: 700 }}
                        variant="contained"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}

function BrandTrustPageEditor({ slug }: { slug: BrandTrustSlug }) {
  const showToast = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const queryKey = ["/api/admin/brand-trust-pages", slug];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => apiJson<TrustPageRow>(`/api/admin/brand-trust-pages/${slug}`),
  });
  const loadErrRef = useRef(false);
  useEffect(() => {
    if (error && !loadErrRef.current) {
      loadErrRef.current = true;
      showToast(`Failed to load: ${(error as Error).message}`, "error");
    }
    if (!error) loadErrRef.current = false;
  }, [error, showToast]);

  const [form, setForm] = useState<TrustPageRow | null>(null);
  const [tab, setTab] = useState<"en" | "bn">("en");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (next: TrustPageRow) =>
      apiJson<TrustPageRow>(`/api/admin/brand-trust-pages/${slug}`, {
        method: "PUT",
        body: JSON.stringify({
          enabled: next.enabled,
          kicker: next.kicker,
          titleEn: next.titleEn,
          introEn: next.introEn,
          bodyEn: next.bodyEn,
          metaDescriptionEn: next.metaDescriptionEn,
          titleBn: next.titleBn,
          introBn: next.introBn,
          bodyBn: next.bodyBn,
          metaDescriptionBn: next.metaDescriptionBn,
        }),
      }),
    onSuccess: (row) => {
      qc.setQueryData(queryKey, row);
      qc.invalidateQueries({ queryKey: ["/api/admin/brand-trust-pages"] });
      qc.invalidateQueries({ queryKey: ["/api/public/content-pages"] });
      qc.invalidateQueries({ queryKey: ["/api/public/content-pages", slug] });
      setForm(row);
      showToast("Saved.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Save failed.", "error"),
  });

  const resetMut = useMutation({
    mutationFn: async () =>
      apiJson<TrustPageRow>(`/api/admin/brand-trust-pages/${slug}/reset`, { method: "POST" }),
    onSuccess: (row) => {
      qc.setQueryData(queryKey, row);
      qc.invalidateQueries({ queryKey: ["/api/admin/brand-trust-pages"] });
      qc.invalidateQueries({ queryKey: ["/api/public/content-pages"] });
      qc.invalidateQueries({ queryKey: ["/api/public/content-pages", slug] });
      setForm(row);
      showToast("Reset to default.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Reset failed.", "error"),
  });

  if (isLoading || !form) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ py: 4 }}>
        Failed to load page. Check the toast for details or try again.
      </Typography>
    );
  }

  const setField = <K extends keyof TrustPageRow>(key: K, value: TrustPageRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.1 }}>
              Brand Trust Page
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {SLUG_LABELS[slug]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Path on storefront: <code>{SLUG_PATHS[slug]}</code>. Tokens you can use in body / intro:{" "}
              <code>{"{{brand}}"}</code>, <code>{"{{phone}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{address}}"}</code>.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component={Link} href="/brand-trust-pages" size="small" color="inherit">
              All pages
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<RestoreRoundedIcon />}
              disabled={resetMut.isPending}
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset to default
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saveMut.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
              disabled={saveMut.isPending}
              onClick={() => form && saveMut.mutate(form)}
              sx={{ fontWeight: 800 }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset to default"
        message="Reset this page to the bundled default copy? Your current edits will be lost."
        confirmLabel="Reset"
        destructive
        confirmDisabled={resetMut.isPending}
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetMut.mutate();
          setResetConfirmOpen(false);
        }}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(_, v) => setField("enabled", v)}
                  color="primary"
                />
              }
              label={form.enabled ? "Visible on storefront" : "Hidden (404 + removed from sitemap)"}
            />
            <TextField
              label="Kicker (small chip above title)"
              value={form.kicker}
              onChange={(e) => setField("kicker", e.target.value)}
              size="small"
              sx={{ maxWidth: 280 }}
              inputProps={{ maxLength: 80 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v: "en" | "bn") => setTab(v)}
          sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
        >
          <Tab value="en" label="English (required)" sx={{ fontWeight: 700 }} />
          <Tab value="bn" label="Bangla (optional override)" sx={{ fontWeight: 700 }} />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          {tab === "en" ? (
            <Stack spacing={2}>
              <TextField
                label="Title"
                value={form.titleEn}
                onChange={(e) => setField("titleEn", e.target.value)}
                fullWidth
                required
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Intro paragraph (shown under title)"
                value={form.introEn}
                onChange={(e) => setField("introEn", e.target.value)}
                fullWidth
                multiline
                minRows={2}
                inputProps={{ maxLength: 2000 }}
                helperText="One short paragraph; plain text or simple HTML."
              />
              <TextField
                label="Meta description (SEO)"
                value={form.metaDescriptionEn}
                onChange={(e) => setField("metaDescriptionEn", e.target.value)}
                fullWidth
                inputProps={{ maxLength: 320 }}
                helperText="120–160 characters for search results."
              />
              <Divider />
              <AdminRichTextEditor
                label="Body (rich HTML)"
                value={form.bodyEn}
                onChange={(next) => setField("bodyEn", next)}
                minRows={20}
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ fontWeight: 500 }}>
                Bangla fields are optional. Leave a field empty to use the English value as a fallback for Bangla visitors.
              </Alert>
              <TextField
                label="Title (Bangla)"
                value={form.titleBn}
                onChange={(e) => setField("titleBn", e.target.value)}
                fullWidth
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Intro paragraph (Bangla)"
                value={form.introBn}
                onChange={(e) => setField("introBn", e.target.value)}
                fullWidth
                multiline
                minRows={2}
                inputProps={{ maxLength: 2000 }}
              />
              <TextField
                label="Meta description (Bangla)"
                value={form.metaDescriptionBn}
                onChange={(e) => setField("metaDescriptionBn", e.target.value)}
                fullWidth
                inputProps={{ maxLength: 320 }}
              />
              <Divider />
              <AdminRichTextEditor
                label="Body (Bangla, rich HTML)"
                value={form.bodyBn}
                onChange={(next) => setField("bodyBn", next)}
                minRows={20}
              />
            </Stack>
          )}
        </Box>
      </Paper>

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button onClick={() => refetch()} color="inherit" size="small">
          Discard changes
        </Button>
        <Button
          onClick={() => navigate("/brand-trust-pages")}
          color="inherit"
          size="small"
        >
          Back to list
        </Button>
        <Button
          variant="contained"
          startIcon={saveMut.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
          disabled={saveMut.isPending}
          onClick={() => form && saveMut.mutate(form)}
          sx={{ fontWeight: 800 }}
        >
          Save changes
        </Button>
      </Stack>
    </Stack>
  );
}
