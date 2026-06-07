import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useEffect, useMemo, useState } from "react";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";

type Props = {
  open: boolean;
  onClose: () => void;
  images: string[];
  title?: string;
  initialIndex?: number;
};

export function AdminImageViewerDialog({ open, onClose, images, title, initialIndex = 0 }: Props) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    const max = Math.max(0, safeImages.length - 1);
    setActive(Math.max(0, Math.min(initialIndex, max)));
  }, [open, initialIndex, safeImages.length]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" fontWeight={800} noWrap>
          {title?.trim() || "Image preview"}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close image viewer">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ width: "100%", maxWidth: 920, mx: "auto" }}>
          <ProductImageGallery
            images={safeImages}
            active={active}
            onSelect={setActive}
            ratio="76%"
            productTitle={title}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
