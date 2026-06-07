import { Alert, Button, Container, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiJson } from "@/lib/api";
import { customerFacingPaymentDetail } from "@/lib/storefrontCustomerMessage";
import { useEffect } from "react";

type PaymentStatusRes = {
  paymentId: string;
  status: string;
  statusDetail?: string | null;
  orderId: string;
};

export function CheckoutPaymentReturnPage() {
  const [, setLocation] = useLocation();
  const url =
    typeof window !== "undefined"
      ? new URL(window.location.href)
      : new URL("https://dummy.local/checkout/payment-return");
  const paymentId = url.searchParams.get("payment");
  const orderNumber = url.searchParams.get("order");
  const gatewayStatus = (url.searchParams.get("status") ?? "").toLowerCase();
  const gatewayReason = url.searchParams.get("message") ?? url.searchParams.get("reason") ?? "";

  const statusQuery = useQuery({
    queryKey: ["checkout-payment-status", paymentId],
    queryFn: () => apiJson<PaymentStatusRes>(`/api/payments/${encodeURIComponent(paymentId!)}/status`),
    enabled: Boolean(paymentId),
    refetchInterval: (q) => {
      const s = String(q.state.data?.status ?? "").toLowerCase();
      return ["completed", "failed", "cancelled"].includes(s) ? false : 5000;
    },
  });

  const status = String(statusQuery.data?.status ?? "").toLowerCase();
  const isSuccess = status === "completed";
  const isError = status === "failed" || status === "cancelled";
  const friendlyPaymentDetail = customerFacingPaymentDetail(statusQuery.data?.statusDetail);

  useEffect(() => {
    if (!isSuccess || !orderNumber) return;
    const t = window.setTimeout(() => {
      void apiJson("/api/cart/clear", { method: "POST" }).catch(() => undefined);
      setLocation(`/account/orders/${encodeURIComponent(orderNumber)}`);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [isSuccess, orderNumber, setLocation]);

  useEffect(() => {
    if (!paymentId || !(status === "failed" || status === "cancelled")) return;
    const qs = new URLSearchParams({
      payment_status: status,
      payment_reason: statusQuery.data?.statusDetail || "Payment was not completed.",
      payment: paymentId,
    });
    if (orderNumber) qs.set("order", orderNumber);
    setLocation(`/checkout?${qs.toString()}`);
  }, [orderNumber, paymentId, setLocation, status, statusQuery.data?.statusDetail]);

  useEffect(() => {
    if (paymentId) return;
    const t = window.setTimeout(() => setLocation("/cart?payment_status=invalid&payment_reason=Invalid+payment+return+URL"), 1200);
    return () => window.clearTimeout(t);
  }, [paymentId, setLocation]);

  useEffect(() => {
    const isGatewayFinalError = ["cancel", "cancelled", "canceled", "failed", "failure", "invalid"].includes(gatewayStatus);
    if (!isGatewayFinalError) return;
    const qs = new URLSearchParams({
      payment_status: gatewayStatus,
      payment_reason: gatewayReason || "Payment was not completed.",
    });
    if (paymentId) qs.set("payment", paymentId);
    if (orderNumber) qs.set("order", orderNumber);
    setLocation(`/checkout?${qs.toString()}`);
  }, [gatewayReason, gatewayStatus, orderNumber, paymentId, setLocation]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>
          Payment status
        </Typography>
        {!paymentId ? (
          <Alert severity="error">
            Invalid payment return URL. Redirecting to cart...
          </Alert>
        ) : statusQuery.isLoading ? (
          <Alert severity="info">Checking payment status...</Alert>
        ) : statusQuery.isError ? (
          <Alert severity="error">{statusQuery.error instanceof Error ? statusQuery.error.message : "Status check failed."}</Alert>
        ) : (
          <Alert severity={isSuccess ? "success" : isError ? "error" : "info"}>
            {isSuccess
              ? "Payment completed successfully. Redirecting to order tracking..."
              : isError
                ? "Payment was not completed."
                : "Payment is processing."}
            {friendlyPaymentDetail ? ` ${friendlyPaymentDetail}` : ""}
          </Alert>
        )}
        {orderNumber ? (
          <Button variant="contained" href={`/account/orders/${encodeURIComponent(orderNumber)}`}>
            View order
          </Button>
        ) : null}
        <Button variant="text" href="/checkout">
          Back to checkout
        </Button>
      </Stack>
    </Container>
  );
}
