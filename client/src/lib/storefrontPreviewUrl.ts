import { getSiteUrl } from "@/lib/site";

/** Query params read by the storefront to preview theme/template without saving (admin tooling). */
export const STOREFRONT_PREVIEW_THEME_PARAM = "ob_preview_theme";
export const STOREFRONT_PREVIEW_TEMPLATE_PARAM = "ob_preview_template";

export function buildStorefrontPreviewUrl(opts: {
  theme?: string;
  template?: string;
  /** Path under site root, e.g. `/` or `/shop` */
  path?: string;
}): string {
  const origin = getSiteUrl().replace(/\/$/, "");
  const rawPath = opts.path?.trim() || "/";
  const pathname = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const u = new URL(pathname, `${origin}/`);
  if (opts.theme?.trim()) u.searchParams.set(STOREFRONT_PREVIEW_THEME_PARAM, opts.theme.trim());
  if (opts.template?.trim()) u.searchParams.set(STOREFRONT_PREVIEW_TEMPLATE_PARAM, opts.template.trim());
  return u.toString();
}
