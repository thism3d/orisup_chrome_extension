import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { apiJson, apiUpload } from "@/lib/api";
import type { SavedAddress, SessionUser } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import {
  storefrontAccountContainerMaxWidth,
  storefrontPanelChromeSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
  storefrontSectionHeadingTitleSx,
} from "@/lib/storefrontUiSurface";
import { PasskeyAccountPanel } from "@/components/auth/PasskeyAccountPanel";
import { PathaoLocationPickers, type PathaoIdName } from "@/components/checkout/PathaoLocationPickers";

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

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().optional(),
  phone: z.string().min(8),
  isDefault: z.boolean(),
  pathaoCityId: z.number().int().positive().optional(),
  pathaoZoneId: z.number().int().positive().optional(),
  pathaoAreaId: z.number().int().positive().optional(),
  pathaoCityName: z.string().optional(),
  pathaoZoneName: z.string().optional(),
  pathaoAreaName: z.string().optional(),
});

type AddrForm = z.infer<typeof addressSchema>;

function profileInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0]![0]}${p[p.length - 1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function ProfileTab({ user }: { user: SessionUser }) {
  const brand = useSiteBrand();
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text } = useStorefrontLanguage();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email ?? "",
      phone: user.phone ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      fullName: user.fullName,
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
  }, [user.id, user.fullName, user.email, user.phone, form]);

  const mut = useMutation({
    mutationFn: (body: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
    }) => apiJson<{ user: SessionUser }>("/api/me/profile", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
      mut.reset();
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

  const displaySrc = user.avatarUrl?.trim() || undefined;

  return (
    <Card elevation={0} sx={storefrontPanelChromeSx(uiTemplate)}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" gutterBottom sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
          {text("Profile", "প্রোফাইল")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {text(
            `Update how we reach you. Email and phone must be unique on ${brand}.`,
            `আমরা কীভাবে আপনার সাথে যোগাযোগ করব তা আপডেট করুন। ${brand}-এ ইমেইল ও ফোন ইউনিক হতে হবে।`,
          )}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ mb: 3, alignItems: { sm: "center" } }}>
          <Avatar
            src={displaySrc}
            alt=""
            sx={{
              width: 96,
              height: 96,
              fontSize: "1.75rem",
              fontWeight: 800,
              boxShadow: (t) => t.shadows[2],
            }}
          >
            {profileInitials(user.fullName)}
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
                {text("Upload photo", "ছবি আপলোড")}
              </Button>
              {displaySrc ? (
                <Button
                  variant="text"
                  size="small"
                  color="inherit"
                  disabled={mut.isPending}
                  onClick={() => mut.mutate({ avatarUrl: null })}
                  sx={{ fontWeight: 600 }}
                >
                  {text("Remove photo", "ছবি সরান")}
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
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360 }}>
              {text(
                "Sign in with Google or Facebook may fill your photo automatically. Upload your own to replace it.",
                "Google বা Facebook দিয়ে সাইন ইন করলে ছবি স্বয়ংক্রিয়ভাবে আসতে পারে। নিজের ছবি দিয়ে প্রতিস্থাপন করুন।",
              )}
            </Typography>
            {(user.googleSub || user.facebookSub) && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {user.googleSub ? <Chip size="small" label="Google" variant="outlined" /> : null}
                {user.facebookSub ? <Chip size="small" label="Facebook" variant="outlined" /> : null}
              </Stack>
            )}
            {avatarMut.isError && (
              <Alert severity="error" sx={{ py: 0 }}>
                {avatarMut.error instanceof Error ? avatarMut.error.message : "Upload failed"}
              </Alert>
            )}
          </Stack>
        </Stack>

        <form
          onSubmit={form.handleSubmit((v) =>
            mut.mutate({
              fullName: v.fullName,
              email: v.email?.trim() ? v.email.trim() : null,
              phone: v.phone?.trim() ? v.phone.trim() : null,
            })
          )}
        >
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField label={text("Full name", "পূর্ণ নাম")} required fullWidth {...form.register("fullName")} />
            <TextField label={text("Email", "ইমেইল")} type="email" fullWidth {...form.register("email")} />
            <TextField label={text("Phone", "ফোন")} fullWidth placeholder="01XXXXXXXXX" {...form.register("phone")} />
            {mut.isError && (
              <Alert severity="error">
                {mut.error instanceof Error ? mut.error.message : "Could not save profile"}
              </Alert>
            )}
            {mut.isSuccess && <Alert severity="success">{text("Profile updated.", "প্রোফাইল আপডেট হয়েছে।")}</Alert>}
            <Button type="submit" variant="contained" disabled={mut.isPending} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
              {text("Save profile", "প্রোফাইল সংরক্ষণ করুন")}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordTab() {
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text } = useStorefrontLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const oauthOnly = user?.hasPassword === false;
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const mut = useMutation({
    mutationFn: (body: { currentPassword?: string; newPassword: string }) =>
      apiJson("/api/me/password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      form.reset();
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <Card elevation={0} sx={storefrontPanelChromeSx(uiTemplate)}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" gutterBottom sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
          {text("Password", "পাসওয়ার্ড")}
        </Typography>
        {oauthOnly ? (
          <Alert severity="info" sx={{ mb: 2, maxWidth: 480 }}>
            {text(
              "You signed in with Google, Facebook, or a passkey. Set a password here to sign in with email and password too.",
              "আপনি Google, Facebook অথবা পাসকি দিয়ে সাইন ইন করেছেন। ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করতে এখানে পাসওয়ার্ড সেট করুন।",
            )}
          </Alert>
        ) : null}
        <form
          onSubmit={form.handleSubmit((v) =>
            mut.mutate(
              oauthOnly
                ? { newPassword: v.newPassword }
                : {
                    currentPassword: v.currentPassword?.trim() || "",
                    newPassword: v.newPassword,
                  },
            ),
          )}
        >
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            {!oauthOnly ? (
              <TextField
                type="password"
                label={text("Current password", "বর্তমান পাসওয়ার্ড")}
                required
                fullWidth
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
            ) : null}
            <TextField
              type="password"
              label={text("New password", "নতুন পাসওয়ার্ড")}
              required
              fullWidth
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
            <TextField
              type="password"
              label={text("Confirm new password", "নতুন পাসওয়ার্ড নিশ্চিত করুন")}
              required
              fullWidth
              autoComplete="new-password"
              {...form.register("confirm")}
              error={!!form.formState.errors.confirm}
              helperText={form.formState.errors.confirm?.message}
            />
            {mut.isError && (
              <Alert severity="error">
                {mut.error instanceof Error ? mut.error.message : "Could not change password"}
              </Alert>
            )}
            {mut.isSuccess && <Alert severity="success">{text("Password updated.", "পাসওয়ার্ড আপডেট হয়েছে।")}</Alert>}
            <Button type="submit" variant="contained" disabled={mut.isPending} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
              {text("Update password", "পাসওয়ার্ড আপডেট করুন")}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

function AddressesTab() {
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text } = useStorefrontLanguage();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["me-addresses"],
    queryFn: () => apiJson<SavedAddress[]>("/api/me/addresses"),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [addrPathaoErr, setAddrPathaoErr] = useState<string | null>(null);

  const pathaoCitiesQ = useQuery({
    queryKey: ["pathao-cities"],
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/store/pathao/cities", { credentials: "include" });
      if (res.status === 503) return { cities: [] as PathaoIdName[] };
      if (!res.ok) return { cities: [] as PathaoIdName[] };
      return (await res.json()) as { cities: PathaoIdName[] };
    },
  });
  const pathaoEnabled = (pathaoCitiesQ.data?.cities?.length ?? 0) > 0;
  const pathaoCities = pathaoCitiesQ.data?.cities ?? [];

  const form = useForm<AddrForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      line1: "",
      line2: "",
      city: "",
      district: "",
      postalCode: "",
      phone: "",
      isDefault: false,
    },
  });

  const pathaoCityId = form.watch("pathaoCityId");
  const pathaoZoneId = form.watch("pathaoZoneId");
  const pathaoAreaId = form.watch("pathaoAreaId");

  const pathaoZonesQ = useQuery({
    queryKey: ["pathao-zones", pathaoCityId],
    enabled: Boolean(pathaoEnabled && pathaoCityId),
    queryFn: () => apiJson<{ zones: PathaoIdName[] }>(`/api/store/pathao/cities/${pathaoCityId}/zones`).then((r) => r.zones),
  });
  const pathaoZones = pathaoZonesQ.data ?? [];

  const pathaoAreasQ = useQuery({
    queryKey: ["pathao-areas", pathaoZoneId],
    enabled: Boolean(pathaoEnabled && pathaoZoneId),
    queryFn: () => apiJson<{ areas: { id: number; name: string }[] }>(`/api/store/pathao/zones/${pathaoZoneId}/areas`).then((r) => r.areas),
  });
  const pathaoAreas = pathaoAreasQ.data ?? [];

  const handlePathaoCity = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    const id = raw === "" ? undefined : Number(raw);
    form.setValue("pathaoCityId", id);
    form.setValue("pathaoZoneId", undefined);
    form.setValue("pathaoAreaId", undefined);
    const name = pathaoCities.find((c) => c.id === id)?.name ?? "";
    form.setValue("city", name.length ? name : "—");
    form.setValue("district", "—");
    form.setValue("pathaoCityName", name);
    form.setValue("pathaoZoneName", "");
    form.setValue("pathaoAreaName", "");
  };

  const handlePathaoZone = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    const id = raw === "" ? undefined : Number(raw);
    form.setValue("pathaoZoneId", id);
    form.setValue("pathaoAreaId", undefined);
    const zn = pathaoZones.find((z) => z.id === id)?.name ?? "";
    form.setValue("district", zn.length ? zn : "—");
    form.setValue("pathaoZoneName", zn);
    form.setValue("pathaoAreaName", "");
  };

  const handlePathaoArea = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    const id = raw === "" ? undefined : Number(raw);
    form.setValue("pathaoAreaId", id);
    const an = pathaoAreas.find((x) => x.id === id)?.name ?? "";
    form.setValue("pathaoAreaName", an);
  };

  const openNew = () => {
    setEditing(null);
    setAddrPathaoErr(null);
    form.reset({
      label: "",
      line1: "",
      line2: "",
      city: "",
      district: "",
      postalCode: "",
      phone: "",
      isDefault: false,
      pathaoCityId: undefined,
      pathaoZoneId: undefined,
      pathaoAreaId: undefined,
      pathaoCityName: "",
      pathaoZoneName: "",
      pathaoAreaName: "",
    });
    setOpen(true);
  };

  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setAddrPathaoErr(null);
    form.reset({
      label: a.label ?? "",
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      district: a.district,
      postalCode: a.postalCode ?? "",
      phone: a.phone,
      isDefault: a.isDefault,
      pathaoCityId: a.pathaoCityId ?? undefined,
      pathaoZoneId: a.pathaoZoneId ?? undefined,
      pathaoAreaId: a.pathaoAreaId ?? undefined,
      pathaoCityName: a.pathaoCityName ?? "",
      pathaoZoneName: a.pathaoZoneName ?? "",
      pathaoAreaName: a.pathaoAreaName ?? "",
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (v: AddrForm) => {
      const body = {
        label: v.label?.trim() || null,
        line1: v.line1,
        line2: v.line2?.trim() || null,
        city: v.city,
        district: v.district,
        postalCode: v.postalCode?.trim() || null,
        phone: v.phone,
        isDefault: v.isDefault,
        pathaoCityId: v.pathaoCityId ?? null,
        pathaoZoneId: v.pathaoZoneId ?? null,
        pathaoAreaId: v.pathaoAreaId ?? null,
        pathaoCityName: v.pathaoCityName?.trim() || null,
        pathaoZoneName: v.pathaoZoneName?.trim() || null,
        pathaoAreaName: v.pathaoAreaName?.trim() || null,
      };
      if (editing) {
        await apiJson(`/api/me/addresses/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiJson("/api/me/addresses", { method: "POST", body: JSON.stringify(body) });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me-addresses"] });
      setOpen(false);
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/me/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me-addresses"] }),
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={storefrontSectionHeadingTitleSx(uiTemplate)}>
          {text("Saved addresses", "সংরক্ষিত ঠিকানা")}
        </Typography>
        <Button variant="contained" size="small" onClick={openNew} sx={{ fontWeight: 800 }}>
          {text("Add address", "ঠিকানা যোগ করুন")}
        </Button>
      </Stack>
      {isLoading ? (
        <Typography color="text.secondary">{text("Loading…", "লোড হচ্ছে…")}</Typography>
      ) : data.length === 0 ? (
        <Typography color="text.secondary">{text("No saved addresses yet. Add one for faster checkout.", "এখনও কোনো ঠিকানা সংরক্ষিত নেই। দ্রুত চেকআউটের জন্য একটি যোগ করুন।")}</Typography>
      ) : (
        <Stack spacing={1.5}>
          {data.map((a) => (
            <Card key={a.id} elevation={0} sx={storefrontPanelChromeSx(uiTemplate)}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={800}>
                      {a.label || text("Address", "ঠিকানা")}
                      {a.isDefault ? (
                        <Typography component="span" variant="caption" color="primary" sx={{ ml: 1, fontWeight: 800 }}>
                          {text("Default", "ডিফল্ট")}
                        </Typography>
                      ) : null}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                      <br />
                      {a.city}, {a.district}
                      {a.postalCode ? ` ${a.postalCode}` : ""}
                      <br />
                      {a.phone}
                    </Typography>
                  </Box>
                  <Stack direction="row">
                    <IconButton aria-label={text("Edit", "এডিট")} onClick={() => openEdit(a)} size="small">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label={text("Delete", "মুছুন")} onClick={() => delMut.mutate(a.id)} size="small" color="error">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? text("Edit address", "ঠিকানা সম্পাদনা") : text("New address", "নতুন ঠিকানা")}</DialogTitle>
        <form
          onSubmit={form.handleSubmit((v) => {
            setAddrPathaoErr(null);
            if (pathaoEnabled && (v.pathaoCityId == null || v.pathaoZoneId == null)) {
              setAddrPathaoErr(text("Select city and zone.", "শহর ও জোন বেছে নিন।"));
              return;
            }
            saveMut.mutate(v);
          })}
          id="addr-form"
        >
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField label={text("Label (optional)", "লেবেল (ঐচ্ছিক)")} fullWidth {...form.register("label")} placeholder={text("Home, Office…", "বাড়ি, অফিস…")} />
              <TextField label={text("Line 1", "লাইন ১")} required fullWidth {...form.register("line1")} />
              <TextField label={text("Line 2", "লাইন ২")} fullWidth {...form.register("line2")} />
              {pathaoEnabled ? (
                <Grid container spacing={2}>
                  <PathaoLocationPickers
                    cities={pathaoCities}
                    zones={pathaoZones}
                    areas={pathaoAreas}
                    cityId={pathaoCityId ?? ""}
                    zoneId={pathaoZoneId ?? ""}
                    areaId={pathaoAreaId ?? ""}
                    onCityChange={handlePathaoCity}
                    onZoneChange={handlePathaoZone}
                    onAreaChange={handlePathaoArea}
                    labels={{
                      city: text("City", "শহর"),
                      zone: text("Zone (thana)", "জোন (থানা)"),
                      area: text("Area", "এলাকা"),
                      hint: text(
                        "Choose city and zone from the list (required for delivery and pricing).",
                        "তালিকা থেকে শহর ও জোন বেছে নিন (ডেলিভারি ও মূল্যের জন্য প্রয়োজন)।",
                      ),
                    }}
                  />
                  <input type="hidden" {...form.register("city")} />
                  <input type="hidden" {...form.register("district")} />
                </Grid>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label={text("City / Thana", "শহর / থানা")} required fullWidth {...form.register("city")} />
                  <TextField label={text("District", "জেলা")} required fullWidth {...form.register("district")} />
                </Stack>
              )}
              {addrPathaoErr ? <Alert severity="warning">{addrPathaoErr}</Alert> : null}
              <TextField label={text("Postal code", "পোস্টাল কোড")} fullWidth {...form.register("postalCode")} />
              <TextField label={text("Phone (for delivery)", "ফোন (ডেলিভারির জন্য)")} required fullWidth {...form.register("phone")} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.watch("isDefault")}
                    onChange={(_, c) => form.setValue("isDefault", c)}
                  />
                }
                label={text("Set as default address", "ডিফল্ট ঠিকানা হিসেবে সেট করুন")}
              />
              {saveMut.isError && (
                <Alert severity="error">
                  {saveMut.error instanceof Error ? saveMut.error.message : "Save failed"}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>{text("Cancel", "বাতিল")}</Button>
            <Button type="submit" variant="contained" disabled={saveMut.isPending}>
              {text("Save", "সংরক্ষণ")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

function SecurityTab() {
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text } = useStorefrontLanguage();
  return (
    <Card elevation={0} sx={storefrontPanelChromeSx(uiTemplate)}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <PasskeyAccountPanel title={text("Passkeys & device sign-in", "পাসকি ও ডিভাইস সাইন-ইন")} />
      </CardContent>
    </Card>
  );
}

function AccountBody() {
  const brand = useSiteBrand();
  const { uiTemplate } = useStorefrontUiTemplate();
  const { text } = useStorefrontLanguage();
  const { user, logout } = useAuth();
  const [, setLoc] = useLocation();
  const [tab, setTab] = useState(0);

  if (!user) return null;

  const containerMax = storefrontAccountContainerMaxWidth(uiTemplate);
  const isAdmin = user.role === "platform_admin";

  const handleLogout = async () => {
    await logout();
    setLoc("/");
  };

  return (
    <>
      <Seo title={text("My account", "আমার অ্যাকাউন্ট")} description={text(`Manage your ${brand} profile and addresses.`, `${brand}-এ আপনার প্রোফাইল ও ঠিকানা পরিচালনা করুন।`)} noindex canonicalPath="/account" />
      <FadeInSection>
        <Container maxWidth={containerMax} sx={{ py: { xs: 2, md: uiTemplate === "orynbd" ? 5 : 4 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            spacing={2}
            sx={{ mb: 1 }}
          >
            <Typography
              variant={storefrontRetailTitleVariant(uiTemplate)}
              component="h1"
              gutterBottom={false}
              sx={storefrontRetailTitleSx(uiTemplate)}
            >
              {text("My account", "আমার অ্যাকাউন্ট")}
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              size="medium"
              startIcon={<LogoutOutlinedIcon />}
              onClick={() => void handleLogout()}
              sx={{ fontWeight: 700, flexShrink: 0, alignSelf: { xs: "stretch", sm: "flex-start" } }}
            >
              {text("Log out", "লগ আউট")}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <Link href="/account/orders" style={{ fontWeight: 700, color: "inherit" }}>
              {text("View order history", "অর্ডার ইতিহাস দেখুন")}
            </Link>
          </Typography>
          {isAdmin && (
            <Card elevation={0} sx={{ ...storefrontPanelChromeSx(uiTemplate), mb: 2 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        width: 44,
                        height: 44,
                      }}
                    >
                      <AdminPanelSettingsOutlinedIcon />
                    </Avatar>
                    <Box>
                      <Typography fontWeight={900}>{text("Platform administrator", "প্ল্যাটফর্ম অ্যাডমিন")}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {text(
                          "You can manage the storefront from the admin dashboard. Your customer account tools remain available below.",
                          "অ্যাডমিন ড্যাশবোর্ড থেকে স্টোরফ্রন্ট পরিচালনা করতে পারবেন। নিচে আপনার অ্যাকাউন্ট টুলগুলোও আছে।"
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    component={Link}
                    href="/admin"
                    variant="contained"
                    startIcon={<AdminPanelSettingsOutlinedIcon />}
                    sx={{ fontWeight: 800, flexShrink: 0 }}
                  >
                    {text("Go to admin", "অ্যাডমিনে যান")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root.Mui-selected": { color: "primary.main" },
              ...(uiTemplate === "orynbd"
                ? {
                    "& .MuiTab-root": { fontWeight: 800, fontSize: "1rem", textTransform: "none", minHeight: 52 },
                  }
                : uiTemplate === "norexbd" || uiTemplate === "adorashop"
                  ? { "& .MuiTab-root": { fontWeight: 700, textTransform: "none", minHeight: 44, fontSize: "0.875rem" } }
                  : {}),
            }}
          >
            <Tab label={text("Profile", "প্রোফাইল")} />
            <Tab label={text("Password", "পাসওয়ার্ড")} />
            <Tab label={text("Security", "নিরাপত্তা")} />
            <Tab label={text("Addresses", "ঠিকানা")} />
          </Tabs>
          {tab === 0 && <ProfileTab user={user} />}
          {tab === 1 && <PasswordTab />}
          {tab === 2 && <SecurityTab />}
          {tab === 3 && <AddressesTab />}
        </Container>
      </FadeInSection>
    </>
  );
}

export function AccountPage() {
  return (
    <RequireRole roles={["customer", "vendor_staff", "platform_admin"]} redirectIfUnauthenticated="/login">
      <AccountBody />
    </RequireRole>
  );
}
