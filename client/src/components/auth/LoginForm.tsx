import { useState, useMemo } from "react";
import {
  Button,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { Link, useLocation } from "wouter";
import { AlternativeSignInsBlock } from "@/components/auth/AlternativeSignInsBlock";
import { useStoreAuthModalOptional } from "@/contexts/StoreAuthModalContext";

/** Validate Bangladeshi phone number (+8801..., 8801..., 01..., 1...). */
function isValidBDPhone(raw: string): boolean {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  return /^(?:\+?88)?0?1[3-9]\d{8}$/.test(cleaned);
}

/** Normalize any accepted BD phone format to +8801XXXXXXXXX. */
function normalizeBDPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  const m = cleaned.match(/^(?:\+?88)?0?(1[3-9]\d{8})$/);
  return m ? `+880${m[1]}` : cleaned;
}

type LoginMode = "email" | "phone";

type FormValues = { email: string; phone: string; password: string };

type LoginResponse = { user: SessionUser };

type Props = {
  /** Runs after session is established and `me` is invalidated. Return a promise to wait before clearing pending state. */
  onLoginSuccess?: (user: SessionUser) => void | Promise<void>;
  /** If this returns `true`, the mutation is reset and the error is not shown (e.g. redirect handled by parent). */
  onLoginFailure?: (error: Error, body: Record<string, string>) => boolean;
  /** Prefill email (e.g. after redirect from store login). */
  defaultEmail?: string;
  showRegisterLink?: boolean;
  /** Storefront: `/api/auth/login`. Admin portal: `/api/auth/admin/login`. */
  loginEndpoint?: string;
};

export function LoginForm({
  onLoginSuccess,
  onLoginFailure,
  defaultEmail = "",
  showRegisterLink = true,
  loginEndpoint = "/api/auth/login",
}: Props) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const modal = useStoreAuthModalOptional();
  const passkeyMode = loginEndpoint.includes("admin/login") ? "admin" : "storefront";

  const [mode, setMode] = useState<LoginMode>(defaultEmail ? "email" : "email");
  const [showPassword, setShowPassword] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({ email: defaultEmail, phone: "", password: "" }),
    [defaultEmail],
  );
  const form = useForm<FormValues>({ defaultValues: defaults });

  /* ── Local validation state for inline errors ── */
  const [fieldError, setFieldError] = useState("");

  const login = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiJson<LoginResponse>(loginEndpoint, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      await onLoginSuccess?.(data.user);
    },
    onError: (err, variables) => {
      if (onLoginFailure?.(err as Error, variables)) {
        login.reset();
      }
    },
  });

  const handleSubmit = form.handleSubmit((v) => {
    setFieldError("");
    login.reset();

    if (mode === "email") {
      const email = v.email.trim();
      if (!email) {
        setFieldError("Email is required");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("Invalid email address");
        return;
      }
      login.mutate({ email, password: v.password });
    } else {
      const phone = v.phone.trim();
      if (!phone) {
        setFieldError("Phone number is required");
        return;
      }
      if (!isValidBDPhone(phone)) {
        setFieldError("Please input valid number");
        return;
      }
      login.mutate({ phone: normalizeBDPhone(phone), password: v.password });
    }
  });

  const combinedError =
    fieldError ||
    (form.formState.errors.root?.message as string) ||
    (login.isError ? (login.error as Error)?.message : "");

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2} sx={{ pt: 2 }}>
        {/* ── Email / Phone toggle ── */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => {
            if (v) {
              setMode(v as LoginMode);
              setFieldError("");
              login.reset();
            }
          }}
          size="small"
          fullWidth
          sx={{
            borderRadius: 2,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              py: 0.75,
              borderRadius: 2,
              gap: 0.75,
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              },
            },
          }}
        >
          <ToggleButton value="email">
            <EmailRoundedIcon fontSize="small" /> Email
          </ToggleButton>
          <ToggleButton value="phone">
            <PhoneRoundedIcon fontSize="small" /> Phone
          </ToggleButton>
        </ToggleButtonGroup>

        {/* ── Credential field (single slot, no layout shift) ── */}
        {mode === "email" ? (
          <TextField
            key="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
            error={!!fieldError}
            helperText={fieldError || undefined}
          />
        ) : (
          <TextField
            key="login-phone"
            label="Phone number"
            autoComplete="tel"
            {...form.register("phone")}
            error={!!fieldError}
            helperText={fieldError || undefined}
          />
        )}

        {/* ── Password ── */}
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          {...form.register("password")}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((p) => !p)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {/* ── Forgot password ── */}
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: -1 }}>
          <Typography
            variant="body2"
            color="primary"
            onClick={() => {
              if (modal?.close) modal.close();
              setLocation("/forgot-password");
            }}
            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          >
            Forgot password?
          </Typography>
        </Stack>

        {/* ── Error ── */}
        {combinedError && (
          <Typography color="error" variant="body2">
            {combinedError}
          </Typography>
        )}

        {/* ── Submit ── */}
        <Button
          type="submit"
          variant="contained"
          disabled={login.isPending}
          sx={{ fontWeight: 700, py: 1.2, borderRadius: 2 }}
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>

        {/* ── Alternative sign-ins ── */}
        <AlternativeSignInsBlock
          mode={passkeyMode}
          disabled={login.isPending}
          getSuggestedEmail={() => form.watch("email").trim()}
          onAuthenticated={async (u) => {
            await onLoginSuccess?.(u);
          }}
        />

        {/* ── Register link ── */}
        {showRegisterLink ? (
          <Typography variant="body2">
            No account? <Link href="/register">Register</Link>
          </Typography>
        ) : null}
      </Stack>
    </form>
  );
}
