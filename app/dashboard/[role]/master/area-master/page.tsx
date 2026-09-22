"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    VisibilityState,
    ColumnDef,
} from "@tanstack/react-table";
import {
    FaMapMarkedAlt,
    FaSearch,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaChevronLeft,
    FaChevronRight,
    FaColumns,
    FaFileExcel,
    FaFilter,
    FaUndo,
    FaTimes,
    FaEye,
    FaIdCard,
    FaChartLine,
    FaExclamationTriangle,
    FaUserTie,
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
} from "react-icons/fa";

type AreaRow = Record<string, any>;

const columnHelper = createColumnHelper<AreaRow>();

/* ---------------------------------------------------------- */
/* Helpers                                                      */
/* ---------------------------------------------------------- */

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

const fmtDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const AREA_SOURCE_LABEL: Record<string, string> = {
    area: "Explicit Area",
    district: "Derived from District",
    city: "Derived from City",
    unassigned: "Unassigned",
};

/* ---------------------------------------------------------- */
/* Field configuration                                           */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "date" | "balance" | "count" | "percent";

type FieldDef = { key: string; label: string; type?: FieldType };

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Area Overview",
        fields: [
            { key: "AREA", label: "Area Name" },
            { key: "CITY", label: "City / Cities" },
            { key: "CITYCOUNT", label: "City Count", type: "count" },
            { key: "DISTRICT", label: "District(s)" },
            { key: "PINCODE", label: "Pincode(s)" },
            { key: "STATE", label: "State(s)" },
            { key: "TOTALCUSTOMERS", label: "Total Customers", type: "count" },
            { key: "ACTIVECUSTOMERS", label: "Active Customers", type: "count" },
            { key: "INACTIVECUSTOMERS", label: "Inactive Customers", type: "count" },
            { key: "UNKNOWNSTATUSCUSTOMERS", label: "Status Not Recorded", type: "count" },
        ],
    },
    {
        label: "Staff & Coverage",
        fields: [
            { key: "DSM", label: "DSM(s) — from Sales" },
            { key: "RSM", label: "RSM(s)" },
            { key: "ASM", label: "ASM(s)" },
            { key: "ROUTECOUNT", label: "Routes Covered", type: "count" },
        ],
    },
    {
        label: "Party Type & Contact",
        fields: [
            { key: "BUYERCOUNT", label: "Buyers", type: "count" },
            { key: "SUPPLIERCOUNT", label: "Suppliers", type: "count" },
            { key: "PHONECOUNT", label: "With Phone", type: "count" },
            { key: "PHONEPERCENT", label: "Phone Coverage %", type: "percent" },
        ],
    },
    {
        label: "Tax / Legal",
        fields: [
            { key: "GSTCOUNT", label: "Customers with GST", type: "count" },
            { key: "NOGSTCOUNT", label: "Customers without GST", type: "count" },
            { key: "GSTPERCENT", label: "GST Compliance %", type: "percent" },
        ],
    },
    {
        label: "Financial & Risk",
        fields: [
            { key: "TOTALOUTSTANDING", label: "Total Outstanding (Dr)", type: "money" },
            { key: "TOTALCREDITBAL", label: "Total Advance (Cr)", type: "money" },
            { key: "NETBALANCE", label: "Net Balance", type: "balance" },
            { key: "AVGBALANCE", label: "Avg Customer Balance", type: "money" },
            { key: "TOTALCREDITLIMIT", label: "Total Credit Limit", type: "money" },
        ],
    },
    {
        label: "Sales & Performance",
        fields: [
            { key: "TOTALSALES", label: "Total Sales", type: "money" },
            { key: "SALECOUNT", label: "Sale Vouchers", type: "count" },
            { key: "LASTSALEDATE", label: "Last Sale Date", type: "date" },
            { key: "TOPPARTYNAME", label: "Top Party by Sales" },
            { key: "TOPPARTYSALES", label: "Top Party Sales Amount", type: "money" },
            { key: "TOTALPURCHASE", label: "Total Purchase", type: "money" },
            { key: "PURCHASECOUNT", label: "Purchase Vouchers", type: "count" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "AREA",
    "CITY",
    "DISTRICT",
    "TOTALCUSTOMERS",
    "ACTIVECUSTOMERS",
    "DSM",
    "TOTALSALES",
    "TOTALOUTSTANDING",
    "GSTPERCENT",
    "LASTSALEDATE",
];

/* ---------------------------------------------------------- */
/* KPI chip                                                      */
/* ---------------------------------------------------------- */

function StatChip({
    label,
    value,
    tone,
    active,
    onClick,
}: {
    label: string;
    value: string | number;
    tone: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2.5 rounded-xl backdrop-blur-xl border px-3 py-2 text-left shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-200 ${
                active
                    ? "bg-white border-[#343872] ring-2 ring-[#343872]/20 shadow-md scale-[1.02]"
                    : "bg-white/60 border-white/40 hover:bg-white/80 hover:border-gray-300"
            }`}
        >
            <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
            <div className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase font-semibold text-gray-500">{label}</span>
                <span className="text-xs font-bold text-gray-800 tabular-nums">{value}</span>
            </div>
        </button>
    );
}

/* ---------------------------------------------------------- */
/* Main Page                                                    */
/* ---------------------------------------------------------- */

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

export default function AreaFullViewPage() {
    const [areas, setAreas] = useState<AreaRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pageSize, setPageSize] = useState<number>(10);

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const state: VisibilityState = {};
        ALL_FIELDS.forEach((f) => {
            state[f.key] = DEFAULT_VISIBLE.includes(f.key);
        });
        return state;
    });

    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedAreaForDrawer, setSelectedAreaForDrawer] = useState<AreaRow | null>(null);

    // Preset Tabs: "all" | "top_revenue" | "high_outstanding" | "needs_attention"
    const [activeTab, setActiveTab] = useState<string>("all");

    // ---- Filters -------------------------------------------------
    const [search, setSearch] = useState("");
    const [city, setCity] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [dsm, setDsm] = useState("");
    const [rsm, setRsm] = useState("");
    const [balanceStatus, setBalanceStatus] = useState("");
    const [gstStatus, setGstStatus] = useState("");
    const [salesActivity, setSalesActivity] = useState("");
    const [minCustomers, setMinCustomers] = useState("");
    const [maxCustomers, setMaxCustomers] = useState("");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [minSales, setMinSales] = useState("");
    const [maxSales, setMaxSales] = useState("");

    useEffect(() => {
        loadMrTerritoryInfo();
        loadAreas();
    }, []);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: data.isMrRestricted,
                        territories: data.territories || [],
                        allowedCompanyCodes: data.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    const loadAreas = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/master/area/");
            const data = await res.json();
            setAreas(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    const splitList = (v: any) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

    const cityOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.CITY)))).sort(),
        [areas]
    );
    const stateOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.STATE)))).sort(),
        [areas]
    );
    const dsmOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.DSM)))).sort(),
        [areas]
    );
    const rsmOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.RSM)))).sort(),
        [areas]
    );

    const resetFilters = () => {
        setSearch("");
        setCity("");
        setStateFilter("");
        setDsm("");
        setRsm("");
        setBalanceStatus("");
        setGstStatus("");
        setSalesActivity("");
        setMinCustomers("");
        setMaxCustomers("");
        setMinBalance("");
        setMaxBalance("");
        setMinSales("");
        setMaxSales("");
        setActiveTab("all");
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();

        let base = areas.filter((a) => {
            const custCount = Number(a.TOTALCUSTOMERS || 0);
            const netBal = Number(a.NETBALANCE || 0);
            const sales = Number(a.TOTALSALES || 0);
            const gstCount = Number(a.GSTCOUNT || 0);
            const noGstCount = Number(a.NOGSTCOUNT || 0);

            if (
                s &&
                !(
                    (a.AREA || "").toLowerCase().includes(s) ||
                    (a.CITY || "").toLowerCase().includes(s) ||
                    (a.DISTRICT || "").toLowerCase().includes(s) ||
                    (a.PINCODE || "").toLowerCase().includes(s) ||
                    (a.STATE || "").toLowerCase().includes(s) ||
                    (a.DSM || "").toLowerCase().includes(s) ||
                    (a.RSM || "").toLowerCase().includes(s) ||
                    (a.TOPPARTYNAME || "").toLowerCase().includes(s)
                )
            )
                return false;

            if (city && !splitList(a.CITY).includes(city)) return false;
            if (stateFilter && !splitList(a.STATE).includes(stateFilter)) return false;
            if (dsm && !splitList(a.DSM).includes(dsm)) return false;
            if (rsm && !splitList(a.RSM).includes(rsm)) return false;

            if (balanceStatus === "outstanding" && !(netBal > 0)) return false;
            if (balanceStatus === "credit" && !(netBal < 0)) return false;
            if (balanceStatus === "zero" && netBal !== 0) return false;

            if (gstStatus === "full" && !(gstCount > 0 && noGstCount === 0)) return false;
            if (gstStatus === "partial" && !(gstCount > 0 && noGstCount > 0)) return false;
            if (gstStatus === "none" && !(gstCount === 0 && noGstCount > 0)) return false;

            if (salesActivity === "with_sales" && !(sales > 0)) return false;
            if (salesActivity === "no_sales" && sales > 0) return false;

            if (minCustomers && custCount < Number(minCustomers)) return false;
            if (maxCustomers && custCount > Number(maxCustomers)) return false;
            if (minBalance && netBal < Number(minBalance)) return false;
            if (maxBalance && netBal > Number(maxBalance)) return false;
            if (minSales && sales < Number(minSales)) return false;
            if (maxSales && sales > Number(maxSales)) return false;

            return true;
        });

        // Tab preset filtering
        if (activeTab === "top_revenue") {
            base = base.filter((a) => Number(a.TOTALSALES || 0) > 0);
            base.sort((a, b) => Number(b.TOTALSALES || 0) - Number(a.TOTALSALES || 0));
        } else if (activeTab === "high_outstanding") {
            base = base.filter((a) => Number(a.NETBALANCE || 0) > 0);
            base.sort((a, b) => Number(b.NETBALANCE || 0) - Number(a.NETBALANCE || 0));
        } else if (activeTab === "needs_attention") {
            base = base.filter((a) => {
                const isDerived = a.AREASOURCE && a.AREASOURCE !== "area";
                const lowGst = Number(a.GSTPERCENT || 0) < 50;
                const noSales = Number(a.TOTALSALES || 0) === 0;
                return isDerived || lowGst || noSales;
            });
        }

        return base;
    }, [
        areas,
        search,
        city,
        stateFilter,
        dsm,
        rsm,
        balanceStatus,
        gstStatus,
        salesActivity,
        minCustomers,
        maxCustomers,
        minBalance,
        maxBalance,
        minSales,
        maxSales,
        activeTab,
    ]);

    // Aggregate summary stats
    const totalAreaCount = filtered.length;
    const totalCustomerCount = filtered.reduce((sum, a) => sum + Number(a.TOTALCUSTOMERS || 0), 0);
    const totalOutstanding = filtered.reduce((sum, a) => sum + Math.max(Number(a.NETBALANCE || 0), 0), 0);
    const totalSalesSum = filtered.reduce((sum, a) => sum + Number(a.TOTALSALES || 0), 0);
    const avgGstPercent =
        filtered.length > 0
            ? Math.round(filtered.reduce((sum, a) => sum + Number(a.GSTPERCENT || 0), 0) / filtered.length)
            : 0;

    const columns = useMemo(() => {
        const cols: ColumnDef<AreaRow, any>[] = ALL_FIELDS.map((f) =>
            columnHelper.accessor(f.key, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "date") return fmtDate(val);
                    if (f.type === "count") return Number(val || 0).toLocaleString("en-IN");
                    if (f.type === "percent") return `${Number(val || 0)}%`;
                    if (f.type === "balance") {
                        const n = Number(val || 0);
                        return (
                            <span
                                className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                    n
                                )}`}
                            >
                                {money(n)}
                            </span>
                        );
                    }
                    if (f.key === "AREA") {
                        const source = info.row.original.AREASOURCE;
                        return (
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                                {val || "—"}
                                {source && source !== "area" && (
                                    <span
                                        title={AREA_SOURCE_LABEL[source] || source}
                                        className="inline-block px-1.5 py-0.2 text-[9px] font-medium rounded bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                                    >
                                        {source}
                                    </span>
                                )}
                            </span>
                        );
                    }
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            })
        );

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Actions",
                cell: (info) => (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSelectedAreaForDrawer(info.row.original)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-600 hover:text-white hover:ring-indigo-600 transition-all duration-200"
                            title="Quick View Drawer"
                        >
                            <FaIdCard size={11} /> Quick
                        </button>
                        <Link
                            href={`/dashboard/master/area-master/${encodeURIComponent(info.row.original.AREA)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/60 text-[#343872] ring-1 ring-[#343872]/30 hover:bg-[#343872] hover:text-white hover:ring-[#343872] transition-all duration-200"
                            title="Full Area Customer Details"
                        >
                            <FaEye size={11} /> View
                        </Link>
                    </div>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "money" || f.type === "balance" || f.type === "count" || f.type === "percent").map(
            (f) => f.key
        )
    );

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    // Update page size when user changes dropdown
    useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize, table]);

    const toggleGroup = (group: { label: string; fields: FieldDef[] }, value: boolean) => {
        setColumnVisibility((prev) => {
            const next = { ...prev };
            group.fields.forEach((f) => (next[f.key] = value));
            return next;
        });
    };

    const visibleCount = ALL_FIELDS.filter((f) => columnVisibility[f.key]).length;

    const exportToExcel = () => {
        const visibleCols = table.getVisibleLeafColumns().filter((c) => c.id !== "action");
        const rows = table.getFilteredRowModel().rows.map((row) => {
            const obj: Record<string, any> = {};
            visibleCols.forEach((col) => {
                const header = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
                obj[header] = row.getValue(col.id);
            });
            return obj;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Areas");
        XLSX.writeFile(wb, `area_master_export_${Date.now()}.xlsx`);
    };

    return (
        <div className="space-y-4 p-2 sm:p-4">

            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ke areas dekh sakte hain.
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
                                        {t.subDivisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.subDivisionName}
                                            </>
                                        ) : null}
                                        {t.categoryName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.categoryName}
                                            </>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== TOP STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2.5 items-center">
                <StatChip
                    label="Areas"
                    value={totalAreaCount}
                    tone="bg-blue-500"
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                />
                <StatChip
                    label="Customers Covered"
                    value={totalCustomerCount.toLocaleString("en-IN")}
                    tone="bg-emerald-500"
                />
                <StatChip
                    label="Net Outstanding"
                    value={money(totalOutstanding)}
                    tone="bg-rose-500"
                    active={activeTab === "high_outstanding"}
                    onClick={() => setActiveTab("high_outstanding")}
                />
                <StatChip
                    label="Total Sales"
                    value={money(totalSalesSum)}
                    tone="bg-indigo-500"
                    active={activeTab === "top_revenue"}
                    onClick={() => setActiveTab("top_revenue")}
                />
                <StatChip
                    label="Avg GST Compliance"
                    value={`${avgGstPercent}%`}
                    tone="bg-amber-500"
                    active={activeTab === "needs_attention"}
                    onClick={() => setActiveTab("needs_attention")}
                />
            </div>

            {/* ==================== PRESET SMART TABS & SEARCH CONTAINER ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* Header toolbar */}
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 text-white shadow-inner">
                            <FaMapMarkedAlt size={16} />
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-white tracking-wide m-0">Area Master Hub</h5>
                            <p className="text-[11px] text-white/70 m-0">Commercial region insights & territory coverage</p>
                        </div>
                    </div>

                    {/* Presets & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Preset tabs */}
                        <div className="flex items-center bg-white/15 p-1 rounded-xl ring-1 ring-white/20 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setActiveTab("all")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "all" ? "bg-white text-[#343872] shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                All Areas
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("top_revenue")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "top_revenue"
                                        ? "bg-white text-[#343872] shadow-sm font-semibold"
                                        : "text-white/80 hover:text-white"
                                }`}
                            >
                                <FaChartLine size={10} /> Top Revenue
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("high_outstanding")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "high_outstanding"
                                        ? "bg-white text-[#343872] shadow-sm font-semibold"
                                        : "text-white/80 hover:text-white"
                                }`}
                            >
                                <FaExclamationTriangle size={10} /> High Dues
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("needs_attention")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "needs_attention"
                                        ? "bg-white text-[#343872] shadow-sm font-semibold"
                                        : "text-white/80 hover:text-white"
                                }`}
                            >
                                Needs Attention
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="relative w-full sm:w-52">
                            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search area, city, district, DSM…"
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                showFilters ? "bg-white text-[#343872]" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
                            }`}
                        >
                            <FaFilter size={11} /> Filters
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowColumnPicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaColumns size={11} /> Columns ({visibleCount})
                        </button>

                        <button
                            type="button"
                            onClick={exportToExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 shadow-sm transition-all duration-200"
                        >
                            <FaFileExcel size={12} /> Excel
                        </button>
                    </div>
                </div>

                {/* Filter dropdown panel */}
                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60 transition-all">
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">All Cities</option>
                            {cityOptions.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>

                        <select
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">All States</option>
                            {stateOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        <select
                            value={dsm}
                            onChange={(e) => setDsm(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">All DSM</option>
                            {dsmOptions.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>

                        <select
                            value={rsm}
                            onChange={(e) => setRsm(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">All RSM</option>
                            {rsmOptions.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>

                        <select
                            value={balanceStatus}
                            onChange={(e) => setBalanceStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">All Balances</option>
                            <option value="outstanding">Net Outstanding (Dr)</option>
                            <option value="credit">Net Advance (Cr)</option>
                            <option value="zero">Net Zero</option>
                        </select>

                        <select
                            value={gstStatus}
                            onChange={(e) => setGstStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">GST — All</option>
                            <option value="full">Fully GST Compliant</option>
                            <option value="partial">Partially Compliant</option>
                            <option value="none">No GST at all</option>
                        </select>

                        <select
                            value={salesActivity}
                            onChange={(e) => setSalesActivity(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        >
                            <option value="">Sales Activity — All</option>
                            <option value="with_sales">Has Sales</option>
                            <option value="no_sales">No Sales Yet</option>
                        </select>

                        <input
                            type="number"
                            value={minCustomers}
                            onChange={(e) => setMinCustomers(e.target.value)}
                            placeholder="Min Customers"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />
                        <input
                            type="number"
                            value={maxCustomers}
                            onChange={(e) => setMaxCustomers(e.target.value)}
                            placeholder="Max Customers"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />
                        <input
                            type="number"
                            value={minBalance}
                            onChange={(e) => setMinBalance(e.target.value)}
                            placeholder="Min Net Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />
                        <input
                            type="number"
                            value={maxBalance}
                            onChange={(e) => setMaxBalance(e.target.value)}
                            placeholder="Max Net Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />
                        <input
                            type="number"
                            value={minSales}
                            onChange={(e) => setMinSales(e.target.value)}
                            placeholder="Min Total Sales"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />
                        <input
                            type="number"
                            value={maxSales}
                            onChange={(e) => setMaxSales(e.target.value)}
                            placeholder="Max Total Sales"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-[#343872]"
                        />

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                        >
                            <FaUndo size={10} /> Reset All
                        </button>
                    </div>
                )}

                {/* Table View */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/40">
                                    {headerGroup.headers.map((header) => {
                                        const sortDir = header.column.getIsSorted();
                                        const isNumeric = numericTypes.has(header.column.id);
                                        return (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider ${
                                                    isNumeric ? "text-right" : "text-left"
                                                } hover:text-[#343872] transition-colors`}
                                            >
                                                <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() &&
                                                        (sortDir === "asc" ? (
                                                            <FaSortUp size={11} className="text-[#343872]" />
                                                        ) : sortDir === "desc" ? (
                                                            <FaSortDown size={11} className="text-[#343872]" />
                                                        ) : (
                                                            <FaSort size={10} className="text-gray-300" />
                                                        ))}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-12 text-sm">
                                        Loading area directory…
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-indigo-50/30 transition-colors duration-200"
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const isNumeric = numericTypes.has(cell.column.id);
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={`px-4 py-2.5 whitespace-nowrap text-gray-700 tabular-nums ${
                                                        isNumeric ? "text-right" : "text-left"
                                                    }`}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-12 text-sm">
                                        No area matching active filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Controls & Pagination */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/40 text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                        <span>
                            Page <span className="font-semibold text-gray-800">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                            <span className="font-semibold text-gray-800">{table.getPageCount() || 1}</span> &middot;{" "}
                            <span className="font-semibold text-gray-800">{table.getFilteredRowModel().rows.length}</span> areas
                        </span>

                        {/* Page size selector */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded-lg px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs outline-none focus:ring-[#343872]"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={9999}>All</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>
                        <button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== QUICK-VIEW SIDE DRAWER ==================== */}
            {selectedAreaForDrawer && (
                <div
                    className="fixed inset-0 z-[110] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setSelectedAreaForDrawer(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-lg md:max-w-xl h-full flex flex-col bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                    >
                        {/* Drawer Header */}
                        <div className="relative flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#343872] to-indigo-600 text-white shrink-0">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 text-white shrink-0">
                                    <FaMapMarkerAlt size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm sm:text-base font-bold tracking-wide m-0 truncate">
                                        {selectedAreaForDrawer.AREA}
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-white/70 m-0 truncate">
                                        {AREA_SOURCE_LABEL[selectedAreaForDrawer.AREASOURCE] || selectedAreaForDrawer.AREASOURCE}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAreaForDrawer(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                                aria-label="Close drawer"
                            >
                                <span>Close</span>
                                <FaTimes size={13} />
                            </button>
                        </div>

                        {/* Drawer Body Content */}
                        <div className="flex-1 p-4 sm:p-6 space-y-5">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                    <span className="text-[10px] font-semibold text-indigo-500 uppercase">Customers</span>
                                    <p className="text-base sm:text-lg font-bold text-indigo-950 m-0">
                                        {Number(selectedAreaForDrawer.TOTALCUSTOMERS || 0).toLocaleString("en-IN")}
                                    </p>
                                    <span className="text-[11px] text-gray-500">
                                        {selectedAreaForDrawer.ACTIVECUSTOMERS || 0} active
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">Total Sales</span>
                                    <p className="text-base sm:text-lg font-bold text-emerald-950 m-0">
                                        {money(selectedAreaForDrawer.TOTALSALES)}
                                    </p>
                                    <span className="text-[11px] text-gray-500">
                                        {selectedAreaForDrawer.SALECOUNT || 0} sale vouchers
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                                    <span className="text-[10px] font-semibold text-rose-500 uppercase">Net Outstanding</span>
                                    <p className="text-base sm:text-lg font-bold text-rose-950 m-0">
                                        {money(selectedAreaForDrawer.NETBALANCE)}
                                    </p>
                                    <span className="text-[11px] text-gray-500">
                                        Avg {money(selectedAreaForDrawer.AVGBALANCE)}/cust
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                                    <span className="text-[10px] font-semibold text-amber-600 uppercase">GST Coverage</span>
                                    <p className="text-base sm:text-lg font-bold text-amber-950 m-0">
                                        {selectedAreaForDrawer.GSTPERCENT || 0}%
                                    </p>
                                    <span className="text-[11px] text-gray-500">
                                        {selectedAreaForDrawer.GSTCOUNT || 0} of {selectedAreaForDrawer.TOTALCUSTOMERS || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Geographical Info */}
                            <div className="space-y-2 border-t pt-4 border-gray-100">
                                <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <FaBuilding className="text-[#343872]" /> Location Breakdown
                                </h6>
                                <div className="space-y-1 text-xs text-gray-600">
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">City / Cities:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.CITY || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">District:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.DISTRICT || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">Pincode(s):</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.PINCODE || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">State:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.STATE || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Staff & Coverage */}
                            <div className="space-y-2 border-t pt-4 border-gray-100">
                                <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <FaUserTie className="text-[#343872]" /> Sales Rep & Staff Coverage
                                </h6>
                                <div className="space-y-1 text-xs text-gray-600">
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">DSM (Sales activity):</span>
                                        <span className="font-medium text-indigo-700">{selectedAreaForDrawer.DSM || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">RSM:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.RSM || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">ASM:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.ASM || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-400">Routes Covered:</span>
                                        <span className="font-medium text-gray-800">{selectedAreaForDrawer.ROUTECOUNT || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Insights */}
                            {selectedAreaForDrawer.TOPPARTYNAME && (
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Top Customer in Area</span>
                                    <p className="text-xs font-bold text-slate-800 m-0">{selectedAreaForDrawer.TOPPARTYNAME}</p>
                                    <p className="text-xs text-emerald-700 font-semibold m-0">
                                        {money(selectedAreaForDrawer.TOPPARTYSALES)} total sales
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer Actions with Explicit Close Button */}
                        <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedAreaForDrawer(null)}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <FaTimes size={12} /> Close Drawer
                            </button>
                            <Link
                                href={`/dashboard/master/area-master/${encodeURIComponent(selectedAreaForDrawer.AREA)}`}
                                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[#343872] text-white hover:bg-indigo-900 shadow-md transition-all"
                            >
                                Open Full Customer List <FaArrowRight size={11} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== COLUMN PICKER MODAL ==================== */}
            {showColumnPicker && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowColumnPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#343872] to-indigo-600 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <FaColumns size={14} />
                                <h5 className="text-sm font-semibold tracking-wide m-0">
                                    Show / Hide Columns
                                    <span className="ml-2 text-xs font-normal text-white/70">
                                        {visibleCount} of {ALL_FIELDS.length} selected
                                    </span>
                                </h5>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowColumnPicker(false)}
                                className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                            >
                                <FaTimes size={12} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                            <span className="text-[11px] text-gray-500">Tick the columns to display in table</span>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setColumnVisibility(
                                            Object.fromEntries(ALL_FIELDS.map((f) => [f.key, true])) as VisibilityState
                                        )
                                    }
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                    Select all
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setColumnVisibility(
                                            Object.fromEntries(ALL_FIELDS.map((f) => [f.key, false])) as VisibilityState
                                        )
                                    }
                                    className="text-xs font-medium text-gray-500 hover:underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {FIELD_GROUPS.map((group) => (
                                <div key={group.label}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                            {group.label}
                                        </p>
                                        <div className="flex gap-2 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(group, true)}
                                                className="text-blue-500 hover:underline"
                                            >
                                                all
                                            </button>
                                            <span className="text-gray-300">/</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(group, false)}
                                                className="text-gray-400 hover:underline"
                                            >
                                                none
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                        {group.fields.map((f) => (
                                            <label
                                                key={f.key}
                                                className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!!columnVisibility[f.key]}
                                                    onChange={(e) =>
                                                        setColumnVisibility((prev) => ({
                                                            ...prev,
                                                            [f.key]: e.target.checked,
                                                        }))
                                                    }
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#343872] focus:ring-[#343872]"
                                                />
                                                {f.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowColumnPicker(false)}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#343872] text-white hover:bg-[#2a2d5c] transition-colors"
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