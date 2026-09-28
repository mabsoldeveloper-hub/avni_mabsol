import { SidebarPresetTheme, ColorStyleConfig, SidebarThemeId } from "./types";
import { ColorKey } from "@/lib/defaultMenuData";

export const SIDEBAR_PRESET_THEMES: SidebarPresetTheme[] = [
  {
    id: "default",
    name: "Classic Glass",
    category: "other",
    color: "#6366f1",
    bgGradient: "linear-gradient(160deg, rgba(248,249,255,0.98) 0%, rgba(241,244,255,0.95) 50%, rgba(247,249,255,0.97) 100%)",
    borderColor: "rgba(99,102,241,0.15)",
    isDark: false,
  },
  // ===== BLUE SHADERS FOR SIDEBAR =====
  {
    id: "deep_navy",
    name: "Deep Navy",
    category: "blue",
    color: "#001f54",
    bgGradient: "linear-gradient(180deg, #0a1128 0%, #001f54 50%, #034078 100%)",
    borderColor: "rgba(56,189,248,0.25)",
    isDark: true,
  },
  {
    id: "royal_blue",
    name: "Royal Navy",
    category: "blue",
    color: "#1e40af",
    bgGradient: "linear-gradient(180deg, #172554 0%, #1e3a8a 50%, #1e40af 100%)",
    borderColor: "rgba(96,165,250,0.3)",
    isDark: true,
  },
  {
    id: "cobalt_navy",
    name: "Cobalt Tech",
    category: "blue",
    color: "#1e3a8a",
    bgGradient: "linear-gradient(180deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)",
    borderColor: "rgba(129,140,248,0.28)",
    isDark: true,
  },
  {
    id: "cyber_electric",
    name: "Cyber Blue",
    category: "blue",
    color: "#2563eb",
    bgGradient: "linear-gradient(180deg, #020617 0%, #1d4ed8 50%, #60a5fa 100%)",
    borderColor: "rgba(37,99,235,0.35)",
    isDark: true,
  },
  {
    id: "ice_azure",
    name: "Ice Azure",
    category: "blue",
    color: "#0284c7",
    bgGradient: "linear-gradient(180deg, #082f49 0%, #0369a1 50%, #0ea5e9 100%)",
    borderColor: "rgba(14,165,233,0.35)",
    isDark: true,
  },
  {
    id: "ocean_sapphire",
    name: "Sapphire",
    category: "blue",
    color: "#0ea5e9",
    bgGradient: "linear-gradient(180deg, #0b192c 0%, #1e3e62 50%, #008170 100%)",
    borderColor: "rgba(56,189,248,0.3)",
    isDark: true,
  },
  {
    id: "steel_blue",
    name: "Steel Slate",
    category: "blue",
    color: "#334155",
    bgGradient: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    borderColor: "rgba(148,163,184,0.25)",
    isDark: true,
  },
  // ===== OTHER PALETTES =====
  {
    id: "midnight_dark",
    name: "Midnight Dark",
    category: "other",
    color: "#0f172a",
    bgGradient: "linear-gradient(180deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
    borderColor: "rgba(255,255,255,0.12)",
    isDark: true,
  },
  {
    id: "emerald_mint",
    name: "Emerald Mint",
    category: "other",
    color: "#059669",
    bgGradient: "linear-gradient(180deg, #022c22 0%, #065f46 50%, #059669 100%)",
    borderColor: "rgba(52,211,153,0.3)",
    isDark: true,
  },
  {
    id: "royal_purple",
    name: "Royal Violet",
    category: "other",
    color: "#7c3aed",
    bgGradient: "linear-gradient(180deg, #1e1035 0%, #4c1d95 50%, #6d28d9 100%)",
    borderColor: "rgba(167,139,250,0.3)",
    isDark: true,
  },
  {
    id: "sunset_rose",
    name: "Sunset Rose",
    category: "other",
    color: "#e11d48",
    bgGradient: "linear-gradient(180deg, #3f0713 0%, #881337 50%, #be123c 100%)",
    borderColor: "rgba(251,113,133,0.3)",
    isDark: true,
  },
  {
    id: "amber_warm",
    name: "Amber Warm",
    category: "other",
    color: "#d97706",
    bgGradient: "linear-gradient(180deg, #2d1800 0%, #78350f 50%, #b45309 100%)",
    borderColor: "rgba(251,191,36,0.3)",
    isDark: true,
  },
];

