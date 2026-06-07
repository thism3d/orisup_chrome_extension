import { Avatar, Box, Card, CardActionArea, Skeleton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { Link } from "wouter";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode, Pagination } from "swiper/modules";
import type { ProductListRow } from "@/lib/types";

import "swiper/css";
import "swiper/css/pagination";

type Props = { items: ProductListRow[]; isLoading?: boolean };

function uniqueByVendor(rows: ProductListRow[]): ProductListRow[] {
  const seen = new Set<string>();
  const out: ProductListRow[] = [];
  for (const r of rows) {
    if (seen.has(r.vendorSlug)) continue;
    seen.add(r.vendorSlug);
    out.push(r);
  }
  return out;
}

export function TopSellersStrip({ items, isLoading }: Props) {
  const row = uniqueByVendor(items).slice(0, 12);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", gap: 2, overflow: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 2, p: 2, minWidth: 140, flexShrink: 0 }}>
            <Skeleton variant="circular" width={48} height={48} sx={{ mx: "auto", mb: 1 }} />
            <Skeleton width="80%" sx={{ mx: "auto" }} />
          </Card>
        ))}
      </Box>
    );
  }

  if (row.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Top stores appear here once products are live. Browse the{" "}
        <Typography component={Link} href="/shop" variant="body2" fontWeight={700} color="primary">
          shop
        </Typography>{" "}
        to explore vendors.
      </Typography>
    );
  }

  return (
    <Box
      className="ob-vendor-swiper"
      sx={(t) => ({
        position: "relative",
        borderRadius: { xs: 2.5, sm: 3 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
        boxShadow: {
          xs: `0 14px 44px rgba(11,11,11,0.09), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.06)}`,
          sm: "0 10px 36px rgba(11,11,11,0.07)",
        },
        px: { xs: 1.25, sm: 1.75 },
        pt: { xs: 1.5, sm: 1.75 },
        pb: 0,
        "& .swiper-pagination": {
          position: "relative",
          marginTop: 0.5,
          bottom: "auto !important",
          paddingBottom: { xs: 1.25, sm: 1.5 },
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
        },
        "& .swiper-pagination-bullet-active": {
          width: "26px !important",
          borderRadius: "8px !important",
          bgcolor: "brand.main !important",
        },
      })}
    >
      <Swiper
        modules={[Pagination, Autoplay, FreeMode]}
        spaceBetween={12}
        slidesPerView={1.25}
        pagination={{ clickable: true, dynamicBullets: true }}
        autoplay={{ delay: 4200, disableOnInteraction: true, pauseOnMouseEnter: true }}
        freeMode={{ momentum: true }}
        breakpoints={{
          400: { slidesPerView: 1.65, spaceBetween: 12 },
          480: { slidesPerView: 2.2, spaceBetween: 14 },
          768: { slidesPerView: 4, spaceBetween: 14 },
          1024: { slidesPerView: 5, spaceBetween: 14 },
          1280: { slidesPerView: 6, spaceBetween: 14 },
        }}
        style={{ paddingBottom: 4 }}
      >
        {row.map((r) => (
          <SwiperSlide key={r.vendorSlug} style={{ height: "auto" }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                height: "100%",
                borderColor: "divider",
                boxShadow: { xs: "0 4px 16px rgba(11,11,11,0.06)", sm: "none" },
                transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 14px 32px rgba(11,11,11,0.1)",
                  borderColor: "primary.main",
                },
              }}
            >
              <CardActionArea component={Link} href={`/v/${r.vendorSlug}`} sx={{ p: 2, textAlign: "center" }}>
                <Avatar
                  sx={{
                    mx: "auto",
                    mb: 1,
                    bgcolor: "brand.light",
                    color: "#0B0B0B",
                    fontWeight: 800,
                    width: { xs: 48, sm: 52 },
                    height: { xs: 48, sm: 52 },
                    fontSize: "1rem",
                    boxShadow: "0 4px 12px rgba(212,232,0,0.35)",
                  }}
                >
                  {r.vendorName.slice(0, 2).toUpperCase()}
                </Avatar>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {r.vendorName}
                </Typography>
                <Typography variant="caption" color="primary" fontWeight={700}>
                  Visit store
                </Typography>
              </CardActionArea>
            </Card>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
}
