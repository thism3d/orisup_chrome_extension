import { alpha, createTheme, darken, type Theme } from "@mui/material/styles";
import { orlenbdOnLight, orlenbdTheme } from "./orlenbdTheme";

export const STOREFRONT_THEME_IDS = ["theme1", "theme2", "theme3", "theme4", "theme5", "theme6"] as const;
export type StorefrontThemeId = (typeof STOREFRONT_THEME_IDS)[number];
export type StorefrontThemeOverrides = {
  primary?: string;
  secondary?: string;
  onLightText?: string;
};

/** Theme 2 — Norex (norexbd): white shell + charcoal type + logo red (#FF0033) for CTAs and emphasis. */
const theme2Primary = "#FF0033";
const theme2PrimaryHover = "#D4002B";
const theme2PrimarySoft = "#FFE5EC";
const theme2Ink = "#111111";
const theme2Body = "#374151";
const theme2Muted = "#6B7280";
const theme2Border = "#E8E8E8";

export const storefrontTheme2 = createTheme({
  palette: {
    mode: "light",
    primary: { main: theme2Primary, dark: theme2PrimaryHover, light: theme2PrimarySoft, contrastText: "#FFFFFF" },
    brand: { main: theme2Primary, dark: theme2PrimaryHover, light: theme2PrimarySoft, contrastText: "#FFFFFF" },
    secondary: { main: theme2Ink, contrastText: "#FFFFFF" },
    text: { primary: theme2Body, secondary: theme2Muted },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    divider: theme2Border,
    action: { hover: alpha(theme2Primary, 0.06), selected: alpha(theme2Primary, 0.12) },
    success: { main: "#16A34A" },
    error: { main: "#DC2626" },
  },
  typography: {
    fontFamily: '"Montserrat", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, color: theme2Ink },
    h2: { fontWeight: 800, color: theme2Ink },
    h6: { fontWeight: 600 },
    button: { letterSpacing: "0.03em", fontWeight: 700 },
    body2: { color: theme2Muted },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 8 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: theme2Primary,
            color: "#FFFFFF",
            boxShadow: `0 10px 24px ${alpha(theme2Primary, 0.25)}`,
            "&:hover": { backgroundColor: theme2PrimaryHover, boxShadow: `0 12px 28px ${alpha(theme2Primary, 0.32)}` },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: {
            backgroundColor: theme2Ink,
            color: "#fff",
            "&:hover": { backgroundColor: "#000000" },
          },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: theme2Primary,
            color: theme2Primary,
            "&:hover": { borderColor: theme2PrimaryHover, backgroundColor: theme2PrimarySoft },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme2Border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(theme2Primary, 0.35) },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme2Primary, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: { color: theme2Body, "&:hover": { color: theme2PrimaryHover } },
      },
    },
  },
});

const theme3Primary = "#EA580C";
const theme3PrimaryHover = "#C2410C";
const theme3PrimarySoft = "#FFEDD5";
const theme3Ink = "#431407";
const theme3Body = "#44403C";
const theme3Muted = "#57534E";
const theme3Border = "#E7E5E4";

export const storefrontTheme3 = createTheme({
  palette: {
    mode: "light",
    primary: { main: theme3Primary, dark: theme3PrimaryHover, light: theme3PrimarySoft, contrastText: "#FFFFFF" },
    brand: { main: theme3Primary, dark: theme3PrimaryHover, light: theme3PrimarySoft, contrastText: "#FFFFFF" },
    secondary: { main: theme3Ink, contrastText: "#FFFBEB" },
    text: { primary: theme3Body, secondary: theme3Muted },
    background: { default: "#FFFBF5", paper: "#FFFFFF" },
    divider: theme3Border,
    success: { main: "#22C55E" },
    error: { main: "#EF4444" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: theme3Ink },
    h2: { fontWeight: 700, color: theme3Ink },
    h6: { fontWeight: 600 },
    body2: { color: theme3Muted },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 11 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: theme3Primary,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: theme3PrimaryHover },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: { backgroundColor: theme3Ink, color: "#fff", "&:hover": { backgroundColor: "#57534e" } },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: theme3Primary,
            color: theme3Primary,
            "&:hover": { borderColor: theme3PrimaryHover, backgroundColor: theme3PrimarySoft },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme3Border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme3PrimaryHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme3Primary, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: theme3Body, "&:hover": { color: theme3PrimaryHover } } },
    },
  },
});

const theme4Primary = "#16A34A";
const theme4PrimaryHover = "#15803D";
const theme4PrimarySoft = "#DCFCE7";
const theme4Ink = "#0F172A";
const theme4Body = "#1F2937";
const theme4Muted = "#4B5563";
const theme4Border = "#E2E8E0";

