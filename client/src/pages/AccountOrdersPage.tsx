import {
  Chip,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Link } from "wouter";
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
  storefrontCatalogEmptyHintPaperSx,
  storefrontPanelChromeSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
  storefrontTableContainerSx,
  storefrontTableHeadRowSx,
} from "@/lib/storefrontUiSurface";

type Order = { id: string; orderNumber: string; status: string; total: string; createdAt: string };

function statusColor(status: string): "default" | "primary" | "success" | "warning" | "error" | "info" {
  return isOrderStatus(status) ? ORDER_STATUS_COLOR[status] : "default";
}

function statusLabel(status: string): string {
  if (status === "payment_pending") return "Awaiting payment";
  return isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status;
}

export function AccountOrdersPage() {
  return (
    <RequireRole roles={["customer", "vendor_staff", "platform_admin"]}>
      <AccountOrdersInner />
    </RequireRole>
  );
}

function AccountOrdersInner() {
  const brand = useSiteBrand();
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text, lang } = useStorefrontLanguage();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => apiJson<Order[]>("/api/orders/me"),
  });
  const cancelMut = useMutation({
    mutationFn: (orderNumber: string) =>
      apiJson(`/api/orders/me/${encodeURIComponent(orderNumber)}/cancel`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  return (
    <>
      <Seo title={text("My orders", "আমার অর্ডার")} description={text(`Track your ${brand} orders and delivery status.`, `${brand}-এ আপনার অর্ডার ও ডেলিভারি স্ট্যাটাস ট্র্যাক করুন।`)} noindex canonicalPath="/account/orders" />
    <FadeInSection>
      <Container
        maxWidth={storefrontAccountContainerMaxWidth(uiTemplate)}
        sx={{ py: { xs: 3, md: uiTemplate === "orynbd" ? 4 : 3 } }}
      >
        <Typography
          variant={storefrontRetailTitleVariant(uiTemplate)}
          component="h1"
          gutterBottom
          sx={storefrontRetailTitleSx(uiTemplate)}
        >
          {text("My orders", "আমার অর্ডার")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {text("Track order numbers and status. COD orders are confirmed by the vendor.", "অর্ডার নম্বর ও স্ট্যাটাস ট্র্যাক করুন। COD অর্ডার ভেন্ডর কনফার্ম করে।")}
        </Typography>
        {isLoading ? (
          <Paper elevation={0} sx={{ ...storefrontPanelChromeSx(uiTemplate), overflow: "hidden" }}>
            <Skeleton variant="rectangular" height={48} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ mt: 0.5 }} />
            ))}
          </Paper>
        ) : data.length === 0 ? (
          <Paper elevation={0} sx={storefrontCatalogEmptyHintPaperSx(uiTemplate, { isError: false })}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 52, color: "text.secondary", mb: 1, opacity: 0.75 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {text("No orders yet", "এখনও কোনো অর্ডার নেই")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {text("When you checkout, your orders will appear here.", "আপনি চেকআউট করলে অর্ডারগুলো এখানে দেখাবে।")}
            </Typography>
            <Button component={Link} href="/shop" variant="contained" sx={{ fontWeight: 800 }}>
              {text("Start shopping", "কেনাকাটা শুরু করুন")}
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={storefrontTableContainerSx(uiTemplate)}>
            <Table size="small">
              <TableHead>
                <TableRow sx={storefrontTableHeadRowSx(uiTemplate)}>
                  <TableCell sx={{ fontWeight: 800 }}>{text("Order", "অর্ডার")}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{text("Status", "স্ট্যাটাস")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {text("Total", "মোট")}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    sx={{ "&:last-child td": { border: 0 }, transition: "background 0.15s ease" }}
                  >
                    <TableCell>
                      <Typography
                        component={Link}
                        href={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
                        fontWeight={700}
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          display: "block",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {o.orderNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(o.createdAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabel(o.status)} size="small" color={statusColor(o.status)} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={800} color="primary">
                        {formatBdt(o.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {o.status === "pending" || o.status === "payment_pending" ? (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={cancelMut.isPending}
                          onClick={() => cancelMut.mutate(o.orderNumber)}
                        >
                          {text("Cancel", "বাতিল")}
                        </Button>
                      ) : null}
                      <Tooltip title={text("Track order", "অর্ডার ট্র্যাক করুন")}>
                        <IconButton
                          component={Link}
                          href={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
                          size="small"
                          color="primary"
                          aria-label={text("View order", "অর্ডার দেখুন")}
                        >
                          <ChevronRightIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </FadeInSection>
    </>
  );
}
