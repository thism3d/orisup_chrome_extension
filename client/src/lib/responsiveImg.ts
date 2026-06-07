/**
 * Build a responsive `srcSet` (and a sensible `src` fallback) for any image URL.
 *
 * - For `/uploads/*` paths we route through the server-side resizer at
 *   `/uploads/r/{w}/{filename}` (see `server/routes/image-resize.routes.ts`).
 * - For absolute URLs (CDN / Unsplash / 3rd party) we pass through unchanged.
 * - For other relative paths we also pass through unchanged.
 *
 * Allowed widths (must match `ALLOWED_WIDTHS` in the server route):
 *   64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280, 1600
 */

const ALLOWED_WIDTHS = [64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280, 1600] as const;

export type ResponsiveImg = {
  src: string;
  srcSet?: string;
  /** Recommended sizes attribute (caller may override). */
  sizes?: string;
};

const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;

function pickWidth(target: number): number {
  for (const w of ALLOWED_WIDTHS) {
    if (w >= target) return w;
  }
  return ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

/**
 * Normalize `/uploads/file.ext` and same-origin absolute URLs (`https://host/uploads/file.ext`).
 * Paths are flat (single basename) — matches the Express resizer contract.
 */
function uploadsFilename(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (pathOnly.startsWith("/uploads/r/")) return null;

  let uploadsPath = "";
  if (pathOnly.startsWith("/uploads/")) {
    uploadsPath = pathOnly;
  } else if (/^https?:\/\//i.test(pathOnly)) {
    try {
      const p = new URL(pathOnly).pathname;
      if (!p.startsWith("/uploads/") || p.startsWith("/uploads/r/")) return null;
      uploadsPath = p;
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const after = uploadsPath.slice("/uploads/".length);
  if (!after.includes("/") && SAFE_FILENAME_RE.test(after)) return after;
  return null;
}

/**
 * Generate `{ src, srcSet }` at the given widths for an image. The fallback `src` uses the largest
 * width so legacy browsers without srcset support still get a sized variant (not the original 1920px).
 */
export function responsiveImg(url: string | null | undefined, widths: number[]): ResponsiveImg {
  const safeUrl = (url ?? "").trim();
  if (!safeUrl) return { src: "" };

  const filename = uploadsFilename(safeUrl);
  if (!filename) {
    // External URL or non-/uploads path — return as-is.
    return { src: safeUrl };
  }

  const picked = Array.from(new Set(widths.map(pickWidth))).sort((a, b) => a - b);
  if (picked.length === 0) {
    return { src: `/uploads/r/${pickWidth(640)}/${filename}` };
  }
  const srcSet = picked.map((w) => `/uploads/r/${w}/${filename} ${w}w`).join(", ");
  const fallbackWidth = picked[picked.length - 1];
  return {
    src: `/uploads/r/${fallbackWidth}/${filename}`,
    srcSet,
  };
}

/**
 * Convenience: pick a single resized URL (no srcset) for cases where you know the rendered size
 * (e.g. fixed-size icons, payment-method logos).
 */
export function resizedImg(url: string | null | undefined, width: number): string {
  const safeUrl = (url ?? "").trim();
  if (!safeUrl) return "";
  const filename = uploadsFilename(safeUrl);
  if (!filename) return safeUrl;
  return `/uploads/r/${pickWidth(width)}/${filename}`;
}
