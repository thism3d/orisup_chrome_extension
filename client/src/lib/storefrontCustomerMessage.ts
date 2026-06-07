/** Strip OrlenPay / gateway jargon so checkout surfaces stay shopper-friendly. */
export function customerFacingCheckoutNotice(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/might not be present|this field might not/i.test(t)) {
    return "";
  }
  if (/payment completes via gateway callback/i.test(t)) {
    return "We could not confirm your payment yet. You can try again or choose another method.";
  }
  if (/gateway callback|provider session|orlenpay|webhook|token expired|session/i.test(t)) {
    return "Payment could not be confirmed. Please try again or use another payment option.";
  }
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}

export function customerFacingPaymentDetail(detail: string | null | undefined): string | undefined {
  if (!detail?.trim()) return undefined;
  const t = detail.trim();
  if (/gateway callback|provider session|orlenpay|webhook|token|session id/i.test(t)) {
    return undefined;
  }
  return t.length > 160 ? `${t.slice(0, 157)}…` : t;
}
