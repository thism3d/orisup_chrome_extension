import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { storefrontSectionHeadingAccentSx, storefrontSectionHeadingTitleSx } from "@/lib/storefrontUiSurface";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function SectionHeading({ title, subtitle, actionLabel, onAction, children }: Props) {
  const uiTemplate = useStorefrontLayoutTemplate();
  const titleVariant = uiTemplate === "orynbd" ? "h5" : uiTemplate === "norexbd" ? "subtitle1" : "h6";
  const actionBtnRadius = uiTemplate === "norexbd" ? 999 : uiTemplate === "orynbd" ? 3 : 2;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5, gap: 2 }}>
      <Stack spacing={0.75} direction="row" alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            alignSelf: "stretch",
            minHeight: subtitle ? 40 : 28,
            ...storefrontSectionHeadingAccentSx(uiTemplate),
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant={titleVariant} sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, maxWidth: 560 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      <Stack direction="row" alignItems="center" gap={1} flexShrink={0}>
        {children}
        {actionLabel && onAction && (
          <Button
            size="small"
            onClick={onAction}
            color="primary"
            variant="outlined"
            endIcon={<ArrowForwardIosIcon sx={{ fontSize: "0.7rem !important" }} />}
            sx={{ fontWeight: 700, borderRadius: actionBtnRadius, borderWidth: 2, "&:hover": { borderWidth: 2 } }}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
