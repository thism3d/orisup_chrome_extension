import type { ReactNode } from "react";
import { Box } from "@mui/material";
import DOMPurify from "dompurify";
import { StoreArticleLayout } from "@/components/store/StoreArticleLayout";
import { useContentPage } from "@/hooks/useContentPage";
import type { BrandTrustSlug } from "../../../../shared/contentPageDefaults";

type Props = {
  slug: BrandTrustSlug;
  canonicalPath: string;
  /** Optional content rendered AFTER the dynamic body (e.g. contact-page form/cards). */
  extraBelow?: ReactNode;
  /** Optional content rendered ABOVE the dynamic body (rare). */
  extraAbove?: ReactNode;
};

const PROSE_SX = {
  color: "text.primary",
  lineHeight: 1.78,
  "& p": { mb: 2, lineHeight: 1.78 },
  "& h1": { fontSize: "1.5rem", fontWeight: 800, mt: 3, mb: 1.5 },
  "& h2": { fontSize: "1.2rem", fontWeight: 800, mt: 3.5, mb: 1.25, letterSpacing: -0.2 },
  "& h2:first-of-type": { mt: 0 },
  "& h3": { fontSize: "1.05rem", fontWeight: 800, mt: 2.5, mb: 1, color: "text.primary" },
  "& h4": { fontSize: "1rem", fontWeight: 700, mt: 2, mb: 1 },
  "& ul, & ol": { pl: 3, mb: 2 },
  "& li": { mb: 0.75, lineHeight: 1.7 },
  "& a": { color: "primary.main", fontWeight: 600 },
  "& a:hover": { textDecoration: "underline" },
  "& strong, & b": { fontWeight: 800 },
  "& blockquote": {
    borderLeft: "4px solid",
    borderColor: "primary.light",
    pl: 2,
    color: "text.secondary",
    fontStyle: "italic",
    my: 2,
  },
  "& table": { width: "100%", borderCollapse: "collapse", my: 2 },
  "& th, & td": { border: "1px solid", borderColor: "divider", p: 1.25, textAlign: "left" },
  "& th": { bgcolor: "action.hover", fontWeight: 800 },
  "& code": {
    fontFamily: "monospace",
    px: 0.6,
    py: 0.1,
    borderRadius: 0.5,
    bgcolor: "action.hover",
    fontSize: "0.92em",
  },
  "& img": { maxWidth: "100%", height: "auto", borderRadius: 1.5 },
  "& hr": { border: 0, borderTop: "1px solid", borderColor: "divider", my: 3 },
} as const;

export function ContentPageRenderer({ slug, canonicalPath, extraAbove, extraBelow }: Props) {
  const page = useContentPage(slug);
  const safeHtml = DOMPurify.sanitize(page.body, { USE_PROFILES: { html: true } });
  const safeIntro = DOMPurify.sanitize(page.intro, { USE_PROFILES: { html: true } });

  return (
    <StoreArticleLayout
      kicker={page.kicker}
      title={page.title}
      intro={undefined}
      description={page.metaDescription || page.title}
      canonicalPath={canonicalPath}
      fullWidth
    >
      {extraAbove}
      {safeIntro ? (
        <Box sx={{ mb: 2.5, color: "text.secondary", fontSize: "1.02rem", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: safeIntro }} />
      ) : null}
      <Box sx={PROSE_SX} dangerouslySetInnerHTML={{ __html: safeHtml }} />
      {extraBelow}
    </StoreArticleLayout>
  );
}
