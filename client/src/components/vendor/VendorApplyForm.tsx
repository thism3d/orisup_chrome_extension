import { Button, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";

type FormValues = { name: string; slug: string; contactPhone: string; contactEmail: string };

export function VendorApplyForm() {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: { contactPhone: "", contactEmail: "" },
  });

  const apply = useMutation({
    mutationFn: (body: Partial<FormValues>) =>
      apiJson("/api/vendor/apply", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vendor-me"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) =>
        apply.mutate({
          name: v.name,
          slug: v.slug,
          contactPhone: v.contactPhone || undefined,
          contactEmail: v.contactEmail || undefined,
        })
      )}
    >
      <Typography variant="subtitle1" gutterBottom>
        Apply to sell on Orlenbd
      </Typography>
      <Stack spacing={2} maxWidth={400}>
        <TextField label="Shop name" required {...form.register("name")} />
        <TextField
          label="URL slug (lowercase, hyphens)"
          required
          placeholder="my-shop"
          {...form.register("slug")}
        />
        <TextField label="Contact phone" {...form.register("contactPhone")} />
        <TextField label="Contact email" type="email" {...form.register("contactEmail")} />
        {apply.isError && (
          <Typography color="error" variant="body2">
            {(apply.error as Error).message}
          </Typography>
        )}
        <Button type="submit" variant="contained" disabled={apply.isPending}>
          Submit application
        </Button>
      </Stack>
    </form>
  );
}
