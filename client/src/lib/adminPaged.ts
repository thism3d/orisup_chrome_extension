export type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export function adminListQuery(
  path: string,
  params: Record<string, string | number | undefined | null>
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  const q = p.toString();
  return `${path}${q ? `?${q}` : ""}`;
}

export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
