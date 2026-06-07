import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode, Pagination } from "swiper/modules";
import type { ProductListRow } from "@/lib/types";
import { ProductCard } from "./ProductCard";

import "swiper/css";
import "swiper/css/pagination";

type Props = {
  items: ProductListRow[];
  showNew?: boolean;
  showDiscountBadge?: boolean;
  flashSaleStyle?: boolean;
  /** First N cards eagerly load with fetchPriority=high (use only on above-the-fold rails). */
  eagerCount?: number;
};

/** Shared mobile “rail” styles for product carousels on the homepage. */
const railSx = (t: Theme) => ({
  position: "relative" as const,
  borderRadius: { xs: 0, sm: 3 },
  border: "1px solid",
  borderColor: { xs: "transparent", sm: "divider" },
  bgcolor: "#fff",
  boxShadow: {
    xs: "none",
    sm: "0 10px 36px rgba(11,11,11,0.07)",
  },
  px: { xs: 0, sm: 1.75, md: 2 },
  pt: { xs: 0, sm: 1.75 },
  pb: 0,
  mx: { xs: 0, sm: 0 },
  overflow: "hidden",
});

const paginationSx = {
  "& .swiper-pagination": {
    position: "relative" as const,
    marginTop: { xs: 0.5, sm: 0 },
    bottom: "auto !important",
    paddingBottom: { xs: 1.25, sm: 1.5 },
    paddingTop: { xs: 0.25, sm: 0.5 },
    width: "100% !important",
    display: "flex !important",
    justifyContent: "center !important",
    alignItems: "center !important",
    gap: "6px",
  },
  "& .swiper-pagination-bullets-dynamic": {
    left: "50% !important",
    transform: "translateX(-50%) !important",
  },
  "& .swiper-pagination-bullet": {
    margin: "0 !important",
    width: "8px !important",
    height: "8px !important",
    opacity: "1 !important",
    bgcolor: "rgba(11,11,11,0.12) !important",
    transition: "width 0.25s ease, background 0.25s ease !important",
  },
  "& .swiper-pagination-bullet-active": {
    width: "26px !important",
    height: "8px !important",
    borderRadius: "8px !important",
    bgcolor: "brand.main !important",
  },
};

export function ProductRowSwiper({ items, showNew, showDiscountBadge, flashSaleStyle = false, eagerCount = 0 }: Props) {
  if (items.length === 0) return null;

  return (
    <Box
      className="ob-product-swiper"
      sx={(t) => ({
        ...railSx(t),
        ...paginationSx,
        ...(flashSaleStyle
          ? {
              borderRadius: { xs: 0, sm: 3 },
              borderColor: { xs: "transparent", sm: "divider" },
              boxShadow: { xs: "none", sm: "0 10px 36px rgba(11,11,11,0.07)" },
              px: { xs: 0, sm: 1.75, md: 2 },
              pt: { xs: 0, sm: 1.75 },
            }
          : {}),
      })}
    >
      <Swiper
        modules={[Pagination, Autoplay, FreeMode]}
        spaceBetween={flashSaleStyle ? 8 : 12}
        slidesPerView={flashSaleStyle ? 2.3 : 1.08}
        pagination={{ clickable: true, dynamicBullets: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true,
        }}
        freeMode={{ momentum: true }}
        breakpoints={{
          400: { slidesPerView: flashSaleStyle ? 2.3 : 1.35, spaceBetween: flashSaleStyle ? 8 : 12 },
          520: { slidesPerView: flashSaleStyle ? 2.3 : 2, spaceBetween: flashSaleStyle ? 10 : 14 },
          640: { slidesPerView: flashSaleStyle ? 2.4 : 2.2, spaceBetween: flashSaleStyle ? 12 : 14 },
          900: { slidesPerView: 3, spaceBetween: 16 },
          1200: { slidesPerView: 4, spaceBetween: 16 },
          1400: { slidesPerView: 5, spaceBetween: 16 },
        }}
        style={{ paddingBottom: 4 }}
      >
        {items.map((row, i) => (
          <SwiperSlide key={row.product.id} style={{ height: "auto" }}>
            <ProductCard
              row={row}
              showNew={showNew}
              showDiscountBadge={showDiscountBadge}
              flashSaleStyle={flashSaleStyle}
              eager={i < eagerCount}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
}
