import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link } from "wouter";
import type { Banner } from "@/lib/types";

type Props = { banners: Banner[] };

export function HeroSlider({ banners }: Props) {
  const b = banners[0];
  const showTitle = b?.showTitle !== false;
  const showSubtitle = b?.showSubtitle !== false;
  const showButton = b?.showButton !== false;
  const showShadow = b?.showShadow !== false;
  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#0B0B0B",
        minHeight: 280,
        backgroundImage: b ? `linear-gradient(90deg, rgba(11,11,11,0.92) 40%, transparent), url(${b.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Container sx={{ py: 6 }}>
        <Stack spacing={2} maxWidth={480}>
          {showTitle ? (
            <Typography
              variant="h3"
              color="#fff"
              fontWeight={800}
              sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, textShadow: showShadow ? "0 2px 20px rgba(0,0,0,0.4)" : "none" }}
            >
              {b?.title ?? "Best deals across Bangladesh"}
            </Typography>
          ) : null}
          {showSubtitle ? (
            <Typography color="rgba(255,255,255,0.85)">{b?.subtitle ?? "Shop electronics, fashion & home from verified vendors."}</Typography>
          ) : null}
          {showButton ? (
            <Button component={Link} href="/shop" variant="contained" color="primary" size="large" sx={{ alignSelf: "flex-start" }}>
              See all products
            </Button>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
