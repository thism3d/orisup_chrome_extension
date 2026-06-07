import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiJson } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { AdminRolePermissionDialog } from "./AdminRolePermissionDialog";
import { createEmptyMatrix, type AdminPermissionMatrix } from "@shared/adminPermissions";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

const STOREFRONT_ROLES = [
  {
    id: "platform_admin",
    title: "Platform administrator",
    summary: "Can be granted access to this dashboard via an access role. Assign under Users.",
    color: "error" as const,
  },
  {
    id: "vendor_staff",
    title: "Vendor staff",
    summary: "Manages one or more seller stores: products and orders for their SKUs.",
    color: "info" as const,
  },
  {
    id: "customer",
    title: "Customer",
    summary: "Shops on the storefront — not an admin user.",
    color: "default" as const,
  },
];

type AccessRoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  permissions: AdminPermissionMatrix;
  creator?: StaffRef;
  handler?: StaffRef;
};

export function AdminRolesPanel() {
  const qc = useQueryClient();
  const showToast = useToast();
  const { can } = useAdminPermission();
  const [metaOpen, setMetaOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [permOpen, setPermOpen] = useState<null | {
    mode: "create" | "edit";
    id?: string;
    name: string;
    description: string;
    initial: AdminPermissionMatrix;
  }>(null);
  const [deleteId, setDeleteId] = useState<AccessRoleRow | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-access-roles"],
    queryFn: () => apiJson<{ items: AccessRoleRow[] }>("/api/admin/access-roles"),
  });

  const createMut = useMutation({
    mutationFn: (body: { name: string; description: string; permissions: AdminPermissionMatrix }) =>
      apiJson<AccessRoleRow>("/api/admin/access-roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-access-roles"] });
      showToast("Access role created.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Create failed", "error"),
  });

  const patchMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ name: string; description: string; permissions: AdminPermissionMatrix }> }) =>
      apiJson<AccessRoleRow>(`/api/admin/access-roles/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify(p.body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-access-roles"] });
      showToast("Access role updated.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Update failed", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/access-roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-access-roles"] });
      showToast("Access role removed.", "info");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed", "error"),
  });

  const items = listQ.data?.items ?? [];

  const startCreate = () => {
    setNewName("");
    setNewDesc("");
    setMetaOpen(true);
  };

  const afterMeta = () => {
    if (!newName.trim()) {
      showToast("Name is required.", "error");
      return;
    }
    setMetaOpen(false);
    setPermOpen({
      mode: "create",
      name: newName.trim(),
      description: newDesc.trim(),
      initial: createEmptyMatrix(),
    });
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1} sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          <strong>Access roles</strong> define which areas of the platform admin a staff account can use. Assign a role to
          each <strong>platform administrator</strong> on the{" "}
          <Link href="/users" style={{ color: "inherit", fontWeight: 700 }}>
            Users
          </Link>{" "}
          page. Leaving <strong>Access role</strong> empty for a user means full access (superuser).
        </Typography>
        {can("roles", "create") ? (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={startCreate} sx={{ fontWeight: 800, flexShrink: 0 }}>
            Create access role
          </Button>
        ) : null}
      </Stack>

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto", maxWidth: "100%" }}
      >
        <Table size="medium" sx={{ minWidth: { xs: 0, sm: 640 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Key</TableCell>
              <TableCell>Description</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, fontWeight: 800 }}>Creator</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, fontWeight: 800 }}>Handler</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!listQ.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                    No custom roles yet. Create one to limit dashboard access for staff.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={800}>{r.name}</Typography>
                    {r.isSystem ? (
                      <Chip size="small" label="System" color="warning" variant="outlined" />
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {r.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {r.description || "—"}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={r.creator ?? null} dense />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={r.handler ?? null} dense />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    {can("users", "create") ? (
                      <Tooltip title={`Create admin user (${r.name} access)`}>
                        <IconButton
                          component={Link}
                          href={`/users?newUser=1&accessRoleId=${encodeURIComponent(r.id)}`}
                          size="small"
                          color="primary"
                          aria-label={`Create user with access role ${r.name}`}
                        >
                          <PersonAddRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {can("roles", "edit") ? (
                      <Button
                        size="small"
                        startIcon={<EditRoundedIcon />}
                        onClick={() =>
                          setPermOpen({
                            mode: "edit",
                            id: r.id,
                            name: r.name,
                            description: r.description,
                            initial: r.permissions,
                          })
                        }
                      >
                        Edit
                      </Button>
                    ) : null}
                    {can("roles", "delete") && !r.isSystem ? (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() => setDeleteId(r)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 4, mb: 1 }}>
        Storefront account types
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        These are <strong>user account roles</strong> on the shop (who someone is). They are separate from access roles
        above (what an admin can do in this dashboard).
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}
      >
        <Table size="medium" sx={{ minWidth: { xs: 0, sm: 560 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Account role</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Key</TableCell>
              <TableCell>Summary</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {STOREFRONT_ROLES.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={800}>{r.title}</Typography>
                    <Chip size="small" label={r.id} color={r.color} variant="outlined" />
                  </Stack>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {r.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {r.summary}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {can("users", "create") ? (
                    <Tooltip title={`Create ${r.title} account`}>
                      <IconButton
                        component={Link}
                        href={`/users?newUser=1&role=${encodeURIComponent(r.id)}`}
                        size="small"
                        color="primary"
                        aria-label={`Create user as ${r.id}`}
                      >
                        <PersonAddRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={metaOpen} onClose={() => setMetaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New access role</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Name"
              fullWidth
              size="small"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <TextField
              label="Description (optional)"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={afterMeta}>
            Next: permissions
          </Button>
        </DialogActions>
      </Dialog>

      <AdminRolePermissionDialog
        open={Boolean(permOpen)}
        title={permOpen?.mode === "create" ? `Permissions — ${permOpen.name}` : `Edit — ${permOpen?.name ?? ""}`}
        subtitle={permOpen?.description}
        initial={permOpen?.initial ?? null}
        saving={createMut.isPending || patchMut.isPending}
        onClose={() => setPermOpen(null)}
        onSave={(matrix) => {
          if (!permOpen) return;
          if (permOpen.mode === "create") {
            createMut.mutate(
              { name: permOpen.name, description: permOpen.description, permissions: matrix },
              { onSuccess: () => setPermOpen(null) }
            );
          } else if (permOpen.id) {
            patchMut.mutate(
              { id: permOpen.id, body: { permissions: matrix } },
              { onSuccess: () => setPermOpen(null) }
            );
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete access role"
        message={
          deleteId
            ? `Delete “${deleteId.name}”? Users assigned this role will lose those permission limits (their account role is unchanged).`
            : ""
        }
        confirmLabel="Delete"
        destructive
        confirmDisabled={delMut.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await delMut.mutateAsync(deleteId.id);
          setDeleteId(null);
        }}
      />
    </Box>
  );
}
