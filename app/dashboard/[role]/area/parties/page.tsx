"use client";

/**
 * app/dashboard/area/parties/page.tsx
 * -----------------------------------------------------------------------------
 * Full Party Directory — every real party from ORDER, searchable by name,
 * city, district, pincode, GST number, or state. Backed by
 * /api/dashboard/india-map/parties.
 *
 * City comes straight from ORDER.CITY. District & Pincode are NOT their own
 * VFP columns anywhere in the 8 exported tables — they're parsed out of
 * ORDER's free-text address lines (PARADD/PARADD1/PARADD2). When the
 * address text doesn't spell the district out explicitly, District falls
 * back to City (flagged with a small "~" so it reads as a best guess, not
 * a confirmed value) — see lib/indiaMapStateResolver.ts for exactly how.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

const BRAND = "#343872";

// Kept as a flat list here (not imported from the server-side resolver lib,
// which pulls in mongoose) purely for the filter dropdown's options.
const STATE_OPTIONS = [
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli",
    "Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
];

interface Party {
    name: string;
    city: string | null;
    district: string | null;
    districtSource: "address" | "city" | null;
    pincode: string | null;
    state: string | null;
    gstno: string | null;
    phone: string | null;
    area: string | null;
    orderNo: string | null;
    balance: number;
    isBuyer: boolean;
    isSupplier: boolean;
}

interface PartiesResponse {
    parties: Party[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    note: string;
}

function formatINR(value: number): string {
    const v = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (v >= 1_00_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000) return `${sign}₹${(v / 1_00_000).toFixed(2)} Lac`;
    return `${sign}₹${v.toLocaleString("en-IN")}`;
}

export default function PartyDirectoryPage() {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [sort, setSort] = useState<"balance" | "name" | "city">("balance");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PartiesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: data.isMrRestricted,
                        territories: data.territories || [],
                        allowedCompanyCodes: data.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    // Debounce the free-text search box so we don't fire a request per keystroke.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(t);
    }, [query]);

    // Reset to page 1 whenever a filter changes.
    useEffect(() => {
        setPage(1);
    }, [debouncedQuery, stateFilter, sort]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
            q: debouncedQuery,
            state: stateFilter,
            sort,
            page: String(page),
            pageSize: "25",
        });
        fetch(`/api/dashboard/india-map/parties?${params.toString()}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                return res.json();
            })
            .then((json) => setData(json))
            .catch((err) => setError(err.message || "Failed to load party directory"))
            .finally(() => setLoading(false));
    }, [debouncedQuery, stateFilter, sort, page]);

    return (
        <div className="min-h-screen w-full bg-gray-50 p-6 text-gray-900">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: BRAND }}>
                        Party Directory
                    </h1>
                    <p className="text-sm text-gray-500">
                        All parties from ORDER · City, District & Pincode parsed from party address
                    </p>
                </div>
                <Link
                    href="/dashboard/area"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                    ← Back to India Map
                </Link>
            </header>

            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ke customers dekh sakte hain.
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

            {/* ---------------- Filters ---------------- */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, city, district, pincode or GST…"
                    className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#343872] focus:outline-none sm:w-72"
                />
                <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-[#343872] focus:outline-none"
                >
                    <option value="">All States</option>
                    {STATE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "balance" | "name" | "city")}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-[#343872] focus:outline-none"
                >
                    <option value="balance">Sort: Balance (highest first)</option>
                    <option value="name">Sort: Name (A–Z)</option>
                    <option value="city">Sort: City (A–Z)</option>
                </select>
                {data && (
                    <span className="ml-auto text-sm text-gray-500">
                        {data.total.toLocaleString("en-IN")} {data.total === 1 ? "party" : "parties"} found
                    </span>
                )}
            </div>

            {/* ---------------- Table ---------------- */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                {error ? (
                    <p className="p-6 text-sm text-red-600">Couldn't load the directory: {error}</p>
                ) : (
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-3">Party</th>
                                <th className="px-4 py-3">City</th>
                                <th className="px-4 py-3">District</th>
                                <th className="px-4 py-3">Pincode</th>
                                <th className="px-4 py-3">State</th>
                                <th className="px-4 py-3">GSTIN</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                        Loading…
                                    </td>
                                </tr>
                            ) : !data || data.parties.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                        No parties match this search.
                                    </td>
                                </tr>
                            ) : (
                                data.parties.map((p, i) => (
                                    <tr key={`${p.name}-${i}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{p.name || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.city || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {p.district || "—"}
                                            {p.district && p.districtSource === "city" && (
                                                <span title="Guessed from City — no explicit district text found in the address">
                                                    {" "}
                                                    ~
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{p.pincode || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.state || "—"}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.gstno || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.phone || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {p.isBuyer && (
                                                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                                        Buyer
                                                    </span>
                                                )}
                                                {p.isSupplier && (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                        Supplier
                                                    </span>
                                                )}
                                                {!p.isBuyer && !p.isSupplier && <span className="text-xs text-gray-300">—</span>}
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-3 text-right font-semibold"
                                            style={{ color: p.balance < 0 ? "#dc2626" : "#16a34a" }}
                                        >
                                            {formatINR(p.balance)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ---------------- Pagination ---------------- */}
            {data && data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ← Prev
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {data.page} of {data.totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Next →
                    </button>
                </div>
            )}

            <p className="mt-4 text-xs text-gray-400">
                District & Pincode aren't separate columns in your MabsolCRM export — they're parsed from the party's
                address lines (PARADD/PARADD1/PARADD2). A "~" next to District means no explicit district text was
                found in the address, so City was used as the best available guess.
            </p>
        </div>
    );
}