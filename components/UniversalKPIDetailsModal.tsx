"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FaTimes,
  FaSearch,
  FaExternalLinkAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChartLine,
  FaReceipt,
  FaTruck,
  FaUndoAlt,
  FaFileInvoice,
  FaUsers,
  FaBoxes,
  FaBuilding,
  FaUserCheck,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string | number;
  type: string; // "purchases" | "purchase_orders" | "purchase_returns" | "payments" | "sales_returns" | "customers" | "active_customers" | "products" | "users" | "companies" | "today_sales" | "monthly_sales" | "generic"
  url?: string;
  companyId?: string;
}

export default function UniversalKPIDetailsModal({
  isOpen,
  onClose,
  title,
  value,
  type,
  url,
  companyId,
}: UniversalModalProps) {
  const { selectedFY } = useFinancialYear();
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 8;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearch("");
    setCurrentPage(1);

    async function fetchData() {
      try {
        const effectiveCompanyId = companyId || selectedCompany?._id;
        const params = new URLSearchParams();
        if (effectiveCompanyId) params.append("companyId", effectiveCompanyId);

        if (selectedFY) {
          if (selectedFY.isAll) {
            params.append("fyId", "ALL");
          } else if (selectedFY._id) {
            params.append("fyId", selectedFY._id);
            if (selectedFY.startDate && selectedFY.endDate) {
              const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
              const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
              params.append("startDate", s);
              params.append("endDate", e);
            }
          }
        }
        const qs = params.toString() ? `?${params.toString()}` : "";

        let endpoint = "";
        if (
          type === "purchases" ||
          type === "purchase_orders" ||
          type === "purchase_returns" ||
          type === "payments"
        ) {
          endpoint = `/api/purchase/reports${qs}`;
        } else if (type === "sales_returns") {
          endpoint = `/api/reports/sales-return${qs}`;
        } else if (type === "today_sales") {
          const p = new URLSearchParams(params);
          p.set("type", "today");
          endpoint = `/api/sales/invoice?${p.toString()}`;
        } else if (type === "monthly_sales") {
          const p = new URLSearchParams(params);
          p.set("type", "monthly");
          endpoint = `/api/sales/invoice?${p.toString()}`;
        } else if (type === "customers" || type === "active_customers") {
          endpoint = `/api/customers${qs}`;
        } else if (type === "products") {
          endpoint = `/api/products${qs}`;
        } else if (type === "users") {
          endpoint = `/api/users${qs}`;
        } else if (type === "companies") {
          endpoint = `/api/company-master${qs}`;
        }

        if (endpoint) {
          const res = await fetch(endpoint);
          if (res.ok) {
            const json = await res.json();
            if (type === "purchases") {
              setItems(json.invoices || []);
            } else if (type === "purchase_orders") {
              setItems(json.orders || []);
            } else if (type === "purchase_returns") {
              setItems(json.returns || []);
            } else if (type === "payments") {
              setItems(json.payments || []);
            } else if (type === "sales_returns") {
              setItems(json.rows || json.returns || json.invoices || []);
            } else if (type === "today_sales" || type === "monthly_sales") {
              setItems(json.invoices || []);
            } else if (type === "customers") {
              setItems(Array.isArray(json) ? json : json.customers || []);
            } else if (type === "active_customers") {
              const raw = Array.isArray(json) ? json : json.customers || [];
              setItems(raw.filter((c: any) => c.STATUS === "Y" || c.status === "Active" || !c.STATUS));
            } else if (type === "products") {
              setItems(Array.isArray(json) ? json : json.products || []);
            } else if (type === "users") {
              setItems(json.users || (Array.isArray(json) ? json : []));
            } else if (type === "companies") {
              setItems(Array.isArray(json) ? json : json.companies || []);
            } else {
              setItems(Array.isArray(json) ? json : []);
            }
          }
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("Modal fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, type, companyId, selectedFY, selectedCompany]);

  const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((item) =>
      Object.values(item).some((val) =>
        String(val || "").toLowerCase().includes(s)
      )
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeSlideIn_0.3s_ease-out]">
      <div className="bg-white/95 dark:bg-slate-900/95 w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-white/70 dark:border-slate-700/70 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        
        {/* Apple Liquid Glass Modal Header */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 sm:gap-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 dark:from-purple-950/40 dark:to-indigo-950/40 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-base sm:text-xl shadow-lg shadow-indigo-500/30 flex-shrink-0">
              {type.includes("purchase") ? (
                <FaTruck />
              ) : type.includes("customer") ? (
                <FaUsers />
              ) : type.includes("product") ? (
                <FaBoxes />
              ) : type.includes("company") || type === "companies" ? (
                <FaBuilding />
              ) : type === "users" ? (
                <FaUserCheck />
              ) : (
                <FaChartLine />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2 truncate">
                {title}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                Metric Value: <span className="text-indigo-600 dark:text-indigo-400 font-black">{value}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {url && (
              <Link
                href={url}
                onClick={onClose}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-md shadow-indigo-500/20 transition whitespace-nowrap"
              >
                <span>Open Module</span> <FaExternalLinkAlt size={9} />
              </Link>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition flex-shrink-0"
            >
              <FaTimes className="text-xs sm:text-sm" />
            </button>
          </div>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 flex-shrink-0">
          <div className="relative w-full sm:max-w-sm">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder={`Search ${title}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          <div className="text-[11px] sm:text-xs font-extrabold text-slate-600 dark:text-slate-300 text-right sm:text-left">
            Total Records: <span className="text-indigo-600 dark:text-indigo-400 font-black">{filteredItems.length}</span>
          </div>
        </div>

        {/* Table Body - Mobile Responsive Scrollable */}
        <div className="p-3 sm:p-6 overflow-y-auto overflow-x-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              Loading live breakdown dataset...
            </div>
          ) : paginatedItems.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">
                      {type === "companies"
                        ? "Company Name"
                        : type === "users"
                        ? "User Name"
                        : type === "customers" || type === "active_customers"
                        ? "Customer / Party Name"
                        : type === "products"
                        ? "Product Name"
                        : type === "payments"
                        ? "Voucher / Vendor"
                        : "Reference / Title"}
                    </th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">
                      {type === "companies"
                        ? "Company Code"
                        : type === "users"
                        ? "Email / Role"
                        : type === "customers" || type === "active_customers"
                        ? "City / Code"
                        : type === "products"
                        ? "Company / Code"
                        : type === "payments"
                        ? "Payment Date / Ref"
                        : "Date / Info"}
                    </th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">
                      {type === "companies"
                        ? "Owner Name"
                        : type === "users"
                        ? "Mobile"
                        : type === "customers" || type === "active_customers"
                        ? "Balance / Phone"
                        : type === "products"
                        ? "Purchase Rate (₹)"
                        : type === "payments"
                        ? "Amount Paid (₹)"
                        : "Net Value (₹)"}
                    </th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 font-extrabold text-slate-900 dark:text-white">
                        {item.companyName || item.customer || item.PARNAM || item.partyName || item.PRODUCT || item.name || item.voucher || item.voucherNo || item.billNumber || item.vendorName || "N/A"}
                      </td>
                      <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-slate-500 font-mono">
                        {item.date || item.billDate || item.paymentDate || item.poDate || item.companyCode || item.email || item.CITY || item.companyName || item.code || "N/A"}
                      </td>
                      <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                        {type === "companies"
                          ? item.ownerName || "N/A"
                          : type === "users"
                          ? item.mobile || "N/A"
                          : type === "products"
                          ? item.PRATE ? `₹${Number(item.PRATE).toLocaleString("en-IN")}` : item.BALANCE ? `${item.BALANCE} Qty` : "N/A"
                          : (item.finalAmount || item.netAmount || item.amount || item.total || item.netTotal || item.balance || item.BALANCE)
                          ? `₹${Number(item.finalAmount || item.netAmount || item.amount || item.total || item.netTotal || item.balance || item.BALANCE || 0).toLocaleString("en-IN")}`
                          : item.PHONE1 || "N/A"}
                      </td>
                      <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {item.status || item.paymentStatus || (item.STATUS === "Y" ? "Active" : "Active")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              No live records found for {title}. Click &quot;Open Module Page&quot; to view complete master history.
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {filteredItems.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-semibold text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
            <div className="text-center sm:text-left">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredItems.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <FaChevronLeft size={10} />
              </button>
              <span className="font-bold text-slate-900 dark:text-white">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
