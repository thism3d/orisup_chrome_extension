import { Button, Typography } from "@mui/material";
import KeyIcon from "@mui/icons-material/VpnKey";
import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { webAuthnSignInErrorMessage } from "@/lib/webAuthnUserMessage";

type Props = {
  mode: "storefront" | "admin";
  /** When set and looks like email, restricts passkeys to that account only. Otherwise uses discoverable / autofill UX. */
  getSuggestedEmail?: () => string;
  disabled?: boolean;
  onAuthenticated: (user: SessionUser) => void;
};

type AuthOptsRes = {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
};

type PublicAuthConfig = {
  googleClientId: string;
  facebookAppId: string;
  passkeysEnabled: boolean;
};

export function PasskeySignInBlock({ mode, getSuggestedEmail, disabled, onAuthenticated }: Props) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const passDone = useMutation({
    mutationFn: async (): Promise<{ user: SessionUser }> => {
      const hinted = getSuggestedEmail?.()?.trim().toLowerCase() ?? "";
      /** Admin UX: omit email hint so Chromium uses conditional/discoverable passkeys correctly with Google Password Manager on desktop. */
      const emailCandidate =
        mode === "admin" ? undefined : hinted.includes("@") ? hinted : undefined;
      const start = await apiJson<AuthOptsRes>("/api/auth/passkey/login-options", {
        method: "POST",
        body: JSON.stringify({
          mode,
          ...(emailCandidate ? { email: emailCandidate } : {}),
        }),
      });
      let credential;
      try {
        credential = await startAuthentication({ optionsJSON: start.options });
      } catch (e) {
        throw new Error(webAuthnSignInErrorMessage(e));
      }
      return apiJson<{ user: SessionUser }>("/api/auth/passkey/login-verify", {
        method: "POST",
        body: JSON.stringify({
          mode,
          challengeId: start.challengeId,
          credential,
        }),
      });
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      void onAuthenticated(data.user);
    },
  });

  if (cfg && !cfg.passkeysEnabled) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        fullWidth
        size="large"
        startIcon={<KeyIcon />}
        disabled={disabled || passDone.isPending}
        onClick={() => passDone.mutate()}
        sx={{ fontWeight: 700, textTransform: "none" }}
      >
        {mode === "admin" ? "Sign in with passkey" : "Sign in with passkey"}
      </Button>
      {passDone.isError ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {(passDone.error as Error).message}
        </Typography>
      ) : null}
    </>
  );
}
