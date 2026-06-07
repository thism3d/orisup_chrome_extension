import { alpha, createTheme } from "@mui/material/styles";

/** Public marketing / CTA / banner accent (buttons keep this in theme overrides). */
export const orlenbdBrandLime = "#D4E800";
const brandLimeHover = "#B8C900";
const brandLimeSoft = "#F0F8B0";
/** Default MUI `primary` for text, links, and tab labels on light paper (WCAG vs lime). */
export const orlenbdOnLight = "#1A3308";
const onLightHover = "#0F1D06";
const onLightSoft = "#E4ECD6";

const mainBlack = "#0B0B0B";
const bodyText = "#333333";
// 4.48:1 (#777) failed WCAG AA on #fff per Lighthouse; #595959 → 7:1 passes AA + AAA-Large.
const muted = "#595959";
const border = "#E5E5E5";

const brandLime = orlenbdBrandLime;

export const orlenbdTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: orlenbdOnLight,
      dark: onLightHover,
      light: onLightSoft,
      contrastText: "#FFFFFF",
    },
    brand: {
      main: brandLime,
      dark: brandLimeHover,
      light: brandLimeSoft,
      contrastText: mainBlack,
    },
    secondary: { main: mainBlack, contrastText: "#FFFFFF" },
    text: { primary: bodyText, secondary: muted },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    divider: border,
    success: { main: "#22C55E" },
    error: { main: "#EF4444" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: mainBlack },
    h2: { fontWeight: 700, color: mainBlack },
    h6: { fontWeight: 600 },
    body2: { color: muted },
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
          style: { backgroundColor: brandLime, color: mainBlack, "&:hover": { backgroundColor: brandLimeHover } },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: { backgroundColor: mainBlack, color: "#fff", "&:hover": { backgroundColor: "#333" } },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: brandLime,
            color: mainBlack,
            "&:hover": { borderColor: brandLimeHover, backgroundColor: brandLimeSoft },
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
          "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: brandLimeHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brandLime, borderWidth: 2 },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: bodyText, "&:hover": { color: onLightHover } } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: "0.875rem" }, shrink: { fontSize: "0.8rem" } },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
      styleOverrides: {
        select: { fontSize: "0.8rem" },
        icon: { top: "calc(50% - 0.4em)" },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 2, mt: 0.5 }, list: { py: 0.5 } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.8rem",
          minHeight: 36,
          py: 0.45,
          px: 1.1,
          whiteSpace: "normal",
          lineHeight: 1.35,
          "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: border },
          "&.Mui-selected": { backgroundColor: alpha(brandLime, 0.15) },
        },
      },
    },
  },
});
