import { mediaAbsoluteUrl } from "@/lib/site";

/** Two-letter initials for avatar fallback. */
export function userInitials(fullName: string): string {
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0]![0]}${p[p.length - 1]![0]}`.toUpperCase();
  return fullName.slice(0, 2).toUpperCase() || "?";
}

/** Absolute image URL for `<Avatar src>` (uploads path or https). */
export function userAvatarImgSrc(avatarUrl: string | null | undefined): string | undefined {
  return mediaAbsoluteUrl(avatarUrl?.trim() || null);
}
