import {
  Box,
  Button,
  MenuItem,
  Pagination,
  Rating,
  Stack,
  TextField,
  Typography,
  Chip,
  Divider,
  Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/ui/StarRating";

type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  locale: string;
  adminReply: string | null;
  createdAt: string;
  authorName: string;
};

type Props = { vendorSlug: string; productSlug: string; productId: string };

const PAGE_SIZE = 5;

export function ProductReviewsPanel({ vendorSlug, productSlug, productId }: Props) {
  const { user } = useAuth();
  const [loc] = useLocation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState<number | null>(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [locale, setLocale] = useState<"en" | "bn">("en");

  const listQ = useQuery({
    queryKey: ["product-reviews", vendorSlug, productSlug, page],
    queryFn: () =>
      apiJson<{ items: ReviewItem[]; total: number; limit: number }>(
        `/api/products/${encodeURIComponent(vendorSlug)}/${encodeURIComponent(productSlug)}/reviews?limit=${PAGE_SIZE}&page=${page}`
      ),
  });

  const submit = useMutation({
    mutationFn: () =>
      apiJson<{ ok: boolean }>(`/api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: rating ?? 5,
          title: title.trim() || undefined,
          body: body.trim(),
          locale,
        }),
      }),
    onSuccess: () => {
      setBody("");
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["product-reviews", vendorSlug, productSlug] });
      void qc.invalidateQueries({ queryKey: ["product"] });
      void qc.invalidateQueries({ queryKey: ["home-products"] });
    },
  });

  const totalPages = Math.max(1, Math.ceil((listQ.data?.total ?? 0) / PAGE_SIZE));

  return (
    <Stack spacing={3} sx={{ pt: 1 }}>
      {user ? (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim().length < 10) return;
            submit.mutate();
          }}
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
          }}
        >
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Write a review
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Submissions are checked before they appear publicly.
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Rating
              </Typography>
              <Rating
                value={rating ?? 5}
                onChange={(_, v) => setRating(v ?? 5)}
                size="large"
                sx={{ display: "block" }}
              />
            </Box>
            <TextField
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Your review"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              fullWidth
              multiline
              minRows={3}
              inputProps={{ minLength: 10, maxLength: 4000 }}
            />
            <TextField select label="Language" value={locale} onChange={(e) => setLocale(e.target.value as "en" | "bn")} size="small" sx={{ maxWidth: 200 }}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="bn">বাংলা</MenuItem>
            </TextField>
            {submit.isError ? (
              <Typography color="error" variant="body2">
                {(submit.error as Error)?.message}
              </Typography>
            ) : null}
            {submit.isSuccess ? (
              <Typography color="success.main" variant="body2" fontWeight={600}>
                Thanks — your review was submitted for moderation.
              </Typography>
            ) : null}
            <Button type="submit" variant="contained" disabled={submit.isPending || body.trim().length < 10} sx={{ alignSelf: "flex-start", fontWeight: 800 }}>
              {submit.isPending ? "Submitting…" : "Submit review"}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          <MuiLink component={Link} href={`/login?next=${encodeURIComponent(loc || "/")}`} fontWeight={800} underline="hover">
            Sign in
          </MuiLink>{" "}
          to share your experience with this product.
        </Typography>
      )}

      <Divider />

      <Typography variant="subtitle1" fontWeight={800}>
        Customer reviews
      </Typography>

      {listQ.isLoading ? (
        <Typography color="text.secondary">Loading reviews…</Typography>
      ) : listQ.isError ? (
        <Typography color="error">{(listQ.error as Error)?.message}</Typography>
      ) : !listQ.data?.items.length ? (
        <Typography color="text.secondary">No reviews yet — be the first.</Typography>
      ) : (
        <Stack spacing={2}>
          {listQ.data.items.map((r) => (
            <Box
              key={r.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                <StarRating value={r.rating} size="sm" />
                <Typography variant="subtitle2" fontWeight={800}>
                  {r.authorName}
                </Typography>
                <Chip label={r.locale === "bn" ? "বাংলা" : "EN"} size="small" variant="outlined" sx={{ height: 22 }} />
                <Typography variant="caption" color="text.secondary">
                  {new Date(r.createdAt).toLocaleDateString()}
                </Typography>
              </Stack>
              {r.title ? (
                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                  {r.title}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                {r.body}
              </Typography>
              {r.adminReply ? (
                <Box
                  sx={(t) => ({
                    mt: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: alpha(storefrontBrandMain(t), 0.08),
                    borderLeft: `3px solid ${storefrontBrandMain(t)}`,
                  })}
                >
                  <Typography variant="caption" fontWeight={800} color="primary.dark" display="block">
                    Orlenbd
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {r.adminReply}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          ))}
          {totalPages > 1 ? (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              sx={{ pt: 1 }}
            />
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
