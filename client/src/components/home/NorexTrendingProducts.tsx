import { Box, Card, CardActionArea, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Link } from "wouter";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation } from "swiper/modules";
import type { ProductListRow } from "@/lib/types";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { StarRating } from "@/components/ui/StarRating";
import { ProductWishlistButton } from "@/components/product/ProductWishlistButton";
import { useCart } from "@/hooks/useCart";
import { responsiveImg } from "@/lib/responsiveImg";

import "swiper/css";
import "swiper/css/navigation";

type Props = { items: ProductListRow[] };

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

const NOREX_IMG_WIDTHS = [192, 256, 384, 512];
const NOREX_IMG_SIZES = "(max-width: 600px) 60vw, (max-width: 1024px) 30vw, 220px";

/** Horizontal product rail styled like the reference “Trending products” cards. */
export function NorexTrendingProducts({ items }: Props) {
  const { setQty } = useCart();
  const row = items.slice(0, 16);

  if (row.length === 0) return null;

  return (
    <Box
      className="norex-trending-swiper"
      sx={{
        position: "relative",
        mx: { xs: -0.5, sm: 0 },
        "& .swiper-button-next, & .swiper-button-prev": {
          color: "primary.main",
          width: 36,
          height: 36,
          "&::after": { fontSize: "1.1rem" },
        },
      }}
    >
      <Swiper
        modules={[FreeMode, Navigation]}
        spaceBetween={14}
        slidesPerView={1.35}
        navigation
        freeMode={{ momentum: true }}
        breakpoints={{
          480: { slidesPerView: 2.1, spaceBetween: 14 },
          768: { slidesPerView: 3.1, spaceBetween: 16 },
          1024: { slidesPerView: 4, spaceBetween: 18 },
          1280: { slidesPerView: 4.5, spaceBetween: 20 },
        }}
      >
        {row.map((r) => {
          const { product } = r;
          const rawImg = product.images?.[0] ?? PLACEHOLDER;
          const img = responsiveImg(rawImg, NOREX_IMG_WIDTHS);
          return (
            <SwiperSlide key={product.id} style={{ height: "auto" }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (t) => alpha(t.palette.grey[300], 0.35),
                  overflow: "visible",
                  position: "relative",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: (t) => `0 16px 40px ${alpha(t.palette.common.black, 0.1)}`,
                  },
                }}
              >
                <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} onClick={(e) => e.preventDefault()}>
                  <ProductWishlistButton productId={product.id} size="small" />
                </Box>
                <CardActionArea
                  component={Link}
                  href={`/p/${product.slug}`}
                  sx={{
                    p: 1.5,
                    pt: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    height: "100%",
                  }}
                >
                  <Box
                    className="ob-product-img"
                    component="img"
                    src={img.src || rawImg}
                    srcSet={img.srcSet}
                    sizes={img.srcSet ? NOREX_IMG_SIZES : undefined}
                    alt={product.title}
                    width={300}
                    height={140}
                    loading="lazy"
                    decoding="async"
                    sx={{
                      width: "100%",
                      height: 140,
                      objectFit: "contain",
                      mb: 1.5,
                      transition: "transform 0.25s ease",
                    }}
                  />
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                    <StarRating value={r.avgRating ?? 0} size="sm" />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ({r.reviewCount ?? 0} reviews)
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.35, mb: 1 }} noWrap title={product.title}>
                    {product.title}
                  </Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: "auto" }}>
                    <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="Add to cart"
                      sx={{
                        bgcolor: "brand.main",
                        color: "brand.contrastText",
                        "&:hover": { bgcolor: "brand.dark" },
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void setQty.mutateAsync({ productId: product.id, quantity: 1 });
                      }}
                    >
                      <ShoppingCartOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardActionArea>
              </Card>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </Box>
  );
}
