import { Button, Paper, Stack, Typography } from "@mui/material";
import { Link } from "wouter";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontCatalogEmptyHintPaperSx } from "@/lib/storefrontUiSurface";

type Props = { isError?: boolean; message?: string; onRetry?: () => void };

export function CatalogEmptyHint({ isError, message, onRetry }: Props) {
  const { uiTemplate } = useStorefrontUiTemplate();
  return (
    <Paper elevation={0} sx={storefrontCatalogEmptyHintPaperSx(uiTemplate, { isError })}>
      <Stack spacing={2} alignItems="center" maxWidth={420} mx="auto">
        <Inventory2OutlinedIcon sx={{ fontSize: 48, color: "text.secondary", opacity: 0.85 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          {isError ? "Could not load catalog" : "No products to show yet"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {message ??
            (isError
              ? "Check your connection and try again."
              : "Add products in the admin panel, or check back when vendors have published items.")}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
          {onRetry && (
            <Button variant="contained" color="primary" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button component={Link} href="/shop" variant="outlined">
            Open shop
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
