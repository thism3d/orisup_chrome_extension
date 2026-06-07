import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import IconButton from "@mui/material/IconButton";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import { apiJson } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@shared/orderStatus";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const PATHAO_STATUS_MAP: Array<[string, OrderStatus | "—"]> = [
  ["order.pickup-requested", "assigned_to_courier"],
  ["order.assigned-for-pickup", "assigned_to_courier"],
  ["order.picked", "in_transit"],
  ["order.pickup-failed", "assigned_to_courier"],
  ["order.pickup-cancelled", "cancelled"],
  ["order.at-the-sorting-hub", "in_transit"],
  ["order.in-transit", "in_transit"],
  ["order.received-at-last-mile-hub", "in_transit"],
  ["order.on-hold", "—"],
  ["order.assigned-for-delivery", "out_for_delivery"],
  ["order.delivered", "delivered"],
  ["order.partial-delivery", "delivered"],
  ["order.returned", "returned"],
  ["order.delivery-failed", "—"],
  ["order.paid (invoice)", "—"],
  ["order.paid-return", "returned"],
  ["order.exchanged", "delivered"],
  ["order.return-id-created", "—"],
  ["order.return-in-transit", "—"],
  ["order.returned-to-merchant", "returned"],
  ["order.created / order.updated", "—"],
  ["store.created / store.updated", "—"],
];

const STEADFAST_STATUS_MAP: Array<[string, OrderStatus | "—"]> = [
  ["pending", "assigned_to_courier"],
  ["in_review", "assigned_to_courier"],
  ["hold", "assigned_to_courier"],
  ["in_transit", "in_transit"],
  ["unknown_approval_pending", "in_transit"],
  ["delivered_approval_pending", "out_for_delivery"],
  ["partial_delivered_approval_pending", "out_for_delivery"],
  ["cancelled_approval_pending", "out_for_delivery"],
  ["delivered", "delivered"],
  ["partial_delivered", "delivered"],
  ["cancelled", "cancelled"],
];

