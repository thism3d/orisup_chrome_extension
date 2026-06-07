import { IconButton, Tooltip } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useWishlistToggle } from "@/hooks/useWishlistMutations";

type Props = { productId: string; size?: "small" | "medium" | "large" };

export function ProductWishlistButton({ productId, size = "medium" }: Props) {
  const { inWishlist, toggle, busy } = useWishlistToggle(productId);

  return (
    <Tooltip title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}>
      <span>
        <IconButton
          color={inWishlist ? "primary" : "default"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          disabled={busy}
          size={size}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {inWishlist ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
