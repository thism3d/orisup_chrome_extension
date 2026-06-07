import { Box, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  accent?: "lime" | "teal" | "violet" | "amber" | "rose" | "sky";
};

const ACCENTS: Record<NonNullable<Props["accent"]>, { line: string; glow: string }> = {
  lime: { line: "#C6E300", glow: "rgba(198, 227, 0, 0.12)" },
  teal: { line: "#2dd4bf", glow: "rgba(45, 212, 191, 0.12)" },
  violet: { line: "#a78bfa", glow: "rgba(167, 139, 250, 0.12)" },
  amber: { line: "#fbbf24", glow: "rgba(251, 191, 36, 0.12)" },
  rose: { line: "#fb7185", glow: "rgba(251, 113, 133, 0.12)" },
  sky: { line: "#38bdf8", glow: "rgba(56, 189, 248, 0.12)" },
};

export function AdminStatCard({ label, value, hint, icon, accent = "lime" }: Props) {
  const c = ACCENTS[accent];
  return (
    <Paper
      sx={{
        p: 2.25,
        position: "relative",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "4px solid",
        borderLeftColor: c.line,
        background: `linear-gradient(135deg, ${c.glow} 0%, rgba(19, 22, 28, 0.95) 48%)`,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.04em" }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {hint}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.06)",
            color: c.line,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}
