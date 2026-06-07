import { Box, Stack, Typography } from "@mui/material";
import DOMPurify from "dompurify";
import type { ReactNode } from "react";

/** Renders product description: HTML (sanitized) when stored as rich text, else legacy markdown-style text. */
export function RichProductDescription({ text, preferredLang }: { text: string; preferredLang?: "en" | "bn" }) {
  const t = text?.trim() ?? "";
  if (!t) return null;
  const lang = preferredLang ?? detectPreferredLang();

  if (looksLikeHtml(t)) {
    const clean = sanitizeDescriptionForLang(t, lang);
    return (
      <Box
        className="orlenbd-product-desc-html"
        sx={{
          color: "text.secondary",
          lineHeight: 1.75,
          "& p": { mb: 1.25 },
          "& h1": { fontSize: "1.35rem", fontWeight: 800, mt: 0, mb: 1.25, color: "text.primary" },
          "& h2": { fontSize: "1.2rem", fontWeight: 800, mt: 2, mb: 1, color: "text.primary" },
          "& h3": { fontSize: "1.05rem", fontWeight: 800, mt: 1.75, mb: 0.75, color: "text.primary" },
          "& ul, & ol": { pl: 2.5, mb: 1.25 },
          "& li": { mb: 0.35 },
          "& a": { color: "primary.main", fontWeight: 600 },
          "& blockquote": {
            borderLeft: "3px solid",
            borderColor: "divider",
            pl: 1.5,
            my: 1.5,
            color: "text.secondary",
          },
        }}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <LegacyMarkdownDescription text={t} />;
}

function detectPreferredLang(): "en" | "bn" {
  if (typeof document !== "undefined") {
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("bn")) return "bn";
  }
  if (typeof navigator !== "undefined") {
    const langs = [navigator.language, ...(navigator.languages ?? [])].join(" ").toLowerCase();
    if (langs.includes("bn")) return "bn";
  }
  return "en";
}

function stripBilingualLineLabels(html: string): string {
  // Remove "EN:" / "BN:" badges the AI or admin merge may insert inside the active block
  return html
    .replace(/<p>\s*<strong>\s*EN\s*:\s*<\/strong>\s*/gi, "<p>")
    .replace(/<p>\s*<strong>\s*BN\s*:\s*<\/strong>\s*/gi, "<p>");
}

/**
 * If bilingual HTML is concatenated without data-lang, split on the BN block or marker.
 */
function splitLegacyBilingualBlock(html: string, lang: "en" | "bn"): string {
  const divBn = /<\s*div[^>]*\bdata-lang\s*=\s*["']bn["'][^>]*>/i.exec(html);
  if (divBn && divBn.index != null && divBn.index > 0) {
    return lang === "en" ? html.slice(0, divBn.index) : html.slice(divBn.index);
  }
  const pBn = html.search(/<p>\s*<strong>\s*BN\s*:\s*<\/strong>/i);
  if (pBn >= 0) {
    return lang === "en" ? html.slice(0, pBn) : html.slice(pBn);
  }
  return html;
}

function extractDataLangWithRegex(raw: string, lang: "en" | "bn"): string | null {
  // Depth-safe extraction of a single <div data-lang="…">…</div> (handles nested divs in description)
  const openRe = new RegExp(
    `<div\\b[^>]*\\bdata-lang\\s*=\\s*["']?${lang}["']?[^>]*>`,
    "i",
  );
  const open = openRe.exec(raw);
  if (!open || open.index == null) return null;
  const startContent = open.index + open[0].length;
  let depth = 1;
  const lower = raw.toLowerCase();
  let i = startContent;
  while (i < lower.length) {
    const nextOpen = lower.indexOf("<div", i);
    const nextClose = lower.indexOf("</div>", i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return raw.slice(startContent, nextClose);
    }
    i = nextClose + 6;
  }
  return null;
}

function sanitizeDescriptionForLang(raw: string, lang: "en" | "bn"): string {
  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(`<div id="root">${raw}</div>`, "text/html");
    const root = doc.getElementById("root");
    if (root) {
      const langBlocks = root.querySelectorAll("[data-lang]");
      if (langBlocks.length > 0) {
        langBlocks.forEach((node) => {
          const nodeLang = (node.getAttribute("data-lang") || "").toLowerCase();
          if (nodeLang !== lang) node.remove();
          else node.removeAttribute("data-lang");
        });
      } else {
        const marker = root.innerHTML.toLowerCase().indexOf("বাংলা বিবরণ");
        if (marker >= 0) {
          const html = root.innerHTML;
          root.innerHTML = lang === "bn" ? html.slice(marker) : html.slice(0, marker);
        } else {
          root.innerHTML = splitLegacyBilingualBlock(root.innerHTML, lang);
        }
      }
      const cleaned = stripBilingualLineLabels(root.innerHTML);
      return DOMPurify.sanitize(cleaned, { USE_PROFILES: { html: true } });
    }
  }

  // SSR / no DOMParser fallback: regex extract data-lang, else BN split, else বাংলা marker
  let body = raw;
  const extracted = extractDataLangWithRegex(body, lang);
  if (extracted !== null) {
    body = stripBilingualLineLabels(extracted);
    return DOMPurify.sanitize(body, { USE_PROFILES: { html: true } });
  }
  const marker = body.toLowerCase().indexOf("বাংলা বিবরণ");
  if (marker >= 0) {
    body = lang === "bn" ? body.slice(marker) : body.slice(0, marker);
  } else {
    body = splitLegacyBilingualBlock(body, lang);
  }
  body = stripBilingualLineLabels(body);
  return DOMPurify.sanitize(body, { USE_PROFILES: { html: true } });
}

function looksLikeHtml(s: string) {
  const tr = s.trim();
  if (!tr) return false;
  if (/^<[\s\S]+>$/i.test(tr) && /<\/[a-z][a-z0-9]*>/i.test(tr)) return true;
  return /<p[\s>]|<div[\s>]|<h[1-6][\s>]|<ul[\s>]|<ol[\s>]|<br\s*\/?>/i.test(tr);
}

function escapeHtmlPlain(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitized single-language HTML for a bilingual or plain body field (e.g. key features, general info).
 * Use when you need the same string that {@link RichProductDescription} would render, for parsing.
 */
export function getSanitizedProductBodyHtmlForLang(
  raw: string | null | undefined,
  preferredLang: "en" | "bn",
): string {
  const t = raw?.trim() ?? "";
  if (!t) return "";
  if (looksLikeHtml(t)) return sanitizeDescriptionForLang(t, preferredLang);
  return DOMPurify.sanitize(`<p>${escapeHtmlPlain(t)}</p>`, { USE_PROFILES: { html: true } });
}

function LegacyMarkdownDescription({ text }: { text: string }) {
  const blocks = text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <Stack spacing={2}>
      {blocks.map((block, bi) => {
        const lines = block
          .split("\n")
          .map((line) => line.trimEnd())
          .filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletList = lines.every((line) => /^-\s+/.test(line));
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line));

        if (isBulletList || isNumberedList) {
          const items = lines.map((line) => line.replace(isBulletList ? /^-\s+/ : /^\d+\.\s+/, ""));
          return (
            <Box
              key={bi}
              component={isNumberedList ? "ol" : "ul"}
              sx={{
                m: 0,
                pl: 2.75,
                color: "text.secondary",
                "& li": { mb: 0.5, lineHeight: 1.75 },
              }}
            >
              {items.map((item, i) => (
                <Box component="li" key={`${bi}-${i}`}>
                  {formatInline(item)}
                </Box>
              ))}
            </Box>
          );
        }

        const first = lines[0]?.trim() ?? "";
        const isHeading = /^\*\*[^*]+\*\*$/.test(first);
        if (isHeading) {
          const heading = first.replace(/^\*\*|\*\*$/g, "");
          const rest = lines.slice(1).join("\n");
          return (
            <Box key={bi}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: -0.2, mb: 1, color: "#1a1a1a" }}>
                {heading}
              </Typography>
              {rest ? (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, whiteSpace: "pre-line" }}>
                  {formatInline(rest)}
                </Typography>
              ) : null}
            </Box>
          );
        }
        return (
          <Typography key={bi} variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, whiteSpace: "pre-line" }}>
            {formatInline(block)}
          </Typography>
        );
      })}
    </Stack>
  );
}

function formatInline(s: string): ReactNode {
  const tokens = s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  if (tokens.length === 1) return s;
  return tokens.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Box component="span" fontWeight={700} color="text.primary" key={i}>
          {part.slice(2, -2)}
        </Box>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <Box component="span" fontStyle="italic" key={i}>
          {part.slice(1, -1)}
        </Box>
      );
    }
    return (
      <Box component="span" key={i}>
        {part}
      </Box>
    );
  });
}
