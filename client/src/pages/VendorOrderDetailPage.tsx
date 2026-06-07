import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { formatBdt } from "@/lib/format";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, isOrderStatus } from "@shared/orderStatus";

type OrderItem = {
  id: string;
  productId: string;
  titleSnapshot: string;
  price: string;
  quantity: number;
  lineTotal: string;
};

type HistoryRow = { id: string; status: string; note: string | null; createdAt: string };

type Detail = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    subtotal: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: Record<string, unknown>;
    createdAt: string;
    paymentMethod: string;
  };
  items: OrderItem[];
  history: HistoryRow[];
  lineSubtotal: string;
};

function statusColor(status: string): "default" | "primary" | "success" | "warning" | "error" | "info" {
  return isOrderStatus(status) ? ORDER_STATUS_COLOR[status] : "default";
}

function statusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status;
}

export function VendorOrderDetailPage() {
  const [, params] = useRoute("/orders/:orderId");
  const orderId = params?.orderId ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor-order", orderId],
    queryFn: () => apiJson<Detail>(`/api/vendor/orders/${orderId}`),
    enabled: Boolean(orderId),
  });

  if (!orderId) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Invalid order.
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Loading order…
      </Typography>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color="error" gutterBottom>
          {error instanceof Error ? error.message : "Order not found"}
        </Typography>
        <Button component={Link} href="/orders" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
          Back to orders
        </Button>
      </Box>
    );
  }

  const { order, items, history, lineSubtotal } = data;
  const addr = order.shippingAddress as {
    line1?: string;
    line2?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };

  return (
    <Stack spacing={2}>
      <Button
        component={Link}
        href="/orders"
        startIcon={<ArrowBackRoundedIcon />}
        variant="text"
        sx={{ alignSelf: "flex-start", fontWeight: 700 }}
      >
        All orders
      </Button>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Order
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {order.orderNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Placed {new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
          </Box>
          <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.5}>
            <Chip label={statusLabel(order.status)} color={statusColor(order.status)} size="small" sx={{ fontWeight: 800 }} />
            <Typography variant="caption" color="text.secondary">
              Platform order total {formatBdt(order.total)} — your lines {formatBdt(lineSubtotal)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <AlertMultiVendorNote />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Customer
            </Typography>
            <Typography variant="body2">{order.customerName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customerPhone}
            </Typography>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2 }} gutterBottom>
              Ship to
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {addr.line1}
              {addr.line2 ? (
                <>
                  <br />
                  {addr.line2}
                </>
              ) : null}
              <br />
              {addr.city}, {addr.district}
              {addr.postalCode ? ` ${addr.postalCode}` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Payment: {order.paymentMethod}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Status history
            </Typography>
            <Stack spacing={1} divider={<Divider flexItem />}>
              {history.map((h) => (
                <Box key={h.id}>
                  <Typography variant="body2" fontWeight={700}>
                    {statusLabel(h.status)}
                  </Typography>
                  {h.note ? (
                    <Typography variant="caption" color="text.secondary">
                      {h.note}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(h.createdAt).toLocaleString("en-GB")}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Typography variant="subtitle1" fontWeight={800}>
        Your items in this order
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Line total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <Typography fontWeight={600}>{i.titleSnapshot}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {i.productId}
                  </Typography>
                </TableCell>
                <TableCell align="right">{i.quantity}</TableCell>
                <TableCell align="right">{formatBdt(i.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function AlertMultiVendorNote() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "warning.light",
        bgcolor: "rgba(255, 244, 229, 0.9)",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        <strong>Multi-vendor orders:</strong> This order may include products from other sellers. Status changes you make
        apply to the <strong>whole order</strong> — coordinate with the customer and other sellers when needed.
      </Typography>
    </Paper>
  );
}
