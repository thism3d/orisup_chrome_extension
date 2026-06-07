import { Box, Grid, Typography } from "@mui/material";
import { Link } from "wouter";
import type { Category } from "@/lib/types";
import { categoryPreviewUrl } from "@/lib/categoryPreviewImages";
import { mediaAbsoluteUrl } from "@/lib/site";
import { resizedImg } from "@/lib/responsiveImg";

type Props = { categories: Category[] };

export function CategoryMosaic({ categories }: Props) {
  // Show only root categories on homepage sections.
  const roots = categories.filter((c) => !c.parentId);
  const list = roots.length ? roots : categories;
  const top = list.slice(0, 12);

  return (
    <>
      {/* Mobile: compact icon grid like the reference design */}
      <Grid container spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {top.map((c) => {
          const rawImg = (c.imageUrl ? mediaAbsoluteUrl(c.imageUrl) ?? c.imageUrl : null) ?? categoryPreviewUrl(c.slug);
          const img = resizedImg(rawImg, 192);
          return (
            <Grid item xs={4} key={c.id}>
              <Box
                component={Link}
                href={`/c/${c.slug}`}
                aria-label={c.name}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  textDecoration: "none",
                  color: "text.primary",
                  py: 0.25,
                }}
              >
                <Box
                  component="img"
                  src={img}
                  alt=""
                  width={86}
                  height={86}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    width: 86,
                    height: 86,
                    objectFit: "contain",
                  }}
                />
                <Typography
                  variant="body2"
                  align="center"
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.2,
                    minHeight: 34,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {c.name}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Desktop/tablet: same compact circle-grid style as reference */}
      <Grid container spacing={1.75} sx={{ display: { xs: "none", md: "flex" } }}>
        {top.map((c) => {
          const rawImg = (c.imageUrl ? mediaAbsoluteUrl(c.imageUrl) ?? c.imageUrl : null) ?? categoryPreviewUrl(c.slug);
          const img = resizedImg(rawImg, 192);
          return (
            <Grid item md={2} lg={1} key={c.id} sx={{ minWidth: { md: 120, lg: 112 } }}>
              <Box
                component={Link}
                href={`/c/${c.slug}`}
                aria-label={c.name}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  textDecoration: "none",
                  color: "text.primary",
                  py: 0.25,
                  transition: "transform 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  component="img"
                  src={img}
                  alt=""
                  width={76}
                  height={76}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    width: 76,
                    height: 76,
                    objectFit: "cover",
                  }}
                />
                <Typography
                  variant="body2"
                  align="center"
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.2,
                    minHeight: 34,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {c.name}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
