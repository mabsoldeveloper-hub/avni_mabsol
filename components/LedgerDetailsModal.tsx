"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    FaArrowUp,
    FaArrowDown,
    FaRupeeSign,
    FaTimes,
    FaSearch,
    FaSync,
    FaFileCsv,
    FaChevronLeft,
    FaChevronRight,
    FaUser,
    FaReceipt,
    FaExchangeAlt,
} from "react-icons/fa";

import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

interface LedgerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialType?: "credit" | "debit" | "all";
}

export default function LedgerDetailsModal({
    isOpen,
    onClose,
    initialType = "all",
}: LedgerDetailsModalProps) {
    const { selectedCompany: activeCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [parties, setParties] = useState<any[]>([]);
    const [books, setBooks] = useState<string[]>([]);
    const [summary, setSummary] = useState<any>({
        totalAmount: 0,
        totalCredit: 0,
        totalDebit: 0,
        totalEntries: 0,
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        totalCount: 0,
        totalPages: 1,
    });

    // Filters & controls
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeType, setActiveType] = useState<"credit" | "debit" | "all">(initialType);
    const [selectedParty, setSelectedParty] = useState("");

    // Sync initialType when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveType(initialType);
            setPagination((p) => ({ ...p, page: 1 }));
        }
    }, [isOpen, initialType]);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPagination((prev) => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
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

    const fetchLedgerData = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: activeType,
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (debouncedSearch) params.append("q", debouncedSearch);
            if (selectedParty) params.append("party", selectedParty);
            if (activeCompany?._id) params.append("companyId", activeCompany._id);
            if (selectedFY) {
                if (selectedFY.isAll) {
                    params.append("fyId", "ALL");
                } else if (selectedFY._id) {
                    params.append("fyId", selectedFY._id);
                    if (selectedFY.startDate && selectedFY.endDate) {
                        const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                        const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                        params.append("startDate", s);
                        params.append("endDate", e);
                    }
                }
            }

            const res = await fetch(`/api/dashboard/ledger-details?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setItems(json.items || []);
                    setSummary(json.summary || {});
                    setPagination((prev) => ({
                        ...prev,
                        totalCount: json.pagination?.totalCount || 0,
                        totalPages: json.pagination?.totalPages || 1,
                    }));
                    if (json.parties) {
                        setParties(json.parties);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch ledger details data:", err);
        } finally {
            setLoading(false);
        }
    }, [isOpen, activeType, pagination.page, pagination.limit, debouncedSearch, selectedParty, activeCompany, selectedFY]);

    useEffect(() => {
        fetchLedgerData();
    }, [fetchLedgerData]);

    if (!isOpen) return null;

    const formatINR = (n: number) => {
        return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    };

    const formatNum = (n: number) => {
        return Number(n || 0).toLocaleString("en-IN");
    };

    const handleExportCSV = () => {
        if (!items || items.length === 0) return;

        const headers = ["Date", "Party Code", "Party Name", "City", "Voucher No", "Book Register", "Debit (₹)", "Credit (₹)", "Remarks"];
        const rows = items.map((i) => [
            i.date || "N/A",
            i.code,
            `"${(i.partyName || "").replace(/"/g, '""')}"`,
            `"${(i.city || "").replace(/"/g, '""')}"`,
            i.voucher,
            i.book,
            i.debit,
            i.credit,
            `"${(i.remark || "").replace(/"/g, '""')}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_Transactions_${activeType}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isCreditTheme = activeType === "credit";
    const isDebitTheme = activeType === "debit";

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Container */}
            <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">

                {/* Modal Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r ${
                    isCreditTheme
                        ? "from-emerald-500/10 via-lime-500/5 to-transparent"
                        : isDebitTheme
                        ? "from-fuchsia-500/10 via-purple-500/5 to-transparent"
                        : "from-blue-500/10 via-indigo-500/5 to-transparent"
                } flex-shrink-0`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr ${
                            isCreditTheme
                                ? "from-emerald-500 to-lime-500 shadow-emerald-500/20"
                                : isDebitTheme
                                ? "from-fuchsia-500 to-purple-600 shadow-fuchsia-500/20"
                                : "from-blue-500 to-indigo-600 shadow-blue-500/20"
                        } flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                            {isCreditTheme ? (
                                <FaArrowUp className="text-xs sm:text-lg" />
                            ) : isDebitTheme ? (
                                <FaArrowDown className="text-xs sm:text-lg" />
                            ) : (
                                <FaExchangeAlt className="text-xs sm:text-lg" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                    {isCreditTheme
                                        ? "Total Credit Details"
                                        : isDebitTheme
                                        ? "Total Debit Details"
                                        : "Ledger Transaction Details"}
                                </h2>
                                <span className={`hidden xs:inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                                    isCreditTheme
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                                        : isDebitTheme
                                        ? "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800/50"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
                                } flex-shrink-0`}>
                                    {isCreditTheme ? "Customer Credits" : isDebitTheme ? "Customer Debits" : "Ledger View"}
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                                Customer ledger entries, voucher details, and transaction breakdown
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                            onClick={fetchLedgerData}
                            disabled={loading}
                            title="Refresh Ledger Data"
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <FaSync className={`text-xs sm:text-sm ${loading ? "animate-spin text-emerald-600" : ""}`} />
                        </button>

                        <button
                            onClick={handleExportCSV}
                            title="Export Ledger Data to CSV"
                            className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium ${
                                isCreditTheme
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60"
                                    : "text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/50 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/60 border border-fuchsia-200 dark:border-fuchsia-800/60"
                            } transition-colors`}
                        >
                            <FaFileCsv className="text-xs sm:text-sm" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5"
                        >
                            <FaTimes className="text-xs sm:text-base" />
                        </button>
                    </div>
                </div>

                {/* KPI Cards Strip inside Modal */}
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5 sm:gap-3 p-2 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaArrowUp className="text-emerald-500 flex-shrink-0" size={10} /> Total Credit
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                            {formatINR(summary.totalCredit)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaArrowDown className="text-fuchsia-500 flex-shrink-0" size={10} /> Total Debit
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400 mt-0.5 truncate">
                            {formatINR(summary.totalDebit)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaRupeeSign className="text-blue-500 flex-shrink-0" size={10} /> Net Ledger
                        </span>
                        <span className={`text-xs sm:text-base md:text-lg font-bold mt-0.5 truncate ${
                            summary.netBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                        }`}>
                            {formatINR(summary.netBalance)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaReceipt className="text-slate-500 flex-shrink-0" size={10} /> Total Vouchers
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                            {formatNum(summary.totalVouchers)}
                        </span>
                    </div>
                </div>

                {/* Controls Bar: Search, Type Switcher, Party Filter */}
                <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
                    {/* Search Input */}
                    <div className="relative w-full md:w-auto md:flex-1 max-w-lg">
                        <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search party name, code, voucher no, remarks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <FaTimes size={11} />
                            </button>
                        )}
                    </div>

                    {/* Filter Buttons & Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-0.5 md:pb-0">
                        {/* Transaction Type Switcher */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                            {[
                                { key: "credit", label: "Credit Entries", icon: FaArrowUp },
                                { key: "debit", label: "Debit Entries", icon: FaArrowDown },
                                { key: "all", label: "All Entries", icon: FaExchangeAlt },
                            ].map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => { setActiveType(t.key as any); setPagination(p => ({ ...p, page: 1 })); }}
                                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-md sm:rounded-lg whitespace-nowrap transition-all ${
                                        activeType === t.key
                                            ? t.key === "credit"
                                                ? "bg-emerald-500 text-white shadow-xs"
                                                : t.key === "debit"
                                                ? "bg-fuchsia-600 text-white shadow-xs"
                                                : "bg-slate-800 text-white dark:bg-slate-700 shadow-xs"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    <t.icon size={10} />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Party Filter Dropdown */}
                        {parties.length > 0 && (
                            <div className="relative flex-shrink-0">
                                <select
                                    value={selectedParty}
                                    onChange={(e) => { setSelectedParty(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                    className="w-full sm:w-auto pl-2.5 pr-6 py-1.5 text-[11px] sm:text-xs rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 max-w-[140px] sm:max-w-[200px] truncate"
                                >
                                    <option value="">All Parties</option>
                                    {parties.map((p, idx) => (
                                        <option key={`${p.code}-${idx}`} value={p.code}>
                                            {p.name} ({p.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table Container - Responsive horizontal scrolling */}
                <div className="flex-1 overflow-auto min-h-[250px] sm:min-h-[350px] relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs z-10 p-4">
                            <FaSync size={22} className="animate-spin text-emerald-500 mb-2" />
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading ledger transactions...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                                <FaReceipt className="text-2xl sm:text-3xl" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">No Ledger Transactions Found</h4>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                No ledger transactions found matching your search or filter criteria.
                            </p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[750px]">
                                <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/80 z-10">
                                    <tr>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[90px]">Date</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 w-16 sm:w-20">Code</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[170px]">Party Name</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[90px]">Voucher No</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 w-20">Book</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right min-w-[100px]">Debit (₹)</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right min-w-[100px]">Credit (₹)</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[140px]">Remarks</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center w-24">Type</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                    {items.map((row, idx) => {
                                        const isCreditRow = row.credit > 0;
                                        return (
                                            <tr
                                                key={row.id || idx}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {row.date}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    #{row.code}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-slate-900 dark:text-white">
                                                    <span>{row.partyName}</span>
                                                    {row.city && (
                                                        <span className="text-[10px] text-slate-400 block font-normal">
                                                            {row.city}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                                                    #{row.voucher}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 whitespace-nowrap">
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {row.book === "S" ? "Sales (S)" : row.book === "R" ? "Receipt (R)" : row.book}
                                                    </span>
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-right font-mono font-semibold text-fuchsia-600 dark:text-fuchsia-400 whitespace-nowrap">
                                                    {row.debit > 0 ? formatINR(row.debit) : "—"}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    {row.credit > 0 ? formatINR(row.credit) : "—"}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-slate-600 dark:text-slate-400">
                                                    <span className="truncate block max-w-[200px]" title={row.remark}>
                                                        {row.remark || "—"}
                                                    </span>
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                                                    {isCreditRow ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <FaArrowUp size={9} /> Credit
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">
                                                            <FaArrowDown size={9} /> Debit
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] sm:text-xs flex-shrink-0">
                    <div className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
                        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pagination.totalCount > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                        </span> to <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                        </span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.totalCount}</span> items
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Items per page selector */}
                        <div className="flex items-center gap-1 text-slate-500">
                            <span className="hidden xs:inline">Per page:</span>
                            <select
                                value={pagination.limit}
                                onChange={(e) => {
                                    setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }));
                                }}
                                className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[11px] sm:text-xs rounded-md sm:rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={250}>250</option>
                            </select>
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                className="p-1 sm:p-1.5 rounded-md sm:rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                <FaChevronLeft className="text-[10px] sm:text-xs" />
                            </button>
                            <span className="px-2 sm:px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages || loading}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                className="p-1 sm:p-1.5 rounded-md sm:rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                <FaChevronRight className="text-[10px] sm:text-xs" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
