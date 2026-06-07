import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import type { Category } from "@/lib/types";
import { categoryPreviewUrl } from "@/lib/categoryPreviewImages";
import { mediaAbsoluteUrl } from "@/lib/site";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { resizedImg } from "@/lib/responsiveImg";

type Props = { categories: Category[] };

/** Orynbd layout: horizontal “explore categories” circles (marketplace reference). */
export function OrynCategoryCircles({ categories }: Props) {
  const roots = categories.filter((c) => !c.parentId);
  const top = (roots.length ? roots : categories).slice(0, 10);

  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 2, sm: 2.5 },
        overflowX: "auto",
        py: 1,
        pb: 2,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {top.map((c) => {
        const rawImg = (c.imageUrl ? mediaAbsoluteUrl(c.imageUrl) ?? c.imageUrl : null) ?? categoryPreviewUrl(c.slug);
        const img = resizedImg(rawImg, 192);
        return (
          <Box
            key={c.id}
            component={Link}
            href={`/c/${c.slug}`}
            aria-label={c.name}
            sx={{
              flex: "0 0 auto",
              width: 88,
              textAlign: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box
              sx={{
                width: 88,
                height: 88,
                mx: "auto",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid",
                borderColor: "divider",
                mb: 1,
                bgcolor: (t) => alpha(t.palette.grey[200], 0.6),
                transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: "brand.main",
                  boxShadow: (t) => `0 12px 28px ${alpha(storefrontBrandMain(t), 0.2)}`,
                },
              }}
            >
              <Box
                component="img"
                src={img}
                alt=""
                width={88}
                height={88}
                loading="lazy"
                decoding="async"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
            <Typography variant="caption" fontWeight={700} sx={{ display: "block", lineHeight: 1.25 }} noWrap title={c.name}>
              {c.name}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
