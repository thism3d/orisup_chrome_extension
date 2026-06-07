import { Card, CardActionArea, Grid, Typography } from "@mui/material";
import { Link } from "wouter";

const tiles = [
  { title: "Smart watch deals", desc: "Wearables from trusted shops", href: "/shop", tone: "#EEF8A6" },
  { title: "50% off men’s fashion", desc: "Limited time styles", href: "/c/fashion", tone: "#f0f0f0" },
  { title: "Jewellery sale", desc: "Rings & accessories", href: "/shop", tone: "#fff8e1" },
];

export function PromoTileRow() {
  return (
    <Grid container spacing={2}>
      {tiles.map((t) => (
        <Grid item xs={12} md={4} key={t.title}>
          <Card elevation={1} sx={{ borderRadius: 2, bgcolor: t.tone }}>
            <CardActionArea component={Link} href={t.href} sx={{ p: 2, minHeight: 120 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {t.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.desc}
              </Typography>
              <Typography variant="caption" sx={{ color: "#C6E300", fontWeight: 700, mt: 1, display: "block" }}>
                Shop now →
              </Typography>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
