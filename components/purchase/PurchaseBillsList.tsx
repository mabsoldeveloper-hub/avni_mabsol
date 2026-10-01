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
  FaEye,
  FaHandHoldingUsd,
  FaUndoAlt,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaReceipt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

export default function PurchaseBillsList() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBillModal, setSelectedBillModal] = useState<any | null>(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);

  const openBillDetails = async (bill: any) => {
    try {
      setLoadingBillDetails(true);

      const res = await fetch(
        `/api/purchase/invoice?id=${encodeURIComponent(String(bill._id || ""))}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok || !json.success || !json.bill) {
        alert(json.message || "Unable to load Marg purchase bill details");
        return;
      }

      setSelectedBillModal(json.bill);
    } catch (error) {
      console.error("Purchase bill detail error:", error);
      alert("Unable to load Marg purchase bill details");
    } finally {
      setLoadingBillDetails(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchBills = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (selectedCompany?._id) {
        params.set("companyId", selectedCompany._id);
      }

      if (selectedFY?._id) {
        params.set("fyId", selectedFY._id);
      }

      const res = await fetch(`/api/purchase/invoice?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (json.success) {
        setBills(Array.isArray(json.bills) ? json.bills : []);
      } else {
        setBills([]);
        console.error(json.message);
      }
    } catch (error) {
      console.error("Purchase invoice list error:", error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?._id, selectedFY?._id]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const filteredBills = useMemo(() => {
    const s = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesSearch =
        !s ||
        String(bill.billNumber || "").toLowerCase().includes(s) ||
        String(bill.supplierInvoiceNo || "").toLowerCase().includes(s) ||
        String(bill.vendorName || "").toLowerCase().includes(s) ||
        String(bill.poNumber || "").toLowerCase().includes(s) ||
        String(bill.netAmount || "").toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(bill.paymentStatus || "").toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBills.length / pageSize)
  );

  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage, pageSize]);

  const totalInvoices = filteredBills.length;

  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.netAmount || 0),
    0
  );

  const totalPaid = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.paidAmount || 0),
    0
  );

  const totalBalance = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.balanceAmount || 0),
    0
  );

  return (
    <div className="container-fluid p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-500" />
            Purchase Invoices / Bills
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Marg MDIS header + DIS item register
          </p>
        </div>

        <Link
          href="/dashboard/purchase/invoice/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
        >
          <FaPlus />
          Create Purchase Bill
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link href="/dashboard/purchase/dashboard" className="px-3 py-1.5 rounded-xl hover:bg-white">
          <FaShoppingBag className="inline mr-1 text-amber-500" />
          Dashboard
        </Link>

        <Link href="/dashboard/purchase/invoice" className="px-3 py-1.5 rounded-xl bg-amber-600 text-white">
          <FaFileInvoice className="inline mr-1" />
          Purchase Invoices
        </Link>

        <Link href="/dashboard/purchase/orders" className="px-3 py-1.5 rounded-xl hover:bg-white">
          <FaTruck className="inline mr-1 text-indigo-500" />
          Orders
        </Link>

        <Link href="/dashboard/purchase/outstanding" className="px-3 py-1.5 rounded-xl hover:bg-white">
          <FaFileInvoiceDollar className="inline mr-1 text-rose-500" />
          Outstanding
        </Link>

        <Link href="/dashboard/purchase/payment" className="px-3 py-1.5 rounded-xl hover:bg-white">
          <FaReceipt className="inline mr-1 text-emerald-500" />
          Payment Entry
        </Link>

        <Link href="/dashboard/purchase/purchase-return" className="px-3 py-1.5 rounded-xl hover:bg-white">
          <FaUndoAlt className="inline mr-1 text-orange-500" />
          Return
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Total Invoices
          </p>
          <p className="text-xl font-black mt-1">{totalInvoices}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold uppercase text-amber-600">
            Total Inward
          </p>
          <p className="text-xl font-black text-amber-600 mt-1">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold uppercase text-emerald-600">
            Paid
          </p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            ₹{totalPaid.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold uppercase text-rose-600">
            Outstanding
          </p>
          <p className="text-xl font-black text-rose-600 mt-1">
            ₹{totalBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bill, Supplier Invoice, Vendor..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border"
            />
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "Pending", "Partial", "Paid"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  statusFilter === status
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 dark:bg-slate-900"
                }`}
              >
                {status}
              </button>
            ))}

            <button
              onClick={fetchBills}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Loading Marg Purchase Invoices...
          </div>
        ) : paginatedBills.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900/60 uppercase text-slate-500">
                  <th className="py-3 px-3">Bill Number</th>
                  <th className="py-3 px-3">Supplier Invoice</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">PO</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {paginatedBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-black text-amber-600">
                      {bill.billNumber || "-"}
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      {bill.supplierInvoiceNo || "-"}
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {bill.billDate || "-"}
                    </td>

                    <td className="py-3 px-3 font-bold">
                      {bill.vendorName || "-"}
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {bill.poNumber || "-"}
                    </td>

                    <td className="py-3 px-3 text-right font-black">
                      ₹{Number(bill.netAmount || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-rose-600">
                      ₹{Number(bill.balanceAmount || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          bill.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : bill.paymentStatus === "Partial"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {bill.paymentStatus || "Pending"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openBillDetails(bill)}
                          disabled={loadingBillDetails}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-amber-500 hover:text-white disabled:opacity-50"
                          title="View Purchase"
                        >
                          <FaEye />
                        </button>

                        <Link
                          href="/dashboard/purchase/payment"
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          title="Payment"
                        >
                          <FaHandHoldingUsd />
                        </Link>

                        <Link
                          href="/dashboard/purchase/purchase-return"
                          className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white"
                          title="Purchase Return"
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
          <div className="py-16 text-center text-xs text-slate-400">
            No purchase bills found.
          </div>
        )}

        {filteredBills.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 text-xs">
            <div>
              Showing{" "}
              {Math.min(
                (currentPage - 1) * pageSize + 1,
                filteredBills.length
              )}{" "}
              to{" "}
              {Math.min(currentPage * pageSize, filteredBills.length)} of{" "}
              {filteredBills.length}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border bg-white dark:bg-slate-900"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-100 disabled:opacity-40"
              >
                <FaChevronLeft size={10} />
              </button>

              <span className="font-bold">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-slate-100 disabled:opacity-40"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

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
