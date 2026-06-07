import { Box, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from "@mui/material";
import { useMemo, type ReactNode } from "react";
import { RichProductDescription, getSanitizedProductBodyHtmlForLang } from "@/components/product/RichProductDescription";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

type AttrRow = { label: string; value: string };

function parseListItemsToRows(sanitizedHtml: string): AttrRow[] {
  if (typeof document === "undefined") return [];
  const doc = new DOMParser().parseFromString(`<div id="k">${sanitizedHtml}</div>`, "text/html");
  const root = doc.getElementById("k");
  if (!root) return [];
  const out: AttrRow[] = [];
  for (const li of Array.from(root.querySelectorAll("ul li, ol li"))) {
    const t = (li.textContent || "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    const colon = t.indexOf(":");
    if (colon > 0 && colon < 96) {
      const left = t.slice(0, colon).trim();
      const right = t.slice(colon + 1).trim();
      if (right) {
        out.push({ label: left, value: right });
        continue;
      }
    }
    out.push({ label: "•", value: t });
  }
  return out;
}

type GenParse = { kind: "rows"; rows: AttrRow[] } | { kind: "html"; html: string };

function parseGeneralInfo(sanitizedHtml: string): GenParse {
  const t = sanitizedHtml.trim();
  if (!t) return { kind: "html", html: t };
  if (/<\s*table[\s>]/i.test(t)) {
    return { kind: "html", html: t };
  }
  if (typeof document === "undefined") {
    return { kind: "html", html: t };
  }
  const doc = new DOMParser().parseFromString(`<div id="g">${t}</div>`, "text/html");
  const root = doc.getElementById("g");
  if (!root) return { kind: "html", html: t };
  const rows: AttrRow[] = [];
  const seen = new Set<string>();

  const push = (row: AttrRow) => {
    const k = `${row.label}|||${row.value}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push(row);
  };

  for (const p of Array.from(root.querySelectorAll("p"))) {
    const s = (p.textContent || "").replace(/\s+/g, " ").trim();
    if (!s) continue;
    const strong = p.querySelector("strong, b");
    if (strong && p.textContent) {
      const lab = (strong.textContent || "").replace(/\s+/g, " ").replace(/:+$/, "").trim();
      const full = s;
      if (lab && full.length > lab.length) {
        const after = full.slice(full.indexOf(lab) + lab.length).replace(/^[\s:–-]+/, "").trim();
        if (after) {
          push({ label: lab, value: after });
          continue;
        }
      }
    }
    const colon = s.indexOf(":");
    if (colon > 0 && colon < 90) {
      const left = s.slice(0, colon).replace(/\*+$/, "").trim();
      const right = s.slice(colon + 1).trim();
      if (left && right) {
        push({ label: left, value: right });
        continue;
      }
    }
    push({ label: "—", value: s });
  }
  for (const li of Array.from(root.querySelectorAll("ul li, ol li"))) {
    const s = (li.textContent || "").replace(/\s+/g, " ").trim();
    if (!s) continue;
    const colon = s.indexOf(":");
    if (colon > 0 && colon < 90) {
      const left = s.slice(0, colon).trim();
      const right = s.slice(colon + 1).trim();
      if (right) push({ label: left, value: right });
      else push({ label: "—", value: s });
    } else {
      push({ label: "—", value: s });
    }
  }

  if (rows.length) return { kind: "rows", rows };
  return { kind: "html", html: t };
}

function ProductDetailSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Box id={id} component="section" sx={{ borderRadius: 0.5, overflow: "hidden" }}>
      <Box
        sx={(t) => ({
          py: 1.25,
          px: 2,
          pl: 1.75,
          border: "1px solid",
          borderColor: "divider",
          borderBottom: "none",
          bgcolor: alpha(t.palette.text.primary, 0.05),
          boxShadow: `inset 3px 0 0 0 ${storefrontBrandMain(t)}`,
        })}
      >
        <Typography
          variant="subtitle2"
          fontWeight={800}
          letterSpacing={0.8}
          sx={{ textTransform: "uppercase", color: "text.primary", fontSize: "0.8rem" }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ border: "1px solid", borderColor: "divider" }}>{children}</Box>
    </Box>
  );
}

function AttributeTable({ rows, labelEmphasis }: { rows: AttrRow[]; labelEmphasis: boolean }) {
  if (rows.length === 0) return null;
  return (
    <TableContainer sx={{ maxWidth: "100%" }}>
      <Table
        size="small"
        sx={{
          tableLayout: "fixed",
          width: "100%",
          borderCollapse: "collapse",
          "& td, & th": { border: "1px solid", borderColor: "divider", py: 1.15, px: 1.5, verticalAlign: "top" },
        }}
      >
        <TableBody>
          {rows.map((r, i) => (
            <TableRow
              key={`${r.label}-${i}-${r.value}`}
              sx={{ bgcolor: i % 2 === 0 ? "background.paper" : "grey.50" }}
            >
              <TableCell
                component="th"
                scope="row"
                sx={{
                  width: { xs: "40%", sm: "34%" },
                  fontWeight: labelEmphasis ? 700 : 600,
                  color: "text.primary",
                  bgcolor: "action.hover",
                }}
              >
                {r.label}
              </TableCell>
              <TableCell sx={{ color: "text.primary", fontWeight: 500 }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

type KeyFeatureBlockProps = { bilingualRaw: string | null | undefined; lang: "en" | "bn"; title: string };

export function KeyFeaturesTableBlock({ bilingualRaw, lang, title }: KeyFeatureBlockProps) {
  const { rows, fallbackHtml } = useMemo(() => {
    if (!bilingualRaw?.trim()) {
      return { rows: [] as AttrRow[], fallbackHtml: null as string | null };
    }
    const one = getSanitizedProductBodyHtmlForLang(bilingualRaw, lang);
    const listRows = parseListItemsToRows(one);
    if (listRows.length > 0) {
      return { rows: listRows, fallbackHtml: null };
    }
    if (one.trim()) {
      return { rows: [] as AttrRow[], fallbackHtml: one };
    }
    return { rows: [] as AttrRow[], fallbackHtml: null };
  }, [bilingualRaw, lang]);

  if (rows.length === 0 && !fallbackHtml) return null;

  return (
    <ProductDetailSection id="product-key-features" title={title}>
      {rows.length > 0 ? (
        <AttributeTable rows={rows} labelEmphasis />
      ) : fallbackHtml ? (
        <Box sx={{ p: { xs: 1.75, sm: 2.25 } }}>
          <Box
            className="orlenbd-product-spec-html"
            sx={{
              color: "text.primary",
              "& p": { mb: 0 },
              "& ul": { m: 0, pl: 2.25 },
            }}
            dangerouslySetInnerHTML={{ __html: fallbackHtml }}
          />
        </Box>
      ) : null}
    </ProductDetailSection>
  );
}

type SpecBlockProps = {
  rows: { label: string; value: string }[] | null | undefined;
  title: string;
};

export function SpecificationsTableBlock({ rows, title }: SpecBlockProps) {
  if (!rows?.length) return null;
  return (
    <ProductDetailSection id="product-specifications" title={title}>
      <AttributeTable rows={rows} labelEmphasis />
    </ProductDetailSection>
  );
}

type GenProps = { bilingualRaw: string | null | undefined; lang: "en" | "bn"; title: string; detailLabel: string };

export function GeneralInfoTableBlock({ bilingualRaw, lang, title, detailLabel }: GenProps) {
  const content = useMemo(() => {
    if (!bilingualRaw?.trim()) return null;
    const html = getSanitizedProductBodyHtmlForLang(bilingualRaw, lang);
    if (!html.trim()) return null;
    const p = parseGeneralInfo(html);
    if (p.kind === "html") {
      return { type: "rich" as const, html: p.html };
    }
    const cleanRows = p.rows
      .map((r) =>
        r.label === "—" && r.value ? { label: detailLabel, value: r.value } : r,
      );
    if (cleanRows.length === 0) {
      return { type: "rich" as const, html };
    }
    return { type: "rows" as const, rows: cleanRows };
  }, [bilingualRaw, lang, detailLabel]);

  if (!content) return null;

  return (
    <ProductDetailSection id="product-general-info" title={title}>
      {content.type === "rows" ? (
        <AttributeTable rows={content.rows} labelEmphasis />
      ) : (
        <Box sx={{ p: { xs: 1.75, sm: 2.25 } }}>
          <Box
            className="orlenbd-product-spec-html"
            sx={{
              color: "text.secondary",
              lineHeight: 1.8,
              "& p": { mb: 1.1 },
              "& p:last-of-type": { mb: 0 },
              "& h3": { fontSize: "0.95rem", fontWeight: 800, mt: 1, mb: 0.5, color: "text.primary" },
              "& ul": { pl: 2.5, my: 1 },
              "& table": {
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                "& th, & td": {
                  border: "1px solid",
                  borderColor: "divider",
                  py: 1,
                  px: 1.25,
                },
                "& tbody tr:nth-of-type(odd)": { bgcolor: "action.hover" },
              },
            }}
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        </Box>
      )}
    </ProductDetailSection>
  );
}

type DescProps = {
  text: string | null | undefined;
  preferredLang: "en" | "bn";
  title: string;
};

export function ProductDescriptionPanel({ text, preferredLang, title }: DescProps) {
  if (!text?.trim()) return null;
  return (
    <ProductDetailSection id="product-description" title={title}>
      <Box
        sx={{
          p: { xs: 1.75, sm: 2.5 },
          bgcolor: "background.paper",
        }}
      >
        <RichProductDescription text={text} preferredLang={preferredLang} />
      </Box>
    </ProductDetailSection>
  );
}
