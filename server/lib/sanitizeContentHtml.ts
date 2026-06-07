/**
 * Server-side HTML sanitizer for the rich-text bodies admins paste into Brand Trust Pages.
 *
 * Allowlist-based; strips scripts, styles, inline event handlers, dangerous URL schemes,
 * and any unknown tag/attribute. Mirrors the client-side DOMPurify configuration but runs
 * before persistence so we never store unsafe HTML.
 *
 * Rules:
 *   - allowed tags listed in CONTENT_ALLOWED_TAGS
 *   - allowed attributes per tag in CONTENT_ALLOWED_ATTRS
 *   - <a> href must use http/https/mailto/tel; rel/target are normalised
 *   - inline `style` and `on*` handlers are removed
 *   - <script>/<style>/<iframe>/<object>/<embed> contents are dropped wholesale
 */

const CONTENT_ALLOWED_TAGS = new Set([
  "p", "br", "hr", "span", "em", "i", "strong", "b", "u", "s", "small", "sup", "sub",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "a", "img",
  "div", "section", "article",
]);

const CONTENT_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
};

const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#)/i;

function stripDangerousBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(object|embed|form|input|button|select|textarea|link|meta|base)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(object|embed|form|input|button|select|textarea|link|meta|base)[^>]*\/?\s*>/gi, "");
}

function cleanAttributes(tag: string, attrText: string): string {
  const allowed = CONTENT_ALLOWED_ATTRS[tag];
  if (!allowed) return "";
  const out: string[] = [];
  const re = /([a-zA-Z][\w:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrText)) !== null) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? "").trim();
    if (!allowed.has(name)) continue;
    if (name === "href" || name === "src") {
      if (!SAFE_URL_RE.test(value)) continue;
    }
    if (name.startsWith("on")) continue;
    if (name === "style") continue;
    out.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }
  if (tag === "a") {
    const hasTarget = out.some((a) => a.startsWith("target="));
    if (hasTarget) {
      const hasRel = out.some((a) => a.startsWith("rel="));
      if (!hasRel) out.push('rel="noopener noreferrer"');
    }
  }
  return out.length ? " " + out.join(" ") : "";
}

export function sanitizeContentHtml(input: string): string {
  if (!input) return "";
  let html = stripDangerousBlocks(input);
  html = html.replace(
    /<\/?([a-zA-Z][\w-]*)((?:\s+[^>]*)?)\s*\/?>/g,
    (_full, rawTag: string, attrText: string) => {
      const tag = rawTag.toLowerCase();
      if (!CONTENT_ALLOWED_TAGS.has(tag)) return "";
      const isClose = _full.startsWith("</");
      if (isClose) return `</${tag}>`;
      const cleanAttrs = cleanAttributes(tag, attrText || "");
      const selfClosing = ["br", "hr", "img"].includes(tag);
      return `<${tag}${cleanAttrs}${selfClosing ? " /" : ""}>`;
    },
  );
  return html.trim();
}
