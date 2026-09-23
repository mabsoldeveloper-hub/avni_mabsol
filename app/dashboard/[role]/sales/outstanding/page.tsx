"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  FaFileInvoiceDollar,
  FaRupeeSign,
  FaSearch,
  FaReceipt,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaMapMarkerAlt,
  FaArrowRight,
  FaCalendarAlt,
  FaUser,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

type SalesOutstandingRow = {
  _id: string;
  vcn: string;
  voucher: string;
  date: string;
  ddate: string;
  ord: string;
  customer: string;
  city: string;
  gst: string;
  phone: string;
  amount: number;
  overdueDays: number;
  status: string;
};

export default function SalesOutstandingPage() {
  const [rows, setRows] = useState<SalesOutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const pageSize = 10;
  const { selectedFY } = useFinancialYear();

  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

  const loadMrTerritoryInfo = async () => {
    try {
      const res = await fetch("/api/mr-territory/my-territories");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMrTerritoryInfo({
            isMrRestricted: json.isMrRestricted,
            territories: json.territories || [],
            allowedCompanyCodes: json.allowedCompanyCodes || [],
          });
        }
      }
    } catch {
      // Silently ignore
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/sales/outstanding";
      if (selectedFY) {
        if (selectedFY.isAll) {
          url += "?fyId=ALL";
        } else if (selectedFY._id) {
          url += `?fyId=${selectedFY._id}`;
          if (selectedFY.startDate && selectedFY.endDate) {
            const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
            const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
            url += `&startDate=${s}&endDate=${e}`;
          }
        }
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.rows)) {
        setRows(data.rows);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFY]);

  useEffect(() => {
    loadData();
    const onFyChange = () => loadData();
    window.addEventListener("financial-year-changed", onFyChange);
    return () => window.removeEventListener("financial-year-changed", onFyChange);
  }, [loadData]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        String(r.vcn || "").toLowerCase().includes(s) ||
        String(r.customer || "").toLowerCase().includes(s) ||
        String(r.city || "").toLowerCase().includes(s) ||
        String(r.ord || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const totalBills = filtered.length;
  const totalAmount = filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const overdueCount = filtered.filter((r) => r.overdueDays > 0).length;
  const overdueAmount = filtered.filter((r) => r.overdueDays > 0).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const summaryCards = [
    {
      title: "Sales Outstanding",
      value: "₹ " + totalAmount.toLocaleString("en-IN"),
      icon: <FaRupeeSign size={16} />,
      ring: "from-cyan-400/40 to-blue-500/40",
      iconBg: "bg-cyan-500/15 text-cyan-600",
      glow: "group-hover:shadow-cyan-400/30",
    },
    {
      title: "Total Debtors Bills",
      value: totalBills,
      icon: <FaReceipt size={16} />,
      ring: "from-indigo-400/40 to-violet-500/40",
      iconBg: "bg-indigo-500/15 text-indigo-600",
      glow: "group-hover:shadow-indigo-400/30",
    },
    {
      title: "Overdue Amount",
      value: "₹ " + overdueAmount.toLocaleString("en-IN"),
      icon: <FaExclamationTriangle size={16} />,
      ring: "from-rose-400/40 to-red-500/40",
      iconBg: "bg-rose-500/15 text-rose-600",
      glow: "group-hover:shadow-rose-400/30",
    },
    {
      title: "Overdue Bills",
      value: overdueCount,
      icon: <FaCalendarAlt size={16} />,
      ring: "from-amber-400/40 to-yellow-500/40",
      iconBg: "bg-amber-500/15 text-amber-600",
      glow: "group-hover:shadow-amber-400/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* MR TERRITORY BANNER */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
          <div className="flex-shrink-0 mt-0.5">
            <FaMapMarkerAlt size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Aap sirf apni assigned territory ke Sales Outstanding bills dekh sakte hain.
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`
              group relative rounded-2xl p-[1px]
              bg-gradient-to-br ${card.ring}
              transition-all duration-500 ease-out
              hover:-translate-y-1 hover:scale-[1.01]
            `}
          >
            <div className="relative h-full rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-3.5">
              <div className="relative flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">{card.title}</p>
                  <h3 className="mt-0.5 font-semibold text-gray-800 tabular-nums text-lg">{card.value}</h3>
                </div>
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${card.iconBg}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OUTSTANDING TABLE REGISTER */}
      <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm">
        {/* HEADER BAR */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FaFileInvoiceDollar size={15} />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-white tracking-wide m-0">Sales Outstanding (Debtors Register)</h5>
              <p className="text-[11px] text-gray-300 m-0">Customer pending bills & receivables</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bill No, Customer, City..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all"
            />
          </div>
        </div>

        {/* TABLE BODY */}
        <div className="relative overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-sm text-gray-500 font-medium">Loading Sales Outstanding...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/70 bg-white/40 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Bill No</th>
                  <th className="px-4 py-2.5 text-left">Due Date</th>
                  <th className="px-4 py-2.5 text-left">Customer Name</th>
                  <th className="px-4 py-2.5 text-left">City</th>
                  <th className="px-4 py-2.5 text-center">Overdue Days</th>
                  <th className="px-4 py-2.5 text-right">Balance Amount</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? (
                  paginated.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100/70 last:border-0 hover:bg-white/60 transition-colors">
                      <td className="px-4 py-2.5 text-left text-indigo-700 font-bold">{row.vcn}</td>
                      <td className="px-4 py-2.5 text-left text-gray-600 font-medium">{row.ddate || "-"}</td>
                      <td className="px-4 py-2.5 text-left text-gray-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <FaUser size={10} className="text-gray-400 shrink-0" />
                          <span>{row.customer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-left text-gray-600">{row.city || "-"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {row.overdueDays > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 ring-1 ring-amber-500/20">
                            {row.overdueDays} Days
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20">
                            On Time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900 tabular-nums">
                        ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Link
                          href={`/dashboard/sales/invoice/${encodeURIComponent(row.vcn)}`}
                          className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                        >
                          View Bill
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8 text-sm">
                      No Sales Outstanding Bills Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
          <span>
            Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
            <span className="font-semibold text-gray-700">{totalPages}</span> &middot; {filtered.length} results
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-40 transition-all"
            >
              <FaChevronLeft size={10} />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-40 transition-all"
            >
              <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
