import {
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Grid,
  Paper,
  Stack,
  ThemeProvider,
  Typography,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { Route, Switch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { formatBdt } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { VendorApplyForm } from "@/components/vendor/VendorApplyForm";
import { VendorProductsTable } from "@/components/vendor/VendorProductsTable";
import { VendorOrdersTable } from "@/components/vendor/VendorOrdersTable";
import { VendorOrderDetailPage } from "@/pages/VendorOrderDetailPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { vendorTheme } from "@/theme/vendorTheme";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { PortalSiteMetaProvider } from "@/components/layout/PortalSiteMetaProvider";

type VendorMe = { vendor: { name: string; status: string } | null };

type VendorStats = {
  productCount: number;
  activeProductCount: number;
  orderCount: number;
  revenueLineItemsBdt: string;
};

function VendorOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: () => apiJson<VendorStats>("/api/vendor/stats"),
  });

  return (
    <Stack spacing={2}>
      <Typography paragraph color="text.secondary">
        Manage your catalogue and orders. Your shop must be approved to appear on the storefront.
      </Typography>
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading snapshot…
        </Typography>
      ) : stats ? (
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Inventory2OutlinedIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Products
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800}>
                {stats.productCount}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <CheckCircleOutlineIcon color="success" fontSize="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Active listings
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800}>
                {stats.activeProductCount}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <ReceiptLongOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Orders (with your SKUs)
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800}>
                {stats.orderCount}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <PaymentsOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Your line revenue
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ wordBreak: "break-word" }}>
                {formatBdt(stats.revenueLineItemsBdt)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Sum of your order lines (not platform total)
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button component={Link} href="/products" variant="contained" size="medium">
          Products
        </Button>
        <Button component={Link} href="/orders" variant="outlined" size="medium">
          Orders
        </Button>
      </Stack>
    </Stack>
  );
}

function GuestVendorGate() {
  const brand = useSiteBrand();
  return (
    <>
      <Seo
        title="Seller sign in"
        description={`Sign in to apply as a seller on ${brand} or manage your store.`}
        noindex
      />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 440,
            width: "100%",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Vendor portal
          </Typography>
          <Typography color="text.secondary" paragraph>
            Sign in to apply as a seller or manage your store.
          </Typography>
          <Button component={Link} href="~/login?next=/vendor" variant="contained" fullWidth sx={{ mb: 1 }}>
            Sign in
          </Button>
          <Button component={Link} href="~/register?next=/vendor" variant="outlined" fullWidth>
            Create account
          </Button>
        </Paper>
      </Box>
    </>
  );
}

function VendorLoading() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}

function VendorPortalBody() {
  const brand = useSiteBrand();
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-me"],
    queryFn: () => apiJson<VendorMe>("/api/vendor/me"),
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <ThemeProvider theme={vendorTheme}>
        <CssBaseline enableColorScheme />
        <VendorLoading />
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={vendorTheme}>
        <CssBaseline enableColorScheme />
        <GuestVendorGate />
      </ThemeProvider>
    );
  }

  if (isLoading) {
    return (
      <ThemeProvider theme={vendorTheme}>
        <CssBaseline enableColorScheme />
        <VendorLoading />
      </ThemeProvider>
    );
  }

  if (!data?.vendor) {
    return (
      <ThemeProvider theme={vendorTheme}>
        <CssBaseline enableColorScheme />
        <Seo title="Become a seller" description={`Apply to open your store on ${brand}.`} noindex />
        <VendorLayout mode="apply">
          <VendorApplyForm />
        </VendorLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={vendorTheme}>
      <CssBaseline enableColorScheme />
      <RequireRole roles={["vendor_staff"]} redirectIfUnauthenticated="~/login?next=/vendor">
        <VendorLayout mode="full" vendorName={data.vendor.name} vendorStatus={data.vendor.status}>
          <Seo title="Seller dashboard" description={`Manage your ${brand} seller account.`} noindex />
          <Switch>
            <Route path="/products" component={VendorProductsTable} />
            <Route path="/orders/:orderId" component={VendorOrderDetailPage} />
            <Route path="/orders" component={VendorOrdersTable} />
            <Route path="/" component={VendorOverview} />
            <Route component={VendorOverview} />
          </Switch>
        </VendorLayout>
      </RequireRole>
    </ThemeProvider>
  );
}

export function VendorPortalPage() {
  return (
    <PortalSiteMetaProvider>
      <VendorPortalBody />
    </PortalSiteMetaProvider>
  );
}
