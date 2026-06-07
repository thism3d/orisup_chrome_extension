export const SITE_NAME = "Orlenbd";

/** Canonical site origin (no trailing slash). */
export function getSiteUrl(): string {
  const mirror =
    (import.meta.env.VITE_PUBLIC_ORIGIN_MIRROR_REQUEST_HOST as string | undefined)?.trim().toLowerCase() === "true";
  if (typeof window !== "undefined" && mirror) {
    return window.location.origin.replace(/\/$/, "");
  }
  const env = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (env?.trim()) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
  return "https://orlenbd.com";
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Absolute URL for API paths or full URLs (uploads, CDN). */
export function mediaAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (url == null || url === "") return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url.startsWith("/") ? url : `/${url}`);
}
