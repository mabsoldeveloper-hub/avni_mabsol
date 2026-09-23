/**
 * app/dashboard/compare/page.tsx
 * ---------------------------------------------------------------------------
 * High-End Financial Comparison Dashboard — "Liquid Glass" theme
 * WITH Area / Route / DSM / ASM / RSM territory filters
 * ---------------------------------------------------------------------------
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaRupeeSign,
    FaChartLine,
    FaShoppingBag,
    FaUndo,
    FaWallet,
    FaBoxes,
    FaCalendarAlt,
    FaSync,
    FaFilter,
    FaTimes,
    FaUserTie,
    FaRoute,
    FaGlobeAsia,
    FaChevronDown,
    FaChevronUp,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

const COLORS = [
    "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#06B6D4", "#EC4899", "#84CC16", "#FB923C", "#6366F1",
];

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

// Shared glassy tooltip style for all recharts <Tooltip />
const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(31,41,55,0.12)",
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 600,
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

type DashboardData = {
    salesVsPurchase: { month: string; sales: number; purchase: number }[];
    collectionVsOutstanding: {
        collectionsMonthly: { month: string; debit: number; credit: number }[];
        totalOutstanding: number;
        totalPendingInvoices: number;
        aging: { bucket: string; totalBalance: number; count: number }[];
    };
    productComparison: { code: number; productName: string; qty: number; amount: number }[];
    companyComparison: { company: string; qty: number; amount: number }[];
    monthlyComparison: { month: string; totalAmount: number; count: number }[];
    quarterlyComparison: { label: string; totalAmount: number; count: number }[];
};

type SummaryData = {
    totalSales: number;
    salesReturns: number;
    netSales: number;
    totalPurchases: number;
    totalOutstanding: number;
    totalPendingInvoices: number;
    totalCollections: number;
    totalPayments: number;
};

type OptionItem = {
    name: string;
    count: number;
};

type FilterOptions = {
    states: OptionItem[];
    areas: OptionItem[];
    routes: OptionItem[];
    dsms: OptionItem[];
    asms: OptionItem[];
    rsms: OptionItem[];
};

/** Glass card shell */
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="relative rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="mb-4 sm:mb-5">
                <h4 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight m-0">{title}</h4>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5 m-0">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function StatCard({
    label,
    value,
    subtext,
    icon,
}: {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="relative rounded-[22px] sm:rounded-[26px] border border-white/60 bg-white/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(31,41,55,0.06)] p-4 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</p>
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    {icon}
                </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">{value}</p>
            {subtext && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{subtext}</p>}
        </div>
    );
}

function AmbientBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#EEF2FB]">
            <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-blue-400/40 blur-[110px]" />
            <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-purple-400/30 blur-[110px]" />
            <div className="absolute bottom-[-160px] left-1/3 w-[560px] h-[560px] rounded-full bg-emerald-300/30 blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[380px] h-[380px] rounded-full bg-pink-300/30 blur-[100px]" />
        </div>
    );
}

function ChartBox({ heightClass, children }: { heightClass: string; children: React.ReactNode }) {
    return (
        <div className={heightClass}>
            <ResponsiveContainer width="100%" height="100%">
                {children as any}
            </ResponsiveContainer>
        </div>
    );
}

// Active filter badge
function ActiveFilterBadge({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-300/40">
            <span className="text-indigo-400">{label}:</span> {value}
            <button onClick={onRemove} className="ml-0.5 hover:text-red-500 transition-colors">
                <FaTimes size={8} />
            </button>
        </span>
    );
}

