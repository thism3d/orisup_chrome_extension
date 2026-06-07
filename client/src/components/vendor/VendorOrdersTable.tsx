import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiJson } from "@/lib/api";
import { formatBdt } from "@/lib/format";
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  VENDOR_SETTABLE_ORDER_STATUSES,
  isOrderStatus,
} from "@shared/orderStatus";

type Order = { id: string; orderNumber: string; status: string; total: string; createdAt: string };

const statuses = VENDOR_SETTABLE_ORDER_STATUSES;

function statusColor(status: string): "default" | "primary" | "success" | "warning" | "error" | "info" {
  return isOrderStatus(status) ? ORDER_STATUS_COLOR[status] : "default";
}

function statusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status;
}

export function VendorOrdersTable() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["vendor-orders"],
    queryFn: () => apiJson<Order[]>("/api/vendor/orders"),
  });

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiJson(`/api/vendor/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      void qc.invalidateQueries({ queryKey: ["vendor-stats"] });
    },
  });

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Orders that include at least one of your products. Update status as you confirm, ship, or complete delivery.
        Totals are in BDT. If an order mixes multiple sellers, status changes apply to the whole order — open an order for
        your line items and shipping details.
      </Typography>
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
              <TableCell>Order</TableCell>
              <TableCell>Placed</TableCell>
              <TableCell>Total</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
                    No orders with your products yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {data.map((o) => {
              const placed = new Date(o.createdAt);
              return (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <Typography
                      component={Link}
                      href={`/orders/${o.id}`}
                      fontWeight={800}
                      sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                      {o.orderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                    {placed.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={700}>{formatBdt(o.total)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id={`vo-${o.id}`}>Status</InputLabel>
                      <Select
                        labelId={`vo-${o.id}`}
                        label="Status"
                        value={o.status}
                        onChange={(e: SelectChangeEvent) => patch.mutate({ id: o.id, status: e.target.value })}
                        disabled={patch.isPending}
                        renderValue={(v) => (
                          <Chip size="small" label={statusLabel(v)} color={statusColor(v)} variant="outlined" />
                        )}
                      >
                        {/* Past-warehouse statuses are owned by ops/the courier partner. */}
                        {/* If the current order has already moved past, show its current status as a disabled option. */}
                        {!statuses.includes(o.status as (typeof statuses)[number]) && isOrderStatus(o.status) ? (
                          <MenuItem value={o.status} disabled>
                            {ORDER_STATUS_LABEL[o.status]} (locked)
                          </MenuItem>
                        ) : null}
                        {statuses.map((s) => (
                          <MenuItem key={s} value={s}>
                            {ORDER_STATUS_LABEL[s]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
