"use client";

// File: src/app/dashboard/master/accounting-group-master/page.tsx
// Data source: GET /api/master/accounting-group  (see src/app/api/accountgroup/full/route.ts)
//
// Requires the "xlsx" package for the Excel export button:
//   npm install xlsx

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
    FaSitemap,
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
    FaLayerGroup,
    FaUsers,
    FaWallet,
    FaEye,
    FaBookOpen,
    FaCheckCircle,
    FaTimesCircle,
    FaTable,
    FaProjectDiagram,
    FaCaretDown,
    FaCaretRight,
} from "react-icons/fa";

type AccountGroup = Record<string, any>;

const columnHelper = createColumnHelper<AccountGroup>();

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

/* ---------------------------------------------------------- */
/* Field configuration                                          */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "date" | "flag" | "balance" | "boolyn";

type FieldDef = { key: string; label: string; type?: FieldType };

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "ORDNO", label: "Group Code" },
            { key: "PARNAM", label: "Group Name" },
            { key: "PARENTCODE", label: "Parent Code" },
            { key: "PARENTNAME", label: "Parent Group" },
            { key: "ISROOT", label: "Root Group", type: "flag" },
            { key: "CHILDCOUNT", label: "Sub-Groups" },
            { key: "TYPE", label: "Type", type: "boolyn" },
            { key: "CON", label: "Control A/c", type: "boolyn" },
            { key: "SINGLE", label: "Single" },
        ],
    },
    {
        label: "Opening Balance",
        fields: [
            { key: "OPNING", label: "Opening Balance", type: "money" },
            { key: "OPNINGD", label: "Opening Dr/Cr" },
        ],
    },
    {
        label: "Current Financials",
        fields: [
            { key: "DEBIT", label: "Debit", type: "money" },
            { key: "DEBITD", label: "Debit Dr/Cr" },
            { key: "CREDIT", label: "Credit", type: "money" },
            { key: "CREDITD", label: "Credit Dr/Cr" },
            { key: "BALANCE", label: "Balance", type: "balance" },
            { key: "BALANCED", label: "Balance Dr/Cr" },
            { key: "BUDGET", label: "Budget", type: "money" },
        ],
    },
    {
        label: "Voucher Applicability",
        fields: [
            { key: "SALDR", label: "Sales Debit", type: "boolyn" },
            { key: "SALCR", label: "Sales Credit", type: "boolyn" },
            { key: "PURDR", label: "Purchase Debit", type: "boolyn" },
            { key: "PURCR", label: "Purchase Credit", type: "boolyn" },
            { key: "RECDR", label: "Receipt Debit", type: "boolyn" },
            { key: "RECCR", label: "Receipt Credit", type: "boolyn" },
            { key: "PAYDR", label: "Payment Debit", type: "boolyn" },
            { key: "PAYCR", label: "Payment Credit", type: "boolyn" },
        ],
    },
    {
        label: "Customer Rollup",
        fields: [
            { key: "CUSTOMERCOUNT", label: "Customers" },
            { key: "ACTIVECUSTOMERCOUNT", label: "Active Customers" },
            { key: "CUSTOMERBALANCE", label: "Customers Balance", type: "balance" },
        ],
    },
    {
        label: "Ledger Rollup",
        fields: [
            { key: "LEDGERDEBIT", label: "Ledger Debit", type: "money" },
            { key: "LEDGERCREDIT", label: "Ledger Credit", type: "money" },
            { key: "LEDGERBALANCE", label: "Ledger Balance", type: "balance" },
            { key: "LEDGERTXNCOUNT", label: "Ledger Entries" },
        ],
    },
    {
        label: "Other",
        fields: [
            { key: "CIN", label: "CIN" },
            { key: "COUT", label: "COUT" },
            { key: "DATE", label: "Date", type: "date" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "ORDNO",
    "PARNAM",
    "PARENTNAME",
    "CHILDCOUNT",
    "TYPE",
    "BALANCE",
    "CUSTOMERCOUNT",
    "CUSTOMERBALANCE",
    "LEDGERBALANCE",
];

/* ---------------------------------------------------------- */
/* Stat Chip                                                    */
/* ---------------------------------------------------------- */

function StatChip({ label, value, tone }: { label: string; value: string | number; tone: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="text-xs text-gray-500 font-medium">{label}:</span>
            <span className="text-xs font-bold text-gray-800 tabular-nums">{value}</span>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* KPI Card                                                     */
/* ---------------------------------------------------------- */

function KpiCard({ icon, label, value, sub, gradient }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; gradient: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 flex items-center gap-4">
            <div className={`flex items-center justify-center h-11 w-11 rounded-xl ${gradient} text-white shrink-0 shadow-lg`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-500 truncate">{label}</p>
                <p className="text-lg font-bold text-gray-800 tabular-nums leading-tight">{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
            <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 ${gradient}`} />
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Tree Node                                                    */
/* ---------------------------------------------------------- */

function TreeNode({ group, allGroups, depth = 0 }: {
    group: AccountGroup; allGroups: AccountGroup[]; depth?: number;
}) {
    const [open, setOpen] = useState(depth < 1);
    const children = allGroups.filter((g) => g.PARENTCODE && group.ORDNO && String(g.PARENTCODE).trim() === String(group.ORDNO).trim());
    const hasChildren = children.length > 0;
    const bal = Number(group.BALANCE || 0);
    return (
        <div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/60 transition-all group ${depth === 0 ? "border border-white/40 bg-white/30 mb-1" : "border-l-2 border-indigo-100"}`} style={{ marginLeft: depth * 16 }}>
                {hasChildren ? (
                    <button onClick={() => setOpen((v) => !v)} className="text-indigo-400 hover:text-indigo-600 transition-colors shrink-0">
                        {open ? <FaCaretDown size={12} /> : <FaCaretRight size={12} />}
                    </button>
                ) : <span className="w-3 shrink-0" />}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{group.PARNAM}</p>
                        <p className="text-[10px] text-gray-400">{group.ORDNO}</p>
                    </div>
                    {group.ISROOT && <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/30">Root</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {hasChildren && <span className="text-[10px] text-gray-400">{children.length} sub</span>}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${balanceClasses(bal)}`}>{money(bal)}</span>
                    <div className="hidden group-hover:flex items-center gap-1">
                        <Link href={`/dashboard/master/accounting-group-master/view/${group._id}`} onClick={(e) => e.stopPropagation()} className="flex items-center justify-center h-5 w-5 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all"><FaEye size={9} /></Link>
                        <Link href={`/dashboard/master/accounting-group-master/ledger/${group._id}`} onClick={(e) => e.stopPropagation()} className="flex items-center justify-center h-5 w-5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><FaBookOpen size={9} /></Link>
                    </div>
                </div>
            </div>
            {open && hasChildren && children.map((child) => <TreeNode key={child._id} group={child} allGroups={allGroups} depth={depth + 1} />)}
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Main page                                                    */
/* ---------------------------------------------------------- */

export default function AccountGroupFullViewPage() {
    const [groups, setGroups] = useState<AccountGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [viewMode, setViewMode] = useState<"table" | "tree">("table");
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
    const [showFilters, setShowFilters] = useState(true);

    // ---- Filters -------------------------------------------------
    const [search, setSearch] = useState("");
    const [parentGroup, setParentGroup] = useState("");
    const [levelFilter, setLevelFilter] = useState(""); // "", "root", "sub"
    const [controlFilter, setControlFilter] = useState(""); // "", "Y", "N"
    const [balanceStatus, setBalanceStatus] = useState(""); // "", "debit", "credit", "zero"
    const [customerActivity, setCustomerActivity] = useState(""); // "", "with_customers", "no_customers"
    const [voucherFlag, setVoucherFlag] = useState("");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [minCustomers, setMinCustomers] = useState("");
    const [maxCustomers, setMaxCustomers] = useState("");

    const loadGroups = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            if (selectedFY?._id) params.set("fyId", selectedFY._id);

            const res = await fetch(`/api/master/accounting-group?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load account groups");
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [selectedCompany, selectedFY]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    // ---- Distinct filter options derived from data ---------------
    const parentOptions = useMemo(
        () => Array.from(new Set(groups.map((g) => g.PARENTNAME).filter(Boolean))).sort(),
        [groups]
    );

    const resetFilters = () => {
        setSearch("");
        setParentGroup("");
        setLevelFilter("");
        setControlFilter("");
        setBalanceStatus("");
        setCustomerActivity("");
        setVoucherFlag("");
        setMinBalance("");
        setMaxBalance("");
        setMinCustomers("");
        setMaxCustomers("");
    };

    // ---- Filtering -------------------------------------------------
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return groups.filter((g) => {
            const bal = Number(g.BALANCE || 0);
            const custCount = Number(g.CUSTOMERCOUNT || 0);

            if (
                s &&
                !(
                    (g.PARNAM || "").toLowerCase().includes(s) ||
                    String(g.ORDNO || "").toLowerCase().includes(s) ||
                    (g.PARENTNAME || "").toLowerCase().includes(s)
                )
            )
                return false;

            if (parentGroup && g.PARENTNAME !== parentGroup) return false;
            if (levelFilter === "root" && !g.ISROOT) return false;
            if (levelFilter === "sub" && g.ISROOT) return false;
            if (controlFilter && g.CON !== controlFilter) return false;

            if (balanceStatus === "debit" && !(bal > 0)) return false;
            if (balanceStatus === "credit" && !(bal < 0)) return false;
            if (balanceStatus === "zero" && bal !== 0) return false;

            if (customerActivity === "with_customers" && !(custCount > 0)) return false;
            if (customerActivity === "no_customers" && custCount > 0) return false;

            if (voucherFlag && g[voucherFlag] !== "Y") return false;

            if (minBalance && bal < Number(minBalance)) return false;
            if (maxBalance && bal > Number(maxBalance)) return false;
            if (minCustomers && custCount < Number(minCustomers)) return false;
            if (maxCustomers && custCount > Number(maxCustomers)) return false;

            return true;
        });
    }, [
        groups,
        search,
        parentGroup,
        levelFilter,
        controlFilter,
        balanceStatus,
        customerActivity,
        voucherFlag,
        minBalance,
        maxBalance,
        minCustomers,
        maxCustomers,
    ]);

    const totalCount = filtered.length;
    const rootCount = filtered.filter((g) => g.ISROOT).length;
    const totalCustomers = filtered.reduce((sum, g) => sum + Number(g.CUSTOMERCOUNT || 0), 0);
    const activeCustomers = filtered.reduce((sum, g) => sum + Number(g.ACTIVECUSTOMERCOUNT || 0), 0);
    const totalBalance = filtered.reduce((sum, g) => sum + Number(g.BALANCE || 0), 0);
    const totalLedgerDebit = filtered.reduce((sum, g) => sum + Number(g.LEDGERDEBIT || 0), 0);
    const totalLedgerCredit = filtered.reduce((sum, g) => sum + Number(g.LEDGERCREDIT || 0), 0);
    const totalLedgerEntries = filtered.reduce((sum, g) => sum + Number(g.LEDGERTXNCOUNT || 0), 0);
    const rootGroups = useMemo(() => groups.filter((g) => g.ISROOT), [groups]);

    // ---- Columns ---------------------------------------------------
    const columns = useMemo(() => {
        const cols: ColumnDef<AccountGroup, any>[] = ALL_FIELDS.map((f) =>
            columnHelper.accessor(f.key, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "date") return fmtDate(val);
                    if (f.type === "flag") {
                        return val ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/30">
                                <FaCheckCircle size={9} /> Root
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/30">
                                Sub
                            </span>
                        );
                    }
                    if (f.type === "boolyn") {
                        return val === "Y" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                                <FaCheckCircle size={9} /> Yes
                            </span>
                        ) : val === "N" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
                                <FaTimesCircle size={9} /> No
                            </span>
                        ) : (
                            "-"
                        );
                    }
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
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            })
        );

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Action",
                cell: (info) => (
                    <div className="flex gap-1.5">
                        <Link
                            href={`/dashboard/master/accounting-group-master/view/${info.row.original._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 ring-1 ring-blue-500/30 hover:bg-blue-500 hover:text-white hover:ring-blue-500 transition-all duration-200"
                        >
                            <FaEye size={10} /> View
                        </Link>
                        <Link
                            href={`/dashboard/master/accounting-group-master/ledger/${info.row.original._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500 transition-all duration-200"
                        >
                            <FaBookOpen size={10} /> Ledger
                        </Link>
                    </div>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "money" || f.type === "balance").map((f) => f.key)
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
        initialState: { pagination: { pageSize: 15 } },
    });

    const toggleGroup = (group: { label: string; fields: FieldDef[] }, value: boolean) => {
        setColumnVisibility((prev) => {
            const next = { ...prev };
            group.fields.forEach((f) => (next[f.key] = value));
            return next;
        });
    };

    const visibleCount = ALL_FIELDS.filter((f) => columnVisibility[f.key]).length;

    // ---- Excel export ------------------------------------------------
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
        XLSX.utils.book_append_sheet(wb, ws, "AccountGroups");
        XLSX.writeFile(wb, `account_group_full_export_${Date.now()}.xlsx`);
    };

    return (
        <div className="space-y-4">
            {/* ==================== STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2">
                <StatChip label="Groups" value={totalCount} tone="bg-blue-500" />
                <StatChip label="Root Groups" value={rootCount} tone="bg-indigo-500" />
                <StatChip label="Customers Linked" value={totalCustomers} tone="bg-violet-500" />
                <StatChip label="Total Balance" value={money(totalBalance)} tone="bg-rose-500" />
                <StatChip label="Columns shown" value={`${visibleCount}/${ALL_FIELDS.length}`} tone="bg-emerald-500" />
            </div>

            {/* ==================== MAIN CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaSitemap size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">Account Group Master — Full View</h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search group name, code, parent..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaFilter size={11} /> Filters
                        </button>

                        <button
                            onClick={() => setShowColumnPicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaColumns size={11} /> Columns ({visibleCount})
                        </button>

                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200"
                        >
                            <FaFileExcel size={12} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* filters row */}
                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">
                        <select
                            value={parentGroup}
                            onChange={(e) => setParentGroup(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Parent Groups</option>
                            {parentOptions.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>

                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">Root &amp; Sub-groups</option>
                            <option value="root">Root Groups Only</option>
                            <option value="sub">Sub-groups Only</option>
                        </select>

                        <select
                            value={controlFilter}
                            onChange={(e) => setControlFilter(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">Control A/c — All</option>
                            <option value="Y">Control A/c: Yes</option>
                            <option value="N">Control A/c: No</option>
                        </select>

                        <select
                            value={balanceStatus}
                            onChange={(e) => setBalanceStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Balances</option>
                            <option value="debit">Debit Balance</option>
                            <option value="credit">Credit Balance</option>
                            <option value="zero">Zero Balance</option>
                        </select>

                        <select
                            value={customerActivity}
                            onChange={(e) => setCustomerActivity(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">Customers — All</option>
                            <option value="with_customers">Has Customers</option>
                            <option value="no_customers">No Customers</option>
                        </select>

                        <select
                            value={voucherFlag}
                            onChange={(e) => setVoucherFlag(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">Voucher Flag — Any</option>
                            <option value="SALDR">Sales Debit = Y</option>
                            <option value="SALCR">Sales Credit = Y</option>
                            <option value="PURDR">Purchase Debit = Y</option>
                            <option value="PURCR">Purchase Credit = Y</option>
                            <option value="RECDR">Receipt Debit = Y</option>
                            <option value="RECCR">Receipt Credit = Y</option>
                            <option value="PAYDR">Payment Debit = Y</option>
                            <option value="PAYCR">Payment Credit = Y</option>
                        </select>

                        <input
                            type="number"
                            value={minBalance}
                            onChange={(e) => setMinBalance(e.target.value)}
                            placeholder="Min Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={maxBalance}
                            onChange={(e) => setMaxBalance(e.target.value)}
                            placeholder="Max Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={minCustomers}
                            onChange={(e) => setMinCustomers(e.target.value)}
                            placeholder="Min Customers"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={maxCustomers}
                            onChange={(e) => setMaxCustomers(e.target.value)}
                            placeholder="Max Customers"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        <button
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                        >
                            <FaUndo size={10} /> Reset
                        </button>
                    </div>
                )}

                {/* table body */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/30">
                                    {headerGroup.headers.map((header) => {
                                        const sortDir = header.column.getIsSorted();
                                        const isNumeric = numericTypes.has(header.column.id);
                                        return (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide ${isNumeric ? "text-right" : "text-left"
                                                    } hover:text-gray-700 transition-colors`}
                                            >
                                                <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() &&
                                                        (sortDir === "asc" ? (
                                                            <FaSortUp size={11} className="text-slate-500" />
                                                        ) : sortDir === "desc" ? (
                                                            <FaSortDown size={11} className="text-slate-500" />
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
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">
                                        Loading account groups...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={visibleCount + 1} className="text-center text-rose-500 py-10 text-sm">
                                        {error}
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const isNumeric = numericTypes.has(cell.column.id);
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={`px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"
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
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">
                                        No account groups found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* pagination footer */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                    <span>
                        Page <span className="font-semibold text-gray-700">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                        <span className="font-semibold text-gray-700">{table.getPageCount() || 1}</span> &middot;{" "}
                        {table.getFilteredRowModel().rows.length} results
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>
                        <button
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>

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
                                onClick={() => setShowColumnPicker(false)}
                                className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                            >
                                <FaTimes size={12} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                            <span className="text-[11px] text-gray-400">Tick the columns you want in the table</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() =>
                                        setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, true])) as VisibilityState)
                                    }
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                    Select all
                                </button>
                                <button
                                    onClick={() =>
                                        setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, false])) as VisibilityState)
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
                                            <button onClick={() => toggleGroup(group, true)} className="text-blue-500 hover:underline">
                                                all
                                            </button>
                                            <span className="text-gray-300">/</span>
                                            <button onClick={() => toggleGroup(group, false)} className="text-gray-400 hover:underline">
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
                                                    onChange={(e) => setColumnVisibility((prev) => ({ ...prev, [f.key]: e.target.checked }))}
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