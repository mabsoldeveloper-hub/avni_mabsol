import { MODULE_KEY_MAP } from "@/components/sidebar-nav/constants";
import { SUPER_ADMIN_SIDEBAR_MODULES, checkIsSuperAdmin } from "@/lib/constants/superAdmin.constant";

export interface RouteModuleRequirement {
  id: string;
  name: string;
  category?: string;
}

export const SUPER_ADMIN_ALLOWED_PREFIXES = [
  "/dashboard/super-admin/dashboard",
  "/dashboard/super-admin/accounts",
  "/dashboard/super-admin/approvals",
  "/dashboard/super-admin/branches",
  "/dashboard/super-admin/deactivated",
  "/dashboard/super-admin/deleted",
  "/dashboard/super-admin/plans",
  "/dashboard/super-admin/reports",
  "/dashboard/super-admin/audit-logs",
  "/dashboard/super-admin/exe-logs",
  "/dashboard/super-admin/settings",
];

export function isAllowedSuperAdminPath(pathname: string): boolean {
  if (!pathname) return false;
  let clean = pathname.replace(/\/+$/, "").toLowerCase();

  // Strip leading dynamic role segment if present: /dashboard/:role/super-admin/... -> /dashboard/super-admin/...
  const roleMatch = clean.match(/^\/dashboard\/[^/]+\/super-admin(\/.*)?$/);
  if (roleMatch) {
    clean = `/dashboard/super-admin${roleMatch[1] || ""}`;
  }

  if (clean === "/dashboard/super-admin") return true;

  return SUPER_ADMIN_ALLOWED_PREFIXES.some((prefix) => {
    const cleanPrefix = prefix.toLowerCase();
    return clean === cleanPrefix || clean.startsWith(cleanPrefix + "/");
  });
}

/**
 * Maps a given URL pathname to its required CRM module privilege.
 * Returns null if the route is a public dashboard route or has no module restriction.
 */
export function getRequiredModuleForPath(pathname: string): RouteModuleRequirement | null {
  if (!pathname || !pathname.startsWith("/dashboard")) {
    return null;
  }

  // Normalize path and strip trailing slashes
  const path = pathname.replace(/\/+$/, "").toLowerCase();

  // Root /dashboard overview is always accessible as landing page
  if (path === "/dashboard") {
    return null;
  }

  // Super Admin console routes: ONLY whitelisted platform governance routes qualify
  if (isAllowedSuperAdminPath(path)) {
    return {
      id: "super-admin",
      name: "Super Admin Console",
    };
  }

  // Strip role prefix if present, e.g. /dashboard/admin/sales -> /dashboard/sales or /dashboard/super-admin/sales -> /dashboard/sales
  const parts = path.split("/").filter(Boolean);
  let checkPath = path;
  if (
    parts.length >= 2 &&
    [
      "super-admin",
      "admin",
      "reception",
      "manager",
      "sales-executive",
      "mr",
      "asm",
      "rsm",
      "zsm",
      "nsm",
      "vp",
      "director",
      "md",
      "telecaller",
      "operator",
      "accountant",
      "user",
    ].includes(parts[1])
  ) {
    checkPath = "/dashboard/" + parts.slice(2).join("/");
  }

  // Route prefix checks
  if (checkPath === "/dashboard/executive-ai" || checkPath.startsWith("/dashboard/executive-ai/")) {
    return { id: "executive-ai", name: "Executive AI Dashboard" };
  }
  if (checkPath === "/dashboard/ai-notifications" || checkPath.startsWith("/dashboard/ai-notifications/")) {
    return { id: "ai-notifications", name: "AI Smart Alerts" };
  }
  if (checkPath === "/dashboard/search" || checkPath.startsWith("/dashboard/search/")) {
    return { id: "global-search", name: "Global Search & Voice AI" };
  }
  if (checkPath === "/dashboard/targets" || checkPath.startsWith("/dashboard/targets/")) {
    return { id: "targets", name: "Targets & Achievements" };
  }
  if (checkPath === "/dashboard/purchase-sales-analytics" || checkPath.startsWith("/dashboard/purchase-sales-analytics/")) {
    return { id: "purchase-sales-analytics", name: "Purchase & Sale Analytics" };
  }

  // Sales & Orders
  if (checkPath === "/dashboard/orders/tracking" || checkPath.startsWith("/dashboard/orders/tracking/")) {
    return { id: "order-stock-tracking", name: "Live Order & Stock Tracking" };
  }
  if (checkPath === "/dashboard/sales" || checkPath.startsWith("/dashboard/sales/") || checkPath === "/dashboard/orders" || checkPath.startsWith("/dashboard/orders/")) {
    return { id: "sales", name: "Sales & Invoicing" };
  }

  // Purchases
  if (checkPath === "/dashboard/purchase" || checkPath.startsWith("/dashboard/purchase/") || checkPath === "/dashboard/purchases" || checkPath.startsWith("/dashboard/purchases/")) {
    return { id: "purchase", name: "Purchase & Inward (GRN)" };
  }

  // Inventory & Stock
  if (checkPath === "/dashboard/inventory-intelligence" || checkPath.startsWith("/dashboard/inventory-intelligence/")) {
    return { id: "inventory-intelligence", name: "Inventory Intelligence" };
  }
  if (checkPath === "/dashboard/stock" || checkPath.startsWith("/dashboard/stock/") || checkPath === "/dashboard/inventory" || checkPath.startsWith("/dashboard/inventory/")) {
    return { id: "inventory", name: "Inventory & Stock Control" };
  }

  // Customers
  if (checkPath === "/dashboard/customers" || checkPath.startsWith("/dashboard/customers/") || checkPath === "/dashboard/customer" || checkPath.startsWith("/dashboard/customer/")) {
    return { id: "customer", name: "Customer & Accounts" };
  }

  // Company & Multi-Branch
  if (checkPath === "/dashboard/company" || checkPath.startsWith("/dashboard/company/")) {
    return { id: "company", name: "Company & Multi-Branch" };
  }

  // Financial Year
  if (checkPath === "/dashboard/financial-year" || checkPath.startsWith("/dashboard/financial-year/") || checkPath === "/dashboard/financial-years" || checkPath.startsWith("/dashboard/financial-years/")) {
    return { id: "financial-year", name: "Financial Year Management" };
  }

  // Leads & Marketing
  if (checkPath === "/dashboard/leads" || checkPath.startsWith("/dashboard/leads/")) {
    return { id: "leads", name: "Lead Management Hub" };
  }
  if (checkPath === "/dashboard/email-campaign" || checkPath.startsWith("/dashboard/email-campaign/")) {
    return { id: "email-campaign", name: "Email Campaign Hub" };
  }
  if (checkPath === "/dashboard/whatsapp-campaign" || checkPath.startsWith("/dashboard/whatsapp-campaign/")) {
    return { id: "whatsapp-campaign", name: "WhatsApp Campaign Hub" };
  }
  if (checkPath === "/dashboard/broadcast" || checkPath.startsWith("/dashboard/broadcast/")) {
    return { id: "broadcast-hub", name: "1-Click Broadcast Hub" };
  }

  // Masters & Area
  if (checkPath === "/dashboard/area" || checkPath.startsWith("/dashboard/area/")) {
    return { id: "area", name: "Area & Territory Master" };
  }
  if (checkPath === "/dashboard/compare" || checkPath.startsWith("/dashboard/compare/")) {
    return { id: "compare", name: "Comparison & Radar Analytics" };
  }
  if (checkPath === "/dashboard/custom-forms" || checkPath.startsWith("/dashboard/custom-forms/")) {
    return { id: "custom-forms", name: "AI Form Studio" };
  }
  if (checkPath === "/dashboard/master/alert-settings" || checkPath.startsWith("/dashboard/master/alert-settings/")) {
    return { id: "master-alert-settings", name: "Master Alert Settings" };
  }
  if (checkPath === "/dashboard/master" || checkPath.startsWith("/dashboard/master/")) {
    return { id: "master", name: "Pharma Master Hub" };
  }

  // Reports
  if (checkPath === "/dashboard/reports" || checkPath.startsWith("/dashboard/reports/")) {
    return { id: "reports", name: "Reports & GST Compliance" };
  }

  // Desktop ERP Sync
  if (checkPath === "/dashboard/mabsolcrmsync" || checkPath.startsWith("/dashboard/mabsolcrmsync/")) {
    return { id: "migration", name: "Desktop ERP Sync" };
  }

  // Users & Settings
  if (checkPath === "/dashboard/users" || checkPath.startsWith("/dashboard/users/")) {
    return { id: "users", name: "User & Role Management" };
  }
  if (checkPath === "/dashboard/settings" || checkPath.startsWith("/dashboard/settings/")) {
    return { id: "settings", name: "System Settings & Customization" };
  }

  return null;
}

