"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import {
  FaBullseye,
  FaCalendarAlt,
  FaChartLine,
  FaDownload,
  FaFilter,
  FaGift,
  FaLayerGroup,
  FaLock,
  FaMapMarkerAlt,
  FaPrint,
  FaRedo,
  FaSearch,
  FaStore,
  FaUser,
  FaChevronDown,
  FaChevronRight,
  FaArrowLeft,
  FaWallet,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRegCalendarCheck,
  FaWhatsapp,
  FaChartPie,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface WeeklyItem {
  weekNo: number;
  label: string;
  startDate: string;
  endDate: string;
  daysInWeek: number;
  weeklySalesTarget: number;
  weekActualSales: number;
  weeklySalesShortfall: number;
  salesAchPercent: number;
  weeklyCollectionTarget: number;
  weekActualCollection: number;
  weeklyCollectionShortfall: number;
  collectionAchPercent: number;
}

interface DailyItem {
  date: string;
  day: number;
  dailySalesTarget: number;
  dayActualSales: number;
  salesAchPercent: number;
  dailyCollectionTarget: number;
  dayActualCollection: number;
  collectionAchPercent: number;
}

interface GiftSlab {
  minAchievementPercent: number;
  giftName: string;
  giftDescription?: string;
}

interface TargetVsActualRow {
  _id: string;
  targetType: "MR" | "Customer";
  periodMonth: string;
  mrUserId?: any;
  mrName: string;
  customerCode: string;
  customerName: string;
  phoneNumber?: string;
  notes: string;
  status: string;
  // Sales Metrics
  salesTarget: number;
  monthlyActualSales: number;
  salesShortfall: number;
  salesAchPercent: number;
  // Collection Metrics
  collectionTarget: number;
  monthlyActualCollection: number;
  collectionShortfall: number;
  collectionAchPercent: number;
  // Gift Scheme
  hasGiftScheme: boolean;
  giftSlabs: GiftSlab[];
  activeGiftSlab: GiftSlab | null;
  // Breakdowns
  weeklyBreakdown: WeeklyItem[];
  dailyBreakdown: DailyItem[];
}

interface SummaryData {
  totalRecords: number;
  totalSalesTarget: number;
  totalActualSales: number;
  totalSalesShortfall: number;
  overallSalesAchPercent: number;
  totalCollectionTarget: number;
  totalActualCollection: number;
  totalCollectionShortfall: number;
  overallCollectionAchPercent: number;
}

