"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import {
    FaArrowLeft,
    FaSearch,
    FaSync,
    FaFileInvoiceDollar,
    FaFileCsv,
    FaPrint,
    FaChevronLeft,
    FaChevronRight,
    FaBoxes,
    FaChevronDown,
    FaChevronUp,
    FaFilter,
    FaExclamationTriangle,
    FaUsers,
    FaIdCard,
    FaPhoneAlt,
    FaReceipt,
    FaClock,
    FaCalendarAlt,
} from "react-icons/fa";

interface LedgerDetail {
    CODE?: string | null;
    BOOK?: string | null;
    CD?: string | null;
    CREDIT?: number;
    DEBIT?: number;
    DATE?: string | null;
    REMARK1?: string | null;
    REMARK2?: string | null;
}

interface InvoiceDetail {
    VOUCHER?: number;
    VCN?: string | null;
    DATE?: string | null;
    DUEDAYS?: number;
    FINAL?: number;
    GODWON?: string | null;
    TRANSPORT?: string | null;
    LRNO?: string | null;
    LRDA?: string | null;
    FORM?: string | null;
    CHALLAN?: string | null;
    ACCOUNT?: string | null;
    CODEP?: string | null;
}

interface ItemDetail {
    BATCH?: string | null;
    QTY?: number;
    RATE?: number;
    MRP?: number;
    EXP?: string | null;
    MFD?: string | null;
    DSM?: string | null;
    COMPANY?: string | null;
    AMMMOUNT?: number;
}

interface OutstandingRow {
    id: string;
    ORD: string;

    PARNAM?: string | null;
    MAILNAM?: string | null;
    CITY?: string | null;
    CODEP?: string | null;
    SCODE?: string | null;
    STATUS?: string | null;
    PHONE1?: string | null;
    PHONE2?: string | null;
    GSTNO?: string | null;
    DLNO?: string | null;

    AREA?: string | null;
    ROUT?: string | null;
    DSM?: string | null;
    ASM?: string | null;
    RSM?: string | null;

    VOUCHER?: number;
    SVOUCHER?: number;
    ADJVOUCHER?: number;
    ADVANCE?: number | null;
    VCN?: string | null;
    TYPE?: string | null;
    MR?: string | null;
    DDATE?: string | null;
    DUEDAYS?: number;
    FINAL?: number;
    REMARK?: string | null;

    ledger?: LedgerDetail | null;
    invoice?: InvoiceDetail | null;
    items?: ItemDetail[];
}

const DEFAULT_FILTERS = {
    search: "",
    partyCode: "",
    city: "",
    area: "",
    route: "",
    dsm: "",
    type: "",
    mr: "",
    dueFrom: "",
    dueTo: "",
    minAmount: "",
    maxAmount: "",
    onlyOutstanding: "Y",
};

