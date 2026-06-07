import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";
import { useAdminUserPeek } from "@/contexts/AdminUserPeekContext";
import { SYSTEM_STAFF_ID } from "@shared/systemStaff";

export type StaffRef = {
  id: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
} | null;

type Props = {
  staff: StaffRef;
  dense?: boolean;
  /**
   * `avatar` — profile photo only; tooltip shows name/email; click opens user details (when peek provider is mounted).
   * `full` — legacy avatar + name + email inline.
   */
  variant?: "avatar" | "full";
};

/** Creator / handler column: avatar with optional tooltip and user peek on click. */
export function AdminStaffCell({ staff, dense, variant = "avatar" }: Props) {
  const peek = useAdminUserPeek();

  if (!staff) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  if (staff.id === SYSTEM_STAFF_ID) {
    const sys =
      variant === "full" ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="System" size="small" color="default" variant="outlined" sx={{ fontWeight: 700 }} />
        </Stack>
      ) : (
        <Tooltip title="Automated or background process" enterDelay={400} placement="top">
          <Chip label="System" size="small" color="default" variant="outlined" sx={{ fontWeight: 700 }} />
        </Tooltip>
      );
    return sys;
  }
  const src = userAvatarImgSrc(staff.avatarUrl);
  const initials = userInitials(staff.fullName || staff.email || "?");
  const tipLines = [staff.fullName, staff.email].filter(Boolean).join("\n");
  const size = dense ? 28 : 32;
  const fontSize = dense ? "0.7rem" : "0.75rem";

  if (variant === "full") {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar src={src} sx={{ width: size, height: size, fontSize }}>
          {!src ? initials : undefined}
        </Avatar>
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={staff.fullName}>
            {staff.fullName}
          </Typography>
          {staff.email ? (
            <Typography variant="caption" color="text.secondary" noWrap title={staff.email}>
              {staff.email}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    );
  }

  const avatar = (
    <Avatar src={src} sx={{ width: size, height: size, fontSize }}>
      {!src ? initials : undefined}
    </Avatar>
  );

  const clickable = Boolean(peek?.openUser && staff.id && staff.id !== SYSTEM_STAFF_ID);

  const inner = clickable ? (
    <IconButton
      size="small"
      onClick={() => peek!.openUser(staff.id)}
      aria-label={`Open user ${staff.fullName}`}
      sx={{ p: 0.25 }}
    >
      {avatar}
    </IconButton>
  ) : (
    <Box component="span" sx={{ display: "inline-flex", p: 0.25, verticalAlign: "middle" }}>
      {avatar}
    </Box>
  );

  return (
    <Tooltip title={tipLines || staff.fullName} enterDelay={400} placement="top">
      {inner}
    </Tooltip>
  );
}

/** Row user cell: avatar next to primary label (e.g. Users table). */
export function AdminUserCell({
  fullName,
  avatarUrl,
  secondary,
}: {
  fullName: string;
  avatarUrl?: string | null;
  secondary?: string | null;
}) {
  const src = userAvatarImgSrc(avatarUrl ?? null);
  const initials = userInitials(fullName || secondary || "?");
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar src={src} sx={{ width: 36, height: 36, fontSize: "0.8rem" }}>
        {!src ? initials : undefined}
      </Avatar>
      <Stack spacing={0} sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {fullName}
        </Typography>
        {secondary ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {secondary}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
