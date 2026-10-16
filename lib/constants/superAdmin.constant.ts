/**
 * Super Admin Credentials and User Access Management Constants
 */

export const SUPER_ADMIN_CREDENTIALS = {
  get EMAIL(): string {
    return (process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
  },
  get PASSWORD(): string {
    const pwd = process.env.SUPER_ADMIN_PASSWORD;
    if (!pwd) {
      throw new Error("SUPER_ADMIN_PASSWORD must be configured in environment variables.");
    }
    return pwd;
  },
  get NAME(): string {
    return process.env.SUPER_ADMIN_NAME || "mabsolinfotech";
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
  DELETED: "Deleted",
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

export function isReservedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = String(email).toLowerCase().trim();
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
  const publicSuperAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").toLowerCase().trim();

  return (
    clean === superAdminEmail ||
    clean === "mabsoldeveloper@gmail.com" ||
    (Boolean(publicSuperAdminEmail) && clean === publicSuperAdminEmail)
  );
}

/**
 * Universal catalog of all CRM Sidebar Modules for Super Admin Access Control.
 * Gives Super Admin the authority to give or stop access for any user across every module.
 */
export interface SidebarModuleDefinition {
  id: string;
  name: string;
  category: "DASHBOARD" | "OPERATIONS" | "LEADS" | "MASTERS" | "REPORTS_ADMIN";
  categoryLabel: string;
  route: string;
  iconName: string;
  desc: string;
  subModulesCount: number;
  subModules: string[];
}

export const SUPER_ADMIN_SIDEBAR_MODULES: SidebarModuleDefinition[] = [
  // ── DASHBOARD & AI INTELLIGENCE ──────────────────────────────────────────
  {
    id: "standard-dashboard",
    name: "Standard Dashboard",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard",
    iconName: "dashboard",
    desc: "Core CRM dashboard, sales summary KPIs, and quick actions",
    subModulesCount: 1,
    subModules: ["Standard Dashboard Overview"],
  },
  {
    id: "executive-ai",
    name: "Executive AI Dashboard",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard/executive-ai",
    iconName: "brain",
    desc: "AI financial simulator, predictive revenue forecasting & AI copilot",
    subModulesCount: 1,
    subModules: ["Revenue & What-If AI Simulator"],
  },
  {
    id: "ai-notifications",
    name: "AI Smart Alerts",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard/ai-notifications",
    iconName: "bell",
    desc: "Automated stock alerts, payment defaults, and critical reminders",
    subModulesCount: 1,
    subModules: ["AI Smart Alerts Hub"],
  },
  {
    id: "global-search",
    name: "Global Search & Voice AI",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard/search",
    iconName: "search",
    desc: "Cross-system search across medicines, invoices, ledgers, and voice search",
    subModulesCount: 1,
    subModules: ["Voice Command & Universal Search"],
  },
  {
    id: "targets",
    name: "Targets & Achievements",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard/targets",
    iconName: "target",
    desc: "Sales representative monthly/quarterly targets vs actual achievements",
    subModulesCount: 1,
    subModules: ["Target Achievement Matrix"],
  },
  {
    id: "purchase-sales-analytics",
    name: "Purchase & Sale Analytics",
    category: "DASHBOARD",
    categoryLabel: "Dashboard & AI Intelligence",
    route: "/dashboard/purchase-sales-analytics",
    iconName: "analytics",
    desc: "Gross margin analysis, stock turnover ratio, and cash flow balance",
    subModulesCount: 1,
    subModules: ["Combined Purchases vs Sales Analytics"],
  },

  // ── CORE OPERATIONS & BILLING ────────────────────────────────────────────
  {
    id: "sales",
    name: "Sales & Invoicing",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/sales",
    iconName: "shopping-cart",
    desc: "GST billing, sales receipts, sale returns, credit risk & orders",
    subModulesCount: 9,
    subModules: [
      "Sales Dashboard",
      "Invoices List",
      "Sales Outstanding",
      "Bad Debt & Credit Risk",
      "Create Sale Invoice",
      "Sales Return",
      "Receipt Entry",
      "Orders",
      "Sales vs Collection",
    ],
  },
  {
    id: "purchase",
    name: "Purchase & Inward (GRN)",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/purchase",
    iconName: "shopping-bag",
    desc: "Purchase bills, AI PDF/image bill scanner, inward returns & payments",
    subModulesCount: 9,
    subModules: [
      "Purchase Dashboard",
      "Purchase Invoices List",
      "Purchase Outstanding",
      "Create Purchase Bill",
      "AI Bill Entry (Photo/PDF)",
      "Purchase Return",
      "Payment Entry",
      "Purchase Orders",
      "Purchase vs Payment",
    ],
  },
  {
    id: "inventory",
    name: "Inventory & Stock Control",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/stock",
    iconName: "box",
    desc: "Product batches, stock ledgers, opening stock & expiry liquidator",
    subModulesCount: 7,
    subModules: [
      "Inventory Dashboard",
      "Products Catalog",
      "Stock Overview",
      "Opening Stock",
      "Add Stock Entry",
      "Stock Ledger Movement",
      "Batch Expiry Liquidator",
    ],
  },
  {
    id: "inventory-intelligence",
    name: "Inventory Intelligence",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/inventory-intelligence",
    iconName: "heartbeat",
    desc: "Near-expiry alerts, dead stock detection, and fast/slow movement radar",
    subModulesCount: 5,
    subModules: [
      "Alert Dashboard",
      "Near Expiry Monitor",
      "Dead / Dump Stock",
      "Fast / Slow Moving Analysis",
      "Alert Settings",
    ],
  },
  {
    id: "customer",
    name: "Customer & Accounts",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/customers",
    iconName: "users",
    desc: "Pharmacy & hospital customer ledgers, credit balances, and KYC",
    subModulesCount: 2,
    subModules: ["List Customers", "Modify Customers"],
  },
  {
    id: "company",
    name: "Company & Multi-Branch",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/company",
    iconName: "building",
    desc: "Company profiles, child branches, GST state mappings, and credentials",
    subModulesCount: 2,
    subModules: ["Create Company / Branch", "List Companies & Branches"],
  },
  {
    id: "financial-year",
    name: "Financial Year Management",
    category: "OPERATIONS",
    categoryLabel: "Operations & Commerce",
    route: "/dashboard/financial-year",
    iconName: "calendar",
    desc: "Financial year transitions, active year switching, and opening balances",
    subModulesCount: 2,
    subModules: ["Create Financial Year", "List Financial Years"],
  },

  // ── LEADS, MARKETING & CAMPAIGNS ─────────────────────────────────────────
  {
    id: "leads",
    name: "Lead Management Hub",
    category: "LEADS",
    categoryLabel: "Marketing & Lead Hub",
    route: "/dashboard/leads",
    iconName: "bullhorn",
    desc: "Doctor & chemist lead pipeline, stage Kanban, and conversion rates",
    subModulesCount: 1,
    subModules: ["Leads Pipeline & Kanban"],
  },
  {
    id: "email-campaign",
    name: "Email Campaign Hub",
    category: "LEADS",
    categoryLabel: "Marketing & Lead Hub",
    route: "/dashboard/email-campaign",
    iconName: "envelope",
    desc: "Automated bulk email delivery, marketing templates, and open tracking",
    subModulesCount: 1,
    subModules: ["Email Dispatch & Analytics"],
  },
  {
    id: "whatsapp-campaign",
    name: "WhatsApp Campaign Hub",
    category: "LEADS",
    categoryLabel: "Marketing & Lead Hub",
    route: "/dashboard/whatsapp-campaign",
    iconName: "whatsapp",
    desc: "WhatsApp broadcast messages, scheme announcements, and chat logs",
    subModulesCount: 1,
    subModules: ["WhatsApp Broadcast Manager"],
  },
  {
    id: "broadcast-hub",
    name: "1-Click Broadcast Hub",
    category: "LEADS",
    categoryLabel: "Marketing & Lead Hub",
    route: "/dashboard/broadcast",
    iconName: "broadcast",
    desc: "Unified announcement center across Email, WhatsApp & SMS in 1 click",
    subModulesCount: 1,
    subModules: ["Omnichannel 1-Click Broadcast"],
  },
  {
    id: "order-stock-tracking",
    name: "Live Order & Stock Tracking",
    category: "LEADS",
    categoryLabel: "Marketing & Lead Hub",
    route: "/dashboard/orders/tracking",
    iconName: "truck",
    desc: "Real-time dispatch tracking, courier milestones, and delivery confirmation",
    subModulesCount: 1,
    subModules: ["Order & Courier Dispatch Tracker"],
  },

  // ── MASTERS & ANALYTICS ──────────────────────────────────────────────────
  {
    id: "master",
    name: "Pharma Master Hub",
    category: "MASTERS",
    categoryLabel: "Masters & Catalogs",
    route: "/dashboard/master",
    iconName: "cogs",
    desc: "Products, HSN codes, divisions, MR masters, ledger masters, and vouchers",
    subModulesCount: 11,
    subModules: [
      "Master Dashboard",
      "Accounting Group",
      "MR Master",
      "Ledger Master",
      "Area Master",
      "Product Master",
      "HSN Master",
      "Division Master",
      "Target & Gift Master",
      "MR Customer Master",
      "Bill Series Master",
    ],
  },
  {
    id: "area",
    name: "Area & Territory Master",
    category: "MASTERS",
    categoryLabel: "Masters & Catalogs",
    route: "/dashboard/area",
    iconName: "map",
    desc: "Geographic territory mapping, state zones, and MR beats",
    subModulesCount: 1,
    subModules: ["Area Directory & Routes"],
  },
  {
    id: "compare",
    name: "Comparison & Radar Analytics",
    category: "MASTERS",
    categoryLabel: "Masters & Catalogs",
    route: "/dashboard/compare",
    iconName: "scale",
    desc: "Year-on-year (YoY) revenue comparison and India area revenue map radar",
    subModulesCount: 3,
    subModules: [
      "Overview Dashboard",
      "Financial Year Wise Compare",
      "FY Area Wise Interactive Map",
    ],
  },
  {
    id: "custom-forms",
    name: "AI Form Studio",
    category: "MASTERS",
    categoryLabel: "Masters & Catalogs",
    route: "/dashboard/custom-forms",
    iconName: "sliders",
    desc: "Custom doctor survey forms, field reports, and dynamic questionnaires",
    subModulesCount: 3,
    subModules: [
      "Saved Forms Hub",
      "Create New Form Builder",
      "Guide & Capabilities",
    ],
  },

  // ── REPORTS, SYNC & SETTINGS ─────────────────────────────────────────────
  {
    id: "reports",
    name: "Reports & GST Compliance",
    category: "REPORTS_ADMIN",
    categoryLabel: "Reports, Sync & Administration",
    route: "/dashboard/reports",
    iconName: "file-text",
    desc: "Tax reports, GST GSTR-1, GSTR-3B registers, and MIS analytics",
    subModulesCount: 2,
    subModules: ["Dash Reports", "GST Reports Hub"],
  },
  {
    id: "migration",
    name: "Desktop Sync (VFP / FoxPro)",
    category: "REPORTS_ADMIN",
    categoryLabel: "Reports, Sync & Administration",
    route: "/dashboard/mabsolcrmsync",
    iconName: "sync",
    desc: "Offline desktop synchronization agent with FoxPro/ERP database",
    subModulesCount: 2,
    subModules: ["Data Sync Dashboard", "Sync Settings & Agent Key"],
  },
  {
    id: "users",
    name: "User & Role Management",
    category: "REPORTS_ADMIN",
    categoryLabel: "Reports, Sync & Administration",
    route: "/dashboard/users",
    iconName: "user-shield",
    desc: "Employee credentials, MR hierarchy assignment, and permission roles",
    subModulesCount: 5,
    subModules: [
      "User Management Directory",
      "Create New User",
      "Permissions Matrix",
      "Roles Definition",
      "Scope & Hierarchy Assignment",
    ],
  },
  {
    id: "settings",
    name: "System Settings & Customization",
    category: "REPORTS_ADMIN",
    categoryLabel: "Reports, Sync & Administration",
    route: "/dashboard/settings",
    iconName: "cog",
    desc: "Company settings, menu customizations, voice AI config & backup/restore",
    subModulesCount: 5,
    subModules: [
      "Company Settings",
      "Menu Adjustments",
      "Voice AI Settings",
      "Notification Gateway",
      "Backup & Restore",
    ],
  },
];

export const ALL_SIDEBAR_MODULE_IDS = SUPER_ADMIN_SIDEBAR_MODULES.map((m) => m.id);

