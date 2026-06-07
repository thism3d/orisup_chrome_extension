import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

const DEFAULT_BRAND = "#d4e800";
const DEFAULT_BRAND_SOFT = "rgba(212, 232, 0, 0.14)";
const DEFAULT_INK = "#0b0b0b";

function asCssColor(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** Syncs CSS variables used by index.css (selection, legacy utilities) to the active storefront MUI theme. */
export function applyStorefrontCssVars(theme: Theme): void {
  const root = document.documentElement;
  const brand = asCssColor(theme.palette.brand.main, asCssColor(theme.palette.primary.main, DEFAULT_BRAND));
  const secondary = asCssColor(theme.palette.secondary.main, DEFAULT_INK);
  const ink = asCssColor(theme.palette.text.primary, DEFAULT_INK);
  const paper = asCssColor(theme.palette.background.paper, "#ffffff");
  const surface = asCssColor(theme.palette.background.default, "#ffffff");
  root.style.setProperty("--ob-brand", brand);
  root.style.setProperty("--ob-brand-soft", alpha(brand, 0.14));
  root.style.setProperty("--ob-secondary", secondary);
  root.style.setProperty("--ob-ink", ink);
  root.style.setProperty("--ob-paper", paper);
  root.style.setProperty("--ob-surface", surface);
}

export function resetStorefrontCssVars(): void {
  const root = document.documentElement;
  root.style.setProperty("--ob-brand", DEFAULT_BRAND);
  root.style.setProperty("--ob-brand-soft", DEFAULT_BRAND_SOFT);
  root.style.setProperty("--ob-secondary", DEFAULT_INK);
  root.style.setProperty("--ob-ink", DEFAULT_INK);
  root.style.setProperty("--ob-paper", "#ffffff");
  root.style.setProperty("--ob-surface", "#ffffff");
}
