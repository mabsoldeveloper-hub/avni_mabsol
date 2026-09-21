import React from "react";
import {
  FaTachometerAlt,
  FaUsers,
  FaUserShield,
  FaUserTag,
  FaCog,
  FaBoxOpen,
  FaShoppingCart,
  FaFileInvoice,
  FaClipboardList,
  FaChartBar,
  FaBuilding,
  FaPlusCircle,
  FaListUl,
  FaCalendarAlt,
  FaExchangeAlt,
  FaSyncAlt,
  FaSlidersH,
  FaWarehouse,
  FaLayerGroup,
  FaBullseye,
  FaGift,
  FaTrophy,
  FaUserCheck,
  FaFileInvoiceDollar,
  FaUndo,
  FaReceipt,
  FaShoppingBag,
  FaCamera,
  FaBalanceScale,
  FaMapMarkerAlt,
  FaBrain,
  FaBook,
  FaPaperPlane,
  FaBullhorn,
  FaFunnelDollar,
  FaWhatsapp,
  FaStar,
  FaFolder,
  FaTable,
  FaTruck,
  FaMoneyBillWave,
  FaDatabase,
  FaCogs,
  FaKey,
  FaBell,
  FaGlobe,
  FaStore,
  FaTags,
  FaCalculator,
  FaHandshake,
  FaHeartbeat,
  FaShieldAlt,
  FaCreditCard,
  FaSearch,
} from "react-icons/fa";

export type ColorKey =
  | "indigo"
  | "violet"
  | "sky"
  | "blue"
  | "emerald"
  | "amber"
  | "teal"
  | "rose"
  | "orange"
  | "cyan";

export interface SubMenuItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;
  permission?: string;
  isVisible: boolean;
  order: number;
}

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  color: ColorKey;
  href?: string;
  isGroup: boolean;
  permission?: string;
  isVisible: boolean;
  order: number;
  subItems?: SubMenuItemConfig[];
}

