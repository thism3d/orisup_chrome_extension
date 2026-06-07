import crypto from "crypto";

type ProviderMethod = "bkash" | "bkash_auto" | "nagad" | "rocket" | "upay" | "stripe";

type InitiatePayload = {
  amount: string;
  provider: ProviderMethod;
  clientRefNo: string;
  externalRef: string;
  callbackUrl: string;
  returnUrl: string;
  orderNumber: string;
  /** Payer MSISDN (digits only, 10-15). AsthaCash prefills the bKash Auto wallet field with this. */
  customerMsisdn?: string;
};

type InitiateResult = {
  redirectUrl: string;
  gatewayReference: string;
  providerSessionToken: string | null;
  raw: Record<string, unknown>;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function requiredConfig(name: string, settings?: Record<string, string>): string {
  const envValue = process.env[name]?.trim();
  if (envValue) return envValue;
  const settingValue = settings?.[name.toLowerCase()]?.trim();
  if (settingValue) return settingValue;
  throw new Error(`Missing required config: ${name}`);
}

function buildBaseUrl(reqHost: string, settings?: Record<string, string>): string {
  const explicit = process.env.ORLENBD_PUBLIC_BASE_URL?.trim() || settings?.orlenbd_public_base_url?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return reqHost.replace(/\/+$/, "");
}

function safeObj(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

/** OrlenPay `/api/v3/direct-checkout/start` returned success: false or non-OK HTTP. */
export class OrlenpayGatewayError extends Error {
  readonly code?: string;
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number, code?: string) {
    super(message);
    this.name = "OrlenpayGatewayError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export async function initiateOrlenpayDirectCheckout(
  payload: InitiatePayload,
  reqOrigin: string,
  settings?: Record<string, string>
): Promise<InitiateResult> {
  const baseUrl = requiredConfig("ORLENPAY_BASE_URL", settings).replace(/\/+$/, "");
  const publicKey = requiredConfig("ORLENPAY_PUBLIC_KEY", settings);
  const secretKey = requiredConfig("ORLENPAY_SECRET_KEY", settings);
  const directEndpoint = `${baseUrl}/api/v3/direct-checkout/start`;
  const callbackBase = buildBaseUrl(reqOrigin, settings);

  const response = await fetch(directEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "public-key": publicKey,
      "secret-key": secretKey,
    },
    body: JSON.stringify({
      payment_amount: payload.amount,
      payment_method: payload.provider,
      currency_type: "BDT",
      client_ref_no: payload.clientRefNo,
      external_ref: payload.externalRef,
      order_number: payload.orderNumber,
      clientcallback: payload.returnUrl,
      clientcallbackhook: payload.callbackUrl,
      callback_base_url: callbackBase,
      ...(payload.customerMsisdn ? { customer_msisdn: payload.customerMsisdn } : {}),
    }),
  });

  const data = safeObj(await response.json().catch(() => ({})));
  if (!response.ok || data.success === false) {
    const rawMsg =
      typeof data.message === "string" && data.message.trim() ? data.message.trim() : `Gateway initiate failed (${response.status})`;
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : undefined;
    throw new OrlenpayGatewayError(rawMsg, response.status, code);
  }

  const redirectUrl =
    typeof data.redirect_url === "string"
      ? data.redirect_url
      : typeof data.url === "string"
        ? data.url
        : "";
  if (!redirectUrl) throw new Error("Gateway did not return redirect_url");

  return {
    redirectUrl,
    gatewayReference:
      typeof data.reference_no === "string" && data.reference_no.trim()
        ? data.reference_no
        : payload.externalRef,
    providerSessionToken:
      typeof data.provider_session_token === "string" && data.provider_session_token.trim()
        ? data.provider_session_token
        : null,
    raw: data,
  };
}

/**
 * Verifies AsthaCash / OrlenPay merchant webhook signatures per their API docs:
 * HMAC-SHA256(secret, exact UTF-8 JSON request body bytes), hex digest, compared to
 * `X-Callback-Signature` / `X-Signature` (same value OrlenPay sends).
 *
 * `secret` must match the merchant API secret used for signing (`secret-key` / privet_key).
 * Prefer `ORLENPAY_CALLBACK_SECRET` / `orlenpay_callback_secret`; falls back to merchant
 * `ORLENPAY_SECRET_KEY` / `orlenpay_secret_key` when callback secret is unset (common setup).
 */
export function verifyOrlenpaySignature(
  rawBody: Buffer,
  signature: string | undefined,
  settings?: Record<string, string>
): boolean {
  const secret =
    process.env.ORLENPAY_CALLBACK_SECRET?.trim() ||
    settings?.orlenpay_callback_secret?.trim() ||
    process.env.ORLENPAY_SECRET_KEY?.trim() ||
    settings?.orlenpay_secret_key?.trim();
  if (!secret) throw new Error("Missing required config: ORLENPAY_CALLBACK_SECRET or ORLENPAY_SECRET_KEY");
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
}
