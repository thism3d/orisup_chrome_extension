import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  Container,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
  type SelectChangeEvent,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { Link, useLocation } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiHttpError, apiJson } from "@/lib/api";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { useToast } from "@/contexts/ToastContext";
import { customerFacingCheckoutNotice } from "@/lib/storefrontCustomerMessage";
import { ShippingFields, type ShippingFormFields } from "@/components/checkout/ShippingFields";
import { PathaoLocationPickers, type PathaoIdName } from "@/components/checkout/PathaoLocationPickers";
import type { UseFormRegister } from "react-hook-form";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import {
  STOREFRONT_STICKY_HEADER_OFFSET_DESKTOP,
  storefrontAccountContainerMaxWidth,
  storefrontDataPaperSx,
  storefrontRetailTitleSx,
  storefrontRetailTitleVariant,
} from "@/lib/storefrontUiSurface";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatBdt } from "@/lib/format";
import { parseDecimalString } from "@shared/parseDecimalString";
import { cartQualifiesForFreeDelivery } from "@shared/freeDelivery";
import type { SavedAddress } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const schema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().optional(),
  paymentMethod: z.enum(["cod", "bkash", "bkash_auto", "nagad", "rocket", "upay", "stripe"]),
  pathaoCityId: z.number().int().positive().optional(),
  pathaoZoneId: z.number().int().positive().optional(),
  pathaoAreaId: z.number().int().positive().optional(),
  pathaoCityName: z.string().optional(),
  pathaoZoneName: z.string().optional(),
  pathaoAreaName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type CheckoutBody = {
  customerName: string;
  customerPhone: string;
  paymentMethod: "cod" | "bkash" | "bkash_auto" | "nagad" | "rocket" | "upay" | "stripe";
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    district: string;
    postalCode?: string;
    pathaoCityId?: number;
    pathaoZoneId?: number;
    pathaoAreaId?: number;
    pathaoCityName?: string;
    pathaoZoneName?: string;
    pathaoAreaName?: string;
  };
};

const COD_IMG = "/images/payment-methods/cash-on-delivery.png";
const PROVIDER_IMAGES: Record<"bkash" | "nagad" | "rocket" | "upay", string> = {
  bkash: "/images/payment-methods/bkash.png",
  nagad: "/images/payment-methods/nagad.png",
  rocket: "/images/payment-methods/rocket.png",
  upay: "/images/payment-methods/upay.png",
};
const CARD_BRAND_IMG = {
  visa: "/images/payment-methods/visa-card.png",
  mastercard: "/images/payment-methods/master-card.png",
} as const;

function mapGatewayOrCheckoutError(
  err: unknown,
  text: (en: string, bn: string) => string,
): string {
  const code =
    err instanceof ApiHttpError && err.code
      ? err.code.toLowerCase()
      : err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string"
        ? String((err as { code: string }).code).toLowerCase()
        : "";
  const message = err instanceof Error ? err.message : text("Payment could not be started.", "পেমেন্ট শুরু করা যায়নি।");
  const lower = message.toLowerCase();
  if (
    code === "no_available_instant_device" ||
    code === "no_available_instant_devices" ||
    code === "all_instant_devices_busy" ||
    code === "no_agent_wallet"
  ) {
    return text(
      "This payment method is currently unavailable. Please choose another method or try again later.",
      "এই পেমেন্ট পদ্ধতিটি এখন অনুপলব্ধ। অন্য পদ্ধতি বেছে নিন বা পরে আবার চেষ্টা করুন।",
    );
  }
  if (code === "nagad_init_failed" || code === "nagad_session_rejected" || code === "nagad_error") {
    return text(
      "Nagad could not be started from checkout. Try again later or use another payment option.",
      "নগদ চেকআউট থেকে শুরু করা যায়নি। পরে চেষ্টা করুন বা অন্য পেমেন্ট বেছে নিন।",
    );
  }
  if (
    code === "bkash_create_failed" ||
    code === "bkash_missing_url" ||
    code === "bkash_invalid_response"
  ) {
    return text(
      "bKash could not be started from checkout. Try again later or use another payment option.",
      "বিকাশ চেকআউট থেকে শুরু করা যায়নি। পরে চেষ্টা করুন বা অন্য পেমেন্ট বেছে নিন।",
    );
  }
  if (code === "stripe_not_configured") {
    return text(
      "Card payments are not available yet. Choose another method or contact support.",
      "কার্ড পেমেন্ট এখনও সক্রিয় নয়। অন্য পদ্ধতি বেছে নিন বা সাপোর্টে যোগাযোগ করুন।",
    );
  }
  if (lower.includes("not in a payable state") || lower.includes("payable state")) {
    return text(
      "This checkout session is no longer valid. Update your cart if needed and try again.",
      "এই চেকআউট সেশন আর বৈধ নয়। প্রয়োজনে কার্ট আপডেট করে আবার চেষ্টা করুন।",
    );
  }
  if (lower.includes("not available") || lower.includes("unavailable")) {
    return text("Gateway is temporarily unavailable. Please try again later or pick another method.", "গেটওয়ে সাময়িকভাবে অনুপলব্ধ। পরে চেষ্টা করুন বা অন্য পদ্ধতি বেছে নিন।");
  }
  if (lower.includes("configure") || lower.includes("missing required")) {
    return text("Merchant payment configuration is incomplete.", "মার্চেন্ট পেমেন্ট কনফিগারেশন অসম্পূর্ণ।");
  }
  if (lower.includes("amount")) return text("Payment amount is invalid. Refresh and try again.", "পেমেন্টের পরিমাণ অবৈধ। রিফ্রেশ করে আবার চেষ্টা করুন।");
  if (lower.includes("signature")) return text("Gateway signature validation failed.", "গেটওয়ে স্বাক্ষর যাচাই ব্যর্থ।");
  if (lower.includes("timeout")) return text("Gateway request timed out. Please retry.", "গেটওয়ে অনুরোধ সময় শেষ। আবার চেষ্টা করুন।");
  return message;
}

