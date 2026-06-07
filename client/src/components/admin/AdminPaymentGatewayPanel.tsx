import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiJson } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";

type SettingsMap = Record<string, string>;

const FIELDS: Array<{ key: string; label: string; helper: string; required?: boolean }> = [
  {
    key: "orlenbd_direct_provider_checkout",
    label: "ORLENBD_DIRECT_PROVIDER_CHECKOUT",
    helper: "Use true to enable direct provider checkout.",
    required: true,
  },
  { key: "orlenpay_base_url", label: "ORLENPAY_BASE_URL", helper: "Example: https://pay.orlenbd.com", required: true },
  { key: "orlenpay_public_key", label: "ORLENPAY_PUBLIC_KEY", helper: "Merchant public key used in OrlenPay headers.", required: true },
  { key: "orlenpay_secret_key", label: "ORLENPAY_SECRET_KEY", helper: "Merchant secret key used in OrlenPay headers.", required: true },
  {
    key: "orlenpay_callback_secret",
    label: "ORLENPAY_CALLBACK_SECRET",
    helper:
      "Same value as ORLENPAY_SECRET_KEY (merchant secret-key): verifies X-Callback-Signature as HMAC-SHA256 over the exact JSON body bytes, per AsthaCash webhook docs.",
    required: true,
  },
  {
    key: "orlenbd_public_base_url",
    label: "ORLENBD_PUBLIC_BASE_URL",
    helper: "Public storefront URL for callback/return links (example: https://orlenbd.com).",
    required: true,
  },
];

const MERCHANT_DEFAULTS: SettingsMap = {
  orlenbd_direct_provider_checkout: "true",
  orlenpay_base_url: "https://pay.orlenbd.com",
  orlenpay_public_key: "pk_q9h8SQBoNt8SqPzeZex6MmzcBEC9G01L",
  orlenpay_secret_key: "sk_DYfE4bSfJyVjK38YIvrht6CYF3F7pFy4UyEWyBe4aLBkSqGebznmM3rP0ATe1jsj",
  orlenpay_callback_secret: "sk_DYfE4bSfJyVjK38YIvrht6CYF3F7pFy4UyEWyBe4aLBkSqGebznmM3rP0ATe1jsj",
  orlenbd_public_base_url: "https://orlenbd.com",
};

export function AdminPaymentGatewayPanel() {
  const siteBrand = useSiteBrand();
  const qc = useQueryClient();
  const showToast = useToast();
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [verifyOk, setVerifyOk] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<SettingsMap>({});

  const settingsQ = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiJson<SettingsMap>("/api/admin/settings"),
  });

  const current = settingsQ.data ?? {};
  const effective: SettingsMap = { ...MERCHANT_DEFAULTS, ...current, ...draft };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: SettingsMap = {};
      for (const f of FIELDS) payload[f.key] = String(effective[f.key] ?? "").trim();
      return apiJson<SettingsMap>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (next) => {
      setSaveErr(null);
      setSaveOk(true);
      showToast("Payment gateway settings saved.", "success");
      setDraft({});
      qc.setQueryData(["admin-settings"], next);
      setTimeout(() => setSaveOk(false), 2200);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveErr(msg);
      setSaveOk(false);
      showToast(msg, "error");
    },
  });

  const verifyMut = useMutation({
    mutationFn: async () => {
      const payload = {
        orlenpay_base_url: String(effective.orlenpay_base_url ?? "").trim(),
        orlenpay_public_key: String(effective.orlenpay_public_key ?? "").trim(),
        orlenpay_secret_key: String(effective.orlenpay_secret_key ?? "").trim(),
      };
      return apiJson<{ ok: boolean; message: string }>("/api/admin/payment-gateway/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (r) => {
      setVerifyErr(null);
      const msg = r.message || "Connection successful.";
      setVerifyOk(msg);
      showToast(msg, "success");
    },
    onError: (e) => {
      setVerifyOk(null);
      const msg = e instanceof Error ? e.message : "Connection verification failed";
      setVerifyErr(msg);
      showToast(msg, "error");
    },
  });

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
          <Box component="img" src="/orlenpay-logo.png" alt="" sx={{ height: 30, width: "auto", objectFit: "contain" }} />
          <Typography variant="h6" fontWeight={800}>
            {siteBrand} — payment provider
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Direct checkout settings for <strong>{siteBrand}</strong> (<code>/api/payments/initiate</code> and provider
          callback verification).
        </Typography>
      </Paper>

      {saveOk ? <Alert severity="success">Payment gateway settings saved.</Alert> : null}
      {saveErr ? <Alert severity="error">{saveErr}</Alert> : null}
      {verifyOk ? <Alert severity="success">{verifyOk}</Alert> : null}
      {verifyErr ? <Alert severity="error">{verifyErr}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack spacing={2}>
          {FIELDS.map((f) => {
            const v = effective[f.key] ?? "";
            const missing = f.required && !String(v).trim();
            if (f.key === "orlenbd_direct_provider_checkout") {
              return (
                <FormControl key={f.key} fullWidth size="small" error={missing}>
                  <InputLabel>{f.label}</InputLabel>
                  <Select
                    label={f.label}
                    value={v || "false"}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: String(e.target.value) }))}
                  >
                    <MenuItem value="true">true</MenuItem>
                    <MenuItem value="false">false</MenuItem>
                  </Select>
                </FormControl>
              );
            }
            return (
              <TextField
                key={f.key}
                label={f.label}
                value={v}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                fullWidth
                error={missing}
                helperText={missing ? `${f.helper} (required)` : f.helper}
                size="small"
              />
            );
          })}
        </Stack>

        <Box sx={{ mt: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              disabled={saveMut.isPending || settingsQ.isLoading}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? "Saving..." : "Save gateway settings"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CheckCircleOutlineRoundedIcon />}
              disabled={verifyMut.isPending || settingsQ.isLoading}
              onClick={() => verifyMut.mutate()}
            >
              {verifyMut.isPending ? "Verifying..." : "Verify connection"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
