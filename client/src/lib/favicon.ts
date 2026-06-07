export function faviconMimeType(url: string | undefined): string {
  const raw = url?.toLowerCase() ?? "";
  if (raw.endsWith(".png")) return "image/png";
  if (raw.endsWith(".ico")) return "image/x-icon";
  if (raw.endsWith(".gif")) return "image/gif";
  if (raw.endsWith(".webp")) return "image/webp";
  if (raw.endsWith(".jpg") || raw.endsWith(".jpeg")) return "image/jpeg";
  return "image/svg+xml";
}

