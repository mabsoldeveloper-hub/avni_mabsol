"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    FaBalanceScale,
    FaTimes,
    FaTrophy,
    FaRupeeSign,
    FaChartLine,
    FaShoppingBag,
    FaWallet,
    FaDownload,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaInfoCircle,
    FaHeartbeat,
    FaUserCheck,
    FaMapMarkerAlt,
    FaLayerGroup,
    FaChevronRight,
    FaBoxes,
    FaEye,
    FaPhoneAlt,
    FaCopy,
    FaCheck,
    FaSearch,
    FaFilter,
    FaStar,
    FaExclamationTriangle,
    FaAddressCard,
    FaFileInvoiceDollar,
    FaBuilding,
    FaEnvelope,
    FaUserTie,
    FaThLarge,
    FaListUl,
    FaRoute,
    FaCreditCard,
} from "react-icons/fa";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type FYItem = { fyId: string; fyName: string; startDate: string; endDate: string; color: string };

export type StateFyData = {
    sales: number;
    netSales: number;
    salesReturns: number;
    purchase: number;
    collections: number;
    payments: number;
    customersCount: number;
    suppliersCount: number;
    returnsRatioPercent: number;
    collectionEfficiencyPercent: number;
    monthlySales: number[];
};

export type CustomerDetailItem = {
    code: string;
    name: string;
    city: string;
    district?: string;
    area?: string;
    route?: string;
    state?: string;
    pincode?: string;
    gstno?: string;
    phone?: string;
    dlno?: string;
    email?: string;
    address?: string;
    dsm?: string;
    asm?: string;
    rsm?: string;
    totalSales: number;
    totalNetSales: number;
    totalReturns: number;
    returnsRatioPercent: number;
    invoicesCount: number;
    balance: number;
    creditLimit: number;
    creditDays: number;
    lastSaleDate?: string;
    byFy: Record<string, { sales: number; netSales: number; returns: number; invoicesCount: number }>;
    salesGrowthPct?: number | null;
    category?: "Key Account" | "Growth Account" | "Standard" | "High Return Risk";
    topProducts?: { name: string; qty: number; amount: number }[];
};

export type StateRow = {
    stateId: string;
    stateName: string;
    zoneName: string;
    totalSales: number;
    totalNetSales: number;
    salesGrowthPct: number | null;
    netSalesGrowthPct: number | null;
    healthScore: number;
    byFy: Record<string, StateFyData>;
    topProducts: { name: string; qty: number; amount: number }[];
    topCustomers: {
        code?: string;
        name: string;
        city?: string;
        area?: string;
        sales: number;
        netSales?: number;
        gstno?: string;
        phone?: string;
        invoicesCount?: number;
        byFy?: Record<string, any>;
    }[];
    customers?: CustomerDetailItem[];
};

interface FYAreaRadarDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    stateData: StateRow[];
    fyList: FYItem[];
    selectedStateIds: string[];
    initialMetric?: string | null;
}

const STATE_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const METRIC_CONFIGS: {
    key: string;
    label: string;
    shortLabel: string;
    color: string;
    icon: React.ReactNode;
    description: string;
    getter: (s: StateRow, fyId: string) => number;
    isCurrency?: boolean;
    isScore?: boolean;
    lowerIsBetter?: boolean;
}[] = [
    {
        key: "sales",
        label: "Gross Sales",
        shortLabel: "Sales",
        color: "#6366F1",
        icon: <FaRupeeSign size={12} />,
        description: "Total invoice billing revenue across this state's customer network",
        getter: (s, fyId) => s.byFy[fyId]?.sales ?? 0,
        isCurrency: true,
    },
    {
        key: "netSales",
        label: "Net Sales",
        shortLabel: "Net Sales",
        color: "#10B981",
        icon: <FaChartLine size={12} />,
        description: "Actual retained turnover (Gross Sales minus Sales Returns / Credit Notes)",
        getter: (s, fyId) => s.byFy[fyId]?.netSales ?? 0,
        isCurrency: true,
    },
    {
        key: "collections",
        label: "Collections",
        shortLabel: "Collections",
        color: "#06B6D4",
        icon: <FaWallet size={12} />,
        description: "Realized cash and bank collections from state customer base",
        getter: (s, fyId) => s.byFy[fyId]?.collections ?? 0,
        isCurrency: true,
    },
    {
        key: "purchase",
        label: "Purchases",
        shortLabel: "Purchases",
        color: "#F59E0B",
        icon: <FaShoppingBag size={12} />,
        description: "State-level procurement and stock acquisitions",
        getter: (s, fyId) => s.byFy[fyId]?.purchase ?? 0,
        isCurrency: true,
    },
    {
        key: "customers",
        label: "Active Accounts & Customers",
        shortLabel: "Customers",
        color: "#8B5CF6",
        icon: <FaUserCheck size={12} />,
        description: "Comprehensive customer intelligence, territory accounts, turnover & compliance profile",
        getter: (s, fyId) => s.byFy[fyId]?.customersCount ?? (s.customers?.length || 0),
    },
    {
        key: "health",
        label: "State Health Score",
        shortLabel: "Health Score",
        color: "#14B8A6",
        icon: <FaHeartbeat size={12} />,
        description: "Composite territory index: revenue growth, return ratio & collection efficiency",
        getter: (s) => s.healthScore,
        isScore: true,
    },
];

const formatINR = (n: number) =>
    "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n ?? 0));

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};

const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    borderRadius: 12,
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.15)",
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 600,
    padding: "8px 12px",
};

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);
    return isMobile;
}

export default function FYAreaRadarDetailModal({
    isOpen,
    onClose,
    stateData,
    fyList,
    selectedStateIds,
    initialMetric,
}: FYAreaRadarDetailModalProps) {
    const isMobile = useIsMobile(640);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [activeStateIds, setActiveStateIds] = useState<string[]>([]);
    const [selectedFyId, setSelectedFyId] = useState<string>("");

    // Customer directory filter states
    const [customerStateFilter, setCustomerStateFilter] = useState<string>("ALL");
    const [customerSearch, setCustomerSearch] = useState<string>("");
    const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>("ALL");
    const [customerSortBy, setCustomerSortBy] = useState<string>("sales-desc");
    const [customerViewMode, setCustomerViewMode] = useState<"cards" | "table">("cards");
    const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerDetailItem | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // Initialize active states & selected FY
    useEffect(() => {
        if (isOpen) {
            if (selectedStateIds && selectedStateIds.length > 0) {
                setActiveStateIds(selectedStateIds);
            } else if (stateData && stateData.length > 0) {
                setActiveStateIds(stateData.slice(0, 3).map((s) => s.stateId));
            }
            if (fyList && fyList.length > 0) {
                setSelectedFyId(fyList[fyList.length - 1].fyId);
            }
            if (initialMetric) {
                const search = initialMetric.toLowerCase().trim();
                const matched = METRIC_CONFIGS.find(
                    (m) =>
                        m.key.toLowerCase() === search ||
                        m.label.toLowerCase() === search ||
                        m.shortLabel.toLowerCase() === search ||
                        m.label.toLowerCase().includes(search) ||
                        m.shortLabel.toLowerCase().includes(search) ||
                        search.includes(m.shortLabel.toLowerCase())
                );
                setActiveTab(matched ? matched.key : "all");
            } else {
                setActiveTab("all");
            }
            setCustomerStateFilter("ALL");
            setCustomerSearch("");
            setCustomerCategoryFilter("ALL");
        }
    }, [isOpen, selectedStateIds, stateData, fyList, initialMetric]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (selectedCustomerDetail) {
                    setSelectedCustomerDetail(null);
                } else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, selectedCustomerDetail]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard?.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 1800);
    };

    // Compared states list with assigned colors
    const comparedStates = useMemo(() => {
        const list = stateData.filter((s) => activeStateIds.includes(s.stateId));
        return list.map((s, idx) => ({
            ...s,
            color: STATE_PALETTE[idx % STATE_PALETTE.length],
        }));
    }, [stateData, activeStateIds]);

    const currentMetricConfig = useMemo(
        () => METRIC_CONFIGS.find((m) => m.key === activeTab),
        [activeTab]
    );

    // ── Metric Analysis Matrix ──
    const metricAnalysisData = useMemo(() => {
        if (!comparedStates.length || !selectedFyId) return [];

        return METRIC_CONFIGS.map((cfg) => {
            const rawValues = comparedStates.map((s) => cfg.getter(s, selectedFyId));
            const maxVal = Math.max(...rawValues) || 1;

            const bestIdx = rawValues.indexOf(maxVal);
            const bestStateId = comparedStates[bestIdx >= 0 ? bestIdx : 0]?.stateId;

            const stateScores = comparedStates.map((s) => {
                const val = cfg.getter(s, selectedFyId);
                const score = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                return {
                    stateId: s.stateId,
                    stateName: s.stateName,
                    color: s.color,
                    val,
                    score,
                    isBest: s.stateId === bestStateId,
                };
            });

            return {
                ...cfg,
                stateScores,
                bestStateId,
                maxVal,
            };
        });
    }, [comparedStates, selectedFyId]);

    // ── Composite Score per State ──
    const stateCompositeScores = useMemo(() => {
        if (!comparedStates.length) return [];

        return comparedStates.map((st) => {
            let totalScore = 0;
            let count = 0;
            let bestCount = 0;

            metricAnalysisData.forEach((analysis) => {
                const s = analysis.stateScores.find((x) => x.stateId === st.stateId);
                if (s) {
                    totalScore += s.score;
                    count++;
                    if (s.isBest) bestCount++;
                }
            });

            const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
            return {
                ...st,
                compositeScore: avgScore,
                bestCategoriesCount: bestCount,
            };
        });
    }, [comparedStates, metricAnalysisData]);

    // ── Multi-FY comparative chart data for selected metric ──
    const multiFyChartData = useMemo(() => {
        if (!comparedStates.length || !currentMetricConfig || !fyList.length) return [];

        return fyList.map((fy) => {
            const row: any = { fyName: fy.fyName };
            comparedStates.forEach((st) => {
                row[st.stateName] = currentMetricConfig.getter(st, fy.fyId);
            });
            return row;
        });
    }, [comparedStates, currentMetricConfig, fyList]);

    // ── Monthly seasonality chart for selected metric ──
    const monthlySeasonalityData = useMemo(() => {
        if (!comparedStates.length || !selectedFyId) return [];

        return MONTH_LABELS.map((month, idx) => {
            const row: any = { month };
            comparedStates.forEach((st) => {
                const mSales = st.byFy[selectedFyId]?.monthlySales?.[idx] ?? 0;
                row[st.stateName] = mSales;
            });
            return row;
        });
    }, [comparedStates, selectedFyId]);

    // ── All customers across compared states ──
    const allComparedCustomers = useMemo(() => {
        const list: (CustomerDetailItem & { stateName: string; stateColor: string; stateId: string })[] = [];
        comparedStates.forEach((st) => {
            const custs = st.customers || [];
            custs.forEach((c) => {
                list.push({
                    ...c,
                    stateName: st.stateName,
                    stateColor: st.color,
                    stateId: st.stateId,
                });
            });
        });
        return list;
    }, [comparedStates]);

    // ── Filtered & Sorted Customers for Active Tab ──
    const filteredCustomers = useMemo(() => {
        let result = allComparedCustomers;

        if (customerStateFilter !== "ALL") {
            result = result.filter((c) => c.stateId === customerStateFilter);
        }

        if (customerCategoryFilter !== "ALL") {
            result = result.filter((c) => {
                if (customerCategoryFilter === "KEY") return c.category === "Key Account";
                if (customerCategoryFilter === "GROWTH") return c.category === "Growth Account" || (c.salesGrowthPct && c.salesGrowthPct > 20);
                if (customerCategoryFilter === "RISK") return c.category === "High Return Risk" || c.returnsRatioPercent > 8;
                if (customerCategoryFilter === "OUTSTANDING") return c.balance > 0;
                return true;
            });
        }

        if (customerSearch.trim()) {
            const q = customerSearch.toLowerCase().trim();
            result = result.filter(
                (c) =>
                    c.name?.toLowerCase().includes(q) ||
                    c.code?.toLowerCase().includes(q) ||
                    c.city?.toLowerCase().includes(q) ||
                    c.area?.toLowerCase().includes(q) ||
                    c.route?.toLowerCase().includes(q) ||
                    c.gstno?.toLowerCase().includes(q) ||
                    c.phone?.toLowerCase().includes(q) ||
                    c.dlno?.toLowerCase().includes(q) ||
                    c.dsm?.toLowerCase().includes(q) ||
                    c.asm?.toLowerCase().includes(q) ||
                    c.rsm?.toLowerCase().includes(q)
            );
        }

        result = [...result].sort((a, b) => {
            if (customerSortBy === "sales-desc") return b.totalSales - a.totalSales;
            if (customerSortBy === "sales-asc") return a.totalSales - b.totalSales;
            if (customerSortBy === "netsales-desc") return b.totalNetSales - a.totalNetSales;
            if (customerSortBy === "growth-desc") return (b.salesGrowthPct ?? -999) - (a.salesGrowthPct ?? -999);
            if (customerSortBy === "invoices-desc") return b.invoicesCount - a.invoicesCount;
            if (customerSortBy === "balance-desc") return b.balance - a.balance;
            if (customerSortBy === "returns-asc") return a.returnsRatioPercent - b.returnsRatioPercent;
            if (customerSortBy === "name-asc") return a.name.localeCompare(b.name);
            return b.totalSales - a.totalSales;
        });

        return result;
    }, [allComparedCustomers, customerStateFilter, customerCategoryFilter, customerSearch, customerSortBy]);

    // ── Customer KPI Totals ──
    const customerKpis = useMemo(() => {
        const totalCust = filteredCustomers.length;
        const totalSales = filteredCustomers.reduce((sum, c) => sum + c.totalSales, 0);
        const totalNetSales = filteredCustomers.reduce((sum, c) => sum + c.totalNetSales, 0);
        const totalReturns = filteredCustomers.reduce((sum, c) => sum + c.totalReturns, 0);
        const totalInvoices = filteredCustomers.reduce((sum, c) => sum + c.invoicesCount, 0);
        const totalBalance = filteredCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);
        const avgSales = totalCust > 0 ? Math.round(totalSales / totalCust) : 0;

        return {
            totalCust,
            totalSales,
            totalNetSales,
            totalReturns,
            totalInvoices,
            totalBalance,
            avgSales,
        };
    }, [filteredCustomers]);

    // ── Export Comprehensive CSV (Metrics + Customers) ──
    const handleExportCSV = () => {
        if (!comparedStates.length) return;

        const rows: string[] = [];
        rows.push(["MabsolCrm — Territory Radar & Customer Deep-Dive Report"].join(","));
        rows.push([`Generated On: ${new Date().toLocaleString("en-IN")}`].join(","));
        rows.push([`Compared States: ${comparedStates.map((s) => s.stateName).join(" vs ")}`].join(","));
        rows.push("");

        // Section 1: Business Dimensions
        rows.push(["=== 1. TERRITORY DIMENSION COMPARISON ==="].join(","));
        rows.push(["Dimension", ...comparedStates.map((s) => s.stateName), "Leader State"].join(","));
        metricAnalysisData.forEach((item) => {
            const leaderName = comparedStates.find((s) => s.stateId === item.bestStateId)?.stateName || "—";
            const vals = comparedStates.map((s) => {
                const raw = item.getter(s, selectedFyId);
                return item.isCurrency ? String(raw) : item.isScore ? `${raw}/100` : String(raw);
            });
            rows.push([`"${item.label}"`, ...vals, `"${leaderName}"`].join(","));
        });
        rows.push("");

        // Section 2: Detailed Customer Directory
        rows.push(["=== 2. COMPREHENSIVE CUSTOMER DIRECTORY & TURNOVER ==="].join(","));
        const fyHeaders = fyList.map((f) => `Sales ${f.fyName}`);
        rows.push([
            "State",
            "Customer Name",
            "Customer Code",
            "Category",
            "City",
            "District",
            "Area",
            "Route",
            "GSTIN",
            "Drug Lic No",
            "Phone",
            "Email",
            "Address",
            "DSM",
            "ASM",
            "RSM",
            "Gross Sales",
            "Net Sales",
            "Sales Returns",
            "Return %",
            "Invoices Count",
            "Balance",
            "Credit Limit",
            "YoY Growth %",
            ...fyHeaders,
        ].join(","));

        filteredCustomers.forEach((c) => {
            const fyVals = fyList.map((f) => String(c.byFy?.[f.fyId]?.sales ?? 0));
            rows.push([
                `"${c.stateName}"`,
                `"${c.name.replace(/"/g, '""')}"`,
                `"${c.code}"`,
                `"${c.category || "Standard"}"`,
                `"${(c.city || "").replace(/"/g, '""')}"`,
                `"${(c.district || "").replace(/"/g, '""')}"`,
                `"${(c.area || "").replace(/"/g, '""')}"`,
                `"${(c.route || "").replace(/"/g, '""')}"`,
                `"${c.gstno || ""}"`,
                `"${c.dlno || ""}"`,
                `"${c.phone || ""}"`,
                `"${c.email || ""}"`,
                `"${(c.address || "").replace(/"/g, '""')}"`,
                `"${c.dsm || ""}"`,
                `"${c.asm || ""}"`,
                `"${c.rsm || ""}"`,
                String(c.totalSales),
                String(c.totalNetSales),
                String(c.totalReturns),
                `${c.returnsRatioPercent}%`,
                String(c.invoicesCount),
                String(c.balance),
                String(c.creditLimit),
                c.salesGrowthPct !== null ? `${c.salesGrowthPct}%` : "N/A",
                ...fyVals,
            ].join(","));
        });

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Territory_Radar_Customer_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Container */}
            <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-800">
                {/* Top Accent */}
                <div
                    className="h-1.5 w-full transition-colors duration-500"
                    style={{
                        background:
                            activeTab === "all"
                                ? "linear-gradient(90deg, #6366F1, #8B5CF6, #06B6D4, #10B981)"
                                : `linear-gradient(90deg, ${currentMetricConfig?.color || "#6366F1"}, ${currentMetricConfig?.color || "#6366F1"}80)`,
                    }}
                />

                {/* Modal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200/70 bg-slate-50/80 flex-shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                            style={{
                                background:
                                    activeTab === "all"
                                        ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                                        : `linear-gradient(135deg, ${currentMetricConfig?.color || "#6366F1"}, ${currentMetricConfig?.color || "#6366F1"}CC)`,
                                boxShadow: `0 4px 14px ${(currentMetricConfig?.color || "#6366F1") + "35"}`,
                            }}
                        >
                            {activeTab === "all" ? (
                                <FaBalanceScale className="text-sm sm:text-lg" />
                            ) : (
                                currentMetricConfig?.icon
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-slate-900 truncate">
                                    {activeTab === "all"
                                        ? "State Radar & Customer Intelligence"
                                        : `${currentMetricConfig?.label} Deep-Dive`}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    Comparing {comparedStates.length} States
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                                {activeTab === "all"
                                    ? "Multi-dimensional performance matrix, territory radar scores & key customer accounts"
                                    : currentMetricConfig?.description}
                            </p>
                        </div>
                    </div>

                    {/* Actions & FY Filter */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {fyList.length > 1 && (
                            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400">FY:</span>
                                <select
                                    value={selectedFyId}
                                    onChange={(e) => setSelectedFyId(e.target.value)}
                                    className="bg-transparent text-xs font-black text-indigo-600 focus:outline-none cursor-pointer"
                                >
                                    {fyList.map((f) => (
                                        <option key={f.fyId} value={f.fyId}>
                                            {f.fyName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleExportCSV}
                            title="Export Full Territory & Customer Database to CSV"
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all hover:scale-105 active:scale-95 shadow-xs"
                        >
                            <FaDownload size={10} />
                            <span className="hidden xs:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                            title="Close Popup (Esc)"
                        >
                            <FaTimes className="text-sm sm:text-base" />
                        </button>
                    </div>
                </div>

                {/* State Quick Info Bar */}
                <div className="px-3.5 sm:px-6 py-2 bg-indigo-50/40 border-b border-slate-200/60 flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                    <div className="flex items-center gap-1.5 min-w-max">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <FaMapMarkerAlt size={9} className="text-indigo-500" /> Active States:
                        </span>
                        {comparedStates.map((st) => (
                            <span
                                key={st.stateId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs"
                                style={{
                                    background: `${st.color}15`,
                                    color: st.color,
                                    borderColor: `${st.color}40`,
                                }}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                                {st.stateName}
                                <span className="text-[9px] opacity-75 font-normal">
                                    ({st.customers?.length || st.byFy[selectedFyId]?.customersCount || 0} Accounts)
                                </span>
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 whitespace-nowrap">
                        <span>Total Customer Network: <strong className="text-slate-700">{allComparedCustomers.length}</strong></span>
                    </div>
                </div>

                {/* Metric Filter Tabs Bar */}
                <div className="px-3.5 sm:px-6 py-2 bg-white/80 border-b border-slate-200/60 flex-shrink-0 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
                        {/* All Overview */}
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                                activeTab === "all"
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]"
                                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                            }`}
                        >
                            <FaLayerGroup size={11} />
                            <span>All Overview</span>
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-0.5" />

                        {/* Metric pills */}
                        {METRIC_CONFIGS.map((cfg) => {
                            const isSelected = activeTab === cfg.key;
                            return (
                                <button
                                    key={cfg.key}
                                    onClick={() => setActiveTab(cfg.key)}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                                        isSelected
                                            ? "text-white shadow-md scale-[1.02]"
                                            : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                                    }`}
                                    style={
                                        isSelected
                                            ? {
                                                  background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)`,
                                                  boxShadow: `0 4px 12px ${cfg.color}35`,
                                              }
                                            : {}
                                    }
                                >
                                    <span style={{ color: isSelected ? "#fff" : cfg.color }}>{cfg.icon}</span>
                                    <span>{cfg.shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Body Container */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW A: ALL METRICS OVERVIEW & COMPOSITE SCORECARD        */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab === "all" && (
                        <div className="space-y-4 sm:space-y-5">
                            {/* Composite Rank Cards */}
                            <div>
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                                        <FaTrophy className="text-amber-500" />
                                        States Radar Composite Performance Index
                                    </h3>
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">
                                        Normalized relative benchmark
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {stateCompositeScores.map((st) => {
                                        const isTopOverall =
                                            stateCompositeScores.every(
                                                (other) => st.compositeScore >= other.compositeScore
                                            ) && stateCompositeScores.length > 1;

                                        return (
                                            <div
                                                key={st.stateId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 hover:scale-[1.01]"
                                                style={{
                                                    background:
                                                        "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.65))",
                                                    borderColor: `${st.color}35`,
                                                    boxShadow: `0 4px 16px ${st.color}12`,
                                                }}
                                            >
                                                {/* Top Color Accent */}
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: st.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ background: st.color }}
                                                        />
                                                        <span className="font-black text-slate-900 text-sm sm:text-base">
                                                            {st.stateName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            ({st.zoneName})
                                                        </span>
                                                    </div>

                                                    {isTopOverall && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                            <FaTrophy size={8} /> LEADER
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 my-2.5 pt-2 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Radar Score
                                                        </span>
                                                        <div className="flex items-baseline gap-1 mt-0.5">
                                                            <span
                                                                className="text-xl sm:text-2xl font-black"
                                                                style={{ color: st.color }}
                                                            >
                                                                {st.compositeScore}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">/ 100</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Won Dimensions
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-black text-slate-800 mt-0.5 block">
                                                            {st.bestCategoriesCount} of {METRIC_CONFIGS.length} 🏆
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${st.compositeScore}%`,
                                                            background: st.color,
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80 text-[10px] text-slate-500 font-medium">
                                                    <span>Sales: {formatCr(st.totalSales)}</span>
                                                    <span>Accounts: {st.customers?.length || st.byFy[selectedFyId]?.customersCount || 0}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Full Comparative Metric Matrix Table */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/60 flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                                    <div>
                                        <h4 className="text-xs sm:text-[13px] font-black text-slate-800 m-0">
                                            Multi-State Business Dimensions Matrix
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 m-0">
                                            Click any metric row to drill down into its multi-year breakdown &amp; detailed accounts
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 self-start xs:self-auto">
                                        Interactive Drill-down ↵
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[620px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/70 bg-slate-100/50">
                                                <th className="text-left py-2.5 px-3 text-slate-500 font-bold">
                                                    Business Dimension
                                                </th>
                                                {comparedStates.map((st) => (
                                                    <th
                                                        key={st.stateId}
                                                        className="text-right py-2.5 px-3 font-black text-xs"
                                                        style={{ color: st.color }}
                                                    >
                                                        {st.stateName}
                                                    </th>
                                                ))}
                                                <th className="text-center py-2.5 px-3 text-slate-400 font-bold w-24">
                                                    Leader State
                                                </th>
                                                <th className="text-center py-2.5 px-2 text-slate-400 font-bold w-12">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metricAnalysisData.map((item) => {
                                                const leaderStateDoc = comparedStates.find(
                                                    (s) => s.stateId === item.bestStateId
                                                );

                                                return (
                                                    <tr
                                                        key={item.key}
                                                        onClick={() => setActiveTab(item.key)}
                                                        className="border-b border-slate-100/70 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-xs"
                                                                    style={{ background: item.color }}
                                                                >
                                                                    {item.icon}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                                                                        {item.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 line-clamp-1">
                                                                        {item.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {comparedStates.map((st) => {
                                                            const scoreObj = item.stateScores.find(
                                                                (s) => s.stateId === st.stateId
                                                            );
                                                            const rawVal = item.getter(st, selectedFyId);

                                                            return (
                                                                <td key={st.stateId} className="py-3 px-3 text-right">
                                                                    <div className="font-black text-slate-800 text-xs sm:text-[13px]">
                                                                        {item.isCurrency
                                                                            ? formatCr(rawVal)
                                                                            : item.isScore
                                                                            ? `${rawVal}/100`
                                                                            : Number(rawVal).toLocaleString("en-IN")}
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <div className="w-10 sm:w-14 h-1 rounded-full bg-slate-100 overflow-hidden">
                                                                            <div
                                                                                className="h-full rounded-full"
                                                                                style={{
                                                                                    width: `${scoreObj?.score ?? 0}%`,
                                                                                    background: st.color,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[9px] font-bold text-slate-400 w-5 text-right">
                                                                            {scoreObj?.score}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            {leaderStateDoc && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs"
                                                                    style={{
                                                                        background: `${leaderStateDoc.color}15`,
                                                                        color: leaderStateDoc.color,
                                                                        borderColor: `${leaderStateDoc.color}40`,
                                                                    }}
                                                                >
                                                                    <FaTrophy size={8} /> {leaderStateDoc.stateName}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="py-3 px-2 text-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                                                            <FaChevronRight size={10} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Key Accounts Snapshot Widget across Compared States */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0 flex items-center gap-1.5">
                                            <FaStar className="text-amber-500" />
                                            Key Accounts &amp; Leading Customers Snapshot
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-400 m-0">
                                            Top customer accounts driving sales turnover across compared states
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("customers")}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        View All Accounts Directory <FaChevronRight size={9} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {comparedStates.map((st) => {
                                        const custs = st.customers?.slice(0, 3) || [];
                                        return (
                                            <div
                                                key={st.stateId}
                                                className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 space-y-2"
                                            >
                                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ background: st.color }}
                                                        />
                                                        <span className="font-bold text-xs text-slate-800">
                                                            {st.stateName}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {st.customers?.length || 0} Total
                                                    </span>
                                                </div>

                                                {custs.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {custs.map((c, ci) => (
                                                            <div
                                                                key={ci}
                                                                onClick={() => setSelectedCustomerDetail(c)}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer text-[11px]"
                                                            >
                                                                <div className="min-w-0 pr-2">
                                                                    <span className="font-bold text-slate-800 truncate block">
                                                                        {c.name}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 block truncate">
                                                                        {c.city || c.area || c.code}
                                                                    </span>
                                                                </div>
                                                                <span className="font-black text-indigo-600 shrink-0">
                                                                    {formatCr(c.totalSales)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 py-2 text-center">
                                                        No customer records available
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW B: CUSTOMER DIRECTORY & INTELLIGENCE TAB             */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab === "customers" && (
                        <div className="space-y-4 sm:space-y-5">
                            {/* Territory Customer KPI Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                                <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-600 block truncate">
                                        Total Accounts
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {customerKpis.totalCust}
                                    </span>
                                </div>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-600 block truncate">
                                        Total Billed Sales
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {formatCr(customerKpis.totalSales)}
                                    </span>
                                </div>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-teal-50/70 border border-teal-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-teal-600 block truncate">
                                        Net Retained Sales
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {formatCr(customerKpis.totalNetSales)}
                                    </span>
                                </div>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/70 border border-purple-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-purple-600 block truncate">
                                        Avg Sale / Customer
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {formatCr(customerKpis.avgSales)}
                                    </span>
                                </div>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-cyan-50/70 border border-cyan-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-cyan-600 block truncate">
                                        Total Invoices
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {customerKpis.totalInvoices}
                                    </span>
                                </div>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-600 block truncate">
                                        Outstanding Balance
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                                        {formatCr(customerKpis.totalBalance)}
                                    </span>
                                </div>
                            </div>

                            {/* Search, State Filter, Categories & View Controls Toolbar */}
                            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    {/* State Selector Tabs */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                                        <button
                                            onClick={() => setCustomerStateFilter("ALL")}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                                customerStateFilter === "ALL"
                                                    ? "bg-slate-900 text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            All States ({allComparedCustomers.length})
                                        </button>

                                        {comparedStates.map((st) => (
                                            <button
                                                key={st.stateId}
                                                onClick={() => setCustomerStateFilter(st.stateId)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                                    customerStateFilter === st.stateId
                                                        ? "text-white shadow-sm"
                                                        : "bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                                style={
                                                    customerStateFilter === st.stateId
                                                        ? {
                                                              background: st.color,
                                                              borderColor: st.color,
                                                          }
                                                        : {
                                                              borderColor: `${st.color}40`,
                                                          }
                                                }
                                            >
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{
                                                        background:
                                                            customerStateFilter === st.stateId ? "#fff" : st.color,
                                                    }}
                                                />
                                                <span>{st.stateName}</span>
                                                <span className="text-[10px] opacity-80">
                                                    ({st.customers?.length || 0})
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* View Mode & Sort Dropdowns */}
                                    <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                                            <button
                                                onClick={() => setCustomerViewMode("cards")}
                                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    customerViewMode === "cards"
                                                        ? "bg-white text-indigo-600 shadow-xs"
                                                        : "text-slate-500 hover:text-slate-800"
                                                }`}
                                                title="Cards View"
                                            >
                                                <FaThLarge size={12} />
                                            </button>
                                            <button
                                                onClick={() => setCustomerViewMode("table")}
                                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    customerViewMode === "table"
                                                        ? "bg-white text-indigo-600 shadow-xs"
                                                        : "text-slate-500 hover:text-slate-800"
                                                }`}
                                                title="Table View"
                                            >
                                                <FaListUl size={12} />
                                            </button>
                                        </div>

                                        <select
                                            value={customerSortBy}
                                            onChange={(e) => setCustomerSortBy(e.target.value)}
                                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                            <option value="sales-desc">Sort: Highest Sales</option>
                                            <option value="netsales-desc">Sort: Highest Net Sales</option>
                                            <option value="growth-desc">Sort: Highest YoY Growth %</option>
                                            <option value="invoices-desc">Sort: Most Invoices</option>
                                            <option value="balance-desc">Sort: Highest Outstanding</option>
                                            <option value="returns-asc">Sort: Lowest Returns %</option>
                                            <option value="name-asc">Sort: Name (A to Z)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Live Search and Quick Filter Badges */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            placeholder="Search by customer name, code, city, area, route, GSTIN, phone, DSM/ASM..."
                                            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                        {customerSearch && (
                                            <button
                                                onClick={() => setCustomerSearch("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <FaTimes size={10} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide text-[11px]">
                                        {[
                                            { id: "ALL", label: "All Categories" },
                                            { id: "KEY", label: "⭐ Key Accounts" },
                                            { id: "GROWTH", label: "📈 High Growth" },
                                            { id: "RISK", label: "⚠️ High Returns" },
                                            { id: "OUTSTANDING", label: "💳 Outstanding" },
                                        ].map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setCustomerCategoryFilter(cat.id)}
                                                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                                                    customerCategoryFilter === cat.id
                                                        ? "bg-indigo-600 text-white shadow-2xs"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Customer Count / Match Status */}
                            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <span>
                                    Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> customer accounts
                                    {customerSearch && ` matching "${customerSearch}"`}
                                </span>
                                {copiedText && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        <FaCheck size={9} /> Copied {copiedText} to clipboard!
                                    </span>
                                )}
                            </div>

                            {/* ── MODE 1: CUSTOMER CARDS VIEW ── */}
                            {customerViewMode === "cards" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                                    {filteredCustomers.map((cust, idx) => (
                                        <div
                                            key={`${cust.stateId}-${cust.code}-${idx}`}
                                            className="relative rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 flex flex-col justify-between"
                                        >
                                            {/* Top Header Strip */}
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                                                #{idx + 1}
                                                            </span>
                                                            <span
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-black border"
                                                                style={{
                                                                    background: `${cust.stateColor}15`,
                                                                    color: cust.stateColor,
                                                                    borderColor: `${cust.stateColor}35`,
                                                                }}
                                                            >
                                                                {cust.stateName}
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                                                {cust.code}
                                                            </span>
                                                            {cust.category === "Key Account" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                                    <FaStar size={8} /> KEY ACCOUNT
                                                                </span>
                                                            )}
                                                            {cust.category === "Growth Account" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                    <FaArrowUp size={8} /> GROWTH
                                                                </span>
                                                            )}
                                                            {cust.category === "High Return Risk" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                                                    <FaExclamationTriangle size={8} /> RETURN RISK
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Real Customer Name */}
                                                        <h4
                                                            onClick={() => setSelectedCustomerDetail(cust)}
                                                            className="text-sm sm:text-base font-black text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer mt-1.5 truncate"
                                                            title={cust.name}
                                                        >
                                                            {cust.name}
                                                        </h4>
                                                    </div>

                                                    {/* Total Sales Badge */}
                                                    <div className="text-right shrink-0">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                            Total Gross Sales
                                                        </span>
                                                        <span className="text-sm sm:text-base font-black text-indigo-600 block">
                                                            {formatCr(cust.totalSales)}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 block font-mono">
                                                            Exact: {formatINR(cust.totalSales)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Geo & Contact Pills Strip */}
                                                <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                                                    {(cust.city || cust.area) && (
                                                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                                            <FaMapMarkerAlt size={9} className="text-slate-400" />
                                                            {[cust.city, cust.area, cust.route].filter(Boolean).join(" · ")}
                                                        </span>
                                                    )}

                                                    {cust.phone && (
                                                        <a
                                                            href={`tel:${cust.phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md font-medium transition-colors"
                                                            title="Click to Call"
                                                        >
                                                            <FaPhoneAlt size={8} /> {cust.phone}
                                                        </a>
                                                    )}

                                                    {cust.gstno && (
                                                        <button
                                                            onClick={() => handleCopy(cust.gstno!, "GSTIN")}
                                                            className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px] transition-colors"
                                                            title="Click to copy GSTIN"
                                                        >
                                                            <FaBuilding size={8} className="text-slate-400" />
                                                            GST: {cust.gstno}
                                                            <FaCopy size={8} className="text-slate-400 ml-0.5" />
                                                        </button>
                                                    )}

                                                    {cust.dlno && (
                                                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[10px]">
                                                            DL: {cust.dlno}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Financial Stats Matrix */}
                                                <div className="grid grid-cols-4 gap-1.5 my-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-center">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Net Sales</span>
                                                        <span className="text-xs font-black text-emerald-700 block mt-0.5">
                                                            {formatCr(cust.totalNetSales)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Returns</span>
                                                        <span className={`text-xs font-black block mt-0.5 ${cust.returnsRatioPercent > 8 ? "text-rose-600" : "text-slate-700"}`}>
                                                            {cust.returnsRatioPercent}% ({formatCr(cust.totalReturns)})
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Invoices</span>
                                                        <span className="text-xs font-black text-slate-800 block mt-0.5">
                                                            {cust.invoicesCount} Bills
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Balance</span>
                                                        <span className={`text-xs font-black block mt-0.5 ${cust.balance > 0 ? "text-amber-600" : "text-slate-700"}`}>
                                                            {formatCr(cust.balance)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Multi-FY Performance Pill Breakdown */}
                                                {fyList.length > 0 && (
                                                    <div className="space-y-1 my-2">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span className="text-slate-400 font-bold uppercase">Multi-FY Turnover:</span>
                                                            {cust.salesGrowthPct !== null && cust.salesGrowthPct !== undefined && (
                                                                <span className={`font-black ${cust.salesGrowthPct > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                                                    YoY Growth: {cust.salesGrowthPct > 0 ? "+" : ""}{cust.salesGrowthPct}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                                            {fyList.map((fy) => {
                                                                const fSales = cust.byFy?.[fy.fyId]?.sales ?? 0;
                                                                return (
                                                                    <div key={fy.fyId} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100 text-[10px]">
                                                                        <span className="text-slate-500 font-semibold">{fy.fyName}:</span>
                                                                        <span className="font-bold text-slate-800">{formatCr(fSales)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Top Formulations Bought */}
                                                {cust.topProducts && cust.topProducts.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                                                            Top Purchased Formulations:
                                                        </span>
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {cust.topProducts.slice(0, 3).map((p, pi) => (
                                                                <span
                                                                    key={pi}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50/60 border border-indigo-100 text-[10px] font-medium text-slate-700 max-w-[200px] truncate"
                                                                    title={`${p.name} (${p.qty} units, ${formatCr(p.amount)})`}
                                                                >
                                                                    <FaBoxes size={8} className="text-indigo-400 shrink-0" />
                                                                    <span className="truncate">{p.name}</span>
                                                                    <strong className="text-indigo-600 shrink-0">({formatCr(p.amount)})</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    {(cust.dsm || cust.asm || cust.rsm) && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            <FaUserTie size={8} /> Rep: {[cust.dsm, cust.asm, cust.rsm].filter(Boolean).join(" / ")}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => setSelectedCustomerDetail(cust)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                                                >
                                                    <span>View 360° Profile</span>
                                                    <FaChevronRight size={8} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredCustomers.length === 0 && (
                                        <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-2xl border border-slate-200/60">
                                            <FaUserCheck size={32} className="text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-700">No matching customer accounts found</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or state filter</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── MODE 2: CUSTOMER TABLE VIEW ── */}
                            {customerViewMode === "table" && (
                                <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs min-w-[840px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                                                    <th className="py-2.5 px-3 text-left w-12">#</th>
                                                    <th className="py-2.5 px-3 text-left">Customer Name &amp; Code</th>
                                                    <th className="py-2.5 px-3 text-left">Location</th>
                                                    <th className="py-2.5 px-3 text-left">Compliance / Rep</th>
                                                    <th className="py-2.5 px-3 text-right">Gross Sales</th>
                                                    <th className="py-2.5 px-3 text-right">Net Sales</th>
                                                    <th className="py-2.5 px-3 text-right">Returns %</th>
                                                    <th className="py-2.5 px-3 text-right">Invoices</th>
                                                    <th className="py-2.5 px-3 text-right">Balance</th>
                                                    <th className="py-2.5 px-3 text-center w-16">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCustomers.map((cust, idx) => (
                                                    <tr
                                                        key={`${cust.stateId}-${cust.code}-${idx}`}
                                                        onClick={() => setSelectedCustomerDetail(cust)}
                                                        className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                                    >
                                                        <td className="py-2.5 px-3 text-slate-400 font-bold">
                                                            #{idx + 1}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-slate-800 truncate max-w-[200px]">
                                                                {cust.name}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span
                                                                    className="px-1.5 py-0.2 rounded text-[9px] font-black border"
                                                                    style={{
                                                                        background: `${cust.stateColor}15`,
                                                                        color: cust.stateColor,
                                                                        borderColor: `${cust.stateColor}35`,
                                                                    }}
                                                                >
                                                                    {cust.stateName}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    {cust.code}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-600">
                                                            <div className="font-medium truncate max-w-[130px]">
                                                                {cust.city || "—"}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 truncate block">
                                                                {[cust.area, cust.route].filter(Boolean).join(", ") || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {cust.gstno && (
                                                                <div className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]">
                                                                    GST: {cust.gstno}
                                                                </div>
                                                            )}
                                                            {(cust.dsm || cust.asm || cust.rsm) && (
                                                                <span className="text-[9px] text-indigo-600 truncate block">
                                                                    Rep: {[cust.dsm, cust.asm, cust.rsm].filter(Boolean).join("/")}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                                            {formatCr(cust.totalSales)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                                            {formatCr(cust.totalNetSales)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <span className={`font-bold ${cust.returnsRatioPercent > 8 ? "text-rose-600" : "text-slate-600"}`}>
                                                                {cust.returnsRatioPercent}%
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                                                            {cust.invoicesCount}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <span className={`font-bold ${cust.balance > 0 ? "text-amber-600" : "text-slate-600"}`}>
                                                                {formatCr(cust.balance)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedCustomerDetail(cust);
                                                                }}
                                                                className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                                title="View 360° Profile"
                                                            >
                                                                <FaEye size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW C: SPECIFIC METRIC DEEP-DIVE                         */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab !== "all" && activeTab !== "customers" && currentMetricConfig && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* State Cards Strip */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ background: currentMetricConfig.color }}
                                        />
                                        {currentMetricConfig.label} — Cross-State Comparative Totals
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab("all")}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                    >
                                        ← Back to Overview
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {comparedStates.map((st) => {
                                        const rawVal = currentMetricConfig.getter(st, selectedFyId);
                                        const analysisItem = metricAnalysisData.find(
                                            (m) => m.key === currentMetricConfig.key
                                        );
                                        const isBest = analysisItem?.bestStateId === st.stateId;
                                        const scoreObj = analysisItem?.stateScores.find(
                                            (s) => s.stateId === st.stateId
                                        );

                                        return (
                                            <div
                                                key={st.stateId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200"
                                                style={{
                                                    background:
                                                        "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))",
                                                    borderColor: `${st.color}35`,
                                                    boxShadow: `0 4px 18px ${st.color}10`,
                                                }}
                                            >
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: st.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ background: st.color }}
                                                        />
                                                        <span className="font-black text-slate-800 text-sm">
                                                            {st.stateName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            ({st.zoneName})
                                                        </span>
                                                    </div>

                                                    {isBest && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                                            <FaTrophy size={8} /> LEADER
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1">
                                                    <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                                                        {currentMetricConfig.isCurrency
                                                            ? formatCr(rawVal)
                                                            : currentMetricConfig.isScore
                                                            ? `${rawVal}/100`
                                                            : Number(rawVal).toLocaleString("en-IN")}
                                                    </span>
                                                    {currentMetricConfig.isCurrency && (
                                                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                                                            Exact: {formatINR(rawVal)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            YoY Growth
                                                        </span>
                                                        <span className="text-[11px] font-black text-emerald-600">
                                                            {st.salesGrowthPct !== null
                                                                ? `${st.salesGrowthPct > 0 ? "+" : ""}${st.salesGrowthPct}%`
                                                                : "—"}
                                                        </span>
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            Radar Index
                                                        </span>
                                                        <span
                                                            className="text-xs font-black"
                                                            style={{ color: st.color }}
                                                        >
                                                            {scoreObj?.score ?? 0} / 100
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Multi-FY Bar Chart Comparison */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0">
                                            {currentMetricConfig.label} Across Financial Years
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-400 m-0">
                                            Multi-year trajectory comparison between selected states
                                        </p>
                                    </div>
                                </div>

                                <div className="h-[210px] sm:h-[280px] md:h-[310px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={multiFyChartData}
                                            margin={{ top: 10, right: 10, left: isMobile ? -20 : -10, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(100,116,139,0.12)"
                                            />
                                            <XAxis dataKey="fyName" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                            <YAxis
                                                fontSize={isMobile ? 9 : 10}
                                                tick={{ fill: "#64748b" }}
                                                tickFormatter={
                                                    currentMetricConfig.isCurrency
                                                        ? (v) => formatCr(Number(v))
                                                        : (v) => `${v}`
                                                }
                                                width={isMobile ? 44 : 55}
                                            />
                                            <Tooltip
                                                contentStyle={glassTooltipStyle}
                                                formatter={(v: any) =>
                                                    currentMetricConfig.isCurrency
                                                        ? formatCr(Number(v))
                                                        : `${v}`
                                                }
                                            />
                                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                            {comparedStates.map((st) => (
                                                <Bar
                                                    key={st.stateId}
                                                    dataKey={st.stateName}
                                                    name={st.stateName}
                                                    fill={st.color}
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Monthly Seasonality Comparison if Sales/NetSales */}
                            {(currentMetricConfig.key === "sales" || currentMetricConfig.key === "netSales") && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                    <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0">
                                        12-Month Seasonality Comparison (Apr–Mar)
                                    </h4>
                                    <p className="text-[10px] sm:text-[11px] text-slate-400 m-0 mb-3">
                                        Monthly sales volume pattern between compared states
                                    </p>

                                    <div className="h-[200px] sm:h-[250px] md:h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlySeasonalityData} margin={{ left: isMobile ? -20 : -10, right: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                                <XAxis dataKey="month" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                                <YAxis fontSize={isMobile ? 9 : 10} tickFormatter={formatCr} width={isMobile ? 44 : 55} tick={{ fill: "#64748b" }} />
                                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatCr(Number(v))} />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                                {comparedStates.map((st) => (
                                                    <Bar key={st.stateId} dataKey={st.stateName} name={st.stateName} fill={st.color} radius={[3, 3, 0, 0]} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Top Formulations in these States */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {comparedStates.map((st) => (
                                    <div
                                        key={st.stateId}
                                        className="rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 sm:p-4 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-100">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ background: st.color }}
                                            />
                                            <span className="font-black text-slate-800 text-xs sm:text-sm">
                                                {st.stateName} — Top Formulations
                                            </span>
                                        </div>

                                        {st.topProducts && st.topProducts.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {st.topProducts.slice(0, 5).map((p, pi) => (
                                                    <div
                                                        key={pi}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 text-[11px]"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <FaBoxes size={10} className="text-slate-400 shrink-0" />
                                                            <span className="font-bold text-slate-700 truncate max-w-[130px] sm:max-w-[160px]">
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="font-black text-slate-900 block">
                                                                {formatCr(p.amount)}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {p.qty.toLocaleString("en-IN")} Qty
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-400 py-3 text-center">
                                                No specific product breakdown available
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/70 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <FaInfoCircle className="text-indigo-500 shrink-0" />
                        <span>State radar normalized scores and customer directory evaluate real commercial performance across territories.</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* CUSTOMER 360° PROFILE MODAL                                  */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {selectedCustomerDetail && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-[fadeIn_0.15s_ease-out]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedCustomerDetail(null);
                    }}
                >
                    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
                        {/* 360 Top Accent */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                        {/* 360 Header */}
                        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700">
                                        {selectedCustomerDetail.state}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                        {selectedCustomerDetail.code}
                                    </span>
                                    {selectedCustomerDetail.category && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                            {selectedCustomerDetail.category}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base sm:text-xl font-black text-slate-900 mt-1">
                                    {selectedCustomerDetail.name}
                                </h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <FaMapMarkerAlt size={10} className="text-slate-400" />
                                    {[selectedCustomerDetail.city, selectedCustomerDetail.district, selectedCustomerDetail.area].filter(Boolean).join(" · ")}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedCustomerDetail(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* 360 Body Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                            {/* Key Financial KPIs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                                    <span className="text-[10px] font-bold uppercase text-indigo-600 block">Total Gross Sales</span>
                                    <span className="text-lg font-black text-slate-900 block mt-0.5">{formatCr(selectedCustomerDetail.totalSales)}</span>
                                    <span className="text-[9px] text-slate-400 font-mono block">{formatINR(selectedCustomerDetail.totalSales)}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">Net Retained Sales</span>
                                    <span className="text-lg font-black text-slate-900 block mt-0.5">{formatCr(selectedCustomerDetail.totalNetSales)}</span>
                                    <span className="text-[9px] text-slate-400 font-mono block">{formatINR(selectedCustomerDetail.totalNetSales)}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
                                    <span className="text-[10px] font-bold uppercase text-rose-600 block">Returns &amp; Ratio</span>
                                    <span className="text-lg font-black text-slate-900 block mt-0.5">{selectedCustomerDetail.returnsRatioPercent}%</span>
                                    <span className="text-[9px] text-slate-400 block">{formatCr(selectedCustomerDetail.totalReturns)} total</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                                    <span className="text-[10px] font-bold uppercase text-amber-600 block">Current Balance</span>
                                    <span className="text-lg font-black text-slate-900 block mt-0.5">{formatCr(selectedCustomerDetail.balance)}</span>
                                    <span className="text-[9px] text-slate-400 block">{selectedCustomerDetail.invoicesCount} Invoices</span>
                                </div>
                            </div>

                            {/* Contact & Compliance Card */}
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                                <h4 className="font-black text-slate-800 flex items-center gap-1.5 text-xs sm:text-[13px]">
                                    <FaAddressCard className="text-indigo-600" />
                                    Contact &amp; Compliance Details
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">Phone Number</span>
                                        {selectedCustomerDetail.phone ? (
                                            <a href={`tel:${selectedCustomerDetail.phone}`} className="font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                                                <FaPhoneAlt size={10} /> {selectedCustomerDetail.phone}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </div>

                                    <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">GSTIN Number</span>
                                        <span className="font-mono font-bold text-slate-800 block mt-0.5">
                                            {selectedCustomerDetail.gstno || "Unregistered / N/A"}
                                        </span>
                                    </div>

                                    <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">Drug License No.</span>
                                        <span className="font-bold text-slate-800 block mt-0.5">
                                            {selectedCustomerDetail.dlno || "—"}
                                        </span>
                                    </div>

                                    <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">Territory &amp; Field Staff</span>
                                        <span className="font-bold text-slate-800 block mt-0.5">
                                            {[
                                                selectedCustomerDetail.dsm && `DSM: ${selectedCustomerDetail.dsm}`,
                                                selectedCustomerDetail.asm && `ASM: ${selectedCustomerDetail.asm}`,
                                                selectedCustomerDetail.rsm && `RSM: ${selectedCustomerDetail.rsm}`,
                                            ].filter(Boolean).join(" · ") || "General Territory"}
                                        </span>
                                    </div>

                                    <div className="sm:col-span-2 p-2 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">Registered Address</span>
                                        <span className="text-slate-700 block mt-0.5">
                                            {[selectedCustomerDetail.address, selectedCustomerDetail.city, selectedCustomerDetail.district, selectedCustomerDetail.state, selectedCustomerDetail.pincode].filter(Boolean).join(", ") || "No address recorded"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Multi-FY Breakdown */}
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80">
                                <h4 className="font-black text-slate-800 mb-2 flex items-center gap-1.5">
                                    <FaChartLine className="text-indigo-600" />
                                    Financial Year Turnover History
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {fyList.map((fy) => {
                                        const fyStat = selectedCustomerDetail.byFy?.[fy.fyId];
                                        return (
                                            <div key={fy.fyId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase block">{fy.fyName}</span>
                                                <span className="text-sm font-black text-slate-900 block mt-0.5">
                                                    {formatCr(fyStat?.sales ?? 0)}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                                    {fyStat?.invoicesCount ?? 0} Invoices
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Purchased Products */}
                            {selectedCustomerDetail.topProducts && selectedCustomerDetail.topProducts.length > 0 && (
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80">
                                    <h4 className="font-black text-slate-800 mb-2 flex items-center gap-1.5">
                                        <FaBoxes className="text-indigo-600" />
                                        Formulations Purchased Breakdown
                                    </h4>

                                    <div className="space-y-1.5">
                                        {selectedCustomerDetail.topProducts.map((p, pi) => (
                                            <div key={pi} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        #{pi + 1}
                                                    </span>
                                                    <span className="font-bold text-slate-800 truncate">{p.name}</span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-black text-slate-900 block">{formatCr(p.amount)}</span>
                                                    <span className="text-[9px] text-slate-400">{p.qty.toLocaleString("en-IN")} Qty</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 360 Footer */}
                        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                            <button
                                onClick={() => setSelectedCustomerDetail(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
