import { getSanitizedProductBodyHtmlForLang } from "@/components/product/RichProductDescription";

/** One bullet line per <li> (plain text) from key-features HTML, current storefront language. */
export function getKeyFeatureBulletLines(bilingualRaw: string, lang: "en" | "bn"): string[] {
  const html = getSanitizedProductBodyHtmlForLang(bilingualRaw, lang);
  if (!html.trim() || typeof document === "undefined") return [];
  const doc = new DOMParser().parseFromString(`<div id="k">${html}</div>`, "text/html");
  const root = doc.getElementById("k");
  if (!root) return [];
  const fromLists: string[] = [];
  for (const li of Array.from(root.querySelectorAll("ul li, ol li"))) {
    const t = (li.textContent || "").replace(/\s+/g, " ").trim();
    if (t) fromLists.push(t);
  }
  if (fromLists.length) return fromLists;
  const fromP: string[] = [];
  for (const p of Array.from(root.querySelectorAll("p"))) {
    const t = (p.textContent || "").replace(/\s+/g, " ").trim();
    if (t) fromP.push(t);
  }
  return fromP;
}
