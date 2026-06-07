import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter/use-browser-location";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { PathaoLocationPickers, type PathaoIdName } from "@/components/checkout/PathaoLocationPickers";
import { formatBdt } from "@/lib/format";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";
import {
  ORDER_STATUSES,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TRANSITIONS,
  isOrderStatus,
  isTerminalOrderStatus,
  type OrderStatus,
} from "@shared/orderStatus";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  shippingFee?: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  courierId?: string | null;
  trackingNumber?: string | null;
  warehouseReceivedAt?: string | null;
  partnerConsignmentId?: string | null;
  dispatchedAt?: string | null;
  etaAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  lastPartnerEventAt?: string | null;
  creator?: StaffRef;
  handler?: StaffRef;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: string;
  status: string;
  provider: string | null;
  externalRef: string | null;
  providerSessionToken: string | null;
  statusDetail: string | null;
  callbackReceivedAt: string | null;
  createdAt: string;
};

type CourierBrief = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  trackingUrlTemplate: string | null;
  phone: string | null;
  active: boolean;
  partnerType?: "manual" | "pathao" | "steadfast";
};

type CourierEventRow = {
  id: string;
  orderId: string;
  courierId: string | null;
  direction: "outbound" | "inbound";
  kind: "create_shipment" | "cancel_shipment" | "status_update" | "error";
  payload: Record<string, unknown>;
  statusBefore: string | null;
  statusAfter: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type TimelineResponse = {
  events: CourierEventRow[];
  history: Array<{ status: string; note: string | null; createdAt: string }>;
};

type OrderDetail = {
  order: Order & {
    subtotal: string;
    shippingFee?: string;
    paymentMethod: string;
    shippingAddress: Record<string, unknown>;
    userId?: string | null;
  };
  courier: CourierBrief | null;
  items: Array<{
    titleSnapshot: string;
    price: string;
    quantity: number;
    lineTotal: string;
    variantLabelSnapshot?: string | null;
  }>;
  history: Array<{ status: string; note: string | null; createdAt: string }>;
  payments: PaymentRow[];
  discounts: { storedHistorically: boolean; message: string };
};

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  price: string;
  stock: number;
  status: string;
  vendorName: string;
};

type CourierRowLite = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  partnerType?: "manual" | "pathao" | "steadfast";
  trackingUrlTemplate?: string | null;
};

type ProductVariant = {
  id: string;
  name: string | null;
  value: string | null;
  price: string;
  stock: number;
};

type ProductDetail = {
  product: { id: string; title: string; price: string; stock: number };
  variants: ProductVariant[];
};

type CreateLine = {
  productId: string;
  title: string;
  quantity: number;
  variantId: string | null;
  variants: ProductVariant[];
};

const statuses = ORDER_STATUSES;

function statusColor(status: string): "default" | "primary" | "success" | "warning" | "error" | "info" {
  if (isOrderStatus(status)) return ORDER_STATUS_COLOR[status];
  return "default";
}

function statusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status;
}

/**
 * Statuses an admin can move TO from `current`. Admin can also cancel from any
 * non-terminal state, so we always include `cancelled` for non-terminal.
 */
function allowedNextStatuses(current: string): OrderStatus[] {
  if (!isOrderStatus(current)) return [...ORDER_STATUSES];
  if (isTerminalOrderStatus(current)) return [current];
  const next = new Set<OrderStatus>([current, ...ORDER_STATUS_TRANSITIONS[current]]);
  next.add("cancelled");
  return ORDER_STATUSES.filter((s) => next.has(s));
}

function formatShippingAddress(addr: Record<string, unknown>): string {
  const line1 = String(addr.line1 ?? "");
  const line2 = addr.line2 ? String(addr.line2) : "";
  const city = String(addr.city ?? "");
  const district = String(addr.district ?? "");
  const postal = addr.postalCode ? String(addr.postalCode) : "";
  const parts: string[] = [line1, line2, [city, district].filter(Boolean).join(", "), postal].filter(Boolean);
  const pc = addr.pathaoCityId ?? addr.pathao_city_id;
  const pz = addr.pathaoZoneId ?? addr.pathao_zone_id;
  const pa = addr.pathaoAreaId ?? addr.pathao_area_id;
  if (pc != null && String(pc).trim()) parts.push(`Pathao city ID: ${pc}`);
  if (pz != null && String(pz).trim()) parts.push(`Pathao zone ID: ${pz}`);
  if (pa != null && String(pa).trim()) parts.push(`Pathao area ID: ${pa}`);
  return parts.join("\n");
}

function trackingHref(template: string | null | undefined, tracking: string): string | null {
  if (!template?.trim() || !tracking.trim()) return null;
  return template.split("{{tracking}}").join(encodeURIComponent(tracking.trim()));
}

function eventLabel(kind: CourierEventRow["kind"]): string {
  switch (kind) {
    case "create_shipment":
      return "Shipment created";
    case "cancel_shipment":
      return "Shipment cancelled";
    case "status_update":
      return "Partner status update";
    case "error":
      return "Adapter error";
    default:
      return kind;
  }
}

