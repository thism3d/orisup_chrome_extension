/** Canonical layout template IDs (persisted as `storefront_ui_template`). */
export const STOREFRONT_UI_TEMPLATE_IDS = ["orlenbd", "norexbd", "orynbd", "masumtraders", "uttorasteel", "adorashop"] as const;
export type StorefrontUiTemplateId = (typeof STOREFRONT_UI_TEMPLATE_IDS)[number];

/** Norex + Adora share the same minimal editorial chrome (surfaces, spacing, home = `HomeTemplateMinimal`). */
export function isMinimalEditorialTemplate(uiTemplate: StorefrontUiTemplateId): boolean {
  return uiTemplate === "norexbd" || uiTemplate === "adorashop";
}

export function normalizeStorefrontUiTemplateId(raw: string | undefined): StorefrontUiTemplateId {
  const v = raw?.trim();
  if (v && STOREFRONT_UI_TEMPLATE_IDS.includes(v as StorefrontUiTemplateId)) {
    return v as StorefrontUiTemplateId;
  }
  return "orlenbd";
}

/** Layout flags derived from the active storefront UI template. */
export function storefrontLayoutFromTemplate(uiTemplate: StorefrontUiTemplateId) {
  const minimal = isMinimalEditorialTemplate(uiTemplate);
  return {
    containerMaxWidth: minimal ? ("lg" as const) : ("xl" as const),
    /** Narrower cards, less decorative chrome (shop, PDP, cart, wishlist). */
    minimalChrome: minimal,
    /** Category-first marketplace chrome (multi-row header, dense grids). */
    isOrynbd: uiTemplate === "orynbd",
    isOrlenbd: uiTemplate === "orlenbd",
    isNorexbd: uiTemplate === "norexbd",
    /** Fashion / apparel template (minimal home + chrome; distinct brand hooks in nav/footer). */
    isAdoraShop: uiTemplate === "adorashop",
    isMasumTraders: uiTemplate === "masumtraders",
    isUttoraSteel: uiTemplate === "uttorasteel",
  };
}
