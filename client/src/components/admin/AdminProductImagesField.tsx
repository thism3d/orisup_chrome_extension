import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson, apiUploadProductImage } from "@/lib/api";
import { mediaAbsoluteUrl } from "@/lib/site";
import { AdminImageViewerDialog } from "./AdminImageViewerDialog";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  /** When adding image URLs on "Add product", download/convert to WebP on the server before listing. */
  autoCompressOnAdd?: boolean;
  /** Section heading above the field (default: Product images). */
  sectionTitle?: string;
};

function dedupeUrls(input: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function aspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

function formatBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function useImageMeta(absUrl: string | undefined) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);

  useEffect(() => {
    setDims(null);
    setLoadFailed(false);
    if (!absUrl) return;
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => {
      setDims(null);
      setLoadFailed(true);
    };
    img.src = absUrl;
  }, [absUrl]);

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    if (!absUrl) return;
    void fetch(absUrl, { method: "HEAD" })
      .then((r) => {
        if (cancelled || !r.ok) return;
        const cl = r.headers.get("content-length");
        if (cl) {
          const n = parseInt(cl, 10);
          if (Number.isFinite(n)) setBytes(n);
        }
      })
      .catch(() => {
        if (!cancelled) setBytes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [absUrl]);

  return { dims, bytes, loadFailed };
}

function ImageRow({
  url,
  idx,
  onPrimary,
  onRemove,
  onOpenPreview,
  onOpenEnhance,
  onCompress,
  enhanceBusy,
  compressBusy,
}: {
  url: string;
  idx: number;
  onPrimary: () => void;
  onRemove: () => void;
  onOpenPreview: () => void;
  onOpenEnhance: () => void;
  onCompress: () => void;
  enhanceBusy: boolean;
  compressBusy: boolean;
}) {
  const abs = mediaAbsoluteUrl(url);
  const imgSrc = abs ?? url;
  const { dims, bytes, loadFailed } = useImageMeta(abs);

  const res = loadFailed ? "—" : dims ? `${dims.w}×${dims.h}px` : "Loading…";
  const ar = dims ? aspectRatioLabel(dims.w, dims.h) : "—";
  const sizeLine = `${res} · aspect ${ar} · ${formatBytes(bytes)}`;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ sm: "stretch" }}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.25, py: 1 }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexShrink: 0 }}>
        <Box
          component="img"
          src={imgSrc}
          alt={`Product ${idx + 1}`}
          onClick={onOpenPreview}
          role="presentation"
          sx={{
            width: 56,
            height: 56,
            borderRadius: 1,
            objectFit: "cover",
            bgcolor: "grey.100",
            cursor: "zoom-in",
          }}
        />
        <Tooltip title="Full view">
          <IconButton size="small" aria-label="Full view" onClick={onOpenPreview} color="primary">
            <OpenInFullRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: "break-all" }} color="text.secondary">
          {url}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {sizeLine}
        </Typography>
        {idx === 0 ? (
          <Typography variant="caption" color="warning.main" fontWeight={700}>
            Primary image
          </Typography>
        ) : null}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }} flexWrap="wrap" useFlexGap>
        <Tooltip title="Compress: resize (max long edge 2048px) and save as WebP for smaller files">
          <span>
            <Button
              size="small"
              variant="outlined"
              disabled={compressBusy || enhanceBusy}
              onClick={onCompress}
              sx={{ minWidth: 0, px: 1, fontSize: "0.75rem" }}
            >
              {compressBusy ? "…" : "Compress"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          title="Enhance: sharper, clearer, resize for web, add site logo from Settings (optional instructions in dialog)"
        >
          <span>
            <IconButton
              size="small"
              aria-label="Enhance image quality"
              color="secondary"
              disabled={enhanceBusy || compressBusy}
              onClick={onOpenEnhance}
            >
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Set as primary">
          <IconButton size="small" aria-label="Set as primary" color={idx === 0 ? "warning" : "default"} onClick={onPrimary}>
            <StarRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove image">
          <IconButton size="small" aria-label="Remove image" onClick={onRemove}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

export function AdminProductImagesField({ value, onChange, autoCompressOnAdd = false, sectionTitle }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlAddBusy, setUrlAddBusy] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [imgEnhanceIdx, setImgEnhanceIdx] = useState<number | null>(null);
  const [imgEnhanceInstruction, setImgEnhanceInstruction] = useState("");
  const [imgEnhanceInfo, setImgEnhanceInfo] = useState<string | null>(null);
  const [imgEnhanceError, setImgEnhanceError] = useState<string | null>(null);
  const [enhanceErrorToast, setEnhanceErrorToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const compressImgMut = useMutation({
    mutationFn: async (vars: { idx: number; currentUrls: string[]; imageUrl: string }) => {
      const r = await apiJson<{ ok: true; url: string }>("/api/admin/product-images/compress", {
        method: "POST",
        body: JSON.stringify({ imageUrl: vars.imageUrl }),
      });
      return { ...r, idx: vars.idx, currentUrls: vars.currentUrls };
    },
    onSuccess: (data) => {
      setError(null);
      onChange(data.currentUrls.map((u, i) => (i === data.idx ? data.url : u)));
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Compression failed.");
    },
  });

  const enhanceImgMut = useMutation({
    mutationFn: async (vars: { idx: number; currentUrls: string[]; imageUrl: string; userInstructions?: string }) => {
      const r = await apiJson<{ ok: true; url: string; warning?: string }>("/api/admin/product-images/enhance", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: vars.imageUrl,
          userInstructions: vars.userInstructions?.trim() || undefined,
        }),
      });
      return { ...r, idx: vars.idx, currentUrls: vars.currentUrls };
    },
    onSuccess: (data) => {
      if (!data?.url) return;
      setImgEnhanceInfo(data.warning || "Image enhanced. The list was updated in place with the new /uploads file.");
      setImgEnhanceError(null);
      setImgEnhanceInstruction("");
      onChange(
        data.currentUrls.map((u, i) => (i === data.idx ? data.url : u))
      );
      setImgEnhanceIdx(null);
    },
    onError: (e) => {
      setImgEnhanceInfo(null);
      const msg = e instanceof Error ? e.message : "Enhancement failed.";
      setImgEnhanceError(msg);
      setEnhanceErrorToast(msg);
    },
  });

  const pushUrls = (urls: string[]) => {
    onChange(dedupeUrls([...value, ...urls]));
  };

  const addByUrl = () => {
    void (async () => {
      const raw = urlInput.trim();
      if (!raw) return;
      const candidates = raw
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (candidates.length === 0) return;
      for (const url of candidates) {
        if (!/^https?:\/\/|^\/uploads\//i.test(url)) {
          setError("Image URL must start with http(s):// or /uploads/.");
          return;
        }
      }
      setError(null);
      if (autoCompressOnAdd) {
        setUrlAddBusy(true);
        try {
          const out: string[] = [];
          for (const imageUrl of candidates) {
            const r = await apiJson<{ ok: true; url: string }>("/api/admin/product-images/compress", {
              method: "POST",
              body: JSON.stringify({ imageUrl }),
            });
            out.push(r.url);
          }
          pushUrls(out);
          setUrlInput("");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not compress image.");
        } finally {
          setUrlAddBusy(false);
        }
      } else {
        pushUrls(candidates);
        setUrlInput("");
      }
    })();
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const r = await apiUploadProductImage(file);
        uploaded.push(r.url);
      }
      pushUrls(uploaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {sectionTitle ?? "Product images"}
      </Typography>
      {imgEnhanceInfo ? (
        <Alert severity="info" onClose={() => setImgEnhanceInfo(null)} sx={{ py: 0.5 }}>
          {imgEnhanceInfo}
        </Alert>
      ) : null}
      {imgEnhanceError ? <Alert severity="error">{imgEnhanceError}</Alert> : null}
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Image URL"
              placeholder="https://... or /uploads/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addByUrl())}
            />
            <Button
              variant="outlined"
              startIcon={<AddLinkRoundedIcon />}
              onClick={addByUrl}
              disabled={urlAddBusy}
            >
              {urlAddBusy ? "Compressing…" : "Add URL"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              multiple
              onChange={(e) => void uploadFiles(e.target.files)}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            First image is primary. Uploads and URL adds (on <strong>Add product</strong>) are stored as compressed WebP (max long edge
            2048px). Use <strong>Compress</strong> on each row when editing to re-encode; <strong>Enhance</strong> adds optional AI-style
            sharpening and site logo from Settings.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {value.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No images added yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {value.map((url, idx) => (
                <ImageRow
                  key={`${url}-${idx}`}
                  url={url}
                  idx={idx}
                  enhanceBusy={enhanceImgMut.isPending}
                  compressBusy={compressImgMut.isPending}
                  onCompress={() => {
                    setError(null);
                    compressImgMut.mutate({ idx, currentUrls: [...value], imageUrl: url });
                  }}
                  onOpenEnhance={() => {
                    setImgEnhanceIdx(idx);
                    setImgEnhanceInstruction("");
                    setImgEnhanceInfo(null);
                    setImgEnhanceError(null);
                  }}
                  onPrimary={() => {
                    if (idx === 0) return;
                    const next = [...value];
                    const [picked] = next.splice(idx, 1);
                    next.unshift(picked);
                    onChange(next);
                  }}
                  onRemove={() => onChange(value.filter((_, i) => i !== idx))}
                  onOpenPreview={() => {
                    setPreviewIdx(idx);
                  }}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
      <AdminImageViewerDialog
        open={previewIdx != null}
        onClose={() => setPreviewIdx(null)}
        images={value}
        initialIndex={previewIdx ?? 0}
        title={sectionTitle ?? "Product images"}
      />
      {previewIdx != null && value[previewIdx] ? (
        <Link
          href={mediaAbsoluteUrl(value[previewIdx]) ?? value[previewIdx]}
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          sx={{ alignSelf: "flex-start", fontSize: 12 }}
        >
          Open original
        </Link>
      ) : null}

      <Dialog
        open={imgEnhanceIdx != null}
        onClose={() => {
          if (enhanceImgMut.isPending) return;
          setImgEnhanceIdx(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enhance product image</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {imgEnhanceError && imgEnhanceIdx != null ? <Alert severity="error">{imgEnhanceError}</Alert> : null}
            <Typography variant="body2" color="text.secondary">
              Remote <code>http(s)://</code> images are saved to <code>/uploads/</code> first, then the server applies Sharp-only quality
              enhancement on the same image. Optional text below adjusts processing (e.g. brighter, softer, vivid, smaller logo). Logo from
              Settings (top-left) is added after.
            </Typography>
            <TextField
              label="Instructions (optional)"
              placeholder='e.g. "Keep it cleaner", "Stronger color pop", "Smaller logo watermark"'
              multiline
              minRows={3}
              fullWidth
              value={imgEnhanceInstruction}
              onChange={(e) => setImgEnhanceInstruction(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (enhanceImgMut.isPending) return;
              setImgEnhanceIdx(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={imgEnhanceIdx == null || enhanceImgMut.isPending}
            onClick={() => {
              if (imgEnhanceIdx == null) return;
              const u = value[imgEnhanceIdx];
              if (!u) return;
              setImgEnhanceInfo(null);
              setImgEnhanceError(null);
              enhanceImgMut.mutate({
                idx: imgEnhanceIdx,
                currentUrls: [...value],
                imageUrl: u,
                userInstructions: imgEnhanceInstruction.trim() || undefined,
              });
            }}
          >
            {enhanceImgMut.isPending ? "Preparing and enhancing…" : "Run enhancement"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(enhanceErrorToast)}
        autoHideDuration={10_000}
        onClose={() => setEnhanceErrorToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setEnhanceErrorToast(null)}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {enhanceErrorToast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
