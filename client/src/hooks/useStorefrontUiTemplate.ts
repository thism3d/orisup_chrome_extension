import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { storefrontLayoutFromTemplate, type StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";

/** Resolved layout template + shared container/UX flags for storefront pages (from layout context). */
export function useStorefrontUiTemplate(): {
  uiTemplate: StorefrontUiTemplateId;
  containerMaxWidth: "lg" | "xl";
  minimalChrome: boolean;
  isOrynbd: boolean;
  isOrlenbd: boolean;
  isNorexbd: boolean;
  isAdoraShop: boolean;
  isMasumTraders: boolean;
  isUttoraSteel: boolean;
} {
  const uiTemplate = useStorefrontLayoutTemplate();
  return {
    uiTemplate,
    ...storefrontLayoutFromTemplate(uiTemplate),
  };
}
