import { createTheme } from "@mui/material/styles";

/** Seller portal — teal accent, same structure as admin shell. */
export const vendorTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#2dd4bf", dark: "#14b8a6", light: "#5eead4", contrastText: "#0b0f0e" },
    brand: { main: "#2dd4bf", dark: "#14b8a6", light: "#5eead4", contrastText: "#0b0f0e" },
    secondary: { main: "#C6E300", contrastText: "#0d0f12" },
    background: {
      default: "#0c1012",
      paper: "#141a1d",
    },
    divider: "rgba(255, 255, 255, 0.08)",
    text: {
      primary: "#f0fdfa",
      secondary: "#94a3b8",
    },
    success: { main: "#4ade80" },
    warning: { main: "#fbbf24" },
    error: { main: "#f87171" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: -0.5 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 700, borderRadius: 10 } },
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
  },
});
