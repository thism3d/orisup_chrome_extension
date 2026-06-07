import { Box, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

type Props = { target: Date };

export function CountdownTimer({ target }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);

  const cell = (label: string, value: string) => (
    <Box
      sx={{
        minWidth: 46,
        px: 1,
        py: 0.85,
        borderRadius: 1.5,
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <Typography variant="body2" fontWeight={800} lineHeight={1.2}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "secondary.contrastText", fontSize: 10, opacity: 0.9 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {cell("Day", pad(d))}
      {cell("Hr", pad(h))}
      {cell("Min", pad(m))}
      {cell("Sec", pad(s))}
    </Stack>
  );
}

/** Next Sunday 23:59 (rolling) for flash sale countdown demo. */
export function useFlashSaleEnd(): Date {
  return useMemo(() => {
    const end = new Date();
    const day = end.getDay();
    let add = (7 - day) % 7;
    if (add === 0) add = 7;
    end.setDate(end.getDate() + add);
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);
}
