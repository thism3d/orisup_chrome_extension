export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: string;
  /** Present when returned from `/api/auth/me` / login; true if a password hash exists. */
  hasPassword?: boolean;
  avatarUrl?: string | null;
  googleSub?: string | null;
  facebookSub?: string | null;
};

/** Response from GET /api/products (list + count). */
export type ProductListResponse = { items: ProductListRow[]; total: number };

export type ProductListRow = {
  product: {
    id: string;
    title: string;
    slug: string;
    price: string;
    compareAtPrice: string | null;
    images: string[];
    status: string;
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
  };
  vendorName: string;
  vendorSlug: string;
  /** Approved reviews aggregate (from list/detail APIs). */
  reviewCount?: number;
  avgRating?: number;
};

export type CartVariant = {
  id: string;
  productId: string;
  kind: string;
  name: string;
  value: string;
  price: string;
  stock: number;
  sortOrder: number;
};

export type CartLineRow = {
  line: { id: string; quantity: number; productId: string; variantId: string | null };
  product: {
    id: string;
    title: string;
    slug: string;
    price: string;
    stock: number;
    images: string[];
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
  };
  variant: CartVariant | null;
  vendorSlug: string;
  vendorName: string;
  /** Number of variants for this product (from server); >0 means a variant must be chosen before checkout. */
  productVariantCount?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

/** A category enriched with its sorted children (used by tree endpoints). */
export type CategoryNode = Category & { children: CategoryNode[] };

export type SavedAddress = {
  id: string;
  userId: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
  phone: string;
  isDefault: boolean;
  createdAt: string;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  pathaoCityName?: string | null;
  pathaoZoneName?: string | null;
  pathaoAreaName?: string | null;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel?: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: string;
  sortOrder: number;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showButton?: boolean;
  showShadow?: boolean;
  active?: boolean;
};
