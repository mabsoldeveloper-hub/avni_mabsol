"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaUndo,
  FaPlusCircle,
  FaReceipt,
  FaTruck,
  FaBoxes,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaArrowUp,
  FaSearch,
  FaChartLine,
  FaTimes,
  FaEye,
  FaHandHoldingUsd,
  FaFileCsv,
  FaPhoneAlt,
  FaUserCheck,
  FaExclamationCircle,
  FaCheckCircle,
  FaInfoCircle,
  FaDatabase,
  FaChartBar,
} from "react-icons/fa";

interface PurchaseDashboardData {
  summary: {
    totalPurchases: number;
    purchaseReturns: number;
    netPurchase: number;
    totalPayments: number;
    totalBillsCount: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueBillsCount: number;
    suppliersCount: number;
    totalOrdersCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    purchase: number;
    returns: number;
    bills: number;
  }>;
  topSuppliers: Array<{
    supplier: string;
    amount: number;
    billsCount: number;
    phone?: string;
    city?: string;
  }>;
  recentBills: Array<{
    id: string;
    vcn: string;
    date: string;
    supplier: string;
    amount: number;
    balance?: number;
    type: string;
    status: string;
  }>;
  overdueList?: Array<{
    vcn: string;
    supplier: string;
    billDate: string;
    dueDate: string;
    balance: number;
    overdueDays: number;
  }>;
  dataExplanations?: Record<string, { source: string; logic: string; filter: string }>;
}

