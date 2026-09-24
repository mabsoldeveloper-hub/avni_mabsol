/**
 * User role constants for MabsolCrm
 */

// Role Type strings stored in DB
export const ROLE_TYPE = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  RSM: "RSM",
  ZSM: "ZSM",
  MR: "MR",
} as const;

export type RoleType = (typeof ROLE_TYPE)[keyof typeof ROLE_TYPE];

// Roles that can see all companies across tenants
export const CROSS_TENANT_ROLES: RoleType[] = [ROLE_TYPE.SUPER_ADMIN, ROLE_TYPE.ADMIN];

// Roles that are admin-level within their own tenant
export const ADMIN_ROLES: RoleType[] = [ROLE_TYPE.SUPER_ADMIN, ROLE_TYPE.ADMIN];
