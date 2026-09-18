"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaMapMarkerAlt,
  FaBullseye,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaUserMd,
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";

interface SalesmanDashboardProps {
  user: any;
  selectedCompany?: any;
}

export default function SalesmanDashboard({ user, selectedCompany }: SalesmanDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [targetMetrics, setTargetMetrics] = useState({
    targetAmount: 0,
    achievedAmount: 0,
    percentage: 0,
    daysRemaining: 0,
  });
  const [salesMetrics, setSalesMetrics] = useState({
    territoryOrdersValue: 0,
    totalOrdersCount: 0,
    inTransitCount: 0,
    areaOutstanding: 0,
    overdueAccountsCount: 0,
    overdueHighRiskCount: 0,
    callsTarget: 0,
    callsAchieved: 0,
    lastVisitTime: "Today",
  });

  const assignedAreas = user?.assignedAreaNames?.length
    ? user.assignedAreaNames.join(", ")
    : user?.headquarter || user?.city || "Assigned Territory";

  useEffect(() => {
    fetchSalesmanData();
  }, [user, selectedCompany]);

  const fetchSalesmanData = async () => {
    try {
      setLoading(true);

      const userId = user?._id || "";

      // 1. Fetch tracked orders
      let fetchedOrders: any[] = [];
      try {
        const resOrders = await fetch("/api/orders/tracking");
        if (resOrders.ok) {
          const dataOrders = await resOrders.json();
          if (dataOrders.success && Array.isArray(dataOrders.orders)) {
            fetchedOrders = dataOrders.orders;
            setOrders(fetchedOrders.slice(0, 6));
          }
        }
      } catch (e) {
        console.error("Orders fetch error:", e);
      }

      // 2. Fetch live targets for this user
      let userTarget = 0;
      let userAchieved = 0;
      try {
        const resTargets = await fetch(`/api/targets?mrUserId=${userId}`);
        if (resTargets.ok) {
          const dataTargets = await resTargets.json();
          const targetList: any[] = Array.isArray(dataTargets) ? dataTargets : (dataTargets?.targets || []);
          targetList.forEach((t) => {
            userTarget += Number(t.targetAmount || t.targetValue || 0);
            userAchieved += Number(t.achievedAmount || t.salesValue || 0);
          });
        }
      } catch (e) {
        console.error("Targets fetch error:", e);
      }

      // 3. Fetch DCR / Call reports for user
      let totalCalls = 0;
      let lastVisit = "None";
      try {
        const resDcr = await fetch(`/api/mr-reporting/dcr?userId=${userId}`);
        if (resDcr.ok) {
          const dataDcr = await resDcr.json();
          const dcrLogs = Array.isArray(dataDcr?.data) ? dataDcr.data : (Array.isArray(dataDcr) ? dataDcr : []);
          dcrLogs.forEach((d: any) => {
            totalCalls += Array.isArray(d.callLogs) ? d.callLogs.length : 1;
          });
          if (dcrLogs.length > 0) {
            const latestDate = new Date(dcrLogs[0].dcrDate || dcrLogs[0].createdAt);
            lastVisit = latestDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
          }
        }
      } catch (e) {
        console.error("DCR fetch error:", e);
      }

      // 4. Fetch dashboard KPIs for sales & outstanding
      let dashData: any = null;
      try {
        const params = new URLSearchParams();
        if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
        const resDash = await fetch(`/api/dashboard?${params.toString()}`);
        if (resDash.ok) {
          dashData = await resDash.json();
        }
      } catch (e) {
        console.error("Dashboard KPI fetch error:", e);
      }

      // Calculate days remaining in current month
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeft = Math.max(0, lastDayOfMonth - now.getDate());

      // Target metrics
      const targetPct = userTarget > 0 ? Math.round((userAchieved / userTarget) * 100) : (userAchieved > 0 ? 100 : 0);
      setTargetMetrics({
        targetAmount: userTarget,
        achievedAmount: userAchieved,
        percentage: targetPct,
        daysRemaining: daysLeft,
      });

      // Orders metrics
      const totalOrderVal = fetchedOrders.reduce((sum, ord) => sum + Number(ord.totalAmount || 0), 0);
      const inTransit = fetchedOrders.filter((ord) => ord.currentStatus === "Dispatched" || ord.currentStatus === "In-Transit").length;

      const overdueAmount = Number(dashData?.kpis?.credit?.totalOverdue || 0);
      const overdueAccs = Number(dashData?.kpis?.credit?.overdueCount || 0);

      setSalesMetrics({
        territoryOrdersValue: totalOrderVal > 0 ? totalOrderVal : Number(dashData?.kpis?.sales?.totalSales || 0),
        totalOrdersCount: fetchedOrders.length || Number(dashData?.kpis?.sales?.totalInvoices || 0),
        inTransitCount: inTransit,
        areaOutstanding: overdueAmount,
        overdueAccountsCount: overdueAccs,
        overdueHighRiskCount: Math.ceil(overdueAccs * 0.25),
        callsTarget: 60,
        callsAchieved: totalCalls,
        lastVisitTime: lastVisit !== "None" ? lastVisit : "Active",
      });

    } catch (e) {
      console.error("Error in fetchSalesmanData:", e);
    } finally {
      setLoading(false);
    }
  };

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, targetMetrics.percentage)) / 100;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-h-screen">
      {/* ==================== SALESMAN HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-4 sm:p-6 text-white border border-indigo-500/20 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                Field Representative Workspace
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300">
                <FaMapMarkerAlt size={9} /> Territory: {assignedAreas}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight font-sans">
              Welcome back, {user?.name || "Representative"}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time snapshot of your assigned territory targets, active doctor/chemist accounts, pending deliveries, and daily call reports.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSalesmanData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all hover:scale-105"
            >
              <FaSyncAlt size={11} className={loading ? "animate-spin" : ""} /> Sync Data
            </button>
            <Link
              href="/dashboard/mr-reporting"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <FaClipboardList size={12} /> Log Field DCR
            </Link>
            <Link
              href="/dashboard/orders/tracking"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all hover:scale-105"
            >
              <FaTruck size={12} /> Track Deliveries
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== 4 CORE SALESMAN METRIC CARDS ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Target Gauge */}
        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Monthly Target</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <FaBullseye size={12} />
            </div>
          </div>
          <div className="flex items-center justify-between my-2">
            <div>
              <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                ₹{targetMetrics.achievedAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                Target: {targetMetrics.targetAmount > 0 ? `₹${targetMetrics.targetAmount.toLocaleString("en-IN")}` : "Assigned Target"}
              </p>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#4f46e5"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[10px] font-extrabold text-indigo-600">
                {targetMetrics.percentage}%
              </span>
            </div>
          </div>
          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <FaCheckCircle size={10} /> {targetMetrics.daysRemaining} days left in cycle
          </div>
        </div>

        {/* Metric 2: Area Orders Value */}
        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Territory Orders</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <FaShoppingBag size={12} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              ₹{salesMetrics.territoryOrdersValue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              {salesMetrics.totalOrdersCount} Total Orders Processed
            </p>
          </div>
          <div className="text-[10px] font-medium text-slate-500 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>In-Transit:</span>
            <span className="font-bold text-sky-600">{salesMetrics.inTransitCount} Orders</span>
          </div>
        </div>

        {/* Metric 3: Area Overdue & Outstanding */}
        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase text-rose-600 dark:text-rose-400">Area Outstanding</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
              <FaFileInvoiceDollar size={12} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400">
              ₹{salesMetrics.areaOutstanding.toLocaleString("en-IN")}
            </p>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              {salesMetrics.overdueAccountsCount > 0 ? `Across ${salesMetrics.overdueAccountsCount} Accounts` : "Accounts Ledger"}
            </p>
          </div>
          <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <FaExclamationTriangle size={10} /> {salesMetrics.overdueHighRiskCount} Overdue Attention Required
          </div>
        </div>

        {/* Metric 4: Doctor / Chemist Coverage */}
        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase text-purple-600 dark:text-purple-400">Field Visits / DCR</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
              <FaUserMd size={12} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {salesMetrics.callsAchieved} Calls Logged
            </p>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              {salesMetrics.callsAchieved >= salesMetrics.callsTarget ? "100% Target Met" : `${Math.round((salesMetrics.callsAchieved / (salesMetrics.callsTarget || 1)) * 100)}% Monthly Call Quota`}
            </p>
          </div>
          <div className="text-[10px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <FaClock size={10} /> Last Field Activity: {salesMetrics.lastVisitTime}
          </div>
        </div>
      </div>

      {/* ==================== LIVE TERRITORY ORDER & STOCK DISPATCH PIPELINE ==================== */}
      <div className="rounded-2xl p-4 sm:p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Live Territory Orders &amp; Stock Tracking
            </h3>
          </div>
          <Link
            href="/dashboard/orders/tracking"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            View All Tracking ➔
          </Link>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-slate-400 gap-2">
            <FaSyncAlt size={16} className="animate-spin text-indigo-600" />
            <span className="text-xs">Loading territory tracking pipeline...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No live dispatch orders found for your territory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 pb-2">
                  <th className="py-2 font-semibold">Order / PO</th>
                  <th className="py-2 font-semibold">Customer / Chemist</th>
                  <th className="py-2 font-semibold">Area</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Stock Audit</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold text-right">Courier / AWB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {orders.map((ord, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">{ord.orderNumber}</td>
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{ord.customerName}</td>
                    <td className="py-2.5 text-slate-500">{ord.areaName || "Area Hub"}</td>
                    <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                      ₹{Number(ord.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 text-[11px] text-slate-500">
                      {ord.items?.[0] ? (
                        <span>
                          {ord.items[0].itemName} (Stock Left: <strong className="text-emerald-600">{ord.items[0].stockAfter}</strong>)
                        </span>
                      ) : (
                        "Stock Allocated"
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          ord.currentStatus === "Delivered"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.currentStatus === "Dispatched"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ord.currentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {ord.trackingNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
