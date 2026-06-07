declare global {
  interface Window {
    FB?: {
      init(opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }): void;
      login(
        callback: (r: { authResponse?: { accessToken?: string } }) => void,
        opts?: { scope: string },
      ): void;
    };
    fbAsyncInit?: () => void;
  }
}

const FB_SDK_MS = 15_000;

/** Loads Facebook SDK once and initializes — same app ID expected for one page session. */
export function ensureFacebookSdk(appId: string): Promise<void> {
  const id = appId.trim();
  if (!id) return Promise.reject(new Error("Facebook app ID missing"));

  const inner = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Facebook SDK requires a browser"));
      return;
    }

    const initFb = () => {
      try {
        window.FB?.init({ appId: id, cookie: true, xfbml: false, version: "v21.0" });
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    if (window.FB) {
      initFb();
      return;
    }

    const previous = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      previous?.();
      initFb();
    };

    const scriptId = "facebook-jssdk";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(s);
    }
  });

  let to: ReturnType<typeof globalThis.setTimeout> | undefined;
  const deadline = new Promise<void>((_, reject) => {
    to = globalThis.setTimeout(() => reject(new Error("Facebook Login timed out — check network or ad blockers.")), FB_SDK_MS);
  });

  return Promise.race([inner, deadline]).finally(() => {
    if (to !== undefined) globalThis.clearTimeout(to);
  });
}
