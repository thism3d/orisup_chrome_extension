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
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { AdminProductImagesField } from "./AdminProductImagesField";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type BannerRow = Banner & { active: boolean; creator?: StaffRef; handler?: StaffRef };
type ToggleValue = "true" | "false";

export function AdminBannersPanel() {
  const { can } = useAdminPermission();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [placementFilter, setPlacementFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [newPlacement, setNewPlacement] = useState("hero");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [addBannerImages, setAddBannerImages] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [newShowTitle, setNewShowTitle] = useState<ToggleValue>("true");
  const [newShowSubtitle, setNewShowSubtitle] = useState<ToggleValue>("true");
  const [newShowButton, setNewShowButton] = useState<ToggleValue>("true");
  const [newShowShadow, setNewShowShadow] = useState<ToggleValue>("true");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewRow, setViewRow] = useState<BannerRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<BannerRow | null>(null);
  const [editRow, setEditRow] = useState<BannerRow | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    subtitle: "",
    ctaLabel: "",
    imageUrl: "",
    linkUrl: "",
    placement: "hero",
    sortOrder: 0,
    showTitle: true,
    showSubtitle: true,
    showButton: true,
    showShadow: true,
    active: true,
  });

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/banners", {
        page,
        perPage,
        q: q || undefined,
        placement: placementFilter.trim() || undefined,
        active: activeFilter === "true" || activeFilter === "false" ? activeFilter : undefined,
      }),
    [page, perPage, q, placementFilter, activeFilter]
  );

  const listQ = useQuery({
    queryKey: ["admin-banners", listUrl],
    queryFn: () => apiJson<AdminListResponse<BannerRow>>(listUrl),
  });

  const items = listQ.data?.items ?? [];
  const totalPages = listQ.data?.totalPages ?? 1;
  const total = listQ.data?.total ?? 0;

  const add = useMutation({
    mutationFn: () =>
      apiJson("/api/admin/banners", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          imageUrl: (addBannerImages[0] ?? "").trim(),
          linkUrl: linkUrl.trim() || undefined,
          placement: newPlacement || "hero",
          sortOrder,
          showTitle: newShowTitle === "true",
          showSubtitle: newShowSubtitle === "true",
          showButton: newShowButton === "true",
          showShadow: newShowShadow === "true",
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
      void qc.invalidateQueries({ queryKey: ["banners"] });
      void qc.invalidateQueries({ queryKey: ["banners", "top_promo"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setTitle("");
      setSubtitle("");
      setCtaLabel("");
      setAddBannerImages([]);
      setLinkUrl("");
      setSortOrder(0);
      setNewShowTitle("true");
      setNewShowSubtitle("true");
      setNewShowButton("true");
      setNewShowShadow("true");
      setAddOpen(false);
    },
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiJson(`/api/admin/banners/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
      void qc.invalidateQueries({ queryKey: ["banners"] });
      void qc.invalidateQueries({ queryKey: ["banners", "top_promo"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
      void qc.invalidateQueries({ queryKey: ["banners"] });
      void qc.invalidateQueries({ queryKey: ["banners", "top_promo"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const bulkDel = useMutation({
    mutationFn: (ids: string[]) =>
      apiJson("/api/admin/banners/bulk", { method: "POST", body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
      void qc.invalidateQueries({ queryKey: ["banners"] });
      void qc.invalidateQueries({ queryKey: ["banners", "top_promo"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
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

  const openEdit = (b: BannerRow) => {
    setEditRow(b);
    setEditForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      ctaLabel: b.ctaLabel ?? "",
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? "",
      placement: b.placement || "hero",
      sortOrder: b.sortOrder,
      showTitle: b.showTitle !== false,
      showSubtitle: b.showSubtitle !== false,
      showButton: b.showButton !== false,
      showShadow: b.showShadow !== false,
      active: b.active !== false,
    });
  };

  const rowActions = (b: BannerRow) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
      {can("banners", "view") ? (
        <IconButton size="small" aria-label="View" onClick={() => setViewRow(b)}>
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("banners", "edit") ? (
        <IconButton size="small" aria-label="Edit" onClick={() => openEdit(b)}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {can("banners", "delete") ? (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineRoundedIcon />}
          onClick={() => setDeleteRow(b)}
        >
          Delete
        </Button>
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
            <TableCell>Preview</TableCell>
            <TableCell>Title</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Placement</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Active</TableCell>
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
                  {q || placementFilter || activeFilter ? "No banners match filters." : "No banners yet."}
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((b) => (
            <TableRow key={b.id} hover selected={selected.has(b.id)}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
              </TableCell>
              <TableCell sx={{ width: 120 }}>
                <Box
                  component="img"
                  src={b.imageUrl}
                  alt=""
                  sx={{ width: 96, height: 54, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                />
              </TableCell>
              <TableCell>
                <Typography fontWeight={700}>{b.title}</Typography>
                {b.subtitle ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {b.subtitle}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, textTransform: "capitalize" }}>{b.placement}</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Chip size="small" label={b.active ? "On" : "Off"} color={b.active ? "success" : "default"} variant="outlined" />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={b.creator ?? null} dense />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={b.handler ?? null} dense />
              </TableCell>
              <TableCell align="right">{rowActions(b)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((b) => (
        <Grid item xs={12} sm={6} md={4} key={b.id}>
          <Card variant="outlined" sx={{ borderColor: selected.has(b.id) ? "primary.main" : "divider" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Checkbox checked={selected.has(b.id)} onChange={() => toggle(b.id)} size="small" />
                <Chip size="small" label={b.active ? "On" : "Off"} variant="outlined" />
              </Stack>
              <Box component="img" src={b.imageUrl} alt="" sx={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 1, mt: 1 }} />
              <Typography fontWeight={800} sx={{ mt: 1 }}>
                {b.title}
              </Typography>
              {rowActions(b)}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderList = () => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List disablePadding>
        {items.map((b) => (
          <ListItem
            key={b.id}
            secondaryAction={rowActions(b)}
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 18 }} onClick={() => toggle(b.id)}>
              <Checkbox edge="start" checked={selected.has(b.id)} tabIndex={-1} disableRipple />
              <ListItemText primary={b.title} secondary={`${b.placement} · ${b.active ? "active" : "inactive"}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Hero sliders, home split promo banners, top promotion strips (GIFs/images), and other placements. Use{" "}
          <strong>top_promo</strong> for a full-width bar above the header (e.g. animated promo GIF). Filter by
          placement and active state; bulk-delete selected rows.
        </Typography>
        {can("banners", "create") ? (
          <Button
            variant="contained"
            startIcon={<AddPhotoAlternateRoundedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ fontWeight: 800, flexShrink: 0 }}
          >
            Add banner
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
          can("banners", "delete") ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={!selected.size || bulkDel.isPending}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete selected
            </Button>
          ) : null
        }
        filters={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setQ(qInput.trim()), setPage(1))}
              sx={{ minWidth: 180 }}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Placement</InputLabel>
              <Select
                label="Placement"
                value={placementFilter}
                onChange={(e: SelectChangeEvent) => {
                  setPlacementFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="hero">hero</MenuItem>
                <MenuItem value="home_split">home_split</MenuItem>
                <MenuItem value="top_promo">top_promo</MenuItem>
              </Select>
            </FormControl>
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
            {q || placementFilter || activeFilter ? "No banners match filters." : "No banners yet."}
          </Typography>
        )
      ) : null}
      {!listQ.isLoading && viewMode === "list" ? (
        items.length ? (
          renderList()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || placementFilter || activeFilter ? "No banners match filters." : "No banners yet."}
          </Typography>
        )
      ) : null}

      <Dialog open={Boolean(editRow)} onClose={() => setEditRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit banner</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} fullWidth size="small" />
            <TextField label="Subtitle" value={editForm.subtitle} onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))} fullWidth size="small" />
            <TextField
              label="Button text"
              value={editForm.ctaLabel}
              onChange={(e) => setEditForm((f) => ({ ...f, ctaLabel: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Shop now"
            />
            <AdminProductImagesField
              sectionTitle="Banner image"
              value={editForm.imageUrl ? [editForm.imageUrl] : []}
              onChange={(urls) => setEditForm((f) => ({ ...f, imageUrl: urls.slice(0, 1)[0] ?? "" }))}
            />
            <TextField label="Link URL" value={editForm.linkUrl} onChange={(e) => setEditForm((f) => ({ ...f, linkUrl: e.target.value }))} fullWidth size="small" />
            <FormControl size="small" fullWidth>
              <InputLabel>Placement</InputLabel>
              <Select
                label="Placement"
                value={editForm.placement}
                onChange={(e: SelectChangeEvent) => setEditForm((f) => ({ ...f, placement: e.target.value }))}
              >
                <MenuItem value="hero">Home hero slider</MenuItem>
                <MenuItem value="home_split">Home split promo banners</MenuItem>
                <MenuItem value="top_promo">Top promotion strip (above header)</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show title</InputLabel>
                  <Select
                    label="Show title"
                    value={editForm.showTitle ? "true" : "false"}
                    onChange={(e: SelectChangeEvent<ToggleValue>) =>
                      setEditForm((f) => ({ ...f, showTitle: e.target.value === "true" }))
                    }
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show text</InputLabel>
                  <Select
                    label="Show text"
                    value={editForm.showSubtitle ? "true" : "false"}
                    onChange={(e: SelectChangeEvent<ToggleValue>) =>
                      setEditForm((f) => ({ ...f, showSubtitle: e.target.value === "true" }))
                    }
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show button</InputLabel>
                  <Select
                    label="Show button"
                    value={editForm.showButton ? "true" : "false"}
                    onChange={(e: SelectChangeEvent<ToggleValue>) =>
                      setEditForm((f) => ({ ...f, showButton: e.target.value === "true" }))
                    }
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show shadows</InputLabel>
                  <Select
                    label="Show shadows"
                    value={editForm.showShadow ? "true" : "false"}
                    onChange={(e: SelectChangeEvent<ToggleValue>) =>
                      setEditForm((f) => ({ ...f, showShadow: e.target.value === "true" }))
                    }
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="Sort order"
              type="number"
              value={editForm.sortOrder}
              onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
              size="small"
            />
            <FormControlLabel
              control={
                <Switch checked={editForm.active} onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))} />
              }
              label="Active on storefront"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={patch.isPending || !editRow}
            onClick={() => {
              if (!editRow) return;
              const link = editForm.linkUrl.trim();
              void patch.mutateAsync({
                id: editRow.id,
                body: {
                  title: editForm.title.trim(),
                  subtitle: editForm.subtitle.trim() || null,
                  ctaLabel: editForm.ctaLabel.trim() || null,
                  imageUrl: editForm.imageUrl.trim(),
                  linkUrl: link || null,
                  placement: editForm.placement.trim() || "hero",
                  sortOrder: editForm.sortOrder,
                  showTitle: editForm.showTitle,
                  showSubtitle: editForm.showSubtitle,
                  showButton: editForm.showButton,
                  showShadow: editForm.showShadow,
                  active: editForm.active,
                },
              });
              setEditRow(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add banner</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField
              size="small"
              label="Subtitle (optional)"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Button text (optional)"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              fullWidth
              placeholder="Shop now"
            />
            <AdminProductImagesField
              sectionTitle="Banner image"
              value={addBannerImages}
              onChange={(urls) => setAddBannerImages(urls.slice(0, 1))}
              autoCompressOnAdd
            />
            <Typography variant="caption" color="text.secondary" display="block">
              For top promotion, use a wide image or animated GIF. One image per banner; uploads use the same WebP pipeline as products.
            </Typography>
            <TextField
              size="small"
              label="Link URL (optional)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              placeholder="/shop or https://..."
            />
            <TextField
              size="small"
              type="number"
              label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              fullWidth
              helperText="Lower numbers appear first."
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Placement</InputLabel>
              <Select
                label="Placement"
                value={newPlacement}
                onChange={(e: SelectChangeEvent) => setNewPlacement(e.target.value)}
              >
                <MenuItem value="hero">Home hero slider</MenuItem>
                <MenuItem value="home_split">Home split promo banners</MenuItem>
                <MenuItem value="top_promo">Top promotion strip (above header)</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show title</InputLabel>
                  <Select
                    label="Show title"
                    value={newShowTitle}
                    onChange={(e: SelectChangeEvent<ToggleValue>) => setNewShowTitle(e.target.value as ToggleValue)}
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show text</InputLabel>
                  <Select
                    label="Show text"
                    value={newShowSubtitle}
                    onChange={(e: SelectChangeEvent<ToggleValue>) => setNewShowSubtitle(e.target.value as ToggleValue)}
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show button</InputLabel>
                  <Select
                    label="Show button"
                    value={newShowButton}
                    onChange={(e: SelectChangeEvent<ToggleValue>) => setNewShowButton(e.target.value as ToggleValue)}
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Show shadows</InputLabel>
                  <Select
                    label="Show shadows"
                    value={newShowShadow}
                    onChange={(e: SelectChangeEvent<ToggleValue>) => setNewShowShadow(e.target.value as ToggleValue)}
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || !(addBannerImages[0] ?? "").trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewRow)} onClose={() => setViewRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Banner</DialogTitle>
        <DialogContent>
          {viewRow ? (
            <Stack spacing={1.25} sx={{ mt: 0.5 }}>
              <Box
                component="img"
                src={viewRow.imageUrl}
                alt=""
                sx={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 1 }}
              />
              <Typography fontWeight={800}>{viewRow.title}</Typography>
              {viewRow.subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {viewRow.subtitle}
                </Typography>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Placement: {viewRow.placement} · Sort {viewRow.sortOrder} · {viewRow.active ? "Active" : "Off"}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewRow(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete banner"
        message={deleteRow ? `Delete “${deleteRow.title}”?` : ""}
        confirmLabel="Delete"
        destructive
        confirmDisabled={del.isPending}
        onCancel={() => setDeleteRow(null)}
        onConfirm={() => {
          if (!deleteRow) return;
          del.mutate(deleteRow.id, { onSuccess: () => setDeleteRow(null) });
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete banners"
        message={`Delete ${selected.size} banner(s)? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        confirmDisabled={bulkDel.isPending}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          bulkDel.mutate(Array.from(selected));
          setBulkDeleteOpen(false);
        }}
      />
    </Stack>
  );
}
