"use client";

// File: src/app/dashboard/master/accounting-group-master/view/[id]/page.tsx
// Data source: GET /api/master/accounting-group/[id]  (see src/app/api/accountgroup/[id]/route.ts)

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    FaSitemap,
    FaArrowLeft,
    FaLayerGroup,
    FaUsers,
    FaBookOpen,
    FaChevronRight,
    FaWallet,
    FaExchangeAlt,
} from "react-icons/fa";

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

function yn(v: any) {
    return v === "Y" ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
            Yes
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-500 ring-1 ring-slate-500/30">
            No
        </span>
    );
}

function StatCard({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    tone: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${tone} text-white shrink-0`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-[11px] text-gray-500 truncate">{label}</p>
                <p className="text-sm font-semibold text-gray-700 tabular-nums truncate">{value}</p>
            </div>
        </div>
    );
}

export default function AccountGroupViewPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!params?.id) return;
        load(params.id as string);
    }, [params?.id]);

    const load = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/master/accounting-group/${id}`);
            if (!res.ok) throw new Error(res.status === 404 ? "Account group not found" : "Failed to load account group");
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center text-gray-400 py-16 text-sm">Loading account group...</div>;
    }

    if (error || !data) {
        return (
            <div className="text-center py-16">
                <p className="text-rose-500 text-sm mb-3">{error || "Account group not found"}</p>
                <Link
                    href="/dashboard/master/accounting-group-master"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#343872] text-white hover:bg-[#2a2d5c]"
                >
                    <FaArrowLeft size={10} /> Back to list
                </Link>
            </div>
        );
    }

    const { group, parentChain, children, customers, totals } = data;
    const bal = Number(group.BALANCE || 0);

    return (
        <div className="space-y-4">
            {/* ==================== HEADER CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => router.push("/dashboard/master/accounting-group-master")}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors shrink-0"
                        >
                            <FaArrowLeft size={12} />
                        </button>
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white shrink-0">
                            <FaSitemap size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0 truncate">
                            {group.PARNAM} <span className="text-white/60 font-normal">({group.ORDNO})</span>
                        </h5>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={`/dashboard/master/accounting-group-master/ledger/${group._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaBookOpen size={11} /> View Ledger
                        </Link>
                        <Link
                            href={`/dashboard/customers/`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200"
                        >
                            <FaUsers size={11} /> Customers
                        </Link>
                    </div>
                </div>

                {/* breadcrumb / hierarchy trail */}
                <div className="relative flex flex-wrap items-center gap-1.5 px-4 py-2.5 bg-white/40 border-b border-gray-200/60 text-xs text-gray-500">
                    <Link href="/dashboard/master/accounting-group-master" className="hover:text-[#343872] hover:underline">
                        All Groups
                    </Link>
                    {parentChain.map((p: any) => (
                        <span key={p._id} className="flex items-center gap-1.5">
                            <FaChevronRight size={9} className="text-gray-300" />
                            <Link
                                href={`/dashboard/master/accounting-group-master/view/${p._id}`}
                                className="hover:text-[#343872] hover:underline"
                            >
                                {p.PARNAM}
                            </Link>
                        </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                        <FaChevronRight size={9} className="text-gray-300" />
                        <span className="font-semibold text-gray-700">{group.PARNAM}</span>
                    </span>
                    {group.ISROOT && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/30">
                            Root Group
                        </span>
                    )}
                </div>
            </div>

            {/* ==================== STAT CARDS ==================== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatCard icon={<FaWallet size={14} />} label="Group Balance" value={money(bal)} tone="bg-[#343872]" />
                <StatCard icon={<FaLayerGroup size={14} />} label="Sub-Groups" value={group.CHILDCOUNT || 0} tone="bg-indigo-500" />
                <StatCard icon={<FaUsers size={14} />} label="Customers" value={totals.customerCount} tone="bg-violet-500" />
                <StatCard
                    icon={<FaExchangeAlt size={14} />}
                    label="Ledger Entries"
                    value={totals.ledgerTxnCount}
                    tone="bg-emerald-500"
                />
            </div>

            {/* ==================== MAIN GRID ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ---- Left: financial & flag details ---- */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="px-4 py-2.5 bg-white/50 border-b border-gray-200/60">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide m-0">Financial Summary</h6>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-4 text-sm">
                            <div>
                                <p className="text-[11px] text-gray-400">Opening Balance</p>
                                <p className="font-semibold text-gray-700 tabular-nums">{money(group.OPNING)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-400">Debit</p>
                                <p className="font-semibold text-gray-700 tabular-nums">{money(group.DEBIT)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-400">Credit</p>
                                <p className="font-semibold text-gray-700 tabular-nums">{money(group.CREDIT)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-400">Closing Balance</p>
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                        bal
                                    )}`}
                                >
                                    {money(bal)}
                                </span>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-400">Budget</p>
                                <p className="font-semibold text-gray-700 tabular-nums">{money(group.BUDGET)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-400">Control A/c</p>
                                <div className="mt-0.5">{yn(group.CON)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="px-4 py-2.5 bg-white/50 border-b border-gray-200/60">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide m-0">Voucher Applicability</h6>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-4 text-xs">
                            {[
                                ["Sales Debit", "SALDR"],
                                ["Sales Credit", "SALCR"],
                                ["Purchase Debit", "PURDR"],
                                ["Purchase Credit", "PURCR"],
                                ["Receipt Debit", "RECDR"],
                                ["Receipt Credit", "RECCR"],
                                ["Payment Debit", "PAYDR"],
                                ["Payment Credit", "PAYCR"],
                            ].map(([label, key]) => (
                                <div key={key} className="flex items-center justify-between rounded-lg bg-white/50 px-2.5 py-2 ring-1 ring-gray-100">
                                    <span className="text-gray-500">{label}</span>
                                    {yn(group[key])}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* customers table */}
                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-white/50 border-b border-gray-200/60">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide m-0">
                                Customers under this Group ({customers.length})
                            </h6>
                            <Link
                                href={`/dashboard/customers/full?group=${encodeURIComponent(group.ORDNO)}`}
                                className="text-[11px] font-medium text-blue-600 hover:underline"
                            >
                                View all
                            </Link>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-white/90 backdrop-blur">
                                    <tr className="border-b border-gray-200/70">
                                        <th className="text-left px-4 py-2 font-medium text-gray-500 uppercase tracking-wide">Code</th>
                                        <th className="text-left px-4 py-2 font-medium text-gray-500 uppercase tracking-wide">Name</th>
                                        <th className="text-left px-4 py-2 font-medium text-gray-500 uppercase tracking-wide">City</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-500 uppercase tracking-wide">Balance</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-500 uppercase tracking-wide">Ledger Entries</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-gray-400 py-8">
                                                No customers linked to this group
                                            </td>
                                        </tr>
                                    ) : (
                                        customers.map((c: any) => (
                                            <tr key={c._id} className="border-b border-gray-100/70 last:border-0 hover:bg-white/50">
                                                <td className="px-4 py-2 text-gray-600">{c.ORDNO}</td>
                                                <td className="px-4 py-2 text-gray-700 font-medium">{c.PARNAM}</td>
                                                <td className="px-4 py-2 text-gray-500">{c.CITY || "-"}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${balanceClasses(
                                                            c.BALANCE
                                                        )}`}
                                                    >
                                                        {money(c.BALANCE)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-500">{c.LEDGERTXNCOUNT}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ---- Right: hierarchy panel ---- */}
                <div className="space-y-4">
                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="px-4 py-2.5 bg-white/50 border-b border-gray-200/60">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide m-0">Sub-Groups ({children.length})</h6>
                        </div>
                        <div className="divide-y divide-gray-100/70 max-h-80 overflow-y-auto">
                            {children.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 text-xs">No sub-groups</p>
                            ) : (
                                children.map((c: any) => (
                                    <Link
                                        key={c._id}
                                        href={`/dashboard/master/accounting-group-master/view/${c._id}`}
                                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/60 transition-colors"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-xs font-medium text-gray-700 truncate">{c.PARNAM}</span>
                                            <span className="block text-[11px] text-gray-400">{c.ORDNO}</span>
                                        </span>
                                        <span
                                            className={`shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${balanceClasses(
                                                Number(c.BALANCE || 0)
                                            )}`}
                                        >
                                            {money(c.BALANCE)}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="px-4 py-2.5 bg-white/50 border-b border-gray-200/60">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide m-0">Ledger Rollup</h6>
                        </div>
                        <div className="px-4 py-4 space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Total Debit</span>
                                <span className="font-semibold text-gray-700 tabular-nums">{money(totals.ledgerDebit)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Total Credit</span>
                                <span className="font-semibold text-gray-700 tabular-nums">{money(totals.ledgerCredit)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                <span className="text-gray-500">Net Balance</span>
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${balanceClasses(
                                        totals.ledgerBalance
                                    )}`}
                                >
                                    {money(totals.ledgerBalance)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Active Customers</span>
                                <span className="font-semibold text-gray-700 tabular-nums">
                                    {totals.activeCustomerCount} / {totals.customerCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}