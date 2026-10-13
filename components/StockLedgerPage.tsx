"use client";

import { useEffect, useState, useCallback } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaSearch,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaLayerGroup,
  FaBoxes,
  FaSyncAlt,
  FaCalendarAlt,
} from "react-icons/fa";

interface StockMovementItem {
  _id: string;
  createdAt: string;
  productCode: string;
  productName: string;
  batchNo?: string;
  expiry?: string;
  type: string;
  quantity: number;
  rate?: number;
  mrp?: number;
  referenceNo?: string;
  referenceType?: string;
  remarks?: string;
}

interface SummaryData {
  netQty: number;
  inQty: number;
  outQty: number;
}

const TYPE_OPTIONS = [
  { value: "", label: "All Movement Types" },
  { value: "OPENING", label: "Opening Stock" },
  { value: "PURCHASE", label: "Purchase (In)" },
  { value: "SALE", label: "Sale (Out)" },
  { value: "SALE_RETURN", label: "Sale Return (In)" },
  { value: "PURCHASE_RETURN", label: "Purchase Return (Out)" },
  { value: "STOCK_IN", label: "Manual Stock In" },
  { value: "STOCK_OUT", label: "Manual Stock Out" },
  { value: "DAMAGE", label: "Damage / Loss" },
  { value: "ADJUSTMENT_IN", label: "Adjustment In" },
  { value: "ADJUSTMENT_OUT", label: "Adjustment Out" },
];

export default function StockLedgerPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [data, setData] = useState<{
    movements: StockMovementItem[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    summary?: SummaryData;
  } | null>(null);

  const [productCode, setProductCode] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMovements = useCallback(async () => {
    if (!selectedCompany?._id || !selectedFY?._id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: selectedCompany._id,
        fyId: selectedFY._id,
        page: String(page),
        limit: "50",
      });

      if (productCode.trim()) params.set("productCode", productCode.trim());
      if (batchNo.trim()) params.set("batchNo", batchNo.trim());
      if (selectedType) params.set("type", selectedType);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/stock/ledger?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setData({ movements: [], summary: { netQty: 0, inQty: 0, outQty: 0 } });
      }
    } catch (err) {
      console.error("Failed to load stock movements:", err);
      setData({ movements: [], summary: { netQty: 0, inQty: 0, outQty: 0 } });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?._id, selectedFY?._id, page, productCode, batchNo, selectedType, fromDate, toDate]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMovements();
  };

  const handleReset = () => {
    setProductCode("");
    setBatchNo("");
    setSelectedType("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "OPENING":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
      case "PURCHASE":
      case "SALE_RETURN":
      case "STOCK_IN":
      case "ADJUSTMENT_IN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "SALE":
      case "PURCHASE_RETURN":
      case "STOCK_OUT":
      case "DAMAGE":
      case "ADJUSTMENT_OUT":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="container-fluid p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaLayerGroup className="text-indigo-600" />
            Stock Ledger & Movement
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete inward, outward, opening, and adjustment stock movements for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {selectedCompany?.companyName || "Selected Company"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMovements()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Inward Stock
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              +{data?.summary?.inQty?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <FaArrowUp />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Outward Stock
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              -{data?.summary?.outQty?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <FaArrowDown />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Net Movement / Balance
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {(data?.summary?.netQty ?? 0) >= 0 ? "+" : ""}
              {data?.summary?.netQty?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
            <FaBoxes />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Product Code / Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="e.g. PARA500"
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Batch No
            </label>
            <input
              type="text"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="e.g. B2401"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Movement Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Clear Filters
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            <FaSearch /> Apply Filters
          </button>
        </div>
      </form>

      {/* Movement Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">Batch</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Voucher / Ref</th>
                <th className="p-3.5 text-right">Qty (In)</th>
                <th className="p-3.5 text-right">Qty (Out)</th>
                <th className="p-3.5 text-right">Net Impact</th>
                <th className="p-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <FaSyncAlt className="animate-spin" /> Loading stock movements...
                    </div>
                  </td>
                </tr>
              ) : !data?.movements?.length ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    No stock movements found matching your criteria.
                  </td>
                </tr>
              ) : (
                data.movements.map((m, idx) => {
                  const isIn = m.quantity > 0;
                  const isOut = m.quantity < 0;
                  return (
                    <tr
                      key={m._id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {m.productName || m.productCode}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{m.productCode}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {m.batchNo || "DEFAULT"}
                        {m.expiry && (
                          <div className="text-[10px] text-slate-400">Exp: {m.expiry}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadgeClass(
                            m.type
                          )}`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {m.referenceNo || "—"}
                        {m.referenceType && (
                          <span className="text-[10px] text-slate-400 ml-1">({m.referenceType})</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {isIn ? `+${m.quantity}` : "—"}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {isOut ? `${Math.abs(m.quantity)}` : "—"}
                      </td>
                      <td className="p-3.5 text-right font-black font-mono">
                        <span
                          className={
                            isIn
                              ? "text-emerald-700 dark:text-emerald-300"
                              : isOut
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-slate-500"
                          }
                        >
                          {isIn ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate text-[11px]">
                        {m.remarks || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page {data.pagination.page} of {data.pagination.totalPages} (
              {data.pagination.total} total records)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={data.pagination.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={data.pagination.page >= data.pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
