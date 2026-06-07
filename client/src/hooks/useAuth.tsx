import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiJson<{ user: SessionUser | null }>("/api/auth/me"),
  });

  const logout = useCallback(async () => {
    await apiJson("/api/auth/logout", { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["me"] });
    await qc.invalidateQueries({ queryKey: ["cart"] });
  }, [qc]);

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      loading: isLoading,
      refetch: () => {
        void refetch();
      },
      logout,
    }),
    [data?.user, isLoading, refetch, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
