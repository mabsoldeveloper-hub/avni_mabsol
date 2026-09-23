"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  FaFileInvoiceDollar,
  FaRupeeSign,
  FaSearch,
  FaReceipt,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaCalendarAlt,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

type Adjustment = {
  vcn: string;
  voucher: number;
  adjVoucher: number;
  svoucher: number;
  type: string;
  amount: number;
  date: string;
};

type PurchaseOutstandingRow = {
  _id: string;
  vcn: string;
  voucher: number;
  svoucher: number;
  ord: string;
  supplier: string;
  city: string;
  gst: string;
  phone: string;
  billDate: string;
  dueDate: string;
  overdueDays: number;
  status: string;
  billValue: number;
  receive: number;
  balance: number;
  adjustmentCount: number;
  adjustments: Adjustment[];
};

export default function PurchaseOutstandingPage() {
  const [rows, setRows] = useState<PurchaseOutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mrTerritoryInfo, setMrTerritoryInfo] =
    useState<MrTerritoryInfo | null>(null);
  const pageSize = 10;
  const { selectedFY } = useFinancialYear();

  const [selectedBill, setSelectedBill] =
    useState<PurchaseOutstandingRow | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);

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
      let url = "/api/purchase/outstanding";

      if (selectedFY) {
        if (selectedFY.isAll) {
          url += "?fyId=ALL";
        } else if (selectedFY._id) {
          url += `?fyId=${selectedFY._id}`;
          if (selectedFY.startDate && selectedFY.endDate) {
            const s = new Date(selectedFY.startDate)
              .toISOString()
              .slice(0, 10);
            const e = new Date(selectedFY.endDate)
              .toISOString()
              .slice(0, 10);
            url += `&startDate=${s}&endDate=${e}`;
          }
        }
      }

      const res = await fetch(url);
      const data = await res.json();

      console.log(data);

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
    return () =>
      window.removeEventListener("financial-year-changed", onFyChange);
  }, [loadData]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter(
      (r) =>
        String(r.vcn || "").toLowerCase().includes(s) ||
        String(r.supplier || "").toLowerCase().includes(s) ||
        String(r.city || "").toLowerCase().includes(s) ||
        String(r.ord || "").toLowerCase().includes(s) ||
        String(r.gst || "").toLowerCase().includes(s)
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

  // ---------- Summary (respects search) ----------
  const totalBills = filtered.length;

  const totalBillValue = filtered.reduce(
    (sum, r) => sum + Number(r.billValue || 0),
    0
  );

  const totalReceive = filtered.reduce(
    (sum, r) => sum + Number(r.receive || 0),
    0
  );

  const totalBalance = filtered.reduce(
    (sum, r) => sum + Number(r.balance || 0),
    0
  );

  const summaryCards = [
    {
      title: "Outstanding",
      value: "₹ " + totalBalance.toLocaleString("en-IN"),
      icon: <FaRupeeSign size={16} />,
      ring: "from-red-400/40 to-orange-500/40",
      iconBg: "bg-red-500/15 text-red-600",
    },
    {
      title: "Bill Value",
      value: "₹ " + totalBillValue.toLocaleString("en-IN"),
      icon: <FaReceipt size={16} />,
      ring: "from-blue-400/40 to-sky-500/40",
      iconBg: "bg-blue-500/15 text-blue-600",
    },
    {
      title: "Received",
      value: "₹ " + totalReceive.toLocaleString("en-IN"),
      icon: <FaFileInvoiceDollar size={16} />,
      ring: "from-green-400/40 to-emerald-500/40",
      iconBg: "bg-green-500/15 text-green-600",
    },
    {
      title: "Bills",
      value: totalBills,
      icon: <FaCalendarAlt size={16} />,
      ring: "from-purple-400/40 to-indigo-500/40",
      iconBg: "bg-purple-500/15 text-purple-600",
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Interlinking Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
          <Link
            href="/dashboard/purchase/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/purchase/invoice"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Invoices List
          </Link>
          <Link
            href="/dashboard/purchase/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Orders
          </Link>
          <Link
            href="/dashboard/purchase/outstanding"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white shadow-xs"
          >
            Outstanding Payables
          </Link>
          <Link
            href="/dashboard/purchase/payment"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Payment Entry
          </Link>
          <Link
            href="/dashboard/purchase/purchase-return"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Purchase Return
          </Link>
        </div>
        {/* MR TERRITORY BANNER */}
        {mrTerritoryInfo?.isMrRestricted && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
            <div className="flex-shrink-0 mt-0.5">
              <FaMapMarkerAlt size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">
                Territory Restricted View
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Aap sirf apni assigned territory ke Purchase Outstanding bills
                dekh sakte hain.
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
                    <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
                      {card.title}
                    </p>
                    <h3 className="mt-0.5 font-semibold text-gray-800 tabular-nums text-lg">
                      {card.value}
                    </h3>
                  </div>
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${card.iconBg}`}
                  >
                    {card.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* OUTSTANDING TABLE */}
        <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm">
          {/* HEADER BAR */}
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-gray-900 via-orange-950 to-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <FaFileInvoiceDollar size={15} />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                  Purchase Outstanding (Creditors Register)
                </h5>
                <p className="text-[11px] text-gray-300 m-0">
                  Supplier pending bills & payables
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <FaSearch
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill No, Supplier, City, GST..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all"
              />
            </div>
          </div>

          {/* TABLE BODY */}
          <div className="relative overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500 font-medium">
                Loading Purchase Outstanding...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/70 bg-white/40 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2 text-left">Bill No</th>
                    <th className="px-3 py-2 text-left">Bill Date</th>
                    <th className="px-3 py-2 text-left">Due Date</th>
                    <th className="px-3 py-2 text-left">Supplier</th>
                    <th className="px-3 py-2 text-right">Bill Value</th>
                    <th className="px-3 py-2 text-right">Receive</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-center">O/D</th>
                    <th className="px-3 py-2 text-center">Adj.</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((row) => (
                      <tr
                        key={row._id}
                        className="border-b border-gray-100 hover:bg-orange-50 transition-colors"
                      >
                        <td className="px-3 py-2 font-bold text-orange-700">
                          {row.vcn}
                        </td>
                        <td className="px-3 py-2">{row.billDate || "-"}</td>
                        <td className="px-3 py-2">{row.dueDate || "-"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-gray-800">
                            {row.supplier}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {row.city || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          ₹{" "}
                          {Number(row.billValue || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-right text-green-700 font-semibold">
                          ₹{" "}
                          {Number(row.receive || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-right text-red-700 font-bold">
                          ₹{" "}
                          {Number(row.balance || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.overdueDays > 0 ? (
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
                              {row.overdueDays}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px]">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.adjustmentCount > 0 ? (
                            <span className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-blue-100 text-blue-700 font-bold">
                              {row.adjustmentCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedBill(row);
                                setShowAdjustment(true);
                              }}
                              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              Adjustments
                            </button>
                            <Link
                              href="/dashboard/purchase/payment"
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700 font-bold"
                            >
                              Pay Now
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-10 text-center text-gray-400"
                      >
                        No Outstanding Bills Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* FOOTER TOTALS */}
          <div className="border-t bg-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              <div>
                <div className="text-xs text-gray-500">Total Bill Value</div>
                <div className="text-lg font-bold text-blue-700">
                  ₹ {totalBillValue.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Received</div>
                <div className="text-lg font-bold text-green-700">
                  ₹ {totalReceive.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Outstanding</div>
                <div className="text-lg font-bold text-red-700">
                  ₹ {totalBalance.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Bills</div>
                <div className="text-lg font-bold">{totalBills}</div>
              </div>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
            <span>
              Page{" "}
              <span className="font-semibold text-gray-700">{currentPage}</span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">{totalPages}</span>{" "}
              &middot; {filtered.length} results
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

      {/* ADJUSTMENT MODAL */}
      {showAdjustment && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl mx-4">
            <div className="flex items-center justify-between border-b p-4">
              <h5 className="font-bold text-gray-800">Adjustment Details</h5>
              <button
                onClick={() => {
                  setShowAdjustment(false);
                  setSelectedBill(null);
                }}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="mb-2">
                <b>Bill :</b> {selectedBill.vcn}
              </div>
              <div className="mb-4">
                <b>Supplier :</b> {selectedBill.supplier}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-2 px-2 text-left">VCN</th>
                      <th className="py-2 px-2 text-left">Type</th>
                      <th className="py-2 px-2 text-right">Amount</th>
                      <th className="py-2 px-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.adjustments?.length > 0 ? (
                      selectedBill.adjustments.map((adj, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-2">{adj.vcn}</td>
                          <td className="py-2 px-2">{adj.type}</td>
                          <td className="py-2 px-2 text-right font-medium">
                            ₹ {Number(adj.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-2">{adj.date || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-gray-500"
                        >
                          No Adjustments Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}