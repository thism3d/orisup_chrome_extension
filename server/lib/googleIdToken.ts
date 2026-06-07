import { OAuth2Client } from "google-auth-library";

const oauth2 = new OAuth2Client();

export type GoogleLoginProfile = {
  sub: string;
  email: string;
  name: string;
  /** Google-hosted profile picture URL when present in the ID token. */
  picture?: string;
};

export async function verifyGoogleIdCredential(jwt: string, audience: string): Promise<GoogleLoginProfile> {
  const ticket = await oauth2.verifyIdToken({
    idToken: jwt,
    audience,
  });
  const p = ticket.getPayload();
  if (!p?.sub || typeof p.sub !== "string") {
    throw new Error("Invalid Google token");
  }
  const rawEmail = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
  if (!rawEmail) {
    throw new Error("Google account has no email address");
  }
  const evRaw = p.email_verified as boolean | string | undefined;
  const verified =
    evRaw === true ||
    evRaw === "true" ||
    (typeof evRaw === "string" && evRaw.toLowerCase() === "true");
  if (!verified) {
    throw new Error("Google email is not verified");
  }
  const name =
    typeof p.name === "string" && p.name.trim().length > 0
      ? p.name.trim()
      : rawEmail.includes("@")
        ? rawEmail.slice(0, rawEmail.indexOf("@"))
        : "Account";
  const pictureRaw = p.picture;
  const picture =
    typeof pictureRaw === "string" && pictureRaw.trim().startsWith("http") ? pictureRaw.trim() : undefined;

  return {
    sub: p.sub,
    email: rawEmail,
    name,
    ...(picture ? { picture } : {}),
  };
}
