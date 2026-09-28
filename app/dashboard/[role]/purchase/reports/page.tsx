"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaChartBar,
  FaFileInvoice,
  FaTruck,
  FaUndoAlt,
  FaReceipt,
  FaFileInvoiceDollar,
  FaSearch,
  FaSync,
  FaFilter,
  FaFileCsv,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaShoppingBag,
  FaUserCheck,
  FaBoxes,
  FaRupeeSign,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
} from "react-icons/fa";

export default function PurchaseReportsPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [activeTab, setActiveTab] = useState<"invoices" | "orders" | "returns" | "payments" | "suppliers">("invoices");
  const [loading, setLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Data State
  const [summary, setSummary] = useState<any>({
    totalInwardValue: 0,
    totalPaidAmount: 0,
    totalReturnsValue: 0,
    totalOutstandingBalance: 0,
    totalOrdersValue: 0,
    invoicesCount: 0,
    ordersCount: 0,
    returnsCount: 0,
    paymentsCount: 0,
    suppliersCount: 0,
  });

  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [supplierSummaries, setSupplierSummaries] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Comprehensive Reports Data
  const fetchReports = useCallback(async () => {
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
          setSummary(json.summary || {});
          setInvoices(json.invoices || []);
          setOrders(json.orders || []);
          setReturns(json.returns || []);
          setPayments(json.payments || []);
          setSupplierSummaries(json.supplierSummaries || []);
        }
      }
    } catch (err) {
      console.error("Fetch Reports Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle Preset Date Change
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

  // Filter Active Tab Dataset by Search Term
  const currentDataset = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (activeTab === "invoices") {
      return invoices.filter((item) =>
        !s ||
        String(item.billNumber || "").toLowerCase().includes(s) ||
        String(item.supplierInvoiceNo || "").toLowerCase().includes(s) ||
        String(item.vendorName || "").toLowerCase().includes(s)
      );
    } else if (activeTab === "orders") {
      return orders.filter((item) =>
        !s ||
        String(item.poNumber || "").toLowerCase().includes(s) ||
        String(item.vendorName || "").toLowerCase().includes(s)
      );
    } else if (activeTab === "returns") {
      return returns.filter((item) =>
        !s ||
        String(item.vcn || "").toLowerCase().includes(s) ||
        String(item.vendorName || "").toLowerCase().includes(s) ||
        String(item.originalBillNo || "").toLowerCase().includes(s)
      );
    } else if (activeTab === "payments") {
      return payments.filter((item) =>
        !s ||
        String(item.voucherNo || "").toLowerCase().includes(s) ||
        String(item.vendorName || "").toLowerCase().includes(s) ||
        String(item.refNo || "").toLowerCase().includes(s)
      );
    } else if (activeTab === "suppliers") {
      return supplierSummaries.filter((item) =>
        !s || String(item.vendorName || "").toLowerCase().includes(s)
      );
    }
    return [];
  }, [activeTab, invoices, orders, returns, payments, supplierSummaries, search]);

  // Reset pagination on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, pageSize]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(currentDataset.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentDataset.slice(start, start + pageSize);
  }, [currentDataset, currentPage, pageSize]);

  // Export Active Report to CSV
  const handleExportCSV = () => {
    if (currentDataset.length === 0) return;
    let headers: string[] = [];
    let csvRows: any[][] = [];

    if (activeTab === "invoices") {
      headers = ["Bill Number", "Supplier Inv No", "Bill Date", "Vendor Name", "Tax Type", "Net Amount (₹)", "Paid Amount (₹)", "Balance (₹)", "Status"];
      csvRows = currentDataset.map((i) => [
        `"${i.billNumber || ""}"`, `"${i.supplierInvoiceNo || ""}"`, `"${i.billDate || ""}"`, `"${i.vendorName || ""}"`, `"${i.taxType || ""}"`,
        i.netAmount || 0, i.paidAmount || 0, i.balanceAmount || 0, `"${i.paymentStatus || "Paid"}"`,
      ]);
    } else if (activeTab === "orders") {
      headers = ["PO Number", "PO Date", "Vendor Name", "Priority", "Payment Terms", "Net Total (₹)", "Status"];
      csvRows = currentDataset.map((o) => [
        `"${o.poNumber || ""}"`, `"${o.poDate || ""}"`, `"${o.vendorName || ""}"`, `"${o.priority || ""}"`, `"${o.paymentTerms || ""}"`,
        o.netTotal || 0, `"${o.status || "Pending"}"`,
      ]);
    } else if (activeTab === "returns") {
      headers = ["Debit Note VCN", "Return Date", "Vendor Name", "Original Bill No", "Reason", "Net Return (₹)", "Status"];
      csvRows = currentDataset.map((r) => [
        `"${r.vcn || ""}"`, `"${r.returnDate || ""}"`, `"${r.vendorName || ""}"`, `"${r.originalBillNo || ""}"`, `"${r.reason || ""}"`,
        r.netAmount || 0, `"${r.status || "Approved"}"`,
      ]);
    } else if (activeTab === "payments") {
      headers = ["Voucher No", "Payment Date", "Vendor Name", "Payment Mode", "Ref/UTR No", "Bank Name", "Amount (₹)", "Status"];
      csvRows = currentDataset.map((p) => [
        `"${p.voucherNo || ""}"`, `"${p.paymentDate || ""}"`, `"${p.vendorName || ""}"`, `"${p.paymentMode || ""}"`, `"${p.refNo || ""}"`, `"${p.bankName || ""}"`,
        p.amount || 0, `"${p.status || "Approved"}"`,
      ]);
    } else if (activeTab === "suppliers") {
      headers = ["Vendor Name", "Invoices Count", "Total Inward (₹)", "Total Paid (₹)", "Total Returns (₹)", "Outstanding Balance (₹)"];
      csvRows = currentDataset.map((s) => [
        `"${s.vendorName || ""}"`, s.invoicesCount || 0, s.inwardTotal || 0, s.paidTotal || 0, s.returnsTotal || 0, s.outstandingBalance || 0,
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_${activeTab.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/20">
            <FaChartBar />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Purchase Executive Reports & Analytics Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive inward invoices, orders, returns, payments & vendor ledger analytics
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
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* Interlinking Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link
          href="/dashboard/purchase/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaShoppingBag className="text-amber-500" /> Dashboard
        </Link>
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoice className="text-amber-500" /> Invoices
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaTruck className="text-indigo-500" /> Orders
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-rose-500" /> Outstanding
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaReceipt className="text-emerald-500" /> Payment Entry
        </Link>
        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaUndoAlt className="text-orange-500" /> Return (Debit Note)
        </Link>
        <Link
          href="/dashboard/purchase/reports"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white shadow-xs font-bold"
        >
          <FaChartBar /> Executive Reports
        </Link>
      </div>

      {/* 4 DEDICATED REPORT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dedicated Invoices Report */}
        <Link
          href="/dashboard/purchase/reports/invoices"
          className="group p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 hover:border-amber-500 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Section Report</span>
            <FaFileInvoice className="text-amber-500 text-xl" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-amber-600 transition">
            Purchase Invoices Report &rarr;
          </h3>
          <p className="text-xs text-slate-500 mt-1">Inward bills, stock register & payment statuses</p>
          <div className="mt-3 text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>View Full Report</span> <FaArrowRight size={10} />
          </div>
        </Link>

        {/* Card 2: Dedicated Orders Report */}
        <Link
          href="/dashboard/purchase/reports/orders"
          className="group p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/40 hover:border-indigo-500 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Section Report</span>
            <FaTruck className="text-indigo-500 text-xl" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-indigo-600 transition">
            Purchase Orders Report &rarr;
          </h3>
          <p className="text-xs text-slate-500 mt-1">Requisitions, priority matrix & PO fulfillment</p>
          <div className="mt-3 text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <span>View Full Report</span> <FaArrowRight size={10} />
          </div>
        </Link>

        {/* Card 3: Dedicated Returns Report */}
        <Link
          href="/dashboard/purchase/reports/returns"
          className="group p-5 bg-gradient-to-br from-orange-500/10 to-rose-500/10 dark:from-orange-950/40 dark:to-rose-950/40 rounded-3xl border border-orange-200/80 dark:border-orange-900/40 hover:border-orange-500 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Section Report</span>
            <FaUndoAlt className="text-orange-500 text-xl" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-orange-600 transition">
            Purchase Returns Report &rarr;
          </h3>
          <p className="text-xs text-slate-500 mt-1">Debit notes, damaged & expired stock returns</p>
          <div className="mt-3 text-xs font-black text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <span>View Full Report</span> <FaArrowRight size={10} />
          </div>
        </Link>

        {/* Card 4: Dedicated Payments Report */}
        <Link
          href="/dashboard/purchase/reports/payments"
          className="group p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Section Report</span>
            <FaReceipt className="text-emerald-500 text-xl" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-emerald-600 transition">
            Supplier Payments Report &rarr;
          </h3>
          <p className="text-xs text-slate-500 mt-1">Payment receipts, UTR bank transfers & discounts</p>
          <div className="mt-3 text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>View Full Report</span> <FaArrowRight size={10} />
          </div>
        </Link>
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Inward Value</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">₹{summary.totalInwardValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{summary.invoicesCount} Invoices</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Paid Amount</p>
          <p className="text-lg font-black text-emerald-600 mt-0.5">₹{summary.totalPaidAmount.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{summary.paymentsCount} Vouchers</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Total Returns Value</p>
          <p className="text-lg font-black text-orange-600 mt-0.5">₹{summary.totalReturnsValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-orange-500 mt-0.5">{summary.returnsCount} Debit Notes</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Net Outstanding</p>
          <p className="text-lg font-black text-rose-600 mt-0.5">₹{summary.totalOutstandingBalance.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-rose-500 mt-0.5">{summary.suppliersCount} Suppliers</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total POs Value</p>
          <p className="text-lg font-black text-indigo-600 mt-0.5">₹{summary.totalOrdersValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-indigo-500 mt-0.5">{summary.ordersCount} Requisitions</p>
        </div>
      </div>

      {/* ADVANCED MULTIDIRECTIONAL FILTERS BAR */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <span className="px-2 text-slate-400 text-[11px] font-bold uppercase flex items-center gap-1">
              <FaCalendarAlt /> Period:
            </span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "FY_YEAR", label: "Financial Year" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1 rounded-xl transition ${
                  datePreset === p.id
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />

            <button
              onClick={fetchReports}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold shadow-xs hover:bg-purple-700 transition"
            >
              <FaFilter /> Apply
            </button>
          </div>
        </div>

        {/* Tab Selection Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "invoices", label: "Inward Invoices", count: invoices.length },
              { id: "orders", label: "Purchase Orders", count: orders.length },
              { id: "returns", label: "Debit Notes", count: returns.length },
              { id: "payments", label: "Payments Register", count: payments.length },
              { id: "suppliers", label: "Supplier Summary", count: supplierSummaries.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative max-w-xs">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search active report..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* REPORT DATA TABLES */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Generating executive report data...</div>
        ) : paginatedData.length > 0 ? (
          <div className="overflow-x-auto">
            {/* 1. INWARD INVOICES TABLE */}
            {activeTab === "invoices" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-3">Bill No</th>
                    <th className="py-3 px-3">Supplier Inv No</th>
                    <th className="py-3 px-3">Bill Date</th>
                    <th className="py-3 px-3">Supplier / Vendor</th>
                    <th className="py-3 px-3 text-right">Net Amount (₹)</th>
                    <th className="py-3 px-3 text-right">Paid (₹)</th>
                    <th className="py-3 px-3 text-right">Balance (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((b) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. PURCHASE ORDERS TABLE */}
            {activeTab === "orders" && (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-extrabold text-indigo-600 dark:text-indigo-400">{o.poNumber}</td>
                      <td className="py-3 px-3 text-slate-500">{o.poDate}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{o.vendorName}</td>
                      <td className="py-3 px-3 text-slate-600">{o.priority || "Normal"}</td>
                      <td className="py-3 px-3 text-slate-500">{o.paymentTerms || "30 Days Credit"}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(o.netTotal || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === "Billed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {o.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. DEBIT NOTES / RETURNS TABLE */}
            {activeTab === "returns" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-3">Debit Note VCN</th>
                    <th className="py-3 px-3">Return Date</th>
                    <th className="py-3 px-3">Supplier / Vendor</th>
                    <th className="py-3 px-3">Original Bill No</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Net Return (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-extrabold text-orange-600 dark:text-orange-400">{r.vcn}</td>
                      <td className="py-3 px-3 text-slate-500">{r.returnDate}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{r.vendorName}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{r.originalBillNo || "N/A"}</td>
                      <td className="py-3 px-3 text-amber-600 font-semibold">{r.reason}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(r.netAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                          {r.status || "Approved"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. PAYMENTS REGISTER TABLE */}
            {activeTab === "payments" && (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">{p.voucherNo}</td>
                      <td className="py-3 px-3 text-slate-500">{p.paymentDate}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{p.vendorName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{p.paymentMode || "Bank Transfer"}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.refNo || "N/A"}</td>
                      <td className="py-3 px-3 text-slate-500">{p.bankName || "N/A"}</td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold">₹{Number(p.discountReceived || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹{Number(p.amount || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. SUPPLIER SUMMARY TABLE */}
            {activeTab === "suppliers" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-3">Supplier Name</th>
                    <th className="py-3 px-3 text-center">Invoices Count</th>
                    <th className="py-3 px-3 text-right">Total Inward (₹)</th>
                    <th className="py-3 px-3 text-right">Total Paid (₹)</th>
                    <th className="py-3 px-3 text-right">Total Returns (₹)</th>
                    <th className="py-3 px-3 text-right">Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{s.vendorName}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-500">{s.invoicesCount}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">₹{Number(s.inwardTotal || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">₹{Number(s.paidTotal || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-right font-bold text-orange-600">₹{Number(s.returnsTotal || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-right font-black text-rose-600">₹{Number(s.outstandingBalance || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No records found for the selected period and search filter.
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {currentDataset.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, currentDataset.length)} to{" "}
              {Math.min(currentPage * pageSize, currentDataset.length)} of {currentDataset.length} records
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
                  <option value={100}>100</option>
                </select>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronLeft size={10} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-bold transition text-xs ${
                      currentPage === pageNum
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
