import { useState } from "react";
import { Box, Button, Container, Paper, Stack, TextField, Typography, Alert, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";

export function ResetPasswordPage() {
  const brand = useSiteBrand();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  // Read phone from sessionStorage (set by ForgotPasswordPage)
  const [phone] = useState(() => sessionStorage.getItem("otp_reset_phone"));
  const [, setLoc] = useLocation();
  const qc = useQueryClient();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetMut = useMutation({
    mutationFn: (body: { token?: string; otp?: string; phone?: string; newPassword: string }) =>
      apiJson<{ ok: true; message: string; user?: any }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (data) => {
      // Clean up sessionStorage
      sessionStorage.removeItem("otp_reset_phone");
      if (data.user) {
        await qc.invalidateQueries({ queryKey: ["me"] });
        setTimeout(() => setLoc("/"), 2000);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!token && !phone) {
      setValidationError("Invalid or missing reset token or phone number.");
      return;
    }

    if (phone && !otp.trim()) {
      setValidationError("Please enter the OTP sent to your phone.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    if (phone) {
      resetMut.mutate({ phone, otp: otp.trim(), newPassword: password });
    } else if (token) {
      resetMut.mutate({ token, newPassword: password });
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}>
      <Seo
        title={`Reset Password - ${brand}`}
        description={`Set a new password for your ${brand} account.`}
        noindex
        canonicalPath="/reset-password"
      />
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          Reset Password
        </Typography>

        {resetMut.isSuccess ? (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="success">{resetMut.data.message}</Alert>
            {!resetMut.data.user && (
              <Button component={Link} href="/login" variant="contained" fullWidth>
                Return to Login
              </Button>
            )}
          </Stack>
        ) : !token && !phone ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            Invalid or missing password reset link. Please try the forgot password process again.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {phone && (
                <>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    We sent an OTP to {phone}. Please enter it below.
                  </Alert>
                  <TextField
                    label="6-digit OTP"
                    type="text"
                    required
                    fullWidth
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </>
              )}
              
              <TextField
                label="New Password"
                type={showPassword ? "text" : "password"}
                required
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                required
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {validationError && (
                <Typography color="error" variant="body2">
                  {validationError}
                </Typography>
              )}

              {resetMut.isError && (
                <Typography color="error" variant="body2">
                  {(resetMut.error as Error)?.message || "An error occurred."}
                </Typography>
              )}

              <Button type="submit" variant="contained" disabled={resetMut.isPending} fullWidth>
                Reset Password
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
