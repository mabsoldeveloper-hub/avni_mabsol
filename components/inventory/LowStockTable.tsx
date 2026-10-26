"use client";

import { FaExclamationTriangle } from "react-icons/fa";

export default function LowStockTable({ products }: any) {
  return (
    <div
      className="
        relative rounded-2xl overflow-hidden h-full
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400/80 to-orange-400/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaExclamationTriangle size={14} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Low Stock Products
        </h5>
      </div>

      {/* body */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200/70 bg-white/30">
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Product
              </th>
              <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Stock
              </th>
              <th className="text-right font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                MRP
              </th>
            </tr>
          </thead>
          <tbody>
            {products?.length > 0 ? (
              products.map((p: any, idx: number) => (
                <tr
                  key={`${p._id || p.CODE || "ls"}-${idx}`}
                  className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                >
                  <td className="px-4 py-2.5 font-semibold text-gray-700">
                    {p.PRODUCT}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-700 ring-1 ring-amber-400/30">
                      {Number(p.BALANCE).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                    ₹ {Number(p.MRP || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-gray-400 py-8 text-sm">
                  No Low Stock Product
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}