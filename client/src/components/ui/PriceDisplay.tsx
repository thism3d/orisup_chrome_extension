import { Stack, Typography, useTheme } from "@mui/material";
import { formatBdt } from "@/lib/format";
import { parseDecimalString } from "@shared/parseDecimalString";

type Props = {
  price: string;
  compareAtPrice?: string | null;
  size?: "sm" | "md" | "lg";
};

export function PriceDisplay({ price, compareAtPrice, size = "md" }: Props) {
  const theme = useTheme();
  const variant = size === "sm" ? "body2" : size === "lg" ? "h4" : "subtitle1";
  const compareVariant = size === "lg" ? "body1" : "caption";
  return (
    <Stack direction="row" alignItems="baseline" gap={{ xs: 1, sm: 1.5 }} flexWrap="wrap">
      <Typography
        variant={variant}
        component="span"
        fontWeight={800}
        sx={{
          color: "primary.main",
          letterSpacing: size === "lg" ? -0.5 : undefined,
          fontSize: size === "lg" ? { xs: "1.65rem", sm: "2rem" } : undefined,
        }}
      >
        {formatBdt(price)}
      </Typography>
      {compareAtPrice && parseDecimalString(compareAtPrice) > parseDecimalString(price) && (
        <Typography
          variant={compareVariant}
          component="span"
          sx={{
            color: theme.palette.grey[500],
            textDecoration: "line-through",
            fontWeight: 600,
          }}
        >
          {formatBdt(compareAtPrice)}
        </Typography>
      )}
    </Stack>
  );
}
