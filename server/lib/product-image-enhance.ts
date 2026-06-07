import fs from "fs";
import path from "path";
import sharp from "sharp";
import { uploadsDir } from "../config/upload";

type PostParams = {
  targetLongEdge: number;
  brightness: number;
  saturation: number;
  sharpenSigma: number;
  logoSizeRatio: number;
};

const DEFAULTS: PostParams = {
  targetLongEdge: 1920,
  brightness: 1,
  saturation: 1.05,
  sharpenSigma: 1.1,
  logoSizeRatio: 0.1,
};

export function getSafeUploadsFilePath(urlPath: string): string | null {
  const t = urlPath.trim();
  if (!t.startsWith("/uploads/")) return null;
  const rel = t.replace(/^\/uploads\//, "");
  if (!rel) return null;
  const parts = rel.split("/").filter(Boolean);
  if (parts.some((p) => p === ".." || p === ".")) return null;
  const full = path.resolve(path.join(uploadsDir, ...parts));
  const base = path.resolve(uploadsDir);
  const relToBase = path.relative(base, full);
  if (relToBase.startsWith("..") || path.isAbsolute(relToBase)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

function extFromContentType(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return ".jpg";
  if (ct.includes("image/svg")) return ".svg";
  return ".jpg";
}

function extFromUrl(u: string): string {
  try {
    const p = new URL(u).pathname.toLowerCase();
    if (p.endsWith(".png")) return ".png";
    if (p.endsWith(".webp")) return ".webp";
    if (p.endsWith(".gif")) return ".gif";
    if (p.endsWith(".jpeg") || p.endsWith(".jpg")) return ".jpg";
    if (p.endsWith(".svg")) return ".svg";
  } catch {
    // ignore invalid URL parse errors
  }
  return "";
}

/** Download remote product image to local uploads before enhancement. */
async function downloadRemoteToUploadsForEnhance(imageUrl: string): Promise<string | null> {
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    if (ct && !ct.toLowerCase().startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 64 || buf.length > 20 * 1024 * 1024) return null;
    const ext = extFromUrl(imageUrl) || extFromContentType(ct);
    const filename = `ob-prefetch-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const abs = path.join(uploadsDir, filename);
    fs.writeFileSync(abs, buf);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

/**
 * If `ref` is http(s)://, download to /uploads/ first; otherwise validate local /uploads/ path.
 */
export async function ensureLocalSourceForEnhance(
  ref: string,
): Promise<{ localRef: string; sourcePrefetched: boolean }> {
  const t = ref.trim();
  if (t.startsWith("/uploads/")) {
    if (!getSafeUploadsFilePath(t)) {
      throw new Error(
        "This image is not on the server yet, or the path is invalid. Use a valid /uploads/ file or a full http(s) image URL.",
      );
    }
    return { localRef: t, sourcePrefetched: false };
  }
  if (!/^https?:\/\//i.test(t)) {
    throw new Error("Image must be a /uploads/ path or a full http(s) URL.");
  }
  const local = await downloadRemoteToUploadsForEnhance(t);
  if (!local) {
    throw new Error(
      "Could not download the image to the server (max 20MB, must be a direct image URL). Check the link and try again.",
    );
  }
  return { localRef: local, sourcePrefetched: true };
}

export async function loadImageBufferFromRef(ref: string): Promise<Buffer> {
  const t = ref.trim();
  const local = getSafeUploadsFilePath(t);
  if (local) return await fs.promises.readFile(local);
  if (!/^https?:\/\//i.test(t)) {
    throw new Error("Image must be a /uploads/ path or an http(s) URL.");
  }
  const r = await fetch(t, { redirect: "follow" });
  if (!r.ok) throw new Error(`Could not download image: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 20 * 1024 * 1024) throw new Error("Image too large (max 20MB).");
  return buf;
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl?.trim()) return null;
  try {
    return await loadImageBufferFromRef(logoUrl.trim());
  } catch {
    return null;
  }
}

function nextOutputFilename() {
  return `ob-enhance-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
}

function tuneFromInstructions(s: string | null | undefined): PostParams {
  const t = (s || "").toLowerCase();
  const out: PostParams = { ...DEFAULTS };
  if (t.includes("sharp") || t.includes("crisp")) out.sharpenSigma = 1.35;
  if (t.includes("soft") || t.includes("smooth")) out.sharpenSigma = 0.75;
  if (t.includes("bright")) out.brightness = 1.05;
  if (t.includes("dark")) out.brightness = 0.97;
  if (t.includes("vivid") || t.includes("color pop")) out.saturation = 1.12;
  if (t.includes("natural color") || t.includes("less color")) out.saturation = 1.0;
  if (t.includes("bigger logo")) out.logoSizeRatio = 0.13;
  if (t.includes("smaller logo")) out.logoSizeRatio = 0.08;
  return out;
}

export type EnhanceProductImageResult =
  | { ok: true; url: string; warning?: string }
  | { ok: false; error: string };

/**
 * Deterministic quality enhancement (Sharp only). Keeps the same source image/product identity.
 */
export async function enhanceProductImageFile(opts: {
  sourceImageRef: string;
  logoUrl: string | null;
  userInstructions?: string | null;
}): Promise<EnhanceProductImageResult> {
  let extraWarning: string | undefined;
  const params = tuneFromInstructions(opts.userInstructions);

  let mainBuf: Buffer;
  try {
    const ensured = await ensureLocalSourceForEnhance(opts.sourceImageRef);
    if (ensured.sourcePrefetched) {
      extraWarning = "The image was saved to the server under /uploads/ before processing.";
    }
    mainBuf = await loadImageBufferFromRef(ensured.localRef);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load image" };
  }

  let w = 0;
  let h = 0;
  let baseBuf: Buffer;
  try {
    baseBuf = await sharp(mainBuf)
      .rotate()
      .resize({ width: params.targetLongEdge, height: params.targetLongEdge, fit: "inside", withoutEnlargement: false })
      .normalise()
      .modulate({ brightness: params.brightness, saturation: params.saturation })
      .sharpen({ sigma: params.sharpenSigma, m1: 0.55, m2: 0.15 })
      .toBuffer();
    const dim = await sharp(baseBuf).metadata();
    w = dim.width ?? 0;
    h = dim.height ?? 0;
    if (!w || !h) return { ok: false, error: "Could not process image (unsupported or corrupt file?)" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Input buffer") || msg.includes("corrupt")) {
      return { ok: false, error: "Image file is missing, corrupt, or not a supported format." };
    }
    return { ok: false, error: `Image processing failed: ${msg}` };
  }

  const outName = nextOutputFilename();
  const outPath = path.join(uploadsDir, outName);
  const logoInput = await loadLogoBuffer(opts.logoUrl);
  const margin = Math.max(8, Math.round(Math.min(w, h) * 0.02));

  try {
    if (!logoInput) {
      await sharp(baseBuf).webp({ quality: 92, effort: 4 }).toFile(outPath);
      return {
        ok: true,
        url: `/uploads/${outName}`,
        warning:
          extraWarning ||
          "No site logo in Settings; enhanced image saved without a brand mark. Set Logo URL under Settings → Branding & previews.",
      };
    }

    const logoW = Math.max(32, Math.round(w * params.logoSizeRatio));
    const logoPng = await sharp(logoInput)
      .rotate()
      .resize(logoW, null, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    await sharp(baseBuf)
      .composite([{ input: logoPng, left: margin, top: margin, blend: "over" }])
      .webp({ quality: 92, effort: 4 })
      .toFile(outPath);

    return { ok: true, url: `/uploads/${outName}`, warning: extraWarning };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not write enhanced image: ${msg}` };
  }
}