export const COLOR_OPTIONS: { key: ColorKey; label: string; bg: string; text: string; hex: string }[] = [
  { key: "indigo", label: "Indigo", bg: "bg-indigo-600", text: "text-indigo-600", hex: "#4f46e5" },
  { key: "violet", label: "Violet", bg: "bg-violet-600", text: "text-violet-600", hex: "#7c3aed" },
  { key: "sky", label: "Sky Blue", bg: "bg-sky-600", text: "text-sky-600", hex: "#0284c7" },
  { key: "blue", label: "Blue", bg: "bg-blue-600", text: "text-blue-600", hex: "#2563eb" },
  { key: "emerald", label: "Emerald Green", bg: "bg-emerald-600", text: "text-emerald-600", hex: "#059669" },
  { key: "amber", label: "Amber Orange", bg: "bg-amber-600", text: "text-amber-600", hex: "#d97706" },
  { key: "teal", label: "Teal", bg: "bg-teal-600", text: "text-teal-600", hex: "#0d9488" },
  { key: "rose", label: "Rose Red", bg: "bg-rose-600", text: "text-rose-600", hex: "#e11d48" },
  { key: "orange", label: "Deep Orange", bg: "bg-orange-600", text: "text-orange-600", hex: "#ea580c" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-600", text: "text-cyan-600", hex: "#0891b2" },
];

export const ICON_CATALOG: { name: string; label: string; icon: React.ReactNode }[] = [
  { name: "FaTachometerAlt", label: "Dashboard / Speed", icon: <FaTachometerAlt /> },
  { name: "FaBrain", label: "AI / Brain", icon: <FaBrain /> },
  { name: "FaBullseye", label: "Target / Goal", icon: <FaBullseye /> },
  { name: "FaChartBar", label: "Analytics / Chart", icon: <FaChartBar /> },
  { name: "FaPaperPlane", label: "Email / Send", icon: <FaPaperPlane /> },
  { name: "FaWhatsapp", label: "WhatsApp", icon: <FaWhatsapp /> },
  { name: "FaBullhorn", label: "Leads / Campaign", icon: <FaBullhorn /> },
  { name: "FaSlidersH", label: "Form / Sliders", icon: <FaSlidersH /> },
  { name: "FaCog", label: "Settings / Cog", icon: <FaCog /> },
  { name: "FaCogs", label: "Preferences / Cogs", icon: <FaCogs /> },
  { name: "FaBuilding", label: "Company / Building", icon: <FaBuilding /> },
  { name: "FaBalanceScale", label: "Compare / Balance", icon: <FaBalanceScale /> },
  { name: "FaUsers", label: "Users / Customers", icon: <FaUsers /> },
  { name: "FaUserShield", label: "Security / Admin", icon: <FaUserShield /> },
  { name: "FaUserTag", label: "Roles / Tag", icon: <FaUserTag /> },
  { name: "FaUserCheck", label: "MR / Verified User", icon: <FaUserCheck /> },
  { name: "FaBoxOpen", label: "Products / Box", icon: <FaBoxOpen /> },
  { name: "FaShoppingCart", label: "Sales / Cart", icon: <FaShoppingCart /> },
  { name: "FaShoppingBag", label: "Purchase / Bag", icon: <FaShoppingBag /> },
  { name: "FaWarehouse", label: "Stock / Warehouse", icon: <FaWarehouse /> },
  { name: "FaFileInvoice", label: "Invoice / Bill", icon: <FaFileInvoice /> },
  { name: "FaFileInvoiceDollar", label: "Outstanding / Finance", icon: <FaFileInvoiceDollar /> },
  { name: "FaReceipt", label: "Receipt / Payment", icon: <FaReceipt /> },
  { name: "FaUndo", label: "Return / Undo", icon: <FaUndo /> },
  { name: "FaClipboardList", label: "Orders / List", icon: <FaClipboardList /> },
  { name: "FaCamera", label: "AI Camera / OCR", icon: <FaCamera /> },
  { name: "FaCalendarAlt", label: "Financial Year / Date", icon: <FaCalendarAlt /> },
  { name: "FaExchangeAlt", label: "Migration / Sync", icon: <FaExchangeAlt /> },
  { name: "FaSyncAlt", label: "Refresh / Sync ERP", icon: <FaSyncAlt /> },
  { name: "FaLayerGroup", label: "Group / Hierarchy", icon: <FaLayerGroup /> },
  { name: "FaMapMarkerAlt", label: "Location / Map", icon: <FaMapMarkerAlt /> },
  { name: "FaBook", label: "Documentation / Guide", icon: <FaBook /> },
  { name: "FaListUl", label: "List / Items", icon: <FaListUl /> },
  { name: "FaPlusCircle", label: "Create / Add", icon: <FaPlusCircle /> },
  { name: "FaGift", label: "Gifts / Rewards", icon: <FaGift /> },
  { name: "FaTrophy", label: "Achievements", icon: <FaTrophy /> },
  { name: "FaFunnelDollar", label: "Sales Funnel", icon: <FaFunnelDollar /> },
  { name: "FaStar", label: "Starred / Favorites", icon: <FaStar /> },
  { name: "FaFolder", label: "Folder / Category", icon: <FaFolder /> },
  { name: "FaTable", label: "Table / Data", icon: <FaTable /> },
  { name: "FaTruck", label: "Dispatch / Logistics", icon: <FaTruck /> },
  { name: "FaMoneyBillWave", label: "Cash / Cashflow", icon: <FaMoneyBillWave /> },
  { name: "FaDatabase", label: "Database / Master", icon: <FaDatabase /> },
  { name: "FaKey", label: "Permissions / Key", icon: <FaKey /> },
  { name: "FaBell", label: "Alerts / Notifications", icon: <FaBell /> },
  { name: "FaGlobe", label: "Online / Web", icon: <FaGlobe /> },
  { name: "FaStore", label: "Outlet / Store", icon: <FaStore /> },
  { name: "FaTags", label: "Tags / Discounts", icon: <FaTags /> },
  { name: "FaCalculator", label: "Accounting / Calculator", icon: <FaCalculator /> },
  { name: "FaHandshake", label: "Deals / CRM", icon: <FaHandshake /> },
  { name: "FaHeartbeat", label: "Health / Analytics", icon: <FaHeartbeat /> },
  { name: "FaShieldAlt", label: "Compliance / Shield", icon: <FaShieldAlt /> },
  { name: "FaCreditCard", label: "Banking / Cards", icon: <FaCreditCard /> },
];

export function renderMenuIcon(iconName: string): React.ReactNode {
  switch (iconName) {
    case "FaTachometerAlt":
      return <FaTachometerAlt />;
    case "FaBrain":
      return <FaBrain />;
    case "FaBullseye":
      return <FaBullseye />;
    case "FaChartBar":
      return <FaChartBar />;
    case "FaPaperPlane":
      return <FaPaperPlane />;
    case "FaWhatsapp":
      return <FaWhatsapp />;
    case "FaBullhorn":
      return <FaBullhorn />;
    case "FaSlidersH":
      return <FaSlidersH />;
    case "FaCog":
      return <FaCog />;
    case "FaCogs":
      return <FaCogs />;
    case "FaBuilding":
      return <FaBuilding />;
    case "FaBalanceScale":
      return <FaBalanceScale />;
    case "FaUsers":
      return <FaUsers />;
    case "FaUserShield":
      return <FaUserShield />;
    case "FaUserTag":
      return <FaUserTag />;
    case "FaUserCheck":
      return <FaUserCheck />;
    case "FaBoxOpen":
      return <FaBoxOpen />;
    case "FaShoppingCart":
      return <FaShoppingCart />;
    case "FaShoppingBag":
      return <FaShoppingBag />;
    case "FaWarehouse":
      return <FaWarehouse />;
    case "FaFileInvoice":
      return <FaFileInvoice />;
    case "FaFileInvoiceDollar":
      return <FaFileInvoiceDollar />;
    case "FaReceipt":
      return <FaReceipt />;
    case "FaUndo":
      return <FaUndo />;
    case "FaClipboardList":
      return <FaClipboardList />;
    case "FaCamera":
      return <FaCamera />;
    case "FaCalendarAlt":
      return <FaCalendarAlt />;
    case "FaExchangeAlt":
      return <FaExchangeAlt />;
    case "FaSyncAlt":
      return <FaSyncAlt />;
    case "FaLayerGroup":
      return <FaLayerGroup />;
    case "FaMapMarkerAlt":
      return <FaMapMarkerAlt />;
    case "FaBook":
      return <FaBook />;
    case "FaListUl":
      return <FaListUl />;
    case "FaPlusCircle":
      return <FaPlusCircle />;
    case "FaGift":
      return <FaGift />;
    case "FaTrophy":
      return <FaTrophy />;
    case "FaFunnelDollar":
      return <FaFunnelDollar />;
    case "FaStar":
      return <FaStar />;
    case "FaFolder":
      return <FaFolder />;
    case "FaTable":
      return <FaTable />;
    case "FaTruck":
      return <FaTruck />;
    case "FaMoneyBillWave":
      return <FaMoneyBillWave />;
    case "FaDatabase":
      return <FaDatabase />;
    case "FaKey":
      return <FaKey />;
    case "FaBell":
      return <FaBell />;
    case "FaGlobe":
      return <FaGlobe />;
    case "FaStore":
      return <FaStore />;
    case "FaTags":
      return <FaTags />;
    case "FaCalculator":
      return <FaCalculator />;
    case "FaHandshake":
      return <FaHandshake />;
    case "FaHeartbeat":
      return <FaHeartbeat />;
    case "FaShieldAlt":
      return <FaShieldAlt />;
    case "FaCreditCard":
      return <FaCreditCard />;
    case "FaSearch":
      return <FaSearch />;
    default:
      return <FaLayerGroup />;
  }
}

export const DEFAULT_MENU_ITEMS: MenuItemConfig[] = [
  {
    id: "standard-dashboard",
    label: "Standard Dashboard",
    icon: "FaTachometerAlt",
    color: "indigo",
    href: "/dashboard",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 0,
  },
  {
    id: "global-search",
    label: "Global Search & Voice AI",
    icon: "FaSearch",
    color: "cyan",
    href: "/dashboard/search",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 1,
  },
  {
    id: "executive-ai",
    label: "Executive AI Dashboard",
    icon: "FaBrain",
    color: "violet",
    href: "/dashboard/executive-ai",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 2,
  },
  {
    id: "ai-notifications",
    label: "AI Smart Alerts",
    icon: "FaBell",
    color: "amber",
    href: "/dashboard/ai-notifications",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 2,
  },
  {
    id: "targets",
    label: "Targets & Achievements",
    icon: "FaBullseye",
    color: "rose",
    href: "/dashboard/targets",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 3,
  },
  {
    id: "purchase-sales-analytics",
    label: "Purchase & Sale Analytics",
    icon: "FaChartBar",
    color: "sky",
    href: "/dashboard/purchase-sales-analytics",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 3,
  },

  {
    id: "email-campaign",
    label: "Email Campaign",
    icon: "FaPaperPlane",
    color: "amber",
    href: "/dashboard/email-campaign",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 4,
  },
  {
    id: "whatsapp-campaign",
    label: "WhatsApp Campaign",
    icon: "FaWhatsapp",
    color: "emerald",
    href: "/dashboard/whatsapp-campaign",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 5,
  },
  {
    id: "broadcast-hub",
    label: "1-Click Broadcast Hub",
    icon: "FaBullhorn",
    color: "violet",
    href: "/dashboard/broadcast",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 6,
  },
  {
    id: "order-stock-tracking",
    label: "Live Order & Stock Tracking",
    icon: "FaTruck",
    color: "sky",
    href: "/dashboard/orders/tracking",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 7,
  },
  {
    id: "leads",
    label: "Lead Management Hub",
    icon: "FaBullhorn",
    color: "rose",
    href: "/dashboard/leads",
    isGroup: false,
    permission: "dashboard.view",
    isVisible: true,
    order: 6,
  },
  {
    id: "custom-forms",
    label: "Form Studio (Custom)",
    icon: "FaSlidersH",
    color: "violet",
    isGroup: true,
    permission: "dashboard.view",
    isVisible: true,
    order: 7,
    subItems: [
      {
        id: "custom-forms-hub",
        label: "Saved Forms Hub",
        href: "/dashboard/custom-forms",
        icon: "FaListUl",
        permission: "dashboard.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "custom-forms-builder",
        label: "Create New Form",
        href: "/dashboard/custom-forms/builder",
        icon: "FaPlusCircle",
        permission: "dashboard.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "custom-forms-guide",
        label: "Guide & Capabilities",
        href: "/dashboard/custom-forms/guide",
        icon: "FaBook",
        permission: "dashboard.view",
        isVisible: true,
        order: 2,
      },
    ],
  },
  {
    id: "master",
    label: "Master",
    icon: "FaCog",
    color: "cyan",
    isGroup: true,
    permission: "master.view",
    isVisible: true,
    order: 8,
    subItems: [
      {
        id: "master-dashboard",
        label: "Dashboard",
        href: "/dashboard/master",
        icon: "FaTachometerAlt",
        permission: "master.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "master-accounting-group",
        label: "Accounting Group",
        href: "/dashboard/master/accounting-group-master",
        icon: "FaLayerGroup",
        permission: "master.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "accounting-group",
        label: "MR MASTER",
        href: "/dashboard/master/mr-creation",
        icon: "FaLayerGroup",
        permission: "master.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "master-customer",
        label: "Ledger Master",
        href: "/dashboard/master/customer-master",
        icon: "FaUsers",
        permission: "master.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "master-area",
        label: "Area Master",
        href: "/dashboard/master/area-master",
        icon: "FaBuilding",
        permission: "master.view",
        isVisible: true,
        order: 3,
      },
      {
        id: "master-product",
        label: "Product Master",
        href: "/dashboard/master/product-master",
        icon: "FaBoxOpen",
        permission: "master.view",
        isVisible: true,
        order: 4,
      },
      {
        id: "master-hsn",
        label: "HSN Master",
        href: "/dashboard/master/hsn-master",
        icon: "FaListUl",
        permission: "master.view",
        isVisible: true,
        order: 5,
      },
      {
        id: "master-division",
        label: "Division Master",
        href: "/dashboard/master/division-master",
        icon: "FaListUl",
        permission: "master.view",
        isVisible: true,
        order: 6,
      },
      {
        id: "master-targets",
        label: "Target & Gift Master",
        href: "/dashboard/master/targets",
        icon: "FaBullseye",
        permission: "master.view",
        isVisible: true,
        order: 7,
      },
      {
        id: "master-mr-customer",
        label: "MR Customer Master",
        href: "/dashboard/master/mr-customer",
        icon: "FaUserCheck",
        permission: "master.view",
        isVisible: true,
        order: 8,
      },
      {
        id: "master-voucher-series",
        label: "Bill Series Master",
        href: "/dashboard/master/voucher-series",
        icon: "FaSlidersH",
        permission: "master.view",
        isVisible: true,
        order: 9,
      },
    ],
  },
  {
    id: "area",
    label: "Area",
    icon: "FaBuilding",
    color: "emerald",
    href: "/dashboard/area",
    isGroup: false,
    permission: "area.view",
    isVisible: true,
    order: 9,
  },
  {
    id: "compare",
    label: "Comparison",
    icon: "FaBalanceScale",
    color: "orange",
    isGroup: true,
    permission: "compare.view",
    isVisible: true,
    order: 10,
    subItems: [
      {
        id: "compare-overview",
        label: "Overview Dashboard",
        href: "/dashboard/compare",
        icon: "FaChartBar",
        permission: "compare.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "compare-fy-wise",
        label: "Financial Year Wise",
        href: "/dashboard/compare/fy-wise",
        icon: "FaCalendarAlt",
        permission: "compare.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "compare-fy-area-wise",
        label: "FY Area Wise Map",
        href: "/dashboard/compare/fy-area-wise",
        icon: "FaMapMarkerAlt",
        permission: "compare.view",
        isVisible: true,
        order: 2,
      },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: "FaUsers",
    color: "violet",
    isGroup: true,
    permission: "users.view",
    isVisible: true,
    order: 11,
    subItems: [
      {
        id: "users-management",
        label: "User Management",
        href: "/dashboard/users",
        icon: "FaUsers",
        permission: "users.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "users-permissions",
        label: "Permission",
        href: "/dashboard/permissions",
        icon: "FaUserShield",
        permission: "users.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "users-roles",
        label: "Roles",
        href: "/dashboard/roles",
        icon: "FaUserTag",
        permission: "users.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "users-assignment",
        label: "Scope & Hierarchy Assignment",
        href: "/dashboard/users/assignment",
        icon: "FaSitemap",
        permission: "users.view",
        isVisible: true,
        order: 3,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "FaBoxOpen",
    color: "sky",
    isGroup: true,
    permission: "inventory.view",
    isVisible: true,
    order: 12,
    subItems: [
      {
        id: "inventory-dashboard",
        label: "Inventory Dashboard",
        href: "/dashboard/inventory/dashboard",
        icon: "FaTachometerAlt",
        permission: "inventory.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "inventory-products",
        label: "Products",
        href: "/dashboard/inventory/products",
        icon: "FaBoxOpen",
        permission: "inventory.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "inventory-stock",
        label: "Stock Overview",
        href: "/dashboard/stock",
        icon: "FaWarehouse",
        permission: "inventory.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "inventory-opening-stock",
        label: "Opening Stock",
        href: "/dashboard/stock/opening",
        icon: "FaLayerGroup",
        permission: "inventory.view",
        isVisible: true,
        order: 3,
      },
      {
        id: "inventory-add-stock",
        label: "Add Stock",
        href: "/dashboard/stock/add",
        icon: "FaPlusCircle",
        permission: "inventory.view",
        isVisible: true,
        order: 4,
      },
      {
        id: "inventory-stock-ledger",
        label: "Stock Ledger movement",
        href: "/dashboard/stock/ledger",
        icon: "FaClipboardList",
        permission: "inventory.view",
        isVisible: true,
        order: 5,
      },
      {
        id: "inventory-expiry-liquidator",
        label: "Batch Expiry Liquidator",
        href: "/dashboard/stock/expiry-liquidator",
        icon: "FaWarehouse",
        permission: "inventory.view",
        isVisible: true,
        order: 3,
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: "FaShoppingCart",
    color: "blue",
    isGroup: true,
    permission: "sales.view",
    isVisible: true,
    order: 13,
    subItems: [
      {
        id: "sales-dashboard",
        label: "Sales Dashboard",
        href: "/dashboard/sales/dashboard",
        icon: "FaTachometerAlt",
        permission: "sales.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "sales-invoice-list",
        label: "Invoices List",
        href: "/dashboard/sales/invoice",
        icon: "FaFileInvoice",
        permission: "sales.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "sales-outstanding",
        label: "Sales Outstanding",
        href: "/dashboard/sales/outstanding",
        icon: "FaFileInvoiceDollar",
        permission: "sales.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "sales-bad-debts",
        label: "Bad Debt & Credit Risk",
        href: "/dashboard/credit-risk/bad-debts",
        icon: "FaUserShield",
        permission: "sales.view",
        isVisible: true,
        order: 3,
      },
      {
        id: "sales-invoice-create",
        label: "Create Sale Invoice",
        href: "/dashboard/sales/invoice/create",
        icon: "FaPlusCircle",
        permission: "sales.view",
        isVisible: true,
        order: 4,
      },
      {
        id: "sales-return",
        label: "Sales Return",
        href: "/dashboard/sales/sale-return",
        icon: "FaUndo",
        permission: "sales.view",
        isVisible: true,
        order: 5,
      },
      {
        id: "sales-receipt",
        label: "Receipt Entry",
        href: "/dashboard/sales/receipt",
        icon: "FaReceipt",
        permission: "sales.view",
        isVisible: true,
        order: 6,
      },
      {
        id: "sales-orders",
        label: "Orders",
        href: "/dashboard/orders",
        icon: "FaClipboardList",
        permission: "sales.view",
        isVisible: true,
        order: 7,
      },
      {
        id: "sales-vs-collection-sub",
        label: "Sales vs Collection",
        href: "/dashboard/sales-vs-collection",
        icon: "FaHandshake",
        permission: "sales.view",
        isVisible: true,
        order: 8,
      },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: "FaShoppingBag",
    color: "amber",
    isGroup: true,
    permission: "purchase.view",
    isVisible: true,
    order: 14,
    subItems: [
      {
        id: "purchase-dashboard",
        label: "Purchase Dashboard",
        href: "/dashboard/purchase/dashboard",
        icon: "FaTachometerAlt",
        permission: "purchase.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "purchase-invoice-list",
        label: "Purchase Invoices List",
        href: "/dashboard/purchase/invoice",
        icon: "FaFileInvoice",
        permission: "purchase.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "purchase-outstanding",
        label: "Purchase Outstanding",
        href: "/dashboard/purchase/outstanding",
        icon: "FaFileInvoiceDollar",
        permission: "purchase.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "purchase-bill-create",
        label: "Create Purchase Bill",
        href: "/dashboard/purchase/invoice/create",
        icon: "FaPlusCircle",
        permission: "purchase.view",
        isVisible: true,
        order: 3,
      },
      {
        id: "purchase-ai-entry",
        label: "AI Bill Entry (Photo/PDF)",
        href: "/dashboard/purchase/ai-entry",
        icon: "FaCamera",
        permission: "purchase.view",
        isVisible: true,
        order: 4,
      },
      {
        id: "purchase-return",
        label: "Purchase Return",
        href: "/dashboard/purchase/purchase-return",
        icon: "FaUndo",
        permission: "purchase.view",
        isVisible: true,
        order: 5,
      },
      {
        id: "purchase-payment",
        label: "Payment Entry",
        href: "/dashboard/purchase/payment",
        icon: "FaReceipt",
        permission: "purchase.view",
        isVisible: true,
        order: 6,
      },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        href: "/dashboard/purchase/orders",
        icon: "FaClipboardList",
        permission: "purchase.view",
        isVisible: true,
        order: 7,
      },
      {
        id: "purchase-vs-payment",
        label: "Purchase vs Payment",
        href: "/dashboard/purchase-vs-payment",
        icon: "FaHandshake",
        permission: "purchase.view",
        isVisible: true,
        order: 8,
      },
    ],
  },
  {
    id: "customer",
    label: "Customer",
    icon: "FaBuilding",
    color: "emerald",
    isGroup: true,
    permission: "customer.view",
    isVisible: true,
    order: 15,
    subItems: [
      {
        id: "customer-list",
        label: "List Customers",
        href: "/dashboard/customers",
        icon: "FaListUl",
        permission: "customer.view",
        isVisible: true,
        order: 0,
      },

      {
        id: "modify-customer",
        label: "Modify Customers",
        href: "/dashboard/customers/modify",
        icon: "FaListUl",
        permission: "customer.view",
        isVisible: true,
        order: 0,
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    icon: "FaBuilding",
    color: "amber",
    isGroup: true,
    permission: "company.view",
    isVisible: true,
    order: 16,
    subItems: [
      {
        id: "company-create",
        label: "Create Company",
        href: "/dashboard/company/create",
        icon: "FaPlusCircle",
        permission: "company.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "company-list",
        label: "List Company",
        href: "/dashboard/company/list",
        icon: "FaListUl",
        permission: "company.view",
        isVisible: true,
        order: 1,
      },
    ],
  },
  {
    id: "financial-year",
    label: "F.Year",
    icon: "FaCalendarAlt",
    color: "teal",
    isGroup: true,
    permission: "financialyear.view",
    isVisible: true,
    order: 17,
    subItems: [
      {
        id: "financial-year-create",
        label: "Create FY",
        href: "/dashboard/financial-year/create",
        icon: "FaPlusCircle",
        permission: "financialyear.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "financial-year-list",
        label: "List FY",
        href: "/dashboard/financial-year/list",
        icon: "FaListUl",
        permission: "financialyear.view",
        isVisible: true,
        order: 1,
      },
    ],
  },
  {
    id: "migration",
    label: "Migration",
    icon: "FaExchangeAlt",
    color: "rose",
    isGroup: true,
    permission: "vfp.view",
    isVisible: true,
    order: 18,
    subItems: [
      {
        id: "migration-busy",
        label: "Sync Busy ERP",
        href: "/dashboard/mabsolcrmsync",
        icon: "FaSyncAlt",
        permission: "vfp.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "migration-tally",
        label: "Sync Tally ERP",
        href: "/dashboard/mabsolcrmsync",
        icon: "FaSyncAlt",
        permission: "vfp.view",
        isVisible: true,
        order: 1,
      },
      {
        id: "migration-easysol",
        label: "Sync EasySol",
        href: "/dashboard/mabsolcrmsync",
        icon: "FaSyncAlt",
        permission: "vfp.view",
        isVisible: true,
        order: 2,
      },
      {
        id: "migration-logic",
        label: "Sync Logic ERP",
        href: "/dashboard/mabsolcrmsync",
        icon: "FaSyncAlt",
        permission: "vfp.view",
        isVisible: true,
        order: 3,
      },
      {
        id: "migration-marg",
        label: "Sync Marg ERP",
        href: "/dashboard/mabsolcrmsync",
        icon: "FaSyncAlt",
        permission: "vfp.view",
        isVisible: true,
        order: 4,
      },
      {
        id: "migration-settings",
        label: "Sync Settings",
        href: "/dashboard/mabsolcrmsync/settings",
        icon: "FaSlidersH",
        permission: "vfp.settings",
        isVisible: true,
        order: 5,
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "FaChartBar",
    color: "orange",
    isGroup: true,
    permission: "reports.view",
    isVisible: true,
    order: 19,
    subItems: [
      {
        id: "reports-dash",
        label: "Dash Reports",
        href: "/dashboard/reports",
        icon: "FaChartBar",
        permission: "reports.view",
        isVisible: true,
        order: 0,
      },
      {
        id: "reports-gst",
        label: "GST Reports",
        href: "/dashboard/gst-reports",
        icon: "FaChartBar",
        permission: "reports.view",
        isVisible: true,
        order: 1,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings & Customization",
    icon: "FaCog",
    color: "cyan",
    isGroup: true,
    permission: "settings.edit",
    isVisible: true,
    order: 20,
    subItems: [
      {
        id: "settings-company",
        label: "Company Settings",
        href: "/dashboard/settings",
        icon: "FaCog",
        permission: "settings.edit",
        isVisible: true,
        order: 0,
      },
      {
        id: "settings-menu-adjustments",
        label: "Menu Adjustments",
        href: "/dashboard/settings/menu-adjustments",
        icon: "FaSlidersH",
        permission: "settings.edit",
        isVisible: true,
        order: 1,
      },
      {
        id: "settings-voice",
        label: "Voice AI 🎙️",
        href: "/dashboard/voice-settings",
        icon: "FaSlidersH",
        permission: "settings.edit",
        isVisible: true,
        order: 2,
      },
      {
        id: "settings-notifications",
        label: "Notification Gateway Settings",
        href: "/dashboard/settings/notifications",
        icon: "FaEnvelope",
        permission: "settings.edit",
        isVisible: true,
        order: 3,
      },
    ],
  },
];

export function getDefaultMenuItems(): MenuItemConfig[] {
  return JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
}
