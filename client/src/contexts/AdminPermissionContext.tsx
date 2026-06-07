import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api";
import {
  type AdminModuleKey,
  type AdminPermissionMatrix,
  createFullAccessMatrix,
  isAllowed,
} from "@shared/adminPermissions";

type Ctx = {
  loading: boolean;
  adminRoleId: string | null;
  matrix: AdminPermissionMatrix;
  can: (module: AdminModuleKey, action: "view" | "create" | "edit" | "delete") => boolean;
  reload: () => Promise<void>;
};

const AdminPermissionContext = createContext<Ctx | null>(null);

type MeRes = { adminRoleId: string | null; permissions: AdminPermissionMatrix };

export function AdminPermissionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [adminRoleId, setAdminRoleId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<AdminPermissionMatrix>(createFullAccessMatrix);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<MeRes>("/api/admin/permissions/me");
      setAdminRoleId(data.adminRoleId);
      setMatrix(data.permissions ?? createFullAccessMatrix());
    } catch {
      setMatrix(createFullAccessMatrix());
      setAdminRoleId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const can = useCallback(
    (module: AdminModuleKey, action: "view" | "create" | "edit" | "delete") =>
      isAllowed(matrix, module, action),
    [matrix],
  );

  const v = useMemo(
    () => ({ loading, adminRoleId, matrix, can, reload: load }),
    [loading, adminRoleId, matrix, can, load],
  );

  return <AdminPermissionContext.Provider value={v}>{children}</AdminPermissionContext.Provider>;
}

export function useAdminPermission() {
  const c = useContext(AdminPermissionContext);
  if (!c) throw new Error("useAdminPermission must be used inside AdminPermissionProvider");
  return c;
}
