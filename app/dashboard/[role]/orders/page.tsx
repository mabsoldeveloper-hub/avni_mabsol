"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    ShoppingCart,
    CalendarDays,
    CalendarRange,
    CalendarClock,
    IndianRupee,
    Clock,
    Truck,
    XCircle,
    Users,
    Package,
    Wallet,
    AlertCircle,
    RefreshCw,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { GlassDataTable } from "./Glassdatatable";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

interface DashboardData {
    kpiCards: {
        totalOrders: number;
        todaysOrders: number;
        monthlyOrders: number;
        yearlyOrders: number;
        totalSales: number;
        pendingOrders: number;
        deliveredOrders: number;
        cancelledOrders: number | null;
        totalCustomers: number;
        totalProductsSold: number;
        totalCollection: number;
        outstanding: number;
    };
    orderSummary: any[];
    latestOrders: any[];
    orderItems: any[];
    paymentDetails: any[];
    dispatchDetails: any[];
    charts: {
        ordersTrend: any[];
        dailySales: any[];
        topCustomers: any[];
        topProducts: any[];
        collectionTrend: any[];
        orderStatus: any | null;
    };
    filterOptions: {
        dsm: string[];
        area: string[];
        route: string[];
    };
}

function formatINR(value: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}
export default function OrdersDashboardPage() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    // ---- Filter state (all wired to the API as query params) ----
    const [customer, setCustomer] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [invoice, setInvoice] = useState("");
    const [area, setArea] = useState("");
    const [route, setRoute] = useState("");
    const [dsm, setDsm] = useState("");

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [selectedCompany?._id, selectedFY?._id]);

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

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const res = await axios.get("/api/dashboard/orders", {
                params: {
                    companyId: selectedCompany?._id || undefined,
                    fyId: selectedFY?._id || undefined,
                    customer: customer || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    invoice: invoice || undefined,
                    area: area || undefined,
                    route: route || undefined,
                    dsm: dsm || undefined,
                },
            });

            setDashboard(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setCustomer("");
        setDateFrom("");
        setDateTo("");
        setInvoice("");
        setArea("");
        setRoute("");
        setDsm("");
        setTimeout(loadDashboard, 0);
    };

    const kpi = dashboard?.kpiCards;
    const options = dashboard?.filterOptions;

    const cards = [
        { title: "Total Orders", value: kpi?.totalOrders ?? 0, icon: <ShoppingCart size={20} /> },
        { title: "Today's Orders", value: kpi?.todaysOrders ?? 0, icon: <CalendarDays size={20} /> },
        { title: "Monthly Orders", value: kpi?.monthlyOrders ?? 0, icon: <CalendarRange size={20} /> },
        { title: "Yearly Orders", value: kpi?.yearlyOrders ?? 0, icon: <CalendarClock size={20} /> },
        { title: "Total Sales", value: formatINR(kpi?.totalSales ?? 0), icon: <IndianRupee size={20} /> },
        { title: "Pending Orders", value: kpi?.pendingOrders ?? 0, icon: <Clock size={20} /> },
        {
            title: "Delivered Orders",
            value: kpi?.deliveredOrders ?? 0,
            icon: <Truck size={20} />,
            note: "Proxy: total dispatch records (no status field yet)",
        },
        {
            title: "Cancelled Orders",
            value: kpi?.cancelledOrders ?? "N/A",
            icon: <XCircle size={20} />,
            note: 'MDIS TYPE = "V" (unposted/void vouchers)',
        },
        { title: "Total Customers", value: kpi?.totalCustomers ?? 0, icon: <Users size={20} /> },
        { title: "Products Sold (Qty)", value: kpi?.totalProductsSold ?? 0, icon: <Package size={20} /> },
        { title: "Total Collection", value: formatINR(kpi?.totalCollection ?? 0), icon: <Wallet size={20} /> },
        { title: "Outstanding", value: formatINR(kpi?.outstanding ?? 0), icon: <AlertCircle size={20} /> },
    ];

    // ---------- Column defs (memoized) ----------
    const colHelper = createColumnHelper<any>();

    const orderSummaryCols = useMemo(
        () => [
            colHelper.accessor("VCN", { header: "Invoice" }),
            colHelper.accessor("DATE", { header: "Date" }),
            colHelper.accessor("CODEP", { header: "Customer" }),
            colHelper.accessor((r) => r.ROUT ?? "-", { id: "ROUT", header: "Route" }),
            colHelper.accessor((r) => r.DSM ?? "-", { id: "DSM", header: "DSM" }),
            colHelper.accessor((r) => r.NOCS ?? "-", { id: "NOCS", header: "Items" }),
            colHelper.accessor((r) => formatINR(r.FINAL), { id: "FINAL", header: "Net Amount" }),
        ],
        []
    );

    const latestOrdersCols = useMemo(
        () => [
            colHelper.accessor("VCN", { header: "Invoice" }),
            colHelper.accessor("VOUCHER", { header: "Voucher" }),
            colHelper.accessor("DATE", { header: "Date" }),
            colHelper.accessor("CODEP", { header: "Customer" }),
            colHelper.accessor((r) => formatINR(r.FINAL), { id: "FINAL", header: "Net Amount" }),
        ],
        []
    );

    const orderItemsCols = useMemo(
        () => [
            colHelper.accessor("VCN", { header: "Invoice" }),
            colHelper.accessor((r) => r.productName ?? r.CODE, { id: "product", header: "Product" }),
            colHelper.accessor("BATCH", { header: "Batch" }),
            colHelper.accessor((r) => r.batchExpiry ?? "-", { id: "expiry", header: "Expiry" }),
            colHelper.accessor("QTY", { header: "Qty" }),
            colHelper.accessor("RATE", { header: "Rate" }),
            colHelper.accessor((r) => r.batchMrp ?? r.MRP, { id: "mrp", header: "MRP" }),
            colHelper.accessor((r) => formatINR(r.AMMMOUNT), { id: "amount", header: "Amount" }),
        ],
        []
    );

    const paymentDetailsCols = useMemo(
        () => [
            colHelper.accessor("VOUCHER", { header: "Voucher" }),
            colHelper.accessor("CODE", { header: "Party" }),
            colHelper.accessor("DATE", { header: "Date" }),
            colHelper.accessor((r) => formatINR(r.DEBIT), { id: "debit", header: "Debit" }),
            colHelper.accessor((r) => formatINR(r.CREDIT), { id: "credit", header: "Credit" }),
        ],
        []
    );

    const dispatchDetailsCols = useMemo(
        () => [
            colHelper.accessor("VCN", { header: "Invoice" }),
            colHelper.accessor("VOUCHER", { header: "Voucher" }),
            colHelper.accessor("DATE", { header: "Date" }),
            colHelper.accessor("CODEP", { header: "Customer" }),
            colHelper.accessor((r) => r.DSM ?? "-", { id: "dsm", header: "DSM" }),
        ],
        []
    );

    if (loading && !dashboard) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl px-6 py-4 shadow-lg">
                    <RefreshCw size={20} className="animate-spin text-indigo-500" />
                    <span className="text-sm font-medium text-gray-600">Loading Dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/40 p-6 space-y-6">
            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ke orders dekh sakte hain.
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

            {/* Filter Bar */}
            <div className="rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl shadow-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal size={16} className="text-indigo-500" />
                    <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md pl-9 pr-4 py-2 w-56 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                            placeholder="Search Customer..."
                            value={customer}
                            onChange={(e) => setCustomer(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && loadDashboard()}
                        />
                    </div>

                    <input
                        type="date"
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />

                    <input
                        type="date"
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />

                    <input
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 w-40 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                        placeholder="Invoice No..."
                        value={invoice}
                        onChange={(e) => setInvoice(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadDashboard()}
                    />

                    <select
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                    >
                        <option value="">All Areas</option>
                        {options?.area?.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                    <select
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition disabled:opacity-50"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                        disabled={!options?.route?.length}
                        title={!options?.route?.length ? "ROUT is not populated in source data yet" : ""}
                    >
                        <option value="">All Routes</option>
                        {options?.route?.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    <select
                        className="rounded-xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                        value={dsm}
                        onChange={(e) => setDsm(e.target.value)}
                    >
                        <option value="">All DSM</option>
                        {options?.dsm?.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadDashboard}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-violet-600 transition"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Loading..." : "Apply / Refresh"}
                    </button>

                    <button
                        onClick={handleClearFilters}
                        className="rounded-xl px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 transition"
                    >
                        Clear filters
                    </button>
                </div>

                {!options?.route?.length && (
                    <p className="text-[11px] text-amber-600 mt-3">
                        Note: Route and Area filters are disabled/empty because the
                        ROUT/AREA fields are 100% NULL across every table in the source
                        data (verified) — this isn't a bug, there's simply nothing to
                        filter on until the client starts capturing that in VFP.
                    </p>
                )}
            </div>

            {/* 12 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {cards.map((card, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl shadow-md hover:shadow-xl hover:bg-white/60 transition p-5"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm">{card.title}</p>
                                <h2 className="text-2xl font-bold mt-2 text-gray-800">{card.value}</h2>
                                {card.note && (
                                    <p className="text-[11px] text-amber-600 mt-1">{card.note}</p>
                                )}
                            </div>
                            <div className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white p-3 shadow-md">
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Order Summary */}
            <Section title="Order Summary">
                <GlassDataTable
                    data={dashboard?.orderSummary ?? []}
                    columns={orderSummaryCols}
                    searchPlaceholder="Search order summary..."
                />
            </Section>

            {/* Latest Orders */}
            <Section title="Latest Orders">
                <GlassDataTable
                    data={dashboard?.latestOrders ?? []}
                    columns={latestOrdersCols}
                    searchPlaceholder="Search latest orders..."
                />
            </Section>

            {/* Order Items */}
            <Section title="Order Items">
                <GlassDataTable
                    data={dashboard?.orderItems ?? []}
                    columns={orderItemsCols}
                    searchPlaceholder="Search order items..."
                />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Details */}
                <Section title="Payment Details">
                    <GlassDataTable
                        data={dashboard?.paymentDetails ?? []}
                        columns={paymentDetailsCols}
                        searchPlaceholder="Search payments..."
                        pageSize={5}
                    />
                </Section>

                {/* Dispatch Details */}
                <Section title="Dispatch Details">
                    <GlassDataTable
                        data={dashboard?.dispatchDetails ?? []}
                        columns={dispatchDetailsCols}
                        searchPlaceholder="Search dispatches..."
                        pageSize={5}
                    />
                </Section>
            </div>

            <p className="text-xs text-gray-400 px-1">
                Note: "Delivered" is still a dispatch-count proxy until the client
                confirms a real status field on SUBDIS. "Cancelled" now reflects
                MDIS records with TYPE = "V" (unposted/void vouchers, verified to
                always have a null date and null invoice number).
            </p>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl shadow-lg p-5">
            <h3 className="text-base font-semibold mb-4 text-gray-700">{title}</h3>
            {children}
        </div>
    );
}