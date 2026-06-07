import type { Express, Request, Response } from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import sharp from "sharp";
import { uploadsDir } from "../config/upload";

/**
 * Allowed widths (px) for the on-the-fly resizer. Anything else 404s to prevent
 * cache pollution from random/abusive crawlers.
 */
const ALLOWED_WIDTHS = new Set([64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280, 1600]);

const cacheRoot = path.join(uploadsDir, ".cache");

const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;

function safeJoin(base: string, name: string): string | null {
  const resolved = path.resolve(base, name);
  const baseResolved = path.resolve(base);
  if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) {
    return null;
  }
  return resolved;
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

async function buildVariant(srcPath: string, width: number, dstPath: string): Promise<void> {
  await ensureDir(path.dirname(dstPath));
  const tmp = `${dstPath}.tmp-${process.pid}-${Date.now()}`;
  const buf = await sharp(srcPath, { failOn: "none" })
    .rotate()
    .resize({ width, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, dstPath);
}

export function registerImageResizeRoutes(app: Express) {
  if (!fs.existsSync(cacheRoot)) {
    fs.mkdirSync(cacheRoot, { recursive: true });
  }

  app.get("/uploads/r/:w/:filename", async (req: Request, res: Response) => {
    try {
      const wRaw = req.params.w;
      const filename = req.params.filename;
      const w = Number.parseInt(wRaw, 10);
      if (!Number.isFinite(w) || !ALLOWED_WIDTHS.has(w)) {
        return res.status(404).json({ error: "Unsupported width" });
      }
      if (!filename || !SAFE_FILENAME_RE.test(filename)) {
        return res.status(404).json({ error: "Invalid filename" });
      }

      const srcPath = safeJoin(uploadsDir, filename);
      if (!srcPath || !fs.existsSync(srcPath)) {
        return res.status(404).json({ error: "Source not found" });
      }

      const cacheDir = path.join(cacheRoot, String(w));
      const dstPath = safeJoin(cacheDir, `${filename}.webp`);
      if (!dstPath) {
        return res.status(404).json({ error: "Bad path" });
      }

      if (!fs.existsSync(dstPath)) {
        try {
          await buildVariant(srcPath, w, dstPath);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("unsupported") || msg.includes("Input buffer")) {
            return res.status(415).json({ error: "Unsupported image format" });
          }
          throw err;
        }
      }

      res.set({
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Image-Resize": `${w}`,
      });
      return res.sendFile(dstPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Resize failed: ${msg}` });
    }
  });
}
