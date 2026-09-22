"use client";

// File: src/app/dashboard/master/accounting-group-master/ledger/[id]/page.tsx
// Data source: GET /api/master/accounting-group/[id]/ledger  (see src/app/api/accountgroup/[id]/ledger/route.ts)
//
// Requires the "xlsx" package for the Excel export button:
//   npm install xlsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { FaBookOpen, FaArrowLeft, FaSearch, FaFileExcel, FaUndo, FaSitemap } from "react-icons/fa";

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

const fmtDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function StatChip({ label, value, tone }: { label: string; value: string | number; tone: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">{value}</span>
        </div>
    );
}

export default function AccountGroupLedgerPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [book, setBook] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        if (!params?.id) return;
        load(params.id as string);
    }, [params?.id]);

    const load = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/master/accounting-group/${id}/ledger`);
            if (!res.ok) throw new Error(res.status === 404 ? "Account group not found" : "Failed to load ledger");
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const entries: any[] = data?.entries || [];

    const bookOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.BOOK).filter(Boolean))).sort(), [entries]);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return entries.filter((e) => {
            if (
                s &&
                !(
                    (e.PARTYNAME || "").toLowerCase().includes(s) ||
                    (e.PARTYCODE || "").toLowerCase().includes(s) ||
                    (e.REMARK1 || "").toLowerCase().includes(s) ||
                    String(e.VOUCHER || "").toLowerCase().includes(s)
                )
            )
                return false;
            if (book && e.BOOK !== book) return false;
            if (fromDate && e.DATE && new Date(e.DATE) < new Date(fromDate)) return false;
            if (toDate && e.DATE && new Date(e.DATE) > new Date(toDate)) return false;
            return true;
        });
    }, [entries, search, book, fromDate, toDate]);

    const resetFilters = () => {
        setSearch("");
        setBook("");
        setFromDate("");
        setToDate("");
    };

    const totalDebit = filtered.reduce((s, e) => s + Number(e.DEBIT || 0), 0);
    const totalCredit = filtered.reduce((s, e) => s + Number(e.CREDIT || 0), 0);

    const exportToExcel = () => {
        const rows = filtered.map((e) => ({
            Date: fmtDate(e.DATE),
            "Party Code": e.PARTYCODE,
            "Party Name": e.PARTYNAME,
            Book: e.BOOK,
            Type: e.TYPE,
            Voucher: e.VOUCHER,
            Debit: e.DEBIT,
            Credit: e.CREDIT,
            "Running Balance": e.RUNNINGBALANCE,
            Remark: e.REMARK1,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");
        XLSX.writeFile(wb, `account_group_ledger_export_${Date.now()}.xlsx`);
    };

    if (loading) {
        return <div className="text-center text-gray-400 py-16 text-sm">Loading ledger...</div>;
    }

    if (error || !data) {
        return (
            <div className="text-center py-16">
                <p className="text-rose-500 text-sm mb-3">{error || "Ledger not found"}</p>
                <Link
                    href="/dashboard/master/accounting-group-master"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#343872] text-white hover:bg-[#2a2d5c]"
                >
                    <FaArrowLeft size={10} /> Back to list
                </Link>
            </div>
        );
    }

    const { group, openingBalance, totals } = data;

    return (
        <div className="space-y-4">
            {/* ==================== STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2">
                <StatChip label="Opening Balance" value={money(openingBalance)} tone="bg-slate-500" />
                <StatChip label="Total Debit" value={money(totalDebit)} tone="bg-rose-500" />
                <StatChip label="Total Credit" value={money(totalCredit)} tone="bg-emerald-500" />
                <StatChip label="Closing Balance" value={money(totals.balance)} tone="bg-[#343872]" />
                <StatChip label="Entries" value={filtered.length} tone="bg-indigo-500" />
            </div>

            {/* ==================== MAIN CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => router.push(`/dashboard/master/accounting-group-master/view/${group._id}`)}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors shrink-0"
                        >
                            <FaArrowLeft size={12} />
                        </button>
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white shrink-0">
                            <FaBookOpen size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0 truncate">
                            Ledger — {group.PARNAM} <span className="text-white/60 font-normal">({group.ORDNO})</span>
                        </h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search party, voucher, remark..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <Link
                            href={`/dashboard/master/accounting-group-master/view/${group._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaSitemap size={11} /> Group Profile
                        </Link>

                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200"
                        >
                            <FaFileExcel size={12} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* filters row */}
                <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">
                    <select
                        value={book}
                        onChange={(e) => setBook(e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                    >
                        <option value="">All Books</option>
                        {bookOptions.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                    />
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                    />
                    <button
                        onClick={resetFilters}
                        className="flex items-center justify-center gap-1.5 text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                    >
                        <FaUndo size={10} /> Reset
                    </button>
                </div>

                {/* table body */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200/70 bg-white/30">
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Date</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Party</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Book / Type</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Voucher</th>
                                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Debit</th>
                                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Credit</th>
                                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Balance</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-400 py-10 text-sm">
                                        No ledger entries found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((e) => (
                                    <tr
                                        key={e._id}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{fmtDate(e.DATE)}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-700 font-medium">
                                            {e.PARTYNAME || e.PARTYCODE}
                                            <span className="block text-[11px] text-gray-400 font-normal">{e.PARTYCODE}</span>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                                            {e.BOOK || "-"} {e.TYPE ? `/ ${e.TYPE}` : ""}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">{e.VOUCHER ?? "-"}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right tabular-nums text-gray-600">
                                            {e.DEBIT ? money(e.DEBIT) : "-"}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right tabular-nums text-gray-600">
                                            {e.CREDIT ? money(e.CREDIT) : "-"}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right tabular-nums">
                                            <span
                                                className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                                    e.RUNNINGBALANCE
                                                )}`}
                                            >
                                                {money(e.RUNNINGBALANCE)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 max-w-xs truncate text-gray-500" title={e.REMARK1}>
                                            {e.REMARK1 || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* footer */}
                <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                    <span>{filtered.length} of {entries.length} entries shown</span>
                    <span>
                        Net movement:{" "}
                        <span className="font-semibold text-gray-700">{money(totalDebit - totalCredit)}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}