const STORAGE_KEY = "orlenbd-ai-product-enhance-prompts-v1";
const MAX_CUSTOM = 50;
const MAX_LEN = 2000;

/** Built-in presets (searchable + always available). */
export const DEFAULT_AI_ENHANCE_PROMPTS: string[] = [
  "Rebrand the copy for this marketplace: remove any source retailer/website name; present as a neutral marketplace listing. Emphasize verified sellers and safe checkout where appropriate.",
  "Emphasize warranty, return policy, and authentic product sourcing for Bangladesh buyers; keep tone clear and honest.",
  "Shorter, scannable copy. Lead the description with the main customer benefit; avoid filler and duplicate blocks from the import.",
  "More technical: prioritize specs, compatibility, and ports; reduce marketing adjectives. Use tables in specs, not the story.",
  "Family-friendly, simple language; avoid jargon. Highlight ease of setup and who the product is for.",
  "Enthusiast / performance angle: focus on real-world use (gaming, creative work, thermals) without exaggerating numbers.",
  "Value proposition: stress fair pricing vs typical retail, without naming competitor sites; mention COD or delivery only if you keep it generic.",
  "Bilingual quality: keep English tight; make Bangla natural and idiomatic, not a literal word-for-word translation of English.",
  "SEO: weave category-relevant terms into title, short lines, and first paragraph; avoid keyword stuffing and competitor brand names in SEO.",
  "Mobile-first: very short paragraphs, lead with 3–5 bullet-style facts in key features, minimal repetition between EN and BN.",
];

export function listCustomPrompts(): string[] {
  return readCustom();
}

function readCustom(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.slice(0, MAX_LEN))
      .filter((s) => s.trim().length > 0);
  } catch {
    return [];
  }
}

function writeCustom(items: string[]): void {
  if (typeof window === "undefined") return;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const s of items) {
    const t = s.trim().slice(0, MAX_LEN);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(t);
    if (unique.length >= MAX_CUSTOM) break;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

/** Defaults first, then user-saved; deduped by trimmed lower case. */
export function getAllPromptsForPicker(): string[] {
  const custom = readCustom();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of DEFAULT_AI_ENHANCE_PROMPTS) {
    const k = s.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  for (const s of custom) {
    const k = s.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function isCustomSavedPrompt(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (DEFAULT_AI_ENHANCE_PROMPTS.some((d) => d.trim().toLowerCase() === t.toLowerCase())) {
    return false;
  }
  return readCustom().some((c) => c.trim().toLowerCase() === t.toLowerCase());
}

export function saveNewPromptFromText(text: string): { ok: true } | { ok: false; reason: string } {
  const t = text.trim().slice(0, MAX_LEN);
  if (t.length < 8) return { ok: false, reason: "Enter at least 8 characters to save a preset." };
  if (t.length > MAX_LEN) return { ok: false, reason: "Text is too long." };
  const custom = readCustom();
  if (custom.some((c) => c.trim().toLowerCase() === t.toLowerCase())) {
    return { ok: false, reason: "This preset is already saved." };
  }
  if (DEFAULT_AI_ENHANCE_PROMPTS.some((d) => d.trim().toLowerCase() === t.toLowerCase())) {
    return { ok: false, reason: "This matches a built-in preset." };
  }
  if (custom.length >= MAX_CUSTOM) {
    return { ok: false, reason: `You can store at most ${MAX_CUSTOM} custom presets. Remove one first.` };
  }
  custom.unshift(t);
  writeCustom(custom);
  return { ok: true };
}

export function removeCustomPrompt(text: string): void {
  const t = text.trim().toLowerCase();
  if (!t) return;
  const custom = readCustom().filter((c) => c.trim().toLowerCase() !== t);
  writeCustom(custom);
}
