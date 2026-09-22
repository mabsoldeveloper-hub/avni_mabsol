"use client";

import { useEffect, useMemo, useState, useCallback, type ReactElement } from "react";
import Link from "next/link";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
    FaFileInvoice,
    FaRupeeSign,
    FaSearch,
    FaUndo,
    FaShoppingBag,
    FaTruck,
    FaChevronLeft,
    FaChevronRight,
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaFileInvoiceDollar,
    FaReceipt,
    FaPercentage,
    FaCheckCircle,
    FaPlus,
} from "react-icons/fa";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

type InvoiceRow = {
    _id: string;
    vcn: string;
    date: string;
    type: string;
    code: string;
    customer: string;
    city: string;
    gst: string;
    state: string;
    gstHeading: string;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    round: number;
    finalAmount: number;
    tax: number;
    total: number;
    billType?: string;
    isConverted?: boolean;
    convertedToVcn?: string;
    status?: string;
};

// Human-friendly label + color for a raw type code. Falls back to the raw
// code itself for any type not explicitly known, so new/unexpected types
// still show up correctly instead of being hidden.
const TYPE_META: Record<string, { label: string; activeClass: string }> = {
    S: { label: "Tax Invoices", activeClass: "bg-emerald-500 text-white shadow-sm" },
    PROFORMA: { label: "Proforma (Kaccha)", activeClass: "bg-amber-500 text-white shadow-sm" },
    ESTIMATE: { label: "Proforma (Kaccha)", activeClass: "bg-amber-500 text-white shadow-sm" },
    P: { label: "Purchase", activeClass: "bg-blue-500 text-white shadow-sm" },
    R: { label: "Return", activeClass: "bg-red-500 text-white shadow-sm" },
};

const FALLBACK_COLORS = [
    "bg-purple-500 text-white shadow-sm",
    "bg-cyan-500 text-white shadow-sm",
    "bg-pink-500 text-white shadow-sm",
    "bg-lime-500 text-white shadow-sm",
    "bg-fuchsia-500 text-white shadow-sm",
];

// Normalize PROFORMA/ESTIMATE into one bucket key so they share a single tab.
function normalizeTypeKey(row: InvoiceRow): string {
    const t = (row.type || row.billType || "").toUpperCase();
    if (t === "ESTIMATE") return "PROFORMA";
    return t || "UNKNOWN";
}

function typeLabel(key: string): string {
    return TYPE_META[key]?.label || key.charAt(0) + key.slice(1).toLowerCase();
}

