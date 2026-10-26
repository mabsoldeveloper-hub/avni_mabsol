"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { useUser } from "@/context/UserContext";
import InventoryHierarchyFilter, {
  HierarchyFilterValues,
} from "@/components/inventory/InventoryHierarchyFilter";
import {
  FaExclamationTriangle,
  FaSearch,
  FaPaperPlane,
  FaDownload,
  FaSyncAlt,
  FaArrowLeft,
  FaCog,
  FaCalendarAlt,
  FaBoxes,
  FaUserCheck,
} from "react-icons/fa";

export default function NearExpiryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { user } = useUser();

  // Initial days from URL or default to 90
  const initialDays = searchParams?.get("days")
    ? Number(searchParams.get("days"))
    : 90;

  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalBatches: 0,
    totalStock: 0,
    totalValue: 0,
    criticalCount: 0,
    expiredCount: 0,
    windowDays: initialDays,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [daysInput, setDaysInput] = useState<number>(initialDays);
  const [minStockInput, setMinStockInput] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "CRITICAL" | "WARNING" | "ATTENTION" | "EXPIRED"
  >("ALL");

  // 5-Tier Product Hierarchy Filters
  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilterValues>({
    companyCode: "",
    divisionCode: "",
    subDivisionCode: "",
    categoryCode: "",
    productCode: "",
  });

  // Email Alert Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [alertRecipients, setAlertRecipients] = useState(user?.email || "");
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user?.email && !alertRecipients) {
      setAlertRecipients(user.email);
    }
  }, [user?.email, alertRecipients]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const loadData = useCallback(
    async (
      customDays?: number,
      customMinStock?: number,
      customHierarchy?: HierarchyFilterValues
    ) => {
      setLoading(true);
      setError("");
      try {
        const sp = new URLSearchParams();
        if (selectedCompany?._id) sp.set("companyId", selectedCompany._id);

        const d = customDays ?? daysInput;
        const ms = customMinStock ?? minStockInput;
        const h = customHierarchy ?? hierarchyFilters;

        if (d) sp.set("days", String(d));
        if (ms) sp.set("minStock", String(ms));

        if (h.companyCode) sp.set("companyCode", h.companyCode);
        if (h.divisionCode) sp.set("divisionCode", h.divisionCode);
        if (h.subDivisionCode) sp.set("subDivisionCode", h.subDivisionCode);
        if (h.categoryCode) sp.set("categoryCode", h.categoryCode);
        if (h.productCode) sp.set("productCode", h.productCode);

        const res = await fetch(
          `/api/inventory-intelligence/near-expiry?${sp.toString()}`,
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load near expiry batches");
        }

        setItems(json.items || []);
        if (json.summary) {
          setSummary(json.summary);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load near expiry inventory");
      } finally {
        setLoading(false);
      }
    },
    [selectedCompany?._id, daysInput, minStockInput, hierarchyFilters],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHierarchyChange = (values: HierarchyFilterValues) => {
    setHierarchyFilters(values);
    setCurrentPage(1);
    loadData(daysInput, minStockInput, values);
  };

  const handleHierarchyReset = () => {
    const emptyValues: HierarchyFilterValues = {
      companyCode: "",
      divisionCode: "",
      subDivisionCode: "",
      categoryCode: "",
      productCode: "",
    };
    setHierarchyFilters(emptyValues);
    setCurrentPage(1);
    loadData(daysInput, minStockInput, emptyValues);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    loadData(daysInput, minStockInput);
  };

  const handleQuickPill = (days: number) => {
    setDaysInput(days);
    setCurrentPage(1);
    loadData(days, minStockInput);
  };

  // Filter items by status pill
  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => {
      if (statusFilter === "EXPIRED") return item.isExpired;
      if (statusFilter === "CRITICAL")
        return item.daysToExpiry <= 30 && !item.isExpired;
      if (statusFilter === "WARNING")
        return item.daysToExpiry > 30 && item.daysToExpiry <= 90;
      if (statusFilter === "ATTENTION")
        return item.daysToExpiry > 90 && item.daysToExpiry <= 180;
      return true;
    });
  }, [items, statusFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredItems.length) return;
    const headers = [
      "Company",
      "Division",
      "Sub-Division",
      "Category",
      "Product Name",
      "Product Code",
      "Batch No",
      "Expiry Date",
      "Days Remaining",
      "Stock Units",
      "MRP",
      "Total Value",
      "Status",
    ];
    const rows = filteredItems.map((item) => [
      `"${String(item.company || "").replace(/"/g, '""')}"`,
      `"${String(item.division || "").replace(/"/g, '""')}"`,
      `"${String(item.subDivision || "").replace(/"/g, '""')}"`,
      `"${String(item.category || "").replace(/"/g, '""')}"`,
      `"${String(item.product).replace(/"/g, '""')}"`,
      `"${item.code || ""}"`,
      `"${item.batchNo || ""}"`,
      `"${item.expiry || ""}"`,
      item.isExpired ? "EXPIRED" : item.daysToExpiry,
      item.stock,
      item.mrp,
      item.totalValue,
      item.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Near_Expiry_Report_${daysInput}Days_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Near Expiry Email Alert
  const handleSendAlert = async () => {
    const rawEmails = alertRecipients
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes("@"));

    const loginEmail = String(user?.email || "").trim().toLowerCase();
    const finalEmails =
      rawEmails.length > 0
        ? rawEmails
        : loginEmail
        ? [loginEmail]
        : undefined;

    setSendingAlert(true);
    setAlertFeedback(null);

    try {
      const res = await fetch("/api/inventory-intelligence/near-expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany?._id,
          days: daysInput,
          recipients: finalEmails,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || json.error || "Failed to send near expiry alert",
        );
      }

      setAlertFeedback({
        type: "success",
        message: json.message || "Near expiry alert email sent successfully",
      });
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setAlertFeedback(null);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setAlertFeedback({
        type: "error",
        message: err.message || "Failed to send email alert",
      });
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1550px] mx-auto min-h-screen">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${role}/inventory-intelligence`}
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-sm transition"
          >
            <FaArrowLeft size={13} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Near Expiry Inventory Batches
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Window: {daysInput} Days
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live batch tracking for stocks expiring within the specified date
              window and above minimum threshold.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition"
          >
            <FaPaperPlane />
            <span>Send Expiry Alert Email</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!filteredItems.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <FaDownload />
            <span>Export CSV</span>
          </button>

          <Link
            href={`/dashboard/${role}/inventory-intelligence/settings`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
          >
            <FaCog />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Batches
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.totalBatches}
          </div>
          <span className="text-[11px] text-slate-400">
            Expiring in ≤ {daysInput} days
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Stock Balance
          </span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.totalStock.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-400">Units available</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Expiry Value
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{summary.totalValue.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-400">
            Total MRP valuation
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Critical (≤ 30 Days)
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summary.criticalCount}
          </div>
          <span className="text-[11px] text-rose-500 font-semibold">
            Immediate clearance needed
          </span>
        </div>
      </div>

      {/* 5-Tier Product Hierarchy Search: Company → Division → Sub-Division → Category → Product */}
      <InventoryHierarchyFilter
        initialValues={hierarchyFilters}
        onChange={handleHierarchyChange}
        onReset={handleHierarchyReset}
        title="1. Product Filtration (Company → Division → Sub-Division → Category → Product)"
        subtitle="Select exact hierarchy to filter batches. Current items will immediately narrow down."
      />

      {/* Dynamic Expiry Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              2. Expiry Window & Threshold Parameters:
            </h3>
          </div>

          {/* Quick Pill Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { label: "Critical (≤ 30D)", days: 30 },
              { label: "60 Days", days: 60 },
              { label: "90 Days (Quarter)", days: 90 },
              { label: "180 Days (Half Yr)", days: 180 },
              { label: "365 Days (1 Yr)", days: 365 },
              { label: "All / 1000D", days: 1000 },
            ].map((pill) => (
              <button
                key={pill.days}
                onClick={() => handleQuickPill(pill.days)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  daysInput === pill.days
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleApplyFilter}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Expiry Within (Days Window):
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              value={daysInput}
              onChange={(e) =>
                setDaysInput(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Minimum Stock (Units):
            </label>
            <input
              type="number"
              min="1"
              value={minStockInput}
              onChange={(e) =>
                setMinStockInput(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Refreshing..." : "Apply Threshold Window"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Status Categorization Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL", label: `All Expiring (${items.length})` },
            {
              id: "CRITICAL",
              label: `Critical ≤ 30D (${summary.criticalCount})`,
              color: "rose",
            },
            { id: "WARNING", label: "Warning 31-90D", color: "amber" },
            { id: "ATTENTION", label: "Attention 91-180D", color: "indigo" },
            {
              id: "EXPIRED",
              label: `Already Expired (${summary.expiredCount || 0})`,
              color: "slate",
            },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                statusFilter === pill.id
                  ? "bg-slate-900 text-white shadow-xs dark:bg-indigo-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing <b>{paginatedItems.length}</b> of{" "}
          <b>{filteredItems.length}</b> batches
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData()} className="underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Near Expiry Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
              <FaSyncAlt className="animate-spin text-amber-500" />
              <span>Scanning product batches for near-expiry dates...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <FaBoxes className="mx-auto text-slate-300 text-4xl mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No batches found matching the selected expiry window (
                {daysInput} days).
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try expanding your days window (e.g. 180 or 365 days) or clear
                the search filter.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="p-3.5 font-bold w-12 text-center">#</th>
                  <th className="p-3.5 font-bold">Product Name</th>
                  <th className="p-3.5 font-bold text-center">Batch No</th>
                  <th className="p-3.5 font-bold text-center">Expiry Date</th>
                  <th className="p-3.5 font-bold text-center">Days Left</th>
                  <th className="p-3.5 font-bold text-center">Stock Units</th>
                  <th className="p-3.5 font-bold text-center">MRP (₹)</th>
                  <th className="p-3.5 font-bold text-center">
                    Total Value (₹)
                  </th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedItems.map((item: any, idx: number) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={`${item.id || item.code || ""}_${item.batchNo || ""}_${idx}`}
                      className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                          {item.code && (
                            <span className="font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Code: {item.code}
                            </span>
                          )}
                          {item.company && item.company !== "-" && (
                            <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 px-1.5 py-0.5 rounded">
                              {item.company}
                            </span>
                          )}
                          {item.division && item.division !== "-" && (
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded">
                              {item.division}
                            </span>
                          )}
                          {item.subDivision && item.subDivision !== "-" && (
                            <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded">
                              {item.subDivision}
                            </span>
                          )}
                          {item.category && item.category !== "-" && (
                            <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </td>
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
                              ? "bg-slate-100 text-slate-800"
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
                        ₹{Number(item.totalValue || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${
                            item.isExpired
                              ? "bg-slate-200 text-slate-800"
                              : item.status === "CRITICAL"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.status === "WARNING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page <b>{currentPage}</b> of <b>{totalPages}</b>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Alert Dispatch Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
                  <FaExclamationTriangle />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Send Near Expiry Email Notice
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dispatches the {filteredItems.length} near-expiry batches (
                    {daysInput} days) to recipients.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {alertFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  alertFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {alertFeedback.message}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Recipient Email Addresses (comma separated):
                  </label>
                  {user?.email && (
                    <button
                      type="button"
                      onClick={() => setAlertRecipients(user.email)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <FaUserCheck size={10} />
                      <span>Use My Email ({user.email})</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={user?.email || "admin@example.com, purchase@example.com"}
                  value={alertRecipients}
                  onChange={(e) => setAlertRecipients(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  Default: Login Admin email ({user?.email || "from session"}). Multiple emails comma se separate karein.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 text-amber-800 dark:text-amber-400">
                <div className="font-bold">Email Contents:</div>
                <div className="mt-1">
                  • <b>{filteredItems.length}</b> product batches expiring
                  within <b>{daysInput} days</b>.
                </div>
                <div>
                  • Total stock valuation:{" "}
                  <b>₹{summary.totalValue.toLocaleString("en-IN")}</b>.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAlert}
                disabled={sendingAlert}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <FaPaperPlane className={sendingAlert ? "animate-spin" : ""} />
                <span>
                  {sendingAlert ? "Delivering..." : "Send Expiry Alert Now"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
