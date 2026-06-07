import { lazy, Suspense, type ComponentType } from "react";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/useAuth";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { HomePage } from "@/pages/HomePage";

// Lazy-loaded routes — each becomes its own JS chunk so the initial home-page
// download doesn't pull in admin/vendor/PDP/checkout code. Saves 600+ KB on
// first paint per Lighthouse's "Reduce unused JavaScript" finding.
const ShopPage = lazy(() => import("@/pages/ShopPage").then((m) => ({ default: m.ShopPage })));
const ShopCategoryPage = lazy(() =>
  import("@/pages/ShopCategoryPage").then((m) => ({ default: m.ShopCategoryPage })),
);
const CategoriesPage = lazy(() =>
  import("@/pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })),
);
const ProductPage = lazy(() => import("@/pages/ProductPage").then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import("@/pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const CheckoutPaymentReturnPage = lazy(() =>
  import("@/pages/CheckoutPaymentReturnPage").then((m) => ({ default: m.CheckoutPaymentReturnPage })),
);
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const OrderDonePage = lazy(() => import("@/pages/OrderDonePage").then((m) => ({ default: m.OrderDonePage })));
const VendorStorePage = lazy(() =>
  import("@/pages/VendorStorePage").then((m) => ({ default: m.VendorStorePage })),
);
const WishlistPage = lazy(() => import("@/pages/WishlistPage").then((m) => ({ default: m.WishlistPage })));
const AccountOrdersPage = lazy(() =>
  import("@/pages/AccountOrdersPage").then((m) => ({ default: m.AccountOrdersPage })),
);
const AccountPage = lazy(() => import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const OrderDetailPage = lazy(() =>
  import("@/pages/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })),
);
const VendorPortalPage = lazy(() =>
  import("@/pages/VendorPortalPage").then((m) => ({ default: m.VendorPortalPage })),
);
const AdminPortalPage = lazy(() =>
  import("@/pages/AdminPortalPage").then((m) => ({ default: m.AdminPortalPage })),
);
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const lazyStatic = (key:
  | "AboutPage"
  | "ContactPage"
  | "FaqPage"
  | "PaymentLicensesPage"
  | "PrivacyPolicyPage"
  | "ReturnsPolicyPage"
  | "TermsPage"
  | "WarrantyPage") =>
  lazy(async () => {
    const mod = await import("@/pages/StoreStaticPages");
    const Comp = mod[key] as ComponentType;
    return { default: Comp };
  });

const AboutPage = lazyStatic("AboutPage");
const ContactPage = lazyStatic("ContactPage");
const FaqPage = lazyStatic("FaqPage");
const PaymentLicensesPage = lazyStatic("PaymentLicensesPage");
const PrivacyPolicyPage = lazyStatic("PrivacyPolicyPage");
const ReturnsPolicyPage = lazyStatic("ReturnsPolicyPage");
const TermsPage = lazyStatic("TermsPage");
const WarrantyPage = lazyStatic("WarrantyPage");

/** Lightweight, layout-stable fallback so route swaps don't flash. */
function RouteFallback() {
  return (
    <div
      aria-hidden
      style={{ minHeight: 240, width: "100%" }}
    />
  );
}

function StoreRoutes() {
  return (
    <StoreLayout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/shop" component={() => <ShopPage />} />
          <Route path="/categories" component={CategoriesPage} />
          <Route path="/c/:slug" component={ShopCategoryPage} />
          <Route path="/p/:vendorSlug/:productSlug" component={ProductPage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/checkout/payment-return" component={CheckoutPaymentReturnPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/order-done/:orderNumber" component={OrderDonePage} />
          <Route path="/v/:slug" component={VendorStorePage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/account/orders/:orderNumber" component={OrderDetailPage} />
          <Route path="/account/orders" component={AccountOrdersPage} />
          <Route path="/account" component={AccountPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/privacy" component={PrivacyPolicyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/returns" component={ReturnsPolicyPage} />
          <Route path="/warranty" component={WarrantyPage} />
          <Route path="/payments" component={PaymentLicensesPage} />
          <Route path="/contact" component={ContactPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
    </StoreLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/vendor" nest>
            <VendorPortalPage />
          </Route>
          <Route path="/admin" nest>
            <AdminPortalPage />
          </Route>
          <Route component={StoreRoutes} />
        </Switch>
      </Suspense>
    </AuthProvider>
  );
}
