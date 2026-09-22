"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import {
  FaTruck,
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

export default function PurchaseOrdersReportPage() {
  const { selectedCompany } = useCompany();

  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedPoModal, setSelectedPoModal] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrdersReport = useCallback(async () => {
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
          setOrders(json.orders || []);
        }
      }
    } catch (err) {
      console.error("Fetch Orders Report Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, startDate, endDate]);

  useEffect(() => {
    fetchOrdersReport();
  }, [fetchOrdersReport]);

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

  const filteredOrders = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((po) => {
      const matchesSearch =
        !s ||
        String(po.poNumber || "").toLowerCase().includes(s) ||
        String(po.vendorName || "").toLowerCase().includes(s) ||
        String(po.priority || "").toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(po.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, statusFilter, datePreset]);

  // Metrics
  const totalOrdersValue = filteredOrders.reduce((s, o) => s + Number(o.netTotal || 0), 0);
  const pendingCount = filteredOrders.filter((o) => (o.status || "Pending") === "Pending").length;
  const billedCount = filteredOrders.filter((o) => o.status === "Billed").length;

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["PO Number", "PO Date", "Vendor Name", "Priority", "Payment Terms", "Net Total (₹)", "Status"];
    const csvRows = filteredOrders.map((o) => [
      `"${o.poNumber || ""}"`, `"${o.poDate || ""}"`, `"${o.vendorName || ""}"`, `"${o.priority || ""}"`, `"${o.paymentTerms || ""}"`,
      o.netTotal || 0, `"${o.status || "Pending"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <FaTruck className="text-indigo-500" /> Dedicated Purchase Orders Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supplier requisitions, priority matrix, and order fulfillment status
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
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{filteredOrders.length} POs</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total PO Value</p>
          <p className="text-xl font-black text-indigo-600 mt-0.5">₹{totalOrdersValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Orders</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{pendingCount} Pending</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Billed Converted</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{billedCount} Converted</p>
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
                  datePreset === p ? "bg-indigo-600 text-white font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"
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
                placeholder="Search PO #, Vendor..."
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
              <option value="Pending">Pending</option>
              <option value="Billed">Billed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Purchase Orders Report...</div>
        ) : paginatedOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">PO Number</th>
                  <th className="py-3 px-3">PO Date</th>
                  <th className="py-3 px-3">Supplier / Vendor</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Payment Terms</th>
                  <th className="py-3 px-3 text-right">Net Total (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-extrabold text-indigo-600 dark:text-indigo-400">{po.poNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{po.poDate}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{po.vendorName}</td>
                    <td className="py-3 px-3 text-slate-600">{po.priority || "Normal"}</td>
                    <td className="py-3 px-3 text-slate-500">{po.paymentTerms || "30 Days Credit"}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(po.netTotal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        po.status === "Billed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {po.status || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedPoModal(po)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg transition text-[11px]"
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
          <div className="py-16 text-center text-xs text-slate-400 font-medium">No purchase orders found matching filters.</div>
        )}

        {/* Pagination Footer */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} Orders
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

      {/* PO Details Modal */}
      {selectedPoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaTruck className="text-indigo-500" /> Purchase Order #{selectedPoModal.poNumber}
              </h3>
              <button onClick={() => setSelectedPoModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>Vendor Name:</strong> {selectedPoModal.vendorName}</p>
              <p><strong>PO Date:</strong> {selectedPoModal.poDate}</p>
              <p><strong>Priority:</strong> {selectedPoModal.priority || "Normal"}</p>
              <p><strong>Payment Terms:</strong> {selectedPoModal.paymentTerms || "30 Days Credit"}</p>
              <p><strong>Net Total Amount:</strong> ₹{(selectedPoModal.netTotal || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setSelectedPoModal(null)}
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
