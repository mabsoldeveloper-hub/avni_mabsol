"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    FaBan,
    FaBoxes,
    FaRupeeSign,
    FaTimes,
    FaSearch,
    FaSync,
    FaFileCsv,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaLayerGroup,
    FaSkull,
} from "react-icons/fa";

import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

interface ExpiredBatchesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExpiredBatchesModal({ isOpen, onClose }: ExpiredBatchesModalProps) {
    const { selectedCompany: activeCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({
        totalExpiredBatches: 0,
        totalStockQty: 0,
        totalStockValue: 0,
        totalAffectedProducts: 0,
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
    const [selectedCompany, setSelectedCompany] = useState("");

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

    const fetchExpiredData = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (debouncedSearch) params.append("q", debouncedSearch);
            if (selectedCompany) params.append("company", selectedCompany);
            if (activeCompany?._id) params.append("companyId", activeCompany._id);
            if (selectedFY?._id) params.append("fyId", selectedFY._id);

            const res = await fetch(`/api/dashboard/expired-batches?${params.toString()}`);
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
                    if (json.companies) {
                        setCompanies(json.companies);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch expired batches modal data:", err);
        } finally {
            setLoading(false);
        }
    }, [isOpen, pagination.page, pagination.limit, debouncedSearch, selectedCompany, activeCompany, selectedFY]);

    useEffect(() => {
        fetchExpiredData();
    }, [fetchExpiredData]);

    if (!isOpen) return null;

    const formatINR = (n: number) => {
        return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    };

    const formatNum = (n: number) => {
        return Number(n || 0).toLocaleString("en-IN");
    };

    const handleExportCSV = () => {
        if (!items || items.length === 0) return;

        const headers = ["Product Code", "Product Name", "Batch No", "Expiry Date", "Days Expired", "Company", "Packing", "MRP", "Rate", "Expired Qty", "Stock Loss Value (₹)"];
        const rows = items.map((i) => [
            i.code,
            `"${(i.product || "").replace(/"/g, '""')}"`,
            `"${(i.batchNo || "").replace(/"/g, '""')}"`,
            i.expiryDate || "N/A",
            i.daysExpired,
            `"${(i.companyName || "").replace(/"/g, '""')}"`,
            `"${(i.packing || "").replace(/"/g, '""')}"`,
            i.mrp,
            i.prate,
            i.balance,
            i.stockValue,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Expired_Batches_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <div className="flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 flex-shrink-0">
                            <FaBan className="text-xs sm:text-lg" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                    Expired Batches
                                </h2>
                                <span className="hidden xs:inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 flex-shrink-0">
                                    Expired Stock
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                                Expired inventory batches, stock quantities, and potential loss breakdown
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                            onClick={fetchExpiredData}
                            disabled={loading}
                            title="Refresh Expired Batches Data"
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <FaSync className={`text-xs sm:text-sm ${loading ? "animate-spin text-rose-600" : ""}`} />
                        </button>

                        <button
                            onClick={handleExportCSV}
                            title="Export Expired Data to CSV"
                            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition-colors"
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
                            <FaBan className="text-rose-500 flex-shrink-0" size={10} /> Expired Batches
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                            {formatNum(summary.totalExpiredBatches)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaBoxes className="text-rose-500 flex-shrink-0" size={10} /> Expired Qty
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                            {formatNum(summary.totalStockQty)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaRupeeSign className="text-rose-500 flex-shrink-0" size={10} /> Stock Loss Value
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                            {formatINR(summary.totalStockValue)}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex flex-col justify-between min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <FaLayerGroup className="text-blue-500 flex-shrink-0" size={10} /> Affected Products
                        </span>
                        <span className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                            {formatNum(summary.totalAffectedProducts)}
                        </span>
                    </div>
                </div>

                {/* Controls Bar: Search, Company Filter */}
                <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
                    {/* Search Input */}
                    <div className="relative w-full md:w-auto md:flex-1 max-w-lg">
                        <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search product, batch no, code, company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-slate-900 dark:text-white placeholder-slate-400"
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

                    {/* Company Filter Dropdown */}
                    {companies.length > 0 && (
                        <div className="relative flex-shrink-0">
                            <select
                                value={selectedCompany}
                                onChange={(e) => { setSelectedCompany(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="w-full sm:w-auto pl-2.5 pr-6 py-1.5 text-xs rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40 truncate"
                            >
                                <option value="">All Companies</option>
                                {companies.map((c, idx) => (
                                    <option key={`${c.code}-${idx}`} value={c.code}>
                                        {c.name} ({c.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Table Container - Responsive horizontal scrolling */}
                <div className="flex-1 overflow-auto min-h-[250px] sm:min-h-[350px] relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs z-10 p-4">
                            <FaSync size={22} className="animate-spin text-rose-500 mb-2" />
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading expired batches...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                                <FaBan className="text-2xl sm:text-3xl text-rose-400" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">No Expired Batches Found</h4>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                No expired batches found matching your search criteria.
                            </p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[750px]">
                                <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/80 z-10">
                                    <tr>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 w-16 sm:w-20">Code</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[160px]">Product Name</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[110px]">Batch No</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[100px]">Expiry Date</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[120px]">Expired Status</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 min-w-[120px]">Company</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4">Packing</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">MRP</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Expired Qty</th>
                                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right min-w-[110px]">Stock Loss (₹)</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                    {items.map((row, idx) => {
                                        return (
                                            <tr
                                                key={row.id || idx}
                                                className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                                            >
                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    #{row.code}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-slate-900 dark:text-white">
                                                    {row.product}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    {row.batchNo}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-mono whitespace-nowrap font-medium text-rose-600 dark:text-rose-400">
                                                    {row.expiryDate || "N/A"}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                        <FaSkull size={10} />
                                                        Expired {row.daysExpired > 0 ? `${row.daysExpired}d ago` : "recently"}
                                                    </span>
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-slate-600 dark:text-slate-300">
                                                    <span className="truncate block max-w-[140px]">{row.companyName}</span>
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {row.packing || "—"}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    ₹{formatNum(row.mrp)}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                    {formatNum(row.balance)}
                                                </td>

                                                <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                    {formatINR(row.stockValue)}
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
