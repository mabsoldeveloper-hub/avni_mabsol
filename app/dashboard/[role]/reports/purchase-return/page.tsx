"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
    FaArrowLeft,
    FaSearch,
    FaSync,
    FaExchangeAlt,
    FaFileInvoiceDollar,
    FaFileCsv,
    FaPrint,
    FaChevronLeft,
    FaChevronRight,
    FaBoxes,
    FaChevronDown,
    FaChevronUp,
    FaFilter,
    FaChartLine,
    FaIdCard,
    FaPhoneAlt,
    FaReceipt,
    FaTruck,
    FaWarehouse,
} from "react-icons/fa";

interface PurchaseReturnRow {
    id: string;
    vcn: string;
    date: string;
    originalVcn: string;
    partyCode: string;
    partyName: string;
    city: string;
    area: string;
    route: string;
    company: string;
    division: string;
    salesman: string;
    phone: string;
    gstin: string;
    taxableAmount: number;
    taxAmount: number;
    finalAmount: number;
    remarks: string;
    itemsCount: number;
    totalQty: number;
    items: {
        code: string;
        product: string;
        batchNo: string;
        exp: string;
        qty: number;
        rate: number;
        taxP: number;
        disP: number;
        total: number;
    }[];
}

const DEFAULT_FILTERS = {
    search: "",
    partyCode: "",
    area: "",
    route: "",
    company: "",
    division: "",
    salesman: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
};

