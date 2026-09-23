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
    FaHandHoldingUsd,
    FaFileInvoiceDollar,
    FaFileCsv,
    FaPrint,
    FaChevronLeft,
    FaChevronRight,
    FaFilter,
    FaMoneyBillWave,
    FaUniversity,
    FaIdCard,
    FaPhoneAlt,
    FaChevronDown,
    FaChevronUp,
    FaReceipt,
    FaCoins,
} from "react-icons/fa";

interface SalesReceiptRow {
    id: string;
    vcn: string;
    date: string;
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
    partyBalance: number;
    amount: number;
    discount: number;
    totalSettlement: number;
    paymentMode: string;
    refNo: string;
    bankName: string;
    remarks: string;
    settledInvoices: {
        vcn: string;
        date: string;
        originalAmount: number;
        pendingAmount: number;
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
    paymentMode: "",
    discountFilter: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
};

export default function SalesReceiptReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
    const [page, setPage] = useState(1);
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<SalesReceiptRow[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [summary, setSummary] = useState({
        totalCount: 0,
        totalCollectedAmount: 0,
        totalDiscountAllowed: 0,
        totalSettlementPool: 0,
        avgReceiptAmount: 0,
        cashCount: 0,
        bankCount: 0,
        upiCount: 0,
        chequeCount: 0,
    });

    const [filterOptions, setFilterOptions] = useState<{
        areas: string[];
        routes: string[];
        companies: string[];
        divisions: string[];
        salesmen: string[];
        paymentModes: string[];
    }>({
        areas: [],
        routes: [],
        companies: [],
        divisions: [],
        salesmen: [],
        paymentModes: [],
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

            const res = await fetch(`/api/reports/sales-receipt?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setRows(data.rows || []);
                    setSummary({
                        totalCount: data.summary?.totalCount || 0,
                        totalCollectedAmount: data.summary?.totalCollectedAmount || 0,
                        totalDiscountAllowed: data.summary?.totalDiscountAllowed || 0,
                        totalSettlementPool: data.summary?.totalSettlementPool || 0,
                        avgReceiptAmount: data.summary?.avgReceiptAmount || 0,
                        cashCount: data.summary?.cashCount || 0,
                        bankCount: data.summary?.bankCount || 0,
                        upiCount: data.summary?.upiCount || 0,
                        chequeCount: data.summary?.chequeCount || 0,
                    });
                    if (data.filterOptions) {
                        setFilterOptions({
                            areas: data.filterOptions.areas || [],
                            routes: data.filterOptions.routes || [],
                            companies: data.filterOptions.companies || [],
                            divisions: data.filterOptions.divisions || [],
                            salesmen: data.filterOptions.salesmen || [],
                            paymentModes: data.filterOptions.paymentModes || [],
                        });
                    }
                    setTotalPages(data.pagination?.totalPages || 1);
                }
            }
        } catch (err) {
            console.error("Failed to load sales receipt report:", err);
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
        const headers = ["Receipt VCN", "Date", "Party Code", "Party Name", "City", "GSTIN", "Phone", "Net Ledger Balance", "Area", "Route", "Company", "Division", "Salesman", "Payment Mode", "Ref/Cheque No", "Bank Name", "Discount Allowed", "Received Amount", "Total Settlement Value", "Remarks"];
        const csvRows = [headers.join(",")];

        rows.forEach((r) => {
            csvRows.push([
                `"${r.vcn}"`,
                `"${r.date}"`,
                `"${r.partyCode}"`,
                `"${r.partyName.replace(/"/g, '""')}"`,
                `"${r.city}"`,
                `"${r.gstin}"`,
                `"${r.phone}"`,
                r.partyBalance,
                `"${r.area}"`,
                `"${r.route}"`,
                `"${r.company}"`,
                `"${r.division}"`,
                `"${r.salesman}"`,
                `"${r.paymentMode}"`,
                `"${r.refNo}"`,
                `"${r.bankName}"`,
                r.discount,
                r.amount,
                r.totalSettlement,
                `"${r.remarks.replace(/"/g, '""')}"`,
            ].join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Sales_Receipt_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`;
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
                                Sales Receipt (Collection) Executive Report
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                Payment Engine
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Deep-dive collection report filtered by Particular, Party, Area, Route, Company, Division, Salesman, Mode & Amount Range.
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                    >
                        <FaPrint size={12} /> Print Executive Report
                    </button>
                </div>
            </div>

            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Total Receipts Collected
                        </span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            ₹{summary.totalCollectedAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {summary.totalCount} Payment Vouchers
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FaHandHoldingUsd size={20} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                            Discount Allowed
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.totalDiscountAllowed.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Cash / Early Payment Discount
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <FaFileInvoiceDollar size={18} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                            Total Settlement Pool
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.totalSettlementPool.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Collected + Discount Pool
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FaCoins size={18} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                            Bank vs Cash Mix
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block mt-0.5 font-mono">
                            Bank: {summary.bankCount + summary.upiCount} | Cash: {summary.cashCount + summary.chequeCount}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            NEFT/UPI: {summary.bankCount + summary.upiCount} Vouchers
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <FaUniversity size={18} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/40 dark:to-slate-900 p-4 rounded-2xl border border-cyan-200/80 dark:border-cyan-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">
                            Avg Collection / Receipt
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{summary.avgReceiptAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Average Ticket Size
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                        <FaMoneyBillWave size={18} />
                    </div>
                </div>
            </div>

            {/* Standard Executive Filter Panel */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FaFilter className="text-emerald-500" /> Standard Executive Filters
                    </span>
                    <button
                        onClick={resetFilters}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                        Reset All Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                    {/* Particular Search */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Particular / Search</label>
                        <div className="relative">
                            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search VCN, UTR, Cheque No, Bank, Remarks..."
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

                    {/* Area */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Area</label>
                        <select
                            value={filters.area}
                            onChange={(e) => handleFilterChange("area", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Areas</option>
                            {filterOptions.areas.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
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
                            {filterOptions.routes.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
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
                            {filterOptions.companies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
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
                            {filterOptions.divisions.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
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
                            {filterOptions.salesmen.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Payment Mode</label>
                        <select
                            value={filters.paymentMode}
                            onChange={(e) => handleFilterChange("paymentMode", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Modes</option>
                            <option value="Bank Transfer">Bank Transfer / NEFT</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI / QR</option>
                            <option value="Cheque">Cheque / DD</option>
                        </select>
                    </div>

                    {/* Discount Filter */}
                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Discount Filter</label>
                        <select
                            value={filters.discountFilter}
                            onChange={(e) => handleFilterChange("discountFilter", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="">All Vouchers</option>
                            <option value="withDiscount">With Discount Allowed Only</option>
                            <option value="noDiscount">Without Discount</option>
                        </select>
                    </div>

                    {/* Min & Max Amount */}
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

                    {/* Date Range */}
                    <div className="space-y-1 sm:col-span-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={applyFilters}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                    >
                        <FaFilter size={11} /> Apply Executive Filters
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Sales Receipt Vouchers List ({summary.totalCount})
                    </span>
                    <button
                        onClick={fetchReport}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    >
                        <FaSync className={loading ? "animate-spin text-emerald-500" : ""} size={13} />
                    </button>
                </div>

                <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-2.5 w-8"></th>
                                <th className="p-2.5 font-mono">Receipt VCN</th>
                                <th className="p-2.5 font-mono">Date</th>
                                <th className="p-2.5">Customer / Party Details</th>
                                <th className="p-2.5">Area & Route</th>
                                <th className="p-2.5">Company & Div</th>
                                <th className="p-2.5">Salesman (MR)</th>
                                <th className="p-2.5">Payment Mode</th>
                                <th className="p-2.5 font-mono">Ref / UTR / Bank</th>
                                <th className="p-2.5 font-mono text-right">Discount (₹)</th>
                                <th className="p-2.5 font-mono text-right">Received (₹)</th>
                                <th className="p-2.5 font-mono text-right">Settlement (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="py-12 text-center text-slate-400">
                                        <FaSync size={18} className="animate-spin text-emerald-500 mx-auto mb-2" />
                                        Loading Sales Receipt executive report...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="py-12 text-center text-slate-400">
                                        No sales receipt records found matching executive filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => {
                                    const isExpanded = expandedRows.has(r.id);
                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer" onClick={() => toggleRow(r.id)}>
                                                <td className="p-2.5 text-center text-slate-400">
                                                    {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                </td>
                                                <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
                                                        {r.gstin && <span className="text-slate-500 font-mono"><FaIdCard size={8} className="inline mr-0.5" />{r.gstin}</span>}
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
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {r.paymentMode}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                    {r.refNo !== "—" ? r.refNo : r.bankName !== "—" ? r.bankName : "—"}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                                    {r.discount > 0 ? `₹${r.discount.toLocaleString("en-IN")}` : "—"}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₹{r.amount.toLocaleString("en-IN")}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                    ₹{r.totalSettlement.toLocaleString("en-IN")}
                                                </td>
                                            </tr>

                                            {/* Expandable Invoice Settlement Drawer */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={12} className="p-3">
                                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-inner">
                                                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                                                                <span className="flex items-center gap-2">
                                                                    <FaReceipt className="text-emerald-500" />
                                                                    Customer Invoice Outstanding & Settlements ({r.settledInvoices.length} Recent Invoices)
                                                                </span>
                                                                <div className="flex items-center gap-4 text-[11px] font-normal">
                                                                    {r.phone && <span><FaPhoneAlt size={10} className="inline mr-1" />{r.phone}</span>}
                                                                    <span>Current Customer Balance: <strong className="font-mono text-emerald-600">₹{r.partyBalance.toLocaleString("en-IN")}</strong></span>
                                                                </div>
                                                            </div>

                                                            {r.settledInvoices.length === 0 ? (
                                                                <p className="text-xs text-slate-400">No active pending invoices found for this customer.</p>
                                                            ) : (
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead className="text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800">
                                                                        <tr>
                                                                            <th className="p-2 font-mono">Invoice VCN</th>
                                                                            <th className="p-2 font-mono">Invoice Date</th>
                                                                            <th className="p-2 font-mono text-right">Original Bill Amount (₹)</th>
                                                                            <th className="p-2 font-mono text-right">Current Outstanding Balance (₹)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                        {r.settledInvoices.map((inv, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                                <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">{inv.vcn}</td>
                                                                                <td className="p-2 font-mono text-slate-500">{inv.date}</td>
                                                                                <td className="p-2 font-mono text-right font-semibold">₹{inv.originalAmount.toLocaleString("en-IN")}</td>
                                                                                <td className="p-2 font-mono text-right font-bold text-amber-600 dark:text-amber-400">₹{inv.pendingAmount.toLocaleString("en-IN")}</td>
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
                        Page {page} of {totalPages} ({summary.totalCount} total vouchers)
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
