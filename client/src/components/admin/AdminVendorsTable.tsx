import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { Link } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type Vendor = {
  id: string;
  name: string;
  slug: string;
  status: string;
  commissionRate: string | null;
  logoUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  creator?: StaffRef;
  handler?: StaffRef;
};

function statusChip(status: string) {
  const s = status.toLowerCase();
  if (s === "approved") return <Chip size="small" label="Approved" color="success" variant="outlined" />;
  if (s === "pending") return <Chip size="small" label="Pending" color="warning" variant="outlined" />;
  if (s === "suspended") return <Chip size="small" label="Suspended" color="error" variant="outlined" />;
  return <Chip size="small" label={status} variant="outlined" />;
}

export function AdminVendorsTable() {
  const showToast = useToast();
  const search = useSearch();
  const { can } = useAdminPermission();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const raw = search.startsWith("?") ? search.slice(1) : search || "";
    const p = new URLSearchParams(raw);
    const qq = p.get("q")?.trim();
    if (qq) {
      setQ(qq);
      setQInput(qq);
      setPage(1);
    }
  }, [search]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [viewVendorId, setViewVendorId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    status: "pending" as "pending" | "approved" | "suspended",
    commissionRate: "",
    logoUrl: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<
    { kind: "one"; id: string; name: string } | { kind: "bulk"; count: number } | null
  >(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    commissionRate: "",
    logoUrl: "",
    contactPhone: "",
    contactEmail: "",
    status: "pending" as "pending" | "approved" | "suspended",
  });

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/vendors", {
        page,
        perPage,
        q: q || undefined,
        status:
          statusFilter === "pending" || statusFilter === "approved" || statusFilter === "suspended"
            ? statusFilter
            : undefined,
      }),
    [page, perPage, q, statusFilter]
  );

  const listQ = useQuery({
    queryKey: ["admin-vendors", listUrl],
    queryFn: () => apiJson<AdminListResponse<Vendor>>(listUrl),
  });

  const items = listQ.data?.items ?? [];
  const totalPages = listQ.data?.totalPages ?? 1;
  const total = listQ.data?.total ?? 0;

  const vendorQ = useQuery({
    queryKey: ["admin-vendor", editId],
    queryFn: () => apiJson<Vendor>(`/api/admin/vendors/${editId}`),
    enabled: Boolean(editId),
  });

  const viewVendorQ = useQuery({
    queryKey: ["admin-vendor", viewVendorId],
    queryFn: () => apiJson<Vendor>(`/api/admin/vendors/${viewVendorId}`),
    enabled: Boolean(viewVendorId),
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiJson<Vendor>("/api/admin/vendors", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Create failed.", "error"),
  });

  useEffect(() => {
    const v = vendorQ.data;
    if (!v || !editId) return;
    setEditForm({
      name: v.name,
      slug: v.slug,
      commissionRate: v.commissionRate ?? "",
      logoUrl: v.logoUrl ?? "",
      contactPhone: v.contactPhone ?? "",
      contactEmail: v.contactEmail ?? "",
      status: (["pending", "approved", "suspended"].find((s) => s === v.status) ?? "pending") as
        | "pending"
        | "approved"
        | "suspended",
    });
  }, [vendorQ.data, editId]);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiJson(`/api/admin/vendors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      void qc.invalidateQueries({ queryKey: ["admin-vendor"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed.", "error"),
  });

  const bulkMut = useMutation({
    mutationFn: (body: { action: string; ids: string[]; status?: string }) =>
      apiJson<{ deleted?: number; updated?: number; errors?: string[] }>("/api/admin/vendors/bulk", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (out) => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      if (out && "errors" in out && Array.isArray(out.errors) && out.errors.length) {
        showToast(out.errors.slice(0, 8).join(" · "), "warning");
      }
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Bulk action failed.", "error"),
  });

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllPage = () => {
    const ids = items.map((i) => i.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((s) => {
      const n = new Set(s);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const rowActions = (v: Vendor) => (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
      {can("vendors", "view") ? (
        <IconButton size="small" aria-label="View vendor" onClick={() => setViewVendorId(v.id)}>
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("vendors", "edit") ? (
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<CheckCircleOutlineRoundedIcon />}
          onClick={() => patch.mutate({ id: v.id, body: { status: "approved" } })}
          disabled={v.status === "approved" || patch.isPending}
        >
          Approve
        </Button>
      ) : null}
      {can("vendors", "edit") ? (
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<BlockRoundedIcon />}
          onClick={() => patch.mutate({ id: v.id, body: { status: "suspended" } })}
          disabled={v.status === "suspended" || patch.isPending}
        >
          Suspend
        </Button>
      ) : null}
      {can("vendors", "edit") ? (
        <IconButton size="small" aria-label="Edit vendor" onClick={() => setEditId(v.id)}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("vendors", "delete") ? (
        <IconButton
          size="small"
          color="error"
          aria-label="Delete vendor"
          onClick={() => setDeleteConfirm({ kind: "one", id: v.id, name: v.name })}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {v.status === "approved" && can("vendors", "view") ? (
        <Button size="small" component={Link} href={`/v/${v.slug}`}>
          Store
        </Button>
      ) : null}
    </Stack>
  );

  const renderTable = () => (
    <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
      <Table size="medium" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={items.some((i) => selected.has(i.id)) && !items.every((i) => selected.has(i.id))}
                checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                onChange={toggleAllPage}
              />
            </TableCell>
            <TableCell>Vendor</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Slug</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Commission %</TableCell>
            <TableCell>Status</TableCell>
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
                  {q || statusFilter ? "No vendors match filters." : "No vendors yet."}
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((v) => (
            <TableRow key={v.id} hover selected={selected.has(v.id)}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
              </TableCell>
              <TableCell>
                <Typography fontWeight={700}>{v.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", sm: "none" }, fontFamily: "ui-monospace, monospace" }}>
                  {v.slug}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                  {v.slug}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" }, color: "text.secondary" }}>
                {v.commissionRate ?? "0"}
              </TableCell>
              <TableCell>{statusChip(v.status)}</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={v.creator ?? null} dense />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={v.handler ?? null} dense />
              </TableCell>
              <TableCell align="right">{rowActions(v)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderMobileCards = () => (
    <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
      {items.length === 0 && !listQ.isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography color="text.secondary" variant="body2">
            {q || statusFilter ? "No vendors match filters." : "No vendors yet."}
          </Typography>
        </Paper>
      ) : null}
      {items.map((v) => (
        <Paper key={v.id} sx={{ p: 2, border: "1px solid", borderColor: selected.has(v.id) ? "primary.main" : "divider", borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Checkbox checked={selected.has(v.id)} onChange={() => toggle(v.id)} size="small" />
              {statusChip(v.status)}
            </Stack>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800}>{v.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                {v.slug}
              </Typography>
              {v.commissionRate != null && v.commissionRate !== "" ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  Commission {v.commissionRate}%
                </Typography>
              ) : null}
            </Box>
            {rowActions(v)}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((v) => (
        <Grid item xs={12} sm={6} md={4} key={v.id}>
          <Card variant="outlined" sx={{ height: "100%", borderColor: selected.has(v.id) ? "primary.main" : "divider" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Checkbox checked={selected.has(v.id)} onChange={() => toggle(v.id)} size="small" />
                {statusChip(v.status)}
              </Stack>
              <Typography fontWeight={800} sx={{ mt: 1 }}>
                {v.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: "ui-monospace, monospace" }}>
                {v.slug}
              </Typography>
              <Stack sx={{ mt: 1 }}>{rowActions(v)}</Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderList = () => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List disablePadding>
        {items.map((v) => (
          <ListItem
            key={v.id}
            secondaryAction={<Stack direction="row">{rowActions(v)}</Stack>}
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 4 }} onClick={() => toggle(v.id)}>
              <Checkbox edge="start" checked={selected.has(v.id)} tabIndex={-1} disableRipple />
              <ListItemText primary={v.name} secondary={`${v.slug} · ${v.status}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Approve sellers before they list publicly. Edit profile fields, suspend, or bulk-update status.
      </Typography>
      {can("vendors", "create") ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }} justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setCreateForm({
                name: "",
                slug: "",
                status: "pending",
                commissionRate: "",
                logoUrl: "",
                contactPhone: "",
                contactEmail: "",
              });
              setCreateOpen(true);
            }}
          >
            Add vendor
          </Button>
        </Stack>
      ) : null}
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
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        bulkActions={
          <>
            {can("vendors", "edit") ? (
              <Button
                size="small"
                variant="outlined"
                disabled={!selected.size || bulkMut.isPending}
                onClick={() => bulkMut.mutate({ action: "set_status", ids: Array.from(selected), status: "approved" })}
              >
                Approve
              </Button>
            ) : null}
            {can("vendors", "edit") ? (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={!selected.size || bulkMut.isPending}
                onClick={() => bulkMut.mutate({ action: "set_status", ids: Array.from(selected), status: "suspended" })}
              >
                Suspend
              </Button>
            ) : null}
            {can("vendors", "edit") ? (
              <Button
                size="small"
                variant="outlined"
                disabled={!selected.size || bulkMut.isPending}
                onClick={() => bulkMut.mutate({ action: "set_status", ids: Array.from(selected), status: "pending" })}
              >
                Set pending
              </Button>
            ) : null}
            {can("vendors", "delete") ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={!selected.size || bulkMut.isPending}
                onClick={() => setDeleteConfirm({ kind: "bulk", count: selected.size })}
              >
                Delete
              </Button>
            ) : null}
          </>
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
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e: SelectChangeEvent) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
      />

      {listQ.isLoading ? <Typography color="text.secondary">Loading…</Typography> : null}

      {!listQ.isLoading && viewMode === "table" && isMdUp ? renderTable() : null}
      {!listQ.isLoading && viewMode === "table" && !isMdUp ? renderMobileCards() : null}
      {!listQ.isLoading && viewMode === "grid" ? (
        items.length ? (
          renderGrid()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || statusFilter ? "No vendors match filters." : "No vendors yet."}
          </Typography>
        )
      ) : null}
      {!listQ.isLoading && viewMode === "list" ? (
        items.length ? (
          renderList()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || statusFilter ? "No vendors match filters." : "No vendors yet."}
          </Typography>
        )
      ) : null}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Slug"
              value={createForm.slug}
              onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
              fullWidth
              size="small"
              required
              helperText="Lowercase letters, numbers, and hyphens only."
            />
            <TextField
              label="Commission %"
              value={createForm.commissionRate}
              onChange={(e) => setCreateForm((f) => ({ ...f, commissionRate: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Logo URL"
              value={createForm.logoUrl}
              onChange={(e) => setCreateForm((f) => ({ ...f, logoUrl: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Contact phone"
              value={createForm.contactPhone}
              onChange={(e) => setCreateForm((f) => ({ ...f, contactPhone: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Contact email"
              value={createForm.contactEmail}
              onChange={(e) => setCreateForm((f) => ({ ...f, contactEmail: e.target.value }))}
              fullWidth
              size="small"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={createForm.status}
                onChange={(e: SelectChangeEvent) =>
                  setCreateForm((f) => ({ ...f, status: e.target.value as typeof createForm.status }))
                }
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createMut.isPending || !createForm.name.trim() || !/^[a-z0-9-]+$/.test(createForm.slug.trim().toLowerCase())}
            onClick={async () => {
              const slug = createForm.slug.trim().toLowerCase();
              const body: Record<string, unknown> = {
                name: createForm.name.trim(),
                slug,
                status: createForm.status,
              };
              if (createForm.commissionRate.trim()) body.commissionRate = createForm.commissionRate.trim();
              if (createForm.logoUrl.trim()) body.logoUrl = createForm.logoUrl.trim();
              else body.logoUrl = null;
              if (createForm.contactPhone.trim()) body.contactPhone = createForm.contactPhone.trim();
              else body.contactPhone = null;
              const em = createForm.contactEmail.trim();
              if (em) body.contactEmail = em;
              else body.contactEmail = null;
              try {
                await createMut.mutateAsync(body);
                showToast("Vendor created.", "success");
                setCreateOpen(false);
                setPage(1);
              } catch {
                /* toast in mutation */
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewVendorId)} onClose={() => setViewVendorId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Vendor</DialogTitle>
        <DialogContent>
          {viewVendorQ.isLoading ? <Typography sx={{ mt: 1 }}>Loading…</Typography> : null}
          {viewVendorQ.data ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography fontWeight={800}>{viewVendorQ.data.name}</Typography>
              {statusChip(viewVendorQ.data.status)}
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                {viewVendorQ.data.slug}
              </Typography>
              <Typography variant="body2">Commission {viewVendorQ.data.commissionRate ?? "0"}%</Typography>
              {viewVendorQ.data.logoUrl ? (
                <Typography variant="body2" color="text.secondary">
                  Logo: {viewVendorQ.data.logoUrl}
                </Typography>
              ) : null}
              {viewVendorQ.data.contactPhone ? (
                <Typography variant="body2">{viewVendorQ.data.contactPhone}</Typography>
              ) : null}
              {viewVendorQ.data.contactEmail ? (
                <Typography variant="body2">{viewVendorQ.data.contactEmail}</Typography>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewVendorId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" />
            <TextField label="Slug" value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} fullWidth size="small" />
            <TextField
              label="Commission %"
              value={editForm.commissionRate}
              onChange={(e) => setEditForm((f) => ({ ...f, commissionRate: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField label="Logo URL" value={editForm.logoUrl} onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))} fullWidth size="small" />
            <TextField label="Contact phone" value={editForm.contactPhone} onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))} fullWidth size="small" />
            <TextField label="Contact email" value={editForm.contactEmail} onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))} fullWidth size="small" />
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={editForm.status}
                onChange={(e: SelectChangeEvent) =>
                  setEditForm((f) => ({ ...f, status: e.target.value as typeof editForm.status }))
                }
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={patch.isPending || !editId}
            onClick={() => {
              if (!editId) return;
              const emailTrim = editForm.contactEmail.trim();
              void patch.mutateAsync({
                id: editId,
                body: {
                  name: editForm.name.trim(),
                  slug: editForm.slug.trim(),
                  commissionRate: editForm.commissionRate.trim() || undefined,
                  logoUrl: editForm.logoUrl.trim() || null,
                  contactPhone: editForm.contactPhone.trim() || null,
                  contactEmail: emailTrim ? emailTrim : null,
                  status: editForm.status,
                },
              });
              setEditId(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === "bulk" ? "Delete vendors" : "Delete vendor"}
        message={
          deleteConfirm?.kind === "bulk"
            ? `Delete ${deleteConfirm.count} vendors? This fails for any vendor that still has products.`
            : deleteConfirm?.kind === "one"
              ? `Delete “${deleteConfirm.name}”? This cannot be undone.`
              : ""
        }
        confirmLabel="Delete"
        destructive
        confirmDisabled={delMut.isPending || bulkMut.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          if (deleteConfirm.kind === "one") {
            await delMut.mutateAsync(deleteConfirm.id);
            setDeleteConfirm(null);
            return;
          }
          await bulkMut.mutateAsync({ action: "delete", ids: Array.from(selected) });
          setDeleteConfirm(null);
        }}
      />
    </Box>
  );
}
