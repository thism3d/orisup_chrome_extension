import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useState } from "react";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/useCart";

type Props = { productId: string; stock: number; variantId?: string | null };

export function AddToCartSection({ productId, stock, variantId }: Props) {
  const [qty, setQty] = useState(1);
  const [, setLoc] = useLocation();
  const { setQty: applyCart } = useCart();
  const busy = applyCart.isPending;
  const out = stock < 1;

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(stock, q + 1));

  const buyNow = async () => {
    await applyCart.mutateAsync({ productId, quantity: qty, variantId: variantId ?? undefined });
    setLoc("/checkout");
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.75 }}>
            Quantity
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0} sx={{ width: "fit-content" }}>
            <IconButton
              onClick={dec}
              disabled={qty <= 1 || out}
              aria-label="Decrease quantity"
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px 0 0 8px",
                bgcolor: "grey.50",
              }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography
              component="span"
              sx={{
                minWidth: 44,
                py: 1,
                px: 1.5,
                textAlign: "center",
                fontWeight: 800,
                borderTop: "1px solid",
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              {qty}
            </Typography>
            <IconButton
              onClick={inc}
              disabled={qty >= stock || out}
              aria-label="Increase quantity"
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "0 8px 8px 0",
                bgcolor: "grey.50",
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ width: "100%", alignSelf: { xs: "stretch", sm: "flex-end" } }}
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={out || busy}
            onClick={() => applyCart.mutate({ productId, quantity: qty, variantId: variantId ?? undefined })}
            startIcon={<ShoppingCartOutlinedIcon />}
            sx={{
              py: 1.35,
              px: 2.5,
              fontWeight: 800,
              fontSize: "1rem",
              borderRadius: 2.5,
              minWidth: { sm: 180 },
              boxShadow: (t) =>
                `0 10px 28px ${t.palette.mode === "light" ? "rgba(212,232,0,0.45)" : "rgba(0,0,0,0.3)"}`,
              "&:hover": {
                boxShadow: (t) =>
                  `0 14px 36px ${t.palette.mode === "light" ? "rgba(212,232,0,0.5)" : "rgba(0,0,0,0.35)"}`,
              },
            }}
          >
            {busy ? "Adding…" : out ? "Out of stock" : "Add to cart"}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            fullWidth
            disabled={out || busy}
            onClick={() => void buyNow()}
            startIcon={<FlashOnRoundedIcon />}
            sx={{
              py: 1.35,
              px: 2.5,
              fontWeight: 800,
              fontSize: "1rem",
              borderRadius: 2.5,
              minWidth: { sm: 160 },
              borderWidth: 2,
              bgcolor: "background.paper",
              "&:hover": { borderWidth: 2 },
            }}
          >
            {busy ? "Please wait…" : "Buy now"}
          </Button>
        </Stack>
      </Stack>
      {!out && (
        <Typography variant="caption" color="text.secondary">
          {stock <= 10 ? `${stock} in stock — order soon.` : "In stock and ready to ship from seller."}
        </Typography>
      )}
    </Stack>
  );
}
