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
    FaUndo,
    FaCalendarAlt,
    FaDownload,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaInfoCircle,
    FaCheckCircle,
    FaChartBar,
    FaPercentage,
    FaLayerGroup,
    FaChevronRight,
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
type FYSummary = {
    totalSales: number;
    netSales: number;
    salesReturns: number;
    totalPurchases: number;
    totalCollections: number;
    totalPayments: number;
    returnsRatioPercent: number;
    collectionEfficiencyPercent: number;
};

type MonthlyRow = {
    monthLabel: string;
    monthIndex: number;
    sales: number;
    purchase: number;
    returns: number;
    collections: number;
    payments: number;
};

type QuarterRow = {
    quarter: string;
    sales: number;
    purchase: number;
    collections: number;
    returns: number;
};

type FYData = {
    fyId: string;
    fyName: string;
    fyCode: string;
    startDate: string;
    endDate: string;
    color: string;
    summary: FYSummary;
    monthlyBreakdown: MonthlyRow[];
    quarterlyBreakdown: QuarterRow[];
    topProducts?: any[];
    companyBreakdown?: any[];
};

interface FYRadarDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    fyData: FYData[];
    initialMetric?: string | null;
}

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const METRIC_CONFIGS: {
    key: string;
    label: string;
    shortLabel: string;
    summaryKey: keyof FYSummary;
    monthlyKey?: keyof MonthlyRow;
    color: string;
    icon: React.ReactNode;
    description: string;
    lowerIsBetter?: boolean;
    isPercent?: boolean;
}[] = [
    {
        key: "totalSales",
        label: "Gross Sales",
        shortLabel: "Sales",
        summaryKey: "totalSales",
        monthlyKey: "sales",
        color: "#6366F1",
        icon: <FaRupeeSign size={12} />,
        description: "Total invoice billing revenue across all transactions before returns",
    },
    {
        key: "netSales",
        label: "Net Sales",
        shortLabel: "Net Sales",
        summaryKey: "netSales",
        monthlyKey: "sales", // computed as sales - returns
        color: "#10B981",
        icon: <FaChartLine size={12} />,
        description: "Actual retained revenue (Gross Sales minus Sales Returns / Credit Notes)",
    },
    {
        key: "totalCollections",
        label: "Collections",
        shortLabel: "Collections",
        summaryKey: "totalCollections",
        monthlyKey: "collections",
        color: "#06B6D4",
        icon: <FaWallet size={12} />,
        description: "Cash & bank receipts realized from customers and debtors",
    },
    {
        key: "totalPurchases",
        label: "Purchases",
        shortLabel: "Purchases",
        summaryKey: "totalPurchases",
        monthlyKey: "purchase",
        color: "#F59E0B",
        icon: <FaShoppingBag size={12} />,
        description: "Inventory procurement and stock acquisitions from suppliers",
    },
    {
        key: "salesReturns",
        label: "Sales Returns (CN)",
        shortLabel: "Returns",
        summaryKey: "salesReturns",
        monthlyKey: "returns",
        color: "#EF4444",
        icon: <FaUndo size={12} />,
        description: "Customer returns, damaged items, and issued credit notes",
        lowerIsBetter: true,
    },
    {
        key: "totalPayments",
        label: "Payments",
        shortLabel: "Payments",
        summaryKey: "totalPayments",
        monthlyKey: "payments",
        color: "#8B5CF6",
        icon: <FaRupeeSign size={12} />,
        description: "Outgoing payments made towards supplier dues and expenses",
    },
    {
        key: "collectionEfficiencyPercent",
        label: "Collection Efficiency",
        shortLabel: "Coll. Eff.",
        summaryKey: "collectionEfficiencyPercent",
        color: "#14B8A6",
        icon: <FaPercentage size={12} />,
        description: "Percentage ratio of collections realized against gross sales volume",
        isPercent: true,
    },
    {
        key: "returnsRatioPercent",
        label: "Returns Ratio %",
        shortLabel: "Returns %",
        summaryKey: "returnsRatioPercent",
        color: "#F43F5E",
        icon: <FaUndo size={12} />,
        description: "Proportion of sales returned as credit notes against gross turnover",
        lowerIsBetter: true,
        isPercent: true,
    },
];