export default function PurchaseDashboardContent() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  // Filter State
  const [period, setPeriod] = useState<"THIS_MONTH" | "LAST_MONTH" | "QUARTER" | "FY" | "ALL">("ALL");
  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Analytics View Tab
  const [analyticsTab, setAnalyticsTab] = useState<"trend" | "suppliers">("trend");

  // Clickable KPI Card Modals
  const [activeModal, setActiveModal] = useState<"purchases" | "outstanding" | "overdue" | "returns" | "suppliers" | "orders" | null>(null);

  // Data Info Explanation Modal State
  const [infoExplanation, setInfoExplanation] = useState<{ title: string; source: string; logic: string; filter: string } | null>(null);

  // Quick View Recent Activity Modal
  const [selectedRecentBill, setSelectedRecentBill] = useState<any | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchPurchaseDashboard = useCallback(async () => {
    setData((prev) => {
      if (!prev) setLoading(true);
      else setRefreshing(true);
      return prev;
    });
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      params.set("period", period);

      const res = await fetch(`/api/purchase/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error("Purchase Dashboard Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompany?._id, selectedFY?._id, period]);

  useEffect(() => {
    fetchPurchaseDashboard();
  }, [fetchPurchaseDashboard]);

  const summary = data?.summary || {
    totalPurchases: 0,
    purchaseReturns: 0,
    netPurchase: 0,
    totalPayments: 0,
    totalBillsCount: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueBillsCount: 0,
    suppliersCount: 0,
    totalOrdersCount: 0,
  };

  const monthlyTrend = data?.monthlyTrend || [];
  const topSuppliers = data?.topSuppliers || [];
  const recentBills = data?.recentBills || [];
  const overdueList = data?.overdueList || [];
  const explanations = data?.dataExplanations;

  const maxPurchase = Math.max(...monthlyTrend.map((m) => m.purchase), 1);

  const openInfo = (key: string, title: string) => {
    const info = explanations?.[key] || {
      source: "Purchase Bill & Master Ledger database collections",
      logic: "Aggregated sum based on selected Company and Financial Year parameters.",
      filter: selectedCompany ? `Company: ${selectedCompany.companyName}` : "All Active Companies",
    };
    setInfoExplanation({
      title,
      source: info.source,
      logic: info.logic,
      filter: info.filter,
    });
  };

  return (
    // <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <div className="container-fluid p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <FaShoppingBag className="text-[240px] text-amber-500" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide uppercase">
            <FaShoppingBag /> Purchase & Creditors Control Center
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Purchase Executive Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-slate-300 text-xs font-medium pt-1">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-md">
              <FaBuilding className="text-amber-400" />
              {selectedCompany ? selectedCompany.companyName : "All Companies"}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-md">
              <FaCalendarAlt className="text-amber-400" />
              FY: {selectedFY ? selectedFY.fyName : "Current Financial Year"}
            </span>
          </div>
        </div>

        {/* Filter Period & Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
            {(["ALL", "THIS_MONTH", "LAST_MONTH", "QUARTER", "FY"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${period === p ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
              >
                {p === "ALL" ? "All Time" : p === "THIS_MONTH" ? "This Month" : p === "LAST_MONTH" ? "Last Month" : p === "QUARTER" ? "Quarter" : "FY Year"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPurchaseDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
            title="Refresh Dashboard Data"
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* CLICKABLE INTERACTIVE KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Purchases */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Purchase</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openInfo("totalPurchases", "Total Purchase Value"); }}
                className="text-slate-400 hover:text-amber-500 p-0.5"
                title="Data Source & Explanation"
              >
                <FaInfoCircle size={13} />
              </button>
            </div>
            <span className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base">
              <FaShoppingBag />
            </span>
          </div>

          <div onClick={() => setActiveModal("purchases")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹{summary.totalPurchases.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <span>{summary.totalBillsCount} Inward Bills</span> &rarr;
            </p>
          </div>
        </div>

        {/* Card 2: Pending Creditors */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Creditors</span>
            <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <FaFileInvoiceDollar />
            </span>
          </div>

          <div onClick={() => setActiveModal("outstanding")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹{summary.totalOutstanding.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <span>Payables Ledger</span> &rarr;
            </p>
          </div>
        </div>

        {/* Card 3: Overdue Amount */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Amount</span>
            <span className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">
              <FaExclamationTriangle />
            </span>
          </div>

          <div onClick={() => setActiveModal("overdue")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ₹{summary.totalOverdue.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
              <span>{summary.overdueBillsCount} Overdue Bills</span> &rarr;
            </p>
          </div>
        </div>

        {/* Card 4: Purchase Returns */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Purchase Returns</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openInfo("purchaseReturns", "Purchase Returns & Debit Notes"); }}
                className="text-slate-400 hover:text-orange-500 p-0.5"
                title="Data Source & Explanation"
              >
                <FaInfoCircle size={13} />
              </button>
            </div>
            <span className="w-9 h-9 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-base">
              <FaUndo />
            </span>
          </div>

          <div onClick={() => setActiveModal("returns")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹{summary.purchaseReturns.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
              <span>Debit Notes Summary</span> &rarr;
            </p>
          </div>
        </div>

        {/* Card 5: Active Suppliers */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Suppliers</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openInfo("suppliersCount", "Active Creditors & Vendors"); }}
                className="text-slate-400 hover:text-emerald-500 p-0.5"
                title="Data Source & Explanation"
              >
                <FaInfoCircle size={13} />
              </button>
            </div>
            <span className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base">
              <FaBuilding />
            </span>
          </div>

          <div onClick={() => setActiveModal("suppliers")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary.suppliersCount} Vendors
            </h3>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>Top Suppliers Ranking</span> &rarr;
            </p>
          </div>
        </div>

        {/* Card 6: Purchase Orders */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Purchase Orders</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openInfo("totalOrdersCount", "Purchase Order Requisitions"); }}
                className="text-slate-400 hover:text-indigo-500 p-0.5"
                title="Data Source & Explanation"
              >
                <FaInfoCircle size={13} />
              </button>
            </div>
            <span className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base">
              <FaTruck />
            </span>
          </div>

          <div onClick={() => setActiveModal("orders")} className="mt-3 cursor-pointer">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary.totalOrdersCount} POs
            </h3>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <span>Active Requisitions</span> &rarr;
            </p>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW COMMAND PANEL (6 Interlinked Short-Cut Pills) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-amber-500 transition group"
        >
          <div className="flex items-center gap-2.5">
            <FaShoppingBag className="text-amber-500 text-base" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Invoices List</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
            {summary.totalBillsCount}
          </span>
        </Link>

        <Link
          href="/dashboard/purchase/invoice/create"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-600 text-white font-bold shadow-md hover:bg-amber-700 transition"
        >
          <div className="flex items-center gap-2.5">
            <FaPlusCircle className="text-white text-base" />
            <span className="text-xs font-bold">New Bill</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-white/20 text-white rounded-full">
            +
          </span>
        </Link>

        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-rose-500 transition group"
        >
          <div className="flex items-center gap-2.5">
            <FaFileInvoiceDollar className="text-rose-500 text-base" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Outstanding</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full">
            ₹{(summary.totalOutstanding / 1000).toFixed(0)}k
          </span>
        </Link>

        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-emerald-500 transition group"
        >
          <div className="flex items-center gap-2.5">
            <FaReceipt className="text-emerald-500 text-base" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Entry</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">
            Settle
          </span>
        </Link>

        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-indigo-500 transition group"
        >
          <div className="flex items-center gap-2.5">
            <FaTruck className="text-indigo-500 text-base" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Purchase Orders</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-full">
            {summary.totalOrdersCount}
          </span>
        </Link>

        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-orange-500 transition group"
        >
          <div className="flex items-center gap-2.5">
            <FaUndo className="text-orange-500 text-base" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Purchase Return</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded-full">
            Debit Note
          </span>
        </Link>
      </div>

      {/* ANALYTICS SECTION: Monthly Purchase Bar Chart & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaChartLine className="text-amber-500" /> Inward Purchase & Return Trend
              </h3>
              <p className="text-xs text-slate-500">Monthly breakdown of gross purchases vs debit note returns</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setAnalyticsTab("trend")}
                className={`px-3 py-1 rounded-lg transition ${analyticsTab === "trend" ? "bg-amber-600 text-white shadow-xs" : "text-slate-500"}`}
              >
                <FaChartBar className="inline mr-1" /> Monthly Bar
              </button>
              <button
                onClick={() => setAnalyticsTab("suppliers")}
                className={`px-3 py-1 rounded-lg transition ${analyticsTab === "suppliers" ? "bg-amber-600 text-white shadow-xs" : "text-slate-500"}`}
              >
                <FaBuilding className="inline mr-1" /> Top Vendors
              </button>
            </div>
          </div>

          {/* Bar Chart Graphics */}
          <div className="h-64 flex items-end justify-between gap-4 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {monthlyTrend.map((m, idx) => {
              const purHeight = Math.round((m.purchase / maxPurchase) * 100);
              const retHeight = Math.round((m.returns / maxPurchase) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                    ₹{(m.purchase / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full max-w-[40px] flex items-end justify-center gap-1.5 h-full">
                    {/* Purchase Bar */}
                    <div
                      style={{ height: `${Math.max(purHeight, 15)}%` }}
                      className="w-full bg-gradient-to-t from-amber-600 to-orange-500 rounded-t-lg shadow-sm transition-all duration-500 group-hover:scale-105"
                      title={`Purchase: ₹${m.purchase.toLocaleString("en-IN")}`}
                    />
                    {/* Returns Bar */}
                    {m.returns > 0 && (
                      <div
                        style={{ height: `${Math.max(retHeight, 8)}%` }}
                        className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-500"
                        title={`Returns: ₹${m.returns.toLocaleString("en-IN")}`}
                      />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Gross Purchase Value
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-3 h-3 rounded-full bg-rose-500" /> Debit Notes / Returns
              </span>
            </div>
            <Link href="/dashboard/purchase/invoice" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
              View Detailed Register &rarr;
            </Link>
          </div>
        </div>

        {/* Top Suppliers Ranking Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaBuilding className="text-amber-500" /> Top Suppliers Ranking
            </h3>
            <Link href="/dashboard/purchase/outstanding" className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {topSuppliers.map((sup, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{sup.supplier}</h4>
                    <p className="text-[10px] text-slate-500">{sup.billsCount} Inward Bills • {sup.city || "Pharma Dist."}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    ₹{sup.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaReceipt className="text-amber-500" /> Recent Purchase Activity & Vouchers
            </h3>
            <p className="text-xs text-slate-500">Real-time feed of latest purchase bills, debit notes & payments</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/purchase/invoice"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Full Invoices List &rarr;
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">VCN / Bill #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Vendor / Supplier</th>
                <th className="p-3">Voucher Type</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentBills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                  <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{b.vcn}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{b.date}</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">{b.supplier}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${b.type === "Debit Note" || b.type === "Return"
                        ? "bg-rose-500/10 text-rose-600"
                        : b.type === "Payment"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                        }`}
                    >
                      {b.type}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                    ₹{(b.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-semibold">
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedRecentBill(b)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white rounded-lg transition"
                      title="Quick View Details"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPLANATION POPUP MODAL (Explains Data Source & Formula)                  */}
      {/* ========================================================================= */}
      {infoExplanation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaInfoCircle className="text-amber-500" /> {infoExplanation.title} Info
              </h3>
              <button onClick={() => setInfoExplanation(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="font-bold text-amber-600 uppercase text-[10px] flex items-center gap-1">
                  <FaDatabase /> Database Source Collection
                </p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{infoExplanation.source}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Calculation Formula / Logic</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{infoExplanation.logic}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Active Filters & Scope</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{infoExplanation.filter}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInfoExplanation(null)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS FOR CLICKABLE KPI CARDS                                */}
      {/* ========================================================================= */}

      {/* MODAL 1: TOTAL PURCHASES BREAKDOWN */}
      {activeModal === "purchases" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaShoppingBag className="text-amber-500" /> Total Inward Purchases Breakdown
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-amber-600">Gross Purchases</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{summary.totalPurchases.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-rose-600">Returns Deducted</p>
                <p className="text-xl font-black text-rose-600 mt-1">-₹{summary.purchaseReturns.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Net Purchase Value</p>
                <p className="text-xl font-black text-emerald-600 mt-1">₹{summary.netPurchase.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Purchase Highlights</h4>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                <li className="flex justify-between border-b pb-1">
                  <span>Total Inward Bills Received:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{summary.totalBillsCount} Invoices</span>
                </li>
                <li className="flex justify-between border-b pb-1">
                  <span>Average Inward Bill Value:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{summary.totalBillsCount > 0 ? Math.round(summary.totalPurchases / summary.totalBillsCount).toLocaleString("en-IN") : 0}
                  </span>
                </li>
                <li className="flex justify-between border-b pb-1">
                  <span>Total Payments Settled:</span>
                  <span className="font-bold text-emerald-600">₹{summary.totalPayments.toLocaleString("en-IN")}</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/purchase/invoice"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Go to Purchase Invoices &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: OUTSTANDING CREDITORS */}
      {activeModal === "outstanding" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaFileInvoiceDollar className="text-blue-500" /> Pending Creditors Ledger
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-blue-600">Total Outstanding Payable Balance</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{summary.totalOutstanding.toLocaleString("en-IN")}</h2>
              </div>
              <Link
                href="/dashboard/purchase/payment"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <FaHandHoldingUsd /> Settle Payments
              </Link>
            </div>

            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Top Unpaid Suppliers</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {topSuppliers.map((sup, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{sup.supplier}</p>
                    <p className="text-[10px] text-slate-500">{sup.phone ? `Phone: ${sup.phone}` : "Creditor Account"}</p>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">₹{sup.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/purchase/outstanding"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                View Full Outstanding Register &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OVERDUE CRITICAL ALERT */}
      {activeModal === "overdue" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-3">
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <FaExclamationTriangle className="text-rose-600" /> Overdue Creditor Bills Alert
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-rose-600">Total Critical Overdue Amount</p>
                <h2 className="text-2xl font-black text-rose-600 mt-1">₹{summary.totalOverdue.toLocaleString("en-IN")}</h2>
                <p className="text-xs text-rose-500 mt-0.5 font-medium">{summary.overdueBillsCount} Bills past due date</p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Overdue Bills List</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {overdueList.map((item, idx) => (
                <div key={idx} className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.supplier} <span className="text-rose-600 font-mono">({item.vcn})</span></p>
                    <p className="text-[10px] text-slate-500">Due Date: {item.dueDate || item.billDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-rose-600">₹{item.balance.toLocaleString("en-IN")}</p>
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded-full text-[9px]">
                      {item.overdueDays} Days Overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/purchase/payment"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
              >
                <FaHandHoldingUsd /> Settle Overdue Bills &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PURCHASE RETURNS / DEBIT NOTES */}
      {activeModal === "returns" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaUndo className="text-orange-500" /> Debit Notes & Purchase Returns Summary
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-orange-600">Total Purchase Return Value</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{summary.purchaseReturns.toLocaleString("en-IN")}</h2>
              </div>
              <Link
                href="/dashboard/purchase/purchase-return"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                + Create Debit Note
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Damaged / Expired Returns</p>
                <p className="font-bold text-slate-800 dark:text-white mt-1">Auto Stock Deduction</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Credit Adjustment</p>
                <p className="font-bold text-slate-800 dark:text-white mt-1">Direct Vendor Offset</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/purchase/purchase-return"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Open Purchase Returns Module &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SUPPLIERS LEDGER */}
      {activeModal === "suppliers" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaBuilding className="text-emerald-500" /> Active Suppliers & Creditors Directory
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <p className="text-xs uppercase font-bold text-emerald-600">Total Registered Creditor Accounts</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.suppliersCount} Vendors</h2>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {topSuppliers.map((sup, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{sup.supplier}</p>
                    <p className="text-[10px] text-slate-500">{sup.billsCount} Bills Issued</p>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white text-sm">₹{sup.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/master/customer-master"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Manage Creditor Ledgers &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PURCHASE ORDERS */}
      {activeModal === "orders" && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaTruck className="text-indigo-500" /> Purchase Orders & Requisitions
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-indigo-600">Total Purchase Orders Issued</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.totalOrdersCount} POs</h2>
              </div>
              <Link
                href="/dashboard/purchase/orders/create"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                + Create PO
              </Link>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Link
                href="/dashboard/purchase/orders"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                View Purchase Orders List &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW MODAL FOR RECENT ACTIVITY ITEM */}
      {selectedRecentBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Voucher Details: {selectedRecentBill.vcn}
              </h3>
              <button onClick={() => setSelectedRecentBill(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Supplier/Vendor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecentBill.supplier}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Voucher Date:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecentBill.date}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Voucher Type:</span>
                <span className="font-bold text-amber-600">{selectedRecentBill.type}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-black text-slate-900 dark:text-white text-base">₹{(selectedRecentBill.amount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setSelectedRecentBill(null)}
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
