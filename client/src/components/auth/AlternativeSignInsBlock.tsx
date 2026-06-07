import { Divider, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { PasskeySignInBlock } from "./PasskeySignInBlock";
import { SocialOAuthIconsRow } from "./SocialOAuthIconsRow";

type Props = {
  mode: "storefront" | "admin";
  disabled?: boolean;
  getSuggestedEmail?: () => string;
  onAuthenticated: (user: SessionUser) => void | Promise<void>;
};

type PublicAuthConfig = {
  googleClientId: string;
  facebookAppId: string;
  passkeysEnabled: boolean;
};

/**
 * Divider + passkey (when enabled) + Google/Facebook icons when configured.
 */
export function AlternativeSignInsBlock({ mode, disabled, getSuggestedEmail, onAuthenticated }: Props) {
  const { data: cfg } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const hasOAuth = !!(cfg?.googleClientId?.trim() || cfg?.facebookAppId?.trim());
  const hasPasskeys = !!cfg?.passkeysEnabled;

  if (!cfg) return null;
  if (!hasOAuth && !hasPasskeys) return null;

  return (
    <>
      <Divider sx={{ my: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          {mode === "admin" ? "Or continue with" : "Or continue with"}
        </Typography>
      </Divider>
      <Stack spacing={2}>
        {hasPasskeys ? (
          <PasskeySignInBlock
            mode={mode}
            disabled={disabled}
            getSuggestedEmail={getSuggestedEmail}
            onAuthenticated={(u) => void onAuthenticated(u)}
          />
        ) : null}
        {hasOAuth ? (
          <SocialOAuthIconsRow mode={mode} disabled={disabled} onSuccess={(u) => void onAuthenticated(u)} />
        ) : null}
      </Stack>
    </>
  );
}
