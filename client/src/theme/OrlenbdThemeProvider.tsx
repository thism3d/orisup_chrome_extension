import { ThemeProvider, CssBaseline } from "@mui/material";
import { orlenbdTheme } from "./orlenbdTheme";

type Props = { children: React.ReactNode };

export function OrlenbdThemeProvider({ children }: Props) {
  return (
    <ThemeProvider theme={orlenbdTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