function CodeBlock({ code }: { code: string }) {
  const showToast = useToast();
  return (
    <Box sx={{ position: "relative" }}>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          bgcolor: "action.hover",
          borderRadius: 1.5,
          border: 1,
          borderColor: "divider",
          fontSize: "0.8rem",
          overflowX: "auto",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {code}
      </Box>
      <IconButton
        size="small"
        aria-label="Copy"
        sx={{ position: "absolute", top: 6, right: 6 }}
        onClick={() => {
          void navigator.clipboard?.writeText(code);
          showToast("Copied to clipboard.", "success");
        }}
      >
        <ContentCopyRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function StatusMapTable({ rows }: { rows: Array<[string, OrderStatus | "—"]> }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
      <Stack divider={<Divider />}>
        <Stack direction="row" sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
          <Typography variant="caption" fontWeight={800} sx={{ width: "55%" }}>
            Partner status
          </Typography>
          <Typography variant="caption" fontWeight={800}>
            Internal status
          </Typography>
        </Stack>
        {rows.map(([partner, internal]) => (
          <Stack key={partner} direction="row" sx={{ px: 2, py: 1 }}>
            <Box component="code" sx={{ width: "55%", fontSize: "0.8rem" }}>
              {partner}
            </Box>
            <Typography variant="body2">
              {internal === "—" ? "—" : ORDER_STATUS_LABEL[internal]} ({internal})
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export function AdminCouriersApiDocsPanel() {
  const showToast = useToast();
  const [tab, setTab] = useState<"overview" | "pathao" | "steadfast" | "openapi" | "swagger">("overview");
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  const exampleSlug = "pathao";
  const webhookUrl = `${origin}/api/partners/couriers/${exampleSlug}/webhook`;
  const openapiUrl = `${origin}/api/partners/openapi.json`;

  const samplePathaoBody = JSON.stringify(
    {
      event: "order.in-transit",
      consignment_id: "DL121224VS8TTJ",
      merchant_order_id: "ORL1778162133201964",
      updated_at: "2024-12-27 23:52:32",
      timestamp: "2024-12-27T17:52:32+00:00",
      store_id: 130820,
    },
    null,
    2,
  );

  const sampleSteadfastBody = JSON.stringify(
    {
      consignment_id: 1234567,
      tracking_code: "STEAD-987654",
      invoice: "OB-1029",
      status: "delivered",
      cod_amount: 1499,
      updated_at: "2026-04-26T10:42:11+06:00",
    },
    null,
    2,
  );

  const signedCurl = `# Compute X-Signature = hex( HMAC_SHA256(secret, raw_request_body) )
SECRET="<webhook_secret>"
BODY=$(cat payload.json)
SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -sS -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Signature: $SIG" \\
  --data-binary @payload.json`;

  const openApiQ = useQuery({
    queryKey: ["partner-openapi-json"],
    queryFn: () => apiJson<Record<string, unknown>>("/api/partners/openapi.json"),
    staleTime: 60_000,
  });

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Partner integration API
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
            Public surface for delivery partners. Partners push status events to a per-courier webhook and we update the
            corresponding order. The OpenAPI 3.1 document below is the source of truth.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<OpenInNewRoundedIcon />}
            onClick={() => setTab("swagger")}
          >
            Swagger UI
          </Button>
          <Button
            variant="outlined"
            startIcon={<OpenInNewRoundedIcon />}
            href={openapiUrl}
            target="_blank"
            rel="noreferrer"
          >
            View OpenAPI
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            href={openapiUrl}
            download="orlenbd-partners-openapi.json"
          >
            Download JSON
          </Button>
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v: typeof tab) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="overview" label="Overview" />
        <Tab value="pathao" label="Pathao" />
        <Tab value="steadfast" label="Steadfast" />
        <Tab value="swagger" label="Swagger UI" />
        <Tab value="openapi" label="OpenAPI" />
      </Tabs>

      {tab === "overview" ? (
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={800}>
            Webhook URL pattern
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                component="code"
                sx={{ flex: 1, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", wordBreak: "break-all" }}
              >
                POST {origin}/api/partners/couriers/<strong>{"{slug}"}</strong>/webhook
              </Box>
              <IconButton
                size="small"
                aria-label="Copy"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${origin}/api/partners/couriers/{slug}/webhook`);
                  showToast("Copied.", "success");
                }}
              >
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              <code>{"{slug}"}</code> is the courier slug from the Couriers panel (e.g. <code>pathao</code>,{" "}
              <code>steadfast</code>). Any partner-supplied slug must match an active courier or the request is
              rejected with HTTP 404.
            </Typography>
          </Paper>

          <Typography variant="subtitle1" fontWeight={800}>
            Authentication &amp; signature
          </Typography>
          <Alert severity="info" variant="outlined">
            We verify <code>X-Signature</code> as <strong>hex(HMAC-SHA256(webhook_secret, raw_body))</strong>. For
            partners that cannot send headers (e.g. Steadfast's basic webhook), supply the secret as a{" "}
            <code>?token=&lt;webhook_secret&gt;</code> query string instead. Both options are accepted; one must match
            or the request is rejected with HTTP 401.
          </Alert>
          <CodeBlock code={signedCurl} />

          <Typography variant="subtitle1" fontWeight={800}>
            Integration quick start (partners)
          </Typography>
          <Stack spacing={1}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>1) Register courier + credentials in admin</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Go to <strong>Couriers</strong> tab, click <strong>Add courier or delivery partner</strong>, select
                  partner type (Pathao / Steadfast / Manual), set credentials, then save.
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>2) Configure webhook URL in partner panel</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Use <code>{`/api/partners/couriers/{slug}/webhook`}</code>. Set the same webhook secret on both
                  systems.
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>3) Test outbound API connectivity</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  In courier row actions click <strong>Test</strong>. Green toast confirms API auth is valid.
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>4) Dispatch from order modal</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Move order to <code>at_warehouse</code>, then dispatch to courier. Consignment + ETA are stored and
                  shown in timeline.
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>5) Validate inbound status updates</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Send signed sample payloads from this page (or Swagger). Updates appear in <strong>Courier timeline</strong>.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Stack>

          <Typography variant="subtitle1" fontWeight={800}>
            Internal order status enum
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {ORDER_STATUSES.map((s) => (
                <Box
                  key={s}
                  component="code"
                  sx={{
                    px: 1,
                    py: 0.25,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    fontSize: "0.75rem",
                    bgcolor: "action.hover",
                  }}
                >
                  {s}
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Webhooks may also include a partner-native status string; the corresponding mapping per partner is
              documented under each partner tab.
            </Typography>
          </Paper>

          <Typography variant="subtitle1" fontWeight={800}>
            Resolving the order
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We try the carrier's consignment id first (matched against{" "}
            <code>orders.partner_consignment_id</code>). When absent, we fall back to the merchant reference echoed in
            the payload — Pathao's <code>merchant_order_id</code> or Steadfast's <code>invoice</code> — matched against{" "}
            <code>orders.order_number</code>. If neither matches we respond with HTTP 200 and a no-op so the partner
            does not retry.
          </Typography>

          <Typography variant="subtitle1" fontWeight={800}>
            Idempotency &amp; retries
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status updates that don't change the current state are accepted but not re-applied. Pathao expects{" "}
            <strong>HTTP 202</strong> on success with the integration response header; other partners use{" "}
            <strong>HTTP 200</strong>. Partners should stop retrying after a successful response.
          </Typography>
        </Stack>
      ) : null}

      {tab === "pathao" ? (
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={800}>
            Pathao Merchant API v3
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Outbound requests use OAuth2 client credentials issued at{" "}
            <code>POST /aladdin/api/v1/issue-token</code>. Shipments are created at{" "}
            <code>POST /aladdin/api/v1/orders</code> with <code>merchant_order_id</code> set to our internal{" "}
            <code>order_number</code>.
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>
            Inbound webhook signature
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Header <code>X-Pathao-Signature</code> (or <code>X-Signature</code>) is hex-encoded HMAC-SHA256 of the raw
            request body using the webhook signing secret from the courier row. Successful callbacks respond with{" "}
            <strong>HTTP 202</strong> and include <code>X-Pathao-Merchant-Webhook-Integration-Secret</code> (the UUID
            from Pathao’s dashboard checklist), matching Pathao’s live requirements.
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>
            Sample request body
          </Typography>
          <CodeBlock code={samplePathaoBody} />
          <Typography variant="body2" color="text.secondary">
            Pathao sends <code>event</code> strings such as <code>order.pickup-requested</code> or{" "}
            <code>order.pickup-cancelled</code>. Rows marked “—” keep the current order status but append a shopper-safe
            note on the customer timeline. Legacy payloads with <code>order.status</code> + <code>order_status</code> are
            still supported.
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>
            Event → internal status
          </Typography>
          <StatusMapTable rows={PATHAO_STATUS_MAP} />
        </Stack>
      ) : null}

      {tab === "steadfast" ? (
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={800}>
            Steadfast Courier
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Outbound calls are signed with <code>Api-Key</code> and <code>Secret-Key</code> headers. Shipments are
            created at <code>POST /api/v1/create_order</code> with <code>invoice</code> set to our internal{" "}
            <code>order_number</code>. Connection tests hit <code>GET /api/v1/get_balance</code>.
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>
            Inbound webhook signature
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Steadfast's status webhook is unsigned by default. Supply the webhook secret as <code>?token=…</code> on
            the URL configured in the partner dashboard, or set <code>X-Signature</code> to{" "}
            <code>hex(HMAC-SHA256(secret, body))</code> if your relay supports headers.
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>
            Sample request body
          </Typography>
          <CodeBlock code={sampleSteadfastBody} />
          <Typography variant="subtitle2" fontWeight={800}>
            Status mapping
          </Typography>
          <StatusMapTable rows={STEADFAST_STATUS_MAP} />
        </Stack>
      ) : null}

      {tab === "openapi" ? (
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={800}>
            OpenAPI 3.1
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The machine-readable spec is served at the URL below. Partners can import it into Postman / Insomnia /
            Stoplight Studio to scaffold their integration.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                component="code"
                sx={{ flex: 1, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", wordBreak: "break-all" }}
              >
                {openapiUrl}
              </Box>
              <IconButton
                size="small"
                aria-label="Copy"
                onClick={() => {
                  void navigator.clipboard?.writeText(openapiUrl);
                  showToast("Copied.", "success");
                }}
              >
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" href={openapiUrl} target="_blank" rel="noreferrer">
              Open spec
            </Button>
            <Button variant="outlined" href={openapiUrl} download="orlenbd-partners-openapi.json">
              Download
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {tab === "swagger" ? (
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            Interactive API explorer for courier partner integration. Use <strong>Try it out</strong> to test request
            shapes quickly.
          </Alert>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              "& .swagger-ui": { fontFamily: "inherit" },
              "& .swagger-ui .topbar": { display: "none" },
            }}
          >
            {openApiQ.isLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading OpenAPI schema…
                </Typography>
              </Stack>
            ) : openApiQ.data ? (
              <SwaggerUI spec={openApiQ.data} docExpansion="list" defaultModelsExpandDepth={1} />
            ) : (
              <Box sx={{ p: 2.5 }}>
                <Typography color="error" fontWeight={700}>
                  Failed to load OpenAPI schema.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make sure <code>/api/partners/openapi.json</code> is reachable from this admin domain.
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      ) : null}
    </Box>
  );
}
