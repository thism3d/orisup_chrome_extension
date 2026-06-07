import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type StoreAuthModalTab = "login" | "register";

type Ctx = {
  open: boolean;
  tab: StoreAuthModalTab;
  openLogin: () => void;
  openRegister: () => void;
  setTab: (t: StoreAuthModalTab) => void;
  close: () => void;
};

const StoreAuthModalContext = createContext<Ctx | null>(null);

export function StoreAuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StoreAuthModalTab>("login");

  const openLogin = useCallback(() => {
    setTab("login");
    setOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setTab("register");
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      tab,
      openLogin,
      openRegister,
      setTab,
      close,
    }),
    [open, tab, openLogin, openRegister, close],
  );

  return <StoreAuthModalContext.Provider value={value}>{children}</StoreAuthModalContext.Provider>;
}

export function useStoreAuthModal() {
  const v = useContext(StoreAuthModalContext);
  if (!v) throw new Error("useStoreAuthModal outside StoreAuthModalProvider");
  return v;
}

export function useStoreAuthModalOptional() {
  return useContext(StoreAuthModalContext);
}
