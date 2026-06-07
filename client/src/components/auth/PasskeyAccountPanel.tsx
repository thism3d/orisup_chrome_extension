import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { webAuthnRegisterErrorMessage } from "@/lib/webAuthnUserMessage";

type Row = { id: string; credentialId: string; label: string | null; createdAt: string };

type PublicAuthConfig = { googleClientId: string; facebookAppId: string; passkeysEnabled: boolean };

type Props = {
  /** Shown as card title / description context */
  title?: string;
  dense?: boolean;
};

function isLikelyDesktopBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return !/Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Prefer platform/WebAuthn `localDevice` enrollment (Hello, Touch ID, etc.). */
function platformEnrollmentLabel(): string {
  if (typeof navigator === "undefined") return "This computer";
  if (/Windows/i.test(navigator.userAgent)) return "Windows Hello (this PC)";
  if (/Mac OS X|Macintosh/i.test(navigator.userAgent)) return "Touch ID / this Mac";
  return "This computer (PIN or device key)";
}

export function PasskeyAccountPanel({ title = "Passkeys", dense }: Props) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ["auth-public-config"],
    queryFn: () => apiJson<PublicAuthConfig>("/api/auth/public-config"),
    staleTime: 60_000,
  });

  const listQ = useQuery({
    queryKey: ["me-passkeys"],
    queryFn: () => apiJson<Row[]>("/api/me/passkeys"),
    enabled: !!cfg?.passkeysEnabled,
  });

  const enroll = useMutation({
    mutationFn: async (opts?: { preferWindowsHelloPc?: boolean }) => {
      const preferPlatformAuthenticator = !!opts?.preferWindowsHelloPc;
      const raw = await apiJson<{ options: PublicKeyCredentialCreationOptionsJSON; challengeId: string }>(
        "/api/me/passkeys/register-options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferPlatformAuthenticator }),
        },
      );
      let credential;
      try {
        credential = await startRegistration({ optionsJSON: raw.options });
      } catch (e) {
        throw new Error(webAuthnRegisterErrorMessage(e));
      }
      const nowLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(),
      );
      const defaultLabel =
        typeof navigator !== "undefined"
          ? `${navigator.userAgent.includes("Mobile") ? "Mobile" : "Device"} — ${nowLabel}`
          : undefined;
      const label = preferPlatformAuthenticator ? `${platformEnrollmentLabel()} — ${nowLabel}` : defaultLabel;

      await apiJson("/api/me/passkeys/register-verify", {
        method: "POST",
        body: JSON.stringify({
          challengeId: raw.challengeId,
          credential,
          label,
        }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me-passkeys"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => apiJson(`/api/me/passkeys/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me-passkeys"] });
    },
  });

  if (cfg && !cfg.passkeysEnabled) {
    return (
      <Typography variant="body2" color="text.secondary">
        Passkeys are disabled on this server.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Use a passkey to sign in faster — PIN, fingerprint, or face where your browser supports it.{" "}
          {isLikelyDesktopBrowser()
            ? "Use “This computer” below to tie the passkey to Windows Hello, Touch ID, or your OS device lock — independent of synced phone/Google password-manager passkeys."
            : ""}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size={dense ? "small" : "medium"}
            disabled={enroll.isPending}
            onClick={() => enroll.mutate(undefined)}
            sx={{ fontWeight: 700 }}
          >
            Register a passkey
          </Button>
          {isLikelyDesktopBrowser() ? (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="secondary"
              size={dense ? "small" : "medium"}
              disabled={enroll.isPending}
              onClick={() => enroll.mutate({ preferWindowsHelloPc: true })}
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              {typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
                ? "Register with Windows Hello"
                : "Register on this computer"}
            </Button>
          ) : null}
        </Stack>
        {enroll.isError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {(enroll.error as Error).message}
          </Alert>
        ) : null}
      </Box>

      {listQ.isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading passkeys…
        </Typography>
      ) : (
        <List dense disablePadding>
          {(listQ.data ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No passkeys yet. Add one to sign in without a password.
            </Typography>
          ) : (
            (listQ.data ?? []).map((p) => (
              <ListItem
                key={p.id}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={p.label || "Passkey"}
                  secondary={new Date(p.createdAt).toLocaleString()}
                  primaryTypographyProps={{ fontWeight: 700 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="Remove passkey"
                    onClick={() => del.mutate(p.id)}
                    disabled={del.isPending}
                    size="small"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      )}
    </Stack>
  );
}
