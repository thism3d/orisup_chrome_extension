import { SYSTEM_STAFF_REF, type SystemStaffRef } from "../../shared/systemStaff";

export type AdminActorRef =
  | {
      id: string;
      fullName: string;
      email: string | null;
      avatarUrl: string | null;
    }
  | SystemStaffRef;

export function toActorRef(row: {
  id: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
}): AdminActorRef {
  if (!row.id) return SYSTEM_STAFF_REF;
  return {
    id: row.id,
    fullName: (row.fullName ?? "").trim() || "?",
    email: row.email ?? null,
    avatarUrl: row.avatarUrl ?? null,
  };
}
