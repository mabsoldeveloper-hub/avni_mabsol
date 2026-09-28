"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
    FaFileInvoice,
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
    FaPercentage,
    FaExclamationCircle,
    FaBoxOpen,
    FaArrowRight,
    FaIdCard,
} from "react-icons/fa";

type HsnRow = Record<string, any>;

const columnHelper = createColumnHelper<HsnRow>();

function pctRange(min: any, max: any) {
    if (min === null || min === undefined) return "-";
    if (max === null || max === undefined || min === max) return `${min}%`;
    return `${min}% – ${max}%`;
}

type FieldType = "text" | "count" | "range" | "products" | "percent";

type FieldDef = {
    key: string;
    label: string;
    type?: FieldType;
    rangeKeys?: [string, string];
};

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "HSNCODE", label: "HSN / SAC Code" },
            { key: "SCODE", label: "Internal Code" },
            { key: "DESCRIPTION", label: "Description" },
        ],
    },
    {
        label: "GST Information",
        fields: [
            { key: "CGST", label: "CGST %", type: "percent" },
            { key: "SGST", label: "SGST %", type: "percent" },
            { key: "IGST", label: "IGST %", type: "percent" },
            { key: "TOTALGST", label: "Total GST % (Normal)", type: "percent" },
        ],
    },
    {
        label: "Product Coverage",
        fields: [
            { key: "PRODUCTCOUNT", label: "Total Products", type: "count" },
            { key: "ACTIVECOUNT", label: "Active Products", type: "count" },
            { key: "PRODUCTS", label: "Products Summary", type: "products" },
        ],
    },
    {
        label: "Scheme Rate (RATE table)",
        fields: [
            { key: "SCHEMERATE", label: "Scheme Rate %", type: "range", rangeKeys: ["SCHEMERATEMIN", "SCHEMERATEMAX"] },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "HSNCODE",
    "DESCRIPTION",
    "PRODUCTCOUNT",
    "ACTIVECOUNT",
    "CGST",
    "SGST",
    "IGST",
    "TOTALGST",
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
            className={`flex items-center gap-2.5 rounded-xl backdrop-blur-xl border px-3 py-2 text-left shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-200 ${
                active
                    ? "bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.02]"
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

export default function HsnMasterPage() {
    const [rows, setRows] = useState<HsnRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pageSize, setPageSize] = useState<number>(10);
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const state: VisibilityState = {};
        ALL_FIELDS.forEach((f) => {
            state[f.key] = DEFAULT_VISIBLE.includes(f.key);
        });
        return state;
    });

    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Selected HSN for quick side drawer
    const [selectedHsnDrawer, setSelectedHsnDrawer] = useState<HsnRow | null>(null);
    const [drawerProductSearch, setDrawerProductSearch] = useState("");

    // GST Slab Preset Tabs: "all" | "0" | "5" | "12" | "18" | "28" | "unused"
    const [activeTab, setActiveTab] = useState<string>("all");

    // Filters
    const [search, setSearch] = useState("");
    const [coverage, setCoverage] = useState("");
    const [minProducts, setMinProducts] = useState("");
    const [maxProducts, setMaxProducts] = useState("");
    const [minGst, setMinGst] = useState("");
    const [maxGst, setMaxGst] = useState("");

    const loadHsn = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            if (selectedFY?._id) params.set("fyId", selectedFY._id);

            const res = await fetch(`/api/master/hsn?${params.toString()}`);
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load HSN master:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [selectedCompany, selectedFY]);

    useEffect(() => {
        loadHsn();
    }, [loadHsn]);

    const resetFilters = () => {
        setSearch("");
        setCoverage("");
        setMinProducts("");
        setMaxProducts("");
        setMinGst("");
        setMaxGst("");
        setActiveTab("all");
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();

        let base = rows.filter((r) => {
            const count = Number(r.PRODUCTCOUNT || 0);
            const totalGst = r.TOTALGST === null || r.TOTALGST === undefined ? null : Number(r.TOTALGST);

            if (
                s &&
                !(
                    (r.HSNCODE || "").toLowerCase().includes(s) ||
                    (r.DESCRIPTION || "").toLowerCase().includes(s) ||
                    (r.SCODE || "").toLowerCase().includes(s) ||
                    (r.PRODUCTS || "").toLowerCase().includes(s)
                )
            )
                return false;

            if (coverage === "with_products" && count === 0) return false;
            if (coverage === "no_products" && count > 0) return false;

            if (minProducts && count < Number(minProducts)) return false;
            if (maxProducts && count > Number(maxProducts)) return false;

            if (minGst && (totalGst === null || totalGst < Number(minGst))) return false;
            if (maxGst && (totalGst === null || totalGst > Number(maxGst))) return false;

            return true;
        });

        // Tab Presets
        if (activeTab === "0") {
            base = base.filter((r) => Number(r.TOTALGST || 0) === 0);
        } else if (activeTab === "5") {
            base = base.filter((r) => Number(r.TOTALGST || 0) === 5);
        } else if (activeTab === "12") {
            base = base.filter((r) => Number(r.TOTALGST || 0) === 12);
        } else if (activeTab === "18") {
            base = base.filter((r) => Number(r.TOTALGST || 0) === 18);
        } else if (activeTab === "28") {
            base = base.filter((r) => Number(r.TOTALGST || 0) === 28);
        } else if (activeTab === "unused") {
            base = base.filter((r) => Number(r.PRODUCTCOUNT || 0) === 0);
        }

        return base;
    }, [rows, search, coverage, minProducts, maxProducts, minGst, maxGst, activeTab]);

    const totalHsn = filtered.length;
    const totalProducts = filtered.reduce((sum, r) => sum + Number(r.PRODUCTCOUNT || 0), 0);
    const withProducts = filtered.filter((r) => Number(r.PRODUCTCOUNT || 0) > 0).length;
    const withoutProducts = totalHsn - withProducts;

    const slab12Count = rows.filter((r) => Number(r.TOTALGST || 0) === 12).length;
    const slab18Count = rows.filter((r) => Number(r.TOTALGST || 0) === 18).length;

    const columns = useMemo(() => {
        const cols: ColumnDef<HsnRow, any>[] = ALL_FIELDS.map((f) => {
            if (f.type === "range" && f.rangeKeys) {
                const [minKey, maxKey] = f.rangeKeys;
                return columnHelper.accessor((row) => row[maxKey] ?? row[minKey] ?? null, {
                    id: f.key,
                    header: f.label,
                    cell: (info) => {
                        const row = info.row.original;
                        return pctRange(row[minKey], row[maxKey]);
                    },
                });
            }

            return columnHelper.accessor(f.key, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "count") {
                        const count = Number(val || 0);
                        return (
                            <button
                                type="button"
                                onClick={() => setSelectedHsnDrawer(info.row.original)}
                                className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                                    count > 0
                                        ? "bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/30 hover:bg-indigo-600 hover:text-white"
                                        : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                }`}
                                title="Click to view mapped products"
                            >
                                {count}
                            </button>
                        );
                    }
                    if (f.type === "products") {
                        return (
                            <span className="block max-w-[280px] truncate text-xs text-gray-500" title={val || ""}>
                                {val || "-"}
                            </span>
                        );
                    }
                    if (f.type === "percent") {
                        if (val === undefined || val === null) return "-";
                        return <span className="font-semibold text-gray-700">{val}%</span>;
                    }
                    if (f.key === "HSNCODE") {
                        return <span className="font-bold text-gray-800">{val || "—"}</span>;
                    }
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            });
        });

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Action",
                cell: (info) => (
                    <button
                        type="button"
                        onClick={() => setSelectedHsnDrawer(info.row.original)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                        <FaIdCard size={11} /> Products ({info.row.original.PRODUCTCOUNT || 0})
                    </button>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "count" || f.type === "range" || f.type === "percent").map((f) => f.key)
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
        const rowsOut = table.getFilteredRowModel().rows.map((row) => {
            const obj: Record<string, any> = {};
            visibleCols.forEach((col) => {
                const header = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
                const field = ALL_FIELDS.find((f) => f.key === col.id);
                if (field?.type === "range" && field.rangeKeys) {
                    const [minKey, maxKey] = field.rangeKeys;
                    obj[header] = pctRange(row.original[minKey], row.original[maxKey]);
                } else {
                    obj[header] = row.getValue(col.id);
                }
            });
            return obj;
        });

        const ws = XLSX.utils.json_to_sheet(rowsOut);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HSN Master");
        XLSX.writeFile(wb, `hsn_master_export_${Date.now()}.xlsx`);
    };

    // Filter drawer product list
    const drawerProducts = useMemo(() => {
        if (!selectedHsnDrawer) return [];
        const items = selectedHsnDrawer.PRODUCTLIST || [];
        const s = drawerProductSearch.trim().toLowerCase();
        if (!s) return items;
        return items.filter(
            (p: any) =>
                (p.name || "").toLowerCase().includes(s) ||
                (p.code || "").toLowerCase().includes(s) ||
                (p.pack || "").toLowerCase().includes(s)
        );
    }, [selectedHsnDrawer, drawerProductSearch]);

    return (
        <div className="space-y-4 p-2 sm:p-4">
            {/* ==================== STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2.5 items-center">
                <StatChip
                    label="HSN Codes"
                    value={totalHsn}
                    tone="bg-blue-500"
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                />
                <StatChip label="Mapped Products" value={totalProducts} tone="bg-[#343872]" />
                <StatChip
                    label="12% Slab HSN"
                    value={slab12Count}
                    tone="bg-indigo-500"
                    active={activeTab === "12"}
                    onClick={() => setActiveTab("12")}
                />
                <StatChip
                    label="18% Slab HSN"
                    value={slab18Count}
                    tone="bg-amber-500"
                    active={activeTab === "18"}
                    onClick={() => setActiveTab("18")}
                />
                <StatChip
                    label="Unmapped HSN"
                    value={withoutProducts}
                    tone="bg-rose-500"
                    active={activeTab === "unused"}
                    onClick={() => setActiveTab("unused")}
                />
            </div>

            {/* ==================== MAIN CARD CONTAINER ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* Header Toolbar */}
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 text-white">
                            <FaFileInvoice size={16} />
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-white tracking-wide m-0">HSN Tax Master</h5>
                            <p className="text-[11px] text-white/70 m-0">GST codes & product tax classifications</p>
                        </div>
                    </div>

                    {/* Presets & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Slab Tabs */}
                        <div className="flex items-center bg-white/15 p-1 rounded-xl ring-1 ring-white/20 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setActiveTab("all")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "all" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                All HSN
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("12")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "12" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                12% GST
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("18")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "18" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                18% GST
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("28")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "28" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                28% GST
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("unused")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === "unused" ? "bg-white text-indigo-900 shadow-sm font-semibold" : "text-white/80 hover:text-white"
                                }`}
                            >
                                Unmapped
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HSN, description, products…"
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                showFilters ? "bg-white text-indigo-900" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
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
                            value={coverage}
                            onChange={(e) => setCoverage(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        >
                            <option value="">Coverage — All</option>
                            <option value="with_products">Has Products</option>
                            <option value="no_products">No Products Mapped</option>
                        </select>

                        <input
                            type="number"
                            value={minProducts}
                            onChange={(e) => setMinProducts(e.target.value)}
                            placeholder="Min Products"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={maxProducts}
                            onChange={(e) => setMaxProducts(e.target.value)}
                            placeholder="Max Products"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={minGst}
                            onChange={(e) => setMinGst(e.target.value)}
                            placeholder="Min GST %"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/80 ring-1 ring-gray-200 text-gray-700 outline-none focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={maxGst}
                            onChange={(e) => setMaxGst(e.target.value)}
                            placeholder="Max GST %"
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
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider ${
                                                    isNumeric ? "text-right" : "text-left"
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
                                        Loading HSN tax master…
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
                                        No HSN codes found matching active filters.
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
                            <span className="font-semibold text-gray-800">{table.getFilteredRowModel().rows.length}</span> HSN codes
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

            {/* ==================== MAPPED PRODUCTS SIDE DRAWER ==================== */}
            {selectedHsnDrawer && (
                <div
                    className="fixed inset-0 z-[110] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => {
                        setSelectedHsnDrawer(null);
                        setDrawerProductSearch("");
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-xl md:max-w-2xl h-full flex flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
                    >
                        {/* Drawer Header */}
                        <div className="relative flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 text-white shrink-0">
                                    <FaBoxOpen size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm sm:text-base font-bold tracking-wide m-0 truncate">
                                        HSN {selectedHsnDrawer.HSNCODE}
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-white/80 m-0 truncate">
                                        {selectedHsnDrawer.DESCRIPTION || "No description provided"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedHsnDrawer(null);
                                    setDrawerProductSearch("");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                                aria-label="Close drawer"
                            >
                                <span>Close</span>
                                <FaTimes size={13} />
                            </button>
                        </div>

                        {/* Tax Rates Summary Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 shrink-0 text-center text-xs">
                            <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                                <span className="text-[10px] text-gray-500 font-semibold block">CGST</span>
                                <span className="font-bold text-indigo-900">{selectedHsnDrawer.CGST}%</span>
                            </div>
                            <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                                <span className="text-[10px] text-gray-500 font-semibold block">SGST</span>
                                <span className="font-bold text-indigo-900">{selectedHsnDrawer.SGST}%</span>
                            </div>
                            <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                                <span className="text-[10px] text-gray-500 font-semibold block">IGST</span>
                                <span className="font-bold text-indigo-900">{selectedHsnDrawer.IGST}%</span>
                            </div>
                            <div className="bg-indigo-600/10 p-1.5 rounded-lg border border-indigo-200">
                                <span className="text-[10px] text-indigo-700 font-bold block">TOTAL GST</span>
                                <span className="font-extrabold text-indigo-800">{selectedHsnDrawer.TOTALGST}%</span>
                            </div>
                        </div>

                        {/* Drawer Search & Count Bar */}
                        <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                            <div className="relative flex-1">
                                <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={drawerProductSearch}
                                    onChange={(e) => setDrawerProductSearch(e.target.value)}
                                    placeholder="Search mapped products by code, name, pack…"
                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 self-end sm:self-auto shrink-0">
                                {drawerProducts.length} products found
                            </span>
                        </div>

                        {/* Mapped Products List */}
                        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
                            {drawerProducts.length > 0 ? (
                                drawerProducts.map((p: any, idx: number) => (
                                    <div
                                        key={`${p.code}-${idx}`}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-gray-800 truncate">{p.name}</span>
                                                <span
                                                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                                        p.status === "Active"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                                <span>Code: <span className="font-mono text-gray-700">{p.code}</span></span>
                                                {p.pack && <span>Pack: <span className="text-gray-700">{p.pack}</span></span>}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {p.rate > 0 && (
                                                <span className="text-xs font-bold text-indigo-900 block">
                                                    ₹{Number(p.rate).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-400 text-xs">
                                    No products mapped under this HSN code matching search.
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer with Actions & Explicit Close Button */}
                        <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedHsnDrawer(null);
                                    setDrawerProductSearch("");
                                }}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <FaTimes size={12} /> Close Drawer
                            </button>
                            <Link
                                href={`/dashboard/master/product-master?search=${encodeURIComponent(selectedHsnDrawer.HSNCODE)}`}
                                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[#343872] text-white hover:bg-indigo-900 shadow-md transition-all"
                            >
                                Open Product Master <FaArrowRight size={11} />
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
        </div>
    );
}