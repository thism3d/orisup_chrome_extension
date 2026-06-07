/**
 * Validates a browser-issued Facebook user access token belongs to our app,
 * then loads basic profile fields.
 */

export type FacebookProfileLite = {
  /** Graph user id — store as `facebook_sub`. */
  sub: string;
  name?: string;
  email?: string | null;
  /** Public profile picture URL when returned by Graph. */
  picture?: string;
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  const body = await res.json();
  return body;
}

export async function verifyFacebookAccessToken(userAccessToken: string, appId: string, appSecret: string): Promise<FacebookProfileLite> {
  const debugParams = new URLSearchParams({
    input_token: userAccessToken,
    access_token: `${appId}|${appSecret}`,
  });
  const debugUrl = `https://graph.facebook.com/debug_token?${debugParams}`;
  const debugRaw = await fetchJson(debugUrl) as {
    data?: { app_id?: string; user_id?: string; is_valid?: boolean };
    error?: { message?: string };
  };
  const data = debugRaw.data;
  const debugUserId = data?.user_id != null ? String(data.user_id) : "";
  const debugAppId = data?.app_id != null ? String(data.app_id) : "";
  if (!data?.is_valid || !debugUserId || debugAppId !== String(appId)) {
    throw new Error(debugRaw.error?.message || "Invalid Facebook token");
  }

  const graphVersion = process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || "v21.0";
  const meParams = new URLSearchParams({
    fields: "id,name,email,picture.type(large)",
    access_token: userAccessToken,
  });
  const meUrl = `https://graph.facebook.com/${graphVersion}/me?${meParams}`;
  const meRaw = await fetchJson(meUrl) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
    error?: { message?: string };
  };
  if (meRaw.error?.message) throw new Error(meRaw.error.message);
  const meId = meRaw.id != null ? String(meRaw.id) : "";
  if (!meId || meId !== debugUserId) throw new Error("Facebook profile mismatch");

  const picUrl =
    meRaw.picture?.data?.url && typeof meRaw.picture.data.url === "string"
      ? meRaw.picture.data.url.trim()
      : undefined;

  return {
    sub: meId,
    name: meRaw.name,
    email: typeof meRaw.email === "string" ? meRaw.email : null,
    ...(picUrl ? { picture: picUrl } : {}),
  };
}
