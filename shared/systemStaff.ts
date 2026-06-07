/**
 * Sentinel id for rows with no human actor (automated jobs, webhooks, migration gaps).
 * Not a real `users.id`; UI renders “System” instead of an avatar peek.
 */
export const SYSTEM_STAFF_ID = "__system__";

export type SystemStaffRef = {
  id: typeof SYSTEM_STAFF_ID;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
};

export const SYSTEM_STAFF_REF: SystemStaffRef = {
  id: SYSTEM_STAFF_ID,
  fullName: "System",
  email: null,
  avatarUrl: null,
};

export function isSystemStaffId(id: string | null | undefined): boolean {
  return id === SYSTEM_STAFF_ID;
}