export function CheckoutPage() {
  const theme = useTheme();
  /** bKash Auto (manual app flow) — gated on viewport; desktop clicks / pay blocked with toast. */
  const isMobileCheckoutViewport = useMediaQuery(theme.breakpoints.down("md"), {
    defaultMatches: false,
    noSsr: true,
  });
  const showToast = useToast();
  const search = useSearch();
  const { containerMaxWidth, minimalChrome, uiTemplate } = useStorefrontUiTemplate();
  const checkoutStepIconProps = {
    sx: {
      "&.Mui-active": { color: theme.palette.primary.main },
      "&.Mui-completed": { color: theme.palette.success.main },
    },
  };
  const brand = useSiteBrand();
  const { text } = useStorefrontLanguage();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: cartData, isLoading: cartLoading } = useCart();
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  const [savedAddrId, setSavedAddrId] = useState("");
  const [localCheckoutError, setLocalCheckoutError] = useState<string | null>(null);
  const [returnUrlNotice, setReturnUrlNotice] = useState<string | null>(null);

  const paymentReturnParams = useMemo(() => new URLSearchParams(search), [search]);
  useEffect(() => {
    const st = (paymentReturnParams.get("payment_status") ?? "").toLowerCase();
    const reason = paymentReturnParams.get("payment_reason")?.trim();
    if (!st && !reason) return;
    if (reason) {
      setReturnUrlNotice(customerFacingCheckoutNotice(reason) || text("Payment was not completed.", "পেমেন্ট সম্পন্ন হয়নি।"));
    } else if (["failed", "cancelled", "canceled", "cancel"].includes(st)) {
      setReturnUrlNotice(text("Payment was not completed.", "পেমেন্ট সম্পন্ন হয়নি।"));
    }
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `${window.location.pathname}`);
    }
  }, [paymentReturnParams, text]);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["me-addresses"],
    queryFn: () => apiJson<SavedAddress[]>("/api/me/addresses"),
    enabled: Boolean(user),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: "bkash",
      line2: "",
      postalCode: "",
    },
  });

  const pathaoCityId = form.watch("pathaoCityId");
  const pathaoZoneId = form.watch("pathaoZoneId");
  const pathaoAreaId = form.watch("pathaoAreaId");

  const pathaoZonesQ = useQuery({
    queryKey: ["pathao-zones", pathaoCityId],
    enabled: Boolean(pathaoEnabled && pathaoCityId),
    queryFn: () => apiJson<{ zones: PathaoIdName[] }>(`/api/store/pathao/cities/${pathaoCityId}/zones`).then((r) => r.zones),
  });
  const pathaoZones = pathaoZonesQ.data ?? [];

  const pathaoAreasQ = useQuery({
    queryKey: ["pathao-areas", pathaoZoneId],
    enabled: Boolean(pathaoEnabled && pathaoZoneId),
    queryFn: () => apiJson<{ areas: { id: number; name: string }[] }>(`/api/store/pathao/zones/${pathaoZoneId}/areas`).then((r) => r.areas),
  });
  const pathaoAreas = pathaoAreasQ.data ?? [];

  /** Include qty/product/variant so the quote refetches when the cart changes, not only when line count changes. */
  const pathaoQuoteCartSignature = useMemo(() => {
    const rows = cartData?.lines ?? [];
    return rows
      .map((r) => `${r.line.id}:${r.line.quantity}:${r.line.productId}:${r.line.variantId ?? ""}`)
      .sort()
      .join("|");
  }, [cartData?.lines]);

  const pathaoQuoteQ = useQuery({
    queryKey: ["pathao-quote", pathaoCityId, pathaoZoneId, pathaoAreaId, pathaoQuoteCartSignature],
    enabled: Boolean(pathaoEnabled && pathaoCityId && pathaoZoneId && (cartData?.lines?.length ?? 0) > 0),
    queryFn: () =>
      apiJson<{ shippingFee: string; freeDeliveryApplied?: boolean }>("/api/store/pathao/quote", {
        method: "POST",
        body: JSON.stringify({
          pathaoCityId,
          pathaoZoneId,
          ...(pathaoAreaId ? { pathaoAreaId } : {}),
        }),
      }),
  });

  useEffect(() => {
    if (!user) return;
    const p = user.phone?.trim();
    if (p) form.setValue("customerPhone", p);
    if (user.fullName) form.setValue("customerName", user.fullName);
  }, [user?.id, user?.phone, user?.fullName, form]);

  const syncProfilePhoneFromCheckout = async (phone: string) => {
    if (!user) return;
    const t = phone.trim();
    if (t.length < 10) return;
    const cur = user.phone?.trim() ?? "";
    if (t === cur) return;
    try {
      await apiJson("/api/me/profile", { method: "PATCH", body: JSON.stringify({ phone: t }) });
      void qc.invalidateQueries({ queryKey: ["me"] });
    } catch {
      /* non-blocking */
    }
  };

  const paymentMethod = form.watch("paymentMethod");

  const bkashAutoDesktopOnlyMessage = () =>
    text(
      "bKash Auto is only available from a phone or small tablet checkout. Switch to mobile or choose standard bKash.",
      "বিকাশ অটো শুধুমাত্র ফোন বা ছোট ট্যাবলেটের চেকআউট থেকে ব্যবহারযোগ্য। মোবাইলে যান অথবা সাধারণ বিকাশ বেছে নিন।",
    );

  const handlePathaoCity = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      form.setValue("pathaoCityId", undefined);
      form.setValue("pathaoZoneId", undefined);
      form.setValue("pathaoAreaId", undefined);
      form.setValue("pathaoCityName", "");
      form.setValue("pathaoZoneName", "");
      form.setValue("pathaoAreaName", "");
      form.setValue("city", "—");
      form.setValue("district", "—");
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    form.setValue("pathaoCityId", id);
    form.setValue("pathaoZoneId", undefined);
    form.setValue("pathaoAreaId", undefined);
    const name = pathaoCities.find((c) => c.id === id)?.name ?? "";
    form.setValue("city", name.length ? name : "—");
    form.setValue("district", "—");
    form.setValue("pathaoCityName", name);
    form.setValue("pathaoZoneName", "");
    form.setValue("pathaoAreaName", "");
  };

  const handlePathaoZone = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      form.setValue("pathaoZoneId", undefined);
      form.setValue("pathaoAreaId", undefined);
      form.setValue("pathaoZoneName", "");
      form.setValue("pathaoAreaName", "");
      form.setValue("district", "—");
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    form.setValue("pathaoZoneId", id);
    form.setValue("pathaoAreaId", undefined);
    const zn = pathaoZones.find((z) => z.id === id)?.name ?? "";
    form.setValue("district", zn.length ? zn : "—");
    form.setValue("pathaoZoneName", zn);
    form.setValue("pathaoAreaName", "");
  };

  const handlePathaoArea = (e: SelectChangeEvent<number | "">) => {
    const raw = e.target.value;
    if (raw === "") {
      form.setValue("pathaoAreaId", undefined);
      form.setValue("pathaoAreaName", "");
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    form.setValue("pathaoAreaId", id);
    const an = pathaoAreas.find((x) => x.id === id)?.name ?? "";
    form.setValue("pathaoAreaName", an);
  };

  const applySavedAddress = (a: SavedAddress) => {
    form.setValue("line1", a.line1);
    form.setValue("line2", a.line2 ?? "");
    form.setValue("city", a.city);
    form.setValue("district", a.district);
    form.setValue("postalCode", a.postalCode ?? "");
    form.setValue("customerPhone", a.phone);
    if (a.pathaoCityId != null) form.setValue("pathaoCityId", a.pathaoCityId);
    else form.setValue("pathaoCityId", undefined);
    if (a.pathaoZoneId != null) form.setValue("pathaoZoneId", a.pathaoZoneId);
    else form.setValue("pathaoZoneId", undefined);
    if (a.pathaoAreaId != null) form.setValue("pathaoAreaId", a.pathaoAreaId);
    else form.setValue("pathaoAreaId", undefined);
    form.setValue("pathaoCityName", a.pathaoCityName ?? "");
    form.setValue("pathaoZoneName", a.pathaoZoneName ?? "");
    form.setValue("pathaoAreaName", a.pathaoAreaName ?? "");
    if (user?.fullName) form.setValue("customerName", user.fullName);
  };

  const onPickSavedAddress = (e: SelectChangeEvent<string>) => {
    const id = e.target.value;
    setSavedAddrId(id);
    if (!id) return;
    const a = savedAddresses.find((x) => x.id === id);
    if (a) applySavedAddress(a);
  };

  const checkout = useMutation({
    mutationFn: (body: CheckoutBody) =>
      apiJson<{ orderNumber: string }>("/api/orders/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onMutate: () => {
      setLocalCheckoutError(null);
    },
    onSuccess: async (r, vars) => {
      if (saveAddressToBook && user) {
        try {
          await apiJson("/api/me/addresses", {
            method: "POST",
            body: JSON.stringify({
              label: "From checkout",
              line1: vars.shippingAddress.line1,
              line2: vars.shippingAddress.line2 ?? null,
              city: vars.shippingAddress.city,
              district: vars.shippingAddress.district,
              postalCode: vars.shippingAddress.postalCode ?? null,
              phone: vars.customerPhone,
              isDefault: savedAddresses.length === 0,
              pathaoCityId: vars.shippingAddress.pathaoCityId ?? null,
              pathaoZoneId: vars.shippingAddress.pathaoZoneId ?? null,
              pathaoAreaId: vars.shippingAddress.pathaoAreaId ?? null,
              pathaoCityName: vars.shippingAddress.pathaoCityName ?? null,
              pathaoZoneName: vars.shippingAddress.pathaoZoneName ?? null,
              pathaoAreaName: vars.shippingAddress.pathaoAreaName ?? null,
            }),
          });
          void qc.invalidateQueries({ queryKey: ["me-addresses"] });
        } catch {
          /* non-blocking */
        }
      }
      await syncProfilePhoneFromCheckout(vars.customerPhone);
      void qc.invalidateQueries({ queryKey: ["cart"] });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      setLocation(`/order-done/${encodeURIComponent(r.orderNumber)}`);
    },
  });

  const providerInitiate = useMutation({
    mutationFn: (body: CheckoutBody) =>
      apiJson<{ orderNumber: string; paymentId: string; redirectUrl: string }>("/api/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          provider: body.paymentMethod,
          shippingAddress: body.shippingAddress,
        }),
      }),
    onSuccess: async (r, vars) => {
      await syncProfilePhoneFromCheckout(vars.customerPhone);
      window.location.href = r.redirectUrl;
    },
    onMutate: () => {
      setLocalCheckoutError(null);
    },
  });

  const onSubmit = form.handleSubmit((v) => {
    setLocalCheckoutError(null);
    const body: CheckoutBody = {
      customerName: v.customerName,
      customerPhone: v.customerPhone,
      paymentMethod: v.paymentMethod,
      shippingAddress: {
        line1: v.line1,
        line2: v.line2 || undefined,
        city: v.city,
        district: v.district,
        postalCode: v.postalCode || undefined,
        ...(v.pathaoCityId != null ? { pathaoCityId: v.pathaoCityId } : {}),
        ...(v.pathaoZoneId != null ? { pathaoZoneId: v.pathaoZoneId } : {}),
        ...(v.pathaoAreaId != null ? { pathaoAreaId: v.pathaoAreaId } : {}),
        ...(v.pathaoCityName ? { pathaoCityName: v.pathaoCityName } : {}),
        ...(v.pathaoZoneName ? { pathaoZoneName: v.pathaoZoneName } : {}),
        ...(v.pathaoAreaName ? { pathaoAreaName: v.pathaoAreaName } : {}),
      },
    };

    if (pathaoEnabled && !pathaoLocationReady) {
      setLocalCheckoutError(
        text(
          "Choose city and zone and wait for the delivery quote before paying.",
          "পেমেন্টের আগে শহর ও জোন বেছে নিন এবং ডেলিভারি চার্জ লোড হতে দিন।",
        ),
      );
      return;
    }

    const miss = (cartData?.lines ?? []).filter((r) => (r.productVariantCount ?? 0) > 0 && !r.variant);
    if (miss.length > 0) {
      setLocalCheckoutError(
        text(
          miss.map((m) => `Choose options for “${m.product.title}” before paying.`).join(" "),
          miss.map((m) => `“${m.product.title}”-এর অপশন বেছে নিন, তারপর পেমেন্ট করুন।`).join(" "),
        ),
      );
      return;
    }

    if (body.paymentMethod === "cod") {
      checkout.mutate(body);
      return;
    }
    if (body.paymentMethod === "bkash_auto" && !isMobileCheckoutViewport) {
      showToast(bkashAutoDesktopOnlyMessage(), "error");
      return;
    }
    providerInitiate.mutate(body);
  });

  const lines = cartData?.lines ?? [];
  const subtotal = lines.reduce((s, l) => {
    const unit = l.variant ? parseDecimalString(l.variant.price) : parseDecimalString(l.product.price);
    return s + unit * l.line.quantity;
  }, 0);

  const showMixedFreeDeliveryNote = useMemo(() => {
    if (lines.length === 0) return false;
    const anyFeatured = lines.some((l) => Boolean(l.product.freeDeliveryEnabled));
    if (!anyFeatured) return false;
    const pack = lines.map((row) => ({
      product: {
        freeDeliveryEnabled: Boolean(row.product.freeDeliveryEnabled),
        freeDeliveryMinCartAmount: row.product.freeDeliveryMinCartAmount ?? null,
        freeDeliveryMinQuantity: row.product.freeDeliveryMinQuantity ?? null,
      },
      quantity: row.line.quantity,
    }));
    return !cartQualifiesForFreeDelivery(subtotal, pack);
  }, [lines, subtotal]);

  const shippingFeeNum =
    pathaoEnabled && pathaoQuoteQ.data?.shippingFee && lines.length > 0
      ? parseDecimalString(pathaoQuoteQ.data.shippingFee)
      : 0;
  const grandTotal = subtotal + shippingFeeNum;
  const pathaoLocationReady =
    !pathaoEnabled || (Boolean(pathaoCityId) && Boolean(pathaoZoneId) && pathaoQuoteQ.isSuccess);

  if (!cartLoading && lines.length === 0) {
    return (
      <>
        <Seo title={text("Checkout", "চেকআউট")} description={text(`Checkout on ${brand}.`, `${brand}-এ চেকআউট।`)} noindex canonicalPath="/checkout" />
      <FadeInSection>
        <Container maxWidth={storefrontAccountContainerMaxWidth(uiTemplate)} sx={{ py: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {text("Your cart is empty. Add products before checkout.", "আপনার কার্ট খালি। চেকআউটের আগে পণ্য যোগ করুন।")}
          </Alert>
          <Button component={Link} href="/shop" variant="contained" sx={{ fontWeight: 800 }}>
            {text("Continue shopping", "শপিং চালিয়ে যান")}
          </Button>
        </Container>
      </FadeInSection>
      </>
    );
  }

  return (
    <>
      <Seo title={text("Checkout", "চেকআউট")} description={text(`Complete your ${brand} order — shipping and payment.`, `${brand}-এ আপনার অর্ডার সম্পন্ন করুন — শিপিং ও পেমেন্টসহ।`)} noindex canonicalPath="/checkout" />
    <FadeInSection>
      <Container maxWidth={containerMaxWidth} sx={{ py: 3 }}>
        <Typography
          variant={storefrontRetailTitleVariant(uiTemplate)}
          component="h1"
          gutterBottom
          sx={storefrontRetailTitleSx(uiTemplate)}
        >
          {text("Checkout", "চেকআউট")}
        </Typography>
        <Stepper activeStep={1} alternativeLabel sx={{ mb: 3, maxWidth: 520, mx: "auto" }}>
          <Step>
            <StepLabel StepIconProps={checkoutStepIconProps}>
              <Typography component={Link} href="/cart" variant="body2" sx={{ color: "inherit", cursor: "pointer" }}>
                {text("Cart", "কার্ট")}
              </Typography>
            </StepLabel>
          </Step>
          <Step>
            <StepLabel StepIconProps={checkoutStepIconProps}>{text("Details & payment", "ঠিকানা ও পেমেন্ট")}</StepLabel>
          </Step>
          <Step>
            <StepLabel StepIconProps={checkoutStepIconProps}>{text("Confirmation", "নিশ্চিতকরণ")}</StepLabel>
          </Step>
        </Stepper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                ...storefrontDataPaperSx(uiTemplate),
                p: 3,
                ...(minimalChrome ? { boxShadow: "none" } : {}),
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                {text("Shipping & contact", "শিপিং ও যোগাযোগ")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {text("We use this for delivery and COD confirmation.", "ডেলিভারি ও ক্যাশ অন ডেলিভারি নিশ্চিত করতে এগুলো লাগবে।")}
              </Typography>
              <form onSubmit={onSubmit}>
                {returnUrlNotice ? (
                  <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setReturnUrlNotice(null)}>
                    {returnUrlNotice}
                  </Alert>
                ) : null}
                {user && !user.phone?.trim() ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {text(
                      "Add a mobile number for delivery updates. We will save it to your account after you place the order.",
                      "ডেলিভারি আপডেটের জন্য মোবাইল নম্বর দিন। অর্ডারের পর এটি আপনার অ্যাকাউন্টে সংরক্ষিত হবে।",
                    )}
                  </Alert>
                ) : null}
                {localCheckoutError ? (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalCheckoutError(null)}>
                    {localCheckoutError}
                  </Alert>
                ) : null}
                {user && savedAddresses.length > 0 ? (
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="saved-addr-label">{text("Use saved address", "সংরক্ষিত ঠিকানা ব্যবহার করুন")}</InputLabel>
                    <Select
                      labelId="saved-addr-label"
                      label={text("Use saved address", "সংরক্ষিত ঠিকানা")}
                      value={savedAddrId}
                      onChange={onPickSavedAddress}
                    >
                      <MenuItem value="">
                        <em>{text("Enter manually below", "নিচে ম্যানুয়ালি লিখুন")}</em>
                      </MenuItem>
                      {savedAddresses.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.label || a.line1} — {a.district}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}
                {pathaoCitiesQ.isLoading ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }} display="block">
                    {text("Checking delivery options…", "ডেলিভারি অপশন চেক করা হচ্ছে…")}
                  </Typography>
                ) : null}
                {pathaoEnabled && pathaoQuoteQ.isError ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {text(
                      "Could not get delivery price for this address. Fix courier settings or try again.",
                      "এই ঠিকানার জন্য ডেলিভারি মূল্য পাওয়া যায়নি। কুরিয়ার সেটিং ঠিক করুন বা আবার চেষ্টা করুন।",
                    )}{" "}
                    {pathaoQuoteQ.error instanceof Error ? pathaoQuoteQ.error.message : ""}
                  </Alert>
                ) : null}
                <ShippingFields
                  hideCityDistrict={pathaoEnabled}
                  register={form.register as unknown as UseFormRegister<ShippingFormFields>}
                >
                  {pathaoEnabled ? (
                    <PathaoLocationPickers
                      cities={pathaoCities}
                      zones={pathaoZones}
                      areas={pathaoAreas}
                      cityId={pathaoCityId ?? ""}
                      zoneId={pathaoZoneId ?? ""}
                      areaId={pathaoAreaId ?? ""}
                      onCityChange={handlePathaoCity}
                      onZoneChange={handlePathaoZone}
                      onAreaChange={handlePathaoArea}
                      labels={{
                        city: text("City", "শহর"),
                        zone: text("Zone (thana)", "জোন (থানা)"),
                        area: text("Area", "এলাকা"),
                        hint: text(
                          "Choose city and zone from the list (required for delivery and pricing).",
                          "তালিকা থেকে শহর ও জোন বেছে নিন (ডেলিভারি ও মূল্যের জন্য প্রয়োজন)।",
                        ),
                      }}
                    />
                  ) : null}
                </ShippingFields>
                {user ? (
                  <FormControlLabel
                    sx={{ mt: 1, display: "block" }}
                    control={
                      <Checkbox
                        checked={saveAddressToBook}
                        onChange={(_, c) => setSaveAddressToBook(c)}
                      />
                    }
                    label={text("Save this address to my account after placing the order", "অর্ডার করার পর এই ঠিকানাটি আমার অ্যাকাউন্টে সংরক্ষণ করুন")}
                  />
                ) : null}

                <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
                  {text("Payment method", "পেমেন্ট পদ্ধতি")}
                </Typography>
                <Box
                  sx={{
                    mb: 2,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
                    gap: 1.5,
                  }}
                >
                  {(
                    [
                      ["bkash", undefined],
                      ["bkash_auto", "New"],
                      ["nagad", "New"],
                      ["rocket", "New"],
                      ["upay", undefined],
                    ] as const
                  ).map(([providerKey, badge]) => {
                    const imgKey = providerKey === "bkash_auto" ? "bkash" : providerKey;
                    return (
                      <Card
                        key={providerKey}
                        variant="outlined"
                        sx={{
                          height: "100%",
                          position: "relative",
                          overflow: "visible",
                          borderWidth: 2,
                          borderColor: paymentMethod === providerKey ? storefrontBrandMain(theme) : "divider",
                          bgcolor: paymentMethod === providerKey ? alpha(storefrontBrandMain(theme), 0.08) : "background.paper",
                        }}
                      >
                        {badge ? (
                          <Chip
                            label={badge}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              zIndex: 1,
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                            }}
                          />
                        ) : null}
                        <CardActionArea
                          onClick={() => {
                            if (providerKey === "bkash_auto" && !isMobileCheckoutViewport) {
                              showToast(bkashAutoDesktopOnlyMessage(), "error");
                              return;
                            }
                            form.setValue("paymentMethod", providerKey, { shouldValidate: true });
                          }}
                          sx={{ p: 2 }}
                        >
                          <Stack spacing={1} alignItems="center" textAlign="center">
                            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                              <Box
                                component="img"
                                src={PROVIDER_IMAGES[imgKey]}
                                alt=""
                                sx={{ height: 38, width: "auto", objectFit: "contain" }}
                              />
                            </Box>
                            <Typography fontWeight={800} variant="body2">
                              {providerKey === "bkash_auto"
                                ? text("bKash", "বিকাশ")
                                : imgKey.toUpperCase()}
                            </Typography>
                          </Stack>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderWidth: 2,
                      borderColor: paymentMethod === "stripe" ? storefrontBrandMain(theme) : "divider",
                      bgcolor: paymentMethod === "stripe" ? alpha(storefrontBrandMain(theme), 0.08) : "background.paper",
                    }}
                  >
                    <CardActionArea
                      onClick={() => form.setValue("paymentMethod", "stripe", { shouldValidate: true })}
                      sx={{ p: 2 }}
                    >
                      <Stack spacing={1} alignItems="center" textAlign="center">
                        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                          <Box component="img" src={CARD_BRAND_IMG.visa} alt="" sx={{ height: 38, width: "auto", objectFit: "contain" }} />
                          <Box component="img" src={CARD_BRAND_IMG.mastercard} alt="" sx={{ height: 38, width: "auto", objectFit: "contain" }} />
                        </Stack>
                        <Typography fontWeight={800} variant="body2">
                          {text("Card", "কার্ড")}
                        </Typography>
                      </Stack>
                    </CardActionArea>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderWidth: 2,
                      borderColor: paymentMethod === "cod" ? storefrontBrandMain(theme) : "divider",
                      bgcolor: paymentMethod === "cod" ? alpha(storefrontBrandMain(theme), 0.08) : "background.paper",
                    }}
                  >
                    <CardActionArea onClick={() => form.setValue("paymentMethod", "cod", { shouldValidate: true })} sx={{ p: 2 }}>
                      <Stack spacing={1} alignItems="center" textAlign="center">
                        <Box component="img" src={COD_IMG} alt="" sx={{ height: 38, width: "auto", objectFit: "contain" }} />
                        <Typography fontWeight={800} variant="body2">
                          {text("Cash on delivery", "ডেলিভারিতে পেমেন্ট")}
                        </Typography>
                      </Stack>
                    </CardActionArea>
                  </Card>
                </Box>
                <input type="hidden" {...form.register("paymentMethod")} />

                {checkout.isError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {mapGatewayOrCheckoutError(checkout.error, text)}
                  </Alert>
                )}
                {providerInitiate.isError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {mapGatewayOrCheckoutError(providerInitiate.error, text)}
                  </Alert>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3 }} alignItems={{ sm: "center" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={
                      checkout.isPending ||
                      providerInitiate.isPending ||
                      (pathaoEnabled && !pathaoLocationReady)
                    }
                    size="large"
                    sx={{ fontWeight: 800, px: 4 }}
                  >
                    {checkout.isPending || providerInitiate.isPending
                      ? text("Processing…", "প্রসেসিং…")
                      : paymentMethod === "cod"
                        ? text("Place order", "অর্ডার করুন")
                        : text("Pay now", "এখন পরিশোধ করুন")}
                  </Button>
                  <Button component={Link} href="/cart" color="inherit">
                    {text("Back to cart", "কার্টে ফিরে যান")}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                ...storefrontDataPaperSx(uiTemplate),
                p: 2.5,
                position: { md: "sticky" },
                top: { md: STOREFRONT_STICKY_HEADER_OFFSET_DESKTOP },
                alignSelf: { md: "flex-start" },
                ...(minimalChrome ? { boxShadow: "none" } : {}),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <ShoppingBagOutlinedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>
                  {text("Order summary", "অর্ডার সারসংক্ষেপ")}
                </Typography>
              </Stack>
              {cartLoading ? (
                <Typography color="text.secondary">{text("Loading cart…", "কার্ট লোড হচ্ছে…")}</Typography>
              ) : (
                <>
                  {lines.some((r) => (r.productVariantCount ?? 0) > 0 && !r.variant) ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {text(
                        "Some items need a size or color choice. Pick options below or open the product page.",
                        "কিছু পণ্যের সাইজ বা রং বেছে নিতে হবে। নিচে অপশন বেছে নিন বা পণ্যের পেজ খুলুন।",
                      )}
                    </Alert>
                  ) : null}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {text("Update quantities or remove items here before you pay.", "পরিশোধের আগে এখান থেকে পরিমাণ বদলান বা সরান।")}
                  </Typography>
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                      maxHeight: 480,
                      overflow: "auto",
                      borderRadius: 2,
                      borderColor: "divider",
                    }}
                  >
                    {lines.map((row) => (
                      <CartLineRow key={row.line.id} row={row} />
                    ))}
                  </Card>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography color="text.secondary">{text("Subtotal", "সাবটোটাল")}</Typography>
                    <Typography fontWeight={800}>{formatBdt(subtotal)}</Typography>
                  </Stack>
                  {pathaoEnabled ? (
                    <>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography color="text.secondary">{text("Shipping", "শিপিং")}</Typography>
                        <Typography fontWeight={800}>
                          {pathaoQuoteQ.isFetching
                            ? text("…", "…")
                            : pathaoQuoteQ.isSuccess
                              ? formatBdt(shippingFeeNum)
                              : "—"}
                        </Typography>
                      </Stack>
                      {pathaoQuoteQ.isFetching ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {text("Calculating delivery fee…", "ডেলিভারি ফি হিসাব করা হচ্ছে…")}
                        </Typography>
                      ) : pathaoQuoteQ.isSuccess && pathaoQuoteQ.data?.freeDeliveryApplied ? (
                        <Typography variant="caption" color="success.main" display="block" sx={{ mb: 1 }}>
                          {text(
                            "Free delivery applies — every item in your cart qualifies under the free-delivery rules.",
                            "বিনামূল্যে ডেলিভারি প্রযোজ্য — আপনার কার্টের প্রতিটি পণ্য ফ্রি ডেলিভারি নিয়ম পূরণ করেছে।",
                          )}
                        </Typography>
                      ) : pathaoQuoteQ.isSuccess &&
                        !pathaoQuoteQ.data?.freeDeliveryApplied &&
                        showMixedFreeDeliveryNote ? (
                        <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
                          {text(
                            "Standard delivery fee applies because not every item in your cart qualifies for free delivery together.",
                            "সাধারণ ডেলিভারি ফি প্রযোজ্য — আপনার কার্টের সব পণ্য একসাথে ফ্রি ডেলিভারির জন্য যোগ্য নয়।",
                          )}
                        </Typography>
                      ) : null}
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {text("Shipping may be quoted by the vendor. Final total shown on your order confirmation.", "শিপিং চার্জ ভেন্ডর নির্ধারণ করতে পারে। চূড়ান্ত মোট আপনার অর্ডার কনফার্মেশনে দেখানো হবে।")}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={800}>{text("Due now", "এখন পরিশোধযোগ্য")}</Typography>
                    <Typography fontWeight={800} color="primary">
                      {formatBdt(pathaoEnabled ? grandTotal : subtotal)}
                    </Typography>
                  </Stack>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </FadeInSection>
    </>
  );
}