function CourierTimeline({ data }: { data: TimelineResponse }) {
  type Entry =
    | { sort: number; kind: "history"; status: string; note: string | null; createdAt: string }
    | { sort: number; kind: "event"; row: CourierEventRow };
  const merged: Entry[] = [
    ...data.history.map(
      (h) =>
        ({
          sort: new Date(h.createdAt).getTime(),
          kind: "history" as const,
          status: h.status,
          note: h.note,
          createdAt: h.createdAt,
        }) satisfies Entry,
    ),
    ...data.events.map(
      (e) =>
        ({
          sort: new Date(e.createdAt).getTime(),
          kind: "event" as const,
          row: e,
        }) satisfies Entry,
    ),
  ].sort((a, b) => b.sort - a.sort);

  if (merged.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No timeline events yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {merged.map((entry, i) => {
        const ts = new Date(entry.kind === "history" ? entry.createdAt : entry.row.createdAt).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        if (entry.kind === "history") {
          return (
            <Paper key={`h-${i}`} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label="status"
                    color="default"
                    variant="outlined"
                    sx={{ textTransform: "uppercase", fontSize: "0.65rem" }}
                  />
                  <Chip
                    size="small"
                    label={isOrderStatus(entry.status) ? ORDER_STATUS_LABEL[entry.status] : entry.status}
                    color={isOrderStatus(entry.status) ? ORDER_STATUS_COLOR[entry.status] : "default"}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {ts}
                </Typography>
              </Stack>
              {entry.note ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {entry.note}
                </Typography>
              ) : null}
            </Paper>
          );
        }
        const e = entry.row;
        return (
          <Paper key={`e-${e.id}`} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={e.direction}
                  color={e.direction === "inbound" ? "info" : "primary"}
                  variant="outlined"
                  sx={{ textTransform: "uppercase", fontSize: "0.65rem" }}
                />
                <Typography variant="body2" fontWeight={700}>
                  {eventLabel(e.kind)}
                </Typography>
                {e.statusBefore || e.statusAfter ? (
                  <Typography variant="caption" color="text.secondary">
                    {e.statusBefore ?? "—"} → {e.statusAfter ?? "—"}
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {ts}
              </Typography>
            </Stack>
            {e.errorMessage ? (
              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                {e.errorMessage}
              </Typography>
            ) : null}
            <Box
              component="pre"
              sx={{
                mt: 1,
                p: 1,
                fontSize: "0.7rem",
                bgcolor: "action.hover",
                borderRadius: 1,
                maxHeight: 200,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                m: 0,
              }}
            >
              {JSON.stringify(e.payload, null, 2)}
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}

function StatusSelect({
  orderId,
  value,
  disabled,
  onPick,
}: {
  orderId: string;
  value: string;
  disabled: boolean;
  onPick: (next: string) => void;
}) {
  const options = allowedNextStatuses(value);
  return (
    <FormControl size="small" fullWidth sx={{ minWidth: 180 }}>
      <InputLabel id={`st-${orderId}`}>Status</InputLabel>
      <Select
        labelId={`st-${orderId}`}
        label="Status"
        value={value}
        onChange={(e: SelectChangeEvent) => onPick(e.target.value)}
        disabled={disabled}
        renderValue={(v) => <Chip size="small" label={statusLabel(v)} color={statusColor(v)} variant="outlined" />}
      >
        {options.map((s) => (
          <MenuItem key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function AdminOrdersPanel() {
  const showToast = useToast();
  const search = useSearch();
  const [, setOrdersPath] = useLocation();
  const { can } = useAdminPermission();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("pending");
  const [deleteConfirm, setDeleteConfirm] = useState<
    { kind: "one"; id: string; orderNumber: string } | { kind: "bulk"; count: number } | null
  >(null);

  const [statusDlg, setStatusDlg] = useState<null | { id: string; current: string; next: string }>(null);
  const [statusNote, setStatusNote] = useState("");
  const [bulkStatusDlg, setBulkStatusDlg] = useState(false);
  const [bulkStatusNote, setBulkStatusNote] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createCustomerName, setCreateCustomerName] = useState("");
  const [createCustomerPhone, setCreateCustomerPhone] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState<"cod" | "manual">("cod");
  const [shipLine1, setShipLine1] = useState("");
  const [shipLine2, setShipLine2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipDistrict, setShipDistrict] = useState("");
  const [shipPostal, setShipPostal] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productQ, setProductQ] = useState("");
  const [createLines, setCreateLines] = useState<CreateLine[]>([]);

  const [fulfillCourierId, setFulfillCourierId] = useState<string>("");
  const [fulfillTracking, setFulfillTracking] = useState("");

  const [detailTab, setDetailTab] = useState<"details" | "timeline">("details");
  const [dispatchCourierId, setDispatchCourierId] = useState<string>("");
  const [cancelShipmentNote, setCancelShipmentNote] = useState("");
  const [cancelShipmentOpen, setCancelShipmentOpen] = useState(false);

  const [shipDlgOpen, setShipDlgOpen] = useState(false);
  const [shipForm, setShipForm] = useState({
    customerName: "",
    customerPhone: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    postalCode: "",
    pathaoCityId: "" as number | "",
    pathaoZoneId: "" as number | "",
    pathaoAreaId: "" as number | "",
    pathaoCityName: "",
    pathaoZoneName: "",
    pathaoAreaName: "",
  });

  const [createdFromIso, setCreatedFromIso] = useState("");
  const [createdToExclusiveIso, setCreatedToExclusiveIso] = useState("");

  useEffect(() => {
    const raw = search.startsWith("?") ? search.slice(1) : search || "";
    const p = new URLSearchParams(raw);
    const cf = p.get("createdFrom")?.trim();
    const ct = p.get("createdToExclusive")?.trim() ?? p.get("to")?.trim();
    setCreatedFromIso(cf ?? "");
    setCreatedToExclusiveIso(ct ?? "");
    if (p.has("status")) {
      setStatusFilter(p.get("status")?.trim() ?? "");
    }
    setPage(1);
  }, [search]);

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/orders", {
        page,
        perPage,
        q: q || undefined,
        status: statusFilter || undefined,
        createdFrom: createdFromIso || undefined,
        createdToExclusive: createdToExclusiveIso || undefined,
      }),
    [page, perPage, q, statusFilter, createdFromIso, createdToExclusiveIso],
  );

  const listQ = useQuery({
    queryKey: ["admin-orders", listUrl],
    queryFn: () => apiJson<AdminListResponse<Order>>(listUrl),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const detailQ = useQuery({
    queryKey: ["admin-order-detail", detailId],
    queryFn: () => apiJson<OrderDetail>(`/api/admin/orders/${detailId}/detail`),
    enabled: Boolean(detailId),
  });

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

  const pathaoZonesQ = useQuery({
    queryKey: ["pathao-zones", shipForm.pathaoCityId, shipDlgOpen],
    enabled: Boolean(
      shipDlgOpen && pathaoEnabled && typeof shipForm.pathaoCityId === "number" && shipForm.pathaoCityId > 0,
    ),
    queryFn: () =>
      apiJson<{ zones: PathaoIdName[] }>(`/api/store/pathao/cities/${shipForm.pathaoCityId}/zones`).then((r) => r.zones),
  });
  const pathaoZones = pathaoZonesQ.data ?? [];

  const pathaoAreasQ = useQuery({
    queryKey: ["pathao-areas", shipForm.pathaoZoneId, shipDlgOpen],
    enabled: Boolean(
      shipDlgOpen && pathaoEnabled && typeof shipForm.pathaoZoneId === "number" && shipForm.pathaoZoneId > 0,
    ),
    queryFn: () =>
      apiJson<{ areas: { id: number; name: string }[] }>(`/api/store/pathao/zones/${shipForm.pathaoZoneId}/areas`).then(
        (r) => r.areas,
      ),
  });
  const pathaoAreas = pathaoAreasQ.data ?? [];

  const adminPathaoQuoteQ = useQuery({
    queryKey: ["admin-order-pathao-quote", detailId, shipForm.pathaoCityId, shipForm.pathaoZoneId, shipForm.pathaoAreaId],
    enabled: Boolean(
      shipDlgOpen &&
        detailId &&
        pathaoEnabled &&
        typeof shipForm.pathaoCityId === "number" &&
        typeof shipForm.pathaoZoneId === "number",
    ),
    queryFn: () =>
      apiJson<{ shippingFee: string }>(`/api/admin/orders/${detailId}/pathao-quote`, {
        method: "POST",
        body: JSON.stringify({
          pathaoCityId: shipForm.pathaoCityId,
          pathaoZoneId: shipForm.pathaoZoneId,
          ...(typeof shipForm.pathaoAreaId === "number" && shipForm.pathaoAreaId > 0
            ? { pathaoAreaId: shipForm.pathaoAreaId }
            : {}),
        }),
      }),
  });

  const couriersQ = useQuery({
    queryKey: ["admin-couriers-active"],
    queryFn: () =>
      apiJson<AdminListResponse<CourierRowLite>>(
        adminListQuery("/api/admin/couriers", { page: 1, perPage: 100, active: "true" }),
      ),
    enabled: Boolean(detailId),
  });

  const productSearchUrl = useMemo(
    () => adminListQuery("/api/admin/products", { page: 1, perPage: 15, q: productQ || undefined, status: "active" }),
    [productQ],
  );

  const productSearchQ = useQuery({
    queryKey: ["admin-orders-product-search", productSearchUrl],
    queryFn: () => apiJson<AdminListResponse<ProductRow>>(productSearchUrl),
    enabled: createOpen && Boolean(productQ.trim()),
  });

  useEffect(() => {
    const o = detailQ.data?.order;
    if (!o) return;
    setFulfillCourierId(o.courierId ?? "");
    setFulfillTracking(o.trackingNumber ?? "");
    setDispatchCourierId(o.courierId ?? "");
  }, [detailId, detailQ.data]);

  useEffect(() => {
    if (!detailId) {
      setDetailTab("details");
      setCancelShipmentOpen(false);
      setCancelShipmentNote("");
    }
  }, [detailId]);

  const patch = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      apiJson(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(note != null && note !== "" ? { note } : {}) }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-analytics"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-recent"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Update failed.", "error"),
  });

  const fulfillMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson(`/api/admin/orders/${detailId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      showToast("Fulfillment saved.", "success");
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Save failed.", "error"),
  });

  const dispatchMut = useMutation({
    mutationFn: (courierId: string) =>
      apiJson<{ ok: true; consignmentId: string; etaAt: string | null; partnerType: string }>(
        `/api/admin/orders/${detailId}/dispatch`,
        { method: "POST", body: JSON.stringify({ courierId }) },
      ),
    onSuccess: (r) => {
      showToast(`Dispatched to courier (${r.partnerType}). Consignment ${r.consignmentId}.`, "success");
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-order-events", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Dispatch failed.", "error"),
  });

  const cancelShipmentMut = useMutation({
    mutationFn: (note: string) =>
      apiJson(`/api/admin/orders/${detailId}/cancel-shipment`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      showToast("Shipment cancelled.", "success");
      setCancelShipmentOpen(false);
      setCancelShipmentNote("");
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-order-events", detailId] });
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Cancel failed.", "error"),
  });

  const eventsQ = useQuery({
    queryKey: ["admin-order-events", detailId],
    queryFn: () => apiJson<TimelineResponse>(`/api/admin/orders/${detailId}/events`),
    enabled: Boolean(detailId) && detailTab === "timeline",
  });

  const createOrderMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson<{ orderId: string; orderNumber: string }>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-analytics"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-recent"] });
      showToast(`Order ${r.orderNumber} created.`, "success");
      setCreateOpen(false);
      setCreateCustomerName("");
      setCreateCustomerPhone("");
      setCreateUserId("");
      setCreateLines([]);
      setShipLine1("");
      setShipLine2("");
      setShipCity("");
      setShipDistrict("");
      setShipPostal("");
      setProductSearch("");
      setProductQ("");
      setDetailId(r.orderId);
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Create failed.", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-analytics"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-recent"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Delete failed.", "error"),
  });

  const bulkMut = useMutation({
    mutationFn: (body: { action: string; ids: string[]; status?: string; note?: string }) =>
      apiJson("/api/admin/orders/bulk", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-analytics"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-recent"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Bulk action failed.", "error"),
  });

  const requestStatusChange = (id: string, current: string, next: string) => {
    if (next === current) return;
    setStatusNote("");
    setStatusDlg({ id, current, next });
  };

  const confirmStatusChange = async () => {
    if (!statusDlg) return;
    const note = statusDlg.next === "cancelled" ? statusNote.trim() : undefined;
    if (statusDlg.next === "cancelled" && !note) {
      showToast("Cancel reason is required.", "error");
      return;
    }
    await patch.mutateAsync({ id: statusDlg.id, status: statusDlg.next, note });
    setStatusDlg(null);
  };

  const openBulkStatusApply = () => {
    if (!selected.size) return;
    if (bulkStatus === "cancelled") {
      setBulkStatusNote("");
      setBulkStatusDlg(true);
      return;
    }
    setBulkStatusDlg(true);
  };

  const confirmBulkStatus = async () => {
    if (!selected.size) return;
    const note = bulkStatus === "cancelled" ? bulkStatusNote.trim() : undefined;
    if (bulkStatus === "cancelled" && !note) {
      showToast("Cancel reason is required for bulk cancel.", "error");
      return;
    }
    await bulkMut.mutateAsync({
      action: "set_status",
      ids: Array.from(selected),
      status: bulkStatus,
      ...(note ? { note } : {}),
    });
    setBulkStatusDlg(false);
  };

  const addProductToCreateLines = async (p: ProductRow) => {
    try {
      const detail = await apiJson<ProductDetail>(`/api/admin/products/${p.id}`);
      const vars = detail.variants ?? [];
      setCreateLines((lines) => [
        ...lines,
        {
          productId: p.id,
          title: p.title,
          quantity: 1,
          variantId: vars.length === 1 ? vars[0].id : vars.length === 0 ? null : null,
          variants: vars,
        },
      ]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not load product.", "error");
    }
  };

  const submitCreateOrder = () => {
    if (!createCustomerName.trim() || !createCustomerPhone.trim()) {
      showToast("Customer name and phone are required.", "error");
      return;
    }
    if (!shipLine1.trim() || !shipCity.trim() || !shipDistrict.trim()) {
      showToast("Shipping address (line 1, city, district) is required.", "error");
      return;
    }
    if (!createLines.length) {
      showToast("Add at least one product line.", "error");
      return;
    }
    for (const ln of createLines) {
      if (ln.variants.length > 0 && !ln.variantId) {
        showToast(`Choose a variant for ${ln.title}.`, "error");
        return;
      }
    }
    const uid = createUserId.trim();
    createOrderMut.mutate({
      customerName: createCustomerName.trim(),
      customerPhone: createCustomerPhone.trim(),
      paymentMethod: createPaymentMethod,
      userId: uid ? uid : null,
      shippingAddress: {
        line1: shipLine1.trim(),
        line2: shipLine2.trim() || undefined,
        city: shipCity.trim(),
        district: shipDistrict.trim(),
        postalCode: shipPostal.trim() || undefined,
      },
      lines: createLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        variantId: l.variantId,
      })),
    });
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllPage = () => {
    const ids = items.map((i) => i.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((s) => {
      const n = new Set(s);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const d = detailQ.data;

  const parseShipPathaoId = (v: unknown): number | "" => {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
    if (typeof v === "string" && v.trim()) {
      const x = parseInt(v.trim(), 10);
      return Number.isFinite(x) && x > 0 ? x : "";
    }
    return "";
  };

  const openShippingDialog = () => {
    const cur = detailQ.data;
    if (!cur) return;
    const a = cur.order.shippingAddress;
    setShipForm({
      customerName: cur.order.customerName,
      customerPhone: cur.order.customerPhone,
      line1: String(a.line1 ?? ""),
      line2: String(a.line2 ?? ""),
      city: String(a.city ?? ""),
      district: String(a.district ?? ""),
      postalCode: String(a.postalCode ?? ""),
      pathaoCityId: parseShipPathaoId(a.pathaoCityId ?? a.pathao_city_id),
      pathaoZoneId: parseShipPathaoId(a.pathaoZoneId ?? a.pathao_zone_id),
      pathaoAreaId: parseShipPathaoId(a.pathaoAreaId ?? a.pathao_area_id),
      pathaoCityName: String(a.pathaoCityName ?? a.pathao_city_name ?? ""),
      pathaoZoneName: String(a.pathaoZoneName ?? a.pathao_zone_name ?? ""),
      pathaoAreaName: String(a.pathaoAreaName ?? a.pathao_area_name ?? ""),
    });
    setShipDlgOpen(true);
  };

  const handleShipPathaoCity = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      setShipForm((s) => ({
        ...s,
        pathaoCityId: "",
        pathaoZoneId: "",
        pathaoAreaId: "",
        pathaoCityName: "",
        pathaoZoneName: "",
        pathaoAreaName: "",
      }));
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    const name = pathaoCities.find((c) => c.id === id)?.name ?? "";
    setShipForm((s) => ({
      ...s,
      pathaoCityId: id,
      pathaoZoneId: "",
      pathaoAreaId: "",
      city: name || s.city,
      district: name ? "—" : s.district,
      pathaoCityName: name,
      pathaoZoneName: "",
      pathaoAreaName: "",
    }));
  };

  const handleShipPathaoZone = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      setShipForm((s) => ({ ...s, pathaoZoneId: "", pathaoAreaId: "", pathaoZoneName: "", pathaoAreaName: "" }));
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    const zn = pathaoZones.find((z) => z.id === id)?.name ?? "";
    setShipForm((s) => ({
      ...s,
      pathaoZoneId: id,
      pathaoAreaId: "",
      district: zn || s.district,
      pathaoZoneName: zn,
      pathaoAreaName: "",
    }));
  };

  const handleShipPathaoArea = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      setShipForm((s) => ({ ...s, pathaoAreaId: "", pathaoAreaName: "" }));
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    const an = pathaoAreas.find((x) => x.id === id)?.name ?? "";
    setShipForm((s) => ({
      ...s,
      pathaoAreaId: id,
      pathaoAreaName: an,
    }));
  };

  const saveShippingDialog = async () => {
    const cur = detailQ.data;
    if (!detailId || !cur) return;
    if (!shipForm.customerName.trim() || !shipForm.customerPhone.trim()) {
      showToast("Customer name and phone are required.", "error");
      return;
    }
    if (!shipForm.line1.trim() || !shipForm.city.trim() || !shipForm.district.trim()) {
      showToast("Address line 1, city, and district are required.", "error");
      return;
    }
    const pci = typeof shipForm.pathaoCityId === "number" ? shipForm.pathaoCityId : undefined;
    const pzi = typeof shipForm.pathaoZoneId === "number" ? shipForm.pathaoZoneId : undefined;
    const pai = typeof shipForm.pathaoAreaId === "number" && shipForm.pathaoAreaId > 0 ? shipForm.pathaoAreaId : undefined;
    if (pathaoEnabled && (pci == null || pzi == null)) {
      showToast("Select Pathao city and zone (store has Pathao delivery enabled).", "error");
      return;
    }
    if (pathaoEnabled && !adminPathaoQuoteQ.isSuccess) {
      showToast(
        adminPathaoQuoteQ.isError
          ? "Pathao quote failed — check courier credentials or zone IDs."
          : "Wait for the delivery quote to load (select city and zone).",
        "error",
      );
      return;
    }
    await fulfillMut.mutateAsync({
      customerName: shipForm.customerName.trim(),
      customerPhone: shipForm.customerPhone.trim(),
      shippingAddress: {
        line1: shipForm.line1.trim(),
        line2: shipForm.line2.trim() || undefined,
        city: shipForm.city.trim(),
        district: shipForm.district.trim(),
        postalCode: shipForm.postalCode.trim() || undefined,
        ...(pci != null ? { pathaoCityId: pci } : {}),
        ...(pzi != null ? { pathaoZoneId: pzi } : {}),
        ...(pai != null ? { pathaoAreaId: pai } : {}),
        ...(shipForm.pathaoCityName.trim() ? { pathaoCityName: shipForm.pathaoCityName.trim() } : {}),
        ...(shipForm.pathaoZoneName.trim() ? { pathaoZoneName: shipForm.pathaoZoneName.trim() } : {}),
        ...(shipForm.pathaoAreaName.trim() ? { pathaoAreaName: shipForm.pathaoAreaName.trim() } : {}),
      },
    });
    setShipDlgOpen(false);
  };

  const courierOptions = couriersQ.data?.items ?? [];
  const selectedFulfillCourier = useMemo(
    () => courierOptions.find((c) => c.id === fulfillCourierId),
    [courierOptions, fulfillCourierId],
  );
  const tplForFulfill =
    selectedFulfillCourier?.trackingUrlTemplate ?? d?.courier?.trackingUrlTemplate ?? null;
  const fulfillCourierPartnerType = selectedFulfillCourier?.partnerType ?? "manual";
  const isPathaoFulfillmentCourier = fulfillCourierPartnerType === "pathao";
  const trackingTokenForCarrier =
    d?.order &&
    isPathaoFulfillmentCourier &&
    (d.order.partnerConsignmentId || d.order.orderNumber || "").length > 0
      ? d.order.partnerConsignmentId || d.order.orderNumber
      : fulfillTracking || d?.order?.trackingNumber || "";
  const trackLink = d?.order ? trackingHref(tplForFulfill, trackingTokenForCarrier) : null;

  const isCourierShipped = ["assigned_to_courier", "in_transit", "out_for_delivery"].includes(d?.order.status ?? "");
  const partnerType = d?.courier?.partnerType ?? "manual";
  const formatDt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const modalContent = d ? (
    <DialogContent dividers sx={{ pt: 0, px: 0 }}>
      <Tabs
        value={detailTab}
        onChange={(_, v: "details" | "timeline") => setDetailTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
      >
        <Tab value="details" label="Details" />
        <Tab value="timeline" label="Courier timeline" />
      </Tabs>
      {detailTab === "details" ? (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Order {d.order.orderNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {d.order.customerName} · {d.order.customerPhone}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {new Date(d.order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
          </Box>
          {can("orders", "edit") ? (
            <StatusSelect
              orderId={d.order.id}
              value={d.order.status}
              disabled={patch.isPending}
              onPick={(next) => requestStatusChange(d.order.id, d.order.status, next)}
            />
          ) : (
            <Chip size="small" label={statusLabel(d.order.status)} color={statusColor(d.order.status)} variant="outlined" />
          )}
        </Stack>

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={700}>
            Shipping
          </Typography>
          {can("orders", "edit") ? (
            <Button size="small" variant="outlined" onClick={openShippingDialog}>
              Edit customer & shipping
            </Button>
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {formatShippingAddress(d.order.shippingAddress)}
        </Typography>

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Lines
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Line</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {d.items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Typography fontWeight={600}>{it.titleSnapshot}</Typography>
                    {it.variantLabelSnapshot ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {it.variantLabelSnapshot}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right">{it.quantity}</TableCell>
                  <TableCell align="right">{formatBdt(it.price)}</TableCell>
                  <TableCell align="right">{formatBdt(it.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">Subtotal</Typography>
          <Typography fontWeight={700}>{formatBdt(d.order.subtotal)}</Typography>
        </Stack>
        {Number(d.order.shippingFee ?? 0) > 0 ? (
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">Shipping</Typography>
            <Typography fontWeight={700}>{formatBdt(d.order.shippingFee ?? "0")}</Typography>
          </Stack>
        ) : null}
        <Stack direction="row" justifyContent="space-between">
          <Typography fontWeight={800}>Total</Typography>
          <Typography fontWeight={800}>{formatBdt(d.order.total)}</Typography>
        </Stack>

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Payment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Method: {String(d.order.paymentMethod).toUpperCase()}
        </Typography>
        {d.payments?.length ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Gateway Ref</TableCell>
                  <TableCell>Callback</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {d.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {new Date(p.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.provider ?? "-"}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>{p.externalRef ?? "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {p.callbackReceivedAt
                        ? new Date(p.callbackReceivedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
                        : "-"}
                    </TableCell>
                    <TableCell align="right">{formatBdt(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No payment rows recorded.
          </Typography>
        )}

        <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
          {d.discounts?.message ?? "Discount details are not stored historically on line items."}
        </Alert>

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Fulfillment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mark when the parcel reaches your warehouse, then assign a courier and tracking. Changing order status to
          Shipped is separate.
        </Typography>
        <Typography variant="body2">
          <strong>Warehouse received:</strong>{" "}
          {d.order.warehouseReceivedAt
            ? new Date(d.order.warehouseReceivedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
            : "Not set"}
        </Typography>
        {can("orders", "edit") ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              disabled={fulfillMut.isPending}
              onClick={() => fulfillMut.mutate({ warehouseReceivedAt: new Date().toISOString() })}
            >
              Mark received at warehouse
            </Button>
            {d.order.warehouseReceivedAt ? (
              <Button
                size="small"
                color="inherit"
                disabled={fulfillMut.isPending}
                onClick={() => fulfillMut.mutate({ warehouseReceivedAt: null })}
              >
                Clear warehouse time
              </Button>
            ) : null}
          </Stack>
        ) : null}

        {can("orders", "edit") ? (
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Courier</InputLabel>
              <Select
                label="Courier"
                value={fulfillCourierId || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFulfillCourierId(v);
                  const nextPt = courierOptions.find((x) => x.id === v)?.partnerType ?? "manual";
                  if (d && nextPt !== "pathao") {
                    setFulfillTracking(d.order.trackingNumber ?? "");
                  }
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {courierOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Tracking number"
              size="small"
              fullWidth
              value={isPathaoFulfillmentCourier && d.order.orderNumber ? d.order.orderNumber : fulfillTracking}
              onChange={(e) => setFulfillTracking(e.target.value)}
              disabled={isPathaoFulfillmentCourier}
              InputProps={isPathaoFulfillmentCourier ? { readOnly: true } : undefined}
              InputLabelProps={isPathaoFulfillmentCourier ? { shrink: true } : undefined}
              helperText={
                isPathaoFulfillmentCourier
                  ? "Pathao uses your public order ID as merchant_order_id — this value is fixed and matches Pathao’s reference."
                  : undefined
              }
            />
            {trackLink ? (
              <Typography variant="caption">
                <a href={trackLink} target="_blank" rel="noreferrer">
                  Open carrier tracking
                </a>
              </Typography>
            ) : null}
            <Button
              variant="contained"
              disabled={fulfillMut.isPending}
              onClick={() =>
                fulfillMut.mutate({
                  courierId: fulfillCourierId || null,
                  trackingNumber:
                    isPathaoFulfillmentCourier && d.order.orderNumber
                      ? d.order.orderNumber
                      : fulfillTracking.trim() || null,
                })
              }
            >
              Save courier & tracking
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {d.courier ? `Courier: ${d.courier.name}` : "No courier"} · Tracking: {d.order.trackingNumber ?? "—"}
          </Typography>
        )}

        <Divider />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: d.order.status === "at_warehouse" ? "primary.50" : "action.hover",
            border: 1,
            borderColor: d.order.status === "at_warehouse" ? "primary.main" : "divider",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Courier dispatch
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {d.order.partnerConsignmentId ? (
                <>
                  Consignment <strong>{d.order.partnerConsignmentId}</strong> · partner{" "}
                  <strong>{partnerType}</strong>
                  {d.order.dispatchedAt ? <> · dispatched {formatDt(d.order.dispatchedAt)}</> : null}
                  {d.order.etaAt ? <> · ETA {formatDt(d.order.etaAt)}</> : null}
                </>
              ) : d.order.status === "at_warehouse" ? (
                "Pick a courier and dispatch this parcel."
              ) : (
                "Dispatch becomes available once the parcel is at the warehouse."
              )}
            </Typography>
            {(d.order.pickedUpAt || d.order.deliveredAt) ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {d.order.pickedUpAt ? <>Picked up {formatDt(d.order.pickedUpAt)}</> : null}
                {d.order.pickedUpAt && d.order.deliveredAt ? " · " : null}
                {d.order.deliveredAt ? <>Delivered {formatDt(d.order.deliveredAt)}</> : null}
              </Typography>
            ) : null}
          </Box>
          {can("orders", "edit") && d.order.status === "at_warehouse" && !d.order.partnerConsignmentId ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: 280 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Dispatch to</InputLabel>
                <Select
                  label="Dispatch to"
                  value={dispatchCourierId}
                  onChange={(e) => setDispatchCourierId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Choose…</em>
                  </MenuItem>
                  {courierOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<LocalShippingRoundedIcon />}
                disabled={!dispatchCourierId || dispatchMut.isPending}
                onClick={() => dispatchMut.mutate(dispatchCourierId)}
              >
                Dispatch
              </Button>
            </Stack>
          ) : null}
          {can("orders", "edit") && isCourierShipped ? (
            <Button
              color="error"
              variant="outlined"
              disabled={cancelShipmentMut.isPending}
              onClick={() => {
                setCancelShipmentNote("");
                setCancelShipmentOpen(true);
              }}
            >
              Cancel shipment
            </Button>
          ) : null}
        </Stack>

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Status history
        </Typography>
        <Stack spacing={1}>
          {d.history.map((h, i) => (
            <Typography key={`${h.createdAt}-${i}`} variant="caption" color="text.secondary">
              {new Date(h.createdAt).toLocaleString("en-GB")} — {statusLabel(h.status)}
              {h.note ? ` (${h.note})` : ""}
            </Typography>
          ))}
        </Stack>
      </Stack>
      ) : (
        <Box sx={{ p: 3 }}>
          {eventsQ.isLoading ? (
            <Typography color="text.secondary">Loading timeline…</Typography>
          ) : eventsQ.data ? (
            <CourierTimeline data={eventsQ.data} />
          ) : (
            <Typography color="text.secondary">Could not load timeline.</Typography>
          )}
        </Box>
      )}
    </DialogContent>
  ) : detailQ.isLoading ? (
    <DialogContent>
      <Typography color="text.secondary">Loading…</Typography>
    </DialogContent>
  ) : (
    <DialogContent>
      <Typography color="text.secondary">Could not load order.</Typography>
    </DialogContent>
  );

  const rowExtras = (o: Order) => (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button size="small" variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setDetailId(o.id)}>
        Details
      </Button>
      {can("orders", "delete") ? (
        <IconButton
          size="small"
          color="error"
          aria-label="Delete order"
          onClick={() => setDeleteConfirm({ kind: "one", id: o.id, orderNumber: o.orderNumber })}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );

  const mobileList = (
    <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
      {items.length === 0 && !listQ.isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography color="text.secondary" variant="body2">
            {q || statusFilter ? "No orders match filters." : "No orders yet."}
          </Typography>
        </Paper>
      ) : null}
      {items.map((o) => {
        const placed = new Date(o.createdAt);
        return (
          <Paper key={o.id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Checkbox checked={selected.has(o.id)} onChange={() => toggle(o.id)} size="small" />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800}>{o.orderNumber}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {o.customerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.customerPhone}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {placed.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </Typography>
                  <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                    {formatBdt(o.total)}
                  </Typography>
                </Box>
              </Stack>
              {can("orders", "edit") ? (
                <StatusSelect
                  orderId={o.id}
                  value={o.status}
                  disabled={patch.isPending}
                  onPick={(next) => requestStatusChange(o.id, o.status, next)}
                />
              ) : (
                <Chip size="small" label={statusLabel(o.status)} color={statusColor(o.status)} variant="outlined" />
              )}
              {rowExtras(o)}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );

  const desktopTable = (
    <TableContainer
      component={Paper}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "auto",
        maxWidth: "100%",
      }}
    >
      <Table size="medium" sx={{ minWidth: 880 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={items.some((i) => selected.has(i.id)) && !items.every((i) => selected.has(i.id))}
                checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                onChange={toggleAllPage}
              />
            </TableCell>
            <TableCell>Order</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Placed</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && !listQ.isLoading ? (
            <TableRow>
              <TableCell colSpan={9}>
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
                  {q || statusFilter ? "No orders match filters." : "No orders yet."}
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((o) => {
            const placed = new Date(o.createdAt);
            return (
              <TableRow key={o.id} hover selected={selected.has(o.id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                </TableCell>
                <TableCell>
                  <Typography fontWeight={800}>{o.orderNumber}</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={600}>{o.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.customerPhone}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                  {placed.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </TableCell>
                <TableCell>
                  <Typography fontWeight={700}>{formatBdt(o.total)}</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  {can("orders", "edit") ? (
                    <StatusSelect
                      orderId={o.id}
                      value={o.status}
                      disabled={patch.isPending}
                      onPick={(next) => requestStatusChange(o.id, o.status, next)}
                    />
                  ) : (
                    <Chip size="small" label={statusLabel(o.status)} color={statusColor(o.status)} variant="outlined" />
                  )}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={o.creator ?? null} dense />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <AdminStaffCell staff={o.handler ?? null} dense />
                </TableCell>
                <TableCell align="right">{rowExtras(o)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((o) => {
        const placed = new Date(o.createdAt);
        return (
          <Grid item xs={12} sm={6} key={o.id}>
            <Card variant="outlined" sx={{ borderColor: selected.has(o.id) ? "primary.main" : "divider" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Checkbox checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                  <Chip size="small" label={statusLabel(o.status)} color={statusColor(o.status)} variant="outlined" />
                </Stack>
                <Typography fontWeight={800} sx={{ mt: 1 }}>
                  {o.orderNumber}
                </Typography>
                <Typography variant="body2">{o.customerName}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {placed.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </Typography>
                <Typography fontWeight={700} sx={{ mt: 1 }}>
                  {formatBdt(o.total)}
                </Typography>
                {can("orders", "edit") ? (
                  <StatusSelect
                    orderId={o.id}
                    value={o.status}
                    disabled={patch.isPending}
                    onPick={(next) => requestStatusChange(o.id, o.status, next)}
                  />
                ) : null}
                <Stack sx={{ mt: 1 }}>{rowExtras(o)}</Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderList = () => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List disablePadding>
        {items.map((o) => (
          <ListItem
            key={o.id}
            secondaryAction={
              <Stack direction="row" alignItems="center">
                {rowExtras(o)}
              </Stack>
            }
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 24 }} onClick={() => toggle(o.id)}>
              <Checkbox edge="start" checked={selected.has(o.id)} tabIndex={-1} disableRipple />
              <ListItemText
                primary={o.orderNumber}
                secondary={`${o.customerName} · ${formatBdt(o.total)} · ${statusLabel(o.status)}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Alert severity="info" sx={{ mb: 2, maxWidth: 960 }}>
        <strong>Multi-vendor carts:</strong> One order row can include line items from several sellers. Status is stored
        per order (not per seller). Vendors who share an order see the same status — coordinate with sellers and customers
        when fulfillment differs by line.
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Search and filter orders, create orders manually (same stock rules as checkout), open the detail dialog for
        payments and fulfillment, and confirm status changes — a cancel reason is required when marking cancelled.
      </Typography>
      <AdminListToolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        page={page}
        totalPages={totalPages}
        onPageChange={(_, p) => setPage(p)}
        perPage={perPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
        total={total}
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        bulkActions={
          <>
            {can("orders", "create") ? (
              <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
                Create order
              </Button>
            ) : null}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Bulk status</InputLabel>
              <Select
                label="Bulk status"
                value={bulkStatus}
                onChange={(e: SelectChangeEvent) => setBulkStatus(e.target.value)}
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {can("orders", "edit") ? (
              <Button
                size="small"
                variant="outlined"
                disabled={!selected.size || bulkMut.isPending}
                onClick={openBulkStatusApply}
              >
                Apply status
              </Button>
            ) : null}
            {can("orders", "delete") ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={!selected.size || bulkMut.isPending}
                onClick={() => setDeleteConfirm({ kind: "bulk", count: selected.size })}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
        filters={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setQ(qInput.trim()), setPage(1))}
              sx={{ minWidth: 200 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => (setQ(qInput.trim()), setPage(1))}>
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e: SelectChangeEvent) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {createdFromIso || createdToExclusiveIso ? (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label="Date range active"
                onDelete={() => {
                  setCreatedFromIso("");
                  setCreatedToExclusiveIso("");
                  setOrdersPath("/orders");
                  setPage(1);
                }}
              />
            ) : null}
          </Stack>
        }
      />

      {listQ.isLoading ? <Typography color="text.secondary">Loading…</Typography> : null}

      {!listQ.isLoading && viewMode === "table" && isMdUp ? desktopTable : null}
      {!listQ.isLoading && viewMode === "table" && !isMdUp ? mobileList : null}
      {!listQ.isLoading && viewMode === "grid" ? (
        items.length ? (
          renderGrid()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || statusFilter ? "No orders match filters." : "No orders yet."}
          </Typography>
        )
      ) : null}
      {!listQ.isLoading && viewMode === "list" ? (
        items.length ? (
          renderList()
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {q || statusFilter ? "No orders match filters." : "No orders yet."}
          </Typography>
        )
      ) : null}

      <Dialog open={Boolean(detailId)} onClose={() => setDetailId(null)} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>Order details</DialogTitle>
        {modalContent}
        <DialogActions>
          <Button onClick={() => setDetailId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shipDlgOpen} onClose={() => !fulfillMut.isPending && setShipDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit customer & shipping</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Updates the order record (customer contact, address, Pathao location). When Pathao is enabled for the
              store, choose city and zone from the lists; shipping fee and order total are recalculated from Pathao’s
              price API using this order’s line quantities.
            </Typography>
            <TextField
              label="Customer name"
              required
              fullWidth
              value={shipForm.customerName}
              onChange={(e) => setShipForm((s) => ({ ...s, customerName: e.target.value }))}
            />
            <TextField
              label="Customer phone"
              required
              fullWidth
              value={shipForm.customerPhone}
              onChange={(e) => setShipForm((s) => ({ ...s, customerPhone: e.target.value }))}
              helperText="Stored in 01XXXXXXXXX form for delivery and SMS."
            />
            <Divider />
            <TextField
              label="Address line 1"
              required
              fullWidth
              value={shipForm.line1}
              onChange={(e) => setShipForm((s) => ({ ...s, line1: e.target.value }))}
            />
            <TextField
              label="Address line 2"
              fullWidth
              value={shipForm.line2}
              onChange={(e) => setShipForm((s) => ({ ...s, line2: e.target.value }))}
            />
            {pathaoEnabled ? (
              <Grid container spacing={2}>
                <PathaoLocationPickers
                  cities={pathaoCities}
                  zones={pathaoZones}
                  areas={pathaoAreas}
                  cityId={shipForm.pathaoCityId}
                  zoneId={shipForm.pathaoZoneId}
                  areaId={shipForm.pathaoAreaId}
                  onCityChange={handleShipPathaoCity}
                  onZoneChange={handleShipPathaoZone}
                  onAreaChange={handleShipPathaoArea}
                  labels={{
                    city: "Pathao city",
                    zone: "Pathao zone (thana)",
                    area: "Pathao area",
                    hint: "Choose Pathao city and zone (required). Labels below sync for dispatch.",
                  }}
                />
              </Grid>
            ) : null}
            <TextField
              label="City (label on order)"
              required
              fullWidth
              value={shipForm.city}
              onChange={(e) => setShipForm((s) => ({ ...s, city: e.target.value }))}
              disabled={pathaoEnabled}
              helperText={pathaoEnabled ? "Filled from Pathao city selection" : undefined}
            />
            <TextField
              label="District / zone (label on order)"
              required
              fullWidth
              value={shipForm.district}
              onChange={(e) => setShipForm((s) => ({ ...s, district: e.target.value }))}
              disabled={pathaoEnabled}
              helperText={pathaoEnabled ? "Filled from Pathao zone selection" : undefined}
            />
            <TextField
              label="Postal code"
              fullWidth
              value={shipForm.postalCode}
              onChange={(e) => setShipForm((s) => ({ ...s, postalCode: e.target.value }))}
            />
            {pathaoEnabled ? (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">Quoted shipping (Pathao)</Typography>
                <Typography fontWeight={800}>
                  {adminPathaoQuoteQ.isFetching
                    ? "…"
                    : adminPathaoQuoteQ.data?.shippingFee
                      ? formatBdt(adminPathaoQuoteQ.data.shippingFee)
                      : "—"}
                </Typography>
              </Stack>
            ) : null}
            {pathaoEnabled && adminPathaoQuoteQ.isError ? (
              <Alert severity="warning">
                {adminPathaoQuoteQ.error instanceof Error ? adminPathaoQuoteQ.error.message : "Quote failed"}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipDlgOpen(false)} disabled={fulfillMut.isPending}>
            Cancel
          </Button>
          <Button variant="contained" disabled={fulfillMut.isPending} onClick={() => void saveShippingDialog()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(statusDlg)} onClose={() => !patch.isPending && setStatusDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Change order status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {statusDlg
              ? statusDlg.next === "cancelled"
                ? `Cancel this order? A reason will be stored in status history.`
                : `Change status from "${statusLabel(statusDlg.current)}" to "${statusLabel(statusDlg.next)}"?`
              : ""}
          </Typography>
          {statusDlg?.next === "cancelled" ? (
            <TextField
              label="Cancel reason"
              required
              fullWidth
              multiline
              minRows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDlg(null)} disabled={patch.isPending}>
            Back
          </Button>
          <Button variant="contained" onClick={() => void confirmStatusChange()} disabled={patch.isPending}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelShipmentOpen}
        onClose={() => !cancelShipmentMut.isPending && setCancelShipmentOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel shipment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Notify the carrier and mark this order as <strong>cancelled</strong>. The reason is stored in status
            history and pushed to the carrier when supported.
          </Typography>
          <TextField
            label="Cancel reason"
            required
            fullWidth
            multiline
            minRows={3}
            value={cancelShipmentNote}
            onChange={(e) => setCancelShipmentNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelShipmentOpen(false)} disabled={cancelShipmentMut.isPending}>
            Back
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={cancelShipmentMut.isPending || !cancelShipmentNote.trim()}
            onClick={() => cancelShipmentMut.mutate(cancelShipmentNote.trim())}
          >
            Cancel shipment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkStatusDlg} onClose={() => !bulkMut.isPending && setBulkStatusDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk status change</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Apply status <strong>{statusLabel(bulkStatus)}</strong> to {selected.size} order(s).
          </Typography>
          {bulkStatus === "cancelled" ? (
            <TextField
              label="Cancel reason (applies to all selected)"
              required
              fullWidth
              multiline
              minRows={3}
              value={bulkStatusNote}
              onChange={(e) => setBulkStatusNote(e.target.value)}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkStatusDlg(false)} disabled={bulkMut.isPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void confirmBulkStatus()} disabled={bulkMut.isPending}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => !createOrderMut.isPending && setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Customer
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Name"
                required
                fullWidth
                value={createCustomerName}
                onChange={(e) => setCreateCustomerName(e.target.value)}
              />
              <TextField
                label="Phone"
                required
                fullWidth
                value={createCustomerPhone}
                onChange={(e) => setCreateCustomerPhone(e.target.value)}
              />
            </Stack>
            <TextField
              label="Customer user ID (optional)"
              fullWidth
              placeholder="UUID — link to registered account"
              value={createUserId}
              onChange={(e) => setCreateUserId(e.target.value)}
            />
            <FormControl fullWidth size="small" sx={{ maxWidth: 240 }}>
              <InputLabel>Payment method</InputLabel>
              <Select
                label="Payment method"
                value={createPaymentMethod}
                onChange={(e) => setCreatePaymentMethod(e.target.value as "cod" | "manual")}
              >
                <MenuItem value="cod">COD</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 1 }}>
              Shipping address
            </Typography>
            <TextField label="Line 1" required fullWidth value={shipLine1} onChange={(e) => setShipLine1(e.target.value)} />
            <TextField label="Line 2" fullWidth value={shipLine2} onChange={(e) => setShipLine2(e.target.value)} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="City" required fullWidth value={shipCity} onChange={(e) => setShipCity(e.target.value)} />
              <TextField
                label="District"
                required
                fullWidth
                value={shipDistrict}
                onChange={(e) => setShipDistrict(e.target.value)}
              />
            </Stack>
            <TextField label="Postal code" fullWidth value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} />

            <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 1 }}>
              Lines
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
              <TextField
                label="Search active products"
                fullWidth
                size="small"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setProductQ(productSearch.trim())}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setProductQ(productSearch.trim())}>
                        <SearchRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            {productSearchQ.data?.items?.length ? (
              <Paper variant="outlined" sx={{ maxHeight: 220, overflow: "auto", borderRadius: 1.5 }}>
                <List dense disablePadding>
                  {productSearchQ.data.items.map((p) => (
                    <ListItemButton key={p.id} onClick={() => void addProductToCreateLines(p)}>
                      <ListItemText primary={p.title} secondary={`${p.vendorName} · ${formatBdt(p.price)}`} />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            ) : productQ.trim() && !productSearchQ.isLoading ? (
              <Typography variant="caption" color="text.secondary">
                No products found.
              </Typography>
            ) : null}

            {createLines.map((ln, idx) => (
              <Paper key={`${ln.productId}-${idx}`} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Stack spacing={1.5}>
                  <Typography fontWeight={700}>{ln.title}</Typography>
                  {ln.variants.length > 0 ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Variant</InputLabel>
                      <Select
                        label="Variant"
                        value={ln.variantId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCreateLines((lines) =>
                            lines.map((L, i) => (i === idx ? { ...L, variantId: v || null } : L)),
                          );
                        }}
                      >
                        {ln.variants.map((v) => (
                          <MenuItem key={v.id} value={v.id}>
                            {[v.name, v.value].filter(Boolean).join(": ") || "Variant"} · {formatBdt(v.price)} · stock{" "}
                            {v.stock}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : null}
                  <TextField
                    label="Quantity"
                    type="number"
                    size="small"
                    sx={{ maxWidth: 120 }}
                    inputProps={{ min: 1 }}
                    value={ln.quantity}
                    onChange={(e) => {
                      const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setCreateLines((lines) => lines.map((L, i) => (i === idx ? { ...L, quantity: n } : L)));
                    }}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setCreateLines((lines) => lines.filter((_, i) => i !== idx))}
                  >
                    Remove line
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createOrderMut.isPending}>
            Close
          </Button>
          <Button variant="contained" onClick={submitCreateOrder} disabled={createOrderMut.isPending}>
            Create order
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === "bulk" ? "Delete orders" : "Delete order"}
        message={
          deleteConfirm?.kind === "bulk"
            ? `Delete ${deleteConfirm.count} orders? This cannot be undone.`
            : deleteConfirm?.kind === "one"
              ? `Delete order ${deleteConfirm.orderNumber}? This cannot be undone.`
              : ""
        }
        confirmLabel="Delete"
        destructive
        confirmDisabled={delMut.isPending || bulkMut.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          if (deleteConfirm.kind === "one") {
            await delMut.mutateAsync(deleteConfirm.id);
            setDeleteConfirm(null);
            return;
          }
          await bulkMut.mutateAsync({ action: "delete", ids: Array.from(selected) });
          setDeleteConfirm(null);
        }}
      />
    </Box>
  );
}
