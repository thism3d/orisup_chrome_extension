import { Card, CardActionArea, Grid, Typography, Stack, Link as MuiLink } from "@mui/material";
import { Link } from "wouter";
import type { Category } from "@/lib/types";

const pillars = [
  { title: "Home appliances", slug: "electronics", subs: ["Kitchen", "AC", "Refrigerators"] },
  { title: "Electrical", slug: "electronics", subs: ["TV", "Audio", "Lighting"] },
  { title: "Sports & outdoor", slug: "fashion", subs: ["Fitness", "Camping", "Cycling"] },
];

type Props = { categories: Category[] };

export function CategoryPillars({ categories }: Props) {
  const bySlug = (s: string) => categories.find((c) => c.slug === s);

  return (
    <Grid container spacing={2}>
      {pillars.map((p) => (
        <Grid item xs={12} md={4} key={p.title}>
          <Card sx={{ borderRadius: 2, height: "100%" }}>
            <CardActionArea component={Link} href={bySlug(p.slug) ? `/c/${p.slug}` : "/shop"} sx={{ p: 2, alignItems: "stretch" }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {p.title}
              </Typography>
              <Stack spacing={0.5}>
                {p.subs.map((s) => (
                  <MuiLink key={s} component={Link} href="/shop" underline="hover" color="inherit" variant="body2">
                    {s}
                  </MuiLink>
                ))}
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
