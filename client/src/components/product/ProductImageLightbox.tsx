import { Box, Dialog, IconButton, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { useEffect, useState } from "react";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;

type Props = {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null | undefined;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  currentLabel: string;
  /** Optional: reset when url changes (new image). */
  imageKey?: string;
};

/**
 * Ant Design Image / Daraz-style viewer: dim transparent backdrop, prev/next, zoom, close.
 */
export function ProductImageLightbox({
  open,
  onClose,
  imageUrl,
  onPrev,
  onNext,
  canPrev,
  canNext,
  currentLabel,
  imageKey,
}: Props) {
  const t = useTheme();
  const [scale, setScale] = useState(1);
  const key = imageKey ?? imageUrl ?? "";

  useEffect(() => {
    if (open) setScale(1);
  }, [key, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        onNext();
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale((s) => Math.min(MAX_ZOOM, +(s + 0.2).toFixed(2)));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setScale((s) => Math.max(MIN_ZOOM, +(s - 0.2).toFixed(2)));
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onClose, onPrev, onNext, canPrev, canNext]);

  if (!imageUrl && !open) {
    return null;
  }
  if (!imageUrl) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        keepMounted
        slotProps={{
          paper: {
            onClick: onClose,
            sx: {
              m: 0,
              maxWidth: "100vw",
              minHeight: "100dvh",
              width: "100vw",
              bgcolor: alpha(t.palette.common.black, 0.75),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
        }}
      >
        <Box sx={{ p: 3, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
          <Typography color="common.white" sx={{ mb: 2 }}>
            Image is unavailable. Try again or go back to the product page.
          </Typography>
          <IconButton onClick={onClose} color="inherit" size="small" aria-label="Close" sx={{ color: "common.white" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      keepMounted
      slotProps={{
        paper: {
          onClick: onClose,
          elevation: 0,
          square: true,
          sx: {
            m: 0,
            maxWidth: "100vw",
            maxHeight: "100dvh",
            width: "100vw",
            height: "100dvh",
            bgcolor: alpha(t.palette.common.black, 0.72),
            backdropFilter: "blur(2px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            boxShadow: "none",
            border: "none",
            borderRadius: 0,
            cursor: "zoom-out",
          },
        },
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const delta = e.deltaY;
          if (delta > 0) setScale((s) => Math.max(MIN_ZOOM, +(s - 0.1).toFixed(2)));
          else setScale((s) => Math.min(MAX_ZOOM, +(s + 0.1).toFixed(2)));
        }}
        sx={{
          position: "relative",
          zIndex: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 1.5,
          maxWidth: "100vw",
          maxHeight: "100dvh",
          boxSizing: "border-box",
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={currentLabel}
          sx={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            userSelect: "none",
            transition: (t) => t.transitions.create("transform", { duration: 160 }),
            cursor: "default",
          }}
          onDragStart={(e) => e.preventDefault()}
        />
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={(e) => e.stopPropagation()}
        sx={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 2, pointerEvents: "auto" }}
      >
        <Typography
          component="div"
          variant="body2"
          sx={{ color: "common.white", textShadow: "0 1px 4px rgba(0,0,0,0.5)", fontWeight: 600 }}
        >
          {currentLabel}
        </Typography>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          size="small"
          sx={{ pointerEvents: "auto", color: "common.white", bgcolor: "rgba(0,0,0,0.45)" }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      {canPrev ? (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          size="large"
          aria-label="Previous image"
          sx={{
            position: "absolute",
            left: { xs: 4, sm: 16 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            color: "common.white",
            bgcolor: "rgba(0,0,0,0.35)",
            pointerEvents: "auto",
            "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
          }}
        >
          <ChevronLeftRoundedIcon fontSize="large" />
        </IconButton>
      ) : null}

      {canNext ? (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          size="large"
          aria-label="Next image"
          sx={{
            position: "absolute",
            right: { xs: 4, sm: 16 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            color: "common.white",
            bgcolor: "rgba(0,0,0,0.35)",
            pointerEvents: "auto",
            "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
          }}
        >
          <ChevronRightRoundedIcon fontSize="large" />
        </IconButton>
      ) : null}

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          bgcolor: "rgba(0,0,0,0.5)",
          borderRadius: 20,
          px: 1.5,
          py: 0.5,
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.max(MIN_ZOOM, +(s - 0.2).toFixed(2)));
          }}
          aria-label="Zoom out"
          size="small"
          disabled={scale <= MIN_ZOOM + 0.001}
          sx={{ color: "common.white" }}
        >
          <RemoveRoundedIcon />
        </IconButton>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(MAX_ZOOM, +(s + 0.2).toFixed(2)));
          }}
          aria-label="Zoom in"
          size="small"
          disabled={scale >= MAX_ZOOM - 0.001}
          sx={{ color: "common.white" }}
        >
          <AddRoundedIcon />
        </IconButton>
      </Stack>
    </Dialog>
  );
}
