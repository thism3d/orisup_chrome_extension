import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Facebook as FacebookIcon } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { ensureFacebookSdk } from "./fbSdk";

type Props = {
  mode: "storefront" | "admin";
  disabled?: boolean;
  variant?: "icon" | "inline";
  onSuccess: (user: SessionUser) => void;
  onError?: (message: string) => void;
};

type PublicAuthConfig = {
  googleClientId: string;
  facebookAppId: string;
  passkeysEnabled: boolean;
};

export function FacebookSignInButton({ mode, disabled, variant = "icon", onSuccess, onError }: Props) {
  const qc = useQueryClient();

  const { data: cfg } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const appId = cfg?.facebookAppId?.trim();

  const finish = useMutation({
    mutationFn: (accessToken: string) =>
      apiJson<{ user: SessionUser }>("/api/auth/facebook", {
        method: "POST",
        body: JSON.stringify({ accessToken, mode }),
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      onSuccess(data.user);
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Facebook login failed.";
      onError?.(msg);
    },
  });

  const onClickFacebook = useCallback(async () => {
    if (!appId || disabled || finish.isPending) return;
    try {
      await ensureFacebookSdk(appId);
      window.FB!.login(
        (r) => {
          const tok = r.authResponse?.accessToken;
          if (tok) finish.mutate(tok);
          else onError?.("Facebook login cancelled or did not grant access.");
        },
        { scope: "public_profile,email" },
      );
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Facebook SDK unavailable.");
    }
  }, [appId, disabled, finish, onError]);

  if (!appId) return null;

  const iconBtn = (
    <IconButton
      type="button"
      color="primary"
      disabled={disabled || finish.isPending}
      onClick={() => void onClickFacebook()}
      aria-label={mode === "admin" ? "Sign in with Facebook" : "Continue with Facebook"}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        bgcolor: variant === "icon" ? "#1877F2" : undefined,
        color: variant === "icon" ? "#fff" : "primary.main",
        width: variant === "icon" ? 48 : undefined,
        height: variant === "icon" ? 48 : undefined,
        "&:hover": variant === "icon" ? { bgcolor: "#1565C0" } : {},
      }}
    >
      {finish.isPending ? <CircularProgress size={22} color="inherit" /> : <FacebookIcon />}
    </IconButton>
  );

  return (
    <Stack alignItems="center" spacing={0.5}>
      <Box sx={{ position: "relative" }}>
        {variant === "icon" ? (
          <Tooltip title="Facebook">{iconBtn}</Tooltip>
        ) : (
          iconBtn
        )}
      </Box>
      {finish.isError ? (
        <Typography variant="caption" color="error" sx={{ maxWidth: 280, textAlign: "center" }}>
          {(finish.error instanceof Error ? finish.error.message : String(finish.error)) || "Facebook login failed."}
        </Typography>
      ) : null}
    </Stack>
  );
}
