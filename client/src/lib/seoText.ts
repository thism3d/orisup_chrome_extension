/** Plain-text excerpt for meta descriptions (strips simple markdown). */
export function plainExcerpt(raw: string | null | undefined, max = 155): string {
  const base =
    (raw ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  const fallback = "Shop trusted sellers on Orlenbd — multi-vendor marketplace with delivery across Bangladesh.";
  const text = base || fallback;
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
