import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { RequireRole } from "@/components/auth/RequireRole";
import { formatBdt } from "@/lib/format";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, isOrderStatus } from "@shared/orderStatus";
import {
  storefrontAccountContainerMaxWidth,
  storefrontDataPaperSx,
  storefrontListingToolbarPaperSx,
  storefrontPanelChromeSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
  storefrontSectionHeadingTitleSx,
  storefrontTableContainerSx,
  storefrontTableHeadRowSx,
} from "@/lib/storefrontUiSurface";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  subtotal: string;
  total: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Record<string, unknown>;
  createdAt: string;
};

type OrderItemRow = {
  id: string;
  titleSnapshot: string;
  price: string;
  quantity: number;
  lineTotal: string;
};

type HistoryRow = { id: string; status: string; note: string | null; createdAt: string };

type Detail = { order: OrderRow; items: OrderItemRow[]; history: HistoryRow[] };

function statusColor(status: string): "default" | "primary" | "success" | "warning" | "error" | "info" {
  return isOrderStatus(status) ? ORDER_STATUS_COLOR[status] : "default";
}

function statusLabel(status: string): string {
  if (status === "payment_pending") return "Awaiting payment";
  return isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status;
}

function paymentMethodLabel(method: string, text: (en: string, bn: string) => string): string {
  const key = method.trim().toLowerCase();
  if (key === "cod") return text("Cash on delivery", "ক্যাশ অন ডেলিভারি");
  if (key === "bkash") return "bKash";
  if (key === "bkash_auto") return text("bKash (Auto)", "বিকাশ (অটো)");
  if (key === "nagad") return "Nagad";
  if (key === "rocket") return "Rocket";
  if (key === "upay") return "Upay";
  if (key === "stripe") return text("Card (Stripe)", "কার্ড (Stripe)");
  return method || text("Online payment", "অনলাইন পেমেন্ট");
}

const TRACK_STEPS = ["Placed", "Processing", "Shipped", "Delivered"] as const;

function stepIndexForStatus(status: string): number {
  if (status === "cancelled" || status === "returned") return -1;
  if (status === "delivered") return 3;
  if (status === "assigned_to_courier" || status === "in_transit" || status === "out_for_delivery") return 2;
  if (status === "confirmed" || status === "at_warehouse") return 1;
  return 0;
}

export function OrderDetailPage() {
  return (
    <RequireRole roles={["customer", "vendor_staff", "platform_admin"]}>
      <OrderDetailInner />
    </RequireRole>
  );
}