export default function OutstandingReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
    const [page, setPage] = useState(1);
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [rows, setRows] = useState<OutstandingRow[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [summary, setSummary] = useState({
        totalCount: 0,
        totalOutstandingAmount: 0,
        criticalOverdueAmount: 0,
        criticalOverdueCount: 0,
        customerCount: 0,
        avgOutstandingAmount: 0,
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch("/api/master/customer");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || data.customers || []);
                setCustomers(list);
            }
        } catch (err) {
            console.error("Failed to fetch customer options:", err);
        }
    };

    const customerOptions: OptionItem[] = customers.map((c, idx) => {
        const code = String(c.CODEP || c.ORDNO || c.CODE || `cust-${idx}`);
        const name = String(c.PARNAM || c.NAME || c.MAILNAM || code);
        return {
            value: code,
            label: name,
            subLabel: `#${code}${c.CITY ? ` • ${c.CITY}` : ""}`,
        };
    });

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "50",
            });

            Object.entries(appliedFilters).forEach(([key, val]) => {
                if (val) params.set(key, val);
            });

            if (selectedFY) {
                if (selectedFY.isAll) {
                    params.set("fyId", "ALL");
                } else if (selectedFY._id) {
                    params.set("fyId", selectedFY._id);
                    if (selectedFY.startDate && selectedFY.endDate && !appliedFilters.dueFrom && !appliedFilters.dueTo) {
                        params.set("dueFrom", new Date(selectedFY.startDate).toISOString().slice(0, 10));
                        params.set("dueTo", new Date(selectedFY.endDate).toISOString().slice(0, 10));
                    }
                }
            }

            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

            const res = await fetch(`/api/reports/outstanding?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setRows(json.data.rows || []);
                    setSummary({
                        totalCount: json.data.total || 0,
                        totalOutstandingAmount: json.data.totalOutstanding || 0,
                        criticalOverdueAmount: json.data.criticalOverdueAmount || 0,
                        criticalOverdueCount: json.data.criticalOverdueCount || 0,
                        customerCount: json.data.customerCount || 0,
                        avgOutstandingAmount: json.data.avgOutstandingAmount || 0,
                    });
                    setTotalPages(json.data.totalPages || 1);
                } else {
                    setError(json.message || "Failed to load outstanding report");
                }
            }
        } catch (err: any) {
            console.error("Failed to load outstanding report:", err);
            setError(err?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [page, appliedFilters, selectedCompany, selectedFY]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const resetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setPage(1);
    };

    const toggleRow = (id: string) => {
        const updated = new Set(expandedRows);
        if (updated.has(id)) updated.delete(id);
        else updated.add(id);
        setExpandedRows(updated);
    };

    // CSV Export
    const exportCSV = () => {
        if (rows.length === 0) return;
        const headers = [
            "Customer Code", "Customer Name", "City", "Area", "Route", "DSM",
            "VCN", "Voucher", "Due Date", "Due Days", "Pending Amount (₹)", "Remarks",
        ];
        const csvRows = [headers.join(",")];
        rows.forEach((r) => {
            csvRows.push([
                `"${r.CODEP || r.ORD}"`,
                `"${(r.PARNAM || "").replace(/"/g, '""')}"`,
                `"${r.CITY || ""}"`,
                `"${r.AREA || ""}"`,
                `"${r.ROUT || ""}"`,
                `"${r.DSM || ""}"`,
                `"${r.VCN || ""}"`,
                r.VOUCHER || "",
                r.DDATE || "",
                r.DUEDAYS ?? 0,
                r.FINAL ?? 0,
                `"${(r.REMARK || "").replace(/"/g, '""')}"`,
            ].join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Outstanding_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="p-3 sm:p-6 space-y-4 max-w-[1600px] mx-auto print:p-0">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/reports"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition"
                    >
                        <FaArrowLeft size={14} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                Outstanding Executive Report
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                Receivables &amp; Aging Analytics
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Comprehensive ledger receivables tracking with multi-table cross-join analytics across Customer, Pend, Invoice &amp; Batches.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition border border-slate-200 dark:border-slate-700"
                    >
                        <FaFileCsv className="text-emerald-600" size={13} /> Export CSV
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition shadow-sm"
                    >
                        <FaPrint size={12} /> Print Executive Report
                    </button>
                </div>
            </div>

            {/* Top Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">

                {/* Card 1 */}
                <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            Total Outstanding
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.totalOutstandingAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {summary.totalCount} Pending Vouchers
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                        <FaFileInvoiceDollar size={18} />
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                            Total Pending Bills
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            {summary.totalCount} Bills
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Active Vouchers
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <FaReceipt size={17} />
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-900 p-4 rounded-2xl border border-red-200/80 dark:border-red-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider block">
                            Critical Overdue (&gt;30 Days)
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.criticalOverdueAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {summary.criticalOverdueCount} Overdue Vouchers
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                        <FaExclamationTriangle size={18} />
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                            Pending Customers
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            {summary.customerCount} Parties
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            With Outstanding Dues
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FaUsers size={18} />
                    </div>
                </div>

                {/* Card 5 */}
                <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                            Avg Pending Amount
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.avgOutstandingAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Average Ticket Size
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <FaClock size={16} />
                    </div>
                </div>
            </div>

            {/* Standard Executive Filter Panel */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FaFilter className="text-rose-500" /> Standard Executive Filters
                    </span>
                    <button
                        onClick={resetFilters}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                        Reset All Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                    {/* Search */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Particular / Search</label>
                        <div className="relative">
                            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Customer, Code, VCN, Voucher, GST..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Party */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Party / Customer</label>
                        <SearchableSelect
                            options={customerOptions}
                            value={filters.partyCode}
                            onChange={(val) => handleFilterChange("partyCode", val)}
                            placeholder="All Parties"
                        />
                    </div>

                    {/* City */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
                        <input
                            type="text"
                            placeholder="All Cities"
                            value={filters.city}
                            onChange={(e) => handleFilterChange("city", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Area */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Area</label>
                        <input
                            type="text"
                            placeholder="All Areas"
                            value={filters.area}
                            onChange={(e) => handleFilterChange("area", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Route */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Route</label>
                        <input
                            type="text"
                            placeholder="All Routes"
                            value={filters.route}
                            onChange={(e) => handleFilterChange("route", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* DSM */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Salesman (DSM)</label>
                        <input
                            type="text"
                            placeholder="All Salesmen"
                            value={filters.dsm}
                            onChange={(e) => handleFilterChange("dsm", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Min Amount */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Min Amount (₹)</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={filters.minAmount}
                            onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Max Amount */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Max Amount (₹)</label>
                        <input
                            type="number"
                            placeholder="Unlimited"
                            value={filters.maxAmount}
                            onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Due From */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Due From</label>
                        <input
                            type="date"
                            value={filters.dueFrom}
                            onChange={(e) => handleFilterChange("dueFrom", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Due To */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Due To</label>
                        <input
                            type="date"
                            value={filters.dueTo}
                            onChange={(e) => handleFilterChange("dueTo", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={applyFilters}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition shadow-sm"
                    >
                        <FaFilter size={11} /> Apply Filters
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {error}
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Outstanding Vouchers List ({summary.totalCount})
                    </span>
                    <button
                        onClick={fetchReport}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    >
                        <FaSync className={loading ? "animate-spin text-rose-500" : ""} size={13} />
                    </button>
                </div>

                <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-2.5 w-8"></th>
                                <th className="p-2.5 font-mono">Party Code</th>
                                <th className="p-2.5">Customer / Party Name</th>
                                <th className="p-2.5">City &amp; Area</th>
                                <th className="p-2.5">Route &amp; DSM</th>
                                <th className="p-2.5 font-mono">Type &amp; VCN</th>
                                <th className="p-2.5 font-mono text-center">Voucher #</th>
                                <th className="p-2.5 font-mono">Due Date</th>
                                <th className="p-2.5 font-mono text-center">Overdue Days</th>
                                <th className="p-2.5 font-mono text-right">Pending Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        <FaSync size={18} className="animate-spin text-rose-500 mx-auto mb-2" />
                                        Loading outstanding executive report...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        No outstanding records found matching executive filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => {
                                    const isExpanded = expandedRows.has(r.id);
                                    const isOverdue30 = (r.DUEDAYS ?? 0) > 30;

                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                                                onClick={() => toggleRow(r.id)}
                                            >
                                                <td className="p-2.5 text-center text-slate-400">
                                                    {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                </td>
                                                <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    #{r.CODEP || r.ORD}
                                                </td>
                                                <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                                                    {r.PARNAM || r.MAILNAM || "Unknown Party"}
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                                                        {r.GSTNO && (
                                                            <span className="text-slate-500 font-mono">
                                                                <FaIdCard size={8} className="inline mr-0.5" />{r.GSTNO}
                                                            </span>
                                                        )}
                                                        {r.PHONE1 && (
                                                            <span>
                                                                <FaPhoneAlt size={8} className="inline mr-0.5" />{r.PHONE1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                    {r.CITY || "—"}
                                                    {r.AREA && <span className="text-[10px] text-slate-400 block">{r.AREA}</span>}
                                                </td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                    {r.ROUT || "—"}
                                                    {r.DSM && <span className="text-[10px] text-slate-400 block">DSM: {r.DSM}</span>}
                                                </td>
                                                <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                                                    {r.VCN || "—"}
                                                    {r.TYPE && (
                                                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ml-1">
                                                            {r.TYPE}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                                                    {r.VOUCHER || "—"}
                                                </td>
                                                <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                    {r.DDATE || "—"}
                                                </td>
                                                <td className="p-2.5 text-center font-mono">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOverdue30
                                                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                        }`}>
                                                        {r.DUEDAYS ?? 0} days
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                    ₹{(r.FINAL ?? 0).toLocaleString("en-IN")}
                                                </td>
                                            </tr>

                                            {/* Expandable Line Item & Voucher Detail Drawer */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={10} className="p-3">
                                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-inner">

                                                            {/* Invoice Metadata Header */}
                                                            <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
                                                                <span className="flex items-center gap-2">
                                                                    <FaBoxes className="text-rose-500" />
                                                                    Voucher #{r.VOUCHER} — Full Cross-Table Breakdown
                                                                </span>
                                                                <div className="flex items-center gap-4 text-[11px] font-normal text-slate-500">
                                                                    {r.invoice?.GODWON && <span>Godown: <strong>{r.invoice.GODWON}</strong></span>}
                                                                    {r.invoice?.TRANSPORT && <span>Transport: <strong>{r.invoice.TRANSPORT}</strong></span>}
                                                                    {r.invoice?.LRNO && <span>LR No: <strong>{r.invoice.LRNO}</strong></span>}
                                                                    {r.invoice?.CHALLAN && <span>Challan: <strong>{r.invoice.CHALLAN}</strong></span>}
                                                                </div>
                                                            </div>

                                                            {/* Line Items Table */}
                                                            {r.items && r.items.length > 0 ? (
                                                                <div>
                                                                    <span className="text-[11px] font-bold text-slate-500 mb-1 block">Line-Item Batch Breakdown</span>
                                                                    <table className="w-full text-left text-xs border-collapse">
                                                                        <thead className="text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800">
                                                                            <tr>
                                                                                <th className="p-2 font-mono">Batch No</th>
                                                                                <th className="p-2 font-mono text-center">Qty</th>
                                                                                <th className="p-2 font-mono text-right">Rate (₹)</th>
                                                                                <th className="p-2 font-mono text-right">MRP (₹)</th>
                                                                                <th className="p-2 font-mono">Expiry</th>
                                                                                <th className="p-2 font-mono text-right">Amount (₹)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                            {r.items.map((it, idx) => (
                                                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                                    <td className="p-2 font-mono font-semibold">{it.BATCH || "N/A"}</td>
                                                                                    <td className="p-2 font-mono text-center font-bold text-rose-600">{it.QTY ?? 1}</td>
                                                                                    <td className="p-2 font-mono text-right">₹{it.RATE ?? 0}</td>
                                                                                    <td className="p-2 font-mono text-right">₹{it.MRP ?? 0}</td>
                                                                                    <td className="p-2 font-mono text-slate-500">{it.EXP || "N/A"}</td>
                                                                                    <td className="p-2 font-mono text-right font-bold text-slate-900 dark:text-white">
                                                                                        ₹{(it.AMMMOUNT ?? 0).toLocaleString("en-IN")}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-400">
                                                                    No specific line-item batch records linked to this pending voucher.
                                                                </p>
                                                            )}

                                                            {/* Ledger remark fallback */}
                                                            {r.REMARK && (
                                                                <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                    <strong>Voucher Remarks:</strong> {r.REMARK}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2 text-xs print:hidden">
                    <span className="text-slate-500">
                        Page {page} of {totalPages} ({summary.totalCount} total outstanding vouchers)
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((p) => p - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage((p) => p + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}