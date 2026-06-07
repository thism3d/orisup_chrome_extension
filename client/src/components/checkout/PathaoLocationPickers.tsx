import { FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

export type PathaoIdName = { id: number; name: string };

type Props = {
  cities: PathaoIdName[];
  zones: PathaoIdName[];
  areas: PathaoIdName[];
  cityId: number | "";
  zoneId: number | "";
  areaId: number | "";
  onCityChange: (e: SelectChangeEvent<number | "">) => void;
  onZoneChange: (e: SelectChangeEvent<number | "">) => void;
  onAreaChange: (e: SelectChangeEvent<number | "">) => void;
  labels: { city: string; zone: string; area: string; hint: string };
};

export function PathaoLocationPickers({
  cities,
  zones,
  areas,
  cityId,
  zoneId,
  areaId,
  onCityChange,
  onZoneChange,
  onAreaChange,
  labels,
}: Props) {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {labels.hint}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth size="small" required>
          <InputLabel id="pathao-city">{labels.city}</InputLabel>
          <Select<number | "">
            labelId="pathao-city"
            label={labels.city}
            value={cityId}
            onChange={onCityChange}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {cities.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth size="small" required disabled={!cityId}>
          <InputLabel id="pathao-zone">{labels.zone}</InputLabel>
          <Select<number | "">
            labelId="pathao-zone"
            label={labels.zone}
            value={zoneId}
            onChange={onZoneChange}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {zones.map((z) => (
              <MenuItem key={z.id} value={z.id}>
                {z.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth size="small" disabled={!zoneId}>
          <InputLabel id="pathao-area">{labels.area}</InputLabel>
          <Select<number | "">
            labelId="pathao-area"
            label={labels.area}
            value={areaId}
            onChange={onAreaChange}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </>
  );
}
