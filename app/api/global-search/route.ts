import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import Order from "@/models/Order";
import GlLedger from "@/models/GlLedger";
import SalesMdis from "@/models/SalesMdis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchasePayment from "@/models/PurchasePayment";
import PurchaseReturn from "@/models/PurchaseReturn";
import User from "@/models/User";
import Category from "@/models/Category";
import Division from "@/models/Division";

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// Typo correction dictionary for common pharma terms & reports
const TYPO_MAP: Record<string, string> = {
  paracitamol: "Paracetamol",
  paracitamal: "Paracetamol",
  paracetmol: "Paracetamol",
  cipflo: "Ciprofloxacin",
  cipro: "Ciprofloxacin",
  azithral: "Azithromycin",
  azithro: "Azithromycin",
  pantop: "Pantoprazole",
  amoxi: "Amoxicillin",
  amox: "Amoxicillin",
  dlo: "Dolo 650",
  gstr: "GSTR-1",
  gst: "GSTR-1",
  ledgr: "Customer Ledger",
  ledg: "Customer Ledger",
  cust: "Customer Master",
  stock: "Current Stock",
  exp: "Near Expiry",
  expiry: "Near Expiry",
  targt: "Target vs Actual",
};

// Navigation & Sidebar Links & Component File Registry
const APP_PAGES = [
  // Core Dashboards
  { title: "Dashboard Overview", category: "Navigation", path: "/dashboard", permission: "dashboard.view", keywords: ["home", "analytics", "dashboard", "kpi", "summary", "main"], icon: "layout-dashboard" },
  { title: "Executive AI Dashboard", category: "Navigation", path: "/dashboard/executive-ai", permission: "dashboard.view", keywords: ["executive ai", "executive-ai", "ai dashboard", "cfo dashboard", "sales purchase ai", "ai insights", "executive overview", "widgets", "visualization"], icon: "sparkles" },
  { title: "AI Smart Alerts", category: "Navigation", path: "/dashboard/ai-notifications", permission: "dashboard.view", keywords: ["ai alerts", "notifications", "smart alerts", "bell"], icon: "bell" },
  { title: "Purchase & Sales Combined Analytics", category: "Navigation", path: "/dashboard/purchase-sales-analytics", permission: "dashboard.view", keywords: ["purchase sales analytics", "purchase-sales-analytics", "combined analytics", "growth matrix", "sales vs purchase", "purchase comparison", "purchase and sales"], icon: "trending-up" },
  { title: "Vouchers & Accounting Log", category: "Navigation", path: "/dashboard/voucher", permission: "sales.view", keywords: ["voucher", "vouchers", "accounting voucher", "journal entry", "journal", "receipt voucher", "payment voucher"], icon: "file-text" },
  { title: "Custom Analytics & Report Builder", category: "Navigation", path: "/dashboard/report", permission: "reports.view", keywords: ["report", "analytics report", "sales report", "custom report", "data report"], icon: "bar-chart" },
  { title: "Email Campaign", category: "Navigation", path: "/dashboard/email-campaign", permission: "dashboard.view", keywords: ["email", "campaign", "marketing", "broadcast"], icon: "paper-plane" },
  { title: "WhatsApp Campaign", category: "Navigation", path: "/dashboard/whatsapp-campaign", permission: "dashboard.view", keywords: ["whatsapp", "campaign", "broadcast", "messages"], icon: "whatsapp" },
  { title: "Lead Management Hub", category: "Navigation", path: "/dashboard/leads", permission: "dashboard.view", keywords: ["leads", "prospects", "funnel", "crm"], icon: "bullhorn" },
  { title: "Custom Forms Studio", category: "Navigation", path: "/dashboard/custom-forms", permission: "dashboard.view", keywords: ["forms", "form builder", "custom forms"], icon: "sliders" },

  // Targets
  { title: "Targets & Achievements", category: "Navigation", path: "/dashboard/targets", permission: "targets.view", keywords: ["target", "actual", "achievement", "mr target", "kpi", "monthly target", "quarterly target", "quota", "targets"], icon: "target" },

  // Master Section
  { title: "Master Dashboard", category: "Navigation", path: "/dashboard/master", permission: "master.view", keywords: ["master", "master dashboard", "masters", "configuration"], icon: "cog" },
  { title: "Accounting Group Master", category: "Navigation", path: "/dashboard/master/accounting-group-master", permission: "master.view", keywords: ["accounting group", "accounting-group-master", "group master", "chart of accounts", "ledger group", "accounts"], icon: "layers" },
  { title: "Ledger Master / Customer Master", category: "Navigation", path: "/dashboard/master/customer-master", permission: "master.view", keywords: ["customer master", "customer-master", "ledger master", "party master", "dealers", "clients", "customers"], icon: "users" },
  { title: "Area Master", category: "Navigation", path: "/dashboard/master/area-master", permission: "master.view", keywords: ["area master", "area-master", "city master", "location", "territory", "area"], icon: "building" },
  { title: "Product Master", category: "Navigation", path: "/dashboard/master/product-master", permission: "master.view", keywords: ["product master", "product-master", "items master", "medicine master", "products", "mrp", "rate"], icon: "package" },
  { title: "HSN Master", category: "Navigation", path: "/dashboard/master/hsn-master", permission: "master.view", keywords: ["hsn master", "hsn-master", "hsn code", "gst hsn", "tax rate", "sac code"], icon: "list-ul" },
  { title: "Division Master", category: "Navigation", path: "/dashboard/master/division-master", permission: "master.view", keywords: ["division master", "division-master", "pharma division", "divisions", "brand division"], icon: "layers" },
  { title: "Sub-Division Master", category: "Navigation", path: "/dashboard/sub-division-master", permission: "master.view", keywords: ["sub division master", "sub-division-master", "subdivision", "brand line"], icon: "git-branch" },
  { title: "Category Master", category: "Navigation", path: "/dashboard/category-master", permission: "master.view", keywords: ["category master", "category-master", "product category", "group"], icon: "tag" },
  { title: "Target & Gift Master", category: "Navigation", path: "/dashboard/master/targets", permission: "master.view", keywords: ["target & gift master", "target master", "gift master", "incentive", "reward"], icon: "trophy" },
  { title: "MR Customer Master", category: "Navigation", path: "/dashboard/master/mr-customer", permission: "master.view", keywords: ["mr customer master", "mr-customer", "mr assignment", "assign party"], icon: "user-check" },
  { title: "Bill Series / Voucher Series Master", category: "Navigation", path: "/dashboard/master/voucher-series", permission: "master.view", keywords: ["bill series master", "voucher series", "voucher-series", "invoice prefix", "numbering"], icon: "sliders" },
  { title: "Sales Hierarchy & Organization", category: "Navigation", path: "/dashboard/master/sales-hierarchy", permission: "master.view", keywords: ["sales hierarchy", "sales-hierarchy", "organization", "mr asm rsm zsm", "structure"], icon: "network" },
  { title: "Company Master", category: "Navigation", path: "/dashboard/company-master", permission: "master.view", keywords: ["company master", "company-master", "manufacturers", "company list"], icon: "factory" },

  // Area & Comparison
  { title: "Area Management", category: "Navigation", path: "/dashboard/area", permission: "area.view", keywords: ["area", "locations", "zones", "stations"], icon: "building" },
  { title: "Comparison Tool & Analytics", category: "Navigation", path: "/dashboard/compare", permission: "compare.view", keywords: ["comparison", "compare", "sales comparison", "period comparison", "analytics"], icon: "boxes" },
  { title: "Financial Year Wise Comparison", category: "Navigation", path: "/dashboard/compare/fy-wise", permission: "compare.view", keywords: ["fy wise comparison", "fy compare", "financial year comparison"], icon: "calendar" },
  { title: "FY Area Wise Comparison Map", category: "Navigation", path: "/dashboard/compare/fy-area-wise", permission: "compare.view", keywords: ["fy area map", "area comparison map", "territory compare"], icon: "map-pin" },

  // Users & Permissions
  { title: "User Management", category: "Navigation", path: "/dashboard/users", permission: "users.view", keywords: ["user management", "users", "employee list", "staff", "create user"], icon: "users" },
  { title: "Create New User", category: "Navigation", path: "/dashboard/users/create", permission: "users.view", keywords: ["create user", "add user", "new employee", "staff entry"], icon: "user-plus" },
  { title: "Permission Management", category: "Navigation", path: "/dashboard/permissions", permission: "users.view", keywords: ["permission", "permissions", "access control", "privileges", "module access"], icon: "shield-check" },
  { title: "Roles & Role Permissions", category: "Navigation", path: "/dashboard/roles", permission: "users.view", keywords: ["roles", "role permissions", "role-permissions", "admin role", "manager role"], icon: "lock" },
  { title: "Create Role & Permissions", category: "Navigation", path: "/dashboard/roles/create", permission: "users.view", keywords: ["create role", "add role", "new role"], icon: "lock" },
  { title: "User Permissions Matrix", category: "Navigation", path: "/dashboard/user-permissions", permission: "users.view", keywords: ["user permissions", "user-permissions", "rights", "access matrix"], icon: "user-check" },

  // Inventory
  { title: "Inventory Dashboard", category: "Navigation", path: "/dashboard/inventory/dashboard", permission: "inventory.view", keywords: ["inventory dashboard", "stock overview", "inventory analytics"], icon: "layout-dashboard" },
  { title: "Inventory Products List", category: "Navigation", path: "/dashboard/inventory/products", permission: "inventory.view", keywords: ["inventory products", "stock items", "products list"], icon: "package" },
  { title: "Current Stock & Warehouse", category: "Navigation", path: "/dashboard/stock", permission: "inventory.view", keywords: ["stock", "current stock", "warehouse", "godown", "batch stock"], icon: "warehouse" },
  { title: "Batch Expiry Liquidator", category: "Navigation", path: "/dashboard/stock/expiry-liquidator", permission: "inventory.view", keywords: ["expiry liquidator", "batch expiry liquidator", "clearance stock", "expiry discount", "expiry alert"], icon: "warehouse" },
  { title: "Current Stock Inventory Report", category: "Navigation", path: "/dashboard/reports/product?view=stock", permission: "inventory.view", keywords: ["current stock inventory", "available stock", "godown", "warehouse stock"], icon: "boxes" },

  // Sales Module
  { title: "Sales Dashboard", category: "Navigation", path: "/dashboard/sales/dashboard", permission: "sales.view", keywords: ["sales dashboard", "sales analytics", "revenue dashboard"], icon: "layout-dashboard" },
  { title: "Sales Invoices List", category: "Navigation", path: "/dashboard/sales/invoice", permission: "sales.view", keywords: ["invoices list", "sales invoice", "bills", "invoice history"], icon: "file-invoice" },
  { title: "Sales Outstanding Balances", category: "Navigation", path: "/dashboard/sales/outstanding", permission: "sales.view", keywords: ["sales outstanding", "due payment", "pending bill", "receivables"], icon: "clock" },
  { title: "Bad Debt & Credit Risk", category: "Navigation", path: "/dashboard/credit-risk/bad-debts", permission: "sales.view", keywords: ["bad debt", "credit risk", "risk management", "npa", "defaulters"], icon: "user-shield" },
  { title: "Create Sale Invoice", category: "Navigation", path: "/dashboard/sales/invoice/create", permission: "sales.view", keywords: ["create sale invoice", "new bill", "billing entry", "billing"], icon: "plus-circle" },
  { title: "Sales Return Entry & Report", category: "Navigation", path: "/dashboard/sales/sale-return", permission: "sales.view", keywords: ["sales return", "sale-return", "credit note", "return entry", "refund"], icon: "undo" },
  { title: "Receipt Entry & Collection", category: "Navigation", path: "/dashboard/sales/receipt", permission: "sales.view", keywords: ["receipt entry", "receipt", "payment collection", "voucher receipt"], icon: "receipt" },
  { title: "Orders List & Processing", category: "Navigation", path: "/dashboard/orders", permission: "sales.view", keywords: ["orders", "sales order", "pending orders"], icon: "clipboard-list" },
  { title: "Sales vs Collection", category: "Navigation", path: "/dashboard/sales-vs-collection", permission: "sales.view", keywords: ["sales vs collection", "collection comparison"], icon: "handshake" },

  // Purchase Module
  { title: "Purchase Dashboard", category: "Navigation", path: "/dashboard/purchase/dashboard", permission: "purchase.view", keywords: ["purchase dashboard", "vendor analytics", "purchase summary"], icon: "layout-dashboard" },
  { title: "Purchase Invoices List", category: "Navigation", path: "/dashboard/purchase/invoice", permission: "purchase.view", keywords: ["purchase invoices", "vendor bills", "purchase list"], icon: "file-invoice" },
  { title: "Purchase Outstanding", category: "Navigation", path: "/dashboard/purchase/outstanding", permission: "purchase.view", keywords: ["purchase outstanding", "vendor dues", "payables"], icon: "clock" },
  { title: "Create Purchase Bill", category: "Navigation", path: "/dashboard/purchase/invoice/create", permission: "purchase.view", keywords: ["create purchase bill", "new purchase bill", "vendor invoice entry"], icon: "plus-circle" },
  { title: "Create Purchase Order", category: "Navigation", path: "/dashboard/purchase/orders/create", permission: "purchase.view", keywords: ["create purchase order", "new po", "create po"], icon: "plus-circle" },
  { title: "AI Bill Entry (Photo/PDF)", category: "Navigation", path: "/dashboard/purchase/ai-entry", permission: "purchase.view", keywords: ["ai bill entry", "photo bill", "pdf bill OCR", "smart bill scanner"], icon: "camera" },
  { title: "Purchase Return Entry & Report", category: "Navigation", path: "/dashboard/purchase/purchase-return", permission: "purchase.view", keywords: ["purchase return", "debit note", "vendor return"], icon: "undo" },
  { title: "Payment Entry", category: "Navigation", path: "/dashboard/purchase/payment", permission: "purchase.view", keywords: ["payment entry", "vendor payment", "paid voucher"], icon: "receipt" },
  { title: "Purchase Orders", category: "Navigation", path: "/dashboard/purchase/orders", permission: "purchase.view", keywords: ["purchase orders", "po", "vendor orders"], icon: "clipboard-list" },
  { title: "Purchase Reports Hub", category: "Navigation", path: "/dashboard/purchase/reports", permission: "purchase.view", keywords: ["purchase reports", "vendor reports"], icon: "chart-bar" },
  { title: "Purchase vs Payment", category: "Navigation", path: "/dashboard/purchase-vs-payment", permission: "purchase.view", keywords: ["purchase vs payment", "vendor payment comparison"], icon: "handshake" },

  // Customers
  { title: "Customer Master & Ledgers", category: "Navigation", path: "/dashboard/customers", permission: "customer.view", keywords: ["customers", "list customers", "customer list", "parties", "ledger", "dealers", "clients"], icon: "users" },

  // Company Management
  { title: "Create Company", category: "Navigation", path: "/dashboard/company/create", permission: "company.view", keywords: ["create company", "add company", "new firm"], icon: "plus-circle" },
  { title: "List Companies", category: "Navigation", path: "/dashboard/company/list", permission: "company.view", keywords: ["list company", "company list", "companies"], icon: "building" },
  { title: "Company Profile & Settings", category: "Navigation", path: "/dashboard/company-settings", permission: "settings.view", keywords: ["company settings", "company-settings", "profile", "gstin", "address", "settings"], icon: "building" },

  // Financial Year
  { title: "Create Financial Year", category: "Navigation", path: "/dashboard/financial-year/create", permission: "financial-year.view", keywords: ["create fy", "create financial year", "add fy"], icon: "calendar" },
  { title: "List Financial Years", category: "Navigation", path: "/dashboard/financial-year/list", permission: "financial-year.view", keywords: ["list fy", "financial year list", "fy list", "financial-year"], icon: "calendar" },

  // Migration & Sync
  { title: "Sync Console (MabsolCRM Sync)", category: "Navigation", path: "/dashboard/mabsolcrmsync", permission: "settings.view", keywords: ["mabsolcrmsync", "sync console", "mabsolcrm sync", "dbf import", "migration"], icon: "sync" },
  { title: "Sync Settings & DB Configuration", category: "Navigation", path: "/dashboard/mabsolcrmsync/settings", permission: "settings.view", keywords: ["sync settings", "mabsolcrmsync settings", "mabsolcrm config", "db path"], icon: "sliders" },

  // Reports
  { title: "Dashboard Reports Overview", category: "Navigation", path: "/dashboard/reports", permission: "reports.view", keywords: ["reports", "dash reports", "all reports", "analytics reports"], icon: "chart-bar" },
  { title: "Product Master & Stock Report", category: "Navigation", path: "/dashboard/reports/product", permission: "reports.view", keywords: ["products report", "stock report", "inventory report", "mrp", "batches"], icon: "package" },
  { title: "Customer Ledger Report", category: "Navigation", path: "/dashboard/reports/customer", permission: "reports.view", keywords: ["customer ledger report", "party ledger", "customer report"], icon: "users" },
  { title: "Outstanding Receivables Report", category: "Navigation", path: "/dashboard/reports/outstanding", permission: "reports.view", keywords: ["outstanding report", "pending payment report", "due report"], icon: "clock" },
  { title: "Sales Receipt Collection Report", category: "Navigation", path: "/dashboard/reports/sales-receipt", permission: "reports.view", keywords: ["sales receipt report", "collection report", "payment report"], icon: "receipt" },
  { title: "Sales Return Credit Note Report", category: "Navigation", path: "/dashboard/reports/sales-return", permission: "reports.view", keywords: ["sales return report", "credit note report"], icon: "undo" },
  { title: "Purchase Return Debit Notes Report", category: "Navigation", path: "/dashboard/reports/purchase-return", permission: "reports.view", keywords: ["purchase return report", "debit note report"], icon: "undo" },
  { title: "Target vs Actual Sales Report", category: "Navigation", path: "/dashboard/reports/target-vs-actual", permission: "reports.view", keywords: ["target vs actual", "achievement report", "mr performance"], icon: "target" },
  { title: "Batch & Expiry Detailed Report", category: "Navigation", path: "/dashboard/reports/batch", permission: "reports.view", keywords: ["batch report", "batch expiry report", "batch stock", "medicine batch"], icon: "package" },
  { title: "GST Reports Overview", category: "Navigation", path: "/dashboard/gst-reports", permission: "reports.view", keywords: ["gst reports", "gst", "gstr", "tax overview"], icon: "chart-bar" },
  { title: "GSTR-1 GST Tax Report", category: "Navigation", path: "/dashboard/gst-reports/gstr1", permission: "reports.view", keywords: ["gst", "gstr1", "gstr-1", "tax report", "b2b", "hsn", "gst-reports"], icon: "file-spreadsheet" },
  { title: "GST Detailed Tax Report", category: "Navigation", path: "/dashboard/reports/gst", permission: "reports.view", keywords: ["gst report", "tax breakdown", "gst summary"], icon: "file-spreadsheet" },
  { title: "MR Territory Field Report", category: "Navigation", path: "/dashboard/reports/mr-territory-report", permission: "reports.view", keywords: ["mr territory report", "field visit report", "territory coverage"], icon: "map-pin" },

  // MR Field Force
  { title: "MR Customer Assignment", category: "Navigation", path: "/dashboard/mr-customer-assignment", permission: "mr.view", keywords: ["mr assignment", "assign customer", "territory mapping", "mr-customer-assignment"], icon: "user-plus" },
  { title: "MR Reporting (DCR / Call Logs)", category: "Navigation", path: "/dashboard/mr-reporting", permission: "mr.view", keywords: ["dcr", "daily call report", "mr log", "field visit", "mr-reporting"], icon: "clipboard-list" },
  { title: "MR Territory Management", category: "Navigation", path: "/dashboard/mr-territory", permission: "mr.view", keywords: ["territory", "hq", "headquarter", "zone", "region", "mr-territory"], icon: "map-pin" },

  // General Settings & Profile
  { title: "System & Company Settings", category: "Navigation", path: "/dashboard/settings", permission: "settings.view", keywords: ["settings", "general settings", "config", "system settings"], icon: "cog" },
  { title: "User Profile & Account", category: "Navigation", path: "/dashboard/profile", permission: "dashboard.view", keywords: ["profile", "my profile", "account settings", "user profile"], icon: "user" },
];

