import { useState } from "react";
import { Box, Button, Container, Paper, Stack, TextField, Typography, Alert, ToggleButtonGroup, ToggleButton, Fade } from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";

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

type Mode = "email" | "phone";

export function ForgotPasswordPage() {
  const brand = useSiteBrand();
  const [, setLoc] = useLocation();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState("");

  const forgotMut = useMutation({
    mutationFn: (body: { email?: string; phone?: string }) =>
      apiJson<{ ok: true; message: string; method: "email" | "phone" }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data, vars) => {
      if (data.method === "phone" && vars.phone) {
        // Store phone in sessionStorage so it doesn't appear in the URL
        sessionStorage.setItem("otp_reset_phone", vars.phone);
        setLoc("/reset-password");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");
    forgotMut.reset();

    if (mode === "email") {
      const eVal = email.trim();
      if (!eVal) {
        setFieldError("Email is required");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eVal)) {
        setFieldError("Invalid email address");
        return;
      }
      forgotMut.mutate({ email: eVal });
    } else {
      const pVal = phone.trim();
      if (!pVal) {
        setFieldError("Phone number is required");
        return;
      }
      if (!isValidBDPhone(pVal)) {
        setFieldError("Please input valid number");
        return;
      }
      forgotMut.mutate({ phone: normalizeBDPhone(pVal) });
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}>
      <Seo
        title={`Forgot Password - ${brand}`}
        description={`Recover your ${brand} account password.`}
        noindex
        canonicalPath="/forgot-password"
      />
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          Forgot Password
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          {mode === "email" 
            ? "Enter your email address and we'll send you a link to reset your password."
            : "Enter your phone number and we'll send you an OTP via SMS."}
        </Typography>

        {forgotMut.isSuccess && forgotMut.data.method === "email" ? (
          <Stack spacing={3}>
            <Alert severity="success">{forgotMut.data.message}</Alert>
            <Button component={Link} href="/login" variant="contained" fullWidth>
              Return to Login
            </Button>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => {
                  if (v) {
                    setMode(v as Mode);
                    setFieldError("");
                    forgotMut.reset();
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

              {mode === "email" ? (
                <TextField
                  key="forgot-email"
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!fieldError}
                  helperText={fieldError || undefined}
                />
              ) : (
                <TextField
                  key="forgot-phone"
                  label="Phone number"
                  type="tel"
                  fullWidth
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={!!fieldError}
                  helperText={fieldError || undefined}
                />
              )}

              {forgotMut.isError && (
                <Typography color="error" variant="body2">
                  {(forgotMut.error as Error)?.message || "An error occurred."}
                </Typography>
              )}

              <Button type="submit" variant="contained" disabled={forgotMut.isPending} fullWidth>
                {mode === "email" ? "Send Reset Link" : "Send OTP"}
              </Button>

              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                Remember your password? <Link href="/login">Log in</Link>
              </Typography>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
