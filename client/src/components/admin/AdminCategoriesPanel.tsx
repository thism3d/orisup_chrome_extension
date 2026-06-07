import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Pagination,
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
import IconButton from "@mui/material/IconButton";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { mediaAbsoluteUrl } from "@/lib/site";
import type { Category } from "@/lib/types";
import {
  buildCategoryTree,
  categoryBreadcrumb,
  MAX_CATEGORY_DEPTH,
  type CategoryNode,
  type CategoryTreeRow,
} from "@shared/categoryTree";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { AdminProductImagesField } from "./AdminProductImagesField";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type CategoryFormState = {
  name: string;
  slug: string;
  sortOrder: number;
  imageUrl: string;
};

const EMPTY_FORM: CategoryFormState = { name: "", slug: "", sortOrder: 0, imageUrl: "" };

/** Scroll inside each column card when header/list is wider than the viewport (not on individual rows). */
const CATEGORY_PANE_PAPER_SX = {
  p: 1.5,
  borderRadius: 2,
  minHeight: 360,
  minWidth: 0,
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
} as const;

type CategoryAuditRow = {
  id: string;
  action: string;
  createdAt: string;
  actor: StaffRef;
};

function CategoryAuditLogSection({ categoryId }: { categoryId: string | null }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  useEffect(() => {
    setPage(1);
  }, [categoryId]);
  const listUrl = useMemo(
    () =>
      categoryId ? adminListQuery(`/api/admin/categories/${categoryId}/audit-log`, { page, perPage }) : "",
    [categoryId, page, perPage],
  );
  const listQ = useQuery({
    queryKey: ["admin-category-audit", listUrl],
    queryFn: () => apiJson<AdminListResponse<CategoryAuditRow>>(listUrl),
    enabled: Boolean(categoryId && listUrl),
  });
  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={800} sx={{ mb: 0.5 }}>
        Audit activity for selected category
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Immutable admin API changes targeting this category (same source as System → Audit logs).
      </Typography>
      {!categoryId ? (
        <Typography variant="body2" color="text.secondary">
          Select a category in the columns above to load its audit trail.
        </Typography>
      ) : listQ.isLoading ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When (UTC)</TableCell>
                  <TableCell>Creator</TableCell>
                  <TableCell>Handler</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No audit entries for this category yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {new Date(row.createdAt).toISOString().slice(0, 19)}Z
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <AdminStaffCell staff={row.actor} dense />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360, wordBreak: "break-word" }}>{row.action}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 ? (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Stack>
          ) : null}
        </>
      )}
    </Paper>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function CategoryRow({
  node,
  selected,
  onSelect,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  node: CategoryNode<Category>;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const imgSrc = node.imageUrl ? mediaAbsoluteUrl(node.imageUrl) ?? node.imageUrl : null;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      onClick={onSelect}
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1.5,
        cursor: "pointer",
        bgcolor: selected ? "action.selected" : "transparent",
        border: "1px solid",
        borderColor: selected ? "primary.main" : "transparent",
        transition: "background 0.15s ease, border-color 0.15s ease",
        "&:hover": { bgcolor: "action.hover" },
        minWidth: 0,
        width: "100%",
      }}
    >
      <Avatar
        src={imgSrc ?? undefined}
        variant="rounded"
        sx={{ width: 36, height: 36, bgcolor: imgSrc ? "transparent" : "action.hover" }}
      >
        {!imgSrc ? <CategoryRoundedIcon fontSize="small" color="action" /> : null}
      </Avatar>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} noWrap>
          {node.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }} noWrap>
          {node.slug}
        </Typography>
      </Stack>
      {node.children.length ? <Chip size="small" label={node.children.length} sx={{ fontWeight: 700 }} /> : null}
      {canEdit ? (
        <Tooltip title="Edit">
          <IconButton size="small" sx={{ flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {canDelete ? (
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            sx={{ flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <ChevronRightRoundedIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
    </Stack>
  );
}

function PaneHeader({
  title,
  subtitle,
  onAdd,
  addDisabled,
  addLabel,
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addDisabled?: boolean;
  addLabel: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1}
      sx={{ mb: 1, minWidth: 0 }}
    >
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={800}>{title}</Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {onAdd ? (
        <Tooltip title={addDisabled ? "Maximum depth reached" : addLabel}>
          <span style={{ flexShrink: 0 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={onAdd}
              disabled={addDisabled}
              sx={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                width: { xs: "100%", sm: "auto" },
                minHeight: 36,
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {addLabel}
              </Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                Add
              </Box>
            </Button>
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
}

export function AdminCategoriesPanel() {
  const { can } = useAdminPermission();
  const qc = useQueryClient();
  const [rootId, setRootId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<{ parentId: string | null; depth: number } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteRow, setDeleteRow] = useState<CategoryNode<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Deepest selected leaf in column 3 (sub-sub). */
  const [tertiaryId, setTertiaryId] = useState<string | null>(null);

  const treeQ = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: () => apiJson<CategoryNode<Category>[]>("/api/admin/categories/tree"),
  });

  const allRows = useMemo<CategoryTreeRow[]>(() => flattenTree(treeQ.data ?? []), [treeQ.data]);
  const tree = treeQ.data ?? [];

  const roots = tree;
  const activeRoot = useMemo(() => roots.find((r) => r.id === rootId) ?? null, [roots, rootId]);
  const subs = activeRoot?.children ?? [];
  const activeSub = useMemo(() => subs.find((s) => s.id === subId) ?? null, [subs, subId]);
  const subSubs = activeSub?.children ?? [];

  useEffect(() => {
    if (!rootId && roots[0]) setRootId(roots[0].id);
    if (rootId && !roots.some((r) => r.id === rootId)) {
      setRootId(roots[0]?.id ?? null);
      setSubId(null);
    }
    if (subId && !subs.some((s) => s.id === subId)) setSubId(null);
  }, [roots, subs, rootId, subId]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: ["categories"] });
    void qc.invalidateQueries({ queryKey: ["categories-tree"] });
    void qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const createMut = useMutation({
    mutationFn: (vars: { parentId: string | null; payload: Record<string, unknown> }) =>
      apiJson("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ ...vars.payload, parentId: vars.parentId }),
      }),
    onSuccess: () => {
      invalidate();
      setAddOpen(null);
      setForm(EMPTY_FORM);
      setSlugTouched(false);
      setError(null);
    },
    onError: (e) => setError(humaniseError(e)),
  });

  const patchMut = useMutation({
    mutationFn: (vars: { id: string; body: Record<string, unknown> }) =>
      apiJson(`/api/admin/categories/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.body),
      }),
    onSuccess: () => {
      invalidate();
      setEditId(null);
      setForm(EMPTY_FORM);
      setSlugTouched(false);
      setError(null);
    },
    onError: (e) => setError(humaniseError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDeleteRow(null);
    },
  });

  const openAdd = (parentId: string | null, depth: number) => {
    if (depth > MAX_CATEGORY_DEPTH) return;
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setError(null);
    setAddOpen({ parentId, depth });
  };

  const openEdit = (node: CategoryNode<Category>) => {
    setEditId(node.id);
    setForm({
      name: node.name,
      slug: node.slug,
      sortOrder: node.sortOrder,
      imageUrl: node.imageUrl ?? "",
    });
    setSlugTouched(true);
    setError(null);
  };

  const submitAdd = () => {
    if (!addOpen) return;
    if (!form.name.trim() || !form.slug.trim()) return;
    createMut.mutate({
      parentId: addOpen.parentId,
      payload: {
        name: form.name.trim(),
        slug: form.slug.trim(),
        sortOrder: form.sortOrder,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      },
    });
  };

  const submitEdit = () => {
    if (!editId) return;
    if (!form.name.trim() || !form.slug.trim()) return;
    patchMut.mutate({
      id: editId,
      body: {
        name: form.name.trim(),
        slug: form.slug.trim(),
        sortOrder: form.sortOrder,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      },
    });
  };

  const editingNode = editId ? findNode(tree, editId) : null;
  const editingBreadcrumb = editingNode
    ? categoryBreadcrumb(allRows, editingNode.id).map((n) => n.name).join(" / ")
    : "";

  const dialogParent = addOpen?.parentId ? findNode(tree, addOpen.parentId) : null;
  const dialogParentCrumb = dialogParent
    ? categoryBreadcrumb(allRows, dialogParent.id).map((n) => n.name).join(" / ")
    : "Top-level (root)";

  const canCreate = can("categories", "create");
  const canEdit = can("categories", "edit");
  const canDelete = can("categories", "delete");

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
          Build a three-level catalog tree (Category &rsaquo; Subcategory &rsaquo; Sub-subcategory) and upload an image
          for each node. The tree powers storefront navigation, the mobile categories page, and search filters.
        </Typography>
      </Stack>

      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr 1fr",
            },
            alignItems: "stretch",
          }}
        >
        {/* ROOT PANE */}
        <Paper variant="outlined" sx={CATEGORY_PANE_PAPER_SX}>
          <PaneHeader
            title="Categories"
            subtitle={`${roots.length} root${roots.length === 1 ? "" : "s"}`}
            addLabel="Add category"
            onAdd={canCreate ? () => openAdd(null, 0) : undefined}
          />
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5} sx={{ maxHeight: 520, overflow: "auto" }}>
            {roots.length === 0 && !treeQ.isLoading ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No categories yet. Click &ldquo;Add category&rdquo; to start.
              </Typography>
            ) : null}
            {roots.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                selected={node.id === rootId}
                onSelect={() => {
                  setRootId(node.id);
                  setSubId(null);
                  setTertiaryId(null);
                }}
                onEdit={() => openEdit(node)}
                onDelete={() => setDeleteRow(node)}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </Stack>
        </Paper>

        {/* SUB PANE */}
        <Paper variant="outlined" sx={CATEGORY_PANE_PAPER_SX}>
          <PaneHeader
            title={activeRoot ? `${activeRoot.name} subcategories` : "Subcategories"}
            subtitle={
              activeRoot ? `${subs.length} sub${subs.length === 1 ? "" : "s"}` : "Select a category on the left"
            }
            addLabel="Add sub"
            onAdd={canCreate && activeRoot ? () => openAdd(activeRoot.id, 1) : undefined}
          />
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5} sx={{ maxHeight: 520, overflow: "auto" }}>
            {!activeRoot ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Pick a category to manage its subcategories.
              </Typography>
            ) : subs.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No subcategories yet.
              </Typography>
            ) : null}
            {subs.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                selected={node.id === subId}
                onSelect={() => {
                  setSubId(node.id);
                  setTertiaryId(null);
                }}
                onEdit={() => openEdit(node)}
                onDelete={() => setDeleteRow(node)}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </Stack>
        </Paper>

        {/* SUB-SUB PANE */}
        <Paper variant="outlined" sx={CATEGORY_PANE_PAPER_SX}>
          <PaneHeader
            title={activeSub ? `${activeSub.name} sub-subcategories` : "Sub-subcategories"}
            subtitle={
              activeSub ? `${subSubs.length} item${subSubs.length === 1 ? "" : "s"}` : "Select a subcategory in the middle column"
            }
            addLabel="Add sub-sub"
            onAdd={canCreate && activeSub ? () => openAdd(activeSub.id, 2) : undefined}
            addDisabled={!activeSub}
          />
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5} sx={{ maxHeight: 520, overflow: "auto" }}>
            {!activeSub ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Pick a subcategory to manage its leaves.
              </Typography>
            ) : subSubs.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No sub-subcategories yet.
              </Typography>
            ) : null}
            {subSubs.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                selected={node.id === tertiaryId}
                onSelect={() => setTertiaryId(node.id)}
                onEdit={() => openEdit(node)}
                onDelete={() => setDeleteRow(node)}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </Stack>
        </Paper>
        </Box>
      </Box>

      <CategoryAuditLogSection categoryId={tertiaryId ?? subId ?? rootId} />

      {/* ADD DIALOG */}
      <Dialog open={Boolean(addOpen)} onClose={() => setAddOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {addOpen?.depth === 0 ? "Add category" : addOpen?.depth === 1 ? "Add subcategory" : "Add sub-subcategory"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Parent: <strong>{dialogParentCrumb}</strong>
            </Typography>
            {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
            <TextField
              size="small"
              label="Display name"
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));
              }}
              fullWidth
              autoFocus
            />
            <TextField
              size="small"
              label="Slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              fullWidth
              helperText="URL-friendly identifier, e.g. mobile-and-gadgets"
            />
            <TextField
              size="small"
              type="number"
              label="Sort order"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
            />
            <AdminProductImagesField
              sectionTitle="Category image"
              value={form.imageUrl ? [form.imageUrl] : []}
              onChange={(urls) => setForm((f) => ({ ...f, imageUrl: urls.slice(0, 1)[0] ?? "" }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || !form.slug.trim() || createMut.isPending}
            onClick={submitAdd}
          >
            {createMut.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Path: <strong>{editingBreadcrumb || "—"}</strong>
            </Typography>
            {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
            <TextField
              size="small"
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              type="number"
              label="Sort order"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
            />
            <AdminProductImagesField
              sectionTitle="Category image"
              value={form.imageUrl ? [form.imageUrl] : []}
              onChange={(urls) => setForm((f) => ({ ...f, imageUrl: urls.slice(0, 1)[0] ?? "" }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || !form.slug.trim() || patchMut.isPending}
            onClick={submitEdit}
          >
            {patchMut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete category"
        message={
          deleteRow
            ? `Delete “${deleteRow.name}”? Any subcategories will also be removed and products will lose this category tag.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        confirmDisabled={deleteMut.isPending}
        onCancel={() => setDeleteRow(null)}
        onConfirm={() => {
          if (!deleteRow) return;
          deleteMut.mutate(deleteRow.id);
        }}
      />
    </Stack>
  );
}

function flattenTree(nodes: CategoryNode<Category>[]): CategoryTreeRow[] {
  const out: CategoryTreeRow[] = [];
  const walk = (list: CategoryNode<Category>[]) => {
    for (const n of list) {
      out.push({
        id: n.id,
        name: n.name,
        slug: n.slug,
        parentId: n.parentId,
        imageUrl: n.imageUrl ?? null,
        sortOrder: n.sortOrder,
      });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function findNode(nodes: CategoryNode<Category>[], id: string): CategoryNode<Category> | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function humaniseError(err: unknown): string {
  if (!(err instanceof Error)) return "Save failed.";
  if (/max_depth/i.test(err.message)) return "Maximum depth (3 levels) reached.";
  if (/cycle/i.test(err.message)) return "Cannot move a category under one of its descendants.";
  if (/slug/i.test(err.message)) return "Slug already in use.";
  return err.message;
}