// Helper formatters
const formatINR = (n: number) =>
    "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n ?? 0));

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};

const growthPct = (curr: number, prev: number): number | null => {
    if (!prev) return null;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
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

export default function FYRadarDetailModal({
    isOpen,
    onClose,
    fyData,
    initialMetric,
}: FYRadarDetailModalProps) {
    const isMobile = useIsMobile(640);
    // Metric filter state: "all" or specific metric key (e.g., "totalSales", "totalCollections")
    const [activeTab, setActiveTab] = useState<string>("all");

    // Sync initialMetric when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialMetric) {
                const search = initialMetric.toLowerCase().trim();
                const matched = METRIC_CONFIGS.find(
                    (m) =>
                        m.key.toLowerCase() === search ||
                        m.label.toLowerCase() === search ||
                        m.shortLabel.toLowerCase() === search ||
                        m.summaryKey.toLowerCase() === search ||
                        m.label.toLowerCase().includes(search) ||
                        m.shortLabel.toLowerCase().includes(search) ||
                        search.includes(m.shortLabel.toLowerCase()) ||
                        (search === "purchase" && m.key === "totalPurchases") ||
                        (search === "returns" && m.key === "salesReturns") ||
                        (search === "sales" && m.key === "totalSales")
                );
                setActiveTab(matched ? matched.key : "all");
            } else {
                setActiveTab("all");
            }
        }
    }, [isOpen, initialMetric]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Selected metric config
    const currentMetricConfig = useMemo(
        () => METRIC_CONFIGS.find((m) => m.key === activeTab),
        [activeTab]
    );

    // ── Metrics for the Radar Normalized Analysis ──
    const radarMetricsList = useMemo(() => {
        return METRIC_CONFIGS.filter(
            (m) =>
                m.key === "totalSales" ||
                m.key === "netSales" ||
                m.key === "totalCollections" ||
                m.key === "totalPurchases" ||
                m.key === "salesReturns" ||
                m.key === "totalPayments"
        );
    }, []);

    // ── Calculate Normalized Scores & Winner for each metric ──
    const metricAnalysisData = useMemo(() => {
        if (!fyData || fyData.length === 0) return [];

        return METRIC_CONFIGS.map((cfg) => {
            const rawValues = fyData.map((f) => Number(f.summary[cfg.summaryKey] ?? 0));
            const maxVal = Math.max(...rawValues) || 1;
            const minVal = Math.min(...rawValues);

            let bestFyId = "";
            if (cfg.lowerIsBetter) {
                // Lower is better (e.g., returns)
                const nonZero = rawValues.filter((v) => v > 0);
                const targetMin = nonZero.length > 0 ? Math.min(...nonZero) : minVal;
                const bestIdx = rawValues.indexOf(targetMin);
                bestFyId = fyData[bestIdx >= 0 ? bestIdx : 0]?.fyId;
            } else {
                const bestIdx = rawValues.indexOf(maxVal);
                bestFyId = fyData[bestIdx >= 0 ? bestIdx : 0]?.fyId;
            }

            const fyScores = fyData.map((f) => {
                const val = Number(f.summary[cfg.summaryKey] ?? 0);
                // Normalized score out of 100 exactly as shown on the radar chart
                const score = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                return {
                    fyId: f.fyId,
                    fyName: f.fyName,
                    color: f.color,
                    val,
                    score,
                    isBest: f.fyId === bestFyId,
                };
            });

            return {
                ...cfg,
                fyScores,
                bestFyId,
                maxVal,
            };
        });
    }, [fyData]);

    // ── Overall Composite Performance Index ──
    const fyCompositeScores = useMemo(() => {
        if (!fyData || fyData.length === 0) return [];

        return fyData.map((fy) => {
            let totalScore = 0;
            let count = 0;
            let bestCount = 0;

            metricAnalysisData.forEach((analysis) => {
                const s = analysis.fyScores.find((x) => x.fyId === fy.fyId);
                if (s) {
                    totalScore += s.score;
                    count++;
                    if (s.isBest) bestCount++;
                }
            });

            const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
            return {
                ...fy,
                compositeScore: avgScore,
                bestCategoriesCount: bestCount,
            };
        });
    }, [fyData, metricAnalysisData]);

    // ── Monthly comparison data for selected metric ──
    const monthlyComparisonChartData = useMemo(() => {
        if (!fyData || fyData.length === 0 || !currentMetricConfig) return [];

        return MONTH_LABELS.map((month, idx) => {
            const row: any = { month };
            fyData.forEach((fy) => {
                const m = fy.monthlyBreakdown?.find((r) => r.monthIndex === idx);
                let val = 0;
                if (currentMetricConfig.key === "netSales") {
                    val = (m?.sales ?? 0) - (m?.returns ?? 0);
                } else if (currentMetricConfig.key === "collectionEfficiencyPercent") {
                    val = m?.sales ? Math.round(((m?.collections ?? 0) / m.sales) * 100) : 0;
                } else if (currentMetricConfig.key === "returnsRatioPercent") {
                    val = m?.sales ? Math.round(((m?.returns ?? 0) / m.sales) * 100) : 0;
                } else if (currentMetricConfig.monthlyKey && m) {
                    val = Number((m as any)[currentMetricConfig.monthlyKey] ?? 0);
                }
                row[`${fy.fyName}`] = val;
                row[`${fy.fyName}_raw`] = val;
            });
            return row;
        });
    }, [fyData, currentMetricConfig]);

    // ── Export Deep-Dive CSV ──
    const handleExportCSV = () => {
        if (!fyData || fyData.length === 0) return;

        const rows: string[] = [];
        rows.push(["MabsolCrm — Financial Year Radar Deep-Dive Report"].join(","));
        rows.push([`Generated On: ${new Date().toLocaleString("en-IN")}`].join(","));
        rows.push("");

        if (activeTab === "all") {
            rows.push(["Metric", ...fyData.map((f) => f.fyName), "Best Performer"].join(","));
            metricAnalysisData.forEach((item) => {
                const bestName = fyData.find((f) => f.fyId === item.bestFyId)?.fyName || "—";
                const values = fyData.map((f) => {
                    const raw = (f.summary as any)[item.summaryKey];
                    return item.isPercent ? `${raw}%` : String(raw);
                });
                rows.push([item.label, ...values, bestName].join(","));
            });

            rows.push("");
            rows.push(["Normalized Radar Scores (0-100 Scale)", ...fyData.map((f) => f.fyName)].join(","));
            metricAnalysisData.forEach((item) => {
                const scores = item.fyScores.map((s) => String(s.score));
                rows.push([item.label, ...scores].join(","));
            });
        } else if (currentMetricConfig) {
            rows.push([`Deep Dive: ${currentMetricConfig.label}`].join(","));
            rows.push(["Summary Metric", ...fyData.map((f) => f.fyName)].join(","));
            rows.push([
                "Total",
                ...fyData.map((f) => String((f.summary as any)[currentMetricConfig.summaryKey])),
            ].join(","));

            rows.push("");
            rows.push(["Monthly Breakdown", ...fyData.map((f) => f.fyName)].join(","));
            MONTH_LABELS.forEach((m, idx) => {
                const mRow = monthlyComparisonChartData[idx];
                const vals = fyData.map((f) => String(mRow?.[f.fyName] ?? 0));
                rows.push([m, ...vals].join(","));
            });
        }

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FY_Radar_DeepDive_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Box */}
            <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-800">
                {/* Top Subtle Gradient Accent */}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200/70 bg-slate-50/70 flex-shrink-0">
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
                                        ? "Radar View — Performance Deep Dive"
                                        : `${currentMetricConfig?.label} Comparison`}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    {fyData.length} Financial Years
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                                {activeTab === "all"
                                    ? "Comprehensive multi-dimensional scorecard, relative strength & performance matrix"
                                    : currentMetricConfig?.description}
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                            onClick={handleExportCSV}
                            title="Export Detailed Report to CSV"
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

                {/* Metric Filter Tabs Bar */}
                <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-white/80 border-b border-slate-200/60 flex-shrink-0 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
                        {/* Overview Tab */}
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

                        {/* Metric-specific tabs */}
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
                    {/* VIEW A: ALL METRICS OVERVIEW & SCORECARD                  */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab === "all" && (
                        <div className="space-y-4 sm:space-y-5">
                            {/* FY Composite Rank Cards */}
                            <div>
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                                        <FaTrophy className="text-amber-500" />
                                        Financial Years Overall Radar Composite Index
                                    </h3>
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">
                                        Normalized cross-metric relative strength
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {fyCompositeScores.map((fy, i) => {
                                        const isTopOverall =
                                            fyCompositeScores.every(
                                                (other) => fy.compositeScore >= other.compositeScore
                                            ) && fyCompositeScores.length > 1;

                                        return (
                                            <div
                                                key={fy.fyId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 hover:scale-[1.01]"
                                                style={{
                                                    background: `linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))`,
                                                    borderColor: `${fy.color}35`,
                                                    boxShadow: `0 4px 16px ${fy.color}12`,
                                                }}
                                            >
                                                {/* Top color bar */}
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: fy.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ background: fy.color }}
                                                        />
                                                        <span className="font-black text-slate-900 text-sm sm:text-base">
                                                            {fy.fyName}
                                                        </span>
                                                    </div>
                                                    {isTopOverall && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                            <FaTrophy size={8} /> LEADER
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Metrics summary inside card */}
                                                <div className="grid grid-cols-2 gap-2 my-2.5 pt-2 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Radar Score
                                                        </span>
                                                        <div className="flex items-baseline gap-1 mt-0.5">
                                                            <span
                                                                className="text-xl sm:text-2xl font-black"
                                                                style={{ color: fy.color }}
                                                            >
                                                                {fy.compositeScore}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">/ 100</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Won Categories
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-black text-slate-800 mt-0.5 block">
                                                            {fy.bestCategoriesCount} of {radarMetricsList.length} 🏆
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${fy.compositeScore}%`,
                                                            background: fy.color,
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80 text-[10px] text-slate-500 font-medium">
                                                    <span>Gross Sales: {formatCr(fy.summary.totalSales)}</span>
                                                    <span>Coll: {formatCr(fy.summary.totalCollections)}</span>
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
                                            Comprehensive Radar Metric Comparison Matrix
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 m-0">
                                            Click any metric row to drill down into its monthly trends &amp; analysis
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
                                                    Metric Category
                                                </th>
                                                {fyData.map((fy) => (
                                                    <th
                                                        key={fy.fyId}
                                                        className="text-right py-2.5 px-3 font-black text-xs"
                                                        style={{ color: fy.color }}
                                                    >
                                                        {fy.fyName}
                                                    </th>
                                                ))}
                                                <th className="text-center py-2.5 px-3 text-slate-400 font-bold w-24">
                                                    Best FY
                                                </th>
                                                <th className="text-center py-2.5 px-2 text-slate-400 font-bold w-12">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metricAnalysisData.map((item) => {
                                                const bestFYDoc = fyData.find((f) => f.fyId === item.bestFyId);

                                                return (
                                                    <tr
                                                        key={item.key}
                                                        onClick={() => setActiveTab(item.key)}
                                                        className="border-b border-slate-100/70 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                    >
                                                        {/* Metric Name */}
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

                                                        {/* Values for each FY */}
                                                        {fyData.map((fy) => {
                                                            const scoreObj = item.fyScores.find(
                                                                (s) => s.fyId === fy.fyId
                                                            );
                                                            const rawVal = (fy.summary as any)[item.summaryKey];

                                                            return (
                                                                <td key={fy.fyId} className="py-3 px-3 text-right">
                                                                    <div className="font-black text-slate-800 text-xs sm:text-[13px]">
                                                                        {item.isPercent
                                                                            ? `${rawVal}%`
                                                                            : formatCr(rawVal)}
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <div className="w-10 sm:w-14 h-1 rounded-full bg-slate-100 overflow-hidden">
                                                                            <div
                                                                                className="h-full rounded-full"
                                                                                style={{
                                                                                    width: `${scoreObj?.score ?? 0}%`,
                                                                                    background: fy.color,
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

                                                        {/* Best Performer Badge */}
                                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            {bestFYDoc && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs"
                                                                    style={{
                                                                        background: `${bestFYDoc.color}15`,
                                                                        color: bestFYDoc.color,
                                                                        borderColor: `${bestFYDoc.color}40`,
                                                                    }}
                                                                >
                                                                    <FaTrophy size={8} /> {bestFYDoc.fyName}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Action Arrow */}
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
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW B: SPECIFIC METRIC DEEP-DIVE                         */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab !== "all" && currentMetricConfig && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* FY Cards for this metric */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ background: currentMetricConfig.color }}
                                        />
                                        {currentMetricConfig.label} — Cross FY Totals &amp; Score
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab("all")}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                    >
                                        ← Back to Overview
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {fyData.map((fy, fyIdx) => {
                                        const rawVal = Number(
                                            (fy.summary as any)[currentMetricConfig.summaryKey] ?? 0
                                        );
                                        const prevFY = fyData[fyIdx - 1];
                                        const prevVal = prevFY
                                            ? Number(
                                                  (prevFY.summary as any)[
                                                      currentMetricConfig.summaryKey
                                                  ] ?? 0
                                              )
                                            : undefined;
                                        const growth =
                                            prevVal !== undefined
                                                ? growthPct(rawVal, prevVal)
                                                : null;

                                        const analysisItem = metricAnalysisData.find(
                                            (m) => m.key === currentMetricConfig.key
                                        );
                                        const isBest = analysisItem?.bestFyId === fy.fyId;
                                        const scoreObj = analysisItem?.fyScores.find(
                                            (s) => s.fyId === fy.fyId
                                        );

                                        return (
                                            <div
                                                key={fy.fyId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200"
                                                style={{
                                                    background:
                                                        "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))",
                                                    borderColor: `${fy.color}35`,
                                                    boxShadow: `0 4px 18px ${fy.color}10`,
                                                }}
                                            >
                                                {/* Top accent line */}
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: fy.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ background: fy.color }}
                                                        />
                                                        <span className="font-black text-slate-800 text-sm">
                                                            {fy.fyName}
                                                        </span>
                                                    </div>

                                                    {isBest && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                                            <FaTrophy size={8} /> BEST PERFORMER
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Amount */}
                                                <div className="mt-1">
                                                    <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                                                        {currentMetricConfig.isPercent
                                                            ? `${rawVal}%`
                                                            : formatCr(rawVal)}
                                                    </span>
                                                    {!currentMetricConfig.isPercent && (
                                                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                                                            Exact: {formatINR(rawVal)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* YoY Growth Badge & Normalized Score */}
                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            YoY Growth
                                                        </span>
                                                        {growth !== null ? (
                                                            <span
                                                                className={`inline-flex items-center gap-0.5 text-[11px] font-black ${
                                                                    currentMetricConfig.lowerIsBetter
                                                                        ? growth < 0
                                                                            ? "text-emerald-600"
                                                                            : "text-rose-600"
                                                                        : growth > 0
                                                                        ? "text-emerald-600"
                                                                        : "text-rose-600"
                                                                }`}
                                                            >
                                                                {growth > 0 ? (
                                                                    <FaArrowUp size={8} />
                                                                ) : growth < 0 ? (
                                                                    <FaArrowDown size={8} />
                                                                ) : (
                                                                    <FaMinus size={8} />
                                                                )}
                                                                {Math.abs(growth)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300">—</span>
                                                        )}
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            Radar Score
                                                        </span>
                                                        <span
                                                            className="text-xs font-black"
                                                            style={{ color: fy.color }}
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

                            {/* Monthly Bar / Area Chart Comparison */}
                            {currentMetricConfig.monthlyKey && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0">
                                                Monthly {currentMetricConfig.label} Trend (Apr–Mar)
                                            </h4>
                                            <p className="text-[10px] sm:text-[11px] text-slate-400 m-0">
                                                Aligned comparison of each month across all selected financial years
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-[210px] sm:h-[280px] md:h-[310px] w-full mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={monthlyComparisonChartData}
                                                margin={{ top: 10, right: 10, left: isMobile ? -20 : -10, bottom: 0 }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="rgba(100,116,139,0.12)"
                                                />
                                                <XAxis
                                                    dataKey="month"
                                                    fontSize={isMobile ? 9 : 10}
                                                    tick={{ fill: "#64748b" }}
                                                />
                                                <YAxis
                                                    fontSize={isMobile ? 9 : 10}
                                                    tick={{ fill: "#64748b" }}
                                                    tickFormatter={
                                                        currentMetricConfig.isPercent
                                                            ? (v) => `${v}%`
                                                            : (v) => formatCr(Number(v))
                                                    }
                                                    width={isMobile ? 44 : 55}
                                                />
                                                <Tooltip
                                                    contentStyle={glassTooltipStyle}
                                                    formatter={(v: any) =>
                                                        currentMetricConfig.isPercent
                                                            ? `${v}%`
                                                            : formatCr(Number(v))
                                                    }
                                                />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                                {fyData.map((fy) => (
                                                    <Bar
                                                        key={fy.fyId}
                                                        dataKey={fy.fyName}
                                                        name={fy.fyName}
                                                        fill={fy.color}
                                                        radius={[4, 4, 0, 0]}
                                                    />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Monthly Breakdown Table */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/60">
                                    <h4 className="text-xs sm:text-[13px] font-black text-slate-800 m-0">
                                        Month-by-Month Data Breakdown
                                    </h4>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 m-0">
                                        Exact figures for each month with comparative volume
                                    </p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[550px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/70 bg-slate-100/50">
                                                <th className="text-left py-2 px-3 text-slate-500 font-bold">
                                                    Month
                                                </th>
                                                {fyData.map((fy) => (
                                                    <th
                                                        key={fy.fyId}
                                                        className="text-right py-2 px-3 font-black"
                                                        style={{ color: fy.color }}
                                                    >
                                                        {fy.fyName}
                                                    </th>
                                                ))}
                                                {fyData.length === 2 && (
                                                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                                                        Growth
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {MONTH_LABELS.map((month, idx) => {
                                                const mRow = monthlyComparisonChartData[idx];
                                                const v0 = mRow?.[fyData[0]?.fyName] ?? 0;
                                                const v1 = fyData[1]
                                                    ? mRow?.[fyData[1]?.fyName] ?? 0
                                                    : undefined;
                                                const growth =
                                                    v1 !== undefined ? growthPct(v1, v0) : null;

                                                return (
                                                    <tr
                                                        key={month}
                                                        className="border-b border-slate-100/60 hover:bg-slate-50/60 transition-colors"
                                                    >
                                                        <td className="py-2.5 px-3 font-bold text-slate-700">
                                                            {month}
                                                        </td>
                                                        {fyData.map((fy) => {
                                                            const val = mRow?.[fy.fyName] ?? 0;
                                                            return (
                                                                <td
                                                                    key={fy.fyId}
                                                                    className="py-2.5 px-3 text-right font-semibold text-slate-800"
                                                                >
                                                                    {currentMetricConfig.isPercent
                                                                        ? `${val}%`
                                                                        : formatCr(val)}
                                                                </td>
                                                            );
                                                        })}
                                                        {growth !== null && (
                                                            <td className="py-2.5 px-3 text-right">
                                                                <span
                                                                    className={`inline-flex items-center gap-0.5 font-bold text-[10px] ${
                                                                        growth > 0
                                                                            ? "text-emerald-600"
                                                                            : growth < 0
                                                                            ? "text-rose-600"
                                                                            : "text-slate-400"
                                                                    }`}
                                                                >
                                                                    {growth > 0 ? "+" : ""}
                                                                    {growth}%
                                                                </span>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/70 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <FaInfoCircle className="text-indigo-500 shrink-0" />
                        <span>Radar normalized scores are calculated relative to the top FY performance in each category.</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
