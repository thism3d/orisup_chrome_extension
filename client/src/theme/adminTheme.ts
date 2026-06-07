import { alpha, createTheme } from "@mui/material/styles";
import { getStorefrontTheme, normalizeStorefrontThemeId } from "./storefrontThemes";

/** Dark shell for platform admin — `primary` is overridden per saved storefront color theme. */
export const adminTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#C6E300", dark: "#9fb800", light: "#d4e82a", contrastText: "#0d0f12" },
    brand: { main: "#C6E300", dark: "#9fb800", light: "#d4e82a", contrastText: "#0d0f12" },
    secondary: { main: "#6ee7b7", contrastText: "#0d0f12" },
    background: {
      default: "#0b0d10",
      paper: "#13161c",
    },
    divider: "rgba(255, 255, 255, 0.08)",
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
      disabled: "rgba(255,255,255,0.38)",
    },
    success: { main: "#4ade80" },
    warning: { main: "#fbbf24" },
    error: { main: "#f87171" },
    info: { main: "#38bdf8" },
    action: {
      active: "#e2e8f0",
      hover: "rgba(198, 227, 0, 0.08)",
      selected: "rgba(198, 227, 0, 0.16)",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: -0.5 },
    h5: { fontWeight: 800, letterSpacing: -0.35 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600, letterSpacing: 0.5 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#2d3548 #0b0d10",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 10 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "rgba(255,255,255,0.06)" },
        head: {
          fontWeight: 700,
          fontSize: "0.72rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#94a3b8",
          backgroundColor: "rgba(0,0,0,0.2)",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.14)",
            borderWidth: "0.85px",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.18)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.22)",
            borderWidth: "1px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: "0.8125rem" },
        shrink: { fontSize: "0.75rem" },
      },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
      styleOverrides: {
        select: { fontSize: "0.8125rem", py: 0.5 },
        icon: { top: "calc(50% - 0.4em)" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          mt: 0.5,
          borderRadius: 2,
          border: "0.85px solid rgba(255,255,255,0.12)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
        },
        list: { py: 0.5 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem",
          minHeight: 36,
          py: 0.5,
          px: 1.25,
          whiteSpace: "normal",
          lineHeight: 1.35,
          "&:not(:last-of-type)": {
            borderBottom: "0.75px solid rgba(255,255,255,0.11)",
          },
          "&.Mui-selected": { backgroundColor: "action.selected" },
          "&.Mui-selected:hover": { backgroundColor: "action.selected" },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        listbox: {
          py: 0.5,
          maxHeight: 300,
        },
        option: {
          fontSize: "0.8rem",
          lineHeight: 1.4,
          py: 1,
          px: 1.5,
          whiteSpace: "normal",
          alignItems: "flex-start",
          "&:not(:last-of-type)": {
            borderBottom: "0.75px solid rgba(255,255,255,0.11)",
          },
        },
        paper: { borderRadius: 2, mt: 0.5 },
        input: { fontSize: "0.8125rem" },
      },
    },
  },
});

/**
 * Admin UI stays dark; accents (primary buttons, list selection, links) follow the storefront
 * color preset saved in platform settings (`storefront_theme`: theme1–theme6).
 */
export function createAdminThemeFromStorefront(storefrontThemeRaw: string | undefined) {
  const id = normalizeStorefrontThemeId(storefrontThemeRaw);
  const sf = getStorefrontTheme(id);
  const p = sf.palette.brand;
  const main = p.main;
  const dark = p.dark ?? main;
  const light = p.light ?? main;
  const contrastText = p.contrastText ?? "#ffffff";

  return createTheme(adminTheme, {
    palette: {
      primary: {
        main,
        dark,
        light,
        contrastText,
      },
      brand: {
        main,
        dark,
        light,
        contrastText,
      },
      action: {
        ...adminTheme.palette.action,
        hover: alpha(main, 0.1),
        selected: alpha(main, 0.18),
        focus: alpha(main, 0.12),
      },
    },
  });
}
