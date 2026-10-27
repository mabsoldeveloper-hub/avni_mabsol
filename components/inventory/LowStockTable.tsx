"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FaExclamationTriangle, FaSearch, FaBuilding, FaEye } from "react-icons/fa";

export default function LowStockTable({
  products,
  role = "admin",
  isFullWidth = false,
}: {
  products: any[];
  role?: string;
  isFullWidth?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products || [];
    const q = search.toLowerCase();
    return (products || []).filter(
      (p: any) =>
        (p.PRODUCT || "").toLowerCase().includes(q) ||
        (p.CODE || "").toString().toLowerCase().includes(q) ||
        (p.companyName || p.GCODE || p.COMPANY || "").toLowerCase().includes(q) ||
        (p.division || p.DIV || "").toLowerCase().includes(q) ||
        (p.category || p.CAT || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden h-full
        bg-white/70 backdrop-blur-xl
        border border-amber-200/60
        shadow-[0_4px_20px_rgba(245,158,11,0.08)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md text-white">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/20 text-white shadow-xs">
            <FaExclamationTriangle size={13} />
          </div>
          <div>
            <h5 className="text-sm font-bold tracking-wide m-0 text-white">
              Low Stock Products
            </h5>
            <p className="text-[10px] text-amber-100 m-0">Stock balance between 1 and 10 units</p>
          </div>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white">
            {products?.length || 0}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <FaSearch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search low stock..."
            className="w-full pl-7 pr-2.5 py-1 rounded-lg text-xs bg-white/20 text-white placeholder-white/70 ring-1 ring-white/30 focus:ring-white/60 outline-none backdrop-blur-sm"
          />
        </div>
      </div>

      {/* body */}
      <div className="relative overflow-x-auto max-h-[460px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200/80 bg-slate-50/90 backdrop-blur-md text-gray-600">
              <th className="text-left font-bold text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                Product & Code
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wide px-3 py-2.5">
                Company
              </th>
              {isFullWidth && (
                <>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wide px-3 py-2.5">
                    Division
                  </th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wide px-3 py-2.5">
                    Category
                  </th>
                </>
              )}
              <th className="text-center font-bold text-[11px] uppercase tracking-wide px-3 py-2.5">
                Stock
              </th>
              <th className="text-right font-bold text-[11px] uppercase tracking-wide px-3 py-2.5">
                MRP
              </th>
              <th className="text-center font-bold text-[11px] uppercase tracking-wide px-3 py-2.5 w-16">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((p: any, idx: number) => {
                const compName = p.companyName || p.GCODE || p.COMPANY || "-";
                return (
                  <tr
                    key={`${p._id || p.CODE || "ls"}-${idx}`}
                    className="hover:bg-amber-50/40 transition-colors duration-150"
                  >
                    <td className="px-3.5 py-2 font-medium text-gray-800">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]" title={p.PRODUCT}>
                        {p.PRODUCT}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        {p.CODE && <span>Code: {p.CODE}</span>}
                        {p.pack && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {p.pack}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 truncate max-w-[140px]" title={compName}>
                        <FaBuilding size={9} className="text-slate-400 shrink-0" />
                        <span className="truncate">{compName}</span>
                      </span>
                    </td>
                    {isFullWidth && (
                      <>
                        <td className="px-3 py-2 text-[11px] text-gray-600">
                          {p.division || p.DIV || "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-600">
                          {p.category || p.CAT || "-"}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-800 ring-1 ring-amber-400/40 tabular-nums">
                        {Number(p.BALANCE).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums font-medium">
                      ₹ {Number(p.MRP || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link
                        href={`/dashboard/${role}/inventory/products/view/${p._id}`}
                        className="
                          inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold
                          bg-white text-blue-600 ring-1 ring-blue-300
                          hover:bg-blue-600 hover:text-white hover:ring-blue-600
                          transition-all duration-150 shadow-2xs
                        "
                      >
                        <FaEye size={10} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isFullWidth ? 7 : 5} className="text-center text-gray-400 py-8 text-xs font-medium">
                  {search ? "No matching low stock products found" : "🎉 No Low Stock Product"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}