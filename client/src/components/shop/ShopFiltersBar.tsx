import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontFiltersBarPaperSx } from "@/lib/storefrontUiSurface";

type Props = {
  sort: string;
  onSortChange: (v: string) => void;
  minPrice: string;
  maxPrice: string;
  onMinPrice: (v: string) => void;
  onMaxPrice: (v: string) => void;
  filterActive?: boolean;
  onClearFilters?: () => void;
};

export function ShopFiltersBar({
  sort,
  onSortChange,
  minPrice,
  maxPrice,
  onMinPrice,
  onMaxPrice,
  filterActive,
  onClearFilters,
}: Props) {
  const { uiTemplate } = useStorefrontUiTemplate();
  return (
    <Paper elevation={0} sx={storefrontFiltersBarPaperSx(uiTemplate)}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <TuneOutlinedIcon sx={{ fontSize: 22, color: "primary.dark" }} />
        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
          Filters
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }} flexWrap="wrap">
        <TextField
          select
          label="Sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: "100%", sm: 200 } }}
        >
          <MenuItem value="newest">Newest</MenuItem>
          <MenuItem value="price_asc">Price: low to high</MenuItem>
          <MenuItem value="price_desc">Price: high to low</MenuItem>
        </TextField>
        <TextField
          label="Min ৳"
          value={minPrice}
          onChange={(e) => onMinPrice(e.target.value.replace(/[^\d.]/g, ""))}
          size="small"
          inputProps={{ inputMode: "decimal", "aria-label": "Minimum price in taka" }}
          sx={{ width: { xs: "100%", sm: 120 } }}
        />
        <TextField
          label="Max ৳"
          value={maxPrice}
          onChange={(e) => onMaxPrice(e.target.value.replace(/[^\d.]/g, ""))}
          size="small"
          inputProps={{ inputMode: "decimal", "aria-label": "Maximum price in taka" }}
          sx={{ width: { xs: "100%", sm: 120 } }}
        />
        {filterActive && onClearFilters ? (
          <Button variant="outlined" color="inherit" size="medium" onClick={onClearFilters} sx={{ fontWeight: 700 }}>
            Reset filters
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
