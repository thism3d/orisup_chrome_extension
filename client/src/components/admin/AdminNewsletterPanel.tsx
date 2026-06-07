import {
  Box,
  Button,
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
  Typography,
  Pagination,
  InputAdornment,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";

type Row = { id: string; email: string; source: string; createdAt: string };

export function AdminNewsletterPanel() {
  const showToast = useToast();
  const qc = useQueryClient();
  const { can } = useAdminPermission();
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addSource, setAddSource] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);

  const listUrl = useMemo(
    () => adminListQuery("/api/admin/newsletter-subscribers", { page, perPage, q: q || undefined }),
    [page, perPage, q],
  );

  const listQ = useQuery({
    queryKey: ["admin-newsletter", listUrl],
    queryFn: () => apiJson<AdminListResponse<Row>>(listUrl),
  });

  const addMut = useMutation({
    mutationFn: (body: { email: string; source?: string }) =>
      apiJson("/api/admin/newsletter-subscribers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-newsletter"] });
      showToast("Subscriber added.", "success");
      setAddOpen(false);
      setAddEmail("");
      setAddSource("");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Add failed.", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/newsletter-subscribers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-newsletter"] });
      showToast("Subscriber removed.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed.", "error"),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Emails collected from the storefront newsletter form. Subscribers are de-duplicated by email.
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        flexWrap="wrap"
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search email"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setQ(qInput.trim());
                setPage(1);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { sm: 280 } }}
          />
          <Button
            variant="contained"
            size="small"
            sx={{ fontWeight: 800 }}
            onClick={() => {
              setQ(qInput.trim());
              setPage(1);
            }}
          >
            Search
          </Button>
          <Typography variant="body2" color="text.secondary">
            {total} subscriber{total === 1 ? "" : "s"}
          </Typography>
        </Stack>
        {can("newsletter", "create") ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            sx={{ fontWeight: 800 }}
            onClick={() => {
              setAddEmail("");
              setAddSource("");
              setAddOpen(true);
            }}
          >
            Add subscriber
          </Button>
        ) : null}
      </Stack>

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Subscribed</TableCell>
              {can("newsletter", "delete") ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={can("newsletter", "delete") ? 4 : 3}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!listQ.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={can("newsletter", "delete") ? 4 : 3}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No subscribers yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Typography fontWeight={700}>{r.email}</Typography>
                </TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                  {new Date(r.createdAt).toLocaleString("en-GB")}
                </TableCell>
                {can("newsletter", "delete") ? (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Remove ${r.email}`}
                      onClick={() => setDeleteConfirm({ id: r.id, email: r.email })}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 ? (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination page={page} count={totalPages} onChange={(_, p) => setPage(p)} color="primary" />
        </Stack>
      ) : null}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add subscriber</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              autoFocus
              label="Email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Source (optional)"
              value={addSource}
              onChange={(e) => setAddSource(e.target.value)}
              fullWidth
              size="small"
              placeholder="admin"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={addMut.isPending || !addEmail.trim()}
            onClick={() => {
              const source = addSource.trim();
              void addMut.mutateAsync({ email: addEmail.trim(), ...(source ? { source } : {}) });
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Remove subscriber"
        message={
          deleteConfirm ? `Remove “${deleteConfirm.email}” from the newsletter list?` : ""
        }
        confirmLabel="Remove"
        destructive
        confirmDisabled={delMut.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          await delMut.mutateAsync(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </Box>
  );
}
