import {
  Box,
  Button,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { Link } from "wouter";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { apiJson } from "@/lib/api";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { formatBdt } from "@/lib/format";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { DashboardRangePreset } from "@/lib/adminDashboardAnalytics";

type Stats = {
  vendors: number;
  vendorsPending: number;
  vendorsApproved: number;
  categories: number;
  banners: number;
  orders: number;
  ordersPending: number;
  products: number;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  customerName: string;
};

type AnalyticsResp = {
  preset: DashboardRangePreset;
  periodStart: string;
  periodEndExclusive: string;
  navigation: {
    orders: { createdFrom: string; createdToExclusive: string };
  };
  summary: {
    ordersPlaced: number;
    revenueBdtExCancelled: string;
    averageOrderValue: string;
  };
  series: Array<{ label: string; orders: number; revenueBdt: string }>;
  ordersByStatus: Array<{ status: string; n: number }>;
  topProductsByRevenue: Array<{
    productId: string;
    title: string;
    slug: string;
    vendorSlug: string;
    vendorName: string;
    revenue: string;
    units: number;
  }>;
  topVendorsByRevenue: Array<{
    vendorId: string;
    name: string;
    slug: string;
    revenue: string;
    orderCount: number;
  }>;
  topReviewedProducts: Array<{
    productId: string;
    title: string;
    slug: string;
    vendorSlug: string;
    vendorName: string;
    reviewCount: number;
    avgRating: string;
  }>;
};

const RANGE_OPTIONS: Array<{ id: DashboardRangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
];

export function AdminDashboardHome() {
  const qc = useQueryClient();
  const [range, setRange] = useState<DashboardRangePreset>("this_month");

  const statsQ = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiJson<Stats>("/api/admin/stats"),
  });

  const analyticsQ = useQuery({
    queryKey: ["admin-dashboard-analytics", range],
    queryFn: () =>
      apiJson<AnalyticsResp>(`/api/admin/dashboard/analytics?range=${encodeURIComponent(range)}`),
  });

  const ordersQ = useQuery({
    queryKey: ["admin-orders-recent"],
    queryFn: () =>
      apiJson<AdminListResponse<OrderRow>>(adminListQuery("/api/admin/orders", { page: 1, perPage: 6 })),
  });

  const s = statsQ.data;
  const a = analyticsQ.data;
  const recent = ordersQ.data?.items ?? [];

  const ordersPeriodHref = useMemo(() => {
    if (!a?.navigation?.orders) return "";
    const p = new URLSearchParams({
      createdFrom: a.navigation.orders.createdFrom,
      createdToExclusive: a.navigation.orders.createdToExclusive,
    });
    return `/orders?${p.toString()}`;
  }, [a]);

  function ordersHrefForStatus(nav: AnalyticsResp["navigation"], status: string): string {
    const p = new URLSearchParams({
      createdFrom: nav.orders.createdFrom,
      createdToExclusive: nav.orders.createdToExclusive,
      status,
    });
    return `/orders?${p.toString()}`;
  }

  const chartRows = useMemo(() => {
    if (!a?.series?.length) return [];
    return a.series.map((r) => ({
      ...r,
      revenueNum: Number.parseFloat(r.revenueBdt),
    }));
  }, [a]);

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
          Reporting window
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_, next) => {
            if (!next) return;
            setRange(next);
          }}
          sx={{
            flexWrap: "wrap",
            gap: 0.5,
            "& .MuiToggleButton-root": { px: 1.5, typography: "caption", fontWeight: 700, textTransform: "none" },
          }}
        >
          {RANGE_OPTIONS.map((o) => (
            <ToggleButton key={o.id} value={o.id}>
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {analyticsQ.isLoading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : null}
      {analyticsQ.isError ? (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {analyticsQ.error instanceof Error ? analyticsQ.error.message : "Could not load analytics."}
        </Typography>
      ) : null}

      {a ? (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Selected period totals
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                {new Date(a.periodStart).toLocaleString()} → {new Date(a.periodEndExclusive).toLocaleString()} (exclusive end)
              </Typography>
            </Typography>
            {ordersPeriodHref ? (
              <Button component={Link} href={ordersPeriodHref} variant="contained" size="small" sx={{ fontWeight: 700, alignSelf: "flex-start" }}>
                Orders in period
              </Button>
            ) : null}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Orders placed
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {a.summary.ordersPlaced}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Revenue (excl. cancelled)
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatBdt(a.summary.revenueBdtExCancelled)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Average order value
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatBdt(a.summary.averageOrderValue)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Refresh datasets
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, fontWeight: 700 }}
                onClick={() => void qc.invalidateQueries({ queryKey: ["admin-dashboard-analytics"] })}
              >
                Reload analytics
              </Button>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }} fontWeight={800}>
            Orders breakdown by status
          </Typography>
          <Grid container spacing={1}>
            {a.ordersByStatus.map((row) => (
              <Grid item key={row.status}>
                <Button
                  component={Link}
                  variant="outlined"
                  size="small"
                  href={ordersHrefForStatus(a.navigation, row.status)}
                  sx={{ textTransform: "capitalize", fontWeight: 700 }}
                >
                  {row.status}: {row.n}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : null}

      {chartRows.length > 0 ? (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TrendingUpRoundedIcon color="primary" fontSize="small" />
            Orders &amp; revenue trend
          </Typography>
          <Box sx={{ width: "100%", height: 320, minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={chartRows.length > 14 ? -45 : -20} dy={chartRows.length > 14 ? 14 : 8} interval={chartRows.length > 24 ? 2 : 0} height={64} />
                <YAxis yAxisId="o" orientation="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(value, key) =>
                    key === "revenueNum" ? [`৳ ${Number(value).toFixed(2)}`, "Revenue (BDT)"] : [value, "Orders"]
                  }
                  labelFormatter={(lbl) => String(lbl)}
                />
                <Legend />
                <Bar yAxisId="o" dataKey="orders" fill="rgba(198, 227, 0, 0.75)" name="Orders" radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="revenueNum" name="Revenue" stroke="#2196f3" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      ) : null}

      {statsQ.isLoading ? <LinearProgress sx={{ mb: 3, borderRadius: 1 }} /> : null}

      <Paper sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom>
          Quick workspaces
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button component={Link} href="/reviews" variant="outlined" size="small" sx={{ fontWeight: 700 }}>
            Moderate reviews
          </Button>
          <Button component={Link} href="/wishlist-stats" variant="outlined" size="small" sx={{ fontWeight: 700 }}>
            Wishlist leaderboard
          </Button>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1.5 }} color="text.secondary" fontWeight={800}>
        Catalog-wide snapshot
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard label="Active products" value={s?.products ?? "—"} hint="All SKUs in the database" accent="lime" icon={<Inventory2RoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard
            label="Approved vendors"
            value={s?.vendorsApproved ?? "—"}
            hint={s != null ? `${s.vendorsPending} pending review` : undefined}
            accent="teal"
            icon={<StorefrontRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard
            label="Total orders (lifetime)"
            value={s?.orders ?? "—"}
            hint={s != null ? `${s.ordersPending} pending` : undefined}
            accent="violet"
            icon={<ShoppingBagRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard label="Categories" value={s?.categories ?? "—"} hint="Storefront taxonomy" accent="sky" icon={<CategoryRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard label="Banners" value={s?.banners ?? "—"} hint="Hero & placements" accent="amber" icon={<ImageRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <AdminStatCard
            label="Pending vendors"
            value={s?.vendorsPending ?? "—"}
            hint="Awaiting approval"
            accent="rose"
            icon={<PendingActionsRoundedIcon />}
          />
        </Grid>
      </Grid>

      {a && (a.topProductsByRevenue.length > 0 || a.topVendorsByRevenue.length > 0) ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {a.topProductsByRevenue.length > 0 ? (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  Top products by revenue ({a.preset.replace(/_/g, " ")})
                </Typography>
                <TableContainer sx={{ mt: 1, maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Units</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {a.topProductsByRevenue.map((r) => (
                        <TableRow key={r.productId}>
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Link href={`/products?q=${encodeURIComponent(r.slug)}`}>
                              <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ "&:hover": { textDecoration: "underline" } }}>
                                {r.title}
                              </Typography>
                            </Link>
                            <Typography variant="caption" color="text.secondary" component="div" noWrap>
                              {r.vendorName}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{formatBdt(r.revenue)}</TableCell>
                          <TableCell align="right">{r.units}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          ) : null}
          {a.topVendorsByRevenue.length > 0 ? (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  Top vendors by revenue ({a.preset.replace(/_/g, " ")})
                </Typography>
                <TableContainer sx={{ mt: 1, maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Vendor</TableCell>
                        <TableCell align="right">Orders</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {a.topVendorsByRevenue.map((v) => (
                        <TableRow key={v.vendorId}>
                          <TableCell>
                            <Link href={`/vendors?q=${encodeURIComponent(v.slug)}`}>
                              <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ "&:hover": { textDecoration: "underline" } }}>
                                {v.name}
                              </Typography>
                            </Link>
                          </TableCell>
                          <TableCell align="right">{v.orderCount}</TableCell>
                          <TableCell align="right">{formatBdt(v.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          ) : null}
        </Grid>
      ) : null}

      {a && a.topReviewedProducts.length > 0 ? (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Typography variant="subtitle1" fontWeight={800}>
              Top reviewed products (approved, all‑time top volume)
            </Typography>
            <Button component={Link} href="/reviews?status=approved" variant="outlined" size="small" sx={{ fontWeight: 700 }}>
              Open reviews workspace
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Links jump to moderation with hints when the query is supported downstream.
          </Typography>
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Reviews</TableCell>
                  <TableCell align="right">Avg rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {a.topReviewedProducts.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell>
                      <Link href="/reviews">
                        <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ "&:hover": { textDecoration: "underline" } }}>
                          {r.title}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {r.vendorName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.reviewCount}</TableCell>
                    <TableCell align="right">{r.avgRating}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Recent orders
          </Typography>
          <Button component={Link} href="/orders" size="small" color="primary" sx={{ fontWeight: 700 }}>
            View all
          </Button>
        </Stack>
        {ordersQ.isLoading ? (
          <LinearProgress />
        ) : recent.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No orders yet.
          </Typography>
        ) : (
          <TableContainer sx={{ overflow: "auto", maxWidth: "100%" }}>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{o.orderNumber}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell>{formatBdt(o.total)}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>{o.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
