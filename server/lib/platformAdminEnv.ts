/**
 * Platform admin bootstrap credentials (any marketplace install).
 * Prefer PLATFORM_ADMIN_*; ORLENBD_ADMIN_* kept for backward compatibility.
 */
function stripOptionalQuotes(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

export function getPlatformAdminCredentialsFromEnv(): {
  email: string | undefined;
  password: string | undefined;
} {
  const emailRaw =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() || process.env.ORLENBD_ADMIN_EMAIL?.trim();
  const passRaw = process.env.PLATFORM_ADMIN_PASSWORD ?? process.env.ORLENBD_ADMIN_PASSWORD;
  const email = emailRaw ? stripOptionalQuotes(emailRaw) : undefined;
  const password = passRaw !== undefined && passRaw !== "" ? stripOptionalQuotes(String(passRaw)) : undefined;
  return { email, password };
}
