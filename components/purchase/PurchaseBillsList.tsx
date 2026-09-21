"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import PurchaseInvoiceModal from "./PurchaseInvoiceModal";

import {
  FaPlus,
  FaSearch,
  FaFileInvoice,
  FaSync,
  FaCheckCircle,
  FaEye,
  FaHandHoldingUsd,
  FaUndoAlt,
  FaTimes,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaReceipt,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
} from "react-icons/fa";


export default function PurchaseBillsList() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedBillModal, setSelectedBillModal] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);

      const res = await fetch(`/api/purchase/invoice?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBills(json.bills || []);
        }
      }
    } catch (err) {
      console.error("Fetch Purchase Bills Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Client-side Search & Status Filtering
  const filteredBills = useMemo(() => {
    const s = search.trim().toLowerCase();
    return bills.filter((b) => {
      const matchesSearch =
        !s ||
        String(b.billNumber || "").toLowerCase().includes(s) ||
        String(b.supplierInvoiceNo || "").toLowerCase().includes(s) ||
        String(b.vendorName || "").toLowerCase().includes(s) ||
        String(b.poNumber || "").toLowerCase().includes(s) ||
        String(b.netAmount || "").toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(b.paymentStatus || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage, pageSize]);

  // Top Summary Calculations
  const totalInvoicesCount = filteredBills.length;
  const totalGrossAmount = filteredBills.reduce((sum, b) => sum + Number(b.netAmount || 0), 0);
  const totalPaidAmount = filteredBills.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
  const totalOutstandingBalance = filteredBills.reduce(
    (sum, b) => sum + Number(b.balanceAmount ?? ((b.netAmount || 0) - (b.paidAmount || 0))),
    0
  );

  return (
    // <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
    <div className="container-fluid p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-500" /> Purchase Invoices / Bills
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inward purchase bills, vendor invoices & payment tracking register
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/purchase/invoice/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
          >
            <FaPlus /> Create Purchase Bill
          </Link>
        </div>
      </div>

      {/* Interlinking Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link
          href="/dashboard/purchase/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaShoppingBag className="text-amber-500" /> Dashboard
        </Link>
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white shadow-xs font-bold"
        >
          <FaFileInvoice /> Purchase Invoices
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaTruck className="text-indigo-500" /> Orders
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-rose-500" /> Outstanding
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaReceipt className="text-emerald-500" /> Payment Entry
        </Link>
        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaUndoAlt className="text-orange-500" /> Return (Debit Note)
        </Link>
      </div>

      {/* EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalInvoicesCount} Bills</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Inward Value</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">₹{totalGrossAmount.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Settled / Paid</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">₹{totalPaidAmount.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Outstanding Balance</p>
          <p className="text-xl font-black text-rose-600 mt-0.5">₹{totalOutstandingBalance.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* SEARCH, FILTER & TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        {/* Controls Bar: Search & Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search Bill No, Supplier Inv No, Vendor Name, PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <span className="px-2 text-slate-400 text-[11px] font-bold uppercase">Status:</span>
              {(["ALL", "Pending", "Paid"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg transition ${statusFilter === st
                    ? "bg-amber-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchBills()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Refresh Invoices"
            >
              <FaSync className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* LIST TABLE */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Purchase Invoices...</div>
        ) : paginatedBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">Bill Number</th>
                  <th className="py-3 px-3">Supplier Inv No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Vendor / Supplier</th>
                  <th className="py-3 px-3">Linked PO</th>
                  <th className="py-3 px-3 text-right">Net Amount</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Payment Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedBills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-extrabold text-amber-600 dark:text-amber-400">
                      {b.billNumber}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {b.supplierInvoiceNo || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{b.billDate || "N/A"}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {b.vendorName}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {b.poNumber ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{b.poNumber}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                      ₹{Number(b.netAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                      ₹{Number(b.balanceAmount ?? ((b.netAmount || 0) - (b.paidAmount || 0))).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${b.paymentStatus === "Paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : b.paymentStatus === "Partial"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                      >
                        {b.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedBillModal(b)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white rounded-lg transition text-[11px]"
                          title="View Bill Details"
                        >
                          <FaEye />
                        </button>
                        <Link
                          href="/dashboard/purchase/payment"
                          className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition text-[11px]"
                          title="Make Payment"
                        >
                          <FaHandHoldingUsd />
                        </Link>
                        <Link
                          href="/dashboard/purchase/purchase-return"
                          className="p-1.5 bg-orange-500/10 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition text-[11px]"
                          title="Create Return (Debit Note)"
                        >
                          <FaUndoAlt />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No purchase bills found matching your search. Try adjusting filters or click "Create Purchase Bill" above.
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {filteredBills.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {/* Page info */}
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredBills.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredBills.length)} of {filteredBills.length} Invoices
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              {/* Page size selector */}
              <div className="flex items-center gap-1 mr-3">
                <span className="text-[11px] text-slate-400">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronLeft size={10} />
              </button>

              {/* Page Number Pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-bold transition text-xs ${currentPage === pageNum
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Professional Purchase Bill Details & PDF Modal */}
      {selectedBillModal && (
        <PurchaseInvoiceModal
          isOpen={Boolean(selectedBillModal)}
          bill={selectedBillModal}
          onClose={() => setSelectedBillModal(null)}
          company={selectedCompany}
        />
      )}
    </div>
  );
}
