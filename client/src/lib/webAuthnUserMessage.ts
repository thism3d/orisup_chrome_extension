/**
 * Human-readable strings for navigator.credentials WebAuthn errors (often DOMException-like).
 */

function errName(msg: unknown): string {
  if (typeof msg === "object" && msg !== null && "name" in msg && typeof (msg as { name: unknown }).name === "string") {
    return (msg as { name: string }).name;
  }
  return "";
}

export function webAuthnSignInErrorMessage(err: unknown): string {
  const name = errName(err);
  if (name === "NotAllowedError")
    return "Passkey sign-in was canceled or timed out. On Windows Desktop, retry or finish the Google Password Manager prompt; extensions that block WebAuthn can cause this.";
  if (name === "InvalidStateError")
    return "This passkey is not available here. Register a passkey on this device from your profile.";
  const msg =
    err instanceof Error && typeof err.message === "string"
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  return msg.trim() || "Passkey verification failed.";
}

export function webAuthnRegisterErrorMessage(err: unknown): string {
  const name = errName(err);
  if (name === "InvalidStateError")
    return "This authenticator already has a passkey for this site. Remove it from your list below or try “Use a different passkey” — you cannot enroll the same one twice.";
  if (name === "NotAllowedError")
    return "Passkey enrollment was canceled or timed out — try again or use “Save another way” if Chrome offers it.";
  const msg =
    err instanceof Error && typeof err.message === "string"
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  return msg.trim() || "Could not register this passkey.";
}
