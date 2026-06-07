import { useRoute } from "wouter";
import { ShopPage } from "./ShopPage";

export function ShopCategoryPage() {
  const [, params] = useRoute("/c/:slug");
  return <ShopPage categorySlug={params?.slug} />;
}
