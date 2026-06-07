import { Stack, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

type Props = {
  value: number;
  count?: number;
  size?: "sm" | "md";
};

export function StarRating({ value, count, size = "md" }: Props) {
  const full = Math.round(Math.min(5, Math.max(0, value)));
  const iconSx = { fontSize: size === "sm" ? 16 : 20, color: "warning.main" };
  const emptySx = { fontSize: size === "sm" ? 16 : 20, color: "action.disabled" };

  return (
    <Stack direction="row" alignItems="center" spacing={0.25} component="span" sx={{ flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ display: "inline-flex", lineHeight: 0 }}>
          {i <= full ? <StarIcon sx={iconSx} /> : <StarBorderIcon sx={emptySx} />}
        </span>
      ))}
      {count != null && count > 0 ? (
        <Typography variant={size === "sm" ? "caption" : "body2"} color="text.secondary" component="span" sx={{ ml: 0.5, fontWeight: 600 }}>
          ({count})
        </Typography>
      ) : null}
    </Stack>
  );
}
