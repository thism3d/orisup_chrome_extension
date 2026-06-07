import { Divider, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { FacebookSignInButton } from "./FacebookSignInButton";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

export type PublicAuthConfig = {
  googleClientId: string;
  facebookAppId: string;
  passkeysEnabled: boolean;
};

type Props = {
  mode: "storefront" | "admin";
  disabled?: boolean;
  onSuccess: (user: SessionUser) => void;
  /** When OAuth is enabled, renders a labelled divider above the icon row. */
  dividerLabel?: ReactNode;
};

/** Circular Google + Facebook icons; hidden when neither provider is available. */
export function SocialOAuthIconsRow({ mode, disabled, onSuccess, dividerLabel }: Props) {
  const { data: cfg } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const hasGoogle = !!cfg?.googleClientId?.trim();
  const hasFacebook = !!cfg?.facebookAppId?.trim();

  if (!hasGoogle && !hasFacebook) return null;

  const row = (
    <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
      {hasGoogle ? (
        <Tooltip title="Google">
          <span>
            <GoogleSignInButton presentation="icon" mode={mode} disabled={disabled} onSuccess={onSuccess} />
          </span>
        </Tooltip>
      ) : null}
      {hasFacebook ? <FacebookSignInButton variant="icon" mode={mode} disabled={disabled} onSuccess={onSuccess} /> : null}
    </Stack>
  );

  if (!dividerLabel) return row;

  return (
    <Stack spacing={2}>
      <Divider sx={{ my: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }} component="span">
          {dividerLabel}
        </Typography>
      </Divider>
      {row}
    </Stack>
  );
}
