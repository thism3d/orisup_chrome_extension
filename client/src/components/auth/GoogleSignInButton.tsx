import { Box, CircularProgress, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { ensureGoogleGsiScript } from "./gsiScript";

type Props = {
  mode: "storefront" | "admin";
  disabled?: boolean;
  /** Compact icon-only button — use next to Facebook in a toolbar row. */
  presentation?: "standard" | "icon";
  onSuccess: (user: SessionUser) => void;
  onError?: (message: string) => void;
};

type PublicAuthConfig = { googleClientId: string; facebookAppId: string; passkeysEnabled: boolean };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string;
            callback: (r: { credential: string }) => void;
            ux_mode?: string;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: string | number;
              locale?: string;
            },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ mode, disabled, presentation = "standard", onSuccess, onError }: Props) {
  const qc = useQueryClient();
  const holderRef = useRef<HTMLDivElement | null>(null);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const clientId = cfg?.googleClientId?.trim();

  const finish = useMutation({
    mutationFn: (credential: string) =>
      apiJson<{ user: SessionUser }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential, mode }),
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      onSuccess(data.user);
    },
    onError: (e: Error) => {
      onError?.(e.message || "Google sign-in failed");
    },
  });

  useEffect(() => {
    if (!clientId || disabled || !holderRef.current) return;
    let cancelled = false;
    const el = holderRef.current;

    void (async () => {
      try {
        await ensureGoogleGsiScript();
      } catch {
        if (!cancelled) onError?.("Could not load Google Sign-In.");
        return;
      }
      if (cancelled || !el) return;
      const g = window.google;
      if (!g?.accounts?.id) {
        onError?.("Google Sign-In unavailable in this browser.");
        return;
      }
      window.google?.accounts?.id.cancel();
      g.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          if (resp?.credential) finish.mutate(resp.credential);
        },
        ux_mode: "popup",
      });
      el.innerHTML = "";
      g.accounts.id.renderButton(el, {
        theme: "outline",
        size: presentation === "icon" ? "large" : "large",
        type: presentation === "icon" ? "icon" : "standard",
        text: mode === "admin" ? "continue_with" : "signin_with",
        ...(presentation === "icon" ? {} : { width: "100%" }),
      });
    })();

    return () => {
      cancelled = true;
      window.google?.accounts?.id.cancel();
    };
  }, [clientId, disabled, mode, presentation, finish.mutate, onError]);

  if (cfgLoading || !cfg) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!clientId) {
    return presentation === "icon" ? null : (
      <Typography variant="body2" color="text.secondary">
        Google Sign-In is not configured. Set <code>GOOGLE_CLIENT_ID</code> on the server or the Google OAuth Client ID under{" "}
        <strong>Admin → Settings → Sign-in & passkeys</strong>.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: presentation === "icon" ? "auto" : 1,
        opacity: disabled || finish.isPending ? 0.6 : 1,
        display: presentation === "icon" ? "inline-flex" : "block",
      }}
    >
      <div ref={holderRef} />
      {finish.isPending ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.paper",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        >
          <CircularProgress size={22} />
        </Box>
      ) : null}
      {finish.isError ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {(finish.error as Error).message}
        </Typography>
      ) : null}
    </Box>
  );
}