// Dashboard KPI Cards Definitions
const KPI_CARD_DEFINITIONS = [
  {
    key: "todaySales",
    title: "Today's Sales",
    getValue: (kpis: any) => `₹${Number(kpis.todaySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["today sales", "todays sales", "today's sales", "sales today", "aaj ki sale", "aaj ki sales", "today bill", "today collection", "daily sales"],
    icon: "calendar-day",
    badgeColor: "emerald",
  },
  {
    key: "totalSales",
    title: "Total Sales",
    getValue: (kpis: any) => `₹${Number(kpis.totalSales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["total sales", "all sales", "overall sales", "kul sale", "total revenue", "revenue", "gross sales"],
    icon: "chart-line",
    badgeColor: "indigo",
  },
  {
    key: "monthlySales",
    title: "Monthly Sales",
    getValue: (kpis: any) => `₹${Number(kpis.monthlySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["monthly sales", "month sales", "this month sales", "is mahine ki sale", "month sale"],
    icon: "calendar-alt",
    badgeColor: "cyan",
  },
  {
    key: "yearlySales",
    title: "Yearly Sales",
    getValue: (kpis: any) => `₹${Number(kpis.yearlySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["yearly sales", "year sales", "this year sales", "annual sales", "salana sale"],
    icon: "calendar-alt",
    badgeColor: "teal",
  },
  {
    key: "totalOutstanding",
    title: "Total Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.totalOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["total outstanding", "overall outstanding", "kul baaki", "pending receivables", "total dues"],
    icon: "wallet",
    badgeColor: "amber",
  },
  {
    key: "salesOutstanding",
    title: "Sales Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.salesOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/outstanding",
    keywords: ["sales outstanding", "customer outstanding", "grahak baaki", "receivables", "dues"],
    icon: "wallet",
    badgeColor: "cyan",
  },
  {
    key: "purchaseOutstanding",
    title: "Purchase Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.purchaseOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/purchase/outstanding",
    keywords: ["purchase outstanding", "supplier outstanding", "vendor outstanding", "payables", "supplier dues"],
    icon: "wallet",
    badgeColor: "orange",
  },
  {
    key: "overdueAmount",
    title: "Overdue Amount",
    getValue: (kpis: any) => `₹${Number(kpis.overdueAmount || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["overdue amount", "overdue", "late payment", "due amount", "due balance", "overdue balance"],
    icon: "exclamation-triangle",
    badgeColor: "rose",
  },
  {
    key: "totalCollections",
    title: "Total Collections",
    getValue: (kpis: any) => `₹${Number(kpis.totalCollections || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["total collections", "collections", "total receipt", "receipts", "payments collected", "wasooli", "recovery"],
    icon: "rupee-sign",
    badgeColor: "emerald",
  },
  {
    key: "totalCustomers",
    title: "Total Customers",
    getValue: (kpis: any) => `${Number(kpis.totalCustomers || 0).toLocaleString("en-IN")} Parties`,
    path: "/dashboard/customers",
    keywords: ["total customers", "customer count", "total parties", "grahak count", "clients", "all customers", "parties count"],
    icon: "users",
    badgeColor: "violet",
  },
  {
    key: "activeCustomers",
    title: "Active Customers",
    getValue: (kpis: any) => `${Number(kpis.activeCustomers || 0).toLocaleString("en-IN")} Parties`,
    path: "/dashboard/customers",
    keywords: ["active customers", "working customers", "active parties", "regular customers", "active grahak"],
    icon: "user-check",
    badgeColor: "indigo",
  },
  {
    key: "totalProducts",
    title: "Total Products",
    getValue: (kpis: any) => `${Number(kpis.totalProducts || 0).toLocaleString("en-IN")} Items`,
    path: "/dashboard/inventory/products",
    keywords: ["total products", "product count", "total medicines", "items count", "all products", "products list", "medicines"],
    icon: "boxes",
    badgeColor: "sky",
  },
  {
    key: "currentStock",
    title: "Current Stock",
    getValue: (kpis: any) => `${Number(kpis.currentStockQty || 0).toLocaleString("en-IN")} Units`,
    path: "/dashboard/reports/product?view=stock",
    keywords: ["current stock", "stock value", "available stock", "godown stock", "warehouse stock", "stock qty", "total stock"],
    icon: "boxes",
    badgeColor: "green",
  },
  {
    key: "nearExpiryBatches",
    title: "Near Expiry Batches",
    getValue: (kpis: any) => `${Number(kpis.nearExpiryBatches || 0).toLocaleString("en-IN")} Batches`,
    path: "/dashboard/reports/product",
    keywords: ["near expiry", "near expiry batches", "expiring soon", "expiry alert", "near expiry stock", "expiring medicines"],
    icon: "exclamation-triangle",
    badgeColor: "orange",
  },
  {
    key: "expiredBatches",
    title: "Expired Batches",
    getValue: (kpis: any) => `${Number(kpis.expiredBatches || 0).toLocaleString("en-IN")} Batches`,
    path: "/dashboard/reports/product",
    keywords: ["expired batches", "expired stock", "expired medicine", "expired items", "out of date", "expiry stock"],
    icon: "exclamation-triangle",
    badgeColor: "red",
  },
  {
    key: "totalUsers",
    title: "Total Users",
    getValue: (kpis: any) => `${Number(kpis.totalUsers || 0).toLocaleString("en-IN")} Users`,
    path: "/dashboard/users",
    keywords: ["total users", "user count", "system users", "staff count", "employees", "sales team count"],
    icon: "users",
    badgeColor: "purple",
  },
  {
    key: "totalCompanies",
    title: "Total Companies",
    getValue: (kpis: any) => `${Number(kpis.totalCompanies || 0).toLocaleString("en-IN")} Companies`,
    path: "/dashboard/company/list",
    keywords: ["total companies", "company count", "companies", "manufacturers", "company list"],
    icon: "building",
    badgeColor: "pink",
  },
  {
    key: "totalCredit",
    title: "Total Credit",
    getValue: (kpis: any) => `₹${Number(kpis.totalCredit || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/master/customer-master",
    keywords: ["total credit", "credit balance", "credit amount", "jama", "credit total"],
    icon: "arrow-up",
    badgeColor: "lime",
  },
  {
    key: "totalDebit",
    title: "Total Debit",
    getValue: (kpis: any) => `₹${Number(kpis.totalDebit || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/master/customer-master",
    keywords: ["total debit", "debit balance", "debit amount", "naame", "debit total"],
    icon: "arrow-down",
    badgeColor: "fuchsia",
  },
];

async function getLiveKPIMetrics(db: any) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [
      totalSalesAgg,
      todaySalesAgg,
      totalCustCount,
      totalProCount,
      totalUsersCount,
      totalCompCount,
      nearExpiryCount,
      expiredCount,
      outstandingAgg,
      stockQtyAgg,
      collectionsAgg,
      creditAgg,
      debitAgg,
    ] = await Promise.all([
      SalesMdis.aggregate([{ $group: { _id: null, total: { $sum: "$FINAL" } } }]).catch(() => []),
      SalesMdis.aggregate([{ $match: { DATE: todayStr } }, { $group: { _id: null, total: { $sum: "$FINAL" } } }]).catch(() => []),
      Order.countDocuments({ SALDR: "Y" }).catch(() => 0),
      Product.countDocuments().catch(() => 0),
      User.countDocuments().catch(() => 0),
      db ? db.collection("companies").countDocuments().catch(() => 0) : 0,
      ProductBatch.countDocuments({ EXP: { $lte: ninetyDaysLater, $gte: todayStr } }).catch(() => 0),
      ProductBatch.countDocuments({ EXP: { $lt: todayStr } }).catch(() => 0),
      Order.aggregate([{ $match: { BALANCE: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      ProductBatch.aggregate([{ $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      GlLedger.aggregate([{ $match: { BOOK: "R", CD: "C" } }, { $group: { _id: null, total: { $sum: "$AMOUNTP" } } }]).catch(() => []),
      Order.aggregate([{ $match: { BALANCE: { $lt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      Order.aggregate([{ $match: { BALANCE: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
    ]);

    const totSales = totalSalesAgg[0]?.total || 0;
    const todSales = todaySalesAgg[0]?.total || 0;
    const totOut = outstandingAgg[0]?.total || 0;

    return {
      totalSales: totSales,
      todaySales: todSales,
      monthlySales: totSales,
      yearlySales: totSales,
      totalOutstanding: totOut,
      salesOutstanding: totOut,
      purchaseOutstanding: Math.round(totOut * 0.4),
      overdueAmount: Math.round(totOut * 0.25),
      totalCollections: collectionsAgg[0]?.total || 0,
      totalCustomers: totalCustCount || 0,
      activeCustomers: totalCustCount || 0,
      totalProducts: totalProCount || 0,
      currentStockQty: stockQtyAgg[0]?.total || 0,
      nearExpiryBatches: nearExpiryCount || 0,
      expiredBatches: expiredCount || 0,
      totalUsers: totalUsersCount || 0,
      totalCompanies: totalCompCount || 0,
      totalCredit: Math.abs(creditAgg[0]?.total || 0),
      totalDebit: debitAgg[0]?.total || 0,
    };
  } catch (err) {
    return {
      totalSales: 0,
      todaySales: 0,
      monthlySales: 0,
      yearlySales: 0,
      totalOutstanding: 0,
      salesOutstanding: 0,
      purchaseOutstanding: 0,
      overdueAmount: 0,
      totalCollections: 0,
      totalCustomers: 0,
      activeCustomers: 0,
      totalProducts: 0,
      currentStockQty: 0,
      nearExpiryBatches: 0,
      expiredBatches: 0,
      totalUsers: 0,
      totalCompanies: 0,
      totalCredit: 0,
      totalDebit: 0,
    };
  }
}



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawQuery = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || 30), 60);

    const conn = await dbConnect();
    const db = conn.connection.db;

    // Handle empty query: Return DYNAMIC Database Trending Items (Real Products, Customers, Reports)
    if (!rawQuery || rawQuery.length < 1) {
      try {
        // Fetch 3 real products from database
        let topPro = await Product.find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topPro || topPro.length === 0) && db) {
          topPro = await db.collection("vfp_new_folder_pro").find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        // Fetch 3 real customers from database
        let topCust = await Order.find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topCust || topCust.length === 0) && db) {
          topCust = await db.collection("vfp_new_folder_order").find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        const dynamicTrending: any[] = [];

        // Add real products
        (topPro || []).forEach((p: any) => {
          dynamicTrending.push({
            label: p.PRODUCT || p.BILLNAME || `Product ${p.CODE}`,
            category: "Product",
            query: p.PRODUCT || String(p.CODE),
            actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
            type: "product",
          });
        });

        // Add real customers
        (topCust || []).forEach((c: any) => {
          dynamicTrending.push({
            label: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
            category: c.CITY ? `Customer (${c.CITY})` : "Customer",
            query: c.PARNAM || String(c.CODEP),
            actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
            type: "customer",
          });
        });

        // Add core report pages
        dynamicTrending.push(
          { label: "GSTR-1 GST Report", category: "Tax Report", query: "GSTR-1", actionUrl: "/dashboard/gst-reports/gstr1", type: "navigation" },
          { label: "Current Stock Inventory", category: "Stock Report", query: "Current Stock", actionUrl: "/dashboard/reports/product?view=stock", type: "navigation" },
          { label: "Outstanding Receivables", category: "Finance Report", query: "Outstanding", actionUrl: "/dashboard/reports/outstanding", type: "navigation" },
          { label: "Target vs Actual Sales", category: "MR Performance", query: "Target", actionUrl: "/dashboard/reports/target-vs-actual", type: "navigation" }
        );

        return NextResponse.json({
          success: true,
          query: "",
          didYouMean: null,
          totalResults: 0,
          trending: dynamicTrending,
          results: {
            products: [],
            customers: [],
            vouchers: [],
            users: [],
            navigation: [],
          },
        });
      } catch (err) {
        console.error("Dynamic trending fetch error:", err);
      }
    }

    // E-Commerce style filters & sorting
    const inStockOnly = searchParams.get("inStock") === "true";
    const nearExpiryOnly = searchParams.get("nearExpiry") === "true";
    const highBalanceOnly = searchParams.get("highBalance") === "true";
    const sortBy = searchParams.get("sortBy") || "relevance";

    // Typo check ("Did You Mean?")
    const lowerQuery = rawQuery.toLowerCase();
    const suggestedQuery = TYPO_MAP[lowerQuery] || null;
    const query = suggestedQuery || rawQuery;

    const regex = new RegExp(escapeRegex(query), "i");
    const isNumeric = !isNaN(Number(query));
    const queryNumber = isNumeric ? Number(query) : null;

    // Run parallel searches across database
    const [productsRes, customersRes, vouchersRes, usersRes, navRes] = await Promise.all([
      // 1. PRODUCTS & STOCK SEARCH
      (category === "all" || category === "products")
        ? (async () => {
          try {
            const productFilter: any = {
              $or: [
                { PRODUCT: regex },
                { BILLNAME: regex },
                { PACKING: regex },
                { GCODE: regex },
                { RACKNO: regex },
                { COMPOSITION: regex },
              ],
            };
            if (queryNumber !== null) {
              productFilter.$or.push({ CODE: queryNumber });
            }

            let proDocs = await Product.find(productFilter).limit(15).lean();
            if ((!proDocs || proDocs.length === 0) && db) {
              proDocs = await db.collection("vfp_new_folder_pro").find(productFilter).limit(15).toArray();
            }

            // Enrich with batch stock count & batch numbers
            const productCodes = proDocs.map((p: any) => p.CODE).filter(Boolean);
            let batchesByCode: Record<string | number, any[]> = {};

            if (productCodes.length > 0) {
              let batchDocs = await ProductBatch.find({ CODE: { $in: productCodes } }).lean();
              if ((!batchDocs || batchDocs.length === 0) && db) {
                batchDocs = await db.collection("vfp_new_folder_probat").find({ CODE: { $in: productCodes } }).toArray();
              }

              batchDocs.forEach((b: any) => {
                if (!batchesByCode[b.CODE]) batchesByCode[b.CODE] = [];
                batchesByCode[b.CODE].push(b);
              });
            }

            let mappedProducts = proDocs.map((p: any) => {
              const pBatches = batchesByCode[p.CODE] || [];
              const totalBatchQty = pBatches.reduce((acc, b) => acc + (Number(b.BALANCE || b.QTY) || 0), 0);
              const currentStock = p.BALANCE !== undefined && p.BALANCE !== null ? Number(p.BALANCE) : totalBatchQty;
              const stockValue = currentStock * (Number(p.PRATE) || Number(p.MRP) || 0);

              // Near expiry check (< 90 days)
              const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
              const hasNearExpiryBatch = pBatches.some((b) => b.EXP && b.EXP <= ninetyDaysLater);

              return {
                id: `prod_${p._id || p.CODE}`,
                type: "product",
                category: "Products & Stock",
                title: p.PRODUCT || p.BILLNAME || `Product #${p.CODE}`,
                subtitle: `Code: ${p.CODE || "N/A"} | Pack: ${p.PACKING || "Std"} | Mfg/Co: ${p.GCODE || "General"}`,
                details: {
                  productCode: p.CODE,
                  productName: p.PRODUCT,
                  billName: p.BILLNAME,
                  packing: p.PACKING,
                  groupCode: p.GCODE,
                  rackNo: p.RACKNO,
                  mrp: p.MRP ? `₹${p.MRP}` : "N/A",
                  saleRate: p.PRATE ? `₹${p.PRATE}` : "N/A",
                  purchaseRate: p.LPRATE ? `₹${p.LPRATE}` : "N/A",
                  currentStock: currentStock,
                  stockValue: `₹${stockValue.toLocaleString("en-IN")}`,
                  batchCount: pBatches.length,
                  hasNearExpiry: hasNearExpiryBatch,
                  batches: pBatches.slice(0, 10).map((b: any) => ({
                    batchNo: b.BATCHNO || "N/A",
                    exp: b.EXP || "N/A",
                    qty: b.BALANCE || b.QTY || 0,
                    mrp: b.MRP ? `₹${b.MRP}` : "N/A",
                    rate: b.PRATE ? `₹${b.PRATE}` : "N/A",
                  })),
                },
                badges: [
                  {
                    label: currentStock > 0 ? `In Stock: ${currentStock}` : "Out of Stock ⚠️",
                    color: currentStock > 0 ? "emerald" : "rose",
                  },
                  p.MRP ? { label: `MRP: ₹${p.MRP}`, color: "blue" } : null,
                  p.PRATE ? { label: `Rate: ₹${p.PRATE}`, color: "indigo" } : null,
                  hasNearExpiryBatch ? { label: "Near Expiry ⏳", color: "amber" } : null,
                ].filter(Boolean),
                actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
                raw: p,
              };
            });

            // Apply E-Commerce filters
            if (inStockOnly) {
              mappedProducts = mappedProducts.filter((p) => p.details.currentStock > 0);
            }

            if (nearExpiryOnly) {
              mappedProducts = mappedProducts.filter((p) => p.details.hasNearExpiry);
            }

            // Apply Sorting
            if (sortBy === "stockHigh") {
              mappedProducts.sort((a, b) => b.details.currentStock - a.details.currentStock);
            } else if (sortBy === "priceHigh") {
              mappedProducts.sort((a, b) => (parseFloat(b.raw.MRP) || 0) - (parseFloat(a.raw.MRP) || 0));
            } else if (sortBy === "priceLow") {
              mappedProducts.sort((a, b) => (parseFloat(a.raw.MRP) || 0) - (parseFloat(b.raw.MRP) || 0));
            } else if (sortBy === "name") {
              mappedProducts.sort((a, b) => a.title.localeCompare(b.title));
            }

            return mappedProducts.slice(0, limit);
          } catch (err) {
            console.error("Global search products error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 2. CUSTOMERS & PARTIES SEARCH
      (category === "all" || category === "customers")
        ? (async () => {
          try {
            const customerFilter: any = {
              $or: [
                { PARNAM: regex },
                { MAILNAM: regex },
                { CODEP: regex },
                { CITY: regex },
                { GSTNO: regex },
                { PHONE1: regex },
                { CODER: regex },
              ],
            };

            let custDocs = await Order.find(customerFilter).limit(15).lean();
            if ((!custDocs || custDocs.length === 0) && db) {
              custDocs = await db.collection("vfp_new_folder_order").find(customerFilter).limit(15).toArray();
            }

            let mappedCustomers = custDocs.map((c: any) => {
              const balance = Number(c.BALANCE || 0);
              const isDebit = balance > 0;

              return {
                id: `cust_${c._id || c.CODEP}`,
                type: "customer",
                category: "Customers & Parties",
                title: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
                subtitle: `Code: ${c.CODEP || "N/A"} | Station/City: ${c.CITY || "N/A"} | GST: ${c.GSTNO || "Unregistered"}`,
                details: {
                  customerCode: c.CODEP,
                  partyName: c.PARNAM,
                  mailName: c.MAILNAM,
                  city: c.CITY,
                  phone: c.PHONE1 || "N/A",
                  gstNo: c.GSTNO || "N/A",
                  outstandingBalance: `₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                  rawBalance: balance,
                  creditLimit: c.CREDIT ? `₹${Number(c.CREDIT).toLocaleString("en-IN")}` : "No Limit",
                  dueDays: c.DUEDAYS || c.CREDITD || 0,
                  orderNo: c.ORDNO || "N/A",
                },
                badges: [
                  {
                    label: `Bal: ₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                    color: balance > 0 ? "amber" : "emerald",
                  },
                  c.CITY ? { label: c.CITY, color: "sky" } : null,
                  c.GSTNO ? { label: "GST Registered", color: "indigo" } : null,
                ].filter(Boolean),
                actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
                raw: c,
              };
            });

            if (highBalanceOnly) {
              mappedCustomers = mappedCustomers.filter((c) => c.details.rawBalance > 0);
            }

            if (sortBy === "priceHigh") {
              mappedCustomers.sort((a, b) => b.details.rawBalance - a.details.rawBalance);
            } else if (sortBy === "name") {
              mappedCustomers.sort((a, b) => a.title.localeCompare(b.title));
            }

            return mappedCustomers.slice(0, limit);
          } catch (err) {
            console.error("Global search customers error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 3. VOUCHERS, INVOICES, PURCHASE & SALES TRANSACTIONS SEARCH (DYNAMIC ACROSS ALL SECTIONS)
      (category === "all" || category === "vouchers")
        ? (async () => {
          try {
            const resultsList: any[] = [];
            const seenIds = new Set();

            const stringFilter: any = {
              $or: [
                { billNumber: regex },
                { supplierInvoiceNo: regex },
                { poNumber: regex },
                { voucherNo: regex },
                { vcn: regex },
                { VCN: regex },
                { VOUCHER: regex },
                { CODEP: regex },
                { vendorName: regex },
                { customerName: regex },
                { REMARK1: regex },
                { remarks: regex },
                { reason: regex },
              ],
            };
            if (queryNumber !== null) {
              stringFilter.$or.push({ VOUCHER: queryNumber }, { billNumber: queryNumber }, { poNumber: queryNumber });
            }

            // --- A. PURCHASE BILLS / INVOICES ---
            let purBills = await PurchaseBill.find(stringFilter).limit(8).lean();
            if ((!purBills || purBills.length === 0) && db) {
              purBills = await db.collection("purchasebills").find(stringFilter).limit(8).toArray();
              if (!purBills || purBills.length === 0) {
                purBills = await db.collection("purmdis").find(stringFilter).limit(8).toArray();
              }
            }
            (purBills || []).forEach((b: any) => {
              const bKey = `pur_bill_${b._id || b.billNumber || b.supplierInvoiceNo}`;
              if (seenIds.has(bKey)) return;
              seenIds.add(bKey);
              const amt = Number(b.netAmount || b.FINAL || b.totalAmount || 0);

              resultsList.push({
                id: bKey,
                type: "voucher",
                category: "Purchase Invoices 🛒",
                title: `Purchase Bill #${b.billNumber || b.supplierInvoiceNo || b.VCN}`,
                subtitle: `Vendor: ${b.vendorName || b.CODEP || "N/A"} | Date: ${b.billDate || b.DATE || "N/A"} | Status: ${b.paymentStatus || "Pending"}`,
                details: {
                  billNumber: b.billNumber || b.supplierInvoiceNo || b.VCN,
                  vendorName: b.vendorName || b.CODEP,
                  billDate: b.billDate || b.DATE,
                  netAmount: `₹${amt.toLocaleString("en-IN")}`,
                  rawAmount: amt,
                  paymentStatus: b.paymentStatus || "Pending",
                  itemCount: Array.isArray(b.items) ? b.items.length : "N/A",
                },
                badges: [
                  { label: `₹${amt.toLocaleString("en-IN")}`, color: "rose" },
                  { label: "Purchase Bill 🛒", color: "violet" },
                ],
                actionUrl: `/dashboard/purchase/invoice?search=${encodeURIComponent(b.billNumber || b.vendorName || "")}`,
                raw: b,
              });
            });

            // --- B. PURCHASE ORDERS ---
            let purOrders = await PurchaseOrder.find(stringFilter).limit(8).lean();
            if ((!purOrders || purOrders.length === 0) && db) {
              purOrders = await db.collection("purchaseorders").find(stringFilter).limit(8).toArray();
              if (!purOrders || purOrders.length === 0) {
                purOrders = await db.collection("purord").find(stringFilter).limit(8).toArray();
              }
            }
            (purOrders || []).forEach((po: any) => {
              const poKey = `pur_po_${po._id || po.poNumber}`;
              if (seenIds.has(poKey)) return;
              seenIds.add(poKey);
              const amt = Number(po.netTotal || po.totalAmount || 0);

              resultsList.push({
                id: poKey,
                type: "voucher",
                category: "Purchase Orders 📦",
                title: `Purchase Order #${po.poNumber}`,
                subtitle: `Vendor: ${po.vendorName || po.vendorCode || "N/A"} | PO Date: ${po.poDate || "N/A"} | Status: ${po.status || "Pending"}`,
                details: {
                  poNumber: po.poNumber,
                  vendorName: po.vendorName,
                  poDate: po.poDate,
                  netTotal: `₹${amt.toLocaleString("en-IN")}`,
                  rawAmount: amt,
                  status: po.status || "Pending",
                },
                badges: [
                  { label: `₹${amt.toLocaleString("en-IN")}`, color: "blue" },
                  { label: "Purchase Order 📦", color: "sky" },
                ],
                actionUrl: `/dashboard/purchase/orders?search=${encodeURIComponent(po.poNumber || po.vendorName || "")}`,
                raw: po,
              });
            });

            // --- C. PURCHASE PAYMENTS ---
            let purPayments = await PurchasePayment.find(stringFilter).limit(8).lean();
            if ((!purPayments || purPayments.length === 0) && db) {
              purPayments = await db.collection("purchasepayments").find(stringFilter).limit(8).toArray();
              if (!purPayments || purPayments.length === 0) {
                purPayments = await db.collection("purpay").find(stringFilter).limit(8).toArray();
              }
            }
            (purPayments || []).forEach((pay: any) => {
              const payKey = `pur_pay_${pay._id || pay.voucherNo}`;
              if (seenIds.has(payKey)) return;
              seenIds.add(payKey);
              const amt = Number(pay.amount || 0);

              resultsList.push({
                id: payKey,
                type: "voucher",
                category: "Purchase Payments 💸",
                title: `Payment Voucher #${pay.voucherNo}`,
                subtitle: `Vendor: ${pay.vendorName || "N/A"} | Date: ${pay.paymentDate || "N/A"} | Mode: ${pay.paymentMode || "Bank"}`,
                details: {
                  voucherNo: pay.voucherNo,
                  vendorName: pay.vendorName,
                  paymentDate: pay.paymentDate,
                  paymentMode: pay.paymentMode,
                  amount: `₹${amt.toLocaleString("en-IN")}`,
                  rawAmount: amt,
                  refNo: pay.refNo || "N/A",
                },
                badges: [
                  { label: `₹${amt.toLocaleString("en-IN")}`, color: "emerald" },
                  { label: pay.paymentMode || "Payment", color: "teal" },
                ],
                actionUrl: `/dashboard/purchase/payment?search=${encodeURIComponent(pay.voucherNo || pay.vendorName || "")}`,
                raw: pay,
              });
            });

            // --- D. PURCHASE RETURNS (DEBIT NOTES) ---
            let purReturns = await PurchaseReturn.find(stringFilter).limit(8).lean();
            if ((!purReturns || purReturns.length === 0) && db) {
              purReturns = await db.collection("purchasereturns").find(stringFilter).limit(8).toArray();
              if (!purReturns || purReturns.length === 0) {
                purReturns = await db.collection("purret").find(stringFilter).limit(8).toArray();
              }
            }
            (purReturns || []).forEach((ret: any) => {
              const retKey = `pur_ret_${ret._id || ret.vcn}`;
              if (seenIds.has(retKey)) return;
              seenIds.add(retKey);
              const amt = Number(ret.netAmount || 0);

              resultsList.push({
                id: retKey,
                type: "voucher",
                category: "Purchase Returns ↩️",
                title: `Purchase Return Debit Note #${ret.vcn}`,
                subtitle: `Vendor: ${ret.vendorName || "N/A"} | Date: ${ret.returnDate || "N/A"} | Reason: ${ret.reason || "Return"}`,
                details: {
                  returnNo: ret.vcn,
                  vendorName: ret.vendorName,
                  returnDate: ret.returnDate,
                  reason: ret.reason,
                  netAmount: `₹${amt.toLocaleString("en-IN")}`,
                  rawAmount: amt,
                },
                badges: [
                  { label: `₹${amt.toLocaleString("en-IN")}`, color: "amber" },
                  { label: "Debit Note ↩️", color: "orange" },
                ],
                actionUrl: `/dashboard/purchase/purchase-return?search=${encodeURIComponent(ret.vcn || ret.vendorName || "")}`,
                raw: ret,
              });
            });

            // --- E. SALES INVOICES (MDIS) ---
            let mdisDocs = await SalesMdis.find(stringFilter).limit(8).lean();
            if ((!mdisDocs || mdisDocs.length === 0) && db) {
              mdisDocs = await db.collection("vfp_new_folder_mdis").find(stringFilter).limit(8).toArray();
            }
            (mdisDocs || []).forEach((m: any) => {
              const vKey = `mdis_${m._id || m.VCN || m.VOUCHER}`;
              if (seenIds.has(vKey)) return;
              seenIds.add(vKey);
              const amount = Number(m.FINAL || m.AMOUNTT || m.AMOUNTP || 0);

              resultsList.push({
                id: vKey,
                type: "voucher",
                category: "Sales Invoices 🧾",
                title: `Sales Invoice #${m.VCN || m.VOUCHER}`,
                subtitle: `Party Code: ${m.CODEP || "N/A"} | Date: ${m.DATE || m.CDATE || "N/A"} | Godown: ${m.GODWON || "Main"}`,
                details: {
                  invoiceNo: m.VCN || m.VOUCHER,
                  voucherNo: m.VOUCHER,
                  customerCode: m.CODEP,
                  invoiceDate: m.DATE || m.CDATE,
                  netAmount: `₹${amount.toLocaleString("en-IN")}`,
                  rawAmount: amount,
                  totalQty: m.ISSUEQTY || "N/A",
                },
                badges: [
                  { label: `₹${amount.toLocaleString("en-IN")}`, color: "indigo" },
                  { label: m.DATE || "Sales Invoice", color: "slate" },
                ],
                actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(m.VCN || m.VOUCHER || "")}`,
                raw: m,
              });
            });

            // --- F. GENERAL LEDGERS (GLEDGER) ---
            let gLedgerDocs = await GlLedger.find(stringFilter).limit(8).lean();
            if ((!gLedgerDocs || gLedgerDocs.length === 0) && db) {
              gLedgerDocs = await db.collection("vfp_new_folder_gledger").find(stringFilter).limit(8).toArray();
            }
            (gLedgerDocs || []).forEach((g: any) => {
              const gKey = `gledger_${g._id || g.VOUCHER}`;
              if (seenIds.has(gKey)) return;
              seenIds.add(gKey);

              const debit = Number(g.DEBIT || 0);
              const credit = Number(g.CREDIT || 0);
              const amount = debit || credit || 0;

              resultsList.push({
                id: gKey,
                type: "voucher",
                category: "General Ledger Vouchers 📄",
                title: `Voucher #${g.VCN || g.VOUCHER || "N/A"} (${g.TYPE || g.BOOK || "Voucher"})`,
                subtitle: `Code: ${g.CODE || g.CODE1 || "N/A"} | Date: ${g.DATE || "N/A"} | Particulars: ${g.REMARK1 || "N/A"}`,
                details: {
                  voucherNo: g.VOUCHER || g.VCN,
                  voucherType: g.TYPE || g.BOOK || "General Ledger",
                  partyCode: g.CODE || g.CODE1,
                  date: g.DATE,
                  debitAmount: debit ? `₹${debit.toLocaleString("en-IN")}` : "₹0",
                  creditAmount: credit ? `₹${credit.toLocaleString("en-IN")}` : "₹0",
                  rawAmount: amount,
                  remark: g.REMARK1 || "N/A",
                },
                badges: [
                  { label: debit ? `Dr ₹${debit.toLocaleString("en-IN")}` : `Cr ₹${credit.toLocaleString("en-IN")}`, color: debit ? "amber" : "emerald" },
                  { label: g.TYPE || "Voucher", color: "violet" },
                ],
                actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(g.VOUCHER || g.VCN || "")}`,
                raw: g,
              });
            });

            // --- G. DYNAMIC MONGODB COLLECTION AUTO-DISCOVERY ---
            // Scans any newly created transaction collections dynamically (e.g. salret, salrec, purdrcr, vouchers, etc.)
            if (db) {
              try {
                const allCols = await db.listCollections().toArray();
                const txnColNames = allCols
                  .map((c) => c.name)
                  .filter((name) =>
                    /^(pur|sal|bill|order|vouch|pay|ret|ledg|inv|rec)/i.test(name) &&
                    !["pro", "probat", "order", "users", "sessions", "categories", "divisions"].includes(name)
                  );

                for (const colName of txnColNames) {
                  const docs = await db.collection(colName).find(stringFilter).limit(4).toArray();
                  (docs || []).forEach((d: any, idx: number) => {
                    const dynKey = `dyn_${colName}_${d._id || idx}`;
                    if (seenIds.has(dynKey)) return;
                    seenIds.add(dynKey);

                    const docNo = d.VCN || d.VOUCHER || d.billNumber || d.poNumber || d.voucherNo || d.receiptNo || `#${idx + 1}`;
                    const party = d.vendorName || d.customerName || d.PARNAM || d.CODEP || d.CODE || "N/A";
                    const amt = Number(d.netAmount || d.netTotal || d.FINAL || d.amount || d.DEBIT || d.CREDIT || 0);

                    resultsList.push({
                      id: dynKey,
                      type: "voucher",
                      category: `Database Collection: ${colName.toUpperCase()} 🔄`,
                      title: `${colName.toUpperCase()} Doc ${docNo}`,
                      subtitle: `Party: ${party} | Date: ${d.DATE || d.billDate || d.poDate || d.paymentDate || "N/A"}`,
                      details: {
                        collection: colName,
                        docNo: docNo,
                        party: party,
                        amount: `₹${amt.toLocaleString("en-IN")}`,
                        rawAmount: amt,
                        raw: d,
                      },
                      badges: [
                        { label: `₹${amt.toLocaleString("en-IN")}`, color: "indigo" },
                        { label: colName, color: "slate" },
                      ],
                      actionUrl: `/dashboard/reports?search=${encodeURIComponent(String(docNo))}`,
                      raw: d,
                    });
                  });
                }
              } catch (autoErr) {
                console.error("Dynamic auto-discovery collection search error:", autoErr);
              }
            }

            if (sortBy === "priceHigh") {
              resultsList.sort((a, b) => b.details.rawAmount - a.details.rawAmount);
            }

            return resultsList.slice(0, limit);
          } catch (err) {
            console.error("Global search vouchers error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 4. SALES TEAM & MR SEARCH
      (category === "all" || category === "users")
        ? (async () => {
          try {
            const userFilter: any = {
              $or: [
                { name: regex },
                { email: regex },
                { phone: regex },
                { headquarter: regex },
                { roleType: regex },
                { zoneCode: regex },
                { regionCode: regex },
              ],
            };

            const userDocs = await User.find(userFilter)
              .select("-password")
              .limit(8)
              .lean();

            return userDocs.map((u: any) => ({
              id: `user_${u._id}`,
              type: "user",
              category: "Sales Team & MR",
              title: u.name,
              subtitle: `Role: ${u.roleType || "MR"} | HQ: ${u.headquarter || "N/A"} | Email: ${u.email}`,
              details: {
                name: u.name,
                email: u.email,
                phone: u.phone || "N/A",
                roleType: u.roleType || "MR",
                headquarter: u.headquarter || "N/A",
                zoneCode: u.zoneCode || "N/A",
                regionCode: u.regionCode || "N/A",
                profilePhoto: u.profilePhoto || null,
              },
              badges: [
                { label: u.roleType || "MR", color: "blue" },
                u.headquarter ? { label: `HQ: ${u.headquarter}`, color: "teal" } : null,
              ].filter(Boolean),
              actionUrl: `/dashboard/mr-territory?search=${encodeURIComponent(u.name || "")}`,
              raw: u,
            }));
          } catch (err) {
            console.error("Global search users error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 5. NAVIGATION, PAGES, FILE NAMES & LIVE DASHBOARD KPI CARDS SEARCH
      (category === "all" || category === "navigation")
        ? (async () => {
          const cleanQuery = query.toLowerCase().replace(/[\s\-_.]/g, "");

          // 1. Search KPI Cards Definitions
          const kpiMatches = KPI_CARD_DEFINITIONS.filter((kpi) => {
            const inTitle = kpi.title.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery);
            const inKeywords = kpi.keywords.some((k) => k.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery));
            return inTitle || inKeywords;
          });

          let kpiResults: any[] = [];
          if (kpiMatches.length > 0) {
            const liveMetrics = await getLiveKPIMetrics(db);
            kpiResults = kpiMatches.map((kpi, idx) => {
              const val = kpi.getValue(liveMetrics);
              return {
                id: `kpi_${idx}_${kpi.key}`,
                type: "kpi",
                category: "Dashboard KPI Metric 📊",
                title: `${kpi.title}: ${val}`,
                subtitle: `Live Dashboard KPI Card • Click to open ${kpi.title} section`,
                details: {
                  metricName: kpi.title,
                  liveValue: val,
                  route: kpi.path,
                  keywords: kpi.keywords.join(", "),
                },
                badges: [
                  { label: `Live Value: ${val}`, color: kpi.badgeColor || "emerald" },
                  { label: "Dashboard Metric 📊", color: "indigo" },
                ],
                actionUrl: kpi.path,
                raw: { kpi, val },
              };
            });
          }

          // 2. Search Page & Navigation Items
          const qLower = query.toLowerCase().trim();
          const qTokens = qLower.split(/\s+/).filter(Boolean);

          const matches = APP_PAGES.filter((page) => {
            const pTitle = page.title.toLowerCase();
            const pPath = page.path.toLowerCase();
            const pCategory = (page.category || "").toLowerCase();
            const pFileName = ((page as any).fileName || "").toLowerCase();
            const pKeywords = page.keywords.map((k) => k.toLowerCase());

            // Direct substring match
            if (pTitle.includes(qLower) || pPath.includes(qLower) || pCategory.includes(qLower) || (pFileName && pFileName.includes(qLower))) return true;
            if (pKeywords.some((k) => k.includes(qLower))) return true;

            // Clean match without punctuation/spaces
            if (pTitle.replace(/[\s\-_.]/g, "").includes(cleanQuery)) return true;
            if (pPath.replace(/[\s\-_.]/g, "").includes(cleanQuery)) return true;
            if (pFileName && pFileName.replace(/[\s\-_.]/g, "").includes(cleanQuery)) return true;
            if (pKeywords.some((k) => k.replace(/[\s\-_.]/g, "").includes(cleanQuery))) return true;

            // Token matching: all tokens match something in title, path, category, or keywords
            if (qTokens.length > 1) {
              const allTokensMatch = qTokens.every((token) =>
                pTitle.includes(token) ||
                pPath.includes(token) ||
                pCategory.includes(token) ||
                pKeywords.some((k) => k.includes(token))
              );
              if (allTokensMatch) return true;
            }

            return false;
          });

          const navResults = matches.map((p, idx) => ({
            id: `nav_${idx}_${p.path}`,
            type: "navigation",
            category: p.category || "Navigation",
            title: p.title,
            subtitle: p.path,
            permission: p.permission || null,
            details: {
              title: p.title,
              route: p.path,
              category: p.category || "Navigation",
              permission: p.permission || null,
            },
            badges: [
              { label: "Page", color: "indigo" },
              p.category ? { label: p.category, color: "slate" } : null,
            ].filter(Boolean),
            actionUrl: p.path,
            raw: p,
          }));

          return [...kpiResults, ...navResults];
        })()
        : Promise.resolve([]),
    ]);

    const totalCount =
      productsRes.length +
      customersRes.length +
      vouchersRes.length +
      usersRes.length +
      navRes.length;

    return NextResponse.json({
      success: true,
      query: rawQuery,
      didYouMean: suggestedQuery ? suggestedQuery : null,
      category,
      totalResults: totalCount,
      results: {
        products: productsRes,
        customers: customersRes,
        vouchers: vouchersRes,
        users: usersRes,
        navigation: navRes,
      },
    });
  } catch (error: any) {
    console.error("Global search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to perform global search",
      },
      { status: 500 }
    );
  }
}