export const storefrontTheme4 = createTheme({
  palette: {
    mode: "light",
    primary: { main: theme4Primary, dark: theme4PrimaryHover, light: theme4PrimarySoft, contrastText: "#FFFFFF" },
    brand: { main: theme4Primary, dark: theme4PrimaryHover, light: theme4PrimarySoft, contrastText: "#FFFFFF" },
    secondary: { main: theme4Ink, contrastText: "#FFFFFF" },
    text: { primary: theme4Body, secondary: theme4Muted },
    background: { default: "#F8FAF7", paper: "#FFFFFF" },
    divider: theme4Border,
    success: { main: "#22C55E" },
    error: { main: "#EF4444" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: theme4Ink },
    h2: { fontWeight: 700, color: theme4Ink },
    h6: { fontWeight: 600 },
    body2: { color: theme4Muted },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 10 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: theme4Primary,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: theme4PrimaryHover },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: { backgroundColor: theme4Ink, color: "#fff", "&:hover": { backgroundColor: "#1f2937" } },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: theme4Primary,
            color: theme4Primary,
            "&:hover": { borderColor: theme4PrimaryHover, backgroundColor: theme4PrimarySoft },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme4Border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme4PrimaryHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme4Primary, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: theme4Body, "&:hover": { color: theme4PrimaryHover } } },
    },
  },
});

/** Industrial steel / workshop — slate metal primary, charcoal ink, cool concrete surfaces. */
const theme5Primary = "#64748B";
const theme5PrimaryHover = "#475569";
const theme5PrimarySoft = "#E2E8F0";
const theme5Ink = "#0F172A";
const theme5Body = "#334155";
const theme5Muted = "#475569";
const theme5Border = "#CBD5E1";

export const storefrontTheme5 = createTheme({
  palette: {
    mode: "light",
    primary: { main: theme5Primary, dark: theme5PrimaryHover, light: theme5PrimarySoft, contrastText: "#FFFFFF" },
    brand: { main: theme5Primary, dark: theme5PrimaryHover, light: theme5PrimarySoft, contrastText: "#FFFFFF" },
    secondary: { main: theme5Ink, contrastText: "#F8FAFC" },
    text: { primary: theme5Body, secondary: theme5Muted },
    background: { default: "#F1F5F9", paper: "#FFFFFF" },
    divider: theme5Border,
    success: { main: "#22C55E" },
    error: { main: "#EF4444" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, color: theme5Ink, letterSpacing: "-0.02em" },
    h2: { fontWeight: 800, color: theme5Ink, letterSpacing: "-0.015em" },
    h6: { fontWeight: 600 },
    body2: { color: theme5Muted },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: theme5Primary,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: theme5PrimaryHover },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: { backgroundColor: theme5Ink, color: "#fff", "&:hover": { backgroundColor: "#1e293b" } },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: theme5Primary,
            color: theme5PrimaryHover,
            "&:hover": { borderColor: theme5PrimaryHover, backgroundColor: theme5PrimarySoft },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme5Border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme5PrimaryHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme5Primary, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: theme5Body, "&:hover": { color: theme5PrimaryHover } } },
    },
  },
});

/** Adora / fashion & apparel — rose primary, warm paper, deep wine ink (pairs with `adorashop` UI template). */
const theme6Primary = "#C02673";
const theme6PrimaryHover = "#9D174D";
const theme6PrimarySoft = "#FBCFE8";
const theme6Ink = "#27141F";
const theme6Body = "#44403C";
const theme6Muted = "#57534E";
const theme6Border = "#F9D5E8";

export const storefrontTheme6 = createTheme({
  palette: {
    mode: "light",
    primary: { main: theme6Primary, dark: theme6PrimaryHover, light: theme6PrimarySoft, contrastText: "#FFFFFF" },
    brand: { main: theme6Primary, dark: theme6PrimaryHover, light: theme6PrimarySoft, contrastText: "#FFFFFF" },
    secondary: { main: theme6Ink, contrastText: "#FFF1F2" },
    text: { primary: theme6Body, secondary: theme6Muted },
    background: { default: "#FFFAFC", paper: "#FFFFFF" },
    divider: theme6Border,
    success: { main: "#16A34A" },
    error: { main: "#DC2626" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, color: theme6Ink, letterSpacing: "-0.025em" },
    h2: { fontWeight: 800, color: theme6Ink, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
    body2: { color: theme6Muted },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 12 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: theme6Primary,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: theme6PrimaryHover },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: { backgroundColor: theme6Ink, color: "#fff", "&:hover": { backgroundColor: "#3f1726" } },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: theme6Primary,
            color: theme6Primary,
            "&:hover": { borderColor: theme6PrimaryHover, backgroundColor: theme6PrimarySoft },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme6Border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme6PrimaryHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme6Primary, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: theme6Body, "&:hover": { color: theme6PrimaryHover } } },
    },
  },
});