export const COLOR_MAP: Record<ColorKey, ColorStyleConfig> = {
  indigo: {
    bar: "bg-indigo-600",
    iconText: "text-indigo-600 dark:text-indigo-400",
    iconActiveBg: "bg-indigo-600",
    hoverText: "hover:text-indigo-600 dark:hover:text-indigo-400",
    activeText: "text-indigo-600 dark:text-indigo-400",
    subHoverIcon: "group-hover/sub:text-indigo-600 dark:group-hover/sub:text-indigo-400",
    glow: "#4f46e5",
    glowDark: "#3730a3",
  },
  emerald: {
    bar: "bg-emerald-600",
    iconText: "text-emerald-600 dark:text-emerald-400",
    iconActiveBg: "bg-emerald-600",
    hoverText: "hover:text-emerald-600 dark:hover:text-emerald-400",
    activeText: "text-emerald-600 dark:text-emerald-400",
    subHoverIcon: "group-hover/sub:text-emerald-600 dark:group-hover/sub:text-emerald-400",
    glow: "#059669",
    glowDark: "#047857",
  },
  violet: {
    bar: "bg-violet-600",
    iconText: "text-violet-600 dark:text-violet-400",
    iconActiveBg: "bg-violet-600",
    hoverText: "hover:text-violet-600 dark:hover:text-violet-400",
    activeText: "text-violet-600 dark:text-violet-400",
    subHoverIcon: "group-hover/sub:text-violet-600 dark:group-hover/sub:text-violet-400",
    glow: "#7c3aed",
    glowDark: "#5b21b6",
  },
  rose: {
    bar: "bg-rose-600",
    iconText: "text-rose-600 dark:text-rose-400",
    iconActiveBg: "bg-rose-600",
    hoverText: "hover:text-rose-600 dark:hover:text-rose-400",
    activeText: "text-rose-600 dark:text-rose-400",
    subHoverIcon: "group-hover/sub:text-rose-600 dark:group-hover/sub:text-rose-400",
    glow: "#e11d48",
    glowDark: "#be123c",
  },
  amber: {
    bar: "bg-amber-600",
    iconText: "text-amber-600 dark:text-amber-400",
    iconActiveBg: "bg-amber-600",
    hoverText: "hover:text-amber-600 dark:hover:text-amber-400",
    activeText: "text-amber-600 dark:text-amber-400",
    subHoverIcon: "group-hover/sub:text-amber-600 dark:group-hover/sub:text-amber-400",
    glow: "#d97706",
    glowDark: "#b45309",
  },
  sky: {
    bar: "bg-sky-600",
    iconText: "text-sky-600 dark:text-sky-400",
    iconActiveBg: "bg-sky-600",
    hoverText: "hover:text-sky-600 dark:hover:text-sky-400",
    activeText: "text-sky-600 dark:text-sky-400",
    subHoverIcon: "group-hover/sub:text-sky-600 dark:group-hover/sub:text-sky-400",
    glow: "#0284c7",
    glowDark: "#0369a1",
  },
  blue: {
    bar: "bg-blue-600",
    iconText: "text-blue-600 dark:text-blue-400",
    iconActiveBg: "bg-blue-600",
    hoverText: "hover:text-blue-600 dark:hover:text-blue-400",
    activeText: "text-blue-600 dark:text-blue-400",
    subHoverIcon: "group-hover/sub:text-blue-600 dark:group-hover/sub:text-blue-400",
    glow: "#2563eb",
    glowDark: "#1d4ed8",
  },
  teal: {
    bar: "bg-teal-600",
    iconText: "text-teal-600 dark:text-teal-400",
    iconActiveBg: "bg-teal-600",
    hoverText: "hover:text-teal-600 dark:hover:text-teal-400",
    activeText: "text-teal-600 dark:text-teal-400",
    subHoverIcon: "group-hover/sub:text-teal-600 dark:group-hover/sub:text-teal-400",
    glow: "#0d9488",
    glowDark: "#0f766e",
  },
  orange: {
    bar: "bg-orange-600",
    iconText: "text-orange-600 dark:text-orange-400",
    iconActiveBg: "bg-orange-600",
    hoverText: "hover:text-orange-600 dark:hover:text-orange-400",
    activeText: "text-orange-600 dark:text-orange-400",
    subHoverIcon: "group-hover/sub:text-orange-600 dark:group-hover/sub:text-orange-400",
    glow: "#ea580c",
    glowDark: "#c2410c",
  },
  cyan: {
    bar: "bg-cyan-600",
    iconText: "text-cyan-600 dark:text-cyan-400",
    iconActiveBg: "bg-cyan-600",
    hoverText: "hover:text-cyan-600 dark:hover:text-cyan-400",
    activeText: "text-cyan-600 dark:text-cyan-400",
    subHoverIcon: "group-hover/sub:text-cyan-600 dark:group-hover/sub:text-cyan-400",
    glow: "#0891b2",
    glowDark: "#0e7490",
  },
};

