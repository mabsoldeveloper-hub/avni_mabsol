"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { useUser } from "@/context/UserContext";
import {
  FaExclamationTriangle,
  FaSkull,
  FaBolt,
  FaHourglassHalf,
  FaCog,
  FaPaperPlane,
  FaSyncAlt,
  FaSearch,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaBoxes,
  FaClock,
  FaUserCheck,
} from "react-icons/fa";

export default function InventoryIntelligencePage() {
  const params = useParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { user } = useUser();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interactive threshold filters
  const [expiryDaysInput, setExpiryDaysInput] = useState<number>(90);
  const [deadStockDaysInput, setDeadStockDaysInput] = useState<number>(180);
  const [analysisDaysInput, setAnalysisDaysInput] = useState<number>(30);

  // Tabbed preview selection
  const [activeTab, setActiveTab] = useState<
    "nearExpiry" | "deadStock" | "fastMoving" | "slowMoving"
  >("nearExpiry");
  const [tabSearch, setTabSearch] = useState("");

  // Quick Dispatch Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [dispatchRecipients, setDispatchRecipients] = useState(user?.email || "");
  const [includeNearExpiry, setIncludeNearExpiry] = useState(true);
  const [includeDeadStock, setIncludeDeadStock] = useState(true);
  const [includeFastMoving, setIncludeFastMoving] = useState(true);
  const [includeSlowMoving, setIncludeSlowMoving] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user?.email && !dispatchRecipients) {
      setDispatchRecipients(user.email);
    }
  }, [user?.email, dispatchRecipients]);

  const loadDashboard = async (
    customExpiryDays?: number,
    customDeadDays?: number,
    customAnalysisDays?: number,
  ) => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (selectedCompany?._id) sp.set("companyId", selectedCompany._id);

      const daysVal = customExpiryDays ?? expiryDaysInput;
      const deadVal = customDeadDays ?? deadStockDaysInput;
      const analysisVal = customAnalysisDays ?? analysisDaysInput;

      if (daysVal) sp.set("days", String(daysVal));
      if (deadVal) sp.set("noMovementDays", String(deadVal));
      if (analysisVal) sp.set("analysisDays", String(analysisVal));

      const res = await fetch(
        `/api/inventory-intelligence/dashboard?${sp.toString()}`,
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error || "Failed to load inventory intelligence data",
        );
      }
      setData(json);

      if (json.settings?.recipients?.length && !dispatchRecipients) {
        setDispatchRecipients(json.settings.recipients.join(", "));
      }
      if (
        json.settings?.nearExpiry?.windowDays &&
        customExpiryDays === undefined
      ) {
        setExpiryDaysInput(json.settings.nearExpiry.windowDays);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedCompany?._id]);

  const handleApplyRules = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadDashboard(expiryDaysInput, deadStockDaysInput, analysisDaysInput);
  };

  const handleQuickPillSelect = (days: number) => {
    setExpiryDaysInput(days);
    loadDashboard(days, deadStockDaysInput, analysisDaysInput);
  };

  const handleSendManualAlert = async () => {
    const rawEmails = dispatchRecipients
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes("@"));

    const loginEmail = String(user?.email || "").trim().toLowerCase();
    const finalEmails =
      rawEmails.length > 0
        ? rawEmails
        : loginEmail
        ? [loginEmail]
        : [];

    if (finalEmails.length === 0) {
      setDispatchFeedback({
        type: "error",
        message: "Please provide at least one valid recipient email address.",
      });
      return;
    }

    setDispatching(true);
    setDispatchFeedback(null);

    try {
      const res = await fetch("/api/inventory-intelligence/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany?._id,
          recipients: finalEmails,
          includeNearExpiry,
          includeDeadStock,
          includeFastMoving,
          includeSlowMoving,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || json.error || "Failed to send email alert",
        );
      }

      setDispatchFeedback({
        type: "success",
        message: `✅ Inventory alert email successfully delivered to ${rawEmails.join(", ")}!`,
      });
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setDispatchFeedback(null);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setDispatchFeedback({
        type: "error",
        message: err.message || "Email dispatch failed",
      });
    } finally {
      setDispatching(false);
    }
  };

  const summary = data?.summary || {
    nearExpiry: 0,
    nearExpiryValue: 0,
    nearExpiryStock: 0,
    criticalNearExpiry: 0,
    deadStock: 0,
    deadStockValue: 0,
    deadStockUnits: 0,
    fastMoving: 0,
    slowMoving: 0,
  };

  const settings = data?.settings;
  const preview = data?.preview || {};

  // Filter preview items by search box
  const activePreviewItems = useMemo(() => {
    const rawList: any[] = preview[activeTab] || [];
    if (!tabSearch.trim()) return rawList;
    const q = tabSearch.toLowerCase();
    return rawList.filter(
      (item) =>
        String(item.product || "")
          .toLowerCase()
          .includes(q) ||
        String(item.batchNo || "")
          .toLowerCase()
          .includes(q) ||
        String(item.code || "")
          .toLowerCase()
          .includes(q),
    );
  }, [preview, activeTab, tabSearch]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1550px] mx-auto min-h-screen">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <FaBolt className="text-amber-400" />
              <span>Inventory Intelligence & Risk Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Stock Risk, Expiry & Movement Radar
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track near-expiry batches, identify stagnant dead stock, and
              monitor sales velocity with automatic scheduled email dispatches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadDashboard()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Scanning..." : "Refresh Scan"}</span>
            </button>

            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 transition transform active:scale-95"
            >
              <FaPaperPlane />
              <span>Send Alert Now</span>
            </button>

            <Link
              href={`/dashboard/${role}/inventory-intelligence/settings`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-lg transition"
            >
              <FaCog className="text-indigo-600" />
              <span>Alert Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Interactive Threshold Rules Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Interactive Threshold Control (Expiry & Movement Rules)
            </h3>
          </div>

          {/* Quick Expiry Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold mr-1">
              Quick Expiry Window:
            </span>
            {[30, 60, 90, 180, 365, 1000].map((days) => (
              <button
                key={days}
                onClick={() => handleQuickPillSelect(days)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  expiryDaysInput === days
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {days === 1000 ? "All / 1000D" : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleApplyRules}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1"
        >
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Near Expiry Window (Days):
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              value={expiryDaysInput}
              onChange={(e) =>
                setExpiryDaysInput(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>

          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Dead Stock Threshold (Days Idle):
            </label>
            <input
              type="number"
              min="1"
              value={deadStockDaysInput}
              onChange={(e) =>
                setDeadStockDaysInput(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>

          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Sales Velocity Window (Days):
            </label>
            <input
              type="number"
              min="1"
              value={analysisDaysInput}
              onChange={(e) =>
                setAnalysisDaysInput(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? "Calculating..." : "Apply & Recalculate"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadDashboard()}
            className="underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. 4 Key Executive Risk Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Near Expiry Card */}
        <Link
          href={`/dashboard/${role}/inventory-intelligence/near-expiry?days=${expiryDaysInput}`}
          className="group relative isolate overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/20 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              Near Expiry Batches
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm shadow-xs">
              <FaExclamationTriangle />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {summary.nearExpiry}
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                batches
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Units: <b>{summary.nearExpiryStock.toLocaleString("en-IN")}</b>
              </span>
              <span>
                Value:{" "}
                <b className="text-slate-800 dark:text-white">
                  ₹{summary.nearExpiryValue.toLocaleString("en-IN")}
                </b>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>View Expiry List ({expiryDaysInput}D)</span>
            <FaExternalLinkAlt size={10} />
          </div>
        </Link>

        {/* Dead / Dump Stock Card */}
        <Link
          href={`/dashboard/${role}/inventory-intelligence/dead-stock?days=${deadStockDaysInput}`}
          className="group relative isolate overflow-hidden rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-white to-rose-50/40 dark:from-slate-900 dark:to-rose-950/20 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Dead / Dump Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm shadow-xs">
              <FaSkull />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {summary.deadStock}
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                dormant items
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Units: <b>{summary.deadStockUnits.toLocaleString("en-IN")}</b>
              </span>
              <span>
                Capital Tied:{" "}
                <b className="text-slate-800 dark:text-white">
                  ₹{summary.deadStockValue.toLocaleString("en-IN")}
                </b>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Open Dead Stock Report</span>
            <FaExternalLinkAlt size={10} />
          </div>
        </Link>

        {/* Fast Moving Card */}
        <Link
          href={`/dashboard/${role}/inventory-intelligence/movement?type=FAST`}
          className="group relative isolate overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Fast Moving Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-xs">
              <FaBolt />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.fastMoving}
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                high velocity
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Cover: ≤ {settings?.movement?.fastStockCoverDays ?? 15} days
              </span>
              <span className="text-emerald-700 font-bold">Fast Turnover</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Analyze Fast Movers</span>
            <FaExternalLinkAlt size={10} />
          </div>
        </Link>

        {/* Slow Moving Card */}
        <Link
          href={`/dashboard/${role}/inventory-intelligence/movement?type=SLOW`}
          className="group relative isolate overflow-hidden rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">
              Slow Moving Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm shadow-xs">
              <FaHourglassHalf />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {summary.slowMoving}
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                sluggish
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Cover: ≥ {settings?.movement?.slowStockCoverDays ?? 60} days
              </span>
              <span className="text-indigo-700 font-bold">Overstocked</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
            <span>Analyze Slow Movers</span>
            <FaExternalLinkAlt size={10} />
          </div>
        </Link>
      </div>

      {/* 4. Tabbed Real-time Preview Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                id: "nearExpiry",
                label: `Near Expiry (${summary.nearExpiry})`,
                color: "amber",
              },
              {
                id: "deadStock",
                label: `Dead / Dump Stock (${summary.deadStock})`,
                color: "rose",
              },
              {
                id: "fastMoving",
                label: `Fast Moving (${summary.fastMoving})`,
                color: "emerald",
              },
              {
                id: "slowMoving",
                label: `Slow Moving (${summary.slowMoving})`,
                color: "indigo",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setTabSearch("");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm dark:bg-indigo-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search products..."
                value={tabSearch}
                onChange={(e) => setTabSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <Link
              href={
                activeTab === "nearExpiry"
                  ? `/dashboard/${role}/inventory-intelligence/near-expiry?days=${expiryDaysInput}`
                  : activeTab === "deadStock"
                    ? `/dashboard/${role}/inventory-intelligence/dead-stock?days=${deadStockDaysInput}`
                    : `/dashboard/${role}/inventory-intelligence/movement?type=${activeTab === "fastMoving" ? "FAST" : "SLOW"}`
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition shrink-0"
            >
              <span>View Full Report</span>
              <FaExternalLinkAlt size={9} />
            </Link>
          </div>
        </div>

        {/* Tab Content Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
              <FaSyncAlt className="animate-spin text-indigo-600" />
              <span>Scanning inventory intelligence data...</span>
            </div>
          ) : activePreviewItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <FaBoxes className="mx-auto text-slate-300 text-3xl mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No items currently found in this category.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                You can adjust thresholds in the filter bar above or check Alert
                Settings.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="p-3.5 font-bold">#</th>
                  <th className="p-3.5 font-bold">Product Name</th>
                  {activeTab === "nearExpiry" && (
                    <>
                      <th className="p-3.5 font-bold text-center">Batch No</th>
                      <th className="p-3.5 font-bold text-center">
                        Expiry Date
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Days Remaining
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Stock Units
                      </th>
                      <th className="p-3.5 font-bold text-center">MRP (₹)</th>
                      <th className="p-3.5 font-bold text-center">
                        Total Value (₹)
                      </th>
                    </>
                  )}
                  {activeTab === "deadStock" && (
                    <>
                      <th className="p-3.5 font-bold text-center">
                        Product Code
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Current Stock
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Last Sale Date
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Dormant Period
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Stock Value (₹)
                      </th>
                    </>
                  )}
                  {(activeTab === "fastMoving" ||
                    activeTab === "slowMoving") && (
                    <>
                      <th className="p-3.5 font-bold text-center">
                        Current Stock
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Period Sales
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Avg Daily Sales
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Stock Cover (Days)
                      </th>
                      <th className="p-3.5 font-bold text-center">
                        Classification
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activePreviewItems.map((item: any, idx: number) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3.5 font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white">
                        {item.product}
                      </div>
                      {item.code && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Code: {item.code}
                        </div>
                      )}
                    </td>

                    {/* Near Expiry Columns */}
                    {activeTab === "nearExpiry" && (
                      <>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.batchNo}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.expiry || "N/A"}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.isExpired
                                ? "bg-rose-100 text-rose-800"
                                : item.daysToExpiry <= 30
                                  ? "bg-rose-100 text-rose-800 animate-pulse"
                                  : item.daysToExpiry <= 90
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {item.isExpired
                              ? "EXPIRED"
                              : `${item.daysToExpiry} Days`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800 dark:text-white">
                          {item.stock.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 dark:text-slate-400">
                          ₹{Number(item.mrp || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                          ₹
                          {Number(item.totalValue || 0).toLocaleString("en-IN")}
                        </td>
                      </>
                    )}

                    {/* Dead Stock Columns */}
                    {activeTab === "deadStock" && (
                      <>
                        <td className="p-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                          {item.code}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800 dark:text-white">
                          {item.stock.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 dark:text-slate-300">
                          {item.lastSale || "Never Sold"}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            {item.noMovementDays === Infinity
                              ? "Never"
                              : `${item.noMovementDays} Days`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                          ₹
                          {Number(item.totalValue || 0).toLocaleString("en-IN")}
                        </td>
                      </>
                    )}

                    {/* Movement Columns */}
                    {(activeTab === "fastMoving" ||
                      activeTab === "slowMoving") && (
                      <>
                        <td className="p-3.5 text-center font-bold text-slate-800 dark:text-white">
                          {item.stock.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.salesQty.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 dark:text-slate-400">
                          {item.avgDailySales} /day
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.stockCoverDays !== null
                            ? `${item.stockCoverDays} Days`
                            : "∞"}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.movement === "FAST"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.movement}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. Bottom Info Cards: Rules & Email Scheduling Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Active Intelligence Rules
            </h2>
            <Link
              href={`/dashboard/${role}/inventory-intelligence/settings`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Edit Settings</span>
              <FaExternalLinkAlt size={9} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">
                Near Expiry Window
              </span>
              <b className="text-base text-amber-600 font-extrabold">
                {expiryDaysInput} Days
              </b>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Min Stock: {settings?.nearExpiry?.minStock ?? 1}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">
                Dead Stock Inactivity
              </span>
              <b className="text-base text-rose-600 font-extrabold">
                {deadStockDaysInput} Days
              </b>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Min Stock: {settings?.deadStock?.minStock ?? 1}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">
                Sales Analysis Window
              </span>
              <b className="text-base text-slate-800 dark:text-white font-extrabold">
                {analysisDaysInput} Days
              </b>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Min Qty: {settings?.movement?.minSalesQty ?? 1}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">
                Fast / Slow Cover Days
              </span>
              <b className="text-base text-emerald-600 font-extrabold">
                {settings?.movement?.fastStockCoverDays ?? 15} /{" "}
                {settings?.movement?.slowStockCoverDays ?? 60} Days
              </b>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Stock Cover Velocity
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Automated Email Alert Daemon
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                settings?.email?.enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  settings?.email?.enabled
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <span>
                {settings?.email?.enabled ? "SCHEDULED (ON)" : "PAUSED (OFF)"}
              </span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Dispatch Frequency:</span>
              <b className="text-slate-800 dark:text-white capitalize">
                {settings?.email?.frequency || "Daily"} at{" "}
                {String(settings?.email?.sendHour ?? 9).padStart(2, "0")}:
                {String(settings?.email?.sendMinute ?? 0).padStart(2, "0")} IST
              </b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Configured Recipients:</span>
              <b className="text-slate-800 dark:text-white">
                {settings?.recipients?.length || 0} Emails
              </b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Alert Sections:</span>
              <span className="text-indigo-600 font-bold">
                {[
                  settings?.email?.includeNearExpiry ? "Near Expiry" : null,
                  settings?.email?.includeDeadStock ? "Dead Stock" : null,
                  settings?.email?.includeFastMoving ? "Fast Movers" : null,
                  settings?.email?.includeSlowMoving ? "Slow Movers" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsAlertModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <FaPaperPlane />
            <span>Send Instant Alert Notice Now</span>
          </button>
        </section>
      </div>

      {/* 6. Instant Alert Dispatch Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">
                  <FaPaperPlane />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Send Inventory Alert Email
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Manual dispatch for all or selected risk categories.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {dispatchFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  dispatchFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {dispatchFeedback.message}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Recipient Email Addresses (comma separated):
                  </label>
                  {user?.email && (
                    <button
                      type="button"
                      onClick={() => setDispatchRecipients(user.email)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <FaUserCheck size={10} />
                      <span>Use My Email ({user.email})</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={user?.email || "admin@example.com, manager@example.com"}
                  value={dispatchRecipients}
                  onChange={(e) => setDispatchRecipients(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  Default: Login Admin email ({user?.email || "from session"}). Multiple emails comma se separate karein.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Risk Sections to Include in Alert:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={includeNearExpiry}
                      onChange={(e) => setIncludeNearExpiry(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-white">
                      🔴 Near Expiry
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={includeDeadStock}
                      onChange={(e) => setIncludeDeadStock(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-white">
                      ⚠️ Dead / Dump Stock
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={includeFastMoving}
                      onChange={(e) => setIncludeFastMoving(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-white">
                      🟢 Fast Moving
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={includeSlowMoving}
                      onChange={(e) => setIncludeSlowMoving(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-white">
                      🟡 Slow Moving
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendManualAlert}
                disabled={dispatching}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <FaPaperPlane className={dispatching ? "animate-spin" : ""} />
                <span>
                  {dispatching ? "Delivering..." : "Send Email Alert Now"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
