import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import { Link } from "wouter";
import { PriceDisplay } from "./PriceDisplay";
import { StarRating } from "./StarRating";
import { FreeDeliveryBadge } from "./FreeDeliveryBadge";
import type { ProductListRow } from "@/lib/types";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontProductCardSx } from "@/lib/storefrontUiSurface";
import { parseDecimalString } from "@shared/parseDecimalString";
import { responsiveImg } from "@/lib/responsiveImg";

type Props = {
  row: ProductListRow;
  showNew?: boolean;
  showDiscountBadge?: boolean;
  flashSaleStyle?: boolean;
  /** When true, the image loads eagerly with fetchpriority=high (use for above-the-fold cards). */
  eager?: boolean;
};

const PRODUCT_CARD_IMG_WIDTHS = [128, 192, 256, 384, 512, 768];
const PRODUCT_CARD_IMG_SIZES =
  "(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1200px) 25vw, 220px";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

function discountPercent(price: string, compare: string | null | undefined): number | null {
  if (!compare) return null;
  const p = parseDecimalString(price);
  const c = parseDecimalString(compare);
  if (!c || c <= p || Number.isNaN(p)) return null;
  return Math.round((1 - p / c) * 100);
}

export function ProductCard({ row, showNew, showDiscountBadge, flashSaleStyle = false, eager = false }: Props) {
  const { product, vendorSlug } = row;
  const img = product.images?.[0] ?? PLACEHOLDER_IMG;
  const responsive = responsiveImg(img, PRODUCT_CARD_IMG_WIDTHS);
  const pct = showDiscountBadge ? discountPercent(product.price, product.compareAtPrice) : null;
  const { uiTemplate } = useStorefrontUiTemplate();

  return (
    <Card
      elevation={0}
      className="ob-product-card"
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        ...storefrontProductCardSx(uiTemplate),
        borderRadius: flashSaleStyle ? "8px" : undefined,
      }}
    >
      <CardActionArea
        component={Link}
        href={`/p/${vendorSlug}/${product.slug}`}
        sx={{ alignItems: "stretch", flexDirection: "column", height: "100%" }}
      >
        <Box
          sx={{
            position: "relative",
            pt: "100%",
            bgcolor: "grey.50",
            overflow: "hidden",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            component="img"
            className="ob-product-img"
            src={responsive.src || img}
            srcSet={responsive.srcSet}
            sizes={responsive.srcSet ? PRODUCT_CARD_IMG_SIZES : undefined}
            alt={product.title}
            width={300}
            height={300}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "low"}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.45s ease",
            }}
          />
        </Box>
        <CardContent
          sx={{
            pt: 1.5,
            pb: 1.25,
            width: "100%",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              color: "text.primary",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 40,
            }}
          >
            {product.title}
          </Typography>
          {(row.reviewCount ?? 0) > 0 ? (
            <Box sx={{ my: 0.5 }}>
              <StarRating value={row.avgRating ?? 0} count={row.reviewCount} size="sm" />
            </Box>
          ) : null}
          <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          {showNew || product.freeDeliveryEnabled || (pct != null && pct > 0) ? (
            <Stack direction="row" flexWrap="wrap" sx={{ mt: "auto", pt: 1, gap: 0.75 }}>
              {showNew ? (
                <Chip label="New" size="small" sx={{ fontWeight: 700 }} color="primary" />
              ) : null}
              {product.freeDeliveryEnabled ? <FreeDeliveryBadge /> : null}
              {pct != null && pct > 0 ? (
                <Chip
                  label={`-${pct}%`}
                  icon={<BoltRoundedIcon sx={{ fontSize: "0.95rem !important" }} />}
                  size="small"
                  color="error"
                  sx={{
                    fontWeight: 800,
                    "& .MuiChip-label": {
                      pl: 0.5,
                      pr: 0.75,
                    },
                  }}
                />
              ) : null}
            </Stack>
          ) : null}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