export default function ComparisonDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const isMobile = useIsMobile();
    const { selectedFY, loading: fyLoading } = useFinancialYear();
    const { selectedCompany, loading: companyLoading } = useCompany();

    // ── Territory filter states ──
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ states: [], areas: [], routes: [], dsms: [], asms: [], rsms: [] });
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Applied (live) filters
    const [stateFilter, setStateFilter] = useState("");
    const [areaFilter, setAreaFilter]   = useState("");
    const [routeFilter, setRouteFilter] = useState("");
    const [dsmFilter, setDsmFilter]     = useState("");
    const [asmFilter, setAsmFilter]     = useState("");
    const [rsmFilter, setRsmFilter]     = useState("");

    // Staged (panel) filters — committed only on Apply
    const [stageState, setStageState] = useState("");
    const [stageArea, setStageArea]   = useState("");
    const [stageRoute, setStageRoute] = useState("");
    const [stageDsm, setStageDsm]     = useState("");
    const [stageAsm, setStageAsm]     = useState("");
    const [stageRsm, setStageRsm]     = useState("");

    useEffect(() => {
        const updateFYFilters = () => {
            if (selectedFY && !selectedFY.isAll && selectedFY.startDate && selectedFY.endDate) {
                const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                setFrom(s);
                setTo(e);
            } else if (selectedFY?.isAll) {
                setFrom("");
                setTo("");
            }
        };
        updateFYFilters();
        window.addEventListener("financial-year-changed", updateFYFilters);
        return () => window.removeEventListener("financial-year-changed", updateFYFilters);
    }, [selectedFY]);

    useEffect(() => {
        loadMrTerritoryInfo();
        loadFilterOptions();
    }, []);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: json.isMrRestricted,
                        territories: json.territories || [],
                        allowedCompanyCodes: json.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    const loadFilterOptions = async () => {
        setFilterOptionsLoading(true);
        try {
            const params = new URLSearchParams({ mode: "filter-options" });
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            const res = await fetch(`/api/dashboard/compare?${params}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    const cleanList = (list: any[]): OptionItem[] => {
                        if (!Array.isArray(list)) return [];
                        return list
                            .map((item: any) => {
                                if (item && typeof item === "object" && item.name !== undefined) {
                                    return {
                                        name: String(item.name).trim(),
                                        count: Number(item.count || 1),
                                    };
                                }
                                return {
                                    name: String(item || "").trim(),
                                    count: 1,
                                };
                            })
                            .filter(
                                (x) =>
                                    x.name &&
                                    !["null", "undefined", "n/a", "none", "-"].includes(
                                        x.name.toLowerCase()
                                    )
                            );
                    };

                    setFilterOptions({
                        states: cleanList(json.states),
                        areas:  cleanList(json.areas),
                        routes: cleanList(json.routes),
                        dsms:   cleanList(json.dsms),
                        asms:   cleanList(json.asms),
                        rsms:   cleanList(json.rsms),
                    });
                }
            }
        } catch {
            // Silently ignore
        } finally {
            setFilterOptionsLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        if (fyLoading || companyLoading) return;

        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();

            // Compute effective dates directly from selectedFY if from/to haven't been manually altered
            let effectiveFrom = from;
            let effectiveTo = to;
            if (!effectiveFrom && !effectiveTo && selectedFY && !selectedFY.isAll && selectedFY.startDate && selectedFY.endDate) {
                effectiveFrom = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                effectiveTo = new Date(selectedFY.endDate).toISOString().slice(0, 10);
            }

            if (effectiveFrom) params.set("from", effectiveFrom);
            if (effectiveTo) params.set("to", effectiveTo);
            if (selectedFY?._id && !selectedFY.isAll) params.set("fyId", selectedFY._id);
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

            // Territory filters
            if (stateFilter) params.set("state", stateFilter);
            if (areaFilter)  params.set("area",  areaFilter);
            if (routeFilter) params.set("route", routeFilter);
            if (dsmFilter)   params.set("dsm",   dsmFilter);
            if (asmFilter)   params.set("asm",   asmFilter);
            if (rsmFilter)   params.set("rsm",   rsmFilter);

            const res = await fetch(`/api/dashboard/compare?${params.toString()}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load dashboard");
            setData(json.data);
            setSummary(json.summary);
        } catch (e: any) {
            setError(e.message || "Failed to load comparison data.");
        } finally {
            setLoading(false);
        }
    }, [from, to, selectedFY, selectedCompany, fyLoading, companyLoading, stateFilter, areaFilter, routeFilter, dsmFilter, asmFilter, rsmFilter]);

    useEffect(() => {
        if (!fyLoading && !companyLoading) {
            fetchData();
        }
    }, [fetchData, fyLoading, companyLoading]);

    // Re-fetch when company changes via topbar event
    useEffect(() => {
        const handler = () => {
            fetchData();
            loadFilterOptions();
        };
        window.addEventListener("company-changed", handler);
        return () => window.removeEventListener("company-changed", handler);
    }, [fetchData]);

    const applyTerritoryFilters = () => {
        setStateFilter(stageState);
        setAreaFilter(stageArea);
        setRouteFilter(stageRoute);
        setDsmFilter(stageDsm);
        setAsmFilter(stageAsm);
        setRsmFilter(stageRsm);
        setShowFilterPanel(false);
    };

    const resetTerritoryFilters = () => {
        setStageState(""); setStageArea(""); setStageRoute(""); setStageDsm(""); setStageAsm(""); setStageRsm("");
        setStateFilter(""); setAreaFilter(""); setRouteFilter(""); setDsmFilter(""); setAsmFilter(""); setRsmFilter("");
    };

    const openFilterPanel = () => {
        // Sync staged values with currently applied
        setStageState(stateFilter);
        setStageArea(areaFilter);
        setStageRoute(routeFilter);
        setStageDsm(dsmFilter);
        setStageAsm(asmFilter);
        setStageRsm(rsmFilter);
        setShowFilterPanel(true);
    };

    const activeFilterCount = [stateFilter, areaFilter, routeFilter, dsmFilter, asmFilter, rsmFilter].filter(Boolean).length;

    const selectClass = "w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-slate-800 font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/50 backdrop-blur-md";

    return (
        <div className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
            <AmbientBackground />

            {/* MR TERRITORY BANNER */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm relative overflow-hidden">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ka comparison data dekh sakte hain.
                            {mrTerritoryInfo.territories.length > 0 && (
                                <>
                                    {" "}Assigned:
                                    {" "}
                                    {Array.from(
                                        new Set(
                                            mrTerritoryInfo.territories.map(
                                                (t) => t.companyName || t.companyCode
                                            )
                                        )
                                    ).join(", ")}
                                </>
                            )}
                        </p>
                        {mrTerritoryInfo.territories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {mrTerritoryInfo.territories.map((t, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                                    >
                                        <FaBuilding size={8} />
                                        {t.companyName || t.companyCode}
                                        {t.divisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.divisionName}
                                            </>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                HEADER + DATE FILTERS + TERRITORY FILTER BTN
                ═══════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center items-stretch justify-between gap-4 rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
                        Financial Comparison Dashboard
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                            {selectedFY?.fyName || "All FY"}
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                        Multi-dimensional comparative analysis of Sales, Purchases, Returns &amp; Cashflows
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <div>
                            <label className="block text-[11px] text-slate-500 font-semibold mb-0.5">From Date</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full border border-white/80 bg-white/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-slate-500 font-semibold mb-0.5">To Date</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full border border-white/80 bg-white/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        {/* Territory Filter Button */}
                        <button
                            onClick={openFilterPanel}
                            className={`relative flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all border ${
                                activeFilterCount > 0
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500/30"
                                    : "bg-white/70 hover:bg-white/90 text-slate-700 border-white/80"
                            }`}
                        >
                            <FaFilter size={11} />
                            <span>Area Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-white text-[10px] font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Apply / Refresh */}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all border border-indigo-500/30"
                        >
                            <FaSync size={11} className={loading ? "animate-spin" : ""} />
                            <span>Apply</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                ACTIVE FILTER BADGES
                ═══════════════════════════════════════════════ */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>
                    {stateFilter && <ActiveFilterBadge label="State" value={stateFilter} onRemove={() => setStateFilter("")} />}
                    {areaFilter  && <ActiveFilterBadge label="Area"  value={areaFilter}  onRemove={() => setAreaFilter("")}  />}
                    {routeFilter && <ActiveFilterBadge label="Route" value={routeFilter} onRemove={() => setRouteFilter("")} />}
                    {dsmFilter   && <ActiveFilterBadge label="DSM"   value={dsmFilter}   onRemove={() => setDsmFilter("")}   />}
                    {asmFilter   && <ActiveFilterBadge label="ASM"   value={asmFilter}   onRemove={() => setAsmFilter("")}   />}
                    {rsmFilter   && <ActiveFilterBadge label="RSM"   value={rsmFilter}   onRemove={() => setRsmFilter("")}   />}
                    <button onClick={resetTerritoryFilters} className="text-[11px] font-bold text-red-500 hover:underline">
                        Clear All
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                TERRITORY FILTER SLIDE-DOWN PANEL
                ═══════════════════════════════════════════════ */}
            {showFilterPanel && (
                <div className="rounded-[24px] border border-white/60 bg-white/60 backdrop-blur-2xl shadow-[0_8px_40px_rgba(31,41,55,0.12)] p-5 relative overflow-hidden animate-[fadeIn_0.2s_ease]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

                    {/* Panel header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                <FaFilter size={12} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800">Area-Wise Territory Filters</p>
                                <p className="text-[11px] text-slate-400">Filter comparison data by State, Area, Route, DSM, ASM, RSM</p>
                            </div>
                        </div>
                        <button onClick={() => setShowFilterPanel(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                            <FaTimes size={14} />
                        </button>
                    </div>

                    {filterOptionsLoading ? (
                        <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                            <FaSync size={12} className="animate-spin text-indigo-500" />
                            Loading filter options from database...
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {/* State */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaGlobeAsia size={9} className="text-blue-500" /> State
                                    </label>
                                    <select value={stageState} onChange={(e) => setStageState(e.target.value)} className={selectClass}>
                                        <option value="">All States ({filterOptions.states?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.states?.map((st) => (
                                            <option key={st.name} value={st.name}>
                                                {st.name} ({st.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Area / City */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaMapMarkerAlt size={9} className="text-indigo-500" /> Area / City
                                    </label>
                                    <select value={stageArea} onChange={(e) => setStageArea(e.target.value)} className={selectClass}>
                                        <option value="">All Areas ({filterOptions.areas?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.areas?.map((a) => (
                                            <option key={a.name} value={a.name}>
                                                {a.name} ({a.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Route */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaRoute size={9} className="text-indigo-500" /> Route
                                    </label>
                                    <select value={stageRoute} onChange={(e) => setStageRoute(e.target.value)} className={selectClass}>
                                        <option value="">All Routes ({filterOptions.routes?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.routes?.map((r) => (
                                            <option key={r.name} value={r.name}>
                                                {r.name} ({r.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* DSM */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaUserTie size={9} className="text-indigo-500" /> DSM (Salesman)
                                    </label>
                                    <select value={stageDsm} onChange={(e) => setStageDsm(e.target.value)} className={selectClass}>
                                        <option value="">All DSM ({filterOptions.dsms?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.dsms?.map((d) => (
                                            <option key={d.name} value={d.name}>
                                                {d.name} ({d.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* ASM */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaUserTie size={9} className="text-amber-500" /> ASM (Area Mgr)
                                    </label>
                                    <select value={stageAsm} onChange={(e) => setStageAsm(e.target.value)} className={selectClass}>
                                        <option value="">All ASM ({filterOptions.asms?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.asms?.map((a) => (
                                            <option key={a.name} value={a.name}>
                                                {a.name} ({a.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* RSM */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <FaUserTie size={9} className="text-teal-500" /> RSM (Regional Mgr)
                                    </label>
                                    <select value={stageRsm} onChange={(e) => setStageRsm(e.target.value)} className={selectClass}>
                                        <option value="">All RSM ({filterOptions.rsms?.reduce((acc, x) => acc + x.count, 0) || 0})</option>
                                        {filterOptions.rsms?.map((r) => (
                                            <option key={r.name} value={r.name}>
                                                {r.name} ({r.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Panel actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/60">
                                <button
                                    onClick={() => { setStageState(""); setStageArea(""); setStageRoute(""); setStageDsm(""); setStageAsm(""); setStageRsm(""); }}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                >
                                    Reset Filters
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowFilterPanel(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={applyTerritoryFilters}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition"
                                    >
                                        <FaFilter size={11} />
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {(loading || fyLoading || companyLoading) && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl p-8 text-center text-slate-600 font-semibold flex items-center justify-center gap-2">
                    <FaSync size={16} className="animate-spin text-indigo-600" />
                    Calculating Financial Comparison Data...
                </div>
            )}

            {error && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-red-200/60 bg-red-50/50 backdrop-blur-2xl p-4 sm:p-6 text-red-600 font-medium">
                    Error: {error}
                </div>
            )}

            {data && summary && !loading && !fyLoading && !companyLoading && (
                <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            label="Gross Sales"
                            value={`₹ ${formatINR(summary.totalSales)}`}
                            subtext="Exact MabsolCRM Sales Book match"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Net Sales Turnover"
                            value={`₹ ${formatINR(summary.netSales)}`}
                            subtext="Sales minus Sales Returns"
                            icon={<FaChartLine size={15} />}
                        />
                        <StatCard
                            label="Sales Returns (CN)"
                            value={`₹ ${formatINR(summary.salesReturns)}`}
                            subtext="Credit Notes"
                            icon={<FaUndo size={14} />}
                        />
                        <StatCard
                            label="Total Purchases"
                            value={`₹ ${formatINR(summary.totalPurchases)}`}
                            subtext="Supplier Bills"
                            icon={<FaShoppingBag size={15} />}
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            label="Creditor Outstanding"
                            value={`₹ ${formatINR(summary.totalOutstanding)}`}
                            subtext={`${summary.totalPendingInvoices} Pending Purchase Bills`}
                            icon={<FaWallet size={15} />}
                        />
                        <StatCard
                            label="Customer Collections"
                            value={`₹ ${formatINR(summary.totalCollections)}`}
                            subtext="Receipts Received"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Supplier Payments"
                            value={`₹ ${formatINR(summary.totalPayments)}`}
                            subtext="Payments Made"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Top Product Sales"
                            value={data.productComparison[0] ? `₹ ${formatINR(data.productComparison[0].amount)}` : "₹ 0"}
                            subtext={data.productComparison[0]?.productName || "Product #1"}
                            icon={<FaBoxes size={15} />}
                        />
                    </div>

                    {/* Sales vs Purchase */}
                    <Card title="Monthly Sales vs Purchase Comparison" subtitle="Monthly trend comparison of Sales Invoices vs Supplier Purchase Bills">
                        <ChartBox heightClass="h-[260px] sm:h-[320px]">
                            <BarChart data={data.salesVsPurchase} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                <Bar dataKey="sales" name="Sales (Gross)" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="purchase" name="Purchase" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Collection vs Outstanding */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Monthly Cashflows (Collections vs Payments)" subtitle="Customer Collections (Receipts) vs Supplier Payments Made">
                            <ChartBox heightClass="h-[240px] sm:h-[290px]">
                                <BarChart data={data.collectionVsOutstanding.collectionsMonthly} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                    <Bar dataKey="credit" name="Collections (Receipts)" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="debit" name="Payments Made" fill="#EF4444" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>

                        <Card title="Creditor Outstanding Aging Breakdown" subtitle="Purchase Bill aging buckets matching MabsolCRM ERP Pendings">
                            <ChartBox heightClass="h-[240px] sm:h-[290px]">
                                <BarChart data={data.collectionVsOutstanding.aging} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="bucket" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalBalance" name="Pending Balance" fill="#A855F7" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Product Comparison */}
                    <Card title="Top 15 Products Sales Comparison" subtitle="Ranked by total sales turnover amount in active financial year">
                        <ChartBox heightClass="h-[380px] sm:h-[440px]">
                            <BarChart
                                data={data.productComparison}
                                layout="vertical"
                                margin={{ left: isMobile ? 8 : 20, right: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis type="number" fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} />
                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    fontSize={isMobile ? 9 : 11}
                                    stroke="#64748b"
                                    width={isMobile ? 90 : 200}
                                    tickFormatter={(v: string) =>
                                        isMobile && v.length > 15 ? `${v.slice(0, 13)}…` : v
                                    }
                                />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Bar dataKey="amount" name="Sales Amount" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Company Comparison + Quarterly */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Company Sales Share Comparison" subtitle="Breakdown of sales turnover by division / company">
                            <ChartBox heightClass={isMobile ? "h-[360px]" : "h-[320px]"}>
                                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <Pie
                                        data={data.companyComparison}
                                        dataKey="amount"
                                        nameKey="company"
                                        cx={isMobile ? "50%" : "40%"}
                                        cy={isMobile ? "40%" : "50%"}
                                        outerRadius={isMobile ? 80 : 95}
                                        labelLine={false}
                                        label={(d: any) =>
                                            d.percent > 0.05 ? `${d.company} ${(d.percent * 100).toFixed(0)}%` : ""
                                        }
                                    >
                                        {data.companyComparison.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Legend
                                        layout={isMobile ? "horizontal" : "vertical"}
                                        align={isMobile ? "center" : "right"}
                                        verticalAlign={isMobile ? "bottom" : "middle"}
                                        iconType="circle"
                                        formatter={(value: string, entry: any) =>
                                            `${value} — ₹ ${formatINR(entry?.payload?.amount ?? 0)}`
                                        }
                                        wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: "#334155", lineHeight: "22px" }}
                                    />
                                </PieChart>
                            </ChartBox>
                        </Card>

                        <Card title="Quarterly Sales Breakdown (Indian FY)" subtitle="Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)">
                            <ChartBox heightClass="h-[250px] sm:h-[310px]">
                                <BarChart data={data.quarterlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="label" fontSize={isMobile ? 9 : 11} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalAmount" name="Sales Turnover" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Monthly Sales Trend */}
                    <Card title="Monthly Sales Turnover Trend Line" subtitle="Sequential monthly turnover progression">
                        <ChartBox heightClass="h-[250px] sm:h-[300px]">
                            <LineChart data={data.monthlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Line
                                    type="monotone"
                                    dataKey="totalAmount"
                                    name="Monthly Sales"
                                    stroke="#6366F1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#6366F1", strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 6, fill: "#4f46e5" }}
                                />
                            </LineChart>
                        </ChartBox>
                    </Card>
                </>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}