import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
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
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SettingsEthernetRoundedIcon from "@mui/icons-material/SettingsEthernetRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { useToast } from "@/contexts/ToastContext";
import { AdminCouriersApiDocsPanel } from "./AdminCouriersApiDocsPanel";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type PartnerType = "manual" | "pathao" | "steadfast";

type CourierRow = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  trackingUrlTemplate: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  partnerType: PartnerType;
  apiBaseUrl: string | null;
  apiCredentials: Record<string, unknown>;
  webhookSecret: string | null;
  webhookIntegrationSecret: string | null;
  defaultEtaHours: number | null;
  createdAt: string;
  updatedAt: string;
  creator?: StaffRef;
  handler?: StaffRef;
};

type CourierFormState = {
  name: string;
  slug: string;
  website: string;
  trackingUrlTemplate: string;
  phone: string;
  notes: string;
  active: boolean;
  partnerType: PartnerType;
  apiBaseUrl: string;
  webhookSecret: string;
  webhookIntegrationSecret: string;
  defaultEtaHours: string;
  // Per-partner credentials
  pathaoClientId: string;
  pathaoClientSecret: string;
  pathaoUsername: string;
  pathaoPassword: string;
  pathaoStoreId: string;
  pathaoRecipientCityId: string;
  pathaoRecipientZoneId: string;
  pathaoRecipientAreaId: string;
  steadfastApiKey: string;
  steadfastSecretKey: string;
};

const EMPTY_FORM: CourierFormState = {
  name: "",
  slug: "",
  website: "",
  trackingUrlTemplate: "",
  phone: "",
  notes: "",
  active: true,
  partnerType: "manual",
  apiBaseUrl: "",
  webhookSecret: "",
  webhookIntegrationSecret: "",
  defaultEtaHours: "",
  pathaoClientId: "",
  pathaoClientSecret: "",
  pathaoUsername: "",
  pathaoPassword: "",
  pathaoStoreId: "",
  pathaoRecipientCityId: "",
  pathaoRecipientZoneId: "",
  pathaoRecipientAreaId: "",
  steadfastApiKey: "",
  steadfastSecretKey: "",
};

const PARTNER_LABELS: Record<PartnerType, string> = {
  manual: "Manual / no API",
  pathao: "Pathao",
  steadfast: "Steadfast",
};

const PARTNER_DEFAULT_BASE_URL: Record<PartnerType, string> = {
  manual: "",
  pathao: "https://api-hermes.pathao.com",
  steadfast: "https://portal.packzy.com",
};

function formFromRow(c: CourierRow): CourierFormState {
  const creds = (c.apiCredentials ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof creds[k] === "string" ? (creds[k] as string) : "");
  return {
    name: c.name,
    slug: c.slug,
    website: c.website ?? "",
    trackingUrlTemplate: c.trackingUrlTemplate ?? "",
    phone: c.phone ?? "",
    notes: c.notes ?? "",
    active: c.active !== false,
    partnerType: c.partnerType,
    apiBaseUrl: c.apiBaseUrl ?? "",
    webhookSecret: c.webhookSecret ?? "",
    webhookIntegrationSecret: c.webhookIntegrationSecret ?? "",
    defaultEtaHours: c.defaultEtaHours == null ? "" : String(c.defaultEtaHours),
    pathaoClientId: str("clientId"),
    pathaoClientSecret: str("clientSecret"),
    pathaoUsername: str("username"),
    pathaoPassword: str("password"),
    pathaoStoreId:
      typeof creds.storeId === "string"
        ? (creds.storeId as string)
        : typeof creds.storeId === "number"
          ? String(creds.storeId)
          : "",
    pathaoRecipientCityId:
      typeof creds.recipientCityId === "number"
        ? String(creds.recipientCityId)
        : str("recipientCityId"),
    pathaoRecipientZoneId:
      typeof creds.recipientZoneId === "number"
        ? String(creds.recipientZoneId)
        : str("recipientZoneId"),
    pathaoRecipientAreaId:
      typeof creds.recipientAreaId === "number"
        ? String(creds.recipientAreaId)
        : str("recipientAreaId"),
    steadfastApiKey: str("apiKey"),
    steadfastSecretKey: str("secretKey"),
  };
}

function buildPayload(form: CourierFormState): Record<string, unknown> {
  const apiCredentials: Record<string, unknown> = {};
  if (form.partnerType === "pathao") {
    if (form.pathaoClientId.trim()) apiCredentials.clientId = form.pathaoClientId.trim();
    if (form.pathaoClientSecret.trim()) apiCredentials.clientSecret = form.pathaoClientSecret.trim();
    if (form.pathaoUsername.trim()) apiCredentials.username = form.pathaoUsername.trim();
    if (form.pathaoPassword) apiCredentials.password = form.pathaoPassword;
    if (form.pathaoStoreId.trim()) apiCredentials.storeId = form.pathaoStoreId.trim();
    if (form.pathaoRecipientCityId.trim()) {
      const n = Number(form.pathaoRecipientCityId.trim());
      if (Number.isFinite(n) && n > 0) apiCredentials.recipientCityId = n;
    }
    if (form.pathaoRecipientZoneId.trim()) {
      const n = Number(form.pathaoRecipientZoneId.trim());
      if (Number.isFinite(n) && n > 0) apiCredentials.recipientZoneId = n;
    }
    if (form.pathaoRecipientAreaId.trim()) {
      const n = Number(form.pathaoRecipientAreaId.trim());
      if (Number.isFinite(n) && n > 0) apiCredentials.recipientAreaId = n;
    }
  } else if (form.partnerType === "steadfast") {
    if (form.steadfastApiKey.trim()) apiCredentials.apiKey = form.steadfastApiKey.trim();
    if (form.steadfastSecretKey.trim()) apiCredentials.secretKey = form.steadfastSecretKey.trim();
  }
  const eta = form.defaultEtaHours.trim();
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    website: form.website.trim() || null,
    trackingUrlTemplate: form.trackingUrlTemplate.trim() || null,
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
    active: form.active,
    partnerType: form.partnerType,
    apiBaseUrl: form.apiBaseUrl.trim() || null,
    apiCredentials,
    webhookSecret: form.webhookSecret.trim() || null,
    webhookIntegrationSecret: form.webhookIntegrationSecret.trim() || null,
    defaultEtaHours: eta === "" ? null : Number(eta),
  };
}

