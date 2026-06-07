let gsiLoad: Promise<void> | null = null;

export function ensureGoogleGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoad) {
    gsiLoad = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-orlenbd-gsi="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Google script failed")));
        return;
      }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.dataset.orlenbdGsi = "1";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load Google Sign-In"));
      document.head.appendChild(s);
    });
  }
  return gsiLoad;
}
