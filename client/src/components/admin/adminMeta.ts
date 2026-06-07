export const ADMIN_PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Overview of your marketplace",
  },
  "/orders": {
    title: "Orders",
    subtitle: "Customer orders and fulfillment status",
  },
  "/products": {
    title: "Products",
    subtitle: "All listings across vendors — status and catalogue control",
  },
  "/vendors": {
    title: "Vendors",
    subtitle: "Approve, suspend, and review seller stores",
  },
  "/couriers": {
    title: "Couriers",
    subtitle: "Delivery partners, tracking links, and assignment to orders",
  },
  "/categories": {
    title: "Categories",
    subtitle: "Storefront navigation and product grouping",
  },
  "/banners": {
    title: "Hero banners",
    subtitle: "Homepage carousel and promotional slots",
  },
  "/users": {
    title: "Users",
    subtitle: "Customer and staff accounts",
  },
  "/roles": {
    title: "Roles & access",
    subtitle: "Who can do what on the platform",
  },
  "/settings": {
    title: "Settings",
    subtitle: "General, SEO, branding previews, and storefront themes",
  },
  "/payment-gateway": {
    title: "Payment gateway",
    subtitle: "OrlenPay direct checkout and callback configuration",
  },
  "/audit-logs": {
    title: "Audit logs",
    subtitle: "Who changed what — filter by path, entity, actor, and time",
  },
  "/profile": {
    title: "Your profile",
    subtitle: "Account details and password for this admin login",
  },
  "/newsletter": {
    title: "Newsletter",
    subtitle: "Storefront email sign-ups",
  },
  "/reviews": {
    title: "Reviews",
    subtitle: "Moderate product reviews and public replies",
  },
  "/wishlist-stats": {
    title: "Wishlist insights",
    subtitle: "Most saved products across the marketplace",
  },
  "/brand-trust-pages": {
    title: "Brand Trust Pages",
    subtitle: "About, contact, terms, privacy, returns, warranty, FAQ and payment policy content",
  },
};

const PREFIX_META: Array<{ prefix: string; title: string; subtitle: string }> = [
  {
    prefix: "/brand-trust-pages/",
    title: "Edit Brand Trust Page",
    subtitle: "Manage the live copy for this storefront page",
  },
];

export function getAdminPageMeta(path: string): { title: string; subtitle: string } {
  if (ADMIN_PAGE_META[path]) return ADMIN_PAGE_META[path];
  for (const p of PREFIX_META) {
    if (path.startsWith(p.prefix)) return { title: p.title, subtitle: p.subtitle };
  }
  return { title: "Admin", subtitle: "Platform control center" };
}
