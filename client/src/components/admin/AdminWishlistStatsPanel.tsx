import {
  Box,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Pagination,
  Link as MuiLink,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiJson } from "@/lib/api";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";

type Row = {
  wishCount: number;
  product: { id: string; title: string; slug: string; status: string };
  vendorName: string;
  vendorSlug: string;
};

export function AdminWishlistStatsPanel() {
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const listUrl = useMemo(() => adminListQuery("/api/admin/wishlist-stats", { page, perPage }), [page, perPage]);

  const listQ = useQuery({
    queryKey: ["admin-wishlist-stats", listUrl],
    queryFn: () => apiJson<AdminListResponse<Row>>(listUrl),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Products most often saved to customer wishlists.
      </Typography>

      <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Wishlists</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!listQ.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No wishlist data yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((row) => (
              <TableRow key={row.product.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>{row.wishCount}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <MuiLink href={`/p/${row.vendorSlug}/${row.product.slug}`} target="_blank" rel="noopener noreferrer" underline="hover" fontWeight={700}>
                    {row.product.title}
                  </MuiLink>
                </TableCell>
                <TableCell>{row.vendorName}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{row.product.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
      </Stack>
    </Box>
  );
}
