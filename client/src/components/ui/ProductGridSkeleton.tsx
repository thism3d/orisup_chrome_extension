import { Card, CardContent, Grid, Skeleton } from "@mui/material";

type Props = { count?: number };

export function ProductGridSkeleton({ count = 8 }: Props) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={6} sm={4} md={3} key={i}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #ECECEC",
              overflow: "hidden",
            }}
          >
            <Skeleton variant="rectangular" sx={{ pt: "100%" }} />
            <CardContent>
              <Skeleton width="90%" height={22} />
              <Skeleton width="60%" height={18} sx={{ mt: 1 }} />
              <Skeleton width="40%" height={16} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
