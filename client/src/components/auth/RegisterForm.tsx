import { useState, useMemo } from "react";
import {
  Button,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Box,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { SocialOAuthIconsRow } from "@/components/auth/SocialOAuthIconsRow";
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

const schema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine(isValidBDPhone, {
        message: "Please input valid number",
      }),
    password: z
      .string()
      .min(6, "Minimum 6 characters required")
      .refine((v) => /[a-zA-Z]/.test(v), { message: "Must include a letter" })
      .refine((v) => /\d/.test(v), { message: "Must include a number" }),
  });

type FormValues = z.infer<typeof schema>;

type RegisterFormProps = {
  /** In modal, skip full-page redirect and use callbacks instead of `/login` link. */
  variant?: "page" | "modal";
  onRegistered?: () => void;
  onRequestLogin?: () => void;
};

/* ─── Password requirement checks (6+ chars, letter, number) ─── */
const pwRules = [
  { key: "len", label: "6+ chars", labelBn: "৬+ অক্ষর", test: (v: string) => v.length >= 6 },
  { key: "letter", label: "letter", labelBn: "অক্ষর", test: (v: string) => /[a-zA-Z]/.test(v) },
  { key: "digit", label: "number", labelBn: "সংখ্যা", test: (v: string) => /\d/.test(v) },
] as const;

export function RegisterForm(props: RegisterFormProps = {}) {
  const { variant = "page", onRegistered, onRequestLogin } = props;
  const [, setLoc] = useLocation();
  const modal = useStoreAuthModalOptional();
  const { text } = useStorefrontLanguage();
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const [showPassword, setShowPassword] = useState(false);

  const passwordValue = form.watch("password") ?? "";

  const ruleResults = useMemo(
    () => pwRules.map((r) => ({ ...r, met: r.test(passwordValue) })),
    [passwordValue],
  );

  const afterAuth = () => {
    void qc.invalidateQueries({ queryKey: ["me"] });
    if (onRegistered) onRegistered();
    else setLoc("/");
  };

  const reg = useMutation({
    mutationFn: (body: FormValues) =>
      apiJson("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void afterAuth();
    },
  });

  return (
    <form onSubmit={form.handleSubmit((v) => reg.mutate({ ...v, phone: normalizeBDPhone(v.phone) }))}>
      <Stack spacing={2} sx={{ pt: 2 }}>
        <TextField
          label={text("Full name", "পূর্ণ নাম")}
          required
          {...form.register("fullName")}
          error={!!form.formState.errors.fullName}
          helperText={form.formState.errors.fullName?.message}
        />
        <TextField
          label={text("Email", "ইমেইল")}
          type="email"
          required
          {...form.register("email")}
          error={!!form.formState.errors.email}
          helperText={form.formState.errors.email?.message}
        />
        <TextField
          label={text("Phone number", "ফোন নম্বর")}
          required
          {...form.register("phone")}
          error={!!form.formState.errors.phone}
          helperText={form.formState.errors.phone?.message}
        />
        <TextField
          label={text("Password", "পাসওয়ার্ড")}
          type={showPassword ? "text" : "password"}
          required
          {...form.register("password")}
          error={!!form.formState.errors.password}
          helperText={form.formState.errors.password?.message}
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
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Compact single-line password requirements */}
        {passwordValue.length > 0 && (
          <Box sx={{ mt: -0.5, display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            {ruleResults.map((r) => (
              <Box
                key={r.key}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
              >
                {r.met ? (
                  <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 14, color: "error.main" }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: r.met ? "success.main" : "text.secondary", fontSize: "0.7rem", lineHeight: 1 }}
                >
                  {text(r.label, r.labelBn)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {reg.isError && (
          <Typography color="error" variant="body2">
            {(reg.error as Error).message}
          </Typography>
        )}
        <Button type="submit" variant="contained" disabled={reg.isPending}>
          {text("Create account", "অ্যাকাউন্ট তৈরি করুন")}
        </Button>
        <SocialOAuthIconsRow
          dividerLabel={text("or sign up with", "অথবা সাইন আপ করুন")}
          mode="storefront"
          disabled={reg.isPending}
          onSuccess={async () => {
            await qc.invalidateQueries({ queryKey: ["me"] });
            if (onRegistered) onRegistered();
            else setLoc("/");
          }}
        />
        <Typography variant="body2" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
          <span>
            {text("Have an account?", "ইতোমধ্যে অ্যাকাউন্ট আছে?")}{" "}
            {variant === "modal" && onRequestLogin ? (
              <Typography
                component="button"
                type="button"
                variant="body2"
                onClick={onRequestLogin}
                sx={{
                  border: "none",
                  background: "none",
                  p: 0,
                  cursor: "pointer",
                  color: "primary.main",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                {text("Sign in", "সাইন ইন")}
              </Typography>
            ) : (
              <Link href="/login">{text("Login", "লগইন")}</Link>
            )}
          </span>
          <Typography
            component="span"
            variant="body2"
            color="primary"
            onClick={() => {
              if (modal?.close) modal.close();
              setLoc("/forgot-password");
            }}
            sx={{ cursor: 'pointer', "&:hover": { textDecoration: 'underline' } }}
          >
            Forgot password?
          </Typography>
        </Typography>
      </Stack>
    </form>
  );
}