export default function TargetVsActualReportPage() {
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetType, setTargetType] = useState<"all" | "MR" | "Customer">("all");
  const [frequency, setFrequency] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<TargetVsActualRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isMrRestricted, setIsMrRestricted] = useState(false);
  const { selectedCompany } = useCompany();

  // Accordion expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const params = new URLSearchParams({
        periodMonth,
        targetType,
        frequency,
        search,
      });
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

      const res = await fetch(`/api/reports/target-vs-actual?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();

      if (json.success) {
        setRows(json.data || []);
        setSummary(json.summary || null);
        setIsMrRestricted(Boolean(json.isMrRestricted));
        if (Array.isArray(json.availableMonths) && json.availableMonths.length > 0) {
          setAvailableMonths(json.availableMonths);
        }
      } else {
        setError(json.message || "Failed to load report data");
        setRows([]);
        setSummary(null);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Report generation timed out. Please retry.");
      } else {
        setError("An unexpected error occurred while fetching report data.");
      }
      setRows([]);
      setSummary(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [periodMonth, targetType, frequency, search, selectedCompany]);

  const [mounted, setMounted] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchReportData();
  }, [fetchReportData]);

  // Computed data for Recharts Visual Analytics
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { mainData: [], salesPie: [], collectionPie: [], entityPie: [] };
    }

    let mainData: any[] = [];

    if (frequency === "weekly") {
      // 5-Week Trend aggregation across all rows
      const weekMap: Record<number, { name: string; salesTarget: number; actualSales: number; collectionTarget: number; actualCollection: number }> = {};
      for (let i = 1; i <= 5; i++) {
        weekMap[i] = { name: `Week ${i}`, salesTarget: 0, actualSales: 0, collectionTarget: 0, actualCollection: 0 };
      }
      rows.forEach((r) => {
        (r.weeklyBreakdown || []).forEach((w) => {
          if (weekMap[w.weekNo]) {
            weekMap[w.weekNo].salesTarget += w.weeklySalesTarget || 0;
            weekMap[w.weekNo].actualSales += w.weekActualSales || 0;
            weekMap[w.weekNo].collectionTarget += w.weeklyCollectionTarget || 0;
            weekMap[w.weekNo].actualCollection += w.weekActualCollection || 0;
          }
        });
      });
      mainData = Object.values(weekMap);
    } else if (frequency === "daily") {
      // 31-Day Trend aggregation across all rows
      const dayMap: Record<number, { name: string; salesTarget: number; actualSales: number; collectionTarget: number; actualCollection: number }> = {};
      for (let i = 1; i <= 31; i++) {
        dayMap[i] = { name: `Day ${i}`, salesTarget: 0, actualSales: 0, collectionTarget: 0, actualCollection: 0 };
      }
      rows.forEach((r) => {
        (r.dailyBreakdown || []).forEach((d) => {
          if (dayMap[d.day]) {
            dayMap[d.day].salesTarget += d.dailySalesTarget || 0;
            dayMap[d.day].actualSales += d.dayActualSales || 0;
            dayMap[d.day].collectionTarget += d.dailyCollectionTarget || 0;
            dayMap[d.day].actualCollection += d.dayActualCollection || 0;
          }
        });
      });
      mainData = Object.values(dayMap).filter(
        (d) => d.salesTarget > 0 || d.actualSales > 0 || d.collectionTarget > 0 || d.actualCollection > 0
      );
    } else {
      // Top 10 Entities for Monthly View
      mainData = rows.slice(0, 10).map((r) => {
        const rawName = r.targetType === "MR" ? r.mrName : r.customerName;
        return {
          name: rawName.length > 14 ? rawName.slice(0, 12) + ".." : rawName,
          salesTarget: r.salesTarget,
          actualSales: r.monthlyActualSales,
          collectionTarget: r.collectionTarget,
          actualCollection: r.monthlyActualCollection,
        };
      });
    }

    // Pie Chart 1: Sales Achievement Breakdown
    let salesAchieved = 0;
    let salesOnTrack = 0;
    let salesAtRisk = 0;

    // Pie Chart 2: Collection Recovery Breakdown
    let collAchieved = 0;
    let collOnTrack = 0;
    let collAtRisk = 0;

    // Entity Share
    let mrSalesTarget = 0;
    let partySalesTarget = 0;

    rows.forEach((r) => {
      if (r.salesAchPercent >= 100) salesAchieved++;
      else if (r.salesAchPercent >= 80) salesOnTrack++;
      else salesAtRisk++;

      if (r.collectionAchPercent >= 100) collAchieved++;
      else if (r.collectionAchPercent >= 80) collOnTrack++;
      else collAtRisk++;

      if (r.targetType === "MR") mrSalesTarget += r.salesTarget;
      else partySalesTarget += r.salesTarget;
    });

    const salesPie = [
      { name: "Achieved (100%+)", value: salesAchieved, color: "#059669" },
      { name: "On Track (80-99%)", value: salesOnTrack, color: "#4f46e5" },
      { name: "At Risk (<80%)", value: salesAtRisk, color: "#e11d48" },
    ].filter((x) => x.value > 0);

    const collectionPie = [
      { name: "Full Recovery (100%+)", value: collAchieved, color: "#4338ca" },
      { name: "Partial (80-99%)", value: collOnTrack, color: "#0284c7" },
      { name: "Pending (<80%)", value: collAtRisk, color: "#d97706" },
    ].filter((x) => x.value > 0);

    const entityPie = [
      { name: "MR Targets", value: mrSalesTarget, color: "#4f46e5" },
      { name: "Party Targets", value: partySalesTarget, color: "#059669" },
    ].filter((x) => x.value > 0);

    return { mainData, salesPie, collectionPie, entityPie };
  }, [rows, frequency]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(rows.map((r) => r._id));
    setExpandedRows(allIds);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const formatINR = (val: number) => {
    return (val || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };

  const formatWhatsAppPhone = (phone?: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return "";
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
    if (cleaned.length > 10 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
    return cleaned;
  };

  const getDirectWhatsAppUrl = (row: TargetVsActualRow): string => {
    const name = row.targetType === "MR" ? row.mrName : row.customerName;
    const month = row.periodMonth;
    const salesTarget = row.salesTarget;
    const actualSales = row.monthlyActualSales;
    const shortfall = row.salesShortfall;
    const ach = row.salesAchPercent;

    let text = `*Target & Performance Update*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Sales Target for *${month}*: *₹${salesTarget.toLocaleString("en-IN")}*\n`;
    text += `Current Achieved Sales: *₹${actualSales.toLocaleString("en-IN")}* (${ach}%)\n`;
    text += `Remaining Shortfall: *₹${shortfall.toLocaleString("en-IN")}*\n\n`;

    if (row.collectionTarget > 0) {
      text += `Collection Target: *₹${row.collectionTarget.toLocaleString("en-IN")}* | Achieved: *₹${row.monthlyActualCollection.toLocaleString("en-IN")}*\n\n`;
    }

    if (row.hasGiftScheme && row.giftSlabs && row.giftSlabs.length > 0) {
      const nextSlab = [...row.giftSlabs]
        .sort((a, b) => a.minAchievementPercent - b.minAchievementPercent)
        .find((s) => ach < s.minAchievementPercent);

      if (nextSlab) {
        text += `🎁 *Reward Scheme:* Achieve *₹${shortfall.toLocaleString("en-IN")}* more sales to unlock *${nextSlab.giftName}*!\n\n`;
      } else if (row.activeGiftSlab) {
        text += `🎉 *Congratulations!* Unlocked Reward: *${row.activeGiftSlab.giftName}*!\n\n`;
      }
    } else {
      text += `Please complete your target before month end to maximize your growth!\n\n`;
    }

    const cleanPhone = formatWhatsAppPhone(row.phoneNumber);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    } else {
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
  };

  const exportCSV = () => {
    if (rows.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Code,Name,Assigned MR,Month,Sales Target,Actual Sales,Sales Ach %,Sales Shortfall,Collection Target,Actual Collection,Collection Ach %,Collection Shortfall,Gift Status\n";

    rows.forEach((r) => {
      const type = r.targetType;
      const code = `"${r.customerCode}"`;
      const name = `"${r.targetType === "MR" ? r.mrName : r.customerName}"`;
      const mr = `"${r.mrName}"`;
      const month = r.periodMonth;
      const st = r.salesTarget;
      const sa = r.monthlyActualSales;
      const sp = r.salesAchPercent;
      const ss = r.salesShortfall;
      const ct = r.collectionTarget;
      const ca = r.monthlyActualCollection;
      const cp = r.collectionAchPercent;
      const cs = r.collectionShortfall;
      const gift = `"${r.activeGiftSlab ? r.activeGiftSlab.giftName : r.hasGiftScheme ? "Active" : "None"}"`;

      csvContent += `${type},${code},${name},${mr},${month},${st},${sa},${sp}%,${ss},${ct},${ca},${cp}%,${cs},${gift}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Target_vs_Actual_Report_${periodMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid space-y-4 sm:space-y-6 p-3 sm:p-6 ">
      {/* <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-x-hidden"> */}
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shadow-2xl border border-indigo-500/20">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <Link
                href="/dashboard/reports"
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 backdrop-blur-md flex items-center gap-1.5 transition-all shrink-0"
              >
                <FaArrowLeft size={10} /> Reports Hub
              </Link>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shrink-0">
                <FaBullseye className="shrink-0" /> Party vs MR Target Dashboard
              </span>
              {isMrRestricted && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                  <FaLock size={10} className="shrink-0" /> Territory Scope Restricted
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight break-words">
              Party Target vs MR Target & Sales vs Collection Report
            </h1>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-3xl leading-relaxed">
              Track and compare Sales & Collection Targets against live actual performance across Monthly, Weekly, and Day-Wise breakdowns for MR Executives and Customers.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              onClick={fetchReportData}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 backdrop-blur-md transition-all active:scale-95"
            >
              <FaRedo size={11} className={loading ? "animate-spin" : ""} /> Refresh
            </button>

            <button
              onClick={exportCSV}
              disabled={rows.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <FaDownload size={11} /> Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
            >
              <FaPrint size={11} /> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Territory Restriction Banner */}
      {isMrRestricted && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 p-3.5 sm:p-4 text-amber-900 shadow-sm backdrop-blur-md">
          <FaMapMarkerAlt className="text-amber-600 flex-shrink-0" size={18} />
          <div className="text-xs min-w-0 flex-1">
            <p className="font-bold">Territory Scope Filter Active</p>
            <p className="text-amber-800">You are currently viewing performance metrics strictly restricted to your assigned MR territory and customer assignments.</p>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Target Month Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Target Month
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-extrabold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>
          </div>

          {/* Target Entity View Switcher */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Target Entity View
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 text-xs font-extrabold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              >
                <option value="all">All Targets (MR + Party)</option>
                <option value="Customer">Party / Customer Target View</option>
                <option value="MR">MR Executive Target View</option>
              </select>
            </div>
          </div>

          {/* Frequency Breakdown Switcher */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Time Breakdown Granularity
            </label>
            <div className="relative">
              <FaRegCalendarCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 text-xs font-extrabold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              >
                <option value="monthly">Monthly Summary View</option>
                <option value="weekly">Weekly Breakdown View</option>
                <option value="daily">Day-Wise (Daily) Breakdown View</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Filter
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MR, Customer name or code..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Quick View Filter Chips */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">View Granularity:</span>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                onClick={() => setFrequency("monthly")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${frequency === "monthly" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setFrequency("weekly")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${frequency === "weekly" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setFrequency("daily")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${frequency === "daily" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Day-Wise
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={expandAll}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Expand All Rows
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Sales Target Card */}
          <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider truncate">Total Sales Target</p>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">₹{formatINR(summary.totalSalesTarget)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <FaBullseye size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
              <span className="text-slate-500 font-medium truncate">Actual Sales</span>
              <span className="font-extrabold text-emerald-600 truncate">₹{formatINR(summary.totalActualSales)}</span>
            </div>
          </div>

          {/* Sales Achievement % Card */}
          <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider truncate">Sales Achievement</p>
                <h3 className="text-lg sm:text-xl font-black text-emerald-600 mt-1 truncate">{summary.overallSalesAchPercent}%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <FaChartLine size={18} />
              </div>
            </div>
            <div className="mt-3 space-y-1 pt-2 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.overallSalesAchPercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold text-right truncate">Shortfall: ₹{formatINR(summary.totalSalesShortfall)}</p>
            </div>
          </div>

          {/* Collection Target Card */}
          <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider truncate">Total Collection Target</p>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">₹{formatINR(summary.totalCollectionTarget)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <FaWallet size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
              <span className="text-slate-500 font-medium truncate">Actual Collections</span>
              <span className="font-extrabold text-indigo-600 truncate">₹{formatINR(summary.totalActualCollection)}</span>
            </div>
          </div>

          {/* Collection Achievement % Card */}
          <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider truncate">Collection Achievement</p>
                <h3 className="text-lg sm:text-xl font-black text-indigo-600 mt-1 truncate">{summary.overallCollectionAchPercent}%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <FaLayerGroup size={18} />
              </div>
            </div>
            <div className="mt-3 space-y-1 pt-2 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.overallCollectionAchPercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold text-right truncate">Shortfall: ₹{formatINR(summary.totalCollectionShortfall)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics Graphs Section */}
      {summary && rows.length > 0 && mounted && (
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <FaChartLine size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Visual Analytics: Sales vs Collection Performance
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {frequency === "weekly"
                    ? "5-Week Aggregate Sales & Collection Target vs Actual Trends"
                    : frequency === "daily"
                      ? "Day-Wise Sales & Collection Target vs Actual Trends"
                      : "Top Parties & MR Executives Sales vs Collection Comparison"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
            >
              {showCharts ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              {showCharts ? "Hide Analytics Graphs" : "Show Analytics Graphs"}
            </button>
          </div>

          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Main Bar Chart: Sales vs Collection Target & Actual */}
              <div className="lg:col-span-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Sales Target & Actual vs Collection Target & Actual
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {frequency === "weekly" ? "Weekly View" : frequency === "daily" ? "Daily View" : "Top Entities"}
                  </span>
                </div>

                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.mainData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                                <p className="font-extrabold text-indigo-300 border-b border-slate-700 pb-1">{label}</p>
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: entry.color }}>
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      {entry.name}:
                                    </span>
                                    <span className="font-extrabold">₹{entry.value?.toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "8px" }} />
                      <Bar dataKey="salesTarget" name="Sales Target" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="actualSales" name="Actual Sales" fill="#059669" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="collectionTarget" name="Collection Target" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="actualCollection" name="Actual Collection" fill="#4338ca" radius={[4, 4, 0, 0]} barSize={12} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Charts Side Column: Target Status & Entity Share */}
              <div className="space-y-4 flex flex-col justify-between">
                {/* Sales & Collection Achievement Status Pie */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FaChartPie className="text-indigo-600" size={12} />
                      Sales Target Status
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{rows.length} Total Targets</span>
                  </h4>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.salesPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.salesPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0];
                              return (
                                <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                  {d.name}: {d.value} ({((Number(d.value) / rows.length) * 100).toFixed(0)}%)
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {chartData.salesPie.map((p, i) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}: {p.value}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Entity Share Pie: MR vs Party Targets */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FaLayerGroup className="text-emerald-600" size={12} />
                      Target Entity Share
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">MR vs Party</span>
                  </h4>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.entityPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.entityPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0];
                              return (
                                <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                  {d.name}: ₹{Number(d.value).toLocaleString("en-IN")}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {chartData.entityPie.map((p, i) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}: ₹{(p.value / 100000).toFixed(1)}L
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Comparative Report Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-600">Loading performance calculations & live aggregations...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">
            <FaExclamationTriangle className="mx-auto mb-2 text-rose-500" size={24} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FaBullseye className="mx-auto mb-2 text-slate-300" size={32} />
            <p className="text-xs font-bold text-slate-700">No Target vs Actual records match your selected filters.</p>
            <p className="text-[11px] text-slate-400 mt-1">Try selecting a different target month or clear your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="min-w-[1360px]">
              <div className="bg-slate-900 text-white font-extrabold flex items-center p-3.5 text-xs border-b border-slate-800">
                <div className="w-10 text-center shrink-0"></div>
                <div className="w-64 text-left pr-4 shrink-0">Entity / Target Name</div>
                <div className="w-24 text-left shrink-0">Type</div>
                <div className="w-32 text-right shrink-0">Sales Target</div>
                <div className="w-36 text-right shrink-0 text-emerald-300">Actual Sales</div>
                <div className="w-28 text-center shrink-0 text-emerald-300">Sales Ach %</div>
                <div className="w-36 text-right shrink-0">Collection Target</div>
                <div className="w-36 text-right shrink-0 text-indigo-300">Actual Collection</div>
                <div className="w-28 text-center shrink-0 text-indigo-300">Coll Ach %</div>
                <div className="w-36 text-center shrink-0">Reward Scheme</div>
                <div className="w-36 text-center shrink-0 pl-2">WhatsApp Chat</div>
              </div>

              <div className="divide-y divide-slate-200/80 font-medium bg-white">
                {rows.map((row) => {
                  const isExpanded = expandedRows.has(row._id);

                  return (
                    <div key={row._id} className="hover:bg-slate-50/80 transition-colors group border-b border-slate-100">
                      {/* Parent Master Row */}
                      <div className="flex items-center min-w-[1360px] p-3.5 text-xs">
                        {/* Accordion Toggle */}
                        <button
                          onClick={() => toggleRow(row._id)}
                          className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-50 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 flex items-center justify-center mr-3 transition-colors flex-shrink-0"
                          title="Toggle Weekly / Day-Wise Breakdown"
                        >
                          {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </button>

                        {/* Entity Info */}
                        <div className="w-64 pr-4 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${row.targetType === "MR" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {row.targetType === "MR" ? <FaUser size={12} /> : <FaStore size={12} />}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 truncate">
                                {row.targetType === "MR" ? row.mrName : row.customerName}
                              </h4>
                              {row.customerCode !== "N/A" && (
                                <p className="text-[10px] text-slate-400 font-semibold">Code: {row.customerCode}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Type Badge */}
                        <div className="w-24 text-left flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${row.targetType === "MR" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            {row.targetType === "MR" ? "MR Target" : "Party Target"}
                          </span>
                        </div>

                        {/* Sales Target */}
                        <div className="w-32 text-right font-extrabold text-slate-800 flex-shrink-0">
                          ₹{formatINR(row.salesTarget)}
                        </div>

                        {/* Actual Sales */}
                        <div className="w-36 text-right font-extrabold text-emerald-700 flex-shrink-0">
                          ₹{formatINR(row.monthlyActualSales)}
                        </div>

                        {/* Sales Ach % */}
                        <div className="w-28 text-center flex-shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[11px] ${row.salesAchPercent >= 100
                            ? "bg-emerald-100 text-emerald-800"
                            : row.salesAchPercent >= 80
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-rose-100 text-rose-800"
                            }`}>
                            {row.salesAchPercent}%
                          </span>
                        </div>

                        {/* Collection Target */}
                        <div className="w-36 text-right font-extrabold text-slate-800 flex-shrink-0">
                          ₹{formatINR(row.collectionTarget)}
                        </div>

                        {/* Actual Collection */}
                        <div className="w-36 text-right font-extrabold text-indigo-700 flex-shrink-0">
                          ₹{formatINR(row.monthlyActualCollection)}
                        </div>

                        {/* Collection Ach % */}
                        <div className="w-28 text-center flex-shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[11px] ${row.collectionAchPercent >= 100
                            ? "bg-indigo-100 text-indigo-800"
                            : row.collectionAchPercent >= 80
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                            }`}>
                            {row.collectionAchPercent}%
                          </span>
                        </div>

                        {/* Gift / Scheme Status */}
                        <div className="w-36 text-center flex-shrink-0">
                          {row.hasGiftScheme ? (
                            row.activeGiftSlab ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                <FaGift className="text-amber-600" size={10} /> {row.activeGiftSlab.giftName}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Scheme Active
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal">-</span>
                          )}
                        </div>

                        {/* Direct WhatsApp Action Button */}
                        <div className="w-36 text-center flex-shrink-0 pl-2">
                          {(() => {
                            const cleanPhone = formatWhatsAppPhone(row.phoneNumber);
                            return cleanPhone ? (
                              <a
                                href={getDirectWhatsAppUrl(row)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] shadow hover:scale-105 transition-all"
                                title={`Direct WhatsApp chat with +${cleanPhone}`}
                              >
                                <FaWhatsapp size={13} /> +{cleanPhone}
                              </a>
                            ) : (
                              <a
                                href={getDirectWhatsAppUrl(row)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] shadow hover:scale-105 transition-all"
                                title="Number not saved. Opens WhatsApp with message pre-typed so you can select contact manually."
                              >
                                <FaWhatsapp size={13} /> Share Msg
                              </a>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Accordion Child Detail Table */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/90 border-b border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <FaLayerGroup className="text-indigo-600" />
                              {frequency === "weekly"
                                ? `Weekly Breakdown (${row.periodMonth})`
                                : frequency === "daily"
                                  ? `Day-Wise Breakdown (${row.periodMonth})`
                                  : `Monthly Details & Weekly Preview (${row.periodMonth})`}
                            </h5>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Assigned MR: {row.mrName}
                            </span>
                          </div>

                          {/* Weekly Table Breakdown */}
                          {(frequency === "weekly" || frequency === "monthly") && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <th className="p-2.5">Week Period</th>
                                    <th className="p-2.5 text-right">Weekly Sales Target</th>
                                    <th className="p-2.5 text-right text-emerald-700">Actual Sales</th>
                                    <th className="p-2.5 text-center">Sales Ach %</th>
                                    <th className="p-2.5 text-right">Weekly Collection Target</th>
                                    <th className="p-2.5 text-right text-indigo-700">Actual Collection</th>
                                    <th className="p-2.5 text-center">Coll Ach %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.weeklyBreakdown.map((w) => (
                                    <tr key={w.weekNo} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-900">
                                        {w.label} <span className="text-[10px] text-slate-400 font-normal">({w.startDate} to {w.endDate})</span>
                                      </td>
                                      <td className="p-2.5 text-right font-semibold">₹{formatINR(w.weeklySalesTarget)}</td>
                                      <td className="p-2.5 text-right font-extrabold text-emerald-700">₹{formatINR(w.weekActualSales)}</td>
                                      <td className="p-2.5 text-center font-bold">
                                        <span className={`px-2 py-0.5 rounded ${w.salesAchPercent >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                                          {w.salesAchPercent}%
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right font-semibold">₹{formatINR(w.weeklyCollectionTarget)}</td>
                                      <td className="p-2.5 text-right font-extrabold text-indigo-700">₹{formatINR(w.weekActualCollection)}</td>
                                      <td className="p-2.5 text-center font-bold">
                                        <span className={`px-2 py-0.5 rounded ${w.collectionAchPercent >= 100 ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>
                                          {w.collectionAchPercent}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Daily Table Breakdown */}
                          {frequency === "daily" && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-72">
                              <table className="w-full text-left text-[11px]">
                                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5">Date</th>
                                    <th className="p-2.5 text-right">Daily Sales Target</th>
                                    <th className="p-2.5 text-right text-emerald-700">Actual Daily Sales</th>
                                    <th className="p-2.5 text-center">Sales Ach %</th>
                                    <th className="p-2.5 text-right">Daily Collection Target</th>
                                    <th className="p-2.5 text-right text-indigo-700">Actual Daily Collection</th>
                                    <th className="p-2.5 text-center">Coll Ach %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.dailyBreakdown.map((d) => (
                                    <tr key={d.day} className={d.dayActualSales > 0 || d.dayActualCollection > 0 ? "bg-amber-50/30" : ""}>
                                      <td className="p-2.5 font-bold text-slate-800">{d.date}</td>
                                      <td className="p-2.5 text-right font-semibold text-slate-600">₹{formatINR(d.dailySalesTarget)}</td>
                                      <td className="p-2.5 text-right font-extrabold text-emerald-700">₹{formatINR(d.dayActualSales)}</td>
                                      <td className="p-2.5 text-center font-bold">{d.salesAchPercent}%</td>
                                      <td className="p-2.5 text-right font-semibold text-slate-600">₹{formatINR(d.dailyCollectionTarget)}</td>
                                      <td className="p-2.5 text-right font-extrabold text-indigo-700">₹{formatINR(d.dayActualCollection)}</td>
                                      <td className="p-2.5 text-center font-bold">{d.collectionAchPercent}%</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
