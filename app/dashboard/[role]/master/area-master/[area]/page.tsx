"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    ColumnDef,
} from "@tanstack/react-table";
import {
    FaArrowLeft,
    FaMapMarkerAlt,
    FaSearch,
    FaUsers,
    FaWallet,
    FaCoins,
    FaPiggyBank,
    FaFileInvoiceDollar,
    FaPhoneAlt,
    FaWhatsapp,
    FaFileExcel,
    FaChevronLeft,
    FaChevronRight,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaShieldAlt,
    FaUserCheck,
} from "react-icons/fa";

interface PartyRow {
    name: string;
    city: string | null;
    district: string | null;
    districtSource: "address" | "city" | null;
    pincode: string | null;
    state: string | null;
    gstno: string | null;
    phone: string | null;
    balance: number;
    isBuyer: boolean;
    isSupplier: boolean;
    totalSales: number;
    saleCount: number;
    lastSaleDate: any;
    totalPurchase: number;
    purchaseCount: number;
    lastPurchaseDate: any;
    ledgerBalance: number;
    ordno: string;
}

interface AreaDetailResponse {
    area: string;
    summary: {
        totalCustomers: number;
        totalOutstanding: number;
        totalCreditBal: number;
        totalSales: number;
        totalPurchase: number;
        gstCount: number;
        phoneCount: number;
        gstPercent?: number;
        phonePercent?: number;
        avgBalance?: number;
        topPartyName?: string;
        topPartySales?: number;
    } | null;
    parties: PartyRow[];
}

const columnHelper = createColumnHelper<PartyRow>();

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

function StatChip({
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
        <div className="flex items-center gap-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <div className={`flex items-center justify-center h-7 w-7 rounded-lg text-white ${tone}`}>{icon}</div>
            <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-gray-500">{label}</span>
                <span className="text-xs font-bold text-gray-800 tabular-nums">{value}</span>
            </div>
        </div>
    );
}

