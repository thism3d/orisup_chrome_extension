import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";

export type AdminViewMode = "table" | "grid" | "list";

type Props = {
  viewMode: AdminViewMode;
  onViewMode: (v: AdminViewMode) => void;
  /** Hide table/grid/list toggles (e.g. audit logs). */
  showViewModeToggle?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (_: unknown, p: number) => void;
  perPage: number;
  onPerPageChange: (n: number) => void;
  total: number;
  selectedCount: number;
  onClearSelection?: () => void;
  bulkActions?: React.ReactNode;
  filters?: React.ReactNode;
};

export function AdminListToolbar({
  viewMode,
  onViewMode,
  showViewModeToggle = true,
  page,
  totalPages,
  onPageChange,
  perPage,
  onPerPageChange,
  total,
  selectedCount,
  onClearSelection,
  bulkActions,
  filters,
}: Props) {
  return (
    <Stack spacing={1.5} sx={{ mb: 2, width: "100%" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        flexWrap="wrap"
        useFlexGap
      >
        {filters}
        <Box sx={{ flex: 1 }} />
        {showViewModeToggle ? (
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && onViewMode(v)}
            aria-label="View mode"
          >
            <ToggleButton value="table" aria-label="Table">
              <TableRowsRoundedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="grid" aria-label="Grid">
              <ViewModuleRoundedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List">
              <ViewListRoundedIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        ) : null}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="admin-per-page">Per page</InputLabel>
          <Select
            labelId="admin-per-page"
            label="Per page"
            value={perPage}
            onChange={(e: SelectChangeEvent<number>) => onPerPageChange(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Toolbar
        variant="dense"
        sx={{
          flexWrap: "wrap",
          gap: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
          minHeight: 48,
          px: 1.5,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {total} total · page {page} of {totalPages}
        </Typography>
        <Pagination
          size="small"
          count={totalPages}
          page={page}
          onChange={onPageChange}
          color="primary"
          showFirstButton
          showLastButton
          siblingCount={0}
          boundaryCount={1}
        />
        {selectedCount > 0 ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: { sm: 2 }, flexWrap: "wrap" }} useFlexGap>
            <Typography variant="body2" fontWeight={700}>
              {selectedCount} selected
            </Typography>
            {bulkActions}
            {onClearSelection ? (
              <IconButton size="small" onClick={onClearSelection} aria-label="Clear selection">
                ×
              </IconButton>
            ) : null}
          </Stack>
        ) : null}
      </Toolbar>
    </Stack>
  );
}
