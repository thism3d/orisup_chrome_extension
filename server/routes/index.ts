import type { Express } from "express";
import { registerAuthRoutes } from "./auth.routes";
import { registerAuthSocialRoutes } from "./authSocial.routes";
import { registerUploadRoutes } from "./upload.routes";
import { registerImageResizeRoutes } from "./image-resize.routes";
import { registerCatalogRoutes } from "./catalog.routes";
import { registerCartRoutes } from "./cart.routes";
import { registerCustomerOrderRoutes } from "./orders.routes";
import { registerWishlistRoutes } from "./wishlist.routes";
import { registerVendorRoutes } from "./vendor.routes";
import { registerAdminRoutes } from "./admin.routes";
import { registerSeoRoutes } from "./seo.routes";
import { registerMeRoutes } from "./me.routes";
import { registerProductReviewRoutes } from "./product-reviews.routes";
import { registerBrandTrustPageRoutes } from "./brandTrustPages.routes";
import { registerPartnerRoutes } from "./partners.routes";
import { registerPaymentRoutes } from "./payments.routes";
import { registerPathaoStoreRoutes } from "./pathaoStore.routes";

export function registerRoutes(app: Express) {
  // Partner-facing routes use raw bodies for HMAC verification, so they must be
  // registered BEFORE the auth/admin routes to take precedence on path matching.
  registerPartnerRoutes(app);
  registerSeoRoutes(app);
  // /uploads/r/:w/:filename — must register before the /uploads static middleware
  // (mounted in vite.ts) so the resizer matches first.
  registerImageResizeRoutes(app);
  registerUploadRoutes(app);
  registerAuthRoutes(app);
  registerAuthSocialRoutes(app);
  registerMeRoutes(app);
  registerProductReviewRoutes(app);
  registerCatalogRoutes(app);
  registerCartRoutes(app);
  registerPathaoStoreRoutes(app);
  registerPaymentRoutes(app);
  registerCustomerOrderRoutes(app);
  registerWishlistRoutes(app);
  registerVendorRoutes(app);
  registerBrandTrustPageRoutes(app);
  registerAdminRoutes(app);
}
