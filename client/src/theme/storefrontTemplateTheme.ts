import { alpha, createTheme, lighten, type Theme } from "@mui/material/styles";
import type { StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";
import { getStorefrontTheme, type StorefrontThemeOverrides } from "./storefrontThemes";

/**
 * Merges admin color theme (theme1–5) with layout-only overlays.
 * Template surfaces (page background, card borders) are derived from the selected theme’s
 * primary + text colors — not fixed greys — so every palette reads coherently on each layout.
 * Primary/secondary are never replaced; they stay on `base` from `getStorefrontTheme`.
 */
export function getStorefrontThemeForLayout(
  colorId: string,
  uiTemplate: StorefrontUiTemplateId,
  overrides?: StorefrontThemeOverrides,
): Theme {
  const base = getStorefrontTheme(colorId, overrides);
  const overlay = buildTemplateOverlay(base, uiTemplate);
  if (!Object.keys(overlay).length) return base;
  return createTheme(base, overlay);
}

function buildTemplateOverlay(base: Theme, uiTemplate: StorefrontUiTemplateId): object {
  if (uiTemplate === "orlenbd") return {};

  const brandChroma = base.palette.brand.main;
  const ink = base.palette.text.primary;

  if (uiTemplate === "orynbd") {
    return {
      palette: {
        mode: "light",
        background: {
          default: lighten(brandChroma, 0.86),
        },
      },
      typography: {
        fontFamily: '"Inter", "Source Sans 3", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800, letterSpacing: "-0.03em" },
        h2: { fontWeight: 800, letterSpacing: "-0.025em" },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: "none" as const },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 12 },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: 12 },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              boxShadow: `0 10px 28px ${alpha(ink, 0.11)}`,
              border: `1px solid ${alpha(ink, 0.07)}`,
            },
          },
        },
      },
    };
  }

  /** Adora Shop only — Norex (`norexbd`) overlay follows below. */
  if (uiTemplate === "adorashop") {
    return {
      palette: {
        mode: "light",
        background: {
          default: lighten(brandChroma, 0.905),
        },
      },
      typography: {
        fontFamily: '"DM Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 800, letterSpacing: "-0.03em" },
        h2: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 800, letterSpacing: "-0.025em" },
        h3: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 700 },
        h4: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 700 },
        h5: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 700 },
        h6: { fontFamily: '"DM Sans", "Inter", sans-serif', fontWeight: 600 },
        subtitle1: { fontWeight: 600, letterSpacing: "0.01em" },
        subtitle2: { fontWeight: 600, letterSpacing: "0.02em" },
        button: { fontWeight: 600, letterSpacing: "0.02em", textTransform: "none" as const },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 999 },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: 12 },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: `0 8px 26px ${alpha(ink, 0.06)}`,
              border: `1px solid ${alpha(ink, 0.09)}`,
            },
          },
        },
      },
    };
  }

  if (uiTemplate === "norexbd") {
    return {
      palette: {
        mode: "light",
        background: {
          default: "#FFFFFF",
          paper: "#FFFFFF",
        },
      },
      typography: {
        fontFamily: '"Montserrat", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800, letterSpacing: "-0.04em" },
        h2: { fontWeight: 800, letterSpacing: "-0.035em" },
        h3: { fontWeight: 700, letterSpacing: "-0.02em" },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
        subtitle2: { fontWeight: 600, letterSpacing: "0.06em" },
        button: { letterSpacing: "0.06em", textTransform: "none" as const, fontWeight: 700 },
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              border: `1px solid ${alpha(brandChroma, 0.14)}`,
              boxShadow: `0 8px 28px ${alpha(ink, 0.06)}`,
            },
          },
        },
      },
    };
  }

  if (uiTemplate === "uttorasteel") {
    return {
      palette: {
        mode: "light",
        background: {
          default: lighten(brandChroma, 0.88),
        },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800, letterSpacing: "-0.025em" },
        h2: { fontWeight: 800, letterSpacing: "-0.02em" },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 700 },
        subtitle2: { fontWeight: 700 },
      },
      shape: { borderRadius: 8 },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 8 },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: 8 },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              boxShadow: `0 8px 22px ${alpha(ink, 0.1)}`,
              border: `1px solid ${alpha(ink, 0.1)}`,
            },
          },
        },
      },
    };
  }

  if (uiTemplate === "masumtraders") {
    return {
      palette: {
        mode: "light",
        background: {
          default: lighten(brandChroma, 0.9),
        },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800, letterSpacing: "-0.02em" },
        h2: { fontWeight: 800, letterSpacing: "-0.02em" },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 700 },
        subtitle2: { fontWeight: 700 },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 10 },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: 10 },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: `0 10px 24px ${alpha(ink, 0.08)}`,
              border: `1px solid ${alpha(brandChroma, 0.18)}`,
            },
          },
        },
      },
    };
  }

  return {};
}
