import { createContext, useContext, type ReactNode } from "react";
import type { StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";

const StorefrontUiTemplateContext = createContext<StorefrontUiTemplateId | null>(null);

export function StorefrontUiTemplateProvider({
  value,
  children,
}: {
  value: StorefrontUiTemplateId;
  children: ReactNode;
}) {
  return (
    <StorefrontUiTemplateContext.Provider value={value}>{children}</StorefrontUiTemplateContext.Provider>
  );
}

/** Active storefront layout template (orlenbd / norexbd / orynbd). Defaults to orlenbd outside the provider. */
export function useStorefrontLayoutTemplate(): StorefrontUiTemplateId {
  return useContext(StorefrontUiTemplateContext) ?? "orlenbd";
}
