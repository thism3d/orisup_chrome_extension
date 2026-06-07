export class ApiHttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.code = code;
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let msg = res.statusText;
    let code: string | undefined;
    try {
      const j = (await res.json()) as { error?: unknown; code?: string };
      if (typeof j.code === "string" && j.code.trim()) code = j.code.trim();
      if (j.error !== undefined && j.error !== null) {
        msg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
      }
    } catch {
      /* ignore */
    }
    throw new ApiHttpError(msg, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<{ url: string }>;
}

/** Product admin: saves as optimized WebP under /uploads (server-side Sharp). */
export async function apiUploadProductImage(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/product-images/upload", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<{ url: string }>;
}
