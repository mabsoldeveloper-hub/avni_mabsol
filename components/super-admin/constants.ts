export const SUPER_ADMIN_NAV_LINKS = [
  { href: "/dashboard/super-admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/super-admin", label: "Approve Admins", icon: "approvals" },
  { href: "/dashboard/super-admin/accounts", label: "All Accounts", icon: "accounts" },
  { href: "/dashboard/super-admin/deactivated", label: "Deactivated Accounts", icon: "deactivated" },
  { href: "/dashboard/super-admin/branches", label: "Branch Management", icon: "branches", badge: "Soon" },
  { href: "/dashboard/super-admin/plans", label: "Subscription Plans", icon: "plans", badge: "Soon" },
  { href: "/dashboard/super-admin/reports", label: "Reports", icon: "reports", badge: "Soon" },
  { href: "/dashboard/super-admin/audit-logs", label: "Audit Logs", icon: "audit", badge: "Soon" },
  { href: "/dashboard/super-admin/settings", label: "System Settings", icon: "settings" },
] as const;

export const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
] as const;

export const PLAN_FILTER_OPTIONS = [
  { value: "all", label: "All Plans" },
  { value: "free_trial", label: "Free Trial" },
  { value: "unlimited", label: "Unlimited" },
] as const;

export const TABLE_COLUMNS = [
  { key: "company", label: "ORGANIZATION / COMPANY" },
  { key: "email", label: "EMAIL" },
  { key: "plan", label: "PLAN" },
  { key: "branches", label: "TOTAL BRANCHES", align: "center" },
  { key: "status", label: "STATUS" },
  { key: "active", label: "ACTIVE", align: "center" },
  { key: "subscription", label: "SUBSCRIPTION" },
  { key: "received", label: "REGISTERED AT" },
  { key: "actions", label: "ACTIONS", align: "center" },
] as const;
