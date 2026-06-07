import { Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import { Link } from "wouter";
import { apiJson } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { responsiveImg } from "@/lib/responsiveImg";

import "swiper/css";
import "swiper/css/effect-fade";

const MAX_H = 88;
const TOP_BANNER_WIDTHS = [384, 512, 768, 1024, 1280, 1600];
const TOP_BANNER_SIZES = "100vw";

/**
 * Full-width strip above the main header (Pickaboo-style) — image or animated GIF, optional link.
 * Banners with `placement: top_promo` (managed in Admin → Banners).
 */
function readBootstrapTopPromo(): Banner[] | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = (window as unknown as { __ORLENBD_INITIAL_HOME__?: { banners?: Banner[] } })
    .__ORLENBD_INITIAL_HOME__;
  const list = raw?.banners;
  return Array.isArray(list) && list.length > 0 ? list : undefined;
}

export function TopPromotionBar() {
  const initial = readBootstrapTopPromo();
  const { data: rows = [] } = useQuery({
    queryKey: ["banners", "top_promo"],
    queryFn: () => apiJson<Banner[]>("/api/banners?placement=top_promo"),
    staleTime: 60_000,
    initialData: initial,
  });

  if (rows.length === 0) return null;

  const inner = (b: Banner) => {
    const responsive = responsiveImg(b.imageUrl, TOP_BANNER_WIDTHS);
    const img = (
      <Box
        component="img"
        src={responsive.src || b.imageUrl}
        srcSet={responsive.srcSet}
        sizes={responsive.srcSet ? TOP_BANNER_SIZES : undefined}
        alt={b.title}
        width={1600}
        height={MAX_H}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        sx={{
          display: "block",
          width: "100%",
          maxHeight: MAX_H,
          height: "auto",
          objectFit: "cover",
          objectPosition: "center",
          verticalAlign: "top",
        }}
      />
    );
    const href = b.linkUrl?.trim() || null;
    if (href) {
      return (
        <Box
          component={Link}
          href={href}
          sx={{ display: "block", lineHeight: 0, textDecoration: "none", "&:focus-visible": { outline: "2px solid", outlineColor: "brand.main", outlineOffset: -2 } }}
        >
          {img}
        </Box>
      );
    }
    return img;
  };

  if (rows.length === 1) {
    const b = rows[0]!;
    return (
      <Box
        component="aside"
        role="region"
        aria-label="Promotion"
        sx={{ width: "100%", bgcolor: "common.black", overflow: "hidden" }}
      >
        {inner(b)}
      </Box>
    );
  }

  return (
    <Box
      component="aside"
      role="region"
      aria-label="Promotional banners"
      sx={{ width: "100%", bgcolor: "common.black", position: "relative" }}
    >
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        speed={500}
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        style={{ minHeight: 0 }}
      >
        {rows.map((b) => (
          <SwiperSlide key={b.id} style={{ lineHeight: 0 }}>
            {inner(b)}
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
}