export default function AreaDetailPage() {
    const params = useParams<{ area: string }>();
    const areaName = (params.area || "").toString();

    const [data, setData] = useState<AreaDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    // Quick filter pill state: "all" | "buyer" | "supplier" | "outstanding" | "credit" | "gst" | "phone"
    const [partyFilter, setPartyFilter] = useState<string>("all");

    const [sorting, setSorting] = useState<SortingState>([]);
    const [pageSize, setPageSize] = useState<number>(10);

    useEffect(() => {
        if (!areaName) return;
        setLoading(true);
        setError(null);
        fetch(`/api/master/area/${encodeURIComponent(areaName)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                return res.json();
            })
            .then((json) => setData(json))
            .catch((err) => setError(err.message || "Failed to load area details"))
            .finally(() => setLoading(false));
    }, [areaName]);

    const filteredParties = useMemo(() => {
        const s = search.trim().toUpperCase();
        let base = (data?.parties || []).filter((p) => {
            if (!s) return true;
            return [p.name, p.city, p.district, p.pincode, p.state, p.gstno, p.phone]
                .filter(Boolean)
                .some((v) => String(v).toUpperCase().includes(s));
        });

        if (partyFilter === "buyer") base = base.filter((p) => p.isBuyer);
        else if (partyFilter === "supplier") base = base.filter((p) => p.isSupplier);
        else if (partyFilter === "outstanding") base = base.filter((p) => p.balance > 0);
        else if (partyFilter === "credit") base = base.filter((p) => p.balance < 0);
        else if (partyFilter === "gst") base = base.filter((p) => !!p.gstno);
        else if (partyFilter === "phone") base = base.filter((p) => !!p.phone);

        return base;
    }, [data, search, partyFilter]);

    const columns = useMemo(() => {
        const cols: ColumnDef<PartyRow, any>[] = [
            columnHelper.accessor("name", {
                header: "Party Name",
                cell: (info) => <span className="font-semibold text-gray-800">{info.getValue() || "—"}</span>,
            }),
            columnHelper.accessor("city", {
                header: "City",
                cell: (info) => <span className="text-gray-600">{info.getValue() || "—"}</span>,
            }),
            columnHelper.accessor("district", {
                header: "District",
                cell: (info) => (
                    <span className="text-gray-600">
                        {info.getValue() || "—"}
                        {info.row.original.districtSource === "city" && (
                            <span title="Derived from city" className="text-[10px] text-amber-500 font-bold ml-1">
                                ~
                            </span>
                        )}
                    </span>
                ),
            }),
            columnHelper.accessor("pincode", {
                header: "Pincode",
                cell: (info) => <span className="text-gray-600 tabular-nums">{info.getValue() || "—"}</span>,
            }),
            columnHelper.accessor("state", {
                header: "State",
                cell: (info) => <span className="text-gray-600">{info.getValue() || "—"}</span>,
            }),
            columnHelper.accessor("gstno", {
                header: "GSTIN",
                cell: (info) => <span className="font-mono text-xs text-gray-500">{info.getValue() || "—"}</span>,
            }),
            columnHelper.accessor("phone", {
                header: "Phone / Contact",
                cell: (info) => {
                    const raw = info.getValue();
                    if (!raw) return <span className="text-gray-400">—</span>;
                    const digits = String(raw).replace(/\D/g, "");
                    const waNum = digits.length === 10 ? `91${digits}` : digits;

                    return (
                        <div className="flex items-center gap-1.5 tabular-nums">
                            <span className="text-gray-700">{raw}</span>
                            {digits && (
                                <div className="flex items-center gap-1 ml-1">
                                    <a
                                        href={`https://wa.me/${waNum}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Chat on WhatsApp"
                                        className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                                    >
                                        <FaWhatsapp size={12} />
                                    </a>
                                    <a
                                        href={`tel:${raw}`}
                                        title="Call Phone"
                                        className="p-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                    >
                                        <FaPhoneAlt size={11} />
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                },
            }),
            columnHelper.accessor("balance", {
                header: "Balance",
                cell: (info) => {
                    const n = Number(info.getValue() || 0);
                    return (
                        <div className="text-right">
                            <span
                                className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                    n
                                )}`}
                            >
                                {money(n)}
                            </span>
                        </div>
                    );
                },
            }),
            columnHelper.accessor("totalSales", {
                header: "Total Sales",
                cell: (info) => <div className="text-right tabular-nums text-gray-700">{money(info.getValue())}</div>,
            }),
            columnHelper.accessor("totalPurchase", {
                header: "Total Purchase",
                cell: (info) => <div className="text-right tabular-nums text-gray-700">{money(info.getValue())}</div>,
            }),
            columnHelper.accessor("lastSaleDate", {
                header: "Last Sale",
                cell: (info) => <span className="text-gray-500 text-xs">{fmtDate(info.getValue())}</span>,
            }),
        ];

        return cols;
    }, []);

    const numericTypes = new Set(["balance", "totalSales", "totalPurchase"]);

    const table = useReactTable({
        data: filteredParties,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize, table]);

    const exportAreaExcel = () => {
        if (!data || !filteredParties.length) return;
        const rows = filteredParties.map((p) => ({
            "Party Name": p.name,
            "City": p.city || "",
            "District": p.district || "",
            "Pincode": p.pincode || "",
            "State": p.state || "",
            "GSTIN": p.gstno || "",
            "Phone": p.phone || "",
            "Buyer": p.isBuyer ? "Yes" : "No",
            "Supplier": p.isSupplier ? "Yes" : "No",
            "Balance (INR)": p.balance,
            "Total Sales (INR)": p.totalSales,
            "Total Purchase (INR)": p.totalPurchase,
            "Last Sale Date": fmtDate(p.lastSaleDate),
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Parties");
        XLSX.writeFile(wb, `${areaName}_customer_directory_${Date.now()}.xlsx`);
    };

    return (
        <div className="min-h-screen w-full space-y-4 p-4 sm:p-6">
            {/* ==================== NAVIGATION BACK LINK ==================== */}
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/master/area-master/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#343872] transition-colors"
                >
                    <FaArrowLeft size={11} /> Back to Area Master
                </Link>

                <button
                    type="button"
                    onClick={exportAreaExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all"
                >
                    <FaFileExcel size={12} /> Export Area Excel
                </button>
            </div>

            {/* ==================== ANALYTICS STAT STRIP ==================== */}
            {data?.summary && (
                <div className="flex flex-wrap gap-2.5 items-center">
                    <StatChip
                        icon={<FaUsers size={12} />}
                        label="Customers"
                        value={data.summary.totalCustomers.toLocaleString("en-IN")}
                        tone="bg-blue-500"
                    />
                    <StatChip
                        icon={<FaWallet size={12} />}
                        label="Outstanding (Dr)"
                        value={money(data.summary.totalOutstanding)}
                        tone="bg-rose-500"
                    />
                    <StatChip
                        icon={<FaPiggyBank size={12} />}
                        label="Advance (Cr)"
                        value={money(data.summary.totalCreditBal)}
                        tone="bg-emerald-500"
                    />
                    <StatChip
                        icon={<FaCoins size={12} />}
                        label="Total Sales"
                        value={money(data.summary.totalSales)}
                        tone="bg-indigo-500"
                    />
                    <StatChip
                        icon={<FaFileInvoiceDollar size={12} />}
                        label="Total Purchase"
                        value={money(data.summary.totalPurchase)}
                        tone="bg-violet-500"
                    />
                    <StatChip
                        icon={<FaShieldAlt size={12} />}
                        label="GST Compliance"
                        value={`${data.summary.gstPercent ?? Math.round((data.summary.gstCount / (data.summary.totalCustomers || 1)) * 100)}%`}
                        tone="bg-amber-500"
                    />
                    <StatChip
                        icon={<FaPhoneAlt size={12} />}
                        label="Phone Coverage"
                        value={`${data.summary.phonePercent ?? Math.round((data.summary.phoneCount / (data.summary.totalCustomers || 1)) * 100)}%`}
                        tone="bg-teal-500"
                    />
                </div>
            )}

            {/* ==================== MAIN CUSTOMER TABLE CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* Header Toolbar */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 text-white">
                            <FaMapMarkerAlt size={16} />
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-white tracking-wide m-0">{areaName || "—"}</h5>
                            <p className="text-[11px] text-white/70 m-0">Commercial territory party directory</p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search party, city, district, pincode, GST, phone…"
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Quick Filter Pills Strip */}
                <div className="relative flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/40 border-b border-gray-200/60 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        <button
                            type="button"
                            onClick={() => setPartyFilter("all")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "all" ? "bg-[#343872] text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            All ({data?.parties?.length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("buyer")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "buyer" ? "bg-green-700 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Buyers
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("supplier")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "supplier" ? "bg-blue-700 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Suppliers
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("outstanding")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "outstanding" ? "bg-rose-600 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Outstanding (Dr)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("credit")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "credit" ? "bg-emerald-700 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Advance (Cr)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("gst")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "gst" ? "bg-amber-600 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            With GST
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartyFilter("phone")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                partyFilter === "phone" ? "bg-teal-700 text-white shadow-sm" : "bg-white/70 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            With Phone
                        </button>
                    </div>

                    <span className="text-gray-500 font-medium text-xs">
                        Showing {filteredParties.length} of {data?.parties?.length || 0} parties
                    </span>
                </div>

                {/* Table View */}
                <div className="relative overflow-x-auto">
                    {error ? (
                        <p className="p-6 text-sm text-red-600">Failed to load area details: {error}</p>
                    ) : (
                        <table className="w-full min-w-[1050px] text-sm">
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/40">
                                        {headerGroup.headers.map((header) => {
                                            const sortDir = header.column.getIsSorted();
                                            const isNumeric = numericTypes.has(header.column.id);
                                            return (
                                                <th
                                                    key={header.id}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider ${
                                                        isNumeric ? "text-right" : "text-left"
                                                    } hover:text-[#343872] transition-colors`}
                                                >
                                                    <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {header.column.getCanSort() &&
                                                            (sortDir === "asc" ? (
                                                                <FaSortUp size={11} className="text-[#343872]" />
                                                            ) : sortDir === "desc" ? (
                                                                <FaSortDown size={11} className="text-[#343872]" />
                                                            ) : (
                                                                <FaSort size={10} className="text-gray-300" />
                                                            ))}
                                                    </span>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="text-center text-gray-400 py-12 text-sm">
                                            Loading area party directory…
                                        </td>
                                    </tr>
                                ) : table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-100/70 last:border-0 hover:bg-indigo-50/30 transition-colors duration-200"
                                        >
                                            {row.getVisibleCells().map((cell) => {
                                                const isNumeric = numericTypes.has(cell.column.id);
                                                return (
                                                    <td
                                                        key={cell.id}
                                                        className={`px-4 py-2.5 whitespace-nowrap text-gray-700 ${
                                                            isNumeric ? "text-right" : "text-left"
                                                        }`}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="text-center text-gray-400 py-12 text-sm">
                                            No parties in this area match the active filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Controls & Pagination */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/40 text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                        <span>
                            Page <span className="font-semibold text-gray-800">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                            <span className="font-semibold text-gray-800">{table.getPageCount() || 1}</span> &middot;{" "}
                            <span className="font-semibold text-gray-800">{filteredParties.length}</span> parties
                        </span>

                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded-lg px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs outline-none focus:ring-[#343872]"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={9999}>All</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>
                        <button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/70 border border-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:border-[#343872] disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}