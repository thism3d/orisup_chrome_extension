import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableRow, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";

type SpecRow = { label: string; value: string };

type Props = {
  value: string;
  onChange: (next: string) => void;
  label?: string;
};

function parseRows(raw: string): { rows: SpecRow[]; error: string | null } {
  const t = raw.trim();
  if (!t) return { rows: [], error: null };
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed)) return { rows: [], error: "Specifications must be a JSON array." };
    const rows: SpecRow[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const label = String(rec.label ?? "").trim();
      const value = String(rec.value ?? "").trim();
      if (!label || !value) continue;
      rows.push({ label, value });
    }
    return { rows, error: null };
  } catch {
    return { rows: [], error: "Invalid JSON format." };
  }
}

export function AdminSpecificationsEditor({ value, onChange, label = "Specifications" }: Props) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: "label" | "value" } | null>(null);
  const parsed = useMemo(() => parseRows(value), [value]);
  const rows = parsed.rows;

  const writeRows = (nextRows: SpecRow[]) => {
    onChange(JSON.stringify(nextRows, null, 2));
  };

  const updateCell = (rowIdx: number, col: "label" | "value", nextVal: string) => {
    const nextRows = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: nextVal } : r));
    writeRows(nextRows);
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {parsed.error ? (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
              {parsed.error}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Fix JSON below, then table inline editing will work again.
            </Typography>
            <TextField
              value={value}
              onChange={(e) => onChange(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={6}
              sx={{ "& textarea": { fontFamily: "ui-monospace, monospace", fontSize: 13 } }}
            />
          </Box>
        ) : rows.length ? (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${idx}-${row.label}`} sx={{ bgcolor: idx % 2 === 0 ? "background.paper" : "action.hover" }}>
                    <TableCell
                      sx={{ width: { xs: "40%", sm: "34%" }, fontWeight: 700, cursor: "text" }}
                      onClick={() => setEditingCell({ rowIdx: idx, col: "label" })}
                    >
                      {editingCell?.rowIdx === idx && editingCell.col === "label" ? (
                        <TextField
                          value={row.label}
                          onChange={(e) => updateCell(idx, "label", e.target.value)}
                          size="small"
                          fullWidth
                          autoFocus
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setEditingCell(null);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setEditingCell(null);
                            }
                          }}
                        />
                      ) : (
                        row.label
                      )}
                    </TableCell>
                    <TableCell sx={{ cursor: "text" }} onClick={() => setEditingCell({ rowIdx: idx, col: "value" })}>
                      {editingCell?.rowIdx === idx && editingCell.col === "value" ? (
                        <TextField
                          value={row.value}
                          onChange={(e) => updateCell(idx, "value", e.target.value)}
                          size="small"
                          fullWidth
                          autoFocus
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setEditingCell(null);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setEditingCell(null);
                            }
                          }}
                        />
                      ) : (
                        row.value
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No specifications rows.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Add JSON rows below.
            </Typography>
            <TextField
              value={value}
              onChange={(e) => onChange(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={6}
              sx={{ "& textarea": { fontFamily: "ui-monospace, monospace", fontSize: 13 } }}
            />
          </Box>
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary">
        Click any specification label/value cell to edit inline.
      </Typography>
      {/* JSON fallback remains for invalid/empty content */}
      {parsed.error || rows.length === 0 ? null : (
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={6}
          sx={{ "& textarea": { fontFamily: "ui-monospace, monospace", fontSize: 13 } }}
          helperText="Advanced mode: raw JSON array of { label, value }."
        />
      )}
    </Stack>
  );
}
