"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
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
    FaBoxes,
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
    FaIdCard,
    FaChartLine,
    FaExclamationTriangle,
    FaTag,
    FaLayerGroup,
    FaBuilding,
    FaArrowRight,
    FaCoins,
    FaMapMarkerAlt,
} from "react-icons/fa";

type Product = Record<string, any>;

const columnHelper = createColumnHelper<Product>();

/* ---------------------------------------------------------- */
/* Helpers                                                      */
/* ---------------------------------------------------------- */

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const pct = (v: any) => `${v ?? 0}%`;

function stockClasses(balance: number) {
    if (balance <= 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance <= 10) return "bg-amber-500/15 text-amber-700 ring-amber-500/30";
    return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
}

type FieldType = "text" | "money" | "percent" | "status" | "stock" | "margin";

type FieldDef = {
    key: string;
    label: string;
    type?: FieldType;
    derived?: boolean;
};

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "CODE", label: "Code" },
            { key: "PRODUCT", label: "Product Name" },
            { key: "company", label: "Company", derived: true },
            { key: "GCODE", label: "GCode" },
            { key: "STATUS", label: "Status", type: "status" },
            { key: "UNIT", label: "Unit" },
            { key: "UNIT2", label: "Second Unit" },
            { key: "PACKING", label: "Packing" },
            { key: "PACK", label: "Pack Qty" },
            { key: "HSN", label: "HSN / SAC" },
            { key: "UPCCODE", label: "UPC Code" },
            { key: "RACKNO", label: "Rack No." },
            { key: "RACKNO2", label: "Rack No. 2" },
        ],
    },
    {
        label: "Pricing & Margin",
        fields: [
            { key: "MRP", label: "MRP", type: "money" },
            { key: "PRATE", label: "Purchase Rate", type: "money" },
            { key: "RATEF", label: "Sale Rate", type: "money" },
            { key: "marginPct", label: "Margin %", type: "margin" },
            { key: "LPRATE", label: "Last Purchase Rate", type: "money" },
            { key: "COST", label: "Cost / PCS", type: "money" },
            { key: "RATEA", label: "Rate A", type: "money" },
            { key: "RATEB", label: "Rate B", type: "money" },
            { key: "RATEC", label: "Rate C", type: "money" },
            { key: "RATED", label: "Rate D", type: "money" },
            { key: "RATEE", label: "Rate E", type: "money" },
        ],
    },
    {
        label: "GST / Tax Information",
        fields: [
            { key: "CGST", label: "CGST", type: "percent" },
            { key: "SGST", label: "SGST", type: "percent" },
            { key: "IGST", label: "IGST", type: "percent" },
            { key: "PURTAX", label: "Purchase Tax", type: "percent" },
            { key: "SALTAX", label: "Sale Tax", type: "percent" },
            { key: "TAXL", label: "Tax Type" },
            { key: "TAXC", label: "Tax Category" },
        ],
    },
    {
        label: "Stock & Valuation",
        fields: [
            { key: "BALANCE", label: "Current Stock", type: "stock" },
            { key: "stockValue", label: "Stock Value", type: "money" },
            { key: "OPENING", label: "Opening Stock" },
            { key: "FREEBAL", label: "Free Balance" },
            { key: "HOLD", label: "Hold Stock" },
            { key: "MINIMUM", label: "Minimum Stock" },
            { key: "MAXIMUM", label: "Maximum Stock" },
        ],
    },
    {
        label: "Discount & Scheme",
        fields: [
            { key: "SALDIS", label: "Sale Discount", type: "percent" },
            { key: "PURDIS", label: "Purchase Discount", type: "percent" },
            { key: "SALVDIS", label: "Sale Special Discount", type: "percent" },
            { key: "PURSPDIS", label: "Purchase Special Discount", type: "percent" },
            { key: "FIXDIS", label: "Fixed Discount" },
            { key: "FREE", label: "Free Scheme" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "CODE",
    "PRODUCT",
    "company",
    "STATUS",
    "UNIT",
    "MRP",
    "PRATE",
    "RATEF",
    "marginPct",
    "BALANCE",
    "IGST",
];

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
            className={`flex items-center gap-2.5 rounded-xl backdrop-blur-xl border px-3 py-2 text-left shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-200 ${active
                ? "bg-white border-blue-600 ring-2 ring-blue-600/20 shadow-md scale-[1.02]"
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

// MR Territory restriction info
type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: {
        companyCode: string;
        companyName: string;
        divisionCode: string;
        divisionName: string;
        subDivisionCode: string;
        subDivisionName: string;
        categoryCode: string;
        categoryName: string;
    }[];
    allowedCompanyCodes: string[];
};

export default function ProductsFullViewPage() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pageSize, setPageSize] = useState<number>(10);

    // MR Territory state
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const state: VisibilityState = {};
        ALL_FIELDS.forEach((f) => {
            state[f.key] = DEFAULT_VISIBLE.includes(f.key);
        });
        return state;
    });

    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Selected product for quick side drawer
    const [selectedProductDrawer, setSelectedProductDrawer] = useState<Product | null>(null);

    // Preset Tabs: "all" | "low_stock" | "high_margin" | "active" | "inactive"
    const [activeTab, setActiveTab] = useState<string>("all");

    // Filters
    const [search, setSearch] = useState("");
    const [company, setCompany] = useState("");
    const [status, setStatus] = useState("");
    const [stockStatus, setStockStatus] = useState("");
    const [unit, setUnit] = useState("");
    const [igst, setIgst] = useState("");
    const [hsn, setHsn] = useState("");
    const [minMRP, setMinMRP] = useState("");
    const [maxMRP, setMaxMRP] = useState("");
    const [minStock, setMinStock] = useState("");
    const [maxStock, setMaxStock] = useState("");

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [selectedCompany?._id, selectedFY?._id]);

    // Fetch current user's territory info (for displaying restriction badge)
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
            // Silently ignore — territory info is cosmetic only; actual filtering is server-side
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            if (selectedFY?._id) params.set("fyId", selectedFY._id);
            const res = await fetch(`/api/master/product?${params.toString()}`);
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    const companyOptions = useMemo(
        () => Array.from(new Set(products.map((p) => p.companyName || p.GCODE).filter(Boolean))).sort(),
        [products]
    );
    const unitOptions = useMemo(
        () => Array.from(new Set(products.map((p) => p.UNIT).filter(Boolean))).sort(),
        [products]
    );
    const igstOptions = useMemo(
        () =>
            Array.from(new Set(products.map((p) => p.IGST).filter((v) => v !== undefined && v !== null))).sort(
                (a, b) => Number(a) - Number(b)
            ),
        [products]
    );

    const resetFilters = () => {
        setSearch("");
        setCompany("");
        setStatus("");
        setStockStatus("");
        setUnit("");
        setIgst("");
        setHsn("");
        setMinMRP("");
        setMaxMRP("");
        setMinStock("");
        setMaxStock("");
        setActiveTab("all");
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();

        let base = products.filter((p) => {
            const comp = p.companyName || p.GCODE || "";
            const bal = Number(p.BALANCE || 0);

            if (
                s &&
                !(
                    (p.PRODUCT || "").toLowerCase().includes(s) ||
                    String(p.CODE || "").toLowerCase().includes(s) ||
                    (p.GCODE || "").toLowerCase().includes(s) ||
                    String(comp).toLowerCase().includes(s) ||
                    (p.HSN || "").toString().toLowerCase().includes(s)
                )
            )
                return false;

            if (company && comp !== company) return false;
            if (status && p.STATUS !== status) return false;
            if (unit && p.UNIT !== unit) return false;
            if (igst && String(p.IGST ?? "") !== String(igst)) return false;
            if (hsn && !String(p.HSN || "").toLowerCase().includes(hsn.toLowerCase())) return false;

            if (stockStatus === "in" && bal <= 10) return false;
            if (stockStatus === "low" && !(bal > 0 && bal <= 10)) return false;
            if (stockStatus === "out" && bal > 0) return false;

            if (minMRP && Number(p.MRP || 0) < Number(minMRP)) return false;
            if (maxMRP && Number(p.MRP || 0) > Number(maxMRP)) return false;
            if (minStock && bal < Number(minStock)) return false;
            if (maxStock && bal > Number(maxStock)) return false;

            return true;
        });

        // Tab Presets
        if (activeTab === "low_stock") {
            base = base.filter((p) => Number(p.BALANCE || 0) <= 10);
            base.sort((a, b) => Number(a.BALANCE || 0) - Number(b.BALANCE || 0));
        } else if (activeTab === "high_margin") {
            base = base.filter((p) => Number(p.marginPct || 0) >= 20);
            base.sort((a, b) => Number(b.marginPct || 0) - Number(a.marginPct || 0));
        } else if (activeTab === "active") {
            base = base.filter((p) => p.STATUS === "Y");
        } else if (activeTab === "inactive") {
            base = base.filter((p) => p.STATUS === "N" || p.STATUS === "C");
        }

        return base;
    }, [
        products,
        search,
        company,
        status,
        unit,
        igst,
        hsn,
        stockStatus,
        minMRP,
        maxMRP,
        minStock,
        maxStock,
        activeTab,
    ]);

    const totalCount = filtered.length;
    const activeCount = filtered.filter((p) => p.STATUS === "Y").length;
    const inactiveCount = totalCount - activeCount;
    const lowOrOutOfStockCount = filtered.filter((p) => Number(p.BALANCE || 0) <= 10).length;
    const totalValuation = filtered.reduce((sum, p) => sum + Number(p.stockValue || 0), 0);

    const columns = useMemo(() => {
        const cols: ColumnDef<Product, any>[] = ALL_FIELDS.map((f) => {
            const accessor = f.derived ? (row: Product) => row.companyName || row.GCODE : f.key;

            return columnHelper.accessor(accessor as any, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "percent") return pct(val);
                    if (f.type === "margin") {
                        const m = Number(val || 0);
                        return (
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${m >= 25
                                    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30"
                                    : m >= 10
                                        ? "bg-blue-500/15 text-blue-700 ring-blue-500/30"
                                        : "bg-amber-500/15 text-amber-700 ring-amber-500/30"
                                    }`}
                            >
                                {m}%
                            </span>
                        );
                    }
                    if (f.type === "status") {
                        return val === "Y" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
                                Inactive
                            </span>
                        );
                    }
                    if (f.type === "stock") {
                        const n = Number(val || 0);
                        return (
                            <span
                                className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${stockClasses(
                                    n
                                )}`}
                            >
                                {n.toLocaleString()}
                            </span>
                        );
                    }
                    if (f.key === "PRODUCT") {
                        return <span className="font-bold text-gray-800">{val || "—"}</span>;
                    }
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            });
        });

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Actions",
                cell: (info) => (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSelectedProductDrawer(info.row.original)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-600 hover:text-white transition-all"
                            title="Quick Product Drawer"
                        >
                            <FaIdCard size={11} /> Quick
                        </button>
                    </div>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "money" || f.type === "percent" || f.type === "stock" || f.type === "margin").map(
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
        XLSX.utils.book_append_sheet(wb, ws, "Products");
        XLSX.writeFile(wb, `products_catalog_export_${Date.now()}.xlsx`);
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
                            Aap sirf apni assigned territory ke products dekh sakte hain.
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
                    label="Products"
                    value={totalCount}
                    tone="bg-blue-500"
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                />
                <StatChip
                    label="Active Catalog"
                    value={activeCount}
                    tone="bg-emerald-500"
                    active={activeTab === "active"}
                    onClick={() => setActiveTab("active")}
                />
                <StatChip
                    label="Low & Out of Stock"
                    value={lowOrOutOfStockCount}
                    tone="bg-rose-500"
                    active={activeTab === "low_stock"}
                    onClick={() => setActiveTab("low_stock")}
                />
                <StatChip
                    label="High Margin (>=20%)"
                    value={filtered.filter((p) => Number(p.marginPct || 0) >= 20).length}
                    tone="bg-indigo-500"
                    active={activeTab === "high_margin"}
                    onClick={() => setActiveTab("high_margin")}
                />
                <StatChip
                    label="Stock Valuation"
                    value={money(totalValuation)}
                    tone="bg-amber-500"
                />
            </div>

            {/* ==================== MAIN CARD CONTAINER ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* Header Toolbar */}
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 text-white">
                            <FaBoxes size={16} />
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-white tracking-wide m-0">Product Master Hub</h5>
                            <p className="text-[11px] text-white/70 m-0">Inventory pricing, margins & stock catalog</p>
                        </div>
                    </div>

                    {/* Presets & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Preset tabs */}
                        <div className="flex items-center bg-white/15 p-1 rounded-xl ring-1 ring-white/20 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setActiveTab("all")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "all" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                    }`}
                            >
                                All Products
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("low_stock")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "low_stock"
                                    ? "bg-white text-indigo-900 shadow-sm font-semibold"
                                    : "text-white/80 hover:text-white"
                                    }`}
                            >
                                <FaExclamationTriangle size={10} /> Low Stock
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("high_margin")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "high_margin"
                                    ? "bg-white text-indigo-900 shadow-sm font-semibold"
                                    : "text-white/80 hover:text-white"
                                    }`}
                            >
                                <FaChartLine size={10} /> High Margin
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("active")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "active" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                    }`}
                            >
                                Active
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search product, code, company, HSN…"
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${showFilters ? "bg-white text-indigo-900" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200 shadow-sm"
                        >
                            <FaFileExcel size={12} /> Excel
                        </button>
                    </div>
                </div>

                {/* Filter dropdown panel */}
                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">
                        <select
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">All Companies</option>
                            {companyOptions.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">All Status</option>
                            <option value="Y">Active</option>
                            <option value="N">Inactive</option>
                        </select>

                        <select
                            value={stockStatus}
                            onChange={(e) => setStockStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">All Stock Levels</option>
                            <option value="in">In Stock (&gt;10)</option>
                            <option value="low">Low Stock (1-10)</option>
                            <option value="out">Out of Stock (0)</option>
                        </select>

                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">All Units</option>
                            {unitOptions.map((u) => (
                                <option key={u} value={u}>
                                    {u}
                                </option>
                            ))}
                        </select>

                        <select
                            value={igst}
                            onChange={(e) => setIgst(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">All IGST %</option>
                            {igstOptions.map((g) => (
                                <option key={g} value={g}>
                                    {g}%
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            value={hsn}
                            onChange={(e) => setHsn(e.target.value)}
                            placeholder="Filter by HSN"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />

                        <input
                            type="number"
                            value={minMRP}
                            onChange={(e) => setMinMRP(e.target.value)}
                            placeholder="Min MRP"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={maxMRP}
                            onChange={(e) => setMaxMRP(e.target.value)}
                            placeholder="Max MRP"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />

                        <input
                            type="number"
                            value={minStock}
                            onChange={(e) => setMinStock(e.target.value)}
                            placeholder="Min Stock"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={maxStock}
                            onChange={(e) => setMaxStock(e.target.value)}
                            placeholder="Max Stock"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
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
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider ${isNumeric ? "text-right" : "text-left"
                                                    } hover:text-blue-600 transition-colors`}
                                            >
                                                <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() &&
                                                        (sortDir === "asc" ? (
                                                            <FaSortUp size={11} className="text-blue-600" />
                                                        ) : sortDir === "desc" ? (
                                                            <FaSortDown size={11} className="text-blue-600" />
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
                                        Loading product catalog…
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-blue-50/30 transition-colors duration-200"
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const isNumeric = numericTypes.has(cell.column.id);
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={`px-4 py-2.5 whitespace-nowrap text-gray-700 tabular-nums ${isNumeric ? "text-right" : "text-left"
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
                                        No products found matching active filters.
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
                            <span className="font-semibold text-gray-800">{table.getFilteredRowModel().rows.length}</span> products
                        </span>

                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded-lg px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs outline-none focus:ring-blue-500"
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
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>
                        <button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== PRODUCT QUICK-VIEW SIDE DRAWER ==================== */}
            {selectedProductDrawer && (
                <div
                    className="fixed inset-0 z-[110] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setSelectedProductDrawer(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-xl md:max-w-2xl h-full flex flex-col bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                    >
                        {/* Drawer Header */}
                        <div className="relative flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 text-white shrink-0">
                                    <FaBoxes size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm sm:text-base font-bold tracking-wide m-0 truncate">
                                        {selectedProductDrawer.PRODUCT}
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-white/80 m-0 truncate">
                                        Code: {selectedProductDrawer.CODE} &middot; {selectedProductDrawer.companyName || selectedProductDrawer.GCODE || "No Company"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedProductDrawer(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                                aria-label="Close drawer"
                            >
                                <span>Close</span>
                                <FaTimes size={13} />
                            </button>
                        </div>

                        {/* Drawer Body Content */}
                        <div className="flex-1 p-4 sm:p-6 space-y-5">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase block">MRP</span>
                                    <span className="text-sm font-extrabold text-blue-950 block">{money(selectedProductDrawer.MRP)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                                    <span className="text-[10px] font-semibold text-emerald-600 uppercase block">Sale Rate (RATE F)</span>
                                    <span className="text-sm font-extrabold text-emerald-950 block">{money(selectedProductDrawer.RATEF)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                                    <span className="text-[10px] font-semibold text-amber-600 uppercase block">Purchase Rate</span>
                                    <span className="text-sm font-extrabold text-amber-950 block">{money(selectedProductDrawer.PRATE)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                                    <span className="text-[10px] font-semibold text-indigo-600 uppercase block">Profit Margin</span>
                                    <span className="text-sm font-extrabold text-indigo-950 block">
                                        {selectedProductDrawer.marginPct || 0}%
                                    </span>
                                </div>
                            </div>

                            {/* Stock & Reorder Breakdown */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <FaCoins className="text-[#343872]" /> Stock & Inventory Status
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${stockClasses(
                                            Number(selectedProductDrawer.BALANCE || 0)
                                        )}`}
                                    >
                                        {Number(selectedProductDrawer.BALANCE || 0) <= 0
                                            ? "Out of Stock"
                                            : Number(selectedProductDrawer.BALANCE || 0) <= 10
                                                ? "Low Stock Alert"
                                                : "In Stock"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-gray-600">
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">Current Balance:</span>
                                        <span className="font-bold text-gray-800 text-sm">
                                            {Number(selectedProductDrawer.BALANCE || 0).toLocaleString()} {selectedProductDrawer.UNIT}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">Stock Value:</span>
                                        <span className="font-bold text-emerald-700 text-sm">
                                            {money(selectedProductDrawer.stockValue)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">Min Limit:</span>
                                        <span className="font-medium text-gray-800">{selectedProductDrawer.MINIMUM || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">Max Limit:</span>
                                        <span className="font-medium text-gray-800">{selectedProductDrawer.MAXIMUM || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* GST & Tax Specification */}
                            <div className="space-y-2 border-t pt-4 border-gray-100">
                                <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <FaTag className="text-[#343872]" /> Tax & HSN Specification
                                </h6>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">HSN / SAC:</span>
                                        <span className="font-bold text-gray-800">{selectedProductDrawer.HSN || "—"}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">CGST:</span>
                                        <span className="font-semibold text-gray-800">{selectedProductDrawer.CGST || 0}%</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">SGST:</span>
                                        <span className="font-semibold text-gray-800">{selectedProductDrawer.SGST || 0}%</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">IGST:</span>
                                        <span className="font-bold text-indigo-700">{selectedProductDrawer.IGST || 0}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Rate Tiers */}
                            <div className="space-y-2 border-t pt-4 border-gray-100">
                                <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <FaLayerGroup className="text-[#343872]" /> Wholesale Tiered Rates
                                </h6>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">Rate A:</span>
                                        <span className="font-medium text-gray-800">{money(selectedProductDrawer.RATEA)}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">Rate B:</span>
                                        <span className="font-medium text-gray-800">{money(selectedProductDrawer.RATEB)}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">Rate C:</span>
                                        <span className="font-medium text-gray-800">{money(selectedProductDrawer.RATEC)}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">Rate D:</span>
                                        <span className="font-medium text-gray-800">{money(selectedProductDrawer.RATED)}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-400 text-[10px] block">Rate E:</span>
                                        <span className="font-medium text-gray-800">{money(selectedProductDrawer.RATEE)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions with Explicit Close Button */}
                        <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedProductDrawer(null)}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <FaTimes size={12} /> Close Drawer
                            </button>
                            {selectedProductDrawer.HSN && (
                                <Link
                                    href={`/dashboard/master/hsn-master?search=${encodeURIComponent(selectedProductDrawer.HSN)}`}
                                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[#343872] text-white hover:bg-indigo-900 shadow-md transition-all"
                                >
                                    View HSN Tax Master <FaArrowRight size={11} />
                                </Link>
                            )}
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
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
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
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Next Step Footer ── */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P1</span>
                        <span className="text-emerald-600 font-medium">Company</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P2</span>
                        <span className="text-emerald-600 font-medium">Division</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P3</span>
                        <span className="text-emerald-600 font-medium">Sub Division</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P4</span>
                        <span className="text-emerald-600 font-medium">Category</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">P5</span>
                        <span className="font-semibold text-slate-700">Product</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">P6</span>
                        <span>Customer</span>
                        <span className="hidden sm:inline text-slate-300">→</span>
                        <span className="hidden sm:inline">Salesman (MR)</span>
                    </div>
                    <Link
                        href="/dashboard/master/customer-master"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                    >
                        Next Step: Customer
                        <FaArrowRight size={12} />
                    </Link>
                </div>
            </div>
        </div>
    );
}