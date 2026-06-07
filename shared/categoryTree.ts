/**
 * Shared category tree utilities used by both server and client.
 *
 * The storefront ships with a fixed-depth taxonomy:
 *   - depth 0: root category   (e.g. "Electronics")
 *   - depth 1: subcategory     (e.g. "Mobile & Gadgets")
 *   - depth 2: sub-subcategory (e.g. "Smartphones")
 *
 * `MAX_CATEGORY_DEPTH = 2` -> 3 levels total. Storage stays generic via
 * `parentId`; depth is enforced in application code on create/update.
 */

export const MAX_CATEGORY_DEPTH = 2;

/** Minimum row shape needed by the helpers (whatever DB / DTO layer feeds in). */
export type CategoryTreeRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl?: string | null;
  sortOrder: number;
};

/** A category enriched with its sorted children (children may themselves have children). */
export type CategoryNode<T extends CategoryTreeRow = CategoryTreeRow> = T & {
  children: CategoryNode<T>[];
};

/**
 * Build a nested tree from a flat list. Children are sorted by `sortOrder` then `name`.
 * Orphan rows (parentId pointing to nothing) are surfaced as roots so they remain editable.
 */
export function buildCategoryTree<T extends CategoryTreeRow>(rows: T[]): CategoryNode<T>[] {
  const byId = new Map<string, CategoryNode<T>>();
  for (const row of rows) {
    byId.set(row.id, { ...(row as T), children: [] });
  }
  const roots: CategoryNode<T>[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parentId ? byId.get(row.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: CategoryNode<T>, b: CategoryNode<T>) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  const sortRecursive = (list: CategoryNode<T>[]) => {
    list.sort(sortFn);
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}

/** Compute the depth (root=0) of a node by walking parent links. Returns -1 if cyclic/missing. */
export function nodeDepth(rows: CategoryTreeRow[], id: string): number {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  let depth = 0;
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.parentId)) return -1;
    seen.add(current.parentId);
    const next = byId.get(current.parentId);
    if (!next) return -1;
    current = next;
    depth += 1;
    if (depth > MAX_CATEGORY_DEPTH + 5) return -1;
  }
  return depth;
}

/** Maximum depth reached anywhere in the subtree rooted at `id` (the node itself is depth 0). */
function subtreeMaxRelativeDepth(rows: CategoryTreeRow[], id: string): number {
  const childrenOf = new Map<string, CategoryTreeRow[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const list = childrenOf.get(r.parentId) ?? [];
    list.push(r);
    childrenOf.set(r.parentId, list);
  }
  const visit = (nodeId: string, depth: number, seen: Set<string>): number => {
    if (seen.has(nodeId)) return depth;
    seen.add(nodeId);
    const kids = childrenOf.get(nodeId) ?? [];
    let max = depth;
    for (const k of kids) {
      const d = visit(k.id, depth + 1, seen);
      if (d > max) max = d;
    }
    return max;
  };
  return visit(id, 0, new Set());
}

/**
 * Returns true if attaching node `nodeId` (or a brand-new node when undefined)
 * under `parentId` would push any descendant past `MAX_CATEGORY_DEPTH`.
 *
 * - When `parentId` is null/undefined the node becomes a root (depth 0) - always allowed.
 * - When `nodeId` is omitted (creating a new leaf), only the parent's depth matters.
 * - When `nodeId` is provided (moving an existing node), its existing subtree depth is added.
 */
export function wouldExceedDepth(
  rows: CategoryTreeRow[],
  parentId: string | null | undefined,
  nodeId?: string,
): boolean {
  if (!parentId) return false;
  const parentDepth = nodeDepth(rows, parentId);
  if (parentDepth < 0) return true;
  const subtreeAdd = nodeId ? subtreeMaxRelativeDepth(rows, nodeId) : 0;
  return parentDepth + 1 + subtreeAdd > MAX_CATEGORY_DEPTH;
}

/** Returns true if attaching `nodeId` under `parentId` would create a cycle. */
export function wouldCreateCycle(
  rows: CategoryTreeRow[],
  parentId: string | null | undefined,
  nodeId: string,
): boolean {
  if (!parentId) return false;
  if (parentId === nodeId) return true;
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  let cursor: CategoryTreeRow | undefined = byId.get(parentId);
  const seen = new Set<string>();
  while (cursor) {
    if (cursor.id === nodeId) return true;
    if (seen.has(cursor.id)) return true;
    seen.add(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return false;
}

/** Walk parents to build a breadcrumb (root .. self). Returns [] for unknown ids. */
export function categoryBreadcrumb<T extends CategoryTreeRow>(rows: T[], id: string): T[] {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const out: T[] = [];
  let current: T | undefined = byId.get(id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    out.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return out;
}
