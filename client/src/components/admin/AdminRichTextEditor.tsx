import { Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import DOMPurify from "dompurify";
import { useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { RichProductDescription } from "@/components/product/RichProductDescription";

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  minRows?: number;
};

function looksLikeHtml(s: string) {
  const t = s.trim();
  if (!t) return false;
  if (/^<[\s\S]+>$/i.test(t) && /<\/[a-z][a-z0-9]*>/i.test(t)) return true;
  return /<p[\s>]|<div[\s>]|<h[1-6][\s>]|<ul[\s>]|<ol[\s>]|<br\s*\/?>/i.test(t);
}

export function AdminRichTextEditor({ label = "Description", value, onChange, minRows = 8 }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "blockquote",
    "link",
  ];

  const minH = Math.max(220, (minRows || 8) * 22);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}{" "}
        <Typography component="span" variant="caption">
          ({value.trim().length} chars)
        </Typography>
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25, overflow: "hidden" }}>
        <Stack spacing={1}>
          <Tabs value={tab} onChange={(_, next: "write" | "preview") => setTab(next)} sx={{ minHeight: 38 }}>
            <Tab value="write" label="Write" sx={{ minHeight: 38 }} />
            <Tab value="preview" label="Preview" sx={{ minHeight: 38 }} />
          </Tabs>
          {tab === "write" ? (
            <Box
              sx={{
                "& .ql-toolbar": {
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderColor: "divider",
                  bgcolor: "action.hover",
                },
                "& .ql-container": {
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  borderColor: "divider",
                  minHeight: minH,
                  fontFamily: (t) => t.typography.fontFamily,
                  fontSize: (t) => t.typography.body2.fontSize,
                },
                "& .ql-editor": { minHeight: minH },
                "& .ql-editor.ql-blank::before": { fontStyle: "normal", color: "text.disabled" },
              }}
            >
              <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder="Write product details: features, specs, warranty, what’s in the box…"
              />
            </Box>
          ) : (
            <Box sx={{ px: 0.5, py: 1, minHeight: 120 }}>
              {value.trim() ? (
                looksLikeHtml(value) ? (
                  <Box
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.75,
                      "& p": { mb: 1.25 },
                      "& h1, & h2, & h3": { mt: 1.5, mb: 1, fontWeight: 800, color: "text.primary" },
                      "& ul, & ol": { pl: 2.5, mb: 1.25 },
                      "& a": { color: "primary.main" },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(value, { USE_PROFILES: { html: true } }),
                    }}
                  />
                ) : (
                  <RichProductDescription text={value} />
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No description yet.
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
      <Typography variant="caption" color="text.secondary">
        Rich text (like GitLab). Use headings, lists, and links. Imported URLs fill this field as HTML—review before publish.
      </Typography>
    </Stack>
  );
}
