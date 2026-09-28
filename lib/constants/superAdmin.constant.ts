/**
 * Super Admin Credentials and User Access Management Constants
 */

export const SUPER_ADMIN_CREDENTIALS = {
  get EMAIL(): string {
    return (process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
  },
  get PASSWORD(): string {
    return process.env.SUPER_ADMIN_PASSWORD || "Mab@5181";
  },
  get NAME(): string {
    return process.env.SUPER_ADMIN_NAME || "Super Administrator";
  },
  ROLE: "SuperAdmin",
  ROLE_TYPE: "SuperAdmin",
};

export const USER_APPROVAL_STATUS = {
  PENDING: "PendingApproval",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

export type UserApprovalStatus =
  (typeof USER_APPROVAL_STATUS)[keyof typeof USER_APPROVAL_STATUS];

export const ACCESS_DURATION_OPTIONS = [
  { label: "15 Days Trial", days: 15 },
  { label: "30 Days Access (Standard)", days: 30 },
  { label: "60 Days Access", days: 60 },
  { label: "90 Days (Quarterly)", days: 90 },
  { label: "180 Days (Half-Yearly)", days: 180 },
  { label: "365 Days (Annual)", days: 365 },
] as const;

export const DEFAULT_ACCESS_DAYS = 30;

/**
 * Universal helper to check whether a user object belongs to the Super Admin.
 * Handles variations across session tokens, database documents, and frontend states.
 */
export function checkIsSuperAdmin(user: any): boolean {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  const email = String(user.email || "").toLowerCase().trim();
  const superAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
  if (email && email === superAdminEmail) return true;
  if (email === "mabsoldeveloper@gmail.com") return true;

  const roleType = String(user.roleType || "").toLowerCase().trim();
  if (roleType === "superadmin") return true;

  const role = String(user.role || "").toLowerCase().trim();
  if (role === "superadmin") return true;

  const roleName = String(user.roleName || user.roleId?.roleName || "").toLowerCase().trim();
  if (roleName === "superadmin" || roleName === "super admin") return true;

  const name = String(user.name || "").toLowerCase().trim();
  if (name.includes("super admin") || name.includes("super administrator")) return true;

  return false;
}
