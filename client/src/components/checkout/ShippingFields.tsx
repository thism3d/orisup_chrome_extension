import { Grid, TextField } from "@mui/material";
import type { ReactNode } from "react";
import type { UseFormRegister } from "react-hook-form";

export type ShippingFormFields = {
  customerName: string;
  customerPhone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode?: string;
};

type Props = { register: UseFormRegister<ShippingFormFields>; hideCityDistrict?: boolean; children?: ReactNode };

export function ShippingFields({ register, hideCityDistrict, children }: Props) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Full name" required {...register("customerName")} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Phone" required placeholder="01XXXXXXXXX" {...register("customerPhone")} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Address line 1" required {...register("line1")} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Address line 2" {...register("line2")} />
      </Grid>
      {!hideCityDistrict ? (
        <>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="City / Thana" required {...register("city")} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="District" required {...register("district")} />
          </Grid>
        </>
      ) : (
        <>
          <input type="hidden" {...register("city")} />
          <input type="hidden" {...register("district")} />
        </>
      )}
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Postal code" {...register("postalCode")} />
      </Grid>
      {children}
    </Grid>
  );
}