/**
 * Checks whether the current user or active company has permission to access a required module.
 */
export function isModuleAllowedForUser(
  user: any,
  selectedCompany: any,
  requiredModuleId: string
): boolean {
  if (!requiredModuleId) return true;

  // Super Administrator is restricted strictly to super-admin console routes;
  // normal tenant operational pages are for tenant users only.
  if (checkIsSuperAdmin(user)) {
    return requiredModuleId === "super-admin";
  }

  // If route is super-admin and user is not super-admin, strictly deny
  if (requiredModuleId === "super-admin") {
    return false;
  }

  // Gather enabledModules from user, then company
  let rawEnabled: string[] = [];
  if (Array.isArray(user?.enabledModules)) {
    rawEnabled = user.enabledModules;
  } else if (Array.isArray(user?.companyId?.enabledModules)) {
    rawEnabled = user.companyId.enabledModules;
  } else if (Array.isArray((selectedCompany as any)?.enabledModules)) {
    rawEnabled = (selectedCompany as any).enabledModules;
  }

  const enabledSet = new Set<string>();
  for (const m of rawEnabled) {
    if (!m) continue;
    const lower = String(m).toLowerCase().trim();
    enabledSet.add(lower);

    // Expand aliases
    const aliases = MODULE_KEY_MAP[lower] || [];
    for (const a of aliases) {
      enabledSet.add(a.toLowerCase());
    }

    if (lower === "purchases" || lower === "purchase") {
      enabledSet.add("purchase");
      enabledSet.add("purchases");
    }
    if (lower === "financial_years" || lower === "financial-year") {
      enabledSet.add("financial-year");
      enabledSet.add("financial_years");
    }
    if (lower === "custom_forms" || lower === "custom-forms") {
      enabledSet.add("custom-forms");
      enabledSet.add("custom_forms");
    }
    if (lower === "migration" || lower === "mabsolcrmsync") {
      enabledSet.add("migration");
      enabledSet.add("mabsolcrmsync");
    }
    if (lower === "billing") {
      enabledSet.add("billing");
      enabledSet.add("sales");
      enabledSet.add("purchase");
    }
  }

  const reqLower = requiredModuleId.toLowerCase().trim();
  if (enabledSet.has(reqLower)) {
    return true;
  }

  // Also check if any enabled module aliases include the required module
  for (const key of Array.from(enabledSet)) {
    if (key === reqLower) return true;
    const subIds = MODULE_KEY_MAP[key] || [];
    if (subIds.includes(reqLower)) return true;
  }

  return false;
}
