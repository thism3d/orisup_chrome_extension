import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  ADMIN_MODULE_DEFS,
  type AdminModuleKey,
  type AdminPermissionMatrix,
  createEmptyMatrix,
  parsePermissionMatrix,
} from "@shared/adminPermissions";
import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  initial: AdminPermissionMatrix | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (matrix: AdminPermissionMatrix) => void;
};

function countEnabled(m: AdminPermissionMatrix): number {
  let n = 0;
  for (const d of ADMIN_MODULE_DEFS) {
    const r = m[d.key];
    n += (r.view ? 1 : 0) + (r.create ? 1 : 0) + (r.edit ? 1 : 0) + (r.delete ? 1 : 0);
  }
  return n;
}

const palette = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0d9488", "#4f46e5"];

export function AdminRolePermissionDialog({
  open,
  title,
  subtitle,
  initial,
  saving,
  onClose,
  onSave,
}: Props) {
  const [matrix, setMatrix] = useState<AdminPermissionMatrix>(() => createEmptyMatrix());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (open) {
      const m = initial ? parsePermissionMatrix(initial) : createEmptyMatrix();
      setMatrix(m);
      setSelectAll(countEnabled(m) === ADMIN_MODULE_DEFS.length * 4);
    }
  }, [open, initial]);

  const total = ADMIN_MODULE_DEFS.length * 4;
  const enabledCount = useMemo(() => countEnabled(matrix), [matrix]);

  const setRowAll = (key: AdminModuleKey, on: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [key]: { view: on, create: on, edit: on, delete: on },
    }));
  };

  const setCell = (key: AdminModuleKey, field: "view" | "create" | "edit" | "delete", v: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: v },
    }));
  };

  const applySelectAll = (on: boolean) => {
    setSelectAll(on);
    const next = createEmptyMatrix();
    for (const d of ADMIN_MODULE_DEFS) {
      next[d.key] = { view: on, create: on, edit: on, delete: on };
    }
    setMatrix(next);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
          <FormControlLabel
            control={<Switch checked={selectAll} onChange={(_, v) => applySelectAll(v)} />}
            label="Select all permissions"
          />
          <Typography variant="caption" color="text.secondary">
            {enabledCount} of {total} enabled
          </Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 420, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Module</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  View
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Add
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Edit
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Delete
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  All
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ADMIN_MODULE_DEFS.map((d, i) => {
                const row = matrix[d.key];
                const allOn = row?.view && row?.create && row?.edit && row?.delete;
                return (
                  <TableRow key={d.key} hover>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          bgcolor: `${palette[i % palette.length]}22`,
                          color: "text.primary",
                        }}
                      >
                        {d.label}
                      </Box>
                    </TableCell>
                    {(["view", "create", "edit", "delete"] as const).map((f) => (
                      <TableCell key={f} align="center" padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={Boolean(row?.[f])}
                          onChange={(_, c) => setCell(d.key, f, c)}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center" padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allOn}
                        onChange={(_, c) => setRowAll(d.key, c)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={saving} onClick={() => onSave(matrix)}>
          {saving ? "Saving…" : "Save permissions"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
