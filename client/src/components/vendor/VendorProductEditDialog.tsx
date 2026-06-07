import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiJson } from "@/lib/api";
import type { Category } from "@/lib/types";
import { parseDecimalString } from "@shared/parseDecimalString";

export type VendorProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  status: string;
  categoryId: string | null;
  images: string[];
  freeDeliveryEnabled?: boolean;
  freeDeliveryMinCartAmount?: string | null;
  freeDeliveryMinQuantity?: number | null;
};

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  price: z.string().min(1),
  compareAtPrice: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  status: z.enum(["draft", "active"]),
  categoryId: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional()
  ),
  imagesText: z.string(),
  freeDeliveryEnabled: z.boolean(),
  freeDeliveryMinCartAmount: z.string().optional(),
  freeDeliveryMinQuantity: z.string().optional(),
});

type FormVals = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  product: VendorProductRow | null;
};

export function VendorProductEditDialog({ open, onClose, product }: Props) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<Category[]>("/api/categories"),
  });

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      price: "",
      compareAtPrice: "",
      stock: 0,
      status: "draft",
      categoryId: null,
      imagesText: "",
      freeDeliveryEnabled: false,
      freeDeliveryMinCartAmount: "",
      freeDeliveryMinQuantity: "",
    },
  });

  useEffect(() => {
    if (!open || !product) return;
    form.reset({
      title: product.title,
      slug: product.slug,
      description: product.description ?? "",
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? "",
      stock: product.stock,
      status: product.status === "active" ? "active" : "draft",
      categoryId: product.categoryId,
      imagesText: (product.images ?? []).join("\n"),
      freeDeliveryEnabled: Boolean(product.freeDeliveryEnabled),
      freeDeliveryMinCartAmount:
        product.freeDeliveryMinCartAmount != null ? String(product.freeDeliveryMinCartAmount) : "",
      freeDeliveryMinQuantity:
        product.freeDeliveryMinQuantity != null ? String(product.freeDeliveryMinQuantity) : "",
    });
  }, [open, product, form]);

  const patchMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson(`/api/vendor/products/${product!.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vendor-products"] });
      void qc.invalidateQueries({ queryKey: ["vendor-stats"] });
      onClose();
    },
  });

  const onSubmit = form.handleSubmit((v) => {
    if (!product) return;
    form.clearErrors(["freeDeliveryMinCartAmount", "freeDeliveryMinQuantity"]);
    const lines = v.imagesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    let freeDeliveryMinCartAmount: string | null = null;
    let freeDeliveryMinQuantity: number | null = null;
    if (v.freeDeliveryEnabled) {
      const amtRaw = (v.freeDeliveryMinCartAmount ?? "").trim().replace(/,/g, "");
      if (amtRaw !== "") {
        const amountNum = parseDecimalString(amtRaw);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
          form.setError("freeDeliveryMinCartAmount", {
            type: "manual",
            message: "Enter a positive amount or leave empty.",
          });
          return;
        }
        freeDeliveryMinCartAmount = amtRaw;
      }
      const qtRaw = (v.freeDeliveryMinQuantity ?? "").trim();
      if (qtRaw !== "") {
        const n = parseInt(qtRaw, 10);
        if (!Number.isFinite(n) || n < 1) {
          form.setError("freeDeliveryMinQuantity", {
            type: "manual",
            message: "Enter a whole number ≥ 1 or leave empty.",
          });
          return;
        }
        freeDeliveryMinQuantity = n;
      }
    }
    patchMut.mutate({
      title: v.title,
      slug: v.slug,
      description: v.description?.trim() || null,
      price: v.price,
      compareAtPrice: v.compareAtPrice?.trim() || null,
      stock: v.stock,
      status: v.status,
      categoryId: v.categoryId ?? null,
      images: lines,
      freeDeliveryEnabled: v.freeDeliveryEnabled,
      freeDeliveryMinCartAmount,
      freeDeliveryMinQuantity,
    });
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit product</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField label="Title" required fullWidth {...form.register("title")} />
            <TextField
              label="URL slug"
              required
              fullWidth
              helperText="Lowercase letters, numbers, hyphens only"
              {...form.register("slug")}
            />
            <TextField label="Description" fullWidth multiline minRows={3} {...form.register("description")} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Price (BDT)" required fullWidth {...form.register("price")} />
              <TextField label="Compare-at (optional)" fullWidth {...form.register("compareAtPrice")} />
              <TextField label="Stock" type="number" required fullWidth {...form.register("stock")} />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Delivery
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.watch("freeDeliveryEnabled")}
                    onChange={(e) => {
                      const on = e.target.checked;
                      form.setValue("freeDeliveryEnabled", on);
                      if (!on) {
                        form.setValue("freeDeliveryMinCartAmount", "");
                        form.setValue("freeDeliveryMinQuantity", "");
                      }
                    }}
                  />
                }
                label="Free delivery (waive carrier fee when rules match)"
              />
              {form.watch("freeDeliveryEnabled") ? (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Optional minimum cart total and/or minimum units of this product. Leave both empty for unconditional
                    free delivery. If both are set, either condition qualifies.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Minimum cart total (৳)"
                      fullWidth
                      {...form.register("freeDeliveryMinCartAmount")}
                      placeholder="e.g. 2000"
                      error={Boolean(form.formState.errors.freeDeliveryMinCartAmount)}
                      helperText={form.formState.errors.freeDeliveryMinCartAmount?.message}
                    />
                    <TextField
                      label="Minimum quantity"
                      fullWidth
                      placeholder="e.g. 3"
                      value={form.watch("freeDeliveryMinQuantity")}
                      onChange={(e) =>
                        form.setValue("freeDeliveryMinQuantity", e.target.value.replace(/\D/g, ""))
                      }
                      error={Boolean(form.formState.errors.freeDeliveryMinQuantity)}
                      helperText={form.formState.errors.freeDeliveryMinQuantity?.message}
                    />
                  </Stack>
                </>
              ) : null}
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="vp-cat">Category</InputLabel>
              <Select
                labelId="vp-cat"
                label="Category"
                value={form.watch("categoryId") ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  form.setValue("categoryId", val === "" ? null : val);
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="vp-st">Status</InputLabel>
              <Select
                labelId="vp-st"
                label="Status"
                value={form.watch("status")}
                onChange={(e) => form.setValue("status", e.target.value as "draft" | "active")}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Image URLs"
              fullWidth
              multiline
              minRows={3}
              helperText="One URL per line"
              {...form.register("imagesText")}
            />
            {patchMut.isError && (
              <Typography color="error" variant="body2">
                {patchMut.error instanceof Error ? patchMut.error.message : "Update failed"}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={patchMut.isPending || !product}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
