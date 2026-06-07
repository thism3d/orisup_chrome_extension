import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
  Button,
  MenuItem,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { adminListQuery, type AdminListResponse } from "@/lib/adminPaged";
import { AdminStaffCell, type StaffRef } from "@/components/admin/AdminStaffCell";
import { AdminListToolbar, type AdminViewMode } from "./AdminListToolbar";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  requestPath: string;
  requestMethod: string;
  responseStatus: number;
  createdAt: string;
  actor: StaffRef;
};

const ENTITY_PRESETS = [
  "",
  "product",
  "order",
  "user",
  "vendor",
  "category",
  "banner",
  "courier",
  "settings",
  "content_page",
  "admin_role",
  "payment_gateway",
  "review",
  "newsletter_subscriber",
];

const pathActionSx = {
  minWidth: { xs: 200, sm: 260 },
  maxWidth: { xs: "100vw", md: 520 },
  wordBreak: "break-word" as const,
  overflowWrap: "anywhere" as const,
  whiteSpace: "normal" as const,
  verticalAlign: "top" as const,
};

export function AdminAuditLogsPanel() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<AdminViewMode>("table");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdToExclusive, setCreatedToExclusive] = useState("");

  const listUrl = useMemo(
    () =>
      adminListQuery("/api/admin/audit-logs", {
        page,
        perPage,
        q: q || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        actorUserId: actorUserId.trim() || undefined,
        createdFrom: createdFrom || undefined,
        createdToExclusive: createdToExclusive || undefined,
      }),
    [page, perPage, q, action, entityType, actorUserId, createdFrom, createdToExclusive],
  );

  const listQ = useQuery({
    queryKey: ["admin-audit-logs", listUrl],
    queryFn: () => apiJson<AdminListResponse<AuditRow>>(listUrl),
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const applyFilters = () => {
    setQ(qInput.trim());
    setAction(actionInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setQInput("");
    setQ("");
    setActionInput("");
    setAction("");
    setEntityType("");
    setActorUserId("");
    setCreatedFrom("");
    setCreatedToExclusive("");
    setPage(1);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 820 }}>
        Who changed what — filter by path, entity, actor, and time (UTC). Immutable records from the admin API.
      </Typography>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Search summary, path, action, metadata…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { md: 260 }, flex: 1 }}
          />
          <TextField
            size="small"
            label="Action contains"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            size="small"
            select
            label="Entity type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {ENTITY_PRESETS.map((v) => (
              <MenuItem key={v || "any"} value={v}>
                {v || "Any"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Actor user ID"
            value={actorUserId}
            onChange={(e) => setActorUserId(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            size="small"
            label="From date"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            size="small"
            label="To (exclusive)"
            type="date"
            value={createdToExclusive}
            onChange={(e) => setCreatedToExclusive(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <Button variant="contained" onClick={applyFilters}>
            Apply
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Clear
          </Button>
        </Stack>
      </Stack>

      <AdminListToolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        showViewModeToggle={false}
        page={page}
        totalPages={totalPages}
        onPageChange={(_, p) => setPage(p)}
        perPage={perPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
        total={total}
        selectedCount={0}
        filters={null}
      />

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Table size="small" sx={{ minWidth: 720, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 168 }}>When (UTC)</TableCell>
              <TableCell sx={{ width: 72 }}>Method</TableCell>
              <TableCell sx={{ width: 88 }}>Status</TableCell>
              <TableCell sx={{ width: "14%" }}>Entity</TableCell>
              <TableCell sx={{ width: "28%", minWidth: 200 }}>Path</TableCell>
              <TableCell sx={{ width: 52 }}>Actor</TableCell>
              <TableCell sx={{ width: "30%", minWidth: 200 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">Loading…</Typography>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">No audit entries match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                    {new Date(row.createdAt).toISOString().slice(0, 19)}Z
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>{row.requestMethod}</TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <Chip
                      size="small"
                      label={row.responseStatus}
                      color={row.responseStatus < 400 ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <Typography variant="body2" fontWeight={600}>
                      {row.entityType}
                    </Typography>
                    {row.entityId ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                      >
                        {row.entityId}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ ...pathActionSx }}>
                    <Typography variant="body2" component="span">
                      {row.requestPath}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", textAlign: "center" }}>
                    <AdminStaffCell staff={row.actor} dense />
                  </TableCell>
                  <TableCell sx={{ ...pathActionSx }}>
                    <Typography variant="body2" component="span">
                      {row.action}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
