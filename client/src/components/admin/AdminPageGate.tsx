import { Box, CircularProgress, Typography } from "@mui/material";
import { useLocation } from "wouter";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { adminModuleForPath } from "@/lib/adminPathModule";

export function AdminPageGate({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const { loading, can } = useAdminPermission();
  const mod = adminModuleForPath(path);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!can(mod, "view")) {
    return (
      <Box sx={{ py: 6, textAlign: "center", maxWidth: 480, mx: "auto" }}>
        <Typography fontWeight={800} gutterBottom>
          Access denied
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Your role does not include access to this area. Ask a platform administrator to update your admin access
          role.
        </Typography>
      </Box>
    );
  }
  return <>{children}</>;
}
