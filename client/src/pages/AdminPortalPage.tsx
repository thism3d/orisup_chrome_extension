import { useMemo, type ReactNode } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { Route, Switch } from "wouter";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";
import { RequireRole } from "@/components/auth/RequireRole";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminVendorsTable } from "@/components/admin/AdminVendorsTable";
import { AdminCategoriesPanel } from "@/components/admin/AdminCategoriesPanel";
import { AdminBannersPanel } from "@/components/admin/AdminBannersPanel";
import { AdminOrdersPanel } from "@/components/admin/AdminOrdersPanel";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminProductsPanel } from "@/components/admin/AdminProductsPanel";
import { AdminRolesPanel } from "@/components/admin/AdminRolesPanel";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminPaymentGatewayPanel } from "@/components/admin/AdminPaymentGatewayPanel";
import { AdminAuditLogsPanel } from "@/components/admin/AdminAuditLogsPanel";
import { AdminNewsletterPanel } from "@/components/admin/AdminNewsletterPanel";
import { AdminReviewsPanel } from "@/components/admin/AdminReviewsPanel";
import { AdminWishlistStatsPanel } from "@/components/admin/AdminWishlistStatsPanel";
import { AdminBrandTrustPagesPanel } from "@/components/admin/AdminBrandTrustPagesPanel";
import { AdminCouriersPanel } from "@/components/admin/AdminCouriersPanel";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { AdminDashboardHome } from "@/pages/AdminDashboardHome";
import { AdminProfilePage } from "@/pages/AdminProfilePage";
import { createAdminThemeFromStorefront } from "@/theme/adminTheme";
import { PortalSiteMetaProvider } from "@/components/layout/PortalSiteMetaProvider";
import { AdminPermissionProvider } from "@/contexts/AdminPermissionContext";
import { AdminUserPeekProvider } from "@/contexts/AdminUserPeekContext";
import { AdminPageGate } from "@/components/admin/AdminPageGate";

function AdminBrandedThemeProvider({ children }: { children: ReactNode }) {
  const meta = usePublicSiteMeta();
  const theme = useMemo(
    () => createAdminThemeFromStorefront(meta?.storefront_theme),
    [meta?.storefront_theme],
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

export function AdminPortalPage() {
  return (
    <PortalSiteMetaProvider>
      <AdminBrandedThemeProvider>
        <Switch>
          <Route path="/login" component={AdminLoginPage} />
          <Route>
            <RequireRole roles={["platform_admin"]} redirectIfUnauthenticated="/login">
              <AdminPermissionProvider>
                <AdminUserPeekProvider>
                <AdminLayout>
                  <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                    <AdminPageGate>
                      <Switch>
                        <Route path="/" component={AdminDashboardHome} />
                        <Route path="/orders" component={AdminOrdersPanel} />
                        <Route path="/products" component={AdminProductsPanel} />
                        <Route path="/vendors" component={AdminVendorsTable} />
                        <Route path="/couriers" component={AdminCouriersPanel} />
                        <Route path="/categories" component={AdminCategoriesPanel} />
                        <Route path="/banners" component={AdminBannersPanel} />
                        <Route path="/users" component={AdminUsersPanel} />
                        <Route path="/roles" component={AdminRolesPanel} />
                        <Route path="/profile" component={AdminProfilePage} />
                        <Route path="/settings" component={AdminSettingsPanel} />
                        <Route path="/payment-gateway" component={AdminPaymentGatewayPanel} />
                        <Route path="/audit-logs" component={AdminAuditLogsPanel} />
                        <Route path="/newsletter" component={AdminNewsletterPanel} />
                        <Route path="/reviews" component={AdminReviewsPanel} />
                        <Route path="/wishlist-stats" component={AdminWishlistStatsPanel} />
                        <Route path="/brand-trust-pages" component={AdminBrandTrustPagesPanel} />
                        <Route path="/brand-trust-pages/:slug" component={AdminBrandTrustPagesPanel} />
                        <Route component={AdminDashboardHome} />
                      </Switch>
                    </AdminPageGate>
                  </Box>
                </AdminLayout>
                </AdminUserPeekProvider>
              </AdminPermissionProvider>
            </RequireRole>
          </Route>
        </Switch>
      </AdminBrandedThemeProvider>
    </PortalSiteMetaProvider>
  );
}
