import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { apiJson } from "@/lib/api";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";
import { SYSTEM_STAFF_ID } from "@shared/systemStaff";

type PeekUser = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
};

type Ctx = {
  openUser: (userId: string) => void;
};

const AdminUserPeekContext = createContext<Ctx | null>(null);

function roleChip(role: string) {
  if (role === "platform_admin") return <Chip size="small" label="Admin" color="error" variant="outlined" />;
  if (role === "vendor_staff") return <Chip size="small" label="Vendor staff" color="info" variant="outlined" />;
  return <Chip size="small" label="Customer" color="default" variant="outlined" />;
}

function AdminUserPeekDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["admin-user-peek", userId],
    queryFn: () => apiJson<PeekUser>(`/api/admin/users/${userId}`),
    enabled: Boolean(userId),
  });
  const u = q.data;
  const avatarSrc = u ? userAvatarImgSrc(u.avatarUrl ?? null) : null;

  return (
    <Dialog open={Boolean(userId)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>User</DialogTitle>
      <DialogContent>
        {q.isLoading ? <Typography sx={{ mt: 1 }}>Loading…</Typography> : null}
        {u ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={avatarSrc ?? undefined} sx={{ width: 56, height: 56 }}>
                {!avatarSrc ? userInitials(u.fullName || u.email || "?") : undefined}
              </Avatar>
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography fontWeight={800}>{u.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {u.email ?? "—"}
                </Typography>
                {u.phone ? (
                  <Typography variant="body2" color="text.secondary">
                    {u.phone}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
            <Box>{roleChip(u.role)}</Box>
            <Typography variant="caption" color="text.secondary">
              Joined {new Date(u.createdAt).toLocaleString()}
            </Typography>
          </Stack>
        ) : null}
        {!q.isLoading && q.isError ? (
          <Typography color="error" sx={{ mt: 1 }}>
            Could not load user.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminUserPeekProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const openUser = useCallback((id: string) => {
    if (!id || id === SYSTEM_STAFF_ID) return;
    setUserId(id);
  }, []);
  const v = useMemo(() => ({ openUser }), [openUser]);

  return (
    <AdminUserPeekContext.Provider value={v}>
      {children}
      <AdminUserPeekDialog userId={userId} onClose={() => setUserId(null)} />
    </AdminUserPeekContext.Provider>
  );
}

export function useAdminUserPeek(): Ctx | null {
  return useContext(AdminUserPeekContext);
}
