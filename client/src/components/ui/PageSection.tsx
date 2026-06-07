import { Box, useTheme } from "@mui/material";
import { alpha, lighten } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { isMinimalEditorialTemplate } from "@/lib/storefrontUiTemplate";

type Props = {
  children: ReactNode;
  bg?: "white" | "muted";
  className?: string;
  /** Compact = tighter vertical padding (minimal UI template). */
  density?: "comfortable" | "compact";
  /**
   * No top padding below `md` — use for the first section after a full-bleed hero so mobile
   * does not show a white band before tinted content (e.g. Flash sale).
   */
  flushTop?: boolean;
};

export function PageSection({
  children,
  bg = "white",
  className,
  density = "comfortable",
  flushTop = false,
}: Props) {
  const theme = useTheme();
  const layoutTemplate = useStorefrontLayoutTemplate();
  const py = density === "compact" ? { xs: 2.5, md: 3.75 } : { xs: 3.5, md: 5 };

  const brand = theme.palette.brand.main;
  const mutedBg =
    layoutTemplate === "norexbd"
      ? lighten(brand, 0.93)
      : isMinimalEditorialTemplate(layoutTemplate)
        ? lighten(brand, 0.89)
        : layoutTemplate === "orynbd"
          ? lighten(brand, 0.835)
          : lighten(brand, 0.942);

  const ink = theme.palette.text.primary;
  const mutedWash =
    layoutTemplate === "norexbd"
      ? {
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(100deg, transparent 0%, ${alpha(brand, 0.08)} 42%, transparent 85%)`,
            opacity: 0.75,
            pointerEvents: "none",
          },
        }
      : isMinimalEditorialTemplate(layoutTemplate)
        ? {
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(90deg, transparent 0%, ${alpha(brand, 0.14)} 50%, transparent 100%)`,
              opacity: 0.35,
              pointerEvents: "none",
            },
          }
        : layoutTemplate === "orynbd"
        ? {
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage: `radial-gradient(circle at 18% 12%, ${alpha(brand, 0.22)} 0%, transparent 38%), radial-gradient(circle at 82% 88%, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 42%)`,
              pointerEvents: "none",
            },
          }
        : {
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage: `radial-gradient(circle at 12% 20%, ${alpha(brand, 0.1)} 0%, transparent 42%), radial-gradient(circle at 88% 80%, ${alpha(ink, 0.04)} 0%, transparent 40%)`,
              pointerEvents: "none",
            },
          };

  return (
    <Box
      component="section"
      className={className}
      sx={{
        ...(flushTop
          ? {
              pt: { xs: 0, sm: 0, md: py.md },
              pb: { xs: py.xs, sm: py.xs, md: py.md },
            }
          : { py }),
        bgcolor: bg === "muted" ? mutedBg : theme.palette.background.paper,
        position: "relative",
        ...(bg === "muted" ? mutedWash : {}),
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </Box>
  );
}
