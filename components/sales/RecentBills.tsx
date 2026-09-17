"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
    FaFileInvoice,
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type Bill = {
    _id: string;
    VOUCHER: string;
    VCN?: string;
    DATE: string;
    customer: string;
    city: string;
    MACHINEBY: string;
    FINAL: number;
};

export default function RecentBills() {

    const [bills, setBills] = useState<Bill[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;
    const { selectedFY } = useFinancialYear();
    const { selectedCompany } = useCompany();

    const loadBills = useCallback(async () => {
        const params = new URLSearchParams();
        if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

        if (selectedFY) {
            if (selectedFY.isAll) {
                params.set("fyId", "ALL");
            } else if (selectedFY._id) {
                params.set("fyId", selectedFY._id);
                if (selectedFY.startDate && selectedFY.endDate) {
                    const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                    const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                    params.set("startDate", s);
                    params.set("endDate", e);
                }
            }
        }

        const url = `/api/sales/recent?${params.toString()}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (Array.isArray(data)) {
                setBills(data);
            } else {
                setBills([]);
            }
        } catch (err) {
            console.error(err);
            setBills([]);
        }
    }, [selectedFY?._id, selectedCompany?._id]);

    useEffect(() => {
        loadBills();
    }, [loadBills]);

    // search filter (voucher + customer + city + user)
    const filteredBills = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return bills;

        return bills.filter((b) => {
            const voucher = String(b.VOUCHER ?? "").toLowerCase();
            const customer = String(b.customer ?? "").toLowerCase();
            const city = String(b.city ?? "").toLowerCase();
            const user = String(b.MACHINEBY ?? "").toLowerCase();
            return (
                voucher.includes(q) ||
                customer.includes(q) ||
                city.includes(q) ||
                user.includes(q)
            );
        });
    }, [bills, search]);

    // reset to page 1 whenever search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));

    const paginatedBills = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBills.slice(start, start + pageSize);
    }, [filteredBills, currentPage]);

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    return (
        <div
            className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
        >
            {/* top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

            {/* header */}
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-orange-500/85 to-amber-500/85 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
                        <FaFileInvoice size={14} />
                    </div>
                    <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                        Recent Bills
                    </h5>
                </div>

                <div className="relative w-full sm:w-64">
                    <FaSearch
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search voucher, customer, city..."
                        className="
              w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
              bg-white/20 text-white placeholder-white/70
              ring-1 ring-white/30 focus:ring-white/60
              outline-none backdrop-blur-md
              transition-all duration-200
            "
                    />
                </div>
            </div>

            {/* body */}
            <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200/70 bg-white/30">
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Voucher
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Date
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Customer
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                City
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                User
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Amount
                            </th>
                            <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedBills.length > 0 ? (
                            paginatedBills.map((bill) => (
                                <tr
                                    key={bill._id}
                                    className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                >
                                    <td className="px-4 py-2.5 text-left text-gray-700 font-semibold">
                                        {bill.VOUCHER}
                                    </td>
                                    <td className="px-4 py-2.5 text-left text-gray-600">
                                        {bill.DATE}
                                    </td>
                                    <td className="px-4 py-2.5 text-left text-gray-600">
                                        {bill.customer}
                                    </td>
                                    <td className="px-4 py-2.5 text-left text-gray-600">
                                        {bill.city}
                                    </td>
                                    <td className="px-4 py-2.5 text-left text-gray-600">
                                        {bill.MACHINEBY}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                        ₹ {Number(bill.FINAL || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <Link
                                            href={`/dashboard/sales/invoice/${encodeURIComponent(bill.VOUCHER || bill.VCN || bill._id)}`}
                                            className="
                        inline-flex items-center justify-center
                        px-3 py-1 rounded-lg text-xs font-medium
                        bg-orange-500 text-white
                        hover:bg-orange-600
                        transition-colors duration-200
                      "
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center text-gray-400 py-8 text-sm">
                                    No Bills Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* pagination footer */}
            <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                <span>
                    Page{" "}
                    <span className="font-semibold text-gray-700">
                        {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-700">
                        {totalPages}
                    </span>{" "}
                    &middot; {filteredBills.length} results
                </span>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-orange-500 hover:text-white hover:ring-orange-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
                    >
                        <FaChevronLeft size={10} />
                    </button>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-orange-500 hover:text-white hover:ring-orange-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
                    >
                        <FaChevronRight size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}