import { Box, Button, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiJson } from "@/lib/api";
import type { Banner } from "@/lib/types";

export function PromoSplitBanners() {
  const { data: splitBanners = [], isLoading } = useQuery({
    queryKey: ["banners", "home_split"],
    queryFn: () => apiJson<Banner[]>("/api/banners?placement=home_split"),
    staleTime: 30_000,
  });

  const banners = splitBanners.slice(0, 2);

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    );
  }

  if (banners.length === 0) return null;

  return (
    <Grid container spacing={2}>
      {banners.map((banner) => (
        <Grid item xs={12} md={6} key={banner.id}>
          <Box
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              minHeight: 200,
              p: 3,
              position: "relative",
              display: "flex",
              alignItems: "center",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              "&:hover": { transform: "translateY(-3px)", boxShadow: "0 16px 40px rgba(0,0,0,0.24)" },
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(105deg, rgba(11,11,11,0.86) 22%, rgba(11,11,11,0.48) 56%, rgba(11,11,11,0.16) 100%), url(${banner.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              },
            }}
          >
            <Stack spacing={1} maxWidth="70%" sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="overline" fontWeight={800} sx={{ color: "brand.main" }}>
                Promo
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: "#fff" }}>
                {banner.title}
              </Typography>
              {banner.subtitle ? (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                  {banner.subtitle}
                </Typography>
              ) : null}
              <Button
                component={Link}
                href={banner.linkUrl?.trim() || "/shop"}
                variant="contained"
                color="primary"
                size="small"
              >
                {banner.ctaLabel?.trim() || "Shop now"}
              </Button>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
