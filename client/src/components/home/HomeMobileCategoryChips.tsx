import { Chip, Stack } from "@mui/material";
import { Link } from "wouter";
import type { Category } from "@/lib/types";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import {
  storefrontCategoryChipSx,
  storefrontHomeMobileChipsSpacing,
  storefrontHomeMobileChipsStackSx,
} from "@/lib/storefrontUiSurface";

type Props = { categories: Category[] };

export function HomeMobileCategoryChips({ categories }: Props) {
  const { uiTemplate } = useStorefrontUiTemplate();
  const chipSx = storefrontCategoryChipSx(uiTemplate);
  return (
    <Stack
      direction="row"
      spacing={storefrontHomeMobileChipsSpacing(uiTemplate)}
      sx={{ ...storefrontHomeMobileChipsStackSx(uiTemplate), display: { xs: "none", md: "flex" } }}
    >
      {categories
        .filter((c) => !c.parentId)
        .map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} style={{ textDecoration: "none", flexShrink: 0 }}>
            <Chip label={c.name} sx={chipSx} />
          </Link>
        ))}
    </Stack>
  );
}
