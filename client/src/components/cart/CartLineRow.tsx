import { Box, IconButton, Stack, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Link } from "wouter";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import type { CartLineRow as CartLineData } from "@/lib/types";
import { useCart } from "@/hooks/useCart";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { mediaAbsoluteUrl } from "@/lib/site";
import { formatBdt } from "@/lib/format";
import { parseDecimalString } from "@shared/parseDecimalString";

type Props = { row: CartLineData };

export function CartLineRow({ row }: Props) {
  const { setQty } = useCart();
  const { text } = useStorefrontLanguage();
  const { line, product, variant, vendorSlug } = row;
  const busy = setQty.isPending;
  const maxQty = Math.max(1, variant ? variant.stock : product.stock);
  const unit = variant ? parseDecimalString(variant.price) : parseDecimalString(product.price);
  const lineTotal = unit * line.quantity;
  const thumbRaw = product.images?.[0];
  const thumb = thumbRaw ? mediaAbsoluteUrl(thumbRaw) ?? thumbRaw : null;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}
    >
      <Stack
        component={Link}
        href={`/p/${vendorSlug}/${product.slug}`}
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
      >
        <Box
          sx={{
            width: 88,
            height: 88,
            flexShrink: 0,
            bgcolor: "#f4f4f2",
            borderRadius: 2,
            border: "1px solid #eee",
            backgroundImage: thumb ? `url(${thumb})` : undefined,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <Stack minWidth={0} spacing={0.5}>
          <Typography fontWeight={700} sx={{ lineHeight: 1.35 }}>
            {product.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.vendorName}
            {variant ? ` · ${variant.name}: ${variant.value}` : ""}
          </Typography>
          {product.freeDeliveryEnabled ? (
            <Typography variant="caption" color="success.main" fontWeight={700}>
              {text(
                "Free delivery eligible when your whole cart qualifies",
                "পুরো কার্ট যোগ্য হলে ফ্রি ডেলিভারি উপযুক্ত",
              )}
            </Typography>
          ) : null}
          <PriceDisplay price={variant ? variant.price : product.price} size="sm" />
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: "space-between", sm: "flex-end" }}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 2,
            bgcolor: "#fff",
            overflow: "hidden",
          }}
        >
          <IconButton
            size="small"
            disabled={busy || line.quantity <= 1}
            onClick={(e) => {
              e.preventDefault();
              setQty.mutate({ productId: product.id, quantity: line.quantity - 1, variantId: line.variantId });
            }}
            aria-label="Decrease quantity"
            sx={{ borderRadius: 0 }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography component="span" sx={{ minWidth: 36, textAlign: "center", fontWeight: 800, fontSize: "0.95rem" }}>
            {line.quantity}
          </Typography>
          <IconButton
            size="small"
            disabled={busy || line.quantity >= maxQty}
            onClick={(e) => {
              e.preventDefault();
              setQty.mutate({ productId: product.id, quantity: line.quantity + 1, variantId: line.variantId });
            }}
            aria-label="Increase quantity"
            sx={{ borderRadius: 0 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack alignItems={{ xs: "flex-end", sm: "center" }} spacing={0.25} sx={{ minWidth: 100 }}>
          <Typography variant="body2" fontWeight={800} sx={{ color: "#2d3a00" }}>
            {formatBdt(lineTotal)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            line total
          </Typography>
        </Stack>

        <IconButton
          aria-label="Remove"
          disabled={busy}
          onClick={() => setQty.mutate({ productId: product.id, quantity: 0, variantId: line.variantId })}
          color="error"
          size="small"
          sx={{ ml: { sm: 0.5 } }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
