import { Grid, Typography } from "@mui/material";
import type { Banner, ProductListRow } from "@/lib/types";
import { HeroCarousel } from "./HeroCarousel";
import { WelcomeJoinCard } from "./WelcomeJoinCard";
import { WeeklyDealsAside } from "./WeeklyDealsAside";

type Props = { banners: Banner[]; quickPickProducts: ProductListRow[] };

/** Minimal / editorial layout: full-width hero without category sidebar — categories stay in chips + nav. */
export function HeroFullWidth({ banners, quickPickProducts }: Props) {
  return (
    <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="stretch">
      <Grid item xs={12}>
        <HeroCarousel banners={banners} />
      </Grid>
      <Grid item xs={12} sm={5} md={4}>
        <WelcomeJoinCard />
      </Grid>
      <Grid item xs={12} sm={7} md={8} sx={{ display: { xs: "none", md: "block" } }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: "text.primary" }}>
          Weekly best deals
        </Typography>
        <WeeklyDealsAside items={quickPickProducts} />
      </Grid>
    </Grid>
  );
}
