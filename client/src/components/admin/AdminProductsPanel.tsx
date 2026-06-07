import {
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
  FormControl,
  FormControlLabel,
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { Link } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { formatBdt } from "@/lib/format";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";
import { AdminRichTextEditor } from "./AdminRichTextEditor";
import { AdminProductImagesField } from "./AdminProductImagesField";
import { AdminProductDiscountHelper } from "./AdminProductDiscountHelper";
import { AdminImageViewerDialog } from "./AdminImageViewerDialog";
import { AdminSpecificationsEditor } from "./AdminSpecificationsEditor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import type { Category } from "@/lib/types";
import { categoryBreadcrumb } from "@shared/categoryTree";
import { parseDecimalString } from "@shared/parseDecimalString";
import { mediaAbsoluteUrl } from "@/lib/site";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";
import {
  getAllPromptsForPicker,
  listCustomPrompts,
  saveNewPromptFromText,
  removeCustomPrompt,
} from "@/lib/aiProductEnhancePrompts";

type ProductRow = {
  id: string;
  vendorId: string;
  title: string;
  slug: string;
  price: string;
  stock: number;
  status: string;
  updatedAt: string;
  vendorName: string;
  vendorSlug: string;
  images: string[];
  creator?: StaffRef;
  handler?: StaffRef;
};

type AdminProductVariant = {
  id: string;
  productId: string;
  kind: string;
  name: string;
  value: string;
  price: string;
  stock: number;
  sortOrder: number;
};

type ProductDetail = {
  product: {
    id: string;
    vendorId: string;
    title: string;
    slug: string;
    description: string | null;
    price: string;
    compareAtPrice: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    stock: number;
    status: string;
    categoryId: string | null;
    images: string[];
    keyFeaturesJson?: { en: string; bn: string } | null;
    specificationsJson?: { label: string; value: string }[] | null;
    generalInfoJson?: { en: string; bn: string } | null;
    freeDeliveryEnabled?: boolean;
    freeDeliveryMinCartAmount?: string | null;
    freeDeliveryMinQuantity?: number | null;
  };
  vendorName: string;
  vendorSlug: string;
  variants: AdminProductVariant[];
};

type VendorOption = {
  id: string;
  name: string;
  slug: string;
};

type VariantDraft = {
  kind: "size" | "color" | "custom";
  name: string;
  value: string;
  price: string;
  stock: string;
};

type ProductForm = {
  vendorId: string;
  categoryRootId: string;
  categorySubId: string;
  categorySubSubId: string;
  title: string;
  slug: string;
  price: string;
  compareAtPrice: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  stock: string;
  description: string;
  status: "draft" | "active";
  images: string[];
  keyFeaturesEn: string;
  keyFeaturesBn: string;
  specificationsJsonText: string;
  generalInfoEn: string;
  generalInfoBn: string;
  variants: VariantDraft[];
  freeDeliveryEnabled: boolean;
  freeDeliveryMinCartAmount: string;
  freeDeliveryMinQuantity: string;
};

type ImportedProduct = {
  sourceUrl: string;
  sourceHost: string;
  title: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  description: string;
  images: string[];
};

type AiEnhancedProduct = {
  title: string;
  categorySuggestion?: {
    leafCategoryId: string | null;
  };
  shortDescriptionEn: string;
  shortDescriptionBn: string;
  descriptionHtmlEn: string;
  descriptionHtmlBn: string;
  specs: Array<{ label: string; value: string }>;
  keyFeaturesEn: string[];
  keyFeaturesBn: string[];
  generalInformationHtmlEn: string;
  generalInformationHtmlBn: string;
  seo: {
    titleEn: string;
    descriptionEn: string;
    keywordsEn: string;
    titleBn: string;
    descriptionBn: string;
    keywordsBn: string;
  };
  imageReview: {
    bestPrimaryIndex: number;
    notes: string;
  };
};

type ImportEnhanceResponse = {
  ok: boolean;
  warning?: string;
  model?: string;
  enhanced?: AiEnhancedProduct;
};

function sortCategoriesByOrder(a: Category, b: Category) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/** Stored `categoryId` is always the deepest selected node (sub-sub, else sub, else root). */
function effectiveProductCategoryId(
  f: Pick<ProductForm, "categoryRootId" | "categorySubId" | "categorySubSubId">,
): string {
  return f.categorySubSubId || f.categorySubId || f.categoryRootId;
}

function categoryPickFromStoredId(rows: Category[], storedId: string | null) {
  if (!storedId || !rows.length) {
    return { categoryRootId: "", categorySubId: "", categorySubSubId: "" };
  }
  const bc = categoryBreadcrumb(rows, storedId);
  if (!bc.length) {
    return { categoryRootId: "", categorySubId: "", categorySubSubId: "" };
  }
  return {
    categoryRootId: bc[0]!.id,
    categorySubId: bc[1]?.id ?? "",
    categorySubSubId: bc[2]?.id ?? "",
  };
}

const EMPTY_FORM: ProductForm = {
  vendorId: "",
  categoryRootId: "",
  categorySubId: "",
  categorySubSubId: "",
  title: "",
  slug: "",
  price: "",
  compareAtPrice: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  stock: "",
  description: "",
  status: "draft",
  images: [],
  keyFeaturesEn: "",
  keyFeaturesBn: "",
  specificationsJsonText: "[]",
  generalInfoEn: "",
  generalInfoBn: "",
  variants: [],
  freeDeliveryEnabled: false,
  freeDeliveryMinCartAmount: "",
  freeDeliveryMinQuantity: "",
};

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtmlPlain(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bulletsToHtmlClient(items: string[]): string {
  if (!items.length) return "";
  return `<ul>${items.map((t) => `<li>${escapeHtmlPlain(t)}</li>`).join("")}</ul>`;
}

function stripPriceCommas(s: string): string {
  return s.replace(/,/g, "").trim();
}

function parseStockInput(raw: string): number {
  const t = raw.trim();
  if (t === "") return 0;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function buildImportedFromFormForAi(form: ProductForm): ImportedProduct {
  return {
    sourceUrl: "admin://manual-entry",
    sourceHost: typeof window !== "undefined" && window.location.host ? window.location.host : "admin",
    title: form.title.trim() || "Untitled product",
    slug: toSlug(form.slug || form.title) || "untitled-product",
    price: form.price.trim() || "0",
    compareAtPrice: form.compareAtPrice.trim() || null,
    description: form.description || "",
    images: form.images,
  };
}

function preferredSiteLang(): "en" | "bn" {
  if (typeof document !== "undefined") {
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("bn")) return "bn";
  }
  if (typeof navigator !== "undefined") {
    const langs = [navigator.language, ...(navigator.languages ?? [])].join(" ").toLowerCase();
    if (langs.includes("bn")) return "bn";
  }
  return "en";
}

function statusChip(status: string) {
  if (status === "active") return <Chip size="small" label="Active" color="success" variant="outlined" />;
  return <Chip size="small" label="Draft" color="warning" variant="outlined" />;
}

export function AdminProductsPanel() {
  const showToast = useToast();
  const search = useSearch();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const raw = search.startsWith("?") ? search.slice(1) : search || "";
    const p = new URLSearchParams(raw);
    const qq = p.get("q")?.trim();
    if (qq) {
      setQ(qq);
      setQInput(qq);
      setPage(1);
    }
  }, [search]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewImageIdx, setViewImageIdx] = useState(0);
  const [adminPreview, setAdminPreview] = useState<{ images: string[]; title: string; idx: number } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importedProduct, setImportedProduct] = useState<ImportedProduct | null>(null);
  const [aiReplaceExisting, setAiReplaceExisting] = useState(true);
  const [aiEnhanced, setAiEnhanced] = useState<AiEnhancedProduct | null>(null);
  const [editAiReplaceExisting, setEditAiReplaceExisting] = useState(false);
  const [editAiEnhanced, setEditAiEnhanced] = useState<AiEnhancedProduct | null>(null);
  const [aiEnhanceDialogOpen, setAiEnhanceDialogOpen] = useState(false);
  const [aiEnhanceInstruction, setAiEnhanceInstruction] = useState("");
  const [aiEnhanceFor, setAiEnhanceFor] = useState<"add" | "edit" | null>(null);
  const [aiEnhancePickerTick, setAiEnhancePickerTick] = useState(0);
  const [aiEnhanceSaveHint, setAiEnhanceSaveHint] = useState<string | null>(null);

  const enhancePromptOptions = useMemo(() => getAllPromptsForPicker(), [aiEnhancePickerTick]);
  const enhanceCustomOnly = useMemo(() => listCustomPrompts(), [aiEnhancePickerTick]);
  const filterEnhanceOptions = useMemo(
    () => createFilterOptions<string>({ matchFrom: "any", stringify: (o) => o }),
    [],
  );
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { kind: "one"; id: string; title: string }
    | { kind: "bulk"; count: number }
    | null
  >(null);

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/products", {
        page,
        perPage,
        q: q || undefined,
        status: statusFilter === "active" || statusFilter === "draft" ? statusFilter : undefined,
      }),
    [page, perPage, q, statusFilter]
  );

  const listQ = useQuery({
    queryKey: ["admin-products", listUrl],
    queryFn: () => apiJson<AdminListResponse<ProductRow>>(listUrl),
  });

  const categoriesQ = useQuery({
    queryKey: ["admin-product-categories"],
    queryFn: () => apiJson<Category[]>("/api/categories"),
  });

  const vendorsQ = useQuery({
    queryKey: ["admin-product-vendors"],
    queryFn: () =>
      apiJson<AdminListResponse<VendorOption>>(
        adminListQuery("/api/admin/vendors", { page: 1, perPage: 100, status: "approved" })
      ),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const detailQ = useQuery({
    queryKey: ["admin-product", viewId ?? editId],
    queryFn: () => apiJson<ProductDetail>(`/api/admin/products/${viewId ?? editId}`),
    enabled: Boolean(viewId || editId),
  });

  useEffect(() => {
    const row = detailQ.data;
    const cats = categoriesQ.data ?? [];
    if (!row || !editId) return;
    const p = row.product;
    const vrows = row.variants ?? [];
    const catPick = categoryPickFromStoredId(cats, p.categoryId ?? null);
    setEditForm({
      vendorId: p.vendorId,
      ...catPick,
      title: p.title,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? "",
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      seoKeywords: p.seoKeywords ?? "",
      stock: String(p.stock),
      description: p.description ?? "",
      status: p.status === "active" ? "active" : "draft",
      images: p.images ?? [],
      keyFeaturesEn: p.keyFeaturesJson?.en ?? "",
      keyFeaturesBn: p.keyFeaturesJson?.bn ?? "",
      specificationsJsonText: JSON.stringify(p.specificationsJson ?? [], null, 2),
      generalInfoEn: p.generalInfoJson?.en ?? "",
      generalInfoBn: p.generalInfoJson?.bn ?? "",
      variants: vrows.map((v) => ({
        kind: (v.kind === "size" || v.kind === "color" || v.kind === "custom" ? v.kind : "custom") as VariantDraft["kind"],
        name: v.name,
        value: v.value,
        price: String(v.price),
        stock: String(v.stock),
      })),
      freeDeliveryEnabled: Boolean(p.freeDeliveryEnabled),
      freeDeliveryMinCartAmount: p.freeDeliveryMinCartAmount != null ? String(p.freeDeliveryMinCartAmount) : "",
      freeDeliveryMinQuantity: p.freeDeliveryMinQuantity != null ? String(p.freeDeliveryMinQuantity) : "",
    });
  }, [detailQ.data, editId, categoriesQ.data]);

  useEffect(() => {
    setViewImageIdx(0);
  }, [viewId]);

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson("/api/admin/products", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : "Create failed.", "error");
    },
  });

  const importMut = useMutation({
    mutationFn: (url: string) =>
      apiJson<ImportedProduct>("/api/admin/products/import-from-url", {
        method: "POST",
        body: JSON.stringify({ url }),
      }),
    onSuccess: (data) => {
      setImportedProduct(data);
      setAddForm((f) => ({
        ...f,
        title: data.title || f.title,
        slug: data.slug || f.slug,
        price: data.price || f.price,
        compareAtPrice: data.compareAtPrice ?? f.compareAtPrice,
        seoTitle: data.title || f.seoTitle,
        seoDescription: f.seoDescription,
        seoKeywords: f.seoKeywords,
        description: data.description || f.description,
        images: data.images?.length ? data.images : f.images,
      }));
      showToast(`Auto-filled from ${data.sourceHost}. Please review before create.`, "info");
      setAiEnhanced(null);
    },
    onError: (e) => {
      setImportedProduct(null);
      setAiEnhanced(null);
      showToast(e instanceof Error ? e.message : "Import failed.", "error");
    },
  });

  const enhanceMut = useMutation({
    mutationFn: (req: { imported: ImportedProduct; userInstructions?: string }) =>
      apiJson<ImportEnhanceResponse>("/api/admin/products/import-enhance", {
        method: "POST",
        body: JSON.stringify({
          imported: req.imported,
          userInstructions: req.userInstructions?.trim() || undefined,
        }),
      }),
    onSuccess: (data, { imported }) => {
      if (!data.ok || !data.enhanced) {
        setAiEnhanced(null);
        showToast(
          data.warning ?? "AI enhancement failed. You can still continue with imported data.",
          "warning",
        );
        return;
      }

      const e = data.enhanced;
      const cats = (qc.getQueryData(["admin-product-categories"]) as Category[] | undefined) ?? [];
      const leaf = e.categorySuggestion?.leafCategoryId;
      const catPick =
        leaf && cats.some((c) => c.id === leaf) ? categoryPickFromStoredId(cats, leaf) : null;
      const mergedDescription = `<div data-lang="en"><p>${escapeHtmlPlain(e.shortDescriptionEn)}</p>${e.descriptionHtmlEn}</div><div data-lang="bn"><p>${escapeHtmlPlain(
        e.shortDescriptionBn,
      )}</p>${e.descriptionHtmlBn}</div>`;
      const lang = preferredSiteLang();
      setAddForm((f) => {
        const currentImages = imported.images.length ? [...imported.images] : [...f.images];
        const idx = e.imageReview.bestPrimaryIndex;
        if (currentImages.length > 0 && idx >= 0 && idx < currentImages.length) {
          const [primary] = currentImages.splice(idx, 1);
          currentImages.unshift(primary);
        }
        return {
          ...f,
          ...(catPick ?? {}),
          title: e.title,
          slug: toSlug(e.title),
          seoTitle: lang === "bn" ? e.seo.titleBn : e.seo.titleEn,
          seoDescription: lang === "bn" ? e.seo.descriptionBn : e.seo.descriptionEn,
          seoKeywords: lang === "bn" ? e.seo.keywordsBn : e.seo.keywordsEn,
          description: mergedDescription,
          images: currentImages,
          keyFeaturesEn: bulletsToHtmlClient(e.keyFeaturesEn),
          keyFeaturesBn: bulletsToHtmlClient(e.keyFeaturesBn),
          specificationsJsonText: JSON.stringify(e.specs, null, 2),
          generalInfoEn: e.generalInformationHtmlEn,
          generalInfoBn: e.generalInformationHtmlBn,
          variants: [],
        };
      });
      setAiEnhanced(e);
      showToast(
        data.warning
          ? `${data.warning} Other fields were still applied.`
          : `AI enhancement applied${data.model ? ` (${data.model})` : ""}. Review before create.`,
        data.warning ? "warning" : "info",
      );
    },
    onError: (e) => {
      setAiEnhanced(null);
      showToast(e instanceof Error ? e.message : "AI enhancement failed.", "error");
    },
  });

  const enhanceEditMut = useMutation({
    mutationFn: (req: { imported: ImportedProduct; userInstructions?: string }) =>
      apiJson<ImportEnhanceResponse>("/api/admin/products/import-enhance", {
        method: "POST",
        body: JSON.stringify({
          imported: req.imported,
          userInstructions: req.userInstructions?.trim() || undefined,
        }),
      }),
    onSuccess: (data, { imported }) => {
      if (!data.ok || !data.enhanced) {
        setEditAiEnhanced(null);
        showToast(
          data.warning ?? "AI enhancement failed. You can continue with current product data.",
          "warning",
        );
        return;
      }

      const e = data.enhanced;
      const cats = (qc.getQueryData(["admin-product-categories"]) as Category[] | undefined) ?? [];
      const leaf = e.categorySuggestion?.leafCategoryId;
      const catPick =
        leaf && cats.some((c) => c.id === leaf) ? categoryPickFromStoredId(cats, leaf) : null;
      const mergedDescription = `<div data-lang="en"><p>${escapeHtmlPlain(e.shortDescriptionEn)}</p>${e.descriptionHtmlEn}</div><div data-lang="bn"><p>${escapeHtmlPlain(
        e.shortDescriptionBn,
      )}</p>${e.descriptionHtmlBn}</div>`;
      const lang = preferredSiteLang();

      setEditForm((f) => {
        const currentImages = imported.images.length ? [...imported.images] : [...f.images];
        const idx = e.imageReview.bestPrimaryIndex;
        if (currentImages.length > 0 && idx >= 0 && idx < currentImages.length) {
          const [primary] = currentImages.splice(idx, 1);
          currentImages.unshift(primary);
        }
        return {
          ...f,
          ...(catPick ?? {}),
          title: e.title,
          slug: toSlug(e.title),
          seoTitle: lang === "bn" ? e.seo.titleBn : e.seo.titleEn,
          seoDescription: lang === "bn" ? e.seo.descriptionBn : e.seo.descriptionEn,
          seoKeywords: lang === "bn" ? e.seo.keywordsBn : e.seo.keywordsEn,
          description: mergedDescription,
          images: currentImages,
          keyFeaturesEn: bulletsToHtmlClient(e.keyFeaturesEn),
          keyFeaturesBn: bulletsToHtmlClient(e.keyFeaturesBn),
          specificationsJsonText: JSON.stringify(e.specs, null, 2),
          generalInfoEn: e.generalInformationHtmlEn,
          generalInfoBn: e.generalInformationHtmlBn,
          variants: [],
        };
      });
      setEditAiEnhanced(e);
      showToast(
        data.warning
          ? `${data.warning} Other fields were still applied.`
          : `AI enhancement applied${data.model ? ` (${data.model})` : ""}.`,
        data.warning ? "warning" : "info",
      );
    },
    onError: (e) => {
      setEditAiEnhanced(null);
      showToast(e instanceof Error ? e.message : "AI enhancement failed.", "error");
    },
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiJson(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-product"] });
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : "Save failed.", "error");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiJson(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : "Delete failed.", "error");
    },
  });

  const bulkMut = useMutation({
    mutationFn: (body: { action: string; ids: string[]; status?: string }) =>
      apiJson("/api/admin/products/bulk", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : "Bulk action failed.", "error");
    },
  });

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
    const allOn = ids.every((id) => selected.has(id));
    setSelected((s) => {
      const n = new Set(s);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const categories = categoriesQ.data ?? [];
  const vendorItems = vendorsQ.data?.items ?? [];

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId).sort(sortCategoriesByOrder),
    [categories],
  );

  const addSubs = useMemo(() => {
    if (!addForm.categoryRootId) return [];
    return categories.filter((c) => c.parentId === addForm.categoryRootId).sort(sortCategoriesByOrder);
  }, [categories, addForm.categoryRootId]);

  const addSubSubs = useMemo(() => {
    if (!addForm.categorySubId) return [];
    return categories.filter((c) => c.parentId === addForm.categorySubId).sort(sortCategoriesByOrder);
  }, [categories, addForm.categorySubId]);

  const editSubs = useMemo(() => {
    if (!editForm.categoryRootId) return [];
    return categories.filter((c) => c.parentId === editForm.categoryRootId).sort(sortCategoriesByOrder);
  }, [categories, editForm.categoryRootId]);

  const editSubSubs = useMemo(() => {
    if (!editForm.categorySubId) return [];
    return categories.filter((c) => c.parentId === editForm.categorySubId).sort(sortCategoriesByOrder);
  }, [categories, editForm.categorySubId]);

  /** Match AdminSpecificationsEditor + API: only rows with non-empty trimmed label and value; else null. */
  function normalizeSpecificationsFromJsonText(specificationsJsonText: string): { label: string; value: string }[] | null {
    const trimmed = specificationsJsonText.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) throw new Error("not array");
    const out: { label: string; value: string }[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const label = String(rec.label ?? "").trim();
      const value = String(rec.value ?? "").trim();
      if (!label || !value) continue;
      out.push({ label, value });
    }
    return out.length ? out : null;
  }

  const normalizeAndSave = (id: string, form: ProductForm, mode: "create" | "edit") => {
    const slug = toSlug(form.slug || form.title);
    if (!slug) {
      showToast("Slug is required.", "error");
      return;
    }
    if (!form.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    if (!form.price.trim()) {
      showToast("Price is required.", "error");
      return;
    }
    if (mode === "create" && !form.vendorId) {
      showToast("Select a vendor.", "error");
      return;
    }
    if (mode === "create" && !form.categoryRootId.trim()) {
      showToast("Category is required.", "error");
      return;
    }

    let specificationsJson: { label: string; value: string }[] | null = null;
    if (form.specificationsJsonText.trim()) {
      try {
        specificationsJson = normalizeSpecificationsFromJsonText(form.specificationsJsonText);
      } catch {
        showToast("Specifications must be a valid JSON array of {label, value} objects.", "error");
        return;
      }
    }

    const keyFeaturesJson =
      form.keyFeaturesEn.trim() || form.keyFeaturesBn.trim()
        ? { en: form.keyFeaturesEn.trim(), bn: form.keyFeaturesBn.trim() }
        : null;
    const generalInfoJson =
      form.generalInfoEn.trim() || form.generalInfoBn.trim()
        ? { en: form.generalInfoEn.trim(), bn: form.generalInfoBn.trim() }
        : null;

    let freeDeliveryMinCartAmount: string | null = null;
    let freeDeliveryMinQuantity: number | null = null;
    if (form.freeDeliveryEnabled) {
      const amtRaw = form.freeDeliveryMinCartAmount.trim();
      if (amtRaw !== "") {
        const st = stripPriceCommas(amtRaw);
        const p = parseDecimalString(st);
        if (!Number.isFinite(p) || p <= 0) {
          showToast("Minimum cart amount must be a positive number.", "error");
          return;
        }
        freeDeliveryMinCartAmount = st;
      }
      const qtRaw = form.freeDeliveryMinQuantity.trim();
      if (qtRaw !== "") {
        const n = parseInt(qtRaw, 10);
        if (!Number.isFinite(n) || n < 1) {
          showToast("Minimum buy quantity must be a whole number of at least 1.", "error");
          return;
        }
        freeDeliveryMinQuantity = n;
      }
    }

    const variantsPayload = form.variants
      .filter((v) => v.name.trim() && v.value.trim())
      .map((v, i) => ({
        kind: v.kind,
        name: v.name.trim(),
        value: v.value.trim(),
        price: stripPriceCommas(v.price) || "0",
        stock: parseStockInput(v.stock),
        sortOrder: i,
      }));

    const body = {
      ...(form.vendorId ? { vendorId: form.vendorId } : {}),
      categoryId: effectiveProductCategoryId(form) || null,
      title: form.title.trim(),
      slug,
      price: stripPriceCommas(form.price.trim()),
      compareAtPrice: form.compareAtPrice.trim() ? stripPriceCommas(form.compareAtPrice.trim()) : null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      seoKeywords: form.seoKeywords.trim() || null,
      stock: parseStockInput(form.stock),
      description: form.description.trim() || null,
      status: form.status,
      images: form.images,
      keyFeaturesJson,
      specificationsJson,
      generalInfoJson,
      freeDeliveryEnabled: form.freeDeliveryEnabled,
      freeDeliveryMinCartAmount,
      freeDeliveryMinQuantity,
      variants: variantsPayload,
    };
    if (mode === "create") {
      createMut.mutate(body);
      return;
    }
    patchMut.mutate({ id, body });
    setEditId(null);
  };

  const rowActions = (p: ProductRow) => (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      <IconButton size="small" aria-label="View" onClick={() => setViewId(p.id)}>
        <VisibilityRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" aria-label="Edit" onClick={() => setEditId(p.id)}>
        <EditRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Delete"
        color="error"
        onClick={() => setDeleteConfirm({ kind: "one", id: p.id, title: p.title })}
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
      {p.status === "active" ? (
        <Button size="small" component={Link} href={`~/p/${p.vendorSlug}/${p.slug}`} endIcon={<OpenInNewRoundedIcon />}>
          Store
        </Button>
      ) : null}
    </Stack>
  );

  const renderTable = () => (
    <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
      <Table size="medium" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={items.some((i) => selected.has(i.id)) && !items.every((i) => selected.has(i.id))}
                checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                onChange={toggleAllPage}
              />
            </TableCell>
            <TableCell>Product</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Vendor</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Price</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Stock</TableCell>
            <TableCell>Status</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Creator</TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Handler</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id} hover selected={selected.has(p.id)}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    component="img"
                    src={p.images?.[0] ? mediaAbsoluteUrl(p.images[0]) : "https://placehold.co/72x72?text=No+Image"}
                    alt={p.title}
                    onClick={() =>
                      setAdminPreview({
                        images: p.images?.length ? p.images : [],
                        title: p.title,
                        idx: 0,
                      })
                    }
                    sx={{ width: 46, height: 46, borderRadius: 1, objectFit: "cover", bgcolor: "grey.100", flexShrink: 0, cursor: "zoom-in" }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{p.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }} noWrap>
                      {p.slug}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{p.vendorName}</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{formatBdt(p.price)}</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{p.stock}</TableCell>
              <TableCell>{statusChip(p.status)}</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={p.creator ?? null} dense />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <AdminStaffCell staff={p.handler ?? null} dense />
              </TableCell>
              <TableCell align="right">{rowActions(p)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrid = () => (
    <Grid container spacing={1.5}>
      {items.map((p) => (
        <Grid item xs={12} sm={6} md={4} key={p.id}>
          <Card variant="outlined" sx={{ height: "100%", borderColor: selected.has(p.id) ? "primary.main" : "divider" }}>
            <CardContent>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} size="small" />
                {statusChip(p.status)}
              </Stack>
              <Typography fontWeight={800} sx={{ mt: 1 }}>
                {p.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {p.vendorName}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {formatBdt(p.price)} · {p.stock} in stock
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {rowActions(p)}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderList = () => (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List disablePadding>
        {items.map((p) => (
          <ListItem
            key={p.id}
            secondaryAction={
              <Stack direction="row" alignItems="center" spacing={1}>
                {rowActions(p)}
              </Stack>
            }
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <ListItemButton dense sx={{ pr: 20 }} onClick={() => toggle(p.id)}>
              <Checkbox edge="start" checked={selected.has(p.id)} tabIndex={-1} disableRipple />
              <ListItemText
                primary={p.title}
                secondary={`${p.vendorName} · ${formatBdt(p.price)} · ${p.status}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const d = detailQ.data;
  const renderPreview = (form: ProductForm) => {
    const vendor = vendorItems.find((v) => v.id === form.vendorId);
    const img = form.images[0];
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Live preview
        </Typography>
        <Stack direction="row" spacing={1.25}>
          <Box
            component="img"
            src={img ? mediaAbsoluteUrl(img) : "https://placehold.co/120x120?text=No+Image"}
            alt="Preview"
            onClick={() =>
              setAdminPreview({
                images: form.images,
                title: form.title || "Product preview",
                idx: 0,
              })
            }
            sx={{ width: 72, height: 72, borderRadius: 1.25, objectFit: "cover", bgcolor: "grey.100", cursor: "zoom-in" }}
          />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {form.title || "Untitled product"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }} noWrap>
              {form.slug || "product-slug"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {form.price ? formatBdt(form.price) : "Price not set"} · stock {parseStockInput(form.stock)}
            </Typography>
            <Stack direction="row" spacing={0.75}>
              {statusChip(form.status)}
              {form.images.length ? <Chip size="small" label={`${form.images.length} image(s)`} /> : null}
              {vendor ? <Chip size="small" label={vendor.name} variant="outlined" /> : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Server-side filters, pagination, and bulk actions. Add, view, edit, and delete products with image management.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }} justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            setAddForm(EMPTY_FORM);
            setImportUrl("");
            setImportedProduct(null);
            setAiReplaceExisting(false);
            setAiEnhanced(null);
            setAddOpen(true);
          }}
        >
          Add product
        </Button>
      </Stack>
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
            <Button
              size="small"
              variant="outlined"
              disabled={!selected.size || bulkMut.isPending}
              onClick={() =>
                bulkMut.mutate({ action: "set_status", ids: Array.from(selected), status: "active" })
              }
            >
              Set active
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={!selected.size || bulkMut.isPending}
              onClick={() =>
                bulkMut.mutate({ action: "set_status", ids: Array.from(selected), status: "draft" })
              }
            >
              Set draft
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={!selected.size || bulkMut.isPending}
              onClick={() => setDeleteConfirm({ kind: "bulk", count: selected.size })}
            >
              Delete
            </Button>
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
            <FormControl size="small" sx={{ minWidth: 140 }}>
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
      />

      {listQ.isLoading ? <Typography color="text.secondary">Loading…</Typography> : null}
      {!listQ.isLoading && items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No products match filters.
        </Typography>
      ) : null}
      {!listQ.isLoading && items.length > 0
        ? viewMode === "table"
          ? renderTable()
          : viewMode === "grid"
            ? renderGrid()
            : renderList()
        : null}

      <Dialog open={Boolean(viewId)} onClose={() => setViewId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Product</DialogTitle>
        <DialogContent>
          {detailQ.isLoading ? <Typography>Loading…</Typography> : null}
          {d ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography fontWeight={800}>{d.product.title}</Typography>
              <Typography variant="body2" color="text.secondary">{d.vendorName} / {d.product.slug}</Typography>
              <Typography variant="body2">{formatBdt(d.product.price)} · stock {d.product.stock}</Typography>
              <Box sx={{ width: "100%", maxWidth: 760 }}>
                <ProductImageGallery
                  images={d.product.images ?? []}
                  active={viewImageIdx}
                  onSelect={setViewImageIdx}
                  ratio="66%"
                  productTitle={d.product.title}
                />
              </Box>
              <Typography variant="subtitle2">SEO</Typography>
              <Typography variant="body2" color="text.secondary">Title: {d.product.seoTitle || "—"}</Typography>
              <Typography variant="body2" color="text.secondary">Description: {d.product.seoDescription || "—"}</Typography>
              <Typography variant="body2" color="text.secondary">Keywords: {d.product.seoKeywords || "—"}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Description</Typography>
              <Paper variant="outlined" sx={{ p: 1.25, maxHeight: 220, overflow: "auto" }}>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {d.product.description || "No description"}
                </Typography>
              </Paper>
              <Chip label={d.product.status} size="small" />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit product</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">AI enhancement</Typography>
                <Typography variant="caption" color="text.secondary">
                  Improve current title, SEO, description, and primary image ordering.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={enhanceEditMut.isPending}
                    onClick={() => {
                      if (!editId) return;
                      setAiEnhanceFor("edit");
                      setAiEnhanceInstruction("");
                      setAiEnhanceSaveHint(null);
                      setAiEnhanceDialogOpen(true);
                    }}
                  >
                    {enhanceEditMut.isPending ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={editAiReplaceExisting}
                      onChange={(e) => setEditAiReplaceExisting(e.target.checked)}
                    />
                  }
                  label="Replace existing text"
                />
              </Stack>
            </Paper>
            {editAiEnhanced ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">AI enhancement preview</Typography>
                  {editAiEnhanced.categorySuggestion?.leafCategoryId ? (
                    <Typography variant="caption" color="text.secondary">
                      Suggested catalog:{" "}
                      {categoryBreadcrumb(categories, editAiEnhanced.categorySuggestion.leafCategoryId)
                        .map((c) => c.name)
                        .join(" › ") || editAiEnhanced.categorySuggestion.leafCategoryId}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    EN: {editAiEnhanced.shortDescriptionEn}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    BN: {editAiEnhanced.shortDescriptionBn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SEO EN: {editAiEnhanced.seo.titleEn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SEO BN: {editAiEnhanced.seo.titleBn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Primary image note: {editAiEnhanced.imageReview.notes}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Vendor</InputLabel>
                <Select
                  label="Vendor"
                  value={editForm.vendorId}
                  onChange={(e: SelectChangeEvent) => setEditForm((f) => ({ ...f, vendorId: e.target.value }))}
                >
                  {vendorItems.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name} ({v.slug})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug === toSlug(f.title) ? toSlug(e.target.value) : f.slug,
                  }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Slug"
                value={editForm.slug}
                onChange={(e) => setEditForm((f) => ({ ...f, slug: toSlug(e.target.value) }))}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Price"
                value={editForm.price}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Compare-at price"
                value={editForm.compareAtPrice}
                onChange={(e) => setEditForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Stock"
                value={editForm.stock}
                onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ inputMode: "numeric" }}
                placeholder="0"
              />
            </Stack>
            <AdminProductDiscountHelper
              price={editForm.price}
              compareAtPrice={editForm.compareAtPrice}
              onPrice={(v) => setEditForm((f) => ({ ...f, price: v }))}
              onCompareAt={(v) => setEditForm((f) => ({ ...f, compareAtPrice: v }))}
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Delivery
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.freeDeliveryEnabled}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        freeDeliveryEnabled: e.target.checked,
                        ...(e.target.checked ? {} : { freeDeliveryMinCartAmount: "", freeDeliveryMinQuantity: "" }),
                      }))
                    }
                    size="small"
                  />
                }
                label="Free delivery for this product (waive carrier fee when rules match)"
              />
              {editForm.freeDeliveryEnabled ? (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Optional: minimum cart total and/or minimum units of this product. Leave both blank for unconditional
                    free delivery when this item is in the cart. If both are set, either condition qualifies.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Minimum cart total (৳)"
                      value={editForm.freeDeliveryMinCartAmount}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, freeDeliveryMinCartAmount: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      placeholder="e.g. 2000"
                    />
                    <TextField
                      label="Minimum quantity for this SKU"
                      value={editForm.freeDeliveryMinQuantity}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          freeDeliveryMinQuantity: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      fullWidth
                      size="small"
                      placeholder="e.g. 3"
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </Stack>
                </>
              ) : null}
            </Stack>
            <TextField
              label="SEO title"
              value={editForm.seoTitle}
              onChange={(e) => setEditForm((f) => ({ ...f, seoTitle: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="SEO description"
              value={editForm.seoDescription}
              onChange={(e) => setEditForm((f) => ({ ...f, seoDescription: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            <TextField
              label="SEO keywords (comma-separated)"
              value={editForm.seoKeywords}
              onChange={(e) => setEditForm((f) => ({ ...f, seoKeywords: e.target.value }))}
              fullWidth
              size="small"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={editForm.categoryRootId}
                onChange={(e: SelectChangeEvent) =>
                  setEditForm((f) => ({
                    ...f,
                    categoryRootId: e.target.value as string,
                    categorySubId: "",
                    categorySubSubId: "",
                  }))
                }
              >
                <MenuItem value="">None</MenuItem>
                {rootCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" fullWidth disabled={!editForm.categoryRootId || editSubs.length === 0}>
                <InputLabel>Sub category</InputLabel>
                <Select
                  label="Sub category"
                  value={editForm.categorySubId}
                  onChange={(e: SelectChangeEvent) =>
                    setEditForm((f) => ({
                      ...f,
                      categorySubId: e.target.value as string,
                      categorySubSubId: "",
                    }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {editSubs.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!editForm.categorySubId || editSubSubs.length === 0}>
                <InputLabel>Sub sub-category</InputLabel>
                <Select
                  label="Sub sub-category"
                  value={editForm.categorySubSubId}
                  onChange={(e: SelectChangeEvent) =>
                    setEditForm((f) => ({ ...f, categorySubSubId: e.target.value as string }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {editSubSubs.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <AdminRichTextEditor
              value={editForm.description}
              onChange={(next) => setEditForm((f) => ({ ...f, description: next }))}
              minRows={7}
            />
            <AdminRichTextEditor
              label="Key features (HTML, EN)"
              value={editForm.keyFeaturesEn}
              onChange={(next) => setEditForm((f) => ({ ...f, keyFeaturesEn: next }))}
              minRows={4}
            />
            <AdminRichTextEditor
              label="Key features (HTML, BN)"
              value={editForm.keyFeaturesBn}
              onChange={(next) => setEditForm((f) => ({ ...f, keyFeaturesBn: next }))}
              minRows={4}
            />
            <AdminSpecificationsEditor
              label="Specifications"
              value={editForm.specificationsJsonText}
              onChange={(next) => setEditForm((f) => ({ ...f, specificationsJsonText: next }))}
            />
            <AdminRichTextEditor
              label="General information (HTML, EN)"
              value={editForm.generalInfoEn}
              onChange={(next) => setEditForm((f) => ({ ...f, generalInfoEn: next }))}
              minRows={4}
            />
            <AdminRichTextEditor
              label="General information (HTML, BN)"
              value={editForm.generalInfoBn}
              onChange={(next) => setEditForm((f) => ({ ...f, generalInfoBn: next }))}
              minRows={4}
            />
            <Typography variant="subtitle2">Variants (optional — per-option price &amp; stock)</Typography>
            <Stack spacing={1.5}>
              {editForm.variants.map((v, i) => (
                <Stack key={i} direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Kind</InputLabel>
                    <Select
                      label="Kind"
                      value={v.kind}
                      onChange={(e: SelectChangeEvent) =>
                        setEditForm((f) => {
                          const next = [...f.variants];
                          next[i] = { ...next[i]!, kind: e.target.value as VariantDraft["kind"] };
                          return { ...f, variants: next };
                        })
                      }
                    >
                      <MenuItem value="size">Size</MenuItem>
                      <MenuItem value="color">Color</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Group name"
                    size="small"
                    value={v.name}
                    onChange={(e) =>
                      setEditForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, name: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Value"
                    size="small"
                    value={v.value}
                    onChange={(e) =>
                      setEditForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, value: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Price"
                    size="small"
                    value={v.price}
                    onChange={(e) =>
                      setEditForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, price: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Stock"
                    size="small"
                    value={v.stock}
                    onChange={(e) =>
                      setEditForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, stock: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <IconButton
                    aria-label="Remove variant"
                    color="error"
                    onClick={() =>
                      setEditForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))
                    }
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Stack>
              ))}
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setEditForm((f) => ({
                      ...f,
                      variants: [
                        ...f.variants,
                        {
                          kind: "custom",
                          name: "Option",
                          value: "",
                          price: f.price || "0",
                          stock: "1",
                        },
                      ],
                    }))
                  }
                >
                  Add variant row
                </Button>
                {(["S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                  <Button
                    key={sz}
                    size="small"
                    onClick={() =>
                      setEditForm((f) => ({
                        ...f,
                        variants: [
                          ...f.variants,
                          {
                            kind: "size",
                            name: "Size",
                            value: sz,
                            price: f.price || "0",
                            stock: "1",
                          },
                        ],
                      }))
                    }
                  >
                    + {sz}
                  </Button>
                ))}
              </Stack>
            </Stack>
            <AdminProductImagesField
              value={editForm.images}
              onChange={(urls) => setEditForm((f) => ({ ...f, images: urls }))}
            />
            {renderPreview(editForm)}
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={editForm.status}
                onChange={(e: SelectChangeEvent) =>
                  setEditForm((f) => ({ ...f, status: e.target.value as "draft" | "active" }))
                }
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={patchMut.isPending || !editId}
            onClick={() => {
              if (!editId) return;
              normalizeAndSave(editId, editForm, "edit");
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add product</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Import product from URL (AI smart extract)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Paste a product page URL (Daraz, etc.), then click auto-fill. We fetch page content, filter noise, and keep likely product details/images.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Product URL"
                    placeholder="https://example.com/product/..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    disabled={importMut.isPending || !importUrl.trim()}
                    onClick={() => importMut.mutate(importUrl.trim())}
                  >
                    {importMut.isPending ? "Importing..." : "Auto-fill"}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={enhanceMut.isPending}
                    onClick={() => {
                      setAiEnhanceFor("add");
                      setAiEnhanceInstruction("");
                      setAiEnhanceSaveHint(null);
                      setAiEnhanceDialogOpen(true);
                    }}
                  >
                    {enhanceMut.isPending ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={aiReplaceExisting}
                      onChange={(e) => setAiReplaceExisting(e.target.checked)}
                    />
                  }
                  label="Replace existing imported text"
                />
                {!importedProduct ? (
                  <Typography variant="caption" color="text.secondary">
                    You can enhance manual entries directly, or run Auto-fill first for richer extraction.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
            {aiEnhanced ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">AI enhancement preview</Typography>
                  {aiEnhanced.categorySuggestion?.leafCategoryId ? (
                    <Typography variant="caption" color="text.secondary">
                      Suggested catalog:{" "}
                      {categoryBreadcrumb(categories, aiEnhanced.categorySuggestion.leafCategoryId)
                        .map((c) => c.name)
                        .join(" › ") || aiEnhanced.categorySuggestion.leafCategoryId}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    EN: {aiEnhanced.shortDescriptionEn}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    BN: {aiEnhanced.shortDescriptionBn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SEO EN: {aiEnhanced.seo.titleEn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SEO BN: {aiEnhanced.seo.titleBn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Primary image note: {aiEnhanced.imageReview.notes}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
            <FormControl size="small" fullWidth>
              <InputLabel>Vendor</InputLabel>
              <Select
                label="Vendor"
                value={addForm.vendorId}
                onChange={(e: SelectChangeEvent) => setAddForm((f) => ({ ...f, vendorId: e.target.value }))}
              >
                {vendorItems.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name} ({v.slug})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel required>Category</InputLabel>
              <Select
                label="Category"
                required
                value={addForm.categoryRootId}
                onChange={(e: SelectChangeEvent) =>
                  setAddForm((f) => ({
                    ...f,
                    categoryRootId: e.target.value as string,
                    categorySubId: "",
                    categorySubSubId: "",
                  }))
                }
              >
                <MenuItem value="">
                  <em>Select category</em>
                </MenuItem>
                {rootCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" fullWidth disabled={!addForm.categoryRootId || addSubs.length === 0}>
                <InputLabel>Sub category</InputLabel>
                <Select
                  label="Sub category"
                  value={addForm.categorySubId}
                  onChange={(e: SelectChangeEvent) =>
                    setAddForm((f) => ({
                      ...f,
                      categorySubId: e.target.value as string,
                      categorySubSubId: "",
                    }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {addSubs.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!addForm.categorySubId || addSubSubs.length === 0}>
                <InputLabel>Sub sub-category</InputLabel>
                <Select
                  label="Sub sub-category"
                  value={addForm.categorySubSubId}
                  onChange={(e: SelectChangeEvent) =>
                    setAddForm((f) => ({ ...f, categorySubSubId: e.target.value as string }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {addSubSubs.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Title"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug ? f.slug : toSlug(e.target.value),
                  }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Slug"
                value={addForm.slug}
                onChange={(e) => setAddForm((f) => ({ ...f, slug: toSlug(e.target.value) }))}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Price"
                value={addForm.price}
                onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Compare-at price"
                value={addForm.compareAtPrice}
                onChange={(e) => setAddForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Stock"
                value={addForm.stock}
                onChange={(e) => setAddForm((f) => ({ ...f, stock: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ inputMode: "numeric" }}
                placeholder="0"
              />
            </Stack>
            <AdminProductDiscountHelper
              price={addForm.price}
              compareAtPrice={addForm.compareAtPrice}
              onPrice={(v) => setAddForm((f) => ({ ...f, price: v }))}
              onCompareAt={(v) => setAddForm((f) => ({ ...f, compareAtPrice: v }))}
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Delivery
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={addForm.freeDeliveryEnabled}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        freeDeliveryEnabled: e.target.checked,
                        ...(e.target.checked ? {} : { freeDeliveryMinCartAmount: "", freeDeliveryMinQuantity: "" }),
                      }))
                    }
                    size="small"
                  />
                }
                label="Free delivery for this product (waive carrier fee when rules match)"
              />
              {addForm.freeDeliveryEnabled ? (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Optional: minimum cart total and/or minimum units of this product. Leave both blank for unconditional
                    free delivery when this item is in the cart. If both are set, either condition qualifies.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Minimum cart total (৳)"
                      value={addForm.freeDeliveryMinCartAmount}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, freeDeliveryMinCartAmount: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      placeholder="e.g. 2000"
                    />
                    <TextField
                      label="Minimum quantity for this SKU"
                      value={addForm.freeDeliveryMinQuantity}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          freeDeliveryMinQuantity: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      fullWidth
                      size="small"
                      placeholder="e.g. 3"
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </Stack>
                </>
              ) : null}
            </Stack>
            <TextField
              label="SEO title"
              value={addForm.seoTitle}
              onChange={(e) => setAddForm((f) => ({ ...f, seoTitle: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="SEO description"
              value={addForm.seoDescription}
              onChange={(e) => setAddForm((f) => ({ ...f, seoDescription: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            <TextField
              label="SEO keywords (comma-separated)"
              value={addForm.seoKeywords}
              onChange={(e) => setAddForm((f) => ({ ...f, seoKeywords: e.target.value }))}
              fullWidth
              size="small"
            />
            <AdminRichTextEditor
              value={addForm.description}
              onChange={(next) => setAddForm((f) => ({ ...f, description: next }))}
              minRows={7}
            />
            <AdminRichTextEditor
              label="Key features (HTML, EN)"
              value={addForm.keyFeaturesEn}
              onChange={(next) => setAddForm((f) => ({ ...f, keyFeaturesEn: next }))}
              minRows={4}
            />
            <AdminRichTextEditor
              label="Key features (HTML, BN)"
              value={addForm.keyFeaturesBn}
              onChange={(next) => setAddForm((f) => ({ ...f, keyFeaturesBn: next }))}
              minRows={4}
            />
            <AdminSpecificationsEditor
              label="Specifications"
              value={addForm.specificationsJsonText}
              onChange={(next) => setAddForm((f) => ({ ...f, specificationsJsonText: next }))}
            />
            <AdminRichTextEditor
              label="General information (HTML, EN)"
              value={addForm.generalInfoEn}
              onChange={(next) => setAddForm((f) => ({ ...f, generalInfoEn: next }))}
              minRows={4}
            />
            <AdminRichTextEditor
              label="General information (HTML, BN)"
              value={addForm.generalInfoBn}
              onChange={(next) => setAddForm((f) => ({ ...f, generalInfoBn: next }))}
              minRows={4}
            />
            <Typography variant="subtitle2">Variants (optional — per-option price &amp; stock)</Typography>
            <Stack spacing={1.5}>
              {addForm.variants.map((v, i) => (
                <Stack key={i} direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Kind</InputLabel>
                    <Select
                      label="Kind"
                      value={v.kind}
                      onChange={(e: SelectChangeEvent) =>
                        setAddForm((f) => {
                          const next = [...f.variants];
                          next[i] = { ...next[i]!, kind: e.target.value as VariantDraft["kind"] };
                          return { ...f, variants: next };
                        })
                      }
                    >
                      <MenuItem value="size">Size</MenuItem>
                      <MenuItem value="color">Color</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Group name"
                    size="small"
                    value={v.name}
                    onChange={(e) =>
                      setAddForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, name: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Value"
                    size="small"
                    value={v.value}
                    onChange={(e) =>
                      setAddForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, value: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Price"
                    size="small"
                    value={v.price}
                    onChange={(e) =>
                      setAddForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, price: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <TextField
                    label="Stock"
                    size="small"
                    value={v.stock}
                    onChange={(e) =>
                      setAddForm((f) => {
                        const next = [...f.variants];
                        next[i] = { ...next[i]!, stock: e.target.value };
                        return { ...f, variants: next };
                      })
                    }
                  />
                  <IconButton
                    aria-label="Remove variant"
                    color="error"
                    onClick={() =>
                      setAddForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))
                    }
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Stack>
              ))}
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setAddForm((f) => ({
                      ...f,
                      variants: [
                        ...f.variants,
                        {
                          kind: "custom",
                          name: "Option",
                          value: "",
                          price: f.price || "0",
                          stock: "1",
                        },
                      ],
                    }))
                  }
                >
                  Add variant row
                </Button>
                {(["S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                  <Button
                    key={sz}
                    size="small"
                    onClick={() =>
                      setAddForm((f) => ({
                        ...f,
                        variants: [
                          ...f.variants,
                          {
                            kind: "size",
                            name: "Size",
                            value: sz,
                            price: f.price || "0",
                            stock: "1",
                          },
                        ],
                      }))
                    }
                  >
                    + {sz}
                  </Button>
                ))}
              </Stack>
            </Stack>
            <AdminProductImagesField
              value={addForm.images}
              onChange={(urls) => setAddForm((f) => ({ ...f, images: urls }))}
              autoCompressOnAdd
            />
            {renderPreview(addForm)}
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={addForm.status}
                onChange={(e: SelectChangeEvent) =>
                  setAddForm((f) => ({ ...f, status: e.target.value as "draft" | "active" }))
                }
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createMut.isPending} onClick={() => normalizeAndSave("", addForm, "create")}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={aiEnhanceDialogOpen}
        onClose={() => {
          if (enhanceMut.isPending || enhanceEditMut.isPending) return;
          setAiEnhanceDialogOpen(false);
          setAiEnhanceFor(null);
          setAiEnhanceSaveHint(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enhance with AI</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              The model always rewrites the listing for <strong>this marketplace</strong>: it removes source-site / competitor
              retailer names and does not present the product as if it were sold by the original import site. Add optional
              instructions below (tone, audience, what to stress or avoid, length, technical vs marketing, SEO).
            </Typography>
            <Autocomplete
              size="small"
              options={enhancePromptOptions}
              filterOptions={filterEnhanceOptions}
              getOptionLabel={(o) => o}
              isOptionEqualToValue={(a, b) => a === b}
              onChange={(_e, v) => {
                if (v && typeof v === "string") {
                  setAiEnhanceInstruction(v);
                  setAiEnhanceSaveHint(null);
                }
              }}
              slotProps={{
                listbox: {
                  sx: {
                    maxHeight: 300,
                    py: 0.5,
                    "& .MuiAutocomplete-option": {
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                      py: 1,
                      px: 1.5,
                      whiteSpace: "normal",
                      alignItems: "flex-start",
                      "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "divider" },
                    },
                  },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search and select a saved prompt"
                  placeholder="Type to filter…"
                />
              )}
            />
            <TextField
              label="Instructions (optional)"
              placeholder="Edit text here, or type your own. Use ‘Save as preset’ to keep a phrase you reuse."
              multiline
              minRows={4}
              fullWidth
              value={aiEnhanceInstruction}
              onChange={(e) => {
                setAiEnhanceInstruction(e.target.value);
                setAiEnhanceSaveHint(null);
              }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  const r = saveNewPromptFromText(aiEnhanceInstruction);
                  if (r.ok) {
                    setAiEnhancePickerTick((n) => n + 1);
                    setAiEnhanceSaveHint(null);
                    showToast("Saved as a new preset.", "success");
                  } else {
                    setAiEnhanceSaveHint(r.reason);
                    showToast(r.reason, "warning");
                  }
                }}
              >
                Save current as preset
              </Button>
            </Stack>
            {aiEnhanceSaveHint ? (
              <Typography variant="caption" color={aiEnhanceSaveHint.startsWith("Saved") ? "success.main" : "warning.main"}>
                {aiEnhanceSaveHint}
              </Typography>
            ) : null}
            {enhanceCustomOnly.length > 0 ? (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                  Your saved presets (click × to remove)
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                  {enhanceCustomOnly.map((p) => (
                    <Chip
                      key={p}
                      size="small"
                      label={p.length > 48 ? `${p.slice(0, 48)}…` : p}
                      onDelete={() => {
                        removeCustomPrompt(p);
                        setAiEnhancePickerTick((n) => n + 1);
                        setAiEnhanceSaveHint("Preset removed.");
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (enhanceMut.isPending || enhanceEditMut.isPending) return;
              setAiEnhanceDialogOpen(false);
              setAiEnhanceFor(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={enhanceMut.isPending || enhanceEditMut.isPending}
            onClick={() => {
              const userInstructions = aiEnhanceInstruction.trim() || undefined;
              if (aiEnhanceFor === "add") {
                const imported = importedProduct ?? buildImportedFromFormForAi(addForm);
                enhanceMut.mutate({ imported, userInstructions });
                setAiEnhanceDialogOpen(false);
                setAiEnhanceFor(null);
              } else if (aiEnhanceFor === "edit" && editId) {
                const imported: ImportedProduct = {
                  sourceUrl: `admin://product/${editId}`,
                  sourceHost:
                    typeof window !== "undefined" && window.location.host ? window.location.host : "admin",
                  title: editForm.title,
                  slug: editForm.slug,
                  price: editForm.price,
                  compareAtPrice: editForm.compareAtPrice || null,
                  description: editForm.description,
                  images: editForm.images,
                };
                enhanceEditMut.mutate({ imported, userInstructions });
                setAiEnhanceDialogOpen(false);
                setAiEnhanceFor(null);
              }
            }}
          >
            {enhanceMut.isPending || enhanceEditMut.isPending ? "Enhancing…" : "Run enhancement"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === "bulk" ? "Delete products" : "Delete product"}
        message={
          deleteConfirm?.kind === "bulk"
            ? `Delete ${deleteConfirm.count} products? This cannot be undone.`
            : deleteConfirm?.kind === "one"
              ? `Delete “${deleteConfirm.title}”? This cannot be undone.`
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

      <AdminImageViewerDialog
        open={Boolean(adminPreview)}
        onClose={() => setAdminPreview(null)}
        images={adminPreview?.images ?? []}
        initialIndex={adminPreview?.idx ?? 0}
        title={adminPreview?.title ?? "Image preview"}
      />
    </Box>
  );
}

