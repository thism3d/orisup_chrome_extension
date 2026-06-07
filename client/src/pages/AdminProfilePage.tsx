import { Alert, Avatar, Box, Paper, Stack, TextField, Typography, Button } from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { PasskeyAccountPanel } from "@/components/auth/PasskeyAccountPanel";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson, apiUpload } from "@/lib/api";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";
import { useAuth } from "@/hooks/useAuth";
import type { SessionUser } from "@/lib/types";

const profileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6),
    confirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

export function AdminProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const oauthOnly = user?.hasPassword === false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      fullName: user.fullName,
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
  }, [user, profileForm]);

  useEffect(() => {
    const h = window.location.hash;
    if (h === "#password") {
      requestAnimationFrame(() => document.getElementById("password")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  const pwForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const profileMut = useMutation({
    mutationFn: (body: { fullName: string; email: string | null; phone: string | null }) =>
      apiJson<{ user: SessionUser }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const avatarMut = useMutation({
    mutationFn: async (file: File) => {
      const { url } = await apiUpload(file);
      return apiJson<{ user: SessionUser }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: url }),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const clearAvatarMut = useMutation({
    mutationFn: () =>
      apiJson<{ user: SessionUser }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: null }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const pwMut = useMutation({
    mutationFn: (body: { currentPassword?: string; newPassword: string }) =>
      apiJson("/api/me/password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      pwForm.reset({ currentPassword: "", newPassword: "", confirm: "" });
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Account details for your platform administrator login.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          Profile
        </Typography>
        {user ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2.5, alignItems: { sm: "center" } }}>
            <Avatar
              src={userAvatarImgSrc(user.avatarUrl)}
              alt=""
              sx={{ width: 88, height: 88, fontSize: "1.5rem", fontWeight: 800 }}
            >
              {userInitials(user.fullName)}
            </Avatar>
            <Stack spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraOutlinedIcon />}
                  disabled={avatarMut.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ fontWeight: 700 }}
                >
                  Upload photo
                </Button>
                {userAvatarImgSrc(user.avatarUrl) ? (
                  <Button
                    variant="text"
                    size="small"
                    color="inherit"
                    disabled={clearAvatarMut.isPending}
                    onClick={() => clearAvatarMut.mutate()}
                    sx={{ fontWeight: 600 }}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) avatarMut.mutate(f);
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 400 }}>
                Shown in the admin bar and sidebar, and in the storefront header and mobile bar when you are signed in on the shop.
              </Typography>
              {avatarMut.isError ? (
                <Alert severity="error" sx={{ py: 0 }}>
                  {avatarMut.error instanceof Error ? avatarMut.error.message : "Upload failed"}
                </Alert>
              ) : null}
            </Stack>
          </Stack>
        ) : null}
        <Stack component="form" spacing={2} onSubmit={profileForm.handleSubmit((v) => profileMut.mutateAsync({
          fullName: v.fullName.trim(),
          email: v.email?.trim() || null,
          phone: v.phone?.trim() || null,
        }))}>
          <TextField {...profileForm.register("fullName")} label="Full name" size="small" required fullWidth />
          <TextField {...profileForm.register("email")} label="Email" type="email" size="small" fullWidth />
          <TextField {...profileForm.register("phone")} label="Phone" size="small" fullWidth />
          {profileMut.isError ? (
            <Alert severity="error">{profileMut.error instanceof Error ? profileMut.error.message : "Update failed"}</Alert>
          ) : null}
          {profileMut.isSuccess ? <Alert severity="success">Profile saved.</Alert> : null}
          <Button type="submit" variant="contained" disabled={profileMut.isPending} sx={{ alignSelf: "flex-start", fontWeight: 700 }}>
            {profileMut.isPending ? "Saving…" : "Save profile"}
          </Button>
        </Stack>
      </Paper>

      <Paper id="password" variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          Change password
        </Typography>
        {oauthOnly ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            You signed in with Google, Facebook, or a passkey. Set an admin password below to enable password-only sign-in.
          </Alert>
        ) : null}
        <Stack
          component="form"
          spacing={2}
          onSubmit={pwForm.handleSubmit((v) =>
            pwMut.mutateAsync(
              oauthOnly
                ? { newPassword: v.newPassword }
                : {
                    currentPassword: v.currentPassword?.trim() || "",
                    newPassword: v.newPassword,
                  },
            ),
          )}
        >
          {!oauthOnly ? (
            <TextField
              {...pwForm.register("currentPassword")}
              type="password"
              label="Current password"
              size="small"
              required
              fullWidth
              autoComplete="current-password"
            />
          ) : null}
          <TextField
            {...pwForm.register("newPassword")}
            type="password"
            label="New password (min 6 characters)"
            size="small"
            required
            fullWidth
            autoComplete="new-password"
          />
          <TextField
            {...pwForm.register("confirm")}
            type="password"
            label="Confirm new password"
            size="small"
            required
            fullWidth
            autoComplete="new-password"
          />
          {pwForm.formState.errors.confirm ? (
            <Alert severity="error">{pwForm.formState.errors.confirm.message}</Alert>
          ) : null}
          {pwMut.isError ? (
            <Alert severity="error">{pwMut.error instanceof Error ? pwMut.error.message : "Could not change password"}</Alert>
          ) : null}
          {pwMut.isSuccess ? <Alert severity="success">Password updated.</Alert> : null}
          <Button type="submit" variant="contained" color="inherit" disabled={pwMut.isPending} sx={{ alignSelf: "flex-start", fontWeight: 700 }}>
            {pwMut.isPending ? "Updating…" : "Update password"}
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 3 }}>
        <PasskeyAccountPanel title="Administrator passkeys" dense />
      </Paper>
    </Box>
  );
}
