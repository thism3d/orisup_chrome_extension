import type { Express, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { upload } from "../config/upload";

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload", requireAuth, (req: Request, res: Response) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json({ error: msg });
      }
      if (!req.file) return res.status(400).json({ error: "file required" });
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });
}
