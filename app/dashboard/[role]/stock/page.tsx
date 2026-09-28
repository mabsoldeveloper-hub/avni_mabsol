"use client";

/**
 * app/dashboard/stock/page.tsx
 * -----------------------------------------------------------------------
 * Pharma Stock Dashboard — Apple "Liquid Glass" theme.
 * Every table section uses <DataTable /> (TanStack Table) which gives
 * search + sorting + pagination out of the box.
 *
 * Install once in your project:
 *   npm install @tanstack/react-table lucide-react
 *
 * Fetches: GET /api/dashboard/stock-dashboard
 * -----------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import CurrentStockModal from "@/components/CurrentStockModal";
import NearExpiryModal from "@/components/NearExpiryModal";
import ExpiredBatchesModal from "@/components/ExpiredBatchesModal";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
    Package,
    Boxes,
    Layers,
    IndianRupee,
    AlertTriangle,
    XCircle,
    Clock,
    Ban,
    Truck,
    TrendingUp,
    Receipt,
    Building2,
} from "lucide-react";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

type DashboardData = {
    success: boolean;
    generatedAt: string;
    kpis: Record<string, number>;
    stockSummary: Record<string, number | null>;
    lowStock: any[];
    outOfStock: any[];
    nearExpiry: any[];
    expiredStock: any[];
    topSelling: any[];
    slowMoving: any[];
    stockValueByCompany: any[];
    latestDispatch: any[];
    latestSales: any[];
    recentActivity: any[];
    financialSummary: {
        totalDebit: number;
        totalCredit: number;
        netBalance: number;
        totalEntries: number;
        recentEntries: any[];
    };
    pendingAdjustments: {
        totalPendingVouchers: number;
        totalPendingValue: number;
        recent: any[];
    };
};

const inr = (n: number | null | undefined) =>
    n == null
        ? "—"
        : new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(n);

const num = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN").format(n);

export default function StockDashboard() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isNearExpiryModalOpen, setIsNearExpiryModalOpen] = useState(false);
    const [isExpiredBatchesModalOpen, setIsExpiredBatchesModalOpen] = useState(false);

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadStockDashboard();
    }, [selectedCompany?._id, selectedFY?._id]);

    const loadStockDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            if (selectedFY?._id) params.set("fyId", selectedFY._id);

            const res = await fetch(`/api/dashboard/stock-dashboard?${params.toString()}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load");
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

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

    /* ---------------------------------------------------------------- */
    /* Column definitions (hooks must run unconditionally, before any   */
    /* early return, so they sit above the loading/error checks below)  */
    /* ---------------------------------------------------------------- */
    const lowStockCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "product", header: "Product" },
            { accessorKey: "company", header: "Company" },
            { accessorKey: "currentQty", header: "Current", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "minimumQty", header: "Min", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "requiredQty", header: "Required", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "lastSaleDate", header: "Last Sale", cell: (i) => i.getValue() ?? "—" },
        ],
        []
    );

    const outOfStockCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "product", header: "Product" },
            { accessorKey: "company", header: "Company" },
            { accessorKey: "lastSaleDate", header: "Last Sale", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "batch", header: "Batch", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "mrp", header: "MRP", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const nearExpiryCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "batch", header: "Batch" },
            { accessorKey: "product", header: "Product" },
            { accessorKey: "expiryDate", header: "Expiry" },
            { accessorKey: "daysLeft", header: "Days Left", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "stockQty", header: "Qty", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "stockValue", header: "Value", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const expiredCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "product", header: "Product" },
            { accessorKey: "batch", header: "Batch" },
            { accessorKey: "expiryDate", header: "Expiry" },
            { accessorKey: "qty", header: "Qty", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "mrp", header: "MRP", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "value", header: "Value", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const topSellingCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "product", header: "Product" },
            { accessorKey: "qtySold", header: "Qty Sold", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "saleValue", header: "Sale Value", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "averageRate", header: "Avg Rate", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const slowMovingCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "product", header: "Product" },
            { accessorKey: "lastSaleDate", header: "Last Sale", cell: (i) => i.getValue() ?? "Never" },
            { accessorKey: "currentStock", header: "Current Stock", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "stockValue", header: "Stock Value", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const stockValueCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "company", header: "Company" },
            { accessorKey: "totalQty", header: "Total Qty", cell: (i) => num(i.getValue<number>()) },
            { accessorKey: "mrpValue", header: "MRP Value", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "purchaseValue", header: "Purchase Value", cell: (i) => inr(i.getValue<number>()) },
        ],
        []
    );

    const dispatchCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "invoice", header: "Invoice" },
            { accessorKey: "date", header: "Date" },
            { accessorKey: "customer", header: "Customer" },
            { accessorKey: "status", header: "Status" },
        ],
        []
    );

    const salesCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "invoice", header: "Invoice" },
            { accessorKey: "customer", header: "Customer" },
            { accessorKey: "amount", header: "Amount", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "date", header: "Date" },
        ],
        []
    );

    const ledgerCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "voucher", header: "Voucher" },
            {
                id: "code",
                header: "Code",
                accessorFn: (r: any) => `${r.code ?? ""}${r.code1 ? " / " + r.code1 : ""}`,
            },
            { accessorKey: "date", header: "Date", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "debit", header: "Debit", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "credit", header: "Credit", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "type", header: "Type", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "remark", header: "Remark", cell: (i) => i.getValue() ?? "—" },
        ],
        []
    );

    const pendCols = useMemo<ColumnDef<any>[]>(
        () => [
            { accessorKey: "voucher", header: "Voucher" },
            { accessorKey: "adjVoucher", header: "Adj. Voucher", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "date", header: "Date", cell: (i) => i.getValue() ?? "—" },
            { accessorKey: "amount", header: "Amount", cell: (i) => inr(i.getValue<number>()) },
            { accessorKey: "type", header: "Type", cell: (i) => i.getValue() ?? "—" },
            {
                id: "ref",
                header: "Ref",
                accessorFn: (r: any) => r.vcn ?? r.orderRef ?? "—",
            },
        ],
        []
    );

    if (loading) {
        return (
            <GlassShell>
                <div className="min-h-screen flex items-center justify-center text-slate-500">
                    Loading stock dashboard…
                </div>
            </GlassShell>
        );
    }

    if (error || !data) {
        return (
            <GlassShell>
                <div className="min-h-screen flex items-center justify-center text-rose-600">
                    Failed to load dashboard{error ? `: ${error}` : ""}
                </div>
            </GlassShell>
        );
    }

    const kpiCards: { label: string; value: string; icon: any; tint: string }[] = [
        { label: "Total Products", value: num(data.kpis.totalProducts), icon: Package, tint: "from-sky-400 to-blue-500" },
        { label: "Total Batches", value: num(data.kpis.totalBatches), icon: Layers, tint: "from-sky-400 to-blue-500" },
        { label: "Current Stock Qty", value: num(data.kpis.currentStockQty), icon: Boxes, tint: "from-teal-400 to-emerald-500" },
        { label: "Current Stock Value", value: inr(data.kpis.currentStockValue), icon: IndianRupee, tint: "from-teal-400 to-emerald-500" },
        { label: "Low Stock Items", value: num(data.kpis.lowStockItems), icon: AlertTriangle, tint: "from-amber-400 to-orange-500" },
        { label: "Out of Stock", value: num(data.kpis.outOfStock), icon: XCircle, tint: "from-rose-400 to-red-500" },
        { label: "Near Expiry", value: num(data.kpis.nearExpiry), icon: Clock, tint: "from-amber-400 to-orange-500" },
        { label: "Expired Products", value: num(data.kpis.expiredProducts), icon: Ban, tint: "from-rose-400 to-red-500" },
        { label: "Today's Dispatch", value: num(data.kpis.todaysDispatch), icon: Truck, tint: "from-violet-400 to-purple-500" },
        { label: "Today's Sales Qty", value: num(data.kpis.todaysSalesQty), icon: TrendingUp, tint: "from-violet-400 to-purple-500" },
        { label: "Today's Sale Value", value: inr(data.kpis.todaysSaleValue), icon: Receipt, tint: "from-violet-400 to-purple-500" },
        { label: "Total Companies", value: num(data.kpis.totalCompanies), icon: Building2, tint: "from-sky-400 to-blue-500" },
    ];

    return (
        <GlassShell>
            <div className="relative z-10 p-6 space-y-8 max-w-[1600px] mx-auto">
                {/* ==================== MR TERRITORY BANNER ==================== */}
                {mrTerritoryInfo?.isMrRestricted && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                        <div className="flex-shrink-0 mt-0.5">
                            <FaMapMarkerAlt size={16} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Aap sirf apni assigned territory ka stock dashboard data dekh sakte hain.
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

                <header className="flex items-baseline justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                            Stock Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Mabsol Pharma · Live inventory overview</p>
                    </div>
                    <span className="text-xs text-slate-400">
                        Updated {new Date(data.generatedAt).toLocaleString("en-IN")}
                    </span>
                </header>

                {/* 1. KPI CARDS */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {kpiCards.map((k) => {
                        const isCurrentStockCard = k.label.includes("Current Stock");
                        const isNearExpiryCard = k.label.includes("Near Expiry");
                        const isExpiredCard = k.label.includes("Expired");
                        const isClickableCard = isCurrentStockCard || isNearExpiryCard || isExpiredCard;

                        return (
                            <div
                                key={k.label}
                                onClick={() => {
                                    if (isCurrentStockCard) setIsStockModalOpen(true);
                                    else if (isNearExpiryCard) setIsNearExpiryModalOpen(true);
                                    else if (isExpiredCard) setIsExpiredBatchesModalOpen(true);
                                }}
                                className={`group relative rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(31,38,135,0.10)] p-4 overflow-hidden hover:bg-white/55 transition-all ${
                                    isClickableCard ? "cursor-pointer hover:scale-[1.02] hover:-translate-y-1" : ""
                                }`}
                            >
                                <div
                                    className={`absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br ${k.tint} opacity-25 blur-2xl group-hover:opacity-40 transition-opacity`}
                                />
                                <k.icon className="h-4 w-4 text-slate-500 mb-2" strokeWidth={1.75} />
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    {k.label}
                                    {isCurrentStockCard && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Click to view details" />
                                    )}
                                    {isNearExpiryCard && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Click to view details" />
                                    )}
                                    {isExpiredCard && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Click to view details" />
                                    )}
                                </p>
                                <p className="text-xl font-semibold mt-0.5 text-slate-900">{k.value}</p>
                            </div>
                        );
                    })}
                </section>

                <CurrentStockModal
                    isOpen={isStockModalOpen}
                    onClose={() => setIsStockModalOpen(false)}
                />

                <NearExpiryModal
                    isOpen={isNearExpiryModalOpen}
                    onClose={() => setIsNearExpiryModalOpen(false)}
                />

                <ExpiredBatchesModal
                    isOpen={isExpiredBatchesModalOpen}
                    onClose={() => setIsExpiredBatchesModalOpen(false)}
                />

                {/* 2. STOCK SUMMARY */}
                <GlassPanel title="Stock Summary">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            ["Opening Stock", data.stockSummary.openingStock],
                            ["Purchase Stock", data.stockSummary.purchaseStock],
                            ["Sales Stock", data.stockSummary.salesStock],
                            ["Available Stock", data.stockSummary.availableStock],
                            ["Reserved Stock", data.stockSummary.reservedStock],
                            ["Blocked Stock", data.stockSummary.blockedStock],
                            ["Dispatch Stock", data.stockSummary.dispatchStock],
                            ["Damaged Stock", data.stockSummary.damagedStock],
                        ].map(([label, val]) => (
                            <div
                                key={label as string}
                                className="rounded-xl bg-white/50 border border-white/60 backdrop-blur-md p-3"
                            >
                                <p className="text-[11px] text-slate-500">{label}</p>
                                <p className="text-base font-medium mt-1 text-slate-900">
                                    {val == null ? "N/A" : num(val as number)}
                                </p>
                            </div>
                        ))}
                    </div>
                </GlassPanel>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GlassPanel title="Low Stock">
                        <DataTable columns={lowStockCols} data={data.lowStock} searchPlaceholder="Search product or company…" />
                    </GlassPanel>

                    <GlassPanel title="Out of Stock">
                        <DataTable columns={outOfStockCols} data={data.outOfStock} searchPlaceholder="Search product…" />
                    </GlassPanel>

                    <GlassPanel title="Near Expiry">
                        <DataTable columns={nearExpiryCols} data={data.nearExpiry} searchPlaceholder="Search batch or product…" />
                    </GlassPanel>

                    <GlassPanel title="Expired Stock">
                        <DataTable columns={expiredCols} data={data.expiredStock} searchPlaceholder="Search product or batch…" />
                    </GlassPanel>

                    <GlassPanel title="Top Selling Products">
                        <DataTable columns={topSellingCols} data={data.topSelling} searchPlaceholder="Search product…" />
                    </GlassPanel>

                    <GlassPanel title="Slow Moving Products">
                        <DataTable columns={slowMovingCols} data={data.slowMoving} searchPlaceholder="Search product…" />
                    </GlassPanel>

                    <GlassPanel title="Stock Value by Company">
                        <DataTable columns={stockValueCols} data={data.stockValueByCompany} searchPlaceholder="Search company…" />
                    </GlassPanel>

                    <GlassPanel title="Latest Dispatch">
                        <DataTable columns={dispatchCols} data={data.latestDispatch} searchPlaceholder="Search invoice or customer…" />
                    </GlassPanel>

                    <GlassPanel title="Latest Sales Invoices">
                        <DataTable columns={salesCols} data={data.latestSales} searchPlaceholder="Search invoice or customer…" />
                    </GlassPanel>

                    <GlassPanel title="Financial Ledger Summary (GLEDGER)">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <Stat label="Total Debit" value={inr(data.financialSummary.totalDebit)} />
                            <Stat label="Total Credit" value={inr(data.financialSummary.totalCredit)} />
                            <Stat label="Net Balance" value={inr(data.financialSummary.netBalance)} />
                            <Stat label="Total Entries" value={num(data.financialSummary.totalEntries)} />
                        </div>
                        <DataTable columns={ledgerCols} data={data.financialSummary.recentEntries} searchPlaceholder="Search voucher, code, remark…" />
                    </GlassPanel>

                    <GlassPanel title="Pending Vouchers / Adjustments (PEND)">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <Stat label="Pending Vouchers" value={num(data.pendingAdjustments.totalPendingVouchers)} />
                            <Stat label="Pending Value" value={inr(data.pendingAdjustments.totalPendingValue)} />
                        </div>
                        <DataTable columns={pendCols} data={data.pendingAdjustments.recent} searchPlaceholder="Search voucher or ref…" />
                    </GlassPanel>
                </div>

                {/* 12. RECENT ACTIVITY */}
                <GlassPanel title="Recent Activity">
                    <ul className="divide-y divide-white/50">
                        {data.recentActivity.map((a, i) => (
                            <li key={i} className="py-2.5 flex items-center justify-between text-sm">
                                <span>
                                    <span className="text-sky-600 font-medium mr-2">{a.type}</span>
                                    <span className="text-slate-700">{a.description}</span>
                                </span>
                                <span className="text-slate-400 text-xs">{a.date}</span>
                            </li>
                        ))}
                    </ul>
                </GlassPanel>
            </div>
        </GlassShell>
    );
}

/* ---------------------------------------------------------------- */
/* Shared UI                                                         */
/* ---------------------------------------------------------------- */

function GlassShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen relative bg-gradient-to-br from-sky-50 via-white to-teal-50 overflow-hidden">
            {/* ambient light blobs — the "liquid" in liquid glass */}
            <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-300/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl" />
            {children}
        </div>
    );
}

function GlassPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(31,38,135,0.10)] p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">{title}</h2>
            {children}
        </section>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-white/50 border border-white/60 backdrop-blur-md p-3">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="text-base font-medium mt-1 text-slate-900">{value}</p>
        </div>
    );
}