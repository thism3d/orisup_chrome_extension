import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";

type Props = { onCreated: () => void };

export function AddProductInlineForm({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState(0);

  const create = useMutation({
    mutationFn: () =>
      apiJson("/api/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
          price,
          stock,
          images: [],
          status: "draft",
        }),
      }),
    onSuccess: () => {
      onCreated();
      setTitle("");
      setSlug("");
      setPrice("");
      setStock(0);
    },
  });

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" alignItems="center">
      <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField size="small" label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <TextField size="small" label="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      <TextField
        size="small"
        label="Stock"
        type="number"
        value={stock}
        onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
      />
      <Button variant="outlined" onClick={() => create.mutate()} disabled={!title || !price || create.isPending}>
        Add draft
      </Button>
    </Stack>
  );
}
