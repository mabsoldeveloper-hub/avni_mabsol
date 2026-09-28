"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import {
  FaReceipt,
  FaArrowLeft,
  FaSearch,
  FaSync,
  FaFilter,
  FaFileCsv,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaEye,
  FaTimes,
} from "react-icons/fa";

export default function PurchasePaymentsReportPage() {
  const { selectedCompany } = useCompany();

  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPaymentModal, setSelectedPaymentModal] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPaymentsReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/purchase/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPayments(json.payments || []);
        }
      }
    } catch (err) {
      console.error("Fetch Payments Report Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, startDate, endDate]);

  useEffect(() => {
    fetchPaymentsReport();
  }, [fetchPaymentsReport]);

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

  const filteredPayments = useMemo(() => {
    const s = search.trim().toLowerCase();
    return payments.filter((p) =>
      !s ||
      String(p.voucherNo || "").toLowerCase().includes(s) ||
      String(p.vendorName || "").toLowerCase().includes(s) ||
      String(p.paymentMode || "").toLowerCase().includes(s) ||
      String(p.refNo || "").toLowerCase().includes(s) ||
      String(p.bankName || "").toLowerCase().includes(s)
    );
  }, [payments, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, datePreset]);

  // Metrics
  const totalPaidAmount = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDiscount = filteredPayments.reduce((s, p) => s + Number(p.discountReceived || 0), 0);
  const bankTransferCount = filteredPayments.filter((p) => String(p.paymentMode || "").includes("Bank")).length;

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ["Voucher No", "Payment Date", "Vendor Name", "Payment Mode", "Ref/UTR No", "Bank Name", "Discount Rec (₹)", "Amount Paid (₹)", "Status"];
    const csvRows = filteredPayments.map((p) => [
      `"${p.voucherNo || ""}"`, `"${p.paymentDate || ""}"`, `"${p.vendorName || ""}"`, `"${p.paymentMode || ""}"`, `"${p.refNo || ""}"`, `"${p.bankName || ""}"`,
      p.discountReceived || 0, p.amount || 0, `"${p.status || "Approved"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Payments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
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
              <FaReceipt className="text-emerald-500" /> Dedicated Supplier Payments Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Payment receipts, UTR bank transfers, Cash Discounts, and ledger settlements
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
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Vouchers</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{filteredPayments.length} Payments</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Paid Value</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">₹{totalPaidAmount.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Discounts Received</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">₹{totalDiscount.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Bank Transfers</p>
          <p className="text-xl font-black text-indigo-600 mt-0.5">{bankTransferCount} Receipts</p>
        </div>
      </div>

      {/* Filter & Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {(["ALL", "TODAY", "THIS_MONTH", "LAST_MONTH", "FY_YEAR"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1 rounded-xl transition ${
                  datePreset === p ? "bg-emerald-600 text-white font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p === "ALL" ? "All Time" : p === "TODAY" ? "Today" : p === "THIS_MONTH" ? "This Month" : p === "LAST_MONTH" ? "Last Month" : "FY Year"}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search Voucher #, Vendor, Ref UTR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Payments Report...</div>
        ) : paginatedPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">Voucher No</th>
                  <th className="py-3 px-3">Payment Date</th>
                  <th className="py-3 px-3">Supplier / Vendor</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3">Ref / UTR No</th>
                  <th className="py-3 px-3">Bank Source</th>
                  <th className="py-3 px-3 text-right">Discount (₹)</th>
                  <th className="py-3 px-3 text-right">Amount Paid (₹)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">{p.voucherNo}</td>
                    <td className="py-3 px-3 text-slate-500">{p.paymentDate}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{p.vendorName}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{p.paymentMode || "Bank Transfer"}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{p.refNo || "N/A"}</td>
                    <td className="py-3 px-3 text-slate-500">{p.bankName || "N/A"}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-bold">₹{Number(p.discountReceived || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(p.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedPaymentModal(p)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition text-[11px]"
                        title="View Details"
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
          <div className="py-16 text-center text-xs text-slate-400 font-medium">No payment vouchers found matching filters.</div>
        )}

        {/* Pagination Footer */}
        {filteredPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} Payments
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

      {/* Payment Modal */}
      {selectedPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaReceipt className="text-emerald-500" /> Payment Voucher #{selectedPaymentModal.voucherNo}
              </h3>
              <button onClick={() => setSelectedPaymentModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>Vendor Name:</strong> {selectedPaymentModal.vendorName}</p>
              <p><strong>Payment Date:</strong> {selectedPaymentModal.paymentDate}</p>
              <p><strong>Payment Mode:</strong> {selectedPaymentModal.paymentMode}</p>
              <p><strong>Ref / UTR No:</strong> {selectedPaymentModal.refNo || "N/A"}</p>
              <p><strong>Bank Source:</strong> {selectedPaymentModal.bankName || "N/A"}</p>
              <p><strong>Discount Received:</strong> ₹{(selectedPaymentModal.discountReceived || 0).toLocaleString("en-IN")}</p>
              <p><strong>Amount Paid:</strong> ₹{(selectedPaymentModal.amount || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setSelectedPaymentModal(null)}
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
