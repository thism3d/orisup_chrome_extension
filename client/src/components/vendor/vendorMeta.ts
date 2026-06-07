export const VENDOR_PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "Your seller workspace" },
  "/products": { title: "Products", subtitle: "Manage catalogue and inventory" },
  "/orders": { title: "Orders", subtitle: "Orders that include your products" },
  "/apply": { title: "Become a seller", subtitle: "Apply to open your store on the marketplace" },
};

export function getVendorPageMeta(path: string): { title: string; subtitle: string } {
  const p = path === "" ? "/" : path;
  if (p.startsWith("/orders/") && p !== "/orders") {
    return { title: "Order detail", subtitle: "Your items, shipping, and status history" };
  }
  return VENDOR_PAGE_META[p] ?? { title: "Vendor portal", subtitle: "Seller hub" };
}
