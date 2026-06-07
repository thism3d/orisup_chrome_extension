import { Chip } from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

type Props = {
  /** Card/image overlay (absolute top-right). Default is inline with surrounding layout. */
  placement?: "overlay" | "inline";
  size?: "small" | "medium";
};

export function FreeDeliveryBadge({ placement = "inline", size = "small" }: Props) {
  const { text } = useStorefrontLanguage();
  const iconPx = size === "small" ? "16px !important" : "18px !important";
  return (
    <Chip
      icon={<LocalShippingOutlinedIcon sx={{ fontSize: iconPx }} />}
      label={text("Free delivery", "বিনামূল্যে ডেলিভারি")}
      size={size}
      color="success"
      sx={{
        fontWeight: 800,
        ...(placement === "overlay"
          ? {
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              boxShadow: 1,
            }
          : {}),
      }}
    />
  );
}
