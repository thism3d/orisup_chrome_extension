import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import { getKeyFeatureBulletLines } from "@/lib/productKeyFeatures";

type Props = {
  /** Same bilingual HTML as stored, e.g. from `wrapBilingualHtmlPair(en, bn)`. */
  bilingualRaw: string | null;
  lang: "en" | "bn";
  title: string;
};

/**
 * Key features as a compact bullet list for the buy box (above price).
 */
export function ProductKeyFeaturesAbovePrice({ bilingualRaw, lang, title }: Props) {
  const lines = useMemo(
    () => (bilingualRaw?.trim() ? getKeyFeatureBulletLines(bilingualRaw, lang) : []),
    [bilingualRaw, lang],
  );
  if (lines.length === 0) return null;

  return (
    <Box component="section" aria-label={title} sx={{ mb: 0.5 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        display="block"
        sx={{ fontWeight: 800, letterSpacing: 0.6, mb: 0.75 }}
      >
        {title}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          pl: 2.25,
          pr: 0,
          py: 0,
          listStyle: "disc",
        }}
      >
        {lines.map((line, i) => (
          <Box
            key={`${i}-${line.slice(0, 32)}`}
            component="li"
            sx={{ mb: 0.2, pl: 0, color: "text.primary", fontSize: "0.875rem", lineHeight: 1.55, fontWeight: 500 }}
          >
            {line}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
