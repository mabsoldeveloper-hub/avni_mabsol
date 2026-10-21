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
  FaBolt,
  FaSearch,
  FaPaperPlane,
  FaDownload,
  FaSyncAlt,
  FaArrowLeft,
  FaCog,
  FaCalendarAlt,
  FaBoxes,
  FaTachometerAlt,
  FaHourglassHalf,
  FaUserCheck,
} from "react-icons/fa";

export default function MovementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { user } = useUser();

  const initialType =
    (searchParams?.get("type") as "ALL" | "FAST" | "SLOW") || "ALL";

  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    fastCount: 0,
    slowCount: 0,
    normalCount: 0,
    totalProducts: 0,
    analysisDays: 30,
    fastCoverDays: 15,
    slowCoverDays: 60,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [movementFilter, setMovementFilter] = useState<
    "ALL" | "FAST" | "SLOW" | "NORMAL"
  >(initialType);
  const [analysisDays, setAnalysisDays] = useState<number>(30);
  const [fastCoverDays, setFastCoverDays] = useState<number>(15);
  const [slowCoverDays, setSlowCoverDays] = useState<number>(60);
  const [minSalesQty, setMinSalesQty] = useState<number>(1);

  // 5-Tier Product Hierarchy Filters
  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilterValues>({
    companyCode: "",
    divisionCode: "",
    subDivisionCode: "",
    categoryCode: "",
    productCode: "",
  });

  // Email Alert Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [alertType, setAlertType] = useState<"FAST" | "SLOW" | "ALL">("ALL");
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
    async (customHierarchy?: HierarchyFilterValues) => {
      setLoading(true);
      setError("");
      try {
        const sp = new URLSearchParams();
        if (selectedCompany?._id) sp.set("companyId", selectedCompany._id);

        sp.set("analysisDays", String(analysisDays));
        sp.set("fastCoverDays", String(fastCoverDays));
        sp.set("slowCoverDays", String(slowCoverDays));
        sp.set("minSalesQty", String(minSalesQty));
        if (movementFilter !== "ALL") sp.set("type", movementFilter);

        const h = customHierarchy ?? hierarchyFilters;
        if (h.companyCode) sp.set("companyCode", h.companyCode);
        if (h.divisionCode) sp.set("divisionCode", h.divisionCode);
        if (h.subDivisionCode) sp.set("subDivisionCode", h.subDivisionCode);
        if (h.categoryCode) sp.set("categoryCode", h.categoryCode);
        if (h.productCode) sp.set("productCode", h.productCode);

        const res = await fetch(
          `/api/inventory-intelligence/movement?${sp.toString()}`,
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load movement inventory");
        }

        setItems(json.items || []);
        if (json.summary) setSummary(json.summary);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load movement data");
      } finally {
        setLoading(false);
      }
    },
    [
      selectedCompany?._id,
      analysisDays,
      fastCoverDays,
      slowCoverDays,
      minSalesQty,
      movementFilter,
      hierarchyFilters,
    ],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHierarchyChange = (values: HierarchyFilterValues) => {
    setHierarchyFilters(values);
    setCurrentPage(1);
    loadData(values);
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
    loadData(emptyValues);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleQuickAnalysisDays = (days: number) => {
    setAnalysisDays(days);
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    if (movementFilter === "ALL") return items;
    return items.filter((x) => x.movement === movementFilter);
  }, [items, movementFilter]);

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
      "Current Stock",
      "Sales Qty",
      "Avg Daily Sales",
      "Stock Cover Days",
      "Classification",
    ];
    const rows = filteredItems.map((item) => [
      `"${String(item.company || "").replace(/"/g, '""')}"`,
      `"${String(item.division || "").replace(/"/g, '""')}"`,
      `"${String(item.subDivision || "").replace(/"/g, '""')}"`,
      `"${String(item.category || "").replace(/"/g, '""')}"`,
      `"${String(item.product).replace(/"/g, '""')}"`,
      `"${item.code || ""}"`,
      item.stock,
      item.salesQty,
      item.avgDailySales,
      item.stockCoverDays ?? "Infinity",
      item.movement,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Inventory_Movement_${movementFilter}_${analysisDays}Days_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dispatch Movement Email Alert
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
      const res = await fetch("/api/inventory-intelligence/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany?._id,
          type: alertType,
          analysisDays,
          fastCoverDays,
          slowCoverDays,
          recipients: finalEmails,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || json.error || "Failed to send movement alert",
        );
      }

      setAlertFeedback({
        type: "success",
        message: json.message || "Movement alert email sent successfully!",
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
      {/* Top Header */}
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
                Fast & Slow Moving Stock Velocity
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                Window: {analysisDays} Days
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Classifies product velocity by sales burn rate and stock cover
              days to identify stockout risks vs overstocked capital.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition"
          >
            <FaPaperPlane />
            <span>Send Movement Alert</span>
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

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setMovementFilter("FAST")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border cursor-pointer transition ${
            movementFilter === "FAST"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
              : "border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fast Moving (High Velocity)
            </span>
            <FaBolt className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.fastCount}
          </div>
          <span className="text-[11px] text-slate-400">
            Stock Cover ≤ {fastCoverDays} days (Reorder soon)
          </span>
        </div>

        <div
          onClick={() => setMovementFilter("SLOW")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border cursor-pointer transition ${
            movementFilter === "SLOW"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md"
              : "border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Slow Moving (Overstocked)
            </span>
            <FaHourglassHalf className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summary.slowCount}
          </div>
          <span className="text-[11px] text-slate-400">
            Stock Cover ≥ {slowCoverDays} days (Capital trapped)
          </span>
        </div>

        <div
          onClick={() => setMovementFilter("ALL")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border cursor-pointer transition ${
            movementFilter === "ALL"
              ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
              : "border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Evaluated Products
            </span>
            <FaBoxes className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {summary.totalProducts}
          </div>
          <span className="text-[11px] text-slate-400">
            Products with sales in {analysisDays} days
          </span>
        </div>
      </div>

      {/* 5-Tier Product Hierarchy Search: Company → Division → Sub-Division → Category → Product */}
      <InventoryHierarchyFilter
        initialValues={hierarchyFilters}
        onChange={handleHierarchyChange}
        onReset={handleHierarchyReset}
        title="1. Product Filtration (Company → Division → Sub-Division → Category → Product)"
        subtitle="Select exact hierarchy to analyze fast & slow moving products. Products narrow down instantly."
      />

      {/* Dynamic Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              2. Sales Window (Past Days):
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[15, 30, 60, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => handleQuickAnalysisDays(d)}
                className={`px-3 py-1 rounded-xl font-bold text-xs transition ${
                  analysisDays === d
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Tab Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {(
            [
              { id: "ALL", label: "All Items" },
              { id: "FAST", label: `Fast Moving (${summary.fastCount})` },
              { id: "SLOW", label: `Slow Moving (${summary.slowCount})` },
              { id: "NORMAL", label: `Normal (${summary.normalCount || 0})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMovementFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                movementFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleApplyFilter}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Sales Window (Days):
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={analysisDays}
              onChange={(e) =>
                setAnalysisDays(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Fast Cover ≤ Days:
            </label>
            <input
              type="number"
              min="1"
              value={fastCoverDays}
              onChange={(e) =>
                setFastCoverDays(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Slow Cover ≥ Days:
            </label>
            <input
              type="number"
              min="1"
              value={slowCoverDays}
              onChange={(e) =>
                setSlowCoverDays(Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Calculating..." : "Apply Threshold"}</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData()} className="underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Movement Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
              <FaSyncAlt className="animate-spin text-indigo-500" />
              <span>Calculating stock velocity and burn rates...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <FaTachometerAlt className="mx-auto text-slate-300 text-4xl mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No items matching {movementFilter} criteria in the past{" "}
                {analysisDays} days.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try expanding your analysis window or adjusting the cover
                thresholds.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="p-3.5 font-bold w-12 text-center">#</th>
                  <th className="p-3.5 font-bold">Product Name</th>
                  <th className="p-3.5 font-bold text-center">Product Code</th>
                  <th className="p-3.5 font-bold text-center">Current Stock</th>
                  <th className="p-3.5 font-bold text-center">
                    Sales ({analysisDays}D)
                  </th>
                  <th className="p-3.5 font-bold text-center">
                    Daily Velocity
                  </th>
                  <th className="p-3.5 font-bold text-center">
                    Stock Cover (Days)
                  </th>
                  <th className="p-3.5 font-bold text-center">
                    Movement Status
                  </th>
                  <th className="p-3.5 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedItems.map((item: any, idx: number) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isFast = item.movement === "FAST";
                  const isSlow = item.movement === "SLOW";

                  return (
                    <tr
                      key={`${item.id || item.code || ""}_${idx}`}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                        isFast
                          ? "bg-emerald-50/15"
                          : isSlow
                            ? "bg-amber-50/15"
                            : ""
                      }`}
                    >
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                        <div>{item.product}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-normal">
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
                      <td className="p-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                        {item.code}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-white">
                        {item.stock.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.salesQty.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                        {item.avgDailySales} /day
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        {item.stockCoverDays === null ? (
                          <span className="text-slate-400 font-normal">
                            ∞ (No sales)
                          </span>
                        ) : item.stockCoverDays <= fastCoverDays ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                            {item.stockCoverDays} Days (Low)
                          </span>
                        ) : item.stockCoverDays >= slowCoverDays ? (
                          <span className="text-amber-700 dark:text-amber-400 font-extrabold">
                            {item.stockCoverDays} Days (High)
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.stockCoverDays} Days
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            isFast
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isSlow
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {isFast
                            ? "⚡ FAST MOVING"
                            : isSlow
                              ? "⏳ SLOW MOVING"
                              : "NORMAL"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <Link
                          href={`/dashboard/${role}/sales/order-dispatch?q=${encodeURIComponent(item.product)}`}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          {isFast ? "Reorder" : "Promote"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page <b>{currentPage}</b> of <b>{totalPages}</b> (
              {filteredItems.length} items)
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

      {/* Movement Email Alert Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">
                  <FaBolt />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Send Stock Movement Alert Email
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dispatches executive intelligence report for Fast and Slow
                    moving products.
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Category to Send:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "ALL", label: "Fast & Slow" },
                      { id: "FAST", label: "Fast Moving Only" },
                      { id: "SLOW", label: "Slow Moving Only" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAlertType(m.id)}
                      className={`p-2 rounded-xl font-bold text-xs border transition ${
                        alertType === m.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Recipient Email Addresses (comma separated):
                  </label>
                  {user?.email && (
                    <button
                      type="button"
                      onClick={() => setAlertRecipients(user.email)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <FaUserCheck size={10} />
                      <span>Use My Email ({user.email})</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={user?.email || "admin@example.com, management@example.com"}
                  value={alertRecipients}
                  onChange={(e) => setAlertRecipients(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Default: Login Admin email ({user?.email || "from session"}). Multiple emails comma se separate karein.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 text-emerald-800 dark:text-emerald-400">
                <div className="font-bold">Dispatch Summary:</div>
                <div className="mt-1">
                  • <b>{summary.fastCount}</b> Fast Moving items (cover ≤{" "}
                  {fastCoverDays} days).
                </div>
                <div>
                  • <b>{summary.slowCount}</b> Slow Moving items (cover ≥{" "}
                  {slowCoverDays} days).
                </div>
                <div>
                  • Evaluated over the past <b>{analysisDays} days</b>.
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <FaPaperPlane className={sendingAlert ? "animate-spin" : ""} />
                <span>
                  {sendingAlert ? "Delivering..." : "Send Movement Alert Now"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
