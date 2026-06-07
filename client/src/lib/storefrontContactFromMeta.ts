import {
  ORLENBD_GOOGLE_MAPS_EMBED_SRC,
  ORLENBD_GOOGLE_MAPS_OPEN_URL,
  ORLENBD_OFFICE_ADDRESS_BLOCK,
  ORLENBD_PUBLIC_EMAIL,
  ORLENBD_PUBLIC_PHONE_DISPLAY,
  ORLENBD_SOCIAL_URLS,
  ORLENBD_WHATSAPP_URL,
} from "@/lib/orlenbdPublicContact";

/** Build a `tel:` href from a display phone string (BD-friendly). */
export function supportPhoneToTelHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return `tel:+${d}`;
  if (d.length === 11 && d.startsWith("0")) return `tel:+88${d.slice(1)}`;
  if (d.length >= 10 && d.length <= 11) return `tel:+${d}`;
  return `tel:+${d}`;
}

export type ResolvedStorefrontContact = {
  supportPhoneDisplay: string;
  supportPhoneTel: string;
  supportEmail: string;
  addressBlock: string;
  /** Optional extra line under address; empty = show only i18n “registered office” in UI. */
  addressSub: string;
  mapsOpenUrl: string;
  mapsEmbedUrl: string;
  social: {
    facebook: string;
    instagram: string;
    x: string;
    tiktok: string;
    pinterest: string;
    youtube: string;
    whatsapp: string;
    threads: string;
  };
};

/**
 * Merges `/api/public/site-meta` with shipped Orlenbd fallbacks for any empty key.
 */
export function resolveStorefrontContact(meta: Record<string, string> | undefined): ResolvedStorefrontContact {
  const m = meta ?? {};
  const phone =
    m.support_phone?.trim() || ORLENBD_PUBLIC_PHONE_DISPLAY;
  const tel = supportPhoneToTelHref(phone) || supportPhoneToTelHref(ORLENBD_PUBLIC_PHONE_DISPLAY);
  return {
    supportPhoneDisplay: phone,
    supportPhoneTel: tel,
    supportEmail: m.support_email?.trim() || ORLENBD_PUBLIC_EMAIL,
    addressBlock: m.contact_address?.trim() || ORLENBD_OFFICE_ADDRESS_BLOCK,
    addressSub: m.contact_address_sub?.trim() ?? "",
    mapsOpenUrl: m.google_maps_open_url?.trim() || ORLENBD_GOOGLE_MAPS_OPEN_URL,
    mapsEmbedUrl: m.google_maps_embed_url?.trim() || ORLENBD_GOOGLE_MAPS_EMBED_SRC,
    social: {
      facebook: m.social_facebook_url?.trim() || ORLENBD_SOCIAL_URLS.facebook,
      instagram: m.social_instagram_url?.trim() || (ORLENBD_SOCIAL_URLS.instagram ?? ""),
      x: m.social_x_url?.trim() || ORLENBD_SOCIAL_URLS.x,
      tiktok: m.social_tiktok_url?.trim() || ORLENBD_SOCIAL_URLS.tiktok,
      pinterest: m.social_pinterest_url?.trim() || ORLENBD_SOCIAL_URLS.pinterest,
      youtube: m.social_youtube_url?.trim() || ORLENBD_SOCIAL_URLS.youtube,
      whatsapp: m.social_whatsapp_url?.trim() || ORLENBD_WHATSAPP_URL,
      threads: m.social_threads_url?.trim() || "",
    },
  };
}

export function headerContactTooltip(phoneDisplay: string): string {
  const t = phoneDisplay.trim();
  if (t) return `Call ${t}`;
  return "Contact us";
}
