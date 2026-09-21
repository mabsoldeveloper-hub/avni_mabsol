import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Package,
  Users,
  FileText,
  UserCheck,
  Compass,
  ArrowRight,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Layers,
  Building,
  Tag,
  Boxes,
  Sparkles,
  ShieldCheck,
  Info,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  BookOpen,
  HelpCircle,
  Zap,
  Command,
  CornerDownLeft,
  Sliders,
  TrendingUp,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
  ShoppingBag,
  Share2,
  Trash2,
  AlertTriangle,
  Database,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/context/PermissionContext";

interface QuickNavLink {
  label: string;
  category: string;
  path: string;
  permission?: string;
}

const QUICK_NAVIGATION_LINKS: QuickNavLink[] = [
  // Dashboards & Analytics
  { label: "Standard Dashboard", category: "Dashboard", path: "/dashboard", permission: "dashboard.view" },
  { label: "Executive AI Dashboard", category: "Analytics", path: "/dashboard/executive-ai", permission: "dashboard.view" },
  { label: "Targets & Performance", category: "Sales Goals", path: "/dashboard/targets", permission: "targets.view" },
  { label: "AI Smart Alerts", category: "Alerts", path: "/dashboard/ai-notifications", permission: "dashboard.view" },
  { label: "Sales & Purchase Analytics", category: "Analytics", path: "/dashboard/purchase-sales-analytics", permission: "dashboard.view" },
  { label: "Financial Year Comparison", category: "Compare", path: "/dashboard/compare/fy-wise", permission: "compare.view" },

  // Sales Module
  { label: "Sales Invoices", category: "Sales", path: "/dashboard/sales/invoice", permission: "sales.view" },
  { label: "Create Sale Invoice", category: "Billing", path: "/dashboard/sales/invoice/create", permission: "sales.create" },
  { label: "Sale Orders", category: "Orders", path: "/dashboard/orders", permission: "sales.view" },
  { label: "Sales Return (Credit Note)", category: "Returns", path: "/dashboard/sales/sale-return", permission: "sales.view" },
  { label: "Receipt & Collection", category: "Payment", path: "/dashboard/sales/receipt", permission: "sales.view" },
  { label: "Outstanding Receivables", category: "Finance", path: "/dashboard/sales/outstanding", permission: "sales.view" },
  { label: "Sales vs Collection", category: "Analysis", path: "/dashboard/sales-vs-collection", permission: "sales.view" },
  { label: "Credit Risk & Bad Debts", category: "Risk", path: "/dashboard/credit-risk/bad-debts", permission: "sales.view" },

  // Stock & Inventory
  { label: "Current Stock Inventory", category: "Inventory", path: "/dashboard/stock", permission: "inventory.view" },
  { label: "Batch Expiry Liquidator", category: "Clearance", path: "/dashboard/stock/expiry-liquidator", permission: "inventory.view" },
  { label: "Inventory Dashboard", category: "Stock", path: "/dashboard/inventory/dashboard", permission: "inventory.view" },
  { label: "Inventory Products", category: "Stock", path: "/dashboard/inventory/products", permission: "inventory.view" },

  // Purchase Module
  { label: "Purchase Invoices", category: "Purchase", path: "/dashboard/purchase/invoice", permission: "purchase.view" },
  { label: "Create Purchase Bill", category: "Bills", path: "/dashboard/purchase/invoice/create", permission: "purchase.create" },
  { label: "Purchase Orders (PO)", category: "Orders", path: "/dashboard/purchase/orders", permission: "purchase.view" },
  { label: "Purchase Returns", category: "Returns", path: "/dashboard/purchase/purchase-return", permission: "purchase.view" },
  { label: "Vendor Payment Entry", category: "Payment", path: "/dashboard/purchase/payment", permission: "purchase.view" },
  { label: "Purchase Outstanding", category: "Payables", path: "/dashboard/purchase/outstanding", permission: "purchase.view" },
  { label: "AI Bill Entry (OCR)", category: "Smart OCR", path: "/dashboard/purchase/ai-entry", permission: "purchase.view" },

  // Masters
  { label: "Customer Master (Ledgers)", category: "Masters", path: "/dashboard/master/customer-master", permission: "master.view" },
  { label: "Product Master", category: "Masters", path: "/dashboard/master/product-master", permission: "master.view" },
  { label: "MR Master", category: "Masters", path: "/dashboard/master/mr-creation", permission: "master.view" },
  { label: "MR Customer Tagging", category: "Masters", path: "/dashboard/master/mr-customer", permission: "master.view" },
  { label: "Accounting Group Master", category: "Masters", path: "/dashboard/master/accounting-group-master", permission: "master.view" },
  { label: "Area Master", category: "Masters", path: "/dashboard/master/area-master", permission: "master.view" },
  { label: "Division Master", category: "Masters", path: "/dashboard/master/division-master", permission: "master.view" },
  { label: "HSN Master", category: "Masters", path: "/dashboard/master/hsn-master", permission: "master.view" },
  { label: "Bill Series Master", category: "Masters", path: "/dashboard/master/voucher-series", permission: "master.view" },
  { label: "Target & Gift Master", category: "Masters", path: "/dashboard/master/targets", permission: "master.view" },

  // Reports & GST
  { label: "Reports Hub", category: "Reports", path: "/dashboard/report", permission: "reports.view" },
  { label: "GSTR-1 GST Report", category: "Tax Report", path: "/dashboard/reports/taxation/gstr-1", permission: "reports.view" },
  { label: "Customer Ledger Statement", category: "Statements", path: "/dashboard/reports/party-ledger-statement", permission: "reports.view" },
  { label: "Product Sales Summary", category: "Reports", path: "/dashboard/reports/sales/product-summary", permission: "reports.view" },

  // CRM & Marketing
  { label: "Lead Management Hub", category: "CRM", path: "/dashboard/leads", permission: "dashboard.view" },
  { label: "Email Campaigns", category: "Marketing", path: "/dashboard/email-campaign", permission: "dashboard.view" },
  { label: "WhatsApp Campaigns", category: "Marketing", path: "/dashboard/whatsapp-campaign", permission: "dashboard.view" },
  { label: "Custom Form Studio", category: "Forms", path: "/dashboard/custom-forms", permission: "dashboard.view" },

  // Administration & Setup
  { label: "User & Staff Management", category: "Admin", path: "/dashboard/users", permission: "users.view" },
  { label: "Roles & Permissions", category: "Security", path: "/dashboard/roles", permission: "users.view" },
  { label: "MR Territory Mapping", category: "Sales Team", path: "/dashboard/mr-territory", permission: "users.view" },
  { label: "Company Profile", category: "Settings", path: "/dashboard/company", permission: "company.view" },
  { label: "Financial Year Setup", category: "Settings", path: "/dashboard/financial-year", permission: "financial-year.view" },
  { label: "System Settings", category: "Settings", path: "/dashboard/settings", permission: "settings.view" },
];

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  query,
  setQuery,
}: GlobalSearchModalProps) {
  const router = useRouter();
  const { can } = usePermission();
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);

  // E-Commerce style filters
  const [inStockOnly, setInStockOnly] = useState(false);
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);
  const [highBalanceOnly, setHighBalanceOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [dynamicTrending, setDynamicTrending] = useState<any[]>([]);

  const [results, setResults] = useState<{
    products: any[];
    customers: any[];
    vouchers: any[];
    users: any[];
    navigation: any[];
  }>({
    products: [],
    customers: [],
    vouchers: [],
    users: [],
    navigation: [],
  });
  const [totalResults, setTotalResults] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mabsol_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch dynamic live trending items when modal opens or query is empty
  useEffect(() => {
    if (isOpen && !query.trim()) {
      fetch("/api/global-search?q=")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.trending)) {
            setDynamicTrending(data.trending);
          }
        })
        .catch(() => { });
    }
  }, [isOpen, query]);

  const stripEmojis = (str: string) => {
    if (!str) return "";
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  };

  const saveRecentSearch = (itemOrTerm: any) => {
    if (!itemOrTerm) return;
    let entry: { title: string; query: string; actionUrl?: string | null };

    if (typeof itemOrTerm === "string") {
      const clean = stripEmojis(itemOrTerm);
      entry = { title: itemOrTerm, query: clean || itemOrTerm };
    } else {
      const title = itemOrTerm.title || itemOrTerm.label || "";
      const clean = stripEmojis(title);
      entry = {
        title: title,
        query: clean || title,
        actionUrl: itemOrTerm.actionUrl || null,
      };
    }

    if (!entry.title || entry.title.trim().length < 2) return;

    try {
      const updated = [
        entry,
        ...recentSearches.filter((s: any) => {
          const sTitle = typeof s === "string" ? s : s.title;
          return sTitle !== entry.title;
        }),
      ].slice(0, 8);

      setRecentSearches(updated as any);
      localStorage.setItem("mabsol_recent_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving recent search:", e);
    }
  };

  const handleRecentClick = (item: any) => {
    if (item && typeof item === "object" && item.actionUrl) {
      onClose();
      router.push(item.actionUrl);
      return;
    }

    const rawStr = typeof item === "string" ? item : (item.query || item.title || "");
    const cleanStr = stripEmojis(rawStr);
    setQuery(cleanStr || rawStr);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const removeRecentSearch = (e: React.MouseEvent, targetItem: any) => {
    e.stopPropagation();
    const targetTitle = typeof targetItem === "string" ? targetItem : targetItem.title;
    const updated = recentSearches.filter((s: any) => {
      const sTitle = typeof s === "string" ? s : s.title;
      return sTitle !== targetTitle;
    });
    setRecentSearches(updated as any);
    try {
      localStorage.setItem("mabsol_recent_searches", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("mabsol_recent_searches");
    } catch (e) {
      // ignore
    }
  };

  // Reset state when search closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setSelectedIndex(0);
      setInStockOnly(false);
      setNearExpiryOnly(false);
      setHighBalanceOnly(false);
      setSortBy("relevance");
    }
  }, [isOpen]);

  // Debounced search API fetch with filters & Alexa Speech Synthesis trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        products: [],
        customers: [],
        vouchers: [],
        users: [],
        navigation: [],
      });
      setTotalResults(0);
      setDidYouMean(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        category: activeCategory,
        inStock: inStockOnly ? "true" : "false",
        nearExpiry: nearExpiryOnly ? "true" : "false",
        highBalance: highBalanceOnly ? "true" : "false",
        sortBy: sortBy,
      });

      fetch(`/api/global-search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setResults(data.results);
            const permittedNavCount = (data.results.navigation || []).filter(
              (item: any) => !item.permission || (can ? can(item.permission) : true)
            ).length;
            const computedTotal =
              (data.results.products?.length || 0) +
              (data.results.customers?.length || 0) +
              (data.results.vouchers?.length || 0) +
              (data.results.users?.length || 0) +
              permittedNavCount;
            setTotalResults(computedTotal);
            setDidYouMean(data.didYouMean || null);
          }
        })
        .catch((err) => {
          console.error("Global search error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [query, activeCategory, inStockOnly, nearExpiryOnly, highBalanceOnly, sortBy, can, onClose, router]);

  // Flatten active results for keyboard navigation (strictly filtered by permissions)
  const getFlatResults = useCallback(() => {
    const flat: any[] = [];
    if (activeCategory === "all" || activeCategory === "products") flat.push(...results.products);
    if (activeCategory === "all" || activeCategory === "customers") flat.push(...results.customers);
    if (activeCategory === "all" || activeCategory === "vouchers") flat.push(...results.vouchers);
    if (activeCategory === "all" || activeCategory === "users") flat.push(...results.users);
    if (activeCategory === "all" || activeCategory === "navigation") {
      const allowedNav = (results.navigation || []).filter(
        (item: any) => !item.permission || (can ? can(item.permission) : true)
      );
      flat.push(...allowedNav);
    }
    return flat;
  }, [results, activeCategory, can]);

  // Global Escape key listener to close modal instantly
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedItem) {
          setSelectedItem(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, selectedItem, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (selectedItem) {
        setSelectedItem(null);
      } else {
        onClose();
      }
      return;
    }

    const flat = getFlatResults();
    if (flat.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flat.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flat.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[selectedIndex]) {
        handleItemClick(flat[selectedIndex]);
      }
    }
  };

  const handleItemClick = (item: any) => {
    saveRecentSearch(item);

    if (item.actionUrl) {
      onClose();
      router.push(item.actionUrl);
    }
  };

  const copyDetailsToClipboard = (item: any) => {
    try {
      const formatted = `${item.title}\nCategory: ${item.category}\nSubtitle: ${item.subtitle}\nDetails: ${JSON.stringify(item.details, null, 2)}`;
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const permittedQuickLinks = useMemo(() => {
    return QUICK_NAVIGATION_LINKS.filter(
      (item) => !item.permission || (can ? can(item.permission) : true)
    );
  }, [can]);

  // Filter quick navigation links based on activeCategory
  const filteredQuickLinks = useMemo(() => {
    return permittedQuickLinks.filter((item) => {
      if (activeCategory === "all" || activeCategory === "navigation") return true;
      const cat = (item.category || "").toLowerCase();
      const lbl = (item.label || "").toLowerCase();

      if (activeCategory === "products") {
        return (
          cat.includes("stock") ||
          cat.includes("inventory") ||
          cat.includes("product") ||
          cat.includes("clearance") ||
          lbl.includes("product") ||
          lbl.includes("stock") ||
          lbl.includes("inventory") ||
          lbl.includes("expiry") ||
          lbl.includes("batch") ||
          lbl.includes("hsn") ||
          lbl.includes("division")
        );
      }

      if (activeCategory === "customers") {
        return (
          cat.includes("customer") ||
          cat.includes("ledger") ||
          cat.includes("party") ||
          cat.includes("finance") ||
          cat.includes("risk") ||
          cat.includes("statement") ||
          cat.includes("crm") ||
          lbl.includes("customer") ||
          lbl.includes("ledger") ||
          lbl.includes("party") ||
          lbl.includes("receivable") ||
          lbl.includes("collection") ||
          lbl.includes("bad debt") ||
          lbl.includes("area") ||
          lbl.includes("lead")
        );
      }

      if (activeCategory === "vouchers") {
        return (
          cat.includes("sales") ||
          cat.includes("purchase") ||
          cat.includes("billing") ||
          cat.includes("bills") ||
          cat.includes("orders") ||
          cat.includes("returns") ||
          cat.includes("payment") ||
          cat.includes("payables") ||
          cat.includes("tax") ||
          lbl.includes("invoice") ||
          lbl.includes("order") ||
          lbl.includes("bill") ||
          lbl.includes("voucher") ||
          lbl.includes("credit note") ||
          lbl.includes("debit note") ||
          lbl.includes("gst") ||
          lbl.includes("return") ||
          lbl.includes("receipt")
        );
      }

      if (activeCategory === "users") {
        return (
          cat.includes("mr") ||
          cat.includes("team") ||
          cat.includes("user") ||
          cat.includes("admin") ||
          cat.includes("security") ||
          cat.includes("sales team") ||
          cat.includes("goals") ||
          lbl.includes("user") ||
          lbl.includes("permission") ||
          lbl.includes("role") ||
          lbl.includes("hierarchy") ||
          lbl.includes("mr") ||
          lbl.includes("territory") ||
          lbl.includes("target")
        );
      }

      return true;
    });
  }, [permittedQuickLinks, activeCategory]);

  // Filter dynamic trending items based on activeCategory
  const filteredTrending = useMemo(() => {
    if (activeCategory === "all") return dynamicTrending;
    return dynamicTrending.filter((item) => {
      const type = (item.type || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const lbl = (item.label || "").toLowerCase();

      if (activeCategory === "products") {
        return type === "product" || cat.includes("product") || cat.includes("stock") || lbl.includes("tab") || lbl.includes("cap");
      }
      if (activeCategory === "customers") {
        return type === "customer" || cat.includes("customer") || cat.includes("party") || cat.includes("sales");
      }
      if (activeCategory === "vouchers") {
        return type === "voucher" || cat.includes("report") || cat.includes("finance") || cat.includes("tax") || cat.includes("gst") || cat.includes("stock");
      }
      if (activeCategory === "users") {
        return type === "user" || cat.includes("mr") || cat.includes("team") || cat.includes("performance");
      }
      if (activeCategory === "navigation") {
        return type === "navigation";
      }
      return true;
    });
  }, [dynamicTrending, activeCategory]);

  const categoryHeading = useMemo(() => {
    switch (activeCategory) {
      case "products":
        return `Product & Inventory Pages (${filteredQuickLinks.length} Pages Available)`;
      case "customers":
        return `Customer & Party Pages (${filteredQuickLinks.length} Pages Available)`;
      case "vouchers":
        return `Vouchers, Bills & Invoices (${filteredQuickLinks.length} Pages Available)`;
      case "users":
        return `Sales Team & User Pages (${filteredQuickLinks.length} Pages Available)`;
      case "navigation":
        return `All Navigation Pages (${filteredQuickLinks.length} Pages Available)`;
      default:
        return `Quick Navigation (${filteredQuickLinks.length} Pages Available)`;
    }
  }, [activeCategory, filteredQuickLinks.length]);

  if (!isOpen) return null;

  return (
    <>
      {/* Click outside backdrop: clicking anywhere outside closes the search */}
      <div
        className="fixed inset-0 z-40 bg-black/25 dark:bg-black/45"
        onClick={onClose}
      />

      {/* Main Search Results Dropdown Panel (Positioned with clear gap below header search bar) */}
      <div
        style={{ width: "min(740px, calc(100vw - 24px))" }}
        className="fixed inset-x-2 top-14 md:absolute md:top-[calc(100%+8px)] md:left-1/2 md:-translate-x-1/2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/25 border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[78vh] z-50 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Category Tabs Filter (Strictly in one clean row) */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
            {[
              { id: "all", label: "All", icon: Sparkles },
              { id: "products", label: "Products", icon: Package },
              { id: "customers", label: "Customers", icon: Users },
              { id: "vouchers", label: "Vouchers", icon: FileText },
              { id: "users", label: "Team", icon: UserCheck },
              { id: "navigation", label: "Pages", icon: Compass },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedIndex(0);
                  }}
                  className={`search-clip-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 ${isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200/80 dark:border-slate-700/80"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Facets & Filters Toolbar */}
        {query.trim() && (activeCategory === "all" || activeCategory === "products" || activeCategory === "customers") && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(activeCategory === "all" || activeCategory === "products") && (
                <>
                  <button
                    onClick={() => setInStockOnly((v) => !v)}
                    className={`search-clip-btn px-3 py-1 rounded-full font-medium border transition-colors cursor-pointer ${inStockOnly
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                  >
                    In Stock
                  </button>
                  <button
                    onClick={() => setNearExpiryOnly((v) => !v)}
                    className={`search-clip-btn px-3 py-1 rounded-full font-medium border transition-colors cursor-pointer ${nearExpiryOnly
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                  >
                    Near Expiry
                  </button>
                </>
              )}
              {(activeCategory === "all" || activeCategory === "customers") && (
                <button
                  onClick={() => setHighBalanceOnly((v) => !v)}
                  className={`search-clip-btn px-3 py-1 rounded-full font-medium border transition-colors cursor-pointer ${highBalanceOnly
                    ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                >
                  Outstanding &gt; 0
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 shrink-0 text-slate-400">
              <ArrowUpDown className="w-3 h-3" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-600 dark:text-slate-400 text-[11px] font-medium outline-none cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="name">Name (A-Z)</option>
                <option value="stockHigh">Highest Stock</option>
                <option value="priceHigh">Price (High to Low)</option>
                <option value="priceLow">Price (Low to High)</option>
              </select>
            </div>
          </div>
        )}

        {/* Typo Correction Banner ("Did You Mean?") */}
        {didYouMean && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 text-xs font-medium text-indigo-900 dark:text-indigo-200">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Did you mean:</span>
            <button
              onClick={() => setQuery(didYouMean)}
              className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer text-xs"
            >
              {didYouMean}
            </button>
          </div>
        )}

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[58vh]">
          {/* No Query State: Show Quick Navigation & Trending Searches */}
          {!query.trim() && (
            <div className="p-3.5 sm:p-4 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Recent Searches
                    </span>
                    <button
                      onClick={clearAllRecent}
                      className="text-[10px] font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item: any, idx: number) => {
                      const displayTitle = typeof item === "string" ? item : item.title;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleRecentClick(item)}
                          className="search-clip-btn group inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full cursor-pointer transition-all duration-200 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-600 shadow-2xs hover:shadow-sm"
                        >
                          <span className="font-semibold truncate max-w-[200px] sm:max-w-none">{displayTitle}</span>
                          <X
                            className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors shrink-0"
                            onClick={(e) => removeRecentSearch(e, item)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Trending Records & Products (Filtered by activeCategory) */}
              {filteredTrending.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {activeCategory === "products"
                        ? "Popular Products"
                        : activeCategory === "customers"
                          ? "Popular Customers & Parties"
                          : activeCategory === "vouchers"
                            ? "Popular Vouchers & Tax Reports"
                            : activeCategory === "users"
                              ? "Sales Team & Representatives"
                              : "Popular Records & Products"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredTrending.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.actionUrl) {
                            onClose();
                            router.push(item.actionUrl);
                          } else {
                            setQuery(item.query || item.label);
                          }
                        }}
                        className="search-clip-btn inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white border border-slate-200/90 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-600 text-xs font-medium transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-sm"
                      >
                        <span className="font-semibold transition-colors truncate max-w-[220px] sm:max-w-none">{item.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 group-hover:bg-white/20 group-hover:text-white font-semibold transition-colors">
                          {item.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation Links (Filtered by activeCategory) */}
              {filteredQuickLinks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {categoryHeading}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredQuickLinks.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onClose();
                          router.push(item.path);
                        }}
                        className="search-clip-btn flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-slate-50/90 dark:bg-slate-800/80 hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-600 transition-all duration-200 text-left group cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Compass className="w-3.5 h-3.5 text-indigo-500 group-hover:text-white transition-colors shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-white transition-colors truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 group-hover:bg-white/20 group-hover:text-white font-medium transition-colors">
                            {item.category}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredTrending.length === 0 && filteredQuickLinks.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No records or pages found for this filter.
                </div>
              )}
            </div>
          )}

          {/* Loading Skeleton */}
          {(() => {
            const flatList = getFlatResults();
            if (loading && query.trim() && flatList.length === 0) {
              return (
                <div className="p-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-slate-400">Searching database...</p>
                </div>
              );
            }
            if (!loading && query.trim() && flatList.length === 0) {
              return (
                <div className="p-10 text-center">
                  <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No results found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    No records matched &quot;{query}&quot;. Try a different search term or clear active filters.
                  </p>
                </div>
              );
            }
            if (flatList.length > 0) {
              return (
                <div className="p-2 space-y-0.5">
                  <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span>Results ({flatList.length})</span>
                    <span className="flex items-center gap-1 text-[10.5px]">
                      <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9.5px]">↑</kbd>
                      <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9.5px]">↓</kbd> navigate
                      <kbd className="ml-1 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9.5px]">↵</kbd> open
                    </span>
                  </div>

                  {flatList.map((item: any, index: number) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 border ${isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/80 shadow-xs"
                          : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent"
                          }`}
                      >
                        {/* Left Icon & Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${item.type === "kpi"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : item.type === "product"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : item.type === "customer"
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                  : item.type === "voucher"
                                    ? "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400"
                                    : item.type === "user"
                                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
                                      : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                              }`}
                          >
                            {item.type === "kpi" && <TrendingUp className="w-4 h-4" />}
                            {item.type === "product" && <Package className="w-4 h-4" />}
                            {item.type === "customer" && <Users className="w-4 h-4" />}
                            {item.type === "voucher" && <FileText className="w-4 h-4" />}
                            {item.type === "user" && <UserCheck className="w-4 h-4" />}
                            {item.type === "navigation" && <Compass className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                {item.category}
                              </span>
                            </div>

                            <p className="text-[11.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {item.subtitle}
                            </p>

                            {/* Badges */}
                            {item.badges && item.badges.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {item.badges.map((b: any, bIdx: number) => (
                                  <span
                                    key={bIdx}
                                    className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${b.color === "emerald"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : b.color === "rose"
                                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                        : b.color === "amber"
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                          : b.color === "blue"
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                            : b.color === "indigo"
                                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                      }`}
                                  >
                                    {b.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Action Hint */}
                        <div className="flex items-center gap-2 shrink-0">
                          {(item.type === "product" || item.type === "customer") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Quick Details"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div
                            className={`flex items-center gap-1 text-[11px] font-medium transition-opacity ${isSelected ? "text-indigo-600 opacity-100" : "text-slate-400 opacity-0 group-hover:opacity-100"
                              }`}
                          >
                            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                              ↵
                            </kbd>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px]">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px]">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9.5px]">esc</kbd> Close
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {totalResults > 0 ? `${totalResults} ${totalResults === 1 ? "result" : "results"}` : "Global Search"}
            </span>
          </div>
        </div>
      </div>

      {/* Deep Detail Slide-Over Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {selectedItem.category} Full Detail View
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 max-h-[70vh]">
              {/* Formatted Key Details Grid */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                  Summary & Metrics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedItem.details || {}).map(([key, val]) => {
                    if (key === "batches") return null;
                    return (
                      <div
                        key={key}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center"
                      >
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 mt-0.5 truncate">
                          {String(val || "N/A")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product Batches Table if Product */}
              {selectedItem.type === "product" &&
                selectedItem.details?.batches &&
                selectedItem.details.batches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Batch-wise Stock Breakdown ({selectedItem.details.batches.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Batch No</th>
                            <th className="p-2.5">Expiry</th>
                            <th className="p-2.5">Available Qty</th>
                            <th className="p-2.5">MRP</th>
                            <th className="p-2.5">Sale Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {selectedItem.details.batches.map((b: any, bIdx: number) => (
                            <tr key={bIdx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-indigo-700">{b.batchNo}</td>
                              <td className="p-2.5 text-slate-600">{b.exp}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  {b.qty}
                                </span>
                              </td>
                              <td className="p-2.5">{b.mrp}</td>
                              <td className="p-2.5">{b.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Full Raw Object Dump */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Full Database Record JSON
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(selectedItem.raw, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => copyDetailsToClipboard(selectedItem)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Record Data"}</span>
              </button>

              <button
                onClick={() => handleItemClick(selectedItem)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Navigate to Record Page</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Router hook fallback
function RouterHook() {
  try {
    return useRouter();
  } catch (e) {
    return null;
  }
}
