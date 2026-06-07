/** Unsplash previews for category tiles (by slug). */
export const CATEGORY_PREVIEW_IMAGES: Record<string, string> = {
  electronics:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80",
  fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80",
  "home-living":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
  "health-beauty":
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
  "sports-outdoor":
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
};

export const CATEGORY_PREVIEW_FALLBACK =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

export function categoryPreviewUrl(slug: string): string {
  return CATEGORY_PREVIEW_IMAGES[slug] ?? CATEGORY_PREVIEW_FALLBACK;
}