export const MODULE_KEY_MAP: Record<string, string[]> = {
  dashboard: ["standard-dashboard", "executive-ai", "targets", "purchase-sales-analytics"],
  sales: ["sales", "sales-orders", "sales-invoices", "sales-return", "sales-management"],
  purchase: ["purchase", "purchase-bills", "purchase-orders", "purchase-returns", "purchase-payments"],
  inventory: ["stock", "inventory", "expiry", "near-expiry", "stock-status"],
  accounting: ["accounts", "ledgers", "receipts", "payments", "finance", "credit-debit"],
  leads: ["leads", "email-campaign", "whatsapp-campaign"],
  fieldforce: ["fieldforce", "mr-reporting", "mr-customer", "mr-territory", "mr-fieldforce"],
  reports: ["reports", "sales-report", "purchase-report", "stock-report", "ledger-report"],
  master: ["master", "area", "division", "category", "hsn", "company","backup"],
  custom_forms: ["custom-forms"],
};

export const SIDEBAR_TEXT = {
  themeTitle: "Sidebar Color Theme",
  themeSubtitle: "Customize navigation bar background",
  resetTheme: "Reset",
  blueShadesTitle: "🌊 Blue Shades Collection",
  blueShadesCount: "7 Shades",
  otherPalettesTitle: "✨ Other Palettes",
  customColorTitle: "🎨 Custom Color Picker",
  customActiveBadge: "Active",
  applyButton: "Apply",
  appliedButton: "Applied",
  userFallback: "User",
  loggedInFallback: "Logged in",
  defaultLogo: "/mabsol_logo.ico",
  customizeTooltip: "Customize Sidebar Theme & Colors",
} as const;

export const SIDEBAR_SECTIONS = [
  {
    key: "DASHBOARD",
    label: "DASHBOARD",
    ids: ["standard-dashboard", "executive-ai", "ai-notifications"],
  },
  {
    key: "OPERATIONS",
    label: "OPERATIONS",
    ids: [
      "sales",
      "purchase",
      "inventory",
      "customer",
      "company",
      "financial-year",
      "email-campaign",
      "whatsapp-campaign",
    ],
  },
  {
    key: "MASTERS",
    label: "MASTERS",
    ids: ["master"],
  },
  {
    key: "REPORTS",
    label: "REPORTS",
    ids: ["reports", "compare", "targets", "purchase-sales-analytics"],
  },
  {
    key: "SETTINGS",
    label: "SETTINGS & ADMIN",
    ids: ["settings", "users", "migration", "custom-forms"],
  },
];

export function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isColorDark(hex: string): boolean {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 130;
}
