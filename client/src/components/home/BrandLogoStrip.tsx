import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

/** Simple Icons CDN — brand marks; Walton uses local icon (no SI slug). */
const brands: { name: string; iconSlug?: string }[] = [
  { name: "Apple", iconSlug: "apple" },
  { name: "Samsung", iconSlug: "samsung" },
  { name: "Xiaomi", iconSlug: "xiaomi" },
  { name: "Adidas", iconSlug: "adidas" },
  { name: "Sony", iconSlug: "sony" },
  { name: "LG", iconSlug: "lg" },
  { name: "Nike", iconSlug: "nike" },
  { name: "Walton" },
];

function brandIconUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}/1a1a1a`;
}

export function BrandLogoStrip() {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: { xs: "wrap", md: "nowrap" },
        gap: { xs: 1, md: 1.25 },
        justifyContent: { xs: "flex-start", md: "space-between" },
        alignItems: "stretch",
      }}
    >
      {brands.map(({ name, iconSlug }) => (
        <Box
          key={name}
          sx={{
            /** Mobile: 4 items per row (2 rows for 8 brands). Desktop: single row. */
            flex: {
              xs: "0 0 calc((100% - 24px) / 4)",
              md: "1 1 0",
            },
            minWidth: { md: 0 },
          }}
        >
          <Box
            sx={(t) => ({
              py: { xs: 1, md: 1.25 },
              px: { xs: 0.5, md: 0.75 },
              textAlign: "center",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "#fff",
              transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: { xs: 72, md: 76 },
              "&:hover": {
                transform: { xs: "none", md: "translateY(-3px)" },
                boxShadow: { xs: "none", md: "0 10px 24px rgba(11,11,11,0.08)" },
                borderColor: { md: alpha(storefrontBrandMain(t), 0.45) },
              },
            })}
          >
            <Box
              sx={(t) => ({
                width: { xs: 32, md: 36 },
                height: { xs: 32, md: 36 },
                mx: "auto",
                mb: { xs: 0.5, md: 0.75 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1.5,
                bgcolor: alpha(storefrontBrandMain(t), 0.1),
                border: `1px solid ${alpha(storefrontBrandMain(t), 0.22)}`,
              })}
            >
              {iconSlug ? (
                <Box
                  component="img"
                  src={brandIconUrl(iconSlug)}
                  alt=""
                  width={22}
                  height={22}
                  decoding="async"
                  loading="lazy"
                  sx={{ width: { xs: 22, md: 24 }, height: { xs: 22, md: 24 }, objectFit: "contain" }}
                />
              ) : (
                <StorefrontOutlinedIcon sx={{ fontSize: { xs: 22, md: 24 }, color: "primary.dark" }} />
              )}
            </Box>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: "#1a1a1a", fontSize: { xs: "0.65rem", md: "0.7rem" }, lineHeight: 1.2 }}
            >
              {name}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