export default function PurchaseReturnReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
    const [page, setPage] = useState(1);
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<PurchaseReturnRow[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [summary, setSummary] = useState({
        totalCount: 0,
        totalDebitNoteAmount: 0,
        totalTaxableAmount: 0,
        totalTaxAmount: 0,
        totalItemsQty: 0,
        avgDebitNoteAmount: 0,
    });

    const [filterOptions, setFilterOptions] = useState<{
        areas: string[];
        routes: string[];
        companies: string[];
        divisions: string[];
        salesmen: string[];
    }>({
        areas: [],
        routes: [],
        companies: [],
        divisions: [],
        salesmen: [],
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch("/api/master/customer");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || data.customers || []);
                setCustomers(list);
            }
        } catch (err) {
            console.error("Failed to fetch supplier options:", err);
        }
    };

    const supplierOptions: OptionItem[] = customers.map((c, idx) => {
        const code = String(c.CODEP || c.ORDNO || c.CODE || `sup-${idx}`);
        const name = String(c.PARNAM || c.NAME || c.MAILNAM || code);
        return {
            value: code,
            label: name,
            subLabel: `#${code}${c.CITY ? ` • ${c.CITY}` : ""}`,
        };
    });

    const fetchReport = useCallback(async () => {
        setLoading(true);
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
                    if (selectedFY.startDate && selectedFY.endDate && !appliedFilters.startDate && !appliedFilters.endDate) {
                        params.set("startDate", new Date(selectedFY.startDate).toISOString().slice(0, 10));
                        params.set("endDate", new Date(selectedFY.endDate).toISOString().slice(0, 10));
                    }
                }
            }

            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

            const res = await fetch(`/api/reports/debit-note?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setRows(data.rows || []);
                    setSummary({
                        totalCount: data.summary?.totalCount || 0,
                        totalDebitNoteAmount: data.summary?.totalDebitNoteAmount || 0,
                        totalTaxableAmount: data.summary?.totalTaxableAmount || 0,
                        totalTaxAmount: data.summary?.totalTaxAmount || 0,
                        totalItemsQty: data.summary?.totalItemsQty || 0,
                        avgDebitNoteAmount: data.summary?.avgDebitNoteAmount || 0,
                    });
                    if (data.filterOptions) {
                        setFilterOptions({
                            areas: data.filterOptions.areas || [],
                            routes: data.filterOptions.routes || [],
                            companies: data.filterOptions.companies || [],
                            divisions: data.filterOptions.divisions || [],
                            salesmen: data.filterOptions.salesmen || [],
                        });
                    }
                    setTotalPages(data.pagination?.totalPages || 1);
                }
            }
        } catch (err) {
            console.error("Failed to load purchase return report:", err);
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
            "Debit Note VCN", "Date", "Supplier Code", "Supplier Name", "City", "GSTIN",
            "Phone", "Area", "Route", "Company", "Division", "Salesman",
            "Items Qty", "Taxable Amount", "Tax Amount", "Net Debit Amount", "Remarks",
        ];
        const csvRows = [headers.join(",")];
        rows.forEach((r) => {
            csvRows.push([
                `"${r.vcn}"`,
                r.date,
                `"${r.partyCode}"`,
                `"${r.partyName.replace(/"/g, '""')}"`,
                `"${r.city}"`,
                `"${r.gstin}"`,
                `"${r.phone}"`,
                `"${r.area}"`,
                `"${r.route}"`,
                `"${r.company}"`,
                `"${r.division}"`,
                `"${r.salesman}"`,
                r.totalQty,
                r.taxableAmount,
                r.taxAmount,
                r.finalAmount,
                `"${r.remarks.replace(/"/g, '""')}"`,
            ].join(","));
        });
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Purchase_Return_Debit_Note_Report_${new Date().toISOString().slice(0, 10)}.csv`;
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
                                Purchase Return Executive Report
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                Debit Note Analytics
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Deep-dive purchase returns report — Debit Notes (DN) by Supplier, Area, Route, Company, Division &amp; Salesman.
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition shadow-sm"
                    >
                        <FaPrint size={12} /> Print Report
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
                {/* Card 1 */}
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Total Debit Note Value</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">₹{summary.totalDebitNoteAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{summary.totalCount} DN Vouchers</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <FaExchangeAlt size={17} />
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900 p-4 rounded-2xl border border-orange-200/80 dark:border-orange-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">Taxable Base Amount</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">₹{summary.totalTaxableAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Before GST Base Value</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                        <FaFileInvoiceDollar size={18} />
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/40 dark:to-slate-900 p-4 rounded-2xl border border-yellow-200/80 dark:border-yellow-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider block">GST Input Claimed</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">₹{summary.totalTaxAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">ITC Adjustment on Returns</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center flex-shrink-0">
                        <FaWarehouse size={17} />
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-gradient-to-br from-lime-50 to-white dark:from-lime-950/40 dark:to-slate-900 p-4 rounded-2xl border border-lime-200/80 dark:border-lime-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-lime-700 dark:text-lime-400 uppercase tracking-wider block">Total Returned Qty</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{summary.totalItemsQty} Units</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Supplier Return Stock</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 flex items-center justify-center flex-shrink-0">
                        <FaTruck size={16} />
                    </div>
                </div>

                {/* Card 5 */}
                <div className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-slate-900 p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">Avg Debit Note Value</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">₹{summary.avgDebitNoteAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Average Ticket Size</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                        <FaReceipt size={16} />
                    </div>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FaFilter className="text-amber-500" /> Executive Filters
                    </span>
                    <button onClick={resetFilters} className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
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
                                placeholder="Search DN VCN, Remarks..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Supplier */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Supplier / Party</label>
                        <SearchableSelect
                            options={supplierOptions}
                            value={filters.partyCode}
                            onChange={(val) => handleFilterChange("partyCode", val)}
                            placeholder="All Suppliers"
                        />
                    </div>

                    {/* Area */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Area</label>
                        <select
                            value={filters.area}
                            onChange={(e) => handleFilterChange("area", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Areas</option>
                            {filterOptions.areas.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {/* Route */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Route</label>
                        <select
                            value={filters.route}
                            onChange={(e) => handleFilterChange("route", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Routes</option>
                            {filterOptions.routes.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {/* Company */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Company</label>
                        <select
                            value={filters.company}
                            onChange={(e) => handleFilterChange("company", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Companies</option>
                            {filterOptions.companies.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Division */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Division</label>
                        <select
                            value={filters.division}
                            onChange={(e) => handleFilterChange("division", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Divisions</option>
                            {filterOptions.divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* Salesman */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Salesman (MR)</label>
                        <select
                            value={filters.salesman}
                            onChange={(e) => handleFilterChange("salesman", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Salesmen</option>
                            {filterOptions.salesmen.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
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

                    {/* Start Date */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange("startDate", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange("endDate", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={applyFilters}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition shadow-sm"
                    >
                        <FaFilter size={11} /> Apply Filters
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-3 print:hidden">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <FaExchangeAlt /> Debit Note Vouchers List ({summary.totalCount})
                    </span>
                    <button
                        onClick={fetchReport}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600"
                    >
                        <FaSync className={loading ? "animate-spin text-amber-500" : ""} size={13} />
                    </button>
                </div>

                <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                        <thead className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold border-b border-amber-200 dark:border-amber-900/40">
                            <tr>
                                <th className="p-2.5 w-8"></th>
                                <th className="p-2.5 font-mono">Debit Note VCN</th>
                                <th className="p-2.5 font-mono">Date</th>
                                <th className="p-2.5">Supplier / Party Details</th>
                                <th className="p-2.5">Area &amp; Route</th>
                                <th className="p-2.5">Company &amp; Div</th>
                                <th className="p-2.5">Salesman (MR)</th>
                                <th className="p-2.5">Remarks</th>
                                <th className="p-2.5 font-mono text-center">Items (Qty)</th>
                                <th className="p-2.5 font-mono text-right">Taxable (₹)</th>
                                <th className="p-2.5 font-mono text-right">GST Tax (₹)</th>
                                <th className="p-2.5 font-mono text-right">Debit Net (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="py-12 text-center text-slate-400">
                                        <FaSync size={18} className="animate-spin text-amber-500 mx-auto mb-2" />
                                        Loading Purchase Return executive report...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="py-12 text-center text-slate-400">
                                        No debit note (purchase return) records found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => {
                                    const isExpanded = expandedRows.has(r.id);
                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr
                                                className="hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition cursor-pointer"
                                                onClick={() => toggleRow(r.id)}
                                            >
                                                <td className="p-2.5 text-center text-slate-400">
                                                    {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                </td>
                                                <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                                                    {r.vcn}
                                                </td>
                                                <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                    {r.date}
                                                </td>
                                                <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                                                    {r.partyName}
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                                                        <span className="font-mono">#{r.partyCode}</span>
                                                        {r.city && <span>• {r.city}</span>}
                                                        {r.gstin && (
                                                            <span className="text-slate-500 font-mono">
                                                                <FaIdCard size={8} className="inline mr-0.5" />{r.gstin}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                    {r.area || "—"}
                                                    {r.route && <span className="text-[10px] text-slate-400 block">Rt: {r.route}</span>}
                                                </td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                    {r.company || "—"}
                                                    {r.division && <span className="text-[10px] text-slate-400 block">{r.division}</span>}
                                                </td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                    {r.salesman || "—"}
                                                </td>
                                                <td className="p-2.5">
                                                    {r.remarks ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            {r.remarks}
                                                        </span>
                                                    ) : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {r.itemsCount} <span className="text-[10px] text-slate-400 font-normal">({r.totalQty} pcs)</span>
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                                    ₹{r.taxableAmount.toLocaleString("en-IN")}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                                    ₹{r.taxAmount.toLocaleString("en-IN")}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                                                    ₹{r.finalAmount.toLocaleString("en-IN")}
                                                </td>
                                            </tr>

                                            {/* Expandable Line Items Drawer */}
                                            {isExpanded && (
                                                <tr className="bg-amber-50/30 dark:bg-amber-950/10">
                                                    <td colSpan={12} className="p-3">
                                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3 shadow-inner">
                                                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-amber-100 dark:border-amber-900/30">
                                                                <span className="flex items-center gap-2">
                                                                    <FaBoxes className="text-amber-500" />
                                                                    Returned Products — Debit Note Breakdown ({r.items.length} Products, {r.totalQty} Total Qty)
                                                                </span>
                                                                {r.phone && <span><FaPhoneAlt size={10} className="inline mr-1" />{r.phone}</span>}
                                                            </div>

                                                            {r.items.length === 0 ? (
                                                                <p className="text-xs text-slate-400">No line items available for this debit note.</p>
                                                            ) : (
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead className="text-slate-500 font-semibold bg-amber-50 dark:bg-amber-950/20">
                                                                        <tr>
                                                                            <th className="p-2">Code</th>
                                                                            <th className="p-2">Product Name</th>
                                                                            <th className="p-2 font-mono">Batch No</th>
                                                                            <th className="p-2 font-mono">Expiry</th>
                                                                            <th className="p-2 font-mono text-center">Return Qty</th>
                                                                            <th className="p-2 font-mono text-right">Unit Rate (₹)</th>
                                                                            <th className="p-2 font-mono text-right">Disc %</th>
                                                                            <th className="p-2 font-mono text-right">GST %</th>
                                                                            <th className="p-2 font-mono text-right">Line Total (₹)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-amber-100 dark:divide-amber-900/20">
                                                                        {r.items.map((it, i) => (
                                                                            <tr key={i} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/10">
                                                                                <td className="p-2 font-mono text-slate-500">#{it.code}</td>
                                                                                <td className="p-2 font-semibold text-slate-900 dark:text-white">{it.product}</td>
                                                                                <td className="p-2 font-mono font-semibold">{it.batchNo}</td>
                                                                                <td className="p-2 font-mono text-slate-500">{it.exp || "N/A"}</td>
                                                                                <td className="p-2 font-mono text-center font-bold text-amber-600 dark:text-amber-400">{it.qty}</td>
                                                                                <td className="p-2 font-mono text-right">₹{it.rate}</td>
                                                                                <td className="p-2 font-mono text-right">{it.disP}%</td>
                                                                                <td className="p-2 font-mono text-right">{it.taxP}%</td>
                                                                                <td className="p-2 font-mono text-right font-bold text-slate-900 dark:text-white">₹{it.total.toLocaleString("en-IN")}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
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
                        Page {page} of {totalPages} ({summary.totalCount} total debit note vouchers)
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
