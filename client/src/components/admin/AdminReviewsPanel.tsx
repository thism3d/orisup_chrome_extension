import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
  Link as MuiLink,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useSearch } from "wouter/use-browser-location";
import { apiJson } from "@/lib/api";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";

type ReviewRow = {
  review: {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    title: string | null;
    body: string;
    locale: string;
    status: string;
    adminReply: string | null;
    createdAt: string;
    updatedAt: string;
  };
  productTitle: string;
  productSlug: string;
  vendorSlug: string;
  vendorName: string;
  userEmail: string | null;
  userFullName: string;
  /** Review author (customer). */
  creator?: StaffRef;
  /** Last moderator who changed status or reply. */
  handler?: StaffRef;
};

export function AdminReviewsPanel() {
  const qc = useQueryClient();
  const search = useSearch();
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [status, setStatus] = useState<"" | "pending" | "approved" | "rejected">("pending");
  const [replyOpen, setReplyOpen] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const raw = search.startsWith("?") ? search.slice(1) : search || "";
    const p = new URLSearchParams(raw);
    if (!p.has("status")) return;
    const st = p.get("status")?.trim();
    if (st === "pending" || st === "approved" || st === "rejected") setStatus(st);
    setPage(1);
  }, [search]);

  const listUrl = useMemo(
    () => adminListQuery("/api/admin/reviews", { page, perPage, status: status || undefined }),
    [page, perPage, status]
  );

  const listQ = useQuery({
    queryKey: ["admin-reviews", listUrl],
    queryFn: () => apiJson<AdminListResponse<ReviewRow>>(listUrl),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiJson<{ ok: boolean }>(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const openReply = (row: ReviewRow) => {
    setReplyText(row.review.adminReply ?? "");
    setReplyOpen(row);
  };

  const saveReply = () => {
    if (!replyOpen) return;
    patch.mutate(
      { id: replyOpen.review.id, body: { adminReply: replyText.trim() || null } },
      { onSuccess: () => setReplyOpen(null) }
    );
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Approve or reject customer reviews before they appear on product pages. Optional public reply from Orlenbd.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {data?.total ?? 0} review{(data?.total ?? 0) === 1 ? "" : "s"}
        </Typography>
      </Stack>

      <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Excerpt</TableCell>
              <TableCell>Lang</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!listQ.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No reviews in this filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((row) => (
              <TableRow key={row.review.id} hover>
                <TableCell sx={{ maxWidth: 200 }}>
                  <MuiLink href={`/p/${row.vendorSlug}/${row.productSlug}`} target="_blank" rel="noopener noreferrer" underline="hover" fontWeight={700}>
                    {row.productTitle}
                  </MuiLink>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {row.vendorName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.userFullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.userEmail ?? "—"}
                  </Typography>
                </TableCell>
                <TableCell>{row.review.rating}★</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap title={row.review.body}>
                    {row.review.title ? `${row.review.title} — ` : ""}
                    {row.review.body}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={row.review.locale === "bn" ? "BN" : "EN"} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{row.review.status}</TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={row.creator ?? null} dense />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={row.handler ?? null} dense />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                    {row.review.status !== "approved" ? (
                      <Button size="small" color="success" variant="outlined" disabled={patch.isPending} onClick={() => patch.mutate({ id: row.review.id, body: { status: "approved" } })}>
                        Approve
                      </Button>
                    ) : null}
                    {row.review.status !== "rejected" ? (
                      <Button size="small" color="error" variant="outlined" disabled={patch.isPending} onClick={() => patch.mutate({ id: row.review.id, body: { status: "rejected" } })}>
                        Reject
                      </Button>
                    ) : null}
                    {row.review.status === "rejected" ? (
                      <Button size="small" variant="outlined" disabled={patch.isPending} onClick={() => patch.mutate({ id: row.review.id, body: { status: "pending" } })}>
                        Reset
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => openReply(row)}>
                      Reply
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
      </Stack>

      <Dialog open={Boolean(replyOpen)} onClose={() => setReplyOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>Public reply</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Admin reply (visible on storefront)"
            fullWidth
            multiline
            minRows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyOpen(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveReply} disabled={patch.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
