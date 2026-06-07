import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { useState } from "react";

function parseMoney(s: string): number | null {
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function roundMoney(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

type Direction = "fillCompare" | "fillPrice";

type Props = {
  price: string;
  compareAtPrice: string;
  onPrice: (v: string) => void;
  onCompareAt: (v: string) => void;
};

/**
 * Compare-at is the higher “list” price; sale price is **Price**.
 * From sale + discount → fills compare-at. From compare-at + discount → fills sale price.
 */
export function AdminProductDiscountHelper({ price, compareAtPrice, onPrice, onCompareAt }: Props) {
  const [direction, setDirection] = useState<Direction>("fillCompare");
  const [mode, setMode] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");

  const apply = () => {
    const d = parseMoney(value);
    if (d === null) return;

    const sale = parseMoney(price);
    const list = parseMoney(compareAtPrice);

    if (direction === "fillCompare") {
      if (sale === null) return;
      if (mode === "amount") {
        onCompareAt(roundMoney(sale + d));
      } else {
        if (d >= 100) return;
        onCompareAt(roundMoney(sale / (1 - d / 100)));
      }
    } else {
      if (list === null) return;
      if (mode === "amount") {
        onPrice(roundMoney(Math.max(0, list - d)));
      } else {
        if (d >= 100) return;
        onPrice(roundMoney(list * (1 - d / 100)));
      }
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25, bgcolor: "action.hover" }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Quick discount
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Storefront shows a strikethrough only when compare-at is higher than sale price.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Apply discount to</InputLabel>
          <Select
            label="Apply discount to"
            value={direction}
            onChange={(e: SelectChangeEvent) => setDirection(e.target.value as Direction)}
          >
            <MenuItem value="fillCompare">Sale price → set compare-at (list)</MenuItem>
            <MenuItem value="fillPrice">Compare-at → set sale price</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Discount type</InputLabel>
          <Select label="Discount type" value={mode} onChange={(e: SelectChangeEvent) => setMode(e.target.value as "amount" | "percent")}>
            <MenuItem value="amount">Amount (BDT)</MenuItem>
            <MenuItem value="percent">Percent (%)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label={mode === "amount" ? "Discount (BDT)" : "Discount (%)"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          sx={{ minWidth: 120 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={apply}
          disabled={!value.trim()}
          sx={{ fontWeight: 700 }}
        >
          Apply
        </Button>
      </Stack>
    </Paper>
  );
}
