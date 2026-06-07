import type {} from "@mui/material/styles";

/**
 * `brand` is the high-chroma marketing accent (lime for theme1, otherwise same as `primary`).
 * `primary` is the main UI token (darker for theme1) so MUI `color="primary"` text is readable on light.
 */
declare module "@mui/material/styles" {
  interface Palette {
    brand: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    brand?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
  }
}

export {};
