import {
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Rating,
  Stack,
  Skeleton,
} from "@mui/material";
import { Link } from "wouter";
import { formatBdt } from "@/lib/format";
import type { ProductListRow } from "@/lib/types";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

type Props = { items: ProductListRow[]; isLoading?: boolean };

export function WeeklyDealsAside({ items, isLoading }: Props) {
  const { text } = useStorefrontLanguage();
  const slice = items.slice(0, 4);

  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2,
        maxHeight: { md: 280 },
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: { xs: "0 10px 32px rgba(11,11,11,0.08)", sm: "0 12px 36px rgba(11,11,11,0.06)" },
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        "&:hover": {
          boxShadow: "0 16px 44px rgba(11,11,11,0.1)",
          borderColor: "brand.main",
        },
      }}
    >
      <CardContent sx={{ flex: 1, overflow: "auto", py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <List dense disablePadding>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
                  <Skeleton variant="rounded" width={56} height={56} />
                  <Stack flex={1} spacing={0.5}>
                    <Skeleton width="90%" />
                    <Skeleton width="40%" />
                  </Stack>
                </Stack>
              ))
            : slice.map((row) => (
                <ListItem key={row.product.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                  component={Link}
                  href={`/p/${row.vendorSlug}/${row.product.slug}`}
                  sx={{
                    borderRadius: 1.5,
                    transition: "background 0.2s ease, transform 0.2s ease",
                    "&:hover": { bgcolor: "action.hover", transform: "translateX(4px)" },
                    "@media (hover: none)": { "&:hover": { transform: "none" } },
                  }}
                >
                  <Stack direction="row" spacing={1} width="100%" alignItems="center">
                    <BoxThumb src={row.product.images?.[0]} />
                    <ListItemText
                      primary={row.product.title}
                      secondary={
                        <Stack spacing={0.5}>
                          <Rating value={4.5} readOnly size="small" precision={0.5} />
                          <Typography variant="body2" fontWeight={800} sx={{ color: "primary.dark" }}>
                            {formatBdt(row.product.price)}
                          </Typography>
                        </Stack>
                      }
                      primaryTypographyProps={{ noWrap: true, variant: "body2", fontWeight: 600 }}
                    />
                  </Stack>
                  </ListItemButton>
                </ListItem>
              ))}
        </List>
        {!isLoading && slice.length === 0 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, px: 0.5 }}>
            {text("Deals appear when products are live. Browse the ", "পণ্য লাইভ হলে ডিল দেখাবে। ")}{" "}
            <Typography component={Link} href="/shop" variant="caption" fontWeight={700} color="primary">
              {text("shop", "শপ")}
            </Typography>{" "}
            {text("or check back after the catalog loads.", " বা ক্যাটালগ লোড হওয়ার পর আবার দেখুন।")}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function BoxThumb({ src }: { src?: string }) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 1.5,
        bgcolor: "#f5f5f5",
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: "1px solid #eee",
      }}
    />
  );
}
