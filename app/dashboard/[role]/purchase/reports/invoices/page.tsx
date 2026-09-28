"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import {
  FaFileInvoice,
  FaArrowLeft,
  FaSearch,
  FaSync,
  FaFilter,
  FaFileCsv,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaReceipt,
  FaUndoAlt,
  FaEye,
  FaTimes,
} from "react-icons/fa";

export default function PurchaseInvoicesReportPage() {
  const { selectedCompany } = useCompany();

  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchInvoicesReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/purchase/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setInvoices(json.invoices || []);
        }
      }
    } catch (err) {
      console.error("Fetch Invoices Report Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchInvoicesReport();
  }, [fetchInvoicesReport]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      setStartDate(isoToday);
      setEndDate(isoToday);
    } else if (preset === "THIS_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(isoToday);
    } else if (preset === "LAST_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === "FY_YEAR") {
      setStartDate(`${today.getFullYear()}-04-01`);
      setEndDate(`${today.getFullYear() + 1}-03-31`);
    }
  };

  const filteredInvoices = useMemo(() => {
    const s = search.trim().toLowerCase();
    return invoices.filter((item) =>
      !s ||
      String(item.billNumber || "").toLowerCase().includes(s) ||
      String(item.supplierInvoiceNo || "").toLowerCase().includes(s) ||
      String(item.vendorName || "").toLowerCase().includes(s) ||
      String(item.vendorGst || "").toLowerCase().includes(s)
    );
  }, [invoices, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, statusFilter, datePreset]);

  // Metrics
  const totalInwardValue = filteredInvoices.reduce((s, b) => s + Number(b.netAmount || 0), 0);
  const totalPaidValue = filteredInvoices.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
  const totalBalanceValue = filteredInvoices.reduce((s, b) => s + Number(b.balanceAmount || 0), 0);
  const paidCount = filteredInvoices.filter((b) => b.paymentStatus === "Paid").length;
  const pendingCount = filteredInvoices.filter((b) => b.paymentStatus !== "Paid").length;

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ["Bill Number", "Supplier Inv No", "Bill Date", "Vendor Name", "Vendor GST", "Net Amount (₹)", "Paid Amount (₹)", "Balance (₹)", "Status"];
    const csvRows = filteredInvoices.map((i) => [
      `"${i.billNumber || ""}"`, `"${i.supplierInvoiceNo || ""}"`, `"${i.billDate || ""}"`, `"${i.vendorName || ""}"`, `"${i.vendorGst || ""}"`,
      i.netAmount || 0, i.paidAmount || 0, i.balanceAmount || 0, `"${i.paymentStatus || "Paid"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchase/reports"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FaFileInvoice className="text-amber-500" /> Dedicated Purchase Invoices Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Inward stock entry, bill payment statuses, and tax breakdown register
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <FaFileCsv /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{filteredInvoices.length} Bills</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Inward Value</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">₹{totalInwardValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Settled Paid Value</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">₹{totalPaidValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{paidCount} Paid Bills</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending Balance</p>
          <p className="text-xl font-black text-rose-600 mt-0.5">₹{totalBalanceValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-rose-500 mt-0.5">{pendingCount} Pending Bills</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Payment Status</p>
          <p className="text-sm font-extrabold text-indigo-600 mt-1">{((paidCount / Math.max(1, filteredInvoices.length)) * 100).toFixed(0)}% Settled</p>
        </div>
      </div>

      {/* Filter Bar & Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {(["ALL", "TODAY", "THIS_MONTH", "LAST_MONTH", "FY_YEAR"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1 rounded-xl transition ${
                  datePreset === p ? "bg-amber-600 text-white font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p === "ALL" ? "All Time" : p === "TODAY" ? "Today" : p === "THIS_MONTH" ? "This Month" : p === "LAST_MONTH" ? "Last Month" : "FY Year"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search Bill #, Supplier Inv #, Vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Invoices Report...</div>
        ) : paginatedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">Bill Number</th>
                  <th className="py-3 px-3">Supplier Inv No</th>
                  <th className="py-3 px-3">Bill Date</th>
                  <th className="py-3 px-3">Vendor / Supplier</th>
                  <th className="py-3 px-3 text-right">Net Amount (₹)</th>
                  <th className="py-3 px-3 text-right">Paid Amount (₹)</th>
                  <th className="py-3 px-3 text-right">Balance (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedInvoices.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-extrabold text-amber-600 dark:text-amber-400">{b.billNumber}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{b.supplierInvoiceNo || "N/A"}</td>
                    <td className="py-3 px-3 text-slate-500">{b.billDate || "N/A"}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{b.vendorName}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(b.netAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">₹{Number(b.paidAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right font-black text-rose-600">₹{Number(b.balanceAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.paymentStatus === "Paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      }`}>
                        {b.paymentStatus || "Paid"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedInvoiceModal(b)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-600 hover:text-white rounded-lg transition text-[11px]"
                        title="View Details Slip"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">No purchase invoices found matching filters.</div>
        )}

        {/* Pagination Footer */}
        {filteredInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredInvoices.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length} Invoices
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-3">
                <span className="text-[11px] text-slate-400">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 transition"
              >
                <FaChevronLeft size={10} />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 transition"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Slip Modal */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaFileInvoice className="text-amber-500" /> Purchase Invoice #{selectedInvoiceModal.billNumber}
              </h3>
              <button onClick={() => setSelectedInvoiceModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>Vendor Name:</strong> {selectedInvoiceModal.vendorName}</p>
              <p><strong>Supplier Inv No:</strong> {selectedInvoiceModal.supplierInvoiceNo}</p>
              <p><strong>Bill Date:</strong> {selectedInvoiceModal.billDate}</p>
              <p><strong>Net Amount:</strong> ₹{(selectedInvoiceModal.netAmount || 0).toLocaleString("en-IN")}</p>
              <p><strong>Paid Amount:</strong> ₹{(selectedInvoiceModal.paidAmount || 0).toLocaleString("en-IN")}</p>
              <p><strong>Balance Amount:</strong> ₹{(selectedInvoiceModal.balanceAmount || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setSelectedInvoiceModal(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
