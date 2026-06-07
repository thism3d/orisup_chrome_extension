const STORAGE_KEY = "orlenbd_recent_product_ids";
const MAX = 20;

export function pushRecentProductIdLocal(productId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let arr: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(arr)) arr = [];
    arr = [productId, ...arr.filter((x) => x !== productId)].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function getRecentProductIdsLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
