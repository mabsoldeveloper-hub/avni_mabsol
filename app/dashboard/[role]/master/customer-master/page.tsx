"use client";

// NOTE: Put this file at: src/app/dashboard/customers/full/page.tsx
// It reads data from: /api/customers/full  (see route.ts)
//
// Requires the "xlsx" package for the Excel export button:
//   npm install xlsx

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
    FaUsers,
    FaUserCheck,
    FaWallet,
    FaCoins,
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
    FaArrowRight,
    FaMapMarkerAlt,
    FaBuilding,
} from "react-icons/fa";

type Customer = Record<string, any>;

const columnHelper = createColumnHelper<Customer>();

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
/* Field configuration — every field on the Customer / Order    */
/* table, grouped, plus the joined/derived fields from          */
/* AccountGroup, DIS, MDIS, GLEDGER and SaleType.                */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "date" | "status" | "balance";

type FieldDef = { key: string; label: string; type?: FieldType };

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "ORDNO", label: "Customer Code" },
            { key: "PARNAM", label: "Customer Name" },
            { key: "MAILNAM", label: "Display Name" },
            { key: "CODER", label: "Reference Code" },
            { key: "TYPE", label: "Type" },
            { key: "STATUS", label: "Status", type: "status" },
            { key: "GROUPNAME", label: "Group" },
            { key: "MAINGROUP", label: "Main Group" },
            { key: "PARENTGROUP", label: "Parent Group" },
        ],
    },
    {
        label: "Contact Details",
        fields: [
            { key: "PHONE1", label: "Phone 1" },
            { key: "PHONE2", label: "Phone 2" },
            { key: "PHONE3", label: "Phone 3" },
            { key: "PHONE4", label: "Phone 4" },
            { key: "FAX1", label: "Fax 1" },
            { key: "FAX2", label: "Fax 2" },
        ],
    },
    {
        label: "Address",
        fields: [
            { key: "PARADD", label: "Address Line 1" },
            { key: "PARADD1", label: "Address Line 2" },
            { key: "PARADD2", label: "Address Line 3" },
            { key: "CITY", label: "City" },
            { key: "AREA", label: "Area" },
        ],
    },
    {
        label: "Tax / Legal",
        fields: [
            { key: "GSTNO", label: "GST No" },
            { key: "GSTDATE", label: "GST Date", type: "date" },
            { key: "DLNO", label: "DL No" },
            { key: "CSTNO", label: "CST No" },
            { key: "CSTDATE", label: "CST Date", type: "date" },
            { key: "CIN", label: "CIN" },
            { key: "FORM", label: "Form" },
            { key: "TAX", label: "Tax" },
            { key: "TAXTYPENAME", label: "Tax Type Name" },
        ],
    },
    {
        label: "Financial",
        fields: [
            { key: "BALANCE", label: "Outstanding Balance", type: "balance" },
            { key: "CREDIT", label: "Credit", type: "money" },
            { key: "CREDITD", label: "Credit Days" },
            { key: "LIMIT", label: "Credit Limit", type: "money" },
            { key: "DUEDAYS", label: "Due Days" },
            { key: "OPNING", label: "Opening Balance", type: "money" },
            { key: "OPNINGD", label: "Opening Debit/Credit" },
            { key: "TARGET", label: "Target", type: "money" },
            { key: "RATE", label: "Rate" },
            { key: "PRICE", label: "Price" },
        ],
    },
    {
        label: "Sales Configuration",
        fields: [
            { key: "SCODE", label: "Sale Code" },
            { key: "DISC1", label: "Discount 1" },
            { key: "DISC2", label: "Discount 2" },
            { key: "DEAL", label: "Deal" },
            { key: "FREE", label: "Free Scheme" },
            { key: "SALUN", label: "Sale Unit" },
            { key: "SALSC", label: "Sale Scheme" },
        ],
    },
    {
        label: "Staff & Route",
        fields: [
            { key: "DSM", label: "DSM" },
            { key: "RSM", label: "RSM" },
            { key: "ASM", label: "ASM" },
            { key: "ROUT", label: "Route" },
            { key: "MR", label: "MR" },
            { key: "HQT", label: "Headquarter" },
        ],
    },
    {
        label: "Sales & Purchase Summary",
        fields: [
            { key: "TOTALSALES", label: "Total Sales", type: "money" },
            { key: "SALECOUNT", label: "Sale Vouchers" },
            { key: "LASTSALEDATE", label: "Last Sale Date", type: "date" },
            { key: "TOTALPURCHASE", label: "Total Purchase", type: "money" },
            { key: "PURCHASECOUNT", label: "Purchase Vouchers" },
            { key: "LASTPURCHASEDATE", label: "Last Purchase Date", type: "date" },
        ],
    },
    {
        label: "Ledger",
        fields: [
            { key: "LEDGERDEBIT", label: "Ledger Debit", type: "money" },
            { key: "LEDGERCREDIT", label: "Ledger Credit", type: "money" },
            { key: "LEDGERBALANCE", label: "Ledger Balance", type: "balance" },
            { key: "LEDGERTXNCOUNT", label: "Ledger Entries" },
            { key: "LASTLEDGERDATE", label: "Last Ledger Date", type: "date" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "ORDNO",
    "PARNAM",
    "GROUPNAME",
    "CITY",
    "PHONE1",
    "GSTNO",
    "BALANCE",
    "STATUS",
    "TOTALSALES",
    "LASTSALEDATE",
];

/* ---------------------------------------------------------- */
/* KPI chip                                                      */
/* ---------------------------------------------------------- */

function StatChip({ label, value, tone }: { label: string; value: string | number; tone: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">{value}</span>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Main page                                                    */
/* ---------------------------------------------------------- */

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

export default function CustomerFullViewPage() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

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
    const [group, setGroup] = useState("");
    const [status, setStatus] = useState(""); // "", "Y", "N"
    const [city, setCity] = useState("");
    const [dsm, setDsm] = useState("");
    const [rsm, setRsm] = useState("");
    const [balanceStatus, setBalanceStatus] = useState(""); // "", "outstanding", "credit", "zero"
    const [gstStatus, setGstStatus] = useState(""); // "", "with", "without"
    const [salesActivity, setSalesActivity] = useState(""); // "", "with_sales", "no_sales"
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [minSales, setMinSales] = useState("");
    const [maxSales, setMaxSales] = useState("");

    useEffect(() => {
        loadMrTerritoryInfo();
        loadCustomers();
    }, [selectedCompany?._id, selectedFY?._id]);

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

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            if (selectedFY?._id) params.set("fyId", selectedFY._id);
            const res = await fetch(`/api/master/customer?${params.toString()}`);
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    // ---- Distinct filter options derived from data ---------------
    const groupOptions = useMemo(
        () => Array.from(new Set(customers.map((c) => c.GROUPNAME).filter(Boolean))).sort(),
        [customers]
    );
    const cityOptions = useMemo(
        () => Array.from(new Set(customers.map((c) => c.CITY).filter(Boolean))).sort(),
        [customers]
    );
    const dsmOptions = useMemo(
        () => Array.from(new Set(customers.map((c) => c.DSM).filter(Boolean))).sort(),
        [customers]
    );
    const rsmOptions = useMemo(
        () => Array.from(new Set(customers.map((c) => c.RSM).filter(Boolean))).sort(),
        [customers]
    );

    const resetFilters = () => {
        setSearch("");
        setGroup("");
        setStatus("");
        setCity("");
        setDsm("");
        setRsm("");
        setBalanceStatus("");
        setGstStatus("");
        setSalesActivity("");
        setMinBalance("");
        setMaxBalance("");
        setMinSales("");
        setMaxSales("");
    };

    // ---- Filtering -------------------------------------------------
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return customers.filter((c) => {
            const bal = Number(c.BALANCE || 0);
            const sales = Number(c.TOTALSALES || 0);

            if (
                s &&
                !(
                    (c.PARNAM || "").toLowerCase().includes(s) ||
                    (c.MAILNAM || "").toLowerCase().includes(s) ||
                    String(c.ORDNO || "").toLowerCase().includes(s) ||
                    (c.GSTNO || "").toLowerCase().includes(s) ||
                    (c.PHONE1 || "").toLowerCase().includes(s) ||
                    (c.CITY || "").toLowerCase().includes(s)
                )
            )
                return false;

            if (group && c.GROUPNAME !== group) return false;
            if (status && c.STATUS !== status) return false;
            if (city && c.CITY !== city) return false;
            if (dsm && c.DSM !== dsm) return false;
            if (rsm && c.RSM !== rsm) return false;

            if (balanceStatus === "outstanding" && !(bal > 0)) return false;
            if (balanceStatus === "credit" && !(bal < 0)) return false;
            if (balanceStatus === "zero" && bal !== 0) return false;

            if (gstStatus === "with" && !c.GSTNO) return false;
            if (gstStatus === "without" && c.GSTNO) return false;

            if (salesActivity === "with_sales" && !(sales > 0)) return false;
            if (salesActivity === "no_sales" && sales > 0) return false;

            if (minBalance && bal < Number(minBalance)) return false;
            if (maxBalance && bal > Number(maxBalance)) return false;
            if (minSales && sales < Number(minSales)) return false;
            if (maxSales && sales > Number(maxSales)) return false;

            return true;
        });
    }, [
        customers,
        search,
        group,
        status,
        city,
        dsm,
        rsm,
        balanceStatus,
        gstStatus,
        salesActivity,
        minBalance,
        maxBalance,
        minSales,
        maxSales,
    ]);

    const totalCount = filtered.length;
    const activeCount = filtered.filter((c) => c.STATUS === "Y").length;
    const totalOutstanding = filtered.reduce((sum, c) => sum + Math.max(Number(c.BALANCE || 0), 0), 0);
    const totalSalesSum = filtered.reduce((sum, c) => sum + Number(c.TOTALSALES || 0), 0);

    // ---- Columns ---------------------------------------------------
    const columns = useMemo(() => {
        const cols: ColumnDef<Customer, any>[] = ALL_FIELDS.map((f) =>
            columnHelper.accessor(f.key, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "date") return fmtDate(val);
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
                            href={`/dashboard/customers/view/${info.row.original._id}`}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-blue-600 ring-1 ring-blue-500/30 hover:bg-blue-500 hover:text-white hover:ring-blue-500 transition-all duration-200"
                        >
                            View
                        </Link>
                        <Link
                            href={`/dashboard/customers/ledger/${info.row.original._id}`}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-emerald-600 ring-1 ring-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500 transition-all duration-200"
                        >
                            Ledger
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
        initialState: { pagination: { pageSize: 10 } },
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
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, `customers_full_export_${Date.now()}.xlsx`);
    };

    return (
        <div className="space-y-4">
            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ke customers dekh sakte hain.
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

            {/* ==================== STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2">
                <StatChip label="Customers" value={totalCount} tone="bg-blue-500" />
                <StatChip label="Active" value={activeCount} tone="bg-emerald-500" />
                <StatChip label="Outstanding" value={money(totalOutstanding)} tone="bg-rose-500" />
                <StatChip label="Total Sales" value={money(totalSalesSum)} tone="bg-indigo-500" />
                <StatChip label="Columns shown" value={`${visibleCount}/${ALL_FIELDS.length}`} tone="bg-violet-500" />
            </div>

            {/* ==================== MAIN CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaUsers size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">Ledger/Customer Master — Full View</h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, code, GST, phone, city..."
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
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Groups</option>
                            {groupOptions.map((g) => (
                                <option key={g} value={g}>
                                    {g}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="Y">Active</option>
                            <option value="N">Inactive</option>
                        </select>

                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Cities</option>
                            {cityOptions.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>

                        <select
                            value={dsm}
                            onChange={(e) => setDsm(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
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
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
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
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Balances</option>
                            <option value="outstanding">Outstanding (Dr)</option>
                            <option value="credit">Advance (Cr)</option>
                            <option value="zero">Zero Balance</option>
                        </select>

                        <select
                            value={gstStatus}
                            onChange={(e) => setGstStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">GST — All</option>
                            <option value="with">GST No. Present</option>
                            <option value="without">GST No. Missing</option>
                        </select>

                        <select
                            value={salesActivity}
                            onChange={(e) => setSalesActivity(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">Sales Activity — All</option>
                            <option value="with_sales">Has Sales</option>
                            <option value="no_sales">No Sales Yet</option>
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
                            value={minSales}
                            onChange={(e) => setMinSales(e.target.value)}
                            placeholder="Min Total Sales"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={maxSales}
                            onChange={(e) => setMaxSales(e.target.value)}
                            placeholder="Max Total Sales"
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
                                        Loading ledger...
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
                                        No ledger found
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
                        {/* modal header */}
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

                        {/* global select all / clear all */}
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

                        {/* scrollable field groups */}
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

                        {/* footer */}
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
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P5</span>
                        <span className="text-emerald-600 font-medium">Product</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">P6</span>
                        <span className="font-semibold text-slate-700">Customer</span>
                        <span className="text-slate-300">→</span>
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">P7</span>
                        <span>Salesman (MR)</span>
                    </div>
                    <Link
                        href="/dashboard/master/mr-territory"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                    >
                        Next Step: Salesman (MR)
                        <FaArrowRight size={12} />
                    </Link>
                </div>
            </div>
        </div>
    );
}