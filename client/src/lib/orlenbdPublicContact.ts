/** Public Orlenbd contact, office, and social URLs (storefront + contact page). */

export const ORLENBD_PUBLIC_EMAIL = "info.orlenbd@gmail.com";

export const ORLENBD_PUBLIC_PHONE_DISPLAY = "+880 1616-536106";

/** E.164 without + for wa.me */
export const ORLENBD_PUBLIC_PHONE_WA = "8801616536106";

export const ORLENBD_WHATSAPP_URL = `https://wa.me/${ORLENBD_PUBLIC_PHONE_WA}`;

export const ORLENBD_SOCIAL_URLS = {
  facebook: "https://www.facebook.com/orlenbd",
  /** Instagram not launched yet — footer shows “coming soon”. */
  instagram: null as string | null,
  x: "https://x.com/orlenbd",
  tiktok: "https://www.tiktok.com/@orlenbd",
  pinterest: "https://www.pinterest.com/orlenbd/",
  youtube: "https://www.youtube.com/@orlenbd",
} as const;

export const ORLENBD_OFFICE_ADDRESS_LINES = [
  "Salma Kunj",
  "House-7, Road-3, Bank Colony",
  "Holding No: 177/5/1",
  "East Rampura",
  "Dhaka North – 1219, Bangladesh",
] as const;

export const ORLENBD_OFFICE_ADDRESS_BLOCK = ORLENBD_OFFICE_ADDRESS_LINES.join("\n");

/**
 * Embedded map (no API key). Opens the same query in Google Maps via
 * {@link ORLENBD_GOOGLE_MAPS_OPEN_URL}.
 */
export const ORLENBD_GOOGLE_MAPS_EMBED_SRC =
  "https://maps.google.com/maps?q=" +
  encodeURIComponent(
    "Salma Kunj, House-7, Road-3, Bank Colony, Holding 177/5/1, East Rampura, Dhaka North 1219, Bangladesh",
  ) +
  "&hl=en&z=16&output=embed";

export const ORLENBD_GOOGLE_MAPS_OPEN_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(
    "Salma Kunj, House-7, Road-3, Bank Colony, Holding 177/5/1, East Rampura, Dhaka North 1219, Bangladesh",
  );