function OrderDetailInner() {
  const brand = useSiteBrand();
  const { text, lang } = useStorefrontLanguage();
  const theme = useTheme();
  const { uiTemplate, minimalChrome } = useStorefrontUiTemplate();
  const [, params] = useRoute("/account/orders/:orderNumber");
  const orderNumber = params?.orderNumber ? decodeURIComponent(params.orderNumber) : "";
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-detail", orderNumber],
    queryFn: () => apiJson<Detail>(`/api/orders/me/${encodeURIComponent(orderNumber)}`),
    enabled: Boolean(orderNumber),
  });
  const cancelMut = useMutation({
    mutationFn: () =>
      apiJson(`/api/orders/me/${encodeURIComponent(orderNumber)}/cancel`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      void refetch();
    },
  });

  if (!orderNumber) {
    return (
      <>
        <Seo title={text("Order", "অর্ডার")} description={text("Invalid order link.", "অবৈধ অর্ডার লিংক।")} noindex />
        <Container sx={{ py: 4 }}>
          <Typography>{text("Invalid order.", "অবৈধ অর্ডার।")}</Typography>
        </Container>
      </>
    );
  }

  const detailPath = `/account/orders/${encodeURIComponent(orderNumber)}`;

  if (isLoading) {
    return (
      <>
        <Seo title={text("Order", "অর্ডার")} description={text(`Loading your ${brand} order.`, `${brand}-এ আপনার অর্ডার লোড হচ্ছে।`)} noindex canonicalPath={detailPath} />
        <Container maxWidth={storefrontAccountContainerMaxWidth(uiTemplate)} sx={{ py: 3 }}>
          <Typography color="text.secondary">{text("Loading order…", "অর্ডার লোড হচ্ছে…")}</Typography>
        </Container>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Seo title={text("Order", "অর্ডার")} description={text(`Could not load this order on ${brand}.`, `${brand}-এ এই অর্ডার লোড করা যায়নি।`)} noindex canonicalPath={detailPath} />
        <Container maxWidth={storefrontAccountContainerMaxWidth(uiTemplate)} sx={{ py: 3 }}>
          <Typography color="error" gutterBottom>
            {error instanceof Error ? error.message : text("Could not load order", "অর্ডার লোড করা যায়নি")}
          </Typography>
          <Button onClick={() => void refetch()}>{text("Retry", "আবার চেষ্টা করুন")}</Button>
          <Button component={Link} href="/account/orders" sx={{ ml: 1 }}>
            {text("All orders", "সব অর্ডার")}
          </Button>
        </Container>
      </>
    );
  }

  const { order, items, history } = data;
  const addr = order.shippingAddress as Record<string, string>;
  const activeStep = stepIndexForStatus(order.status);
  const cancelled = order.status === "cancelled" || order.status === "returned";

  return (
    <>
      <Seo
        title={text(`Order ${order.orderNumber}`, `অর্ডার ${order.orderNumber}`)}
        description={text(`Track order ${order.orderNumber} on ${brand}.`, `${brand}-এ অর্ডার ${order.orderNumber} ট্র্যাক করুন।`)}
        noindex
        canonicalPath={detailPath}
      />
    <FadeInSection>
      <Container
        maxWidth={storefrontAccountContainerMaxWidth(uiTemplate)}
        sx={{ py: { xs: 3, md: uiTemplate === "orynbd" ? 4 : 3 } }}
      >
        <Paper elevation={0} sx={storefrontListingToolbarPaperSx(uiTemplate)}>
          <Breadcrumbs aria-label="breadcrumb">
            <MuiLink component={Link} href="/" underline="hover" color="inherit" fontWeight={600}>
              {text("Home", "হোম")}
            </MuiLink>
            <MuiLink component={Link} href="/account/orders" underline="hover" color="inherit" fontWeight={600}>
              {text("My orders", "আমার অর্ডার")}
            </MuiLink>
            <Typography color="text.primary" fontWeight={700}>
              {order.orderNumber}
            </Typography>
          </Breadcrumbs>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2 }}>
          <Typography variant={storefrontRetailTitleVariant(uiTemplate)} component="h1" sx={storefrontRetailTitleSx(uiTemplate)}>
            {text("Order", "অর্ডার")} {order.orderNumber}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {(order.status === "pending" || order.status === "payment_pending") ? (
              <Button size="small" color="error" variant="outlined" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()}>
                {text("Cancel order", "অর্ডার বাতিল")}
              </Button>
            ) : null}
            <Chip label={statusLabel(order.status)} color={statusColor(order.status)} variant="outlined" sx={{ fontWeight: 700 }} />
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            ...storefrontDataPaperSx(uiTemplate),
            p: 2.5,
            mb: 2,
            ...(minimalChrome ? { boxShadow: "none" } : {}),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LocalShippingOutlinedIcon color="primary" />
            <Typography variant="subtitle1" sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
              {text("Tracking", "ট্র্যাকিং")}
            </Typography>
          </Stack>
          {cancelled ? (
            <Typography color="error" fontWeight={600}>
              {text("This order was cancelled.", "এই অর্ডারটি বাতিল করা হয়েছে।")}
            </Typography>
          ) : (
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
              {TRACK_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        "&.Mui-active": { color: theme.palette.primary.main },
                        "&.Mui-completed": { color: theme.palette.success.main },
                      },
                    }}
                  >
                    {label === "Placed"
                      ? text("Placed", "অর্ডার হয়েছে")
                      : label === "Processing"
                        ? text("Processing", "প্রসেসিং")
                        : label === "Shipped"
                          ? text("Shipped", "শিপ করা হয়েছে")
                          : text("Delivered", "ডেলিভার হয়েছে")}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
          <Typography variant="caption" color="text.secondary">
            {text(
              "Status updates when the vendor, platform, or delivery partner changes your order. The timeline below lists each step.",
              "ভেন্ডর, প্লাটফর্ম বা ডেলিভারি পার্টনার অর্ডার বদলালে স্ট্যাটাস আপডেট হবে। নিচের টাইমলাইনে প্রতিটি ধাপ দেখানো আছে।",
            )}
          </Typography>
        </Paper>

        <Card elevation={0} sx={{ ...storefrontPanelChromeSx(uiTemplate), mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
              {text("Status history", "স্ট্যাটাস ইতিহাস")}
            </Typography>
            <Stack spacing={1.5} divider={<Divider flexItem />}>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {text("No history yet.", "এখনও কোনো ইতিহাস নেই।")}
                </Typography>
              ) : (
                history.map((h) => (
                  <Stack key={h.id} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                    <Box>
                      <Chip size="small" label={statusLabel(h.status)} color={statusColor(h.status)} sx={{ mr: 1, fontWeight: 600 }} />
                      {h.note && (
                        <Typography variant="body2" component="span" color="text.secondary">
                          {h.note}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {new Date(h.createdAt).toLocaleString(lang === "bn" ? "bn-BD" : "en-BD", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>

        <Paper
          elevation={0}
          sx={{
            ...storefrontDataPaperSx(uiTemplate),
            mb: 2,
            ...(minimalChrome ? { boxShadow: "none" } : {}),
          }}
        >
          <Typography variant="subtitle2" gutterBottom sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
            {text("Shipping", "শিপিং")}
          </Typography>
          <Typography variant="body2">
            {order.customerName} · {order.customerPhone}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {[addr.line1, addr.line2, addr.city, addr.district, addr.postalCode].filter(Boolean).join(", ")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {text("Payment:", "পেমেন্ট:")} <strong>{paymentMethodLabel(order.paymentMethod, text)}</strong>
          </Typography>
        </Paper>

        <Typography variant="subtitle1" sx={{ ...storefrontSectionHeadingTitleSx(uiTemplate), mb: 1 }}>
          {text("Items", "আইটেম")}
        </Typography>
        <TableContainer component={Paper} elevation={0} sx={{ ...storefrontTableContainerSx(uiTemplate), mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={storefrontTableHeadRowSx(uiTemplate)}>
              <TableCell sx={{ fontWeight: 800 }}>{text("Product", "পণ্য")}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                {text("Qty", "পরিমাণ")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                {text("Line total", "লাইন টোটাল")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>{it.titleSnapshot}</TableCell>
                <TableCell align="right">{it.quantity}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatBdt(it.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TableContainer>

        <Stack direction="row" justifyContent="flex-end" spacing={3} sx={{ mb: 3 }}>
          <Typography color="text.secondary">{text("Subtotal", "সাবটোটাল")}</Typography>
          <Typography fontWeight={700}>{formatBdt(order.subtotal)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={3}>
          <Typography fontWeight={800}>{text("Total", "মোট")}</Typography>
          <Typography fontWeight={800} color="primary">
            {formatBdt(order.total)}
          </Typography>
        </Stack>

        <Button component={Link} href="/account/orders" variant="outlined" sx={{ mt: 2, fontWeight: 700 }}>
          {text("\u2190 All orders", "\u2190 সব অর্ডার")}
        </Button>
      </Container>
    </FadeInSection>
    </>
  );
}
