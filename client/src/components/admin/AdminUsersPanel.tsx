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
  type SelectChangeEvent,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import { AdminStaffCell, AdminUserCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
  adminRoleId: string | null;
  createdAt: string;
  creator?: StaffRef;
  handler?: StaffRef;
};

type AccessRoleOption = { id: string; name: string; slug: string };

const ROLES = ["customer", "vendor_staff", "platform_admin"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function roleChip(role: string) {
  if (role === "platform_admin") return <Chip size="small" label="Admin" color="error" variant="outlined" />;
  if (role === "vendor_staff") return <Chip size="small" label="Vendor staff" color="info" variant="outlined" />;
  return <Chip size="small" label="Customer" color="default" variant="outlined" />;
}

export function AdminUsersPanel() {
  const showToast = useToast();
  const { can } = useAdminPermission();
  const qc = useQueryClient();
  const search = useSearch();
  const [, setLoc] = useLocation();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    role: "customer" as (typeof ROLES)[number],
    adminRoleId: "" as string,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<
    { kind: "one"; id: string; name: string } | { kind: "bulk"; count: number } | null
  >(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "customer" as (typeof ROLES)[number],
    adminRoleId: "" as string,
  });

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/users", {
        page,
        perPage,
        q: q || undefined,
        role:
          roleFilter === "customer" || roleFilter === "vendor_staff" || roleFilter === "platform_admin"
            ? roleFilter
            : undefined,
      }),
    [page, perPage, q, roleFilter]
  );

  const listQ = useQuery({
    queryKey: ["admin-users", listUrl],
    queryFn: () => apiJson<AdminListResponse<UserRow>>(listUrl),
  });

  const accessRolesQ = useQuery({
    queryKey: ["admin-access-roles"],
    queryFn: () => apiJson<{ items: AccessRoleOption[] }>("/api/admin/access-roles"),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const detailQ = useQuery({
    queryKey: ["admin-user", viewId ?? editId],
    queryFn: () => apiJson<UserRow>(`/api/admin/users/${viewId ?? editId}`),
    enabled: Boolean(viewId || editId),
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("newUser") !== "1") return;

    const accessCandidate = params.get("accessRoleId")?.trim() ?? "";
    const roleCandidate = params.get("role")?.trim() ?? "";

    const next = {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "customer" as (typeof ROLES)[number],
      adminRoleId: "",
    };

    if (UUID_RE.test(accessCandidate)) {
      next.role = "platform_admin";
      next.adminRoleId = accessCandidate;
    } else if (
      roleCandidate === "customer" ||
      roleCandidate === "vendor_staff" ||
      roleCandidate === "platform_admin"
    ) {
      next.role = roleCandidate;
    }

    setCreateForm(next);
    setCreateOpen(true);
    setLoc("/users", { replace: true });
  }, [search, setLoc]);

  useEffect(() => {
    const u = detailQ.data;
    if (!u || !editId) return;
    setEditForm({
      fullName: u.fullName,
      role: (ROLES.find((r) => r === u.role) ?? "customer") as (typeof ROLES)[number],
      adminRoleId: u.adminRoleId ?? "",
    });
  }, [detailQ.data, editId]);

  const patchRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiJson(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { fullName?: string; role?: string; adminRoleId?: string | null } }) =>
      apiJson(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed.", "error"),
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson<UserRow>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      showToast("User created.", "success");
      setCreateOpen(false);
      setCreateForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "customer",
        adminRoleId: "",
      });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Could not create user.", "error"),
  });

  const bulkMut = useMutation({
    mutationFn: (ids: string[]) =>
      apiJson<{ deleted: number; errors: string[] }>("/api/admin/users/bulk", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: (out) => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      if (out.errors?.length) {
        showToast(
          `Deleted ${out.deleted}. Some rows failed: ${out.errors.slice(0, 8).join(" · ")}`,
          "warning",
        );
      }
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Bulk delete failed.", "error"),
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

  const rowActions = (u: UserRow) => (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {can("users", "view") ? (
        <IconButton size="small" aria-label="View" onClick={() => setViewId(u.id)}>
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("users", "edit") ? (
        <IconButton size="small" aria-label="Edit" onClick={() => setEditId(u.id)}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("users", "delete") ? (
        <IconButton
          size="small"
          aria-label="Delete"
          color="error"
          onClick={() => setDeleteConfirm({ kind: "one", id: u.id, name: u.fullName })}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );

  const renderTable = () => (
    <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
      <Table size="medium" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={items.some((i) => selected.has(i.id)) && !items.every((i) => selected.has(i.id))}
                checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                onChange={toggleAllPage}
              />
            </TableCell>
            <TableCell>User</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Contact</TableCell>
            <TableCell>Role</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Joined</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id} hover selected={selected.has(u.id)}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
              </TableCell>
              <TableCell>
                <AdminUserCell
                  fullName={u.fullName}
                  avatarUrl={u.avatarUrl}
                  secondary={[u.email, u.phone].filter(Boolean).join(" · ") || undefined}
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Typography variant="body2">{u.email ?? "—"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.phone ?? ""}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 200 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>{roleChip(u.role)}</Box>
                  <FormControl size="small" fullWidth sx={{ maxWidth: { xs: "100%", sm: 200 } }}>
                    <InputLabel id={`role-${u.id}`}>Set role</InputLabel>
                    <Select
                      labelId={`role-${u.id}`}
                      label="Set role"
                      value={u.role}
                      onChange={(e: SelectChangeEvent) => patchRole.mutate({ id: u.id, role: e.target.value })}
                      disabled={!can("users", "edit") || patchRole.isPending}
                    >
                      {ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r.replace("_", " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, color: "text.secondary", whiteSpace: "nowrap" }}>
                {new Date(u.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={u.creator ?? null} dense />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={u.handler ?? null} dense />
              </TableCell>
              <TableCell align="right">{rowActions(u)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((u) => (
        <Grid item xs={12} sm={6} md={4} key={u.id}>
          <Card variant="outlined" sx={{ height: "100%", borderColor: selected.has(u.id) ? "primary.main" : "divider" }}>
            <CardContent>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Checkbox checked={selected.has(u.id)} onChange={() => toggle(u.id)} size="small" />
                {roleChip(u.role)}
              </Stack>
              <Typography fontWeight={800} sx={{ mt: 1 }}>
                {u.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {[u.email, u.phone].filter(Boolean).join(" · ") || "—"}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {rowActions(u)}
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
        {items.map((u) => (
          <ListItem
            key={u.id}
            secondaryAction={<Stack direction="row">{rowActions(u)}</Stack>}
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 22 }} onClick={() => toggle(u.id)}>
              <Checkbox edge="start" checked={selected.has(u.id)} tabIndex={-1} disableRipple />
              <ListItemText primary={u.fullName} secondary={`${u.role} · ${u.email ?? u.phone ?? "—"}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const d = detailQ.data;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Search by name, email, or phone. Role changes apply immediately; bulk delete skips protected accounts.
        </Typography>
        {can("users", "create") ? (
          <Button
            variant="contained"
            startIcon={<PersonAddRoundedIcon />}
            onClick={() => {
              setCreateForm({
                fullName: "",
                email: "",
                phone: "",
                password: "",
                role: "customer",
                adminRoleId: "",
              });
              setCreateOpen(true);
            }}
            sx={{ fontWeight: 800, flexShrink: 0 }}
          >
            Add user
          </Button>
        ) : null}
      </Stack>
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
          can("users", "delete") ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={!selected.size || bulkMut.isPending}
              onClick={() => setDeleteConfirm({ kind: "bulk", count: selected.size })}
            >
              Delete selected
            </Button>
          ) : null
        }
        filters={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search users…"
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
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={roleFilter}
                onChange={(e: SelectChangeEvent) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All roles</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="vendor_staff">Vendor staff</MenuItem>
                <MenuItem value="platform_admin">Platform admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
      />

      {listQ.isLoading ? <Typography color="text.secondary">Loading…</Typography> : null}
      {!listQ.isLoading && items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No users match filters.
        </Typography>
      ) : null}
      {!listQ.isLoading && items.length > 0
        ? viewMode === "table"
          ? renderTable()
          : viewMode === "grid"
            ? renderGrid()
            : renderList()
        : null}

      <Dialog open={Boolean(viewId)} onClose={() => setViewId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>User</DialogTitle>
        <DialogContent>
          {detailQ.isLoading ? <Typography sx={{ mt: 1 }}>Loading…</Typography> : null}
          {d ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography fontWeight={800}>{d.fullName}</Typography>
              <Typography variant="body2">{d.email ?? "—"}</Typography>
              <Typography variant="body2">{d.phone ?? ""}</Typography>
              {roleChip(d.role)}
              <Typography variant="caption" color="text.secondary">
                Joined {new Date(d.createdAt).toLocaleString("en-GB")}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full name"
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Phone"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Temporary password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              size="small"
              required
              helperText="Minimum 6 characters."
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Account role</InputLabel>
              <Select
                label="Account role"
                value={createForm.role}
                onChange={(e: SelectChangeEvent) =>
                  setCreateForm((f) => ({
                    ...f,
                    role: e.target.value as (typeof ROLES)[number],
                    adminRoleId: e.target.value === "platform_admin" ? f.adminRoleId : "",
                  }))
                }
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {createForm.role === "platform_admin" ? (
              <FormControl size="small" fullWidth>
                <InputLabel>Admin access role</InputLabel>
                <Select
                  label="Admin access role"
                  value={createForm.adminRoleId}
                  onChange={(e: SelectChangeEvent) =>
                    setCreateForm((f) => ({ ...f, adminRoleId: e.target.value }))
                  }
                >
                  <MenuItem value="">
                    <em>Full access (all areas)</em>
                  </MenuItem>
                  {(accessRolesQ.data?.items ?? []).map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={createMut.isPending}
            onClick={() => {
              const email = createForm.email.trim();
              const phone = createForm.phone.trim();
              if (!email && !phone) {
                showToast("Enter email and/or phone.", "error");
                return;
              }
              if (!createForm.fullName.trim()) {
                showToast("Full name is required.", "error");
                return;
              }
              if (createForm.password.length < 6) {
                showToast("Password must be at least 6 characters.", "error");
                return;
              }
              if (phone && phone.length < 8) {
                showToast("Phone must be at least 8 characters if provided.", "error");
                return;
              }
              void createMut.mutateAsync({
                fullName: createForm.fullName.trim(),
                ...(email ? { email } : {}),
                ...(phone ? { phone } : {}),
                password: createForm.password,
                role: createForm.role,
                adminRoleId:
                  createForm.role === "platform_admin"
                    ? createForm.adminRoleId.trim()
                      ? createForm.adminRoleId.trim()
                      : null
                    : null,
              });
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full name"
              value={editForm.fullName}
              onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              fullWidth
              size="small"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={editForm.role}
                onChange={(e: SelectChangeEvent) =>
                  setEditForm((f) => ({
                    ...f,
                    role: e.target.value as (typeof ROLES)[number],
                    adminRoleId: e.target.value === "platform_admin" ? f.adminRoleId : "",
                  }))
                }
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {editForm.role === "platform_admin" ? (
              <FormControl size="small" fullWidth>
                <InputLabel>Admin access role</InputLabel>
                <Select
                  label="Admin access role"
                  value={editForm.adminRoleId}
                  onChange={(e: SelectChangeEvent) =>
                    setEditForm((f) => ({ ...f, adminRoleId: e.target.value }))
                  }
                >
                  <MenuItem value="">
                    <em>Full access (all areas)</em>
                  </MenuItem>
                  {(accessRolesQ.data?.items ?? []).map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={patchUser.isPending || !editId}
            onClick={() => {
              if (!editId) return;
              void patchUser.mutateAsync({
                id: editId,
                body: {
                  fullName: editForm.fullName.trim(),
                  role: editForm.role,
                  adminRoleId:
                    editForm.role === "platform_admin"
                      ? editForm.adminRoleId.trim()
                        ? editForm.adminRoleId.trim()
                        : null
                      : null,
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
        title={deleteConfirm?.kind === "bulk" ? "Delete users" : "Delete user"}
        message={
          deleteConfirm?.kind === "bulk"
            ? `Delete ${deleteConfirm.count} users? This cannot be undone.`
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
          await bulkMut.mutateAsync(Array.from(selected));
          setDeleteConfirm(null);
        }}
      />
    </Box>
  );
}
