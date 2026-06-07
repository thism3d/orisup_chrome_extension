/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_SITE_URL?: string;
  /** When "true", client-side canonical/meta use `window.location.origin` so Helmet stays aligned with www vs apex SSR. Requires server `PUBLIC_ORIGIN_MIRROR_REQUEST_HOST=true`. */
  readonly VITE_PUBLIC_ORIGIN_MIRROR_REQUEST_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