const byId: Record<StorefrontThemeId, Theme> = {
  theme1: orlenbdTheme,
  theme2: storefrontTheme2,
  theme3: storefrontTheme3,
  theme4: storefrontTheme4,
  theme5: storefrontTheme5,
  theme6: storefrontTheme6,
};

export function normalizeStorefrontThemeId(raw: string | undefined): StorefrontThemeId {
  if (raw && STOREFRONT_THEME_IDS.includes(raw as StorefrontThemeId)) return raw as StorefrontThemeId;
  return "theme1";
}

function normalizeHexColor(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  return /^#([0-9a-fA-F]{6})$/.test(v) ? v.toUpperCase() : undefined;
}

export function getStorefrontTheme(id: string, overrides?: StorefrontThemeOverrides): Theme {
  const base = byId[normalizeStorefrontThemeId(id)] ?? orlenbdTheme;
  const primary = normalizeHexColor(overrides?.primary);
  const secondary = normalizeHexColor(overrides?.secondary);
  const onLightText = normalizeHexColor(overrides?.onLightText);
  if (!primary && !secondary && !onLightText) return base;
  const brandMain = primary ?? base.palette.brand.main;
  const brandDark = darken(brandMain, 0.18);
  const secondaryMain = secondary ?? base.palette.secondary.main;
  const onLightMain = onLightText ?? base.palette.primary.main;
  const onLightHover = darken(onLightMain, 0.18);
  return createTheme(base, {
    palette: {
      primary: { main: onLightMain },
      brand: { main: brandMain, dark: brandDark },
      secondary: { main: secondaryMain },
    },
    components: {
      MuiButton: {
        variants: [
          {
            props: { variant: "contained", color: "primary" },
            style: {
              backgroundColor: brandMain,
              color: "#FFFFFF",
              "&:hover": { backgroundColor: brandDark },
            },
          },
          {
            props: { variant: "outlined", color: "primary" },
            style: {
              borderColor: brandMain,
              color: onLightMain,
              "&:hover": { borderColor: brandDark, color: onLightHover },
            },
          },
          {
            props: { variant: "contained", color: "secondary" },
            style: {
              backgroundColor: secondaryMain,
              color: "#FFFFFF",
              "&:hover": { backgroundColor: darken(secondaryMain, 0.16) },
            },
          },
        ],
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: onLightMain,
            "&:hover": { color: onLightHover },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: brandDark },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brandMain, borderWidth: 2 },
          },
        },
      },
    },
  });
}

/** Admin / settings UI swatches (must match theme palettes). */
export const STOREFRONT_THEME_SWATCHES: Record<
  StorefrontThemeId,
  {
    label: string;
    /** Brand / CTA accent (lime for theme1). */
    primary: string;
    secondary: string;
    description: string;
    /** MUI `primary` on light: links, price, and tab text (darker for contrast vs primary swatch on theme1). */
    onLightText?: string;
  }
> = {
  theme1: {
    label: "Lime & black",
    primary: "#D4E800",
    secondary: "#0B0B0B",
    onLightText: orlenbdOnLight,
    description: "Default Orlenbd: lime for CTAs and promos, forest green for price and links on white.",
  },
  theme2: {
    label: "Norex white / red",
    primary: "#FF0033",
    secondary: "#111111",
    onLightText: "#D4002B",
    description:
      "Norex storefront — pure white shells with logo red (#FF0033) for CTAs, prices and highlights; charcoal body text.",
  },
  theme3: {
    label: "Warm coral",
    primary: "#EA580C",
    secondary: "#431407",
    description: "Warm promo-friendly palette with cream-tinted surfaces.",
  },
  theme4: {
    label: "Garden green",
    primary: "#16A34A",
    secondary: "#0F172A",
    description: "Fresh grocery palette with green accents, cream-white surfaces, and slate contrast.",
  },
  theme5: {
    label: "Industrial steel",
    primary: "#64748B",
    secondary: "#0F172A",
    description: "Workshop-inspired slate metal accents on cool concrete greys — built for steel furniture and hardware catalogs.",
  },
  theme6: {
    label: "Adora rose",
    primary: "#C02673",
    secondary: "#27141F",
    description: "Fashion & apparel — rose accent, blush-tinted surfaces, and deep wine ink for clothing and lifestyle brands.",
  },
};
