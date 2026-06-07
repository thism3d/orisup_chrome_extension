/** Fallback hero slides when API returns no banners — high-res Unsplash. */
export type HeroSlide = {
  title: string;
  subtitle: string;
  image: string;
  ctaHref: string;
  ctaLabel: string;
};

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    title: "Always be your multivendor",
    subtitle: "Trusted sellers, BDT prices, cash on delivery across Bangladesh.",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=88",
    ctaHref: "/shop",
    ctaLabel: "Shop now",
  },
  {
    title: "Electronics & gadgets",
    subtitle: "Phones, audio, and smart gear from verified shops.",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1920&q=88",
    ctaHref: "/c/electronics",
    ctaLabel: "Browse tech",
  },
  {
    title: "Fashion that fits your vibe",
    subtitle: "New arrivals weekly — shoes, apparel, and accessories.",
    image:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1920&q=88",
    ctaHref: "/c/fashion",
    ctaLabel: "Shop fashion",
  },
];
