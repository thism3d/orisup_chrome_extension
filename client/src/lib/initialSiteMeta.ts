const INITIAL_SITE_META_KEY = "__ORLENBD_INITIAL_SITE_META__";

export function readInitialSiteMeta(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = (window as unknown as Record<string, unknown>)[INITIAL_SITE_META_KEY];
  if (!raw || typeof raw !== "object") return undefined;
  return raw as Record<string, string>;
}