function typeActiveClass(key: string, fallbackIndex: number): string {
    return TYPE_META[key]?.activeClass || FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

export default function InvoicePage() {

    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [search, setSearch] = useState("");
    // "ALL" or a normalized type key discovered dynamically from the data (e.g. "S", "P", "R", "PROFORMA", or any new type)
    const [typeTabFilter, setTypeTabFilter] = useState<string>("ALL");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
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

    const loadInvoices = useCallback(async () => {
        try {
            let url = "/api/sales/invoice";
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

            if (Array.isArray(data)) {
                setInvoices(data);
            } else if (data.invoices && Array.isArray(data.invoices)) {
                setInvoices(data.invoices);
            } else {
                console.error("Invalid API Response", data);
                setInvoices([]);
            }
        } catch (err) {
            console.error(err);
            setInvoices([]);
        }
    }, [selectedFY]);

    useEffect(() => {
        loadInvoices();
        const onFyChange = () => loadInvoices();
        window.addEventListener("financial-year-changed", onFyChange);
        return () => window.removeEventListener("financial-year-changed", onFyChange);
    }, [loadInvoices]);

    // Distinct type keys present in the loaded data, in a stable, sensible order.
    // Tabs are generated from this list, so any type in the data (S, P, R,
    // PROFORMA, or something new tomorrow) automatically gets its own tab.
    const availableTypes = useMemo(() => {
        const preferredOrder = ["S", "PROFORMA", "P", "R"];
        const found = new Set<string>();
        invoices.forEach((r) => found.add(normalizeTypeKey(r)));

        const ordered = preferredOrder.filter((k) => found.has(k));
        const rest = Array.from(found)
            .filter((k) => !preferredOrder.includes(k))
            .sort();

        return [...ordered, ...rest];
    }, [invoices]);

    // If the currently selected tab's type disappears from the data (e.g. after
    // a reload), fall back to "ALL" instead of showing an empty dead tab.
    useEffect(() => {
        if (typeTabFilter !== "ALL" && !availableTypes.includes(typeTabFilter)) {
            setTypeTabFilter("ALL");
        }
    }, [availableTypes, typeTabFilter]);

    // search, type filter (bill no, customer, city, billType) & date range filter
    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        let list = invoices;

        if (typeTabFilter !== "ALL") {
            list = list.filter((r) => normalizeTypeKey(r) === typeTabFilter);
        }

        if (dateFrom) {
            list = list.filter((r) => r.date && r.date >= dateFrom);
        }
        if (dateTo) {
            list = list.filter((r) => r.date && r.date <= dateTo);
        }

        if (!s) return list;

        return list.filter((row) =>
            String(row.vcn || "").toLowerCase().includes(s) ||
            String(row.customer || "").toLowerCase().includes(s) ||
            String(row.city || "").toLowerCase().includes(s)
        );
    }, [invoices, search, typeTabFilter, dateFrom, dateTo]);

    // reset to page 1 whenever search, type filter, or date range changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeTabFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, currentPage]);

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // build page number list (max 5 visible, with ellipsis)
    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }

        return pages;
    }, [currentPage, totalPages]);

    // Dashboard Cards — based on filtered (search + type + date) results
    const totalBills = filtered.length;

    // Filter out Purchase bills (type === "P") and Proforma bills for Total Sale calculation
    const saleInvoices = useMemo(() => {
        return filtered.filter((r) => r.type === "S" || r.billType === "S" || (!r.billType && r.type !== "P" && r.type !== "PROFORMA" && r.type !== "ESTIMATE" && r.type !== "R"));
    }, [filtered]);

    const totalSale = saleInvoices.reduce(
        (sum, row) => sum + Number(row.finalAmount || row.total || 0),
        0
    );

    const totalTaxable = saleInvoices.reduce(
        (sum, row) => sum + Number(row.taxable || 0),
        0
    );

    const totalTax = saleInvoices.reduce(
        (sum, row) => sum + Number(row.tax || (Number(row.cgst || 0) + Number(row.sgst || 0) + Number(row.igst || 0))),
        0
    );

    // Count of bills per type key, built dynamically from whatever types exist in the filtered data
    const countsByType = useMemo(() => {
        const map = new Map<string, number>();
        filtered.forEach((r) => {
            const key = normalizeTypeKey(r);
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }, [filtered]);

    const typeCardIcon: Record<string, ReactElement> = {
        S: <FaCheckCircle size={16} />,
        PROFORMA: <FaFileInvoice size={16} />,
        P: <FaTruck size={16} />,
        R: <FaUndo size={16} />,
    };
    const typeCardRing: Record<string, string> = {
        S: "from-green-400/40 to-emerald-500/40",
        PROFORMA: "from-amber-400/40 to-orange-500/40",
        P: "from-blue-400/40 to-sky-500/40",
        R: "from-red-400/40 to-rose-500/40",
    };
    const typeCardIconBg: Record<string, string> = {
        S: "bg-green-500/15 text-green-600",
        PROFORMA: "bg-amber-500/15 text-amber-600",
        P: "bg-blue-500/15 text-blue-600",
        R: "bg-red-500/15 text-red-600",
    };
    const typeCardGlow: Record<string, string> = {
        S: "group-hover:shadow-green-400/30",
        PROFORMA: "group-hover:shadow-amber-400/30",
        P: "group-hover:shadow-blue-400/30",
        R: "group-hover:shadow-red-400/30",
    };
    const fallbackCardRings = [
        "from-purple-400/40 to-fuchsia-500/40",
        "from-cyan-400/40 to-sky-500/40",
        "from-pink-400/40 to-rose-500/40",
        "from-lime-400/40 to-green-500/40",
    ];

    const typeBadge = (row: InvoiceRow) => {
        const t = row.type || row.billType;
        const isConverted = Boolean(row.isConverted) || row.status === "Converted" || Boolean(row.convertedToVcn);

        if (t === "PROFORMA" || t === "ESTIMATE") {
            if (isConverted) {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300" title={row.convertedToVcn ? `Converted to #${row.convertedToVcn}` : "Converted"}>
                        ✓ Converted {row.convertedToVcn ? `(#${row.convertedToVcn.replace(/^INV-/, "")})` : ""}
                    </span>
                );
            }
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    📋 Proforma (Kaccha)
                </span>
            );
        }
        if (t === "S")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20">
                    Tax Invoice (Pakka)
                </span>
            );
        if (t === "P")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 ring-1 ring-blue-500/20">
                    Purchase
                </span>
            );
        if (t === "R")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 ring-1 ring-red-500/20">
                    Return
                </span>
            );
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-400/20">
                Invoice
            </span>
        );
    };

    const summaryCards = [
        {
            title: "Total Bills",
            value: totalBills,
            icon: <FaReceipt size={16} />,
            ring: "from-indigo-400/40 to-blue-500/40",
            iconBg: "bg-indigo-500/15 text-indigo-600",
            glow: "group-hover:shadow-indigo-400/30",
        },
        {
            title: "Total Sale",
            value: "₹ " + totalSale.toLocaleString("en-IN"),
            icon: <FaRupeeSign size={16} />,
            ring: "from-emerald-400/40 to-green-500/40",
            iconBg: "bg-emerald-500/15 text-emerald-600",
            glow: "group-hover:shadow-emerald-400/30",
        },
        {
            title: "Taxable Amount",
            value: "₹ " + totalTaxable.toLocaleString("en-IN"),
            icon: <FaRupeeSign size={16} />,
            ring: "from-amber-400/40 to-yellow-500/40",
            iconBg: "bg-amber-500/15 text-amber-600",
            glow: "group-hover:shadow-amber-400/30",
        },
        {
            title: "Total Tax",
            value: "₹ " + totalTax.toLocaleString("en-IN"),
            icon: <FaPercentage size={16} />,
            ring: "from-rose-400/40 to-red-500/40",
            iconBg: "bg-rose-500/15 text-rose-600",
            glow: "group-hover:shadow-rose-400/30",
        },
        // One "<Type> Bills" card per distinct type found in the data — fully dynamic
        ...availableTypes.map((key, i) => ({
            title: `${typeLabel(key)} Bills`,
            value: countsByType.get(key) || 0,
            icon: typeCardIcon[key] || <FaFileInvoice size={16} />,
            ring: typeCardRing[key] || fallbackCardRings[i % fallbackCardRings.length],
            iconBg: typeCardIconBg[key] || "bg-purple-500/15 text-purple-600",
            glow: typeCardGlow[key] || "group-hover:shadow-purple-400/30",
        })),
    ];

    return (
        <div className="space-y-4">
            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ke sales invoices dekh sakte hain.
                            {mrTerritoryInfo.territories.length > 0 && (
                                <>
                                    {" "}Assigned:
                                    {" "}
                                    {Array.from(
                                        new Set(
                                            mrTerritoryInfo.territories.map(
                                                (t) => t.companyName || t.companyCode
                                            )
                                        )
                                    ).join(", ")}
                                </>
                            )}
                        </p>
                        {mrTerritoryInfo.territories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {mrTerritoryInfo.territories.map((t, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                                    >
                                        <FaBuilding size={8} />
                                        {t.companyName || t.companyCode}
                                        {t.divisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.divisionName}
                                            </>
                                        ) : null}
                                        {t.subDivisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.subDivisionName}
                                            </>
                                        ) : null}
                                        {t.categoryName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.categoryName}
                                            </>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {summaryCards.map((card, index) => (
                    <div
                        key={index}
                        className={`
              group relative rounded-2xl p-[1px]
              bg-gradient-to-br ${card.ring}
              transition-all duration-500 ease-out
              hover:-translate-y-1.5 hover:scale-[1.02]
            `}
                    >
                        {/* Glass body */}
                        <div
                            className={`
                relative h-full rounded-2xl overflow-hidden
                bg-white/60 backdrop-blur-xl
                border border-white/40
                shadow-[0_4px_20px_rgba(0,0,0,0.06)]
                transition-all duration-500 ease-out
                group-hover:shadow-xl ${card.glow}
                p-3
              `}
                        >
                            {/* subtle top sheen — liquid glass highlight */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                            {/* animated shine sweep on hover */}
                            <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

                            <div className="relative flex items-start justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
                                        {card.title}
                                    </p>
                                    <h3
                                        className={`mt-0.5 font-semibold text-gray-800 tabular-nums whitespace-nowrap ${String(card.value ?? 0).length > 9
                                            ? "text-sm"
                                            : String(card.value ?? 0).length > 6
                                                ? "text-base"
                                                : "text-lg"
                                            }`}
                                    >
                                        {card.value ?? 0}
                                    </h3>
                                </div>

                                <div
                                    className={`
                    flex items-center justify-center h-8 w-8 rounded-lg shrink-0
                    ${card.iconBg}
                    ring-1 ring-white/50
                    transition-transform duration-500
                    group-hover:scale-110 group-hover:rotate-3
                  `}
                                >
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* invoice register table */}
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
                <div className="relative flex flex-col gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                                <FaFileInvoiceDollar size={14} />
                            </div>
                            <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                                Invoice Register
                            </h5>
                        </div>

                        <Link
                            href="/dashboard/sales/invoice/create"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition"
                        >
                            <FaPlus size={10} /> + Create Invoice
                        </Link>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* TYPE FILTER TABS */}
                        <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/20 text-xs flex-wrap gap-0.5">
                            <button
                                type="button"
                                onClick={() => setTypeTabFilter("ALL")}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${typeTabFilter === "ALL"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-white/80 hover:text-white"
                                    }`}
                            >
                                All
                            </button>
                            {/* Tabs generated dynamically from whatever types actually exist in the data */}
                            {availableTypes.map((key, i) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTypeTabFilter(key)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap ${typeTabFilter === key
                                        ? typeActiveClass(key, i)
                                        : "text-white/80 hover:text-white"
                                        }`}
                                >
                                    {typeLabel(key)}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* DATE RANGE FILTER */}
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg text-xs bg-white/15 text-white ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md [color-scheme:dark]"
                                />
                                <span className="text-white/50 text-xs">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg text-xs bg-white/15 text-white ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md [color-scheme:dark]"
                                />
                                {(dateFrom || dateTo) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDateFrom("");
                                            setDateTo("");
                                        }}
                                        className="text-white/60 hover:text-white text-[11px] underline whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* SEARCH BOX */}
                            <div className="relative w-full sm:w-72">
                                <FaSearch
                                    size={12}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search Bill No, Customer, City..."
                                    className="
                    w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
                    bg-white/15 text-white placeholder-white/60
                    ring-1 ring-white/25 focus:ring-white/50
                    outline-none backdrop-blur-md
                    transition-all duration-200
                  "
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* body */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200/70 bg-white/30">
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Bill No</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Date</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">City</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Party Type</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Taxable</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">CGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">SGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">IGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                                <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs uppercase tracking-wide">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((row, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-2.5 text-left text-gray-700 font-semibold">
                                            {row.vcn}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.date}
                                        </td>
                                        <td className="px-4 py-2.5 text-left">
                                            {typeBadge(row)}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.customer}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.city}
                                        </td>
                                        <td className="px-4 py-2.5 text-left">
                                            {row.gstHeading?.toUpperCase().includes("LOCAL") ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20">
                                                    Local
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-500/20">
                                                    Central
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            ₹ {Number(row.taxable || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "-"
                                                : "₹ " + Number(row.cgst || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "-"
                                                : "₹ " + Number(row.sgst || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "₹ " + Number(row.igst || 0).toLocaleString("en-IN")
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-800 font-bold tabular-nums">
                                            ₹ {Number(row.total || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {(row.type === "PROFORMA" || row.billType === "PROFORMA") && !Boolean(row.isConverted) && row.status !== "Converted" && !row.convertedToVcn && (
                                                    <Link
                                                        href={`/dashboard/sales/invoice/create?convertFrom=${encodeURIComponent(row.vcn)}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                                                        title="Convert this Proforma / Kaccha Bill into a Final Tax Invoice"
                                                    >
                                                        ⚡ Convert
                                                    </Link>
                                                )}
                                                <Link
                                                    href={`/dashboard/sales/invoice/${encodeURIComponent(row.vcn)}`}
                                                    className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors duration-200"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={12} className="text-center text-gray-400 py-8 text-sm">
                                        No Invoice Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* pagination footer */}
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
                            className="
                flex items-center justify-center h-7 w-7 rounded-lg
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-gray-800 hover:text-white hover:ring-gray-800
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
                        >
                            <FaChevronLeft size={10} />
                        </button>

                        {pageNumbers.map((p, i) =>
                            p === "..." ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    className="flex items-center justify-center h-7 w-7 text-gray-400"
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p as number)}
                                    className={`
                    flex items-center justify-center h-7 w-7 rounded-lg text-xs font-medium
                    transition-all duration-200
                    ${currentPage === p
                                            ? "bg-gray-800 text-white ring-1 ring-gray-800"
                                            : "bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-800 hover:text-white hover:ring-gray-800"
                                        }
                  `}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="
                flex items-center justify-center h-7 w-7 rounded-lg
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-gray-800 hover:text-white hover:ring-gray-800
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}