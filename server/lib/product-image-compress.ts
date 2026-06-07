import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { uploadsDir } from "../config/upload";
import { loadImageBufferFromRef } from "./product-image-enhance";

/** Longest side; keeps aspect ratio, does not upscale small images. */
const MAX_LONG_EDGE = 2048;
const WEBP_QUALITY = 82;

/**
 * Resize (if needed) and encode as WebP for storage. Accepts common raster formats; SVG may fail.
 */
export async function compressImageBufferToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

export async function writeWebpBufferToUploads(buf: Buffer): Promise<{ url: string; filename: string }> {
  const name = `ob-webp-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const abs = path.join(uploadsDir, name);
  await fs.writeFile(abs, buf);
  return { url: `/uploads/${name}`, filename: name };
}

/** Load from http(s) or /uploads/, compress, write new WebP under /uploads/. Does not delete the source file. */
export async function compressProductImageRefToWebpUpload(imageRef: string): Promise<{ url: string }> {
  const buf = await loadImageBufferFromRef(imageRef.trim());
  let out: Buffer;
  try {
    out = await compressImageBufferToWebp(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes("Input buffer") || msg.includes("unsupported") || msg.includes("corrupt")
        ? "Image is missing, corrupt, or not a supported raster format."
        : `Compression failed: ${msg}`,
    );
  }
  const { url } = await writeWebpBufferToUploads(out);
  return { url };
}
