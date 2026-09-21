"use client";

import React, { useEffect, useState, useCallback } from "react";
import PurchaseSalesFilterBar, { FilterState } from "./PurchaseSalesFilterBar";
import PurchaseSalesCharts from "./PurchaseSalesCharts";
import { useCompany } from "@/context/CompanyContext";
import {
  FaShoppingCart,
  FaShoppingBag,
  FaPercentage,
  FaExchangeAlt,
  FaUndoAlt,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaInfoCircle,
} from "react-icons/fa";

const formatCurrency = (val: number) => {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
  return `₹${val || 0}`;
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group/info inline-flex items-center z-30">
    <FaInfoCircle className="text-slate-400 hover:text-indigo-500 text-xs transition-colors cursor-pointer shrink-0" />
    <div className="absolute left-0 top-full mt-2 hidden group-hover/info:block w-56 sm:w-64 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-medium rounded-2xl shadow-2xl z-[100] border border-slate-700/80 backdrop-blur-xl pointer-events-none leading-relaxed">
      <div className="font-bold text-sky-400 mb-1 flex items-center gap-1">
        <span>ℹ️ Calculation Formula</span>
      </div>
      <p className="text-slate-200 text-[10.5px] leading-snug">{text}</p>
    </div>
  </div>
);

export default function PurchaseSalesDashboard() {
  const { selectedCompany } = useCompany();

  const [filters, setFilters] = useState<FilterState>({
    range: "this_fy",
    fyId: "ALL",
    paymentStatus: "ALL",
    category: "ALL",
    startDate: "",
    endDate: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedItemModal, setSelectedItemModal] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("range", filters.range);
      if (selectedCompany?._id) {
        params.set("companyId", selectedCompany._id);
      } else {
        params.set("companyId", "ALL");
      }



      params.set("fyId", filters.fyId || "ALL");
      params.set("paymentStatus", filters.paymentStatus || "ALL");
      params.set("category", filters.category || "ALL");
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/analytics/purchase-sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load purchase-sales analytics:", e);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCompany]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};

  return (
    <div className="min-h-screen p-3 sm:p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50 space-y-6 sm:space-y-8 w-full max-w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 md:p-8 shadow-2xl w-full">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-sky-300 border border-white/10 mb-2.5">
              <FaChartLine className="text-sky-400" />
              <span>Purchase vs Sale Visual Analytics</span>
            </div>
            <h1 className="text-xl text-white sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 leading-tight">
              Purchase & Sale Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Showing trade metrics for <strong className="text-sky-300">{selectedCompany?.companyName || "Current Active Company"}</strong>. Hover ℹ️ on any card to inspect calculation formulas.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <button
              onClick={fetchData}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <FaExchangeAlt className={loading ? "animate-spin" : ""} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <PurchaseSalesFilterBar
        filters={filters}
        onChange={(newF) => setFilters(newF)}
        onRefresh={fetchData}
        loading={loading}
        categoriesList={data?.filterMeta?.categories || []}
      />

      {/* Summary KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
        {/* Card 1: Total Sales */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-emerald-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Total Sales
              </span>
              <InfoTooltip text="Aggregated from SalesMdis (TYPE:'S') & SalesDis. Net Sales = Gross Sales - Sale Returns." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <FaShoppingBag className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {formatCurrency(summary.totalSales)}
          </span>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-500 mt-1 truncate">
            <FaArrowUp className="text-[8px] shrink-0" />
            <span className="truncate">Net: {formatCurrency(summary.netSales)}</span>
          </div>
        </div>

        {/* Card 2: Total Purchases */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-sky-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Total Purchases
              </span>
              <InfoTooltip text="Aggregated from PurchaseBill & PurchaseOrder. Net Purchases = Gross Purchases - Purchase Returns." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <FaShoppingCart className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {formatCurrency(summary.totalPurchases)}
          </span>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-sky-500 mt-1 truncate">
            <FaArrowDown className="text-[8px] shrink-0" />
            <span className="truncate">Net: {formatCurrency(summary.netPurchases)}</span>
          </div>
        </div>

        {/* Card 3: Gross Profit Margin */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-indigo-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Gross Margin %
              </span>
              <InfoTooltip text="Formula: ((Net Sales - Net Purchases) / Net Sales) * 100." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <FaPercentage className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {summary.grossMarginPercent || 0}%
          </span>
          <div className="text-[10px] sm:text-[11px] font-bold text-indigo-500 mt-1 truncate">
            Profit: {formatCurrency(summary.grossProfit)}
          </div>
        </div>

        {/* Card 4: Purchase Utilization */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-violet-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Utilization Rate
              </span>
              <InfoTooltip text="Formula: (Total Sales Volume / Total Purchase Intake) * 100." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <FaExchangeAlt className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {summary.purchaseUtilizationRate || 0}%
          </span>
          <div className="text-[10px] sm:text-[11px] font-bold text-violet-500 mt-1 truncate">
            Sale / Purchase Speed
          </div>
        </div>

        {/* Card 5: Sale Returns */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-amber-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Sale Returns
              </span>
              <InfoTooltip text="Sum of Sale Return Vouchers & Credit Notes from SalesDis collection." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <FaUndoAlt className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {formatCurrency(summary.totalSaleReturns)}
          </span>
          <div className="text-[10px] sm:text-[11px] font-bold text-amber-500 mt-1 truncate">
            {summary.saleReturnRatio}% of Sales
          </div>
        </div>

        {/* Card 6: Purchase Returns */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-rose-500/5 hover:scale-102 transition-all min-w-0 relative">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Purchase Returns
              </span>
              <InfoTooltip text="Sum of Purchase Return Vouchers & Debit Notes from PurchaseReturn collection." />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <FaUndoAlt className="text-xs sm:text-sm" />
            </div>
          </div>
          <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block truncate">
            {formatCurrency(summary.totalPurchaseReturns)}
          </span>
          <div className="text-[10px] sm:text-[11px] font-bold text-rose-500 mt-1 truncate">
            {summary.purchaseReturnRatio}% of Purchase
          </div>
        </div>
      </div>

      {/* Main Charts Hub */}
      {loading && !data ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4 bg-white/80 dark:bg-slate-900/80 rounded-3xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 w-full">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Generating live purchase & sale graphs...
          </p>
        </div>
      ) : (
        <PurchaseSalesCharts
          dualTrendData={data?.dualTrendData || []}
          categoriesData={data?.categoriesData || []}
          tradeFunnelData={data?.tradeFunnelData || []}
          categoryRadarData={data?.categoryRadarData || []}
          treemapItemsData={data?.treemapItemsData || []}
          salesPaymentBreakdown={data?.salesPaymentBreakdown || []}
          purchasePaymentBreakdown={data?.purchasePaymentBreakdown || []}
          returnsComparison={data?.returnsComparison || []}
          summary={summary}
          onItemClick={(item) => setSelectedItemModal(item)}
        />
      )}

      {/* Drilldown Details Modal */}
      {selectedItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4">
            <button
              onClick={() => setSelectedItemModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <FaTimes />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
              Item Details & Margin Breakdown
            </span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {selectedItemModal.name}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedItemModal.category}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Item Code:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedItemModal.code}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Sales Volume:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(selectedItemModal.salesVolume)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Profit Margin:</span>
                <span className="font-bold text-indigo-600">
                  {selectedItemModal.profitMargin}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedItemModal(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
