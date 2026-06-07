import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type StorefrontLang = "en" | "bn";

type StorefrontLanguageContextValue = {
  lang: StorefrontLang;
  setLang: (lang: StorefrontLang) => void;
  toggleLang: () => void;
  text: (en: string, bn: string) => string;
};

const STORE_LANG_KEY = "orlenbd-storefront-lang";

const StorefrontLanguageContext = createContext<StorefrontLanguageContextValue | undefined>(undefined);

function detectLang(): StorefrontLang {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORE_LANG_KEY);
    if (stored === "en" || stored === "bn") return stored;
  }
  /** Default English for all storefronts; Bengali only after explicit toggle (persisted in localStorage). */
  return "en";
}

export function StorefrontLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<StorefrontLang>(() => detectLang());

  const setLang = (next: StorefrontLang) => {
    setLangState(next);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === "en" ? "bn" : "en"));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORE_LANG_KEY, lang);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "bn" ? "bn-BD" : "en";
    }
  }, [lang]);

  const value = useMemo<StorefrontLanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      text: (en, bn) => (lang === "bn" ? bn : en),
    }),
    [lang],
  );

  return <StorefrontLanguageContext.Provider value={value}>{children}</StorefrontLanguageContext.Provider>;
}

export function useStorefrontLanguage() {
  const ctx = useContext(StorefrontLanguageContext);
  if (!ctx) {
    throw new Error("useStorefrontLanguage must be used within StorefrontLanguageProvider");
  }
  return ctx;
}

