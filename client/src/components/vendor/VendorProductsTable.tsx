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
  Typography,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiJson } from "@/lib/api";
import { formatBdt } from "@/lib/format";
import { AddProductInlineForm } from "./AddProductInlineForm";
import { VendorProductEditDialog, type VendorProductRow } from "./VendorProductEditDialog";

type VendorMe = { vendor: { name: string; status: string; slug: string } | null };

function productStatusChip(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return <Chip size="small" label="Active" color="success" variant="outlined" />;
  if (s === "draft") return <Chip size="small" label="Draft" color="warning" variant="outlined" />;
  return <Chip size="small" label={status} variant="outlined" />;
}

export function VendorProductsTable() {
  const qc = useQueryClient();
  const [editProduct, setEditProduct] = useState<VendorProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorProductRow | null>(null);

  const { data: me } = useQuery({
    queryKey: ["vendor-me"],
    queryFn: () => apiJson<VendorMe>("/api/vendor/me"),
  });
  const vendorSlug = me?.vendor?.slug;

  const { data = [], refetch, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: () => apiJson<VendorProductRow[]>("/api/vendor/products"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/vendor/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vendor-products"] });
      void qc.invalidateQueries({ queryKey: ["vendor-stats"] });
      setDeleteTarget(null);
    },
  });

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Your catalogue. Set products to active when they are ready for the public storefront. Prices are shown in BDT.
      </Typography>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <AddProductInlineForm
          onCreated={() => {
            void refetch();
            void qc.invalidateQueries({ queryKey: ["vendor-stats"] });
          }}
        />
      </Stack>
      <TableContainer
        component={Paper}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "auto",
        }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
                    No products yet. Add your first listing above.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {data.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Typography fontWeight={700}>{p.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {p.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={700}>{formatBdt(p.price)}</Typography>
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{p.stock}</TableCell>
                <TableCell>{productStatusChip(p.status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                    <IconButton size="small" aria-label="Edit" onClick={() => setEditProduct(p)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="Delete" color="error" onClick={() => setDeleteTarget(p)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                    {vendorSlug && p.status === "active" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        endIcon={<OpenInNewRoundedIcon />}
                        component={Link}
                        href={`~/p/${vendorSlug}/${p.slug}`}
                        sx={{ borderColor: "divider", fontWeight: 600 }}
                      >
                        View
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                        {p.status === "draft" ? "Activate to link" : "—"}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <VendorProductEditDialog
        open={Boolean(editProduct)}
        onClose={() => setEditProduct(null)}
        product={editProduct}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This cannot be undone. <strong>{deleteTarget?.title}</strong> will be removed from your catalogue.
          </Typography>
          {delMut.isError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {delMut.error instanceof Error ? delMut.error.message : "Delete failed"}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={delMut.isPending}
            onClick={() => deleteTarget && delMut.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