function CourierFormFields({
  value,
  onChange,
  webhookUrl,
}: {
  value: CourierFormState;
  onChange: (next: CourierFormState) => void;
  webhookUrl?: string;
}) {
  const showToast = useToast();
  const set = <K extends keyof CourierFormState>(k: K, v: CourierFormState[K]) =>
    onChange({ ...value, [k]: v });

  const onPartnerChange = (next: PartnerType) => {
    onChange({
      ...value,
      partnerType: next,
      apiBaseUrl: value.apiBaseUrl || PARTNER_DEFAULT_BASE_URL[next],
    });
  };

  return (
    <Stack spacing={2}>
      <TextField label="Name" required fullWidth value={value.name} onChange={(e) => set("name", e.target.value)} />
      <TextField
        label="Slug"
        required
        fullWidth
        helperText="URL-safe identifier, e.g. pathao, steadfast. Used in the inbound webhook URL."
        value={value.slug}
        onChange={(e) => set("slug", e.target.value)}
      />
      <FormControl fullWidth>
        <InputLabel>Partner type</InputLabel>
        <Select
          label="Partner type"
          value={value.partnerType}
          onChange={(e: SelectChangeEvent) => onPartnerChange(e.target.value as PartnerType)}
        >
          {(Object.keys(PARTNER_LABELS) as PartnerType[]).map((p) => (
            <MenuItem key={p} value={p}>
              {PARTNER_LABELS[p]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {value.partnerType !== "manual" ? (
        <>
          <TextField
            label="API base URL"
            fullWidth
            value={value.apiBaseUrl}
            onChange={(e) => set("apiBaseUrl", e.target.value)}
            helperText="Sandbox/production root, e.g. https://api-hermes.pathao.com"
          />
          {value.partnerType === "pathao" ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Client ID"
                  fullWidth
                  value={value.pathaoClientId}
                  onChange={(e) => set("pathaoClientId", e.target.value)}
                />
                <TextField
                  label="Client secret"
                  fullWidth
                  type="password"
                  value={value.pathaoClientSecret}
                  onChange={(e) => set("pathaoClientSecret", e.target.value)}
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Username (merchant email)"
                  fullWidth
                  value={value.pathaoUsername}
                  onChange={(e) => set("pathaoUsername", e.target.value)}
                  helperText={
                    "For https://api-hermes.pathao.com use the same email you use to log into merchant.pathao.com. " +
                    "test@pathao.com / lovePathao only work with sandbox base URL and sandbox client id/secret."
                  }
                />
                <TextField
                  label="Password"
                  fullWidth
                  type="password"
                  value={value.pathaoPassword}
                  onChange={(e) => set("pathaoPassword", e.target.value)}
                />
              </Stack>
              <TextField
                label="Store ID"
                fullWidth
                value={value.pathaoStoreId}
                onChange={(e) => set("pathaoStoreId", e.target.value)}
                helperText="Numeric store id from your Pathao merchant dashboard."
              />
              <Typography variant="body2" color="text.secondary">
                Default recipient location (Pathao city / zone / area IDs). Required for API order creation — use
                values from Pathao’s location APIs or dashboard, not your free-text shipping district names.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Recipient city ID"
                  fullWidth
                  required
                  value={value.pathaoRecipientCityId}
                  onChange={(e) => set("pathaoRecipientCityId", e.target.value)}
                  helperText="e.g. Dhaka city id from Pathao"
                />
                <TextField
                  label="Recipient zone ID"
                  fullWidth
                  required
                  value={value.pathaoRecipientZoneId}
                  onChange={(e) => set("pathaoRecipientZoneId", e.target.value)}
                  helperText="Zone within that city"
                />
              </Stack>
              <TextField
                label="Recipient area ID (optional)"
                fullWidth
                value={value.pathaoRecipientAreaId}
                onChange={(e) => set("pathaoRecipientAreaId", e.target.value)}
                helperText="Include if Pathao rejects create without area_id for your store."
              />
            </Stack>
          ) : null}
          {value.partnerType === "steadfast" ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="API key"
                fullWidth
                value={value.steadfastApiKey}
                onChange={(e) => set("steadfastApiKey", e.target.value)}
              />
              <TextField
                label="Secret key"
                fullWidth
                type="password"
                value={value.steadfastSecretKey}
                onChange={(e) => set("steadfastSecretKey", e.target.value)}
              />
            </Stack>
          ) : null}
          <TextField
            label="Webhook secret (signing)"
            fullWidth
            type="password"
            value={value.webhookSecret}
            onChange={(e) => set("webhookSecret", e.target.value)}
            helperText="Same string as Pathao’s webhook “Secret” field. We verify X-Pathao-Signature with it."
          />
          {value.partnerType === "pathao" ? (
            <TextField
              label="Pathao integration response secret (UUID)"
              fullWidth
              value={value.webhookIntegrationSecret}
              onChange={(e) => set("webhookIntegrationSecret", e.target.value)}
              placeholder="Paste UUID from Pathao webhook validation"
              helperText={
                "Exact value Pathao shows for X-Pathao-Merchant-Webhook-Integration-Secret in the webhook checklist. " +
                "Required for their TEST; not the same as the signing secret above. If empty, we fall back to the signing secret (usually wrong for Pathao)."
              }
            />
          ) : null}
        </>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Tracking URL template"
          fullWidth
          placeholder="https://example.com/track?no={{tracking}}"
          value={value.trackingUrlTemplate}
          onChange={(e) => set("trackingUrlTemplate", e.target.value)}
        />
        <TextField
          label="Default ETA (hours)"
          fullWidth
          type="number"
          inputProps={{ min: 0, max: 720 }}
          value={value.defaultEtaHours}
          onChange={(e) => set("defaultEtaHours", e.target.value)}
        />
      </Stack>

      <TextField
        label="Website"
        fullWidth
        value={value.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <TextField
        label="Phone"
        fullWidth
        value={value.phone}
        onChange={(e) => set("phone", e.target.value)}
      />
      <TextField
        label="Internal notes"
        fullWidth
        multiline
        minRows={2}
        value={value.notes}
        onChange={(e) => set("notes", e.target.value)}
      />

      {webhookUrl ? (
        <Alert severity="info" variant="outlined" icon={<SettingsEthernetRoundedIcon />}>
          <Typography variant="caption" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
            Inbound webhook URL
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              component="code"
              sx={{ fontSize: "0.8rem", flex: 1, wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}
            >
              {webhookUrl}
            </Box>
            <IconButton
              size="small"
              aria-label="Copy webhook URL"
              onClick={() => {
                void navigator.clipboard?.writeText(webhookUrl);
                showToast("Webhook URL copied.", "success");
              }}
            >
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Paste this URL into Pathao’s webhook callback. Sign requests with the webhook signing secret; OrlenBD
            responds with HTTP 202 and Pathao’s integration response header on success.
          </Typography>
        </Alert>
      ) : null}

      <FormControlLabel
        control={
          <Switch checked={value.active} onChange={(e) => set("active", e.target.checked)} />
        }
        label="Active"
      />
    </Stack>
  );
}

function CouriersTab({ onOpenDocs }: { onOpenDocs: () => void }) {
  const showToast = useToast();
  const { can } = useAdminPermission();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CourierFormState>(EMPTY_FORM);
  const [editRow, setEditRow] = useState<CourierRow | null>(null);
  const [editForm, setEditForm] = useState<CourierFormState>(EMPTY_FORM);
  const [editWebhookUrl, setEditWebhookUrl] = useState<string | undefined>(undefined);
  const [deleteRow, setDeleteRow] = useState<CourierRow | null>(null);

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/couriers", {
        page,
        perPage,
        q: q || undefined,
        active: activeFilter === "true" || activeFilter === "false" ? activeFilter : undefined,
      }),
    [page, perPage, q, activeFilter],
  );

  const listQ = useQuery({
    queryKey: ["admin-couriers", listUrl],
    queryFn: () => apiJson<AdminListResponse<CourierRow>>(listUrl),
  });

  const items = listQ.data?.items ?? [];
  const totalPages = listQ.data?.totalPages ?? 1;
  const total = listQ.data?.total ?? 0;

  const createMut = useMutation({
    mutationFn: () =>
      apiJson<CourierRow>("/api/admin/couriers", {
        method: "POST",
        body: JSON.stringify(buildPayload(createForm)),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-couriers"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Courier created.", "success");
      setCreateForm(EMPTY_FORM);
      setAddOpen(false);
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Create failed.", "error"),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiJson(`/api/admin/couriers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-couriers"] });
      showToast("Courier updated.", "success");
      setEditRow(null);
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Update failed.", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/couriers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-couriers"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Courier deleted.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed.", "error"),
  });

  const testMut = useMutation({
    mutationFn: (id: string) =>
      apiJson<{ ok: boolean; message?: string; error?: string; latencyMs: number }>(
        `/api/admin/couriers/${id}/test-connection`,
        { method: "POST" },
      ),
    onSuccess: (r) => {
      if (r.ok) showToast(`Connection OK${r.message ? ` — ${r.message}` : ""} (${r.latencyMs}ms).`, "success");
      else showToast(`Failed: ${r.error ?? "unknown"} (${r.latencyMs}ms).`, "error");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Test failed.", "error"),
  });

  const openEdit = async (c: CourierRow) => {
    setEditRow(c);
    setEditForm(formFromRow(c));
    try {
      const fresh = await apiJson<CourierRow & { webhookUrl?: string }>(`/api/admin/couriers/${c.id}`);
      setEditWebhookUrl(fresh.webhookUrl);
      setEditForm(formFromRow(fresh));
    } catch {
      setEditWebhookUrl(undefined);
    }
  };

  const renderTable = () => (
    <TableContainer
      component={Paper}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}
    >
      <Table size="medium" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Partner</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Slug</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Phone</TableCell>
            <TableCell>Active</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && !listQ.isLoading ? (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
                  {q || activeFilter ? "No couriers match filters." : "No couriers yet. Add one for order fulfillment."}
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((c) => (
            <TableRow key={c.id} hover>
              <TableCell>
                <Typography fontWeight={700}>{c.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { md: "none" } }}>
                  {c.slug} · {PARTNER_LABELS[c.partnerType]}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Chip
                  size="small"
                  label={PARTNER_LABELS[c.partnerType]}
                  color={c.partnerType === "manual" ? "default" : "primary"}
                  variant="outlined"
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Box component="code" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                  {c.slug}
                </Box>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>{c.phone ?? "—"}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={c.active ? "Yes" : "No"}
                  color={c.active ? "success" : "default"}
                  variant="outlined"
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={c.creator ?? null} dense />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={c.handler ?? null} dense />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {can("couriers", "edit") && c.partnerType !== "manual" ? (
                    <Button
                      size="small"
                      variant="text"
                      disabled={testMut.isPending}
                      onClick={() => testMut.mutate(c.id)}
                    >
                      Test
                    </Button>
                  ) : null}
                  {can("couriers", "edit") ? (
                    <IconButton size="small" aria-label="Edit" onClick={() => void openEdit(c)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {can("couriers", "delete") ? (
                    <IconButton size="small" color="error" aria-label="Delete" onClick={() => setDeleteRow(c)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((c) => (
        <Grid item xs={12} sm={6} md={4} key={c.id}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>{c.name}</Typography>
                <Chip
                  size="small"
                  label={c.active ? "Active" : "Off"}
                  color={c.active ? "success" : "default"}
                  variant="outlined"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                {c.slug} · {PARTNER_LABELS[c.partnerType]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {c.phone ?? "No phone"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {can("couriers", "edit") ? (
                  <Button size="small" onClick={() => void openEdit(c)}>
                    Edit
                  </Button>
                ) : null}
                {can("couriers", "edit") && c.partnerType !== "manual" ? (
                  <Button size="small" disabled={testMut.isPending} onClick={() => testMut.mutate(c.id)}>
                    Test
                  </Button>
                ) : null}
                {can("couriers", "delete") ? (
                  <Button size="small" color="error" variant="outlined" onClick={() => setDeleteRow(c)}>
                    Delete
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderList = () => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List disablePadding>
        {items.map((c) => (
          <ListItem
            key={c.id}
            secondaryAction={
              <Stack direction="row" spacing={0.5}>
                {can("couriers", "edit") ? (
                  <IconButton size="small" aria-label="Edit" onClick={() => void openEdit(c)}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {can("couriers", "delete") ? (
                  <IconButton size="small" color="error" aria-label="Delete" onClick={() => setDeleteRow(c)}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>
            }
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 20 }}>
              <ListItemText
                primary={c.name}
                secondary={`${c.slug} · ${PARTNER_LABELS[c.partnerType]} · ${c.active ? "active" : "inactive"}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
        Configure delivery partners. Pathao and Steadfast use real API integrations — set credentials, paste the
        webhook URL into the partner dashboard, and click <strong>Test</strong> to confirm connectivity. Pick{" "}
        <strong>Manual</strong> for couriers without an API integration.
      </Typography>

      <AdminListToolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        page={page}
        totalPages={totalPages}
        onPageChange={(_, p) => setPage(p)}
        perPage={perPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
        total={total}
        selectedCount={0}
        onClearSelection={() => {}}
        bulkActions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {can("couriers", "create") ? (
              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  setCreateForm(EMPTY_FORM);
                  setAddOpen(true);
                }}
              >
                Add courier or delivery partner
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenDocs}
            >
              API documentation
            </Button>
          </Stack>
        }
        filters={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setQ(qInput.trim()), setPage(1))}
              sx={{ minWidth: 200 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => (setQ(qInput.trim()), setPage(1))}>
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Active</InputLabel>
              <Select
                label="Active"
                value={activeFilter}
                onChange={(e: SelectChangeEvent) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
      />

      {listQ.isLoading ? <Typography color="text.secondary">Loading…</Typography> : null}
      {!listQ.isLoading && viewMode === "table" ? renderTable() : null}
      {!listQ.isLoading && viewMode === "grid" ? (
        items.length ? (
          renderGrid()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || activeFilter ? "No couriers match filters." : "No couriers yet."}
          </Typography>
        )
      ) : null}

      {!listQ.isLoading && items.length === 0 && can("couriers", "create") ? (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Box>
              <Typography fontWeight={700}>No courier partners yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Add Pathao, Steadfast, or a manual delivery partner to start dispatching orders.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setCreateForm(EMPTY_FORM);
                setAddOpen(true);
              }}
            >
              Add courier or delivery partner
            </Button>
          </Stack>
        </Paper>
      ) : null}
      {!listQ.isLoading && viewMode === "list" ? (
        items.length ? (
          renderList()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || activeFilter ? "No couriers match filters." : "No couriers yet."}
          </Typography>
        )
      ) : null}

      <Dialog open={addOpen} onClose={() => !createMut.isPending && setAddOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add courier</DialogTitle>
        <DialogContent dividers>
          <CourierFormFields value={createForm} onChange={setCreateForm} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={createMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={createMut.isPending || !createForm.name.trim() || !createForm.slug.trim()}
            onClick={() => createMut.mutate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editRow)} onClose={() => !patchMut.isPending && setEditRow(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit courier
          {editRow ? (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({PARTNER_LABELS[editRow.partnerType]})
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent dividers>
          <CourierFormFields value={editForm} onChange={setEditForm} webhookUrl={editWebhookUrl} />
          {editRow && editRow.partnerType !== "manual" ? (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<SettingsEthernetRoundedIcon />}
                disabled={testMut.isPending}
                onClick={() => testMut.mutate(editRow.id)}
              >
                Test connection
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Issues a no-op call against the partner (Pathao token issue / Steadfast balance lookup).
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)} disabled={patchMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={patchMut.isPending || !editForm.name.trim() || !editForm.slug.trim() || !editRow}
            onClick={() => {
              if (!editRow) return;
              patchMut.mutate({ id: editRow.id, body: buildPayload(editForm) });
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete courier"
        message={
          deleteRow ? `Remove ${deleteRow.name}? This cannot be undone if no orders reference this courier.` : ""
        }
        confirmLabel="Delete"
        destructive
        confirmDisabled={delMut.isPending}
        onCancel={() => setDeleteRow(null)}
        onConfirm={async () => {
          if (!deleteRow) return;
          try {
            await delMut.mutateAsync(deleteRow.id);
            setDeleteRow(null);
          } catch {
            /* toast handles error */
          }
        }}
      />
    </Box>
  );
}

export function AdminCouriersPanel() {
  const [tab, setTab] = useState<"list" | "docs">("list");
  // Allow deep-linking via ?tab=docs (used by buttons inside the courier form etc.).
  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("tab");
    if (t === "docs") setTab("docs");
  }, []);

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Tabs
        value={tab}
        onChange={(_, v: "list" | "docs") => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="list" label="Couriers" />
        <Tab value="docs" label="Partner API docs" />
      </Tabs>
      {tab === "list" ? <CouriersTab onOpenDocs={() => setTab("docs")} /> : <AdminCouriersApiDocsPanel />}
    </Box>
  );
}
