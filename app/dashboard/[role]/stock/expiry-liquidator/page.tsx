/**
 * app/dashboard/stock/expiry-liquidator/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch Expiry & Dead-Stock Liquidator — Premium Liquid Glass Dashboard & Advanced Product Modal
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    FaWarehouse, FaExclamationTriangle, FaHourglassHalf, FaSync,
    FaSearch, FaDownload, FaFilter, FaTimes, FaBoxes, FaTags,
    FaCopy, FaCheck, FaBuilding, FaBullhorn, FaSkullCrossbones,
    FaMapMarkerAlt, FaChevronLeft, FaChevronRight, FaInfoCircle,
    FaChartLine, FaPercentage, FaLayerGroup, FaBoxOpen
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";

type BatchItem = {
    batchId: string;
    productCode: string;
    productName: string;
    batchNo: string;
    packing: string;
    rackNo: string;
    groupCode: string;
    minStock: number;
    maxStock: number;
    cgst: number;
    igst: number;
    expiryDateStr: string;
    daysLeft: number;
    qty: number;
    unitCost: number;
    unitSaleRate: number;
    unitMRP: number;
    stockCostValue: number;
    stockMRPValue: number;
    category: "expired" | "critical_30" | "warning_90" | "safe_180" | "safe_normal";
    isDeadstock: boolean;
    sales60Days: number;
    topDemandState: { stateName: string; qty: number } | null;
};

type SummaryData = {
    totalBatchesCount: number;
    totalInventoryCostValue: number;
    totalInventoryMRPValue: number;
    expiredLossCostValue: number;
    critical030CostValue: number;
    warning3190CostValue: number;
    deadstockCostValue: number;
};

type HorizonFilter = "all" | "expired" | "critical_30" | "warning_90" | "safe_180" | "deadstock";

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);
    return isMobile;
}

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${formatINR(n)}`;
};

// Export CSV
function exportBatchCSV(batches: BatchItem[]) {
    const rows: string[] = [];
    rows.push(["Product Code", "Product Name", "Batch No", "Packing", "Rack Location", "Expiry Date", "Days Left", "Available Qty", "Unit Cost (₹)", "Unit Sale Rate (₹)", "Unit MRP (₹)", "Stock Value Cost (₹)", "Stock Value MRP (₹)", "Risk Category", "Deadstock (0 Sales 60d)"].join(","));
    batches.forEach(b => {
        rows.push([
            b.productCode,
            `"${b.productName.replace(/"/g, '""')}"`,
            b.batchNo,
            `"${b.packing}"`,
            b.rackNo,
            b.expiryDateStr,
            String(b.daysLeft),
            String(b.qty),
            String(b.unitCost),
            String(b.unitSaleRate),
            String(b.unitMRP),
            String(b.stockCostValue),
            String(b.stockMRPValue),
            b.category.toUpperCase(),
            b.isDeadstock ? "YES" : "NO"
        ].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Batch_Expiry_Liquidator_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function AmbientBg() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #EDF0FB 40%, #F5F0FF 70%, #EEF5F0 100%)" }}>
            <div className="absolute -top-48 -left-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-60 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #C7D2FE, #818CF820)" }} />
            <div className="absolute top-1/4 -right-40 w-[320px] sm:w-[560px] h-[320px] sm:h-[560px] rounded-full opacity-50 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #D8B4FE, #A78BFA20)" }} />
            <div className="absolute bottom-[-120px] left-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-45 blur-[100px] sm:blur-[140px]" style={{ background: "radial-gradient(circle, #A7F3D0, #10B98120)" }} />
        </div>
    );
}

function GlassCard({ children, className = "", title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) {
    return (
        <div className={`relative rounded-[16px] sm:rounded-[22px] overflow-hidden ${className}`}
            style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.06), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            {(title || subtitle) && (
                <div className="px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-0">
                    {title && <h3 className="text-xs sm:text-[14px] font-black text-slate-800 tracking-tight m-0">{title}</h3>}
                    {subtitle && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 m-0 font-medium">{subtitle}</p>}
                </div>
            )}
            <div className="p-3.5 sm:p-5">{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT & BATCH DETAIL MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function ProductBatchModal({ batch, onClose }: { batch: BatchItem; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "expiry" | "scheme">("overview");
    const [copied, setCopied] = useState(false);

    // Dynamic offer circular text generator
    const schemeText = useMemo(() => {
        if (batch.category === "expired") {
            return `ALERT: Batch ${batch.batchNo} of ${batch.productName} (Code: ${batch.productCode}) has EXPIRED on ${batch.expiryDateStr}. Under Drug & Cosmetics Act rules, expired products CANNOT be sold or distributed. Please immediately isolate stock in Rack ${batch.rackNo} and issue MabsolCRM Credit Return Voucher to supplier.`;
        }
        if (batch.category === "critical_30") {
            return `⚡ URGENT EXPIRY CLEARANCE SCHEME: ${batch.productName} (Batch: ${batch.batchNo}, Packing: ${batch.packing}) — Buy 5 Packs & Get 2 FREE (40% Extra Scheme Margin) + 15% Cash Discount! Valid for immediate clearance stock in Rack ${batch.rackNo}.`;
        }
        if (batch.category === "warning_90") {
            return `🎁 SPECIAL STOCK CLEARANCE SCHEME: Buy 10 Packs of ${batch.productName} (Batch: ${batch.batchNo}) & Get 2 Packs FREE (20% Bonus Margin) + Free Local Transport! Best margin opportunity for stockists & retailers.`;
        }
        if (batch.isDeadstock) {
            return `🔥 DEAD-STOCK PROMOTIONAL INCENTIVE: High-Margin Incentive on ${batch.productName} (Batch: ${batch.batchNo}) — Buy 6 Get 1 FREE + Extra 5% MR Monthly Target Incentive! Zero sales recorded in last 60 days.`;
        }
        return `PROMOTIONAL OFFER: ${batch.productName} (Batch: ${batch.batchNo}, Packing: ${batch.packing}) — Standard Commercial Discount 10% on bulk order of 20+ packs.`;
    }, [batch]);

    const handleCopy = () => {
        navigator.clipboard.writeText(schemeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const profitMargin = useMemo(() => {
        if (!batch.unitCost) return 0;
        return Math.round(((batch.unitSaleRate - batch.unitCost) / batch.unitCost) * 100);
    }, [batch]);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[22px] sm:rounded-[26px] shadow-2xl overflow-hidden border border-white/80 animate-in zoom-in-95 duration-200 my-auto">

                {/* Modal Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                            <FaBoxOpen size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black tracking-tight m-0 truncate text-white">{batch.productName}</h3>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">
                                    {batch.productCode}
                                </span>
                            </div>
                            <p className="text-[11px] text-indigo-100 mt-0.5 m-0 font-medium truncate">
                                Batch: <strong className="font-mono text-white">{batch.batchNo}</strong> · Packing: {batch.packing} · Rack: {batch.rackNo}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0">
                        <FaTimes size={13} />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200/80 bg-slate-50/70 overflow-x-auto scrollbar-hide">
                    {[
                        { id: "overview", label: "Product Master", icon: FaInfoCircle },
                        { id: "financials", label: "Financial Valuation", icon: FaChartLine },
                        { id: "expiry", label: "Expiry Risk", icon: FaHourglassHalf },
                        { id: "scheme", label: "Clearance Circular", icon: FaBullhorn },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap shrink-0 ${
                                    isActive
                                        ? "border-indigo-600 text-indigo-600 bg-white shadow-sm"
                                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                                }`}
                            >
                                <Icon size={12} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* TAB 1: OVERVIEW / SPECS */}
                    {activeTab === "overview" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Product Code</p>
                                    <p className="text-sm font-mono font-black text-slate-800 m-0 mt-0.5">{batch.productCode}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Batch Number</p>
                                    <p className="text-sm font-mono font-black text-indigo-600 m-0 mt-0.5">{batch.batchNo}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Packing Unit</p>
                                    <p className="text-sm font-bold text-slate-800 m-0 mt-0.5">{batch.packing}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rack Location</p>
                                    <p className="text-sm font-bold text-emerald-700 m-0 mt-0.5">{batch.rackNo}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Group / Division Code</p>
                                    <p className="text-sm font-bold text-slate-800 m-0 mt-0.5">{batch.groupCode}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">GST Tax Rates</p>
                                    <p className="text-sm font-bold text-slate-800 m-0 mt-0.5">CGST {batch.cgst}% | IGST {batch.igst}%</p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5">
                                <div className="flex items-center justify-between text-indigo-900 font-bold">
                                    <span className="flex items-center gap-1.5"><FaLayerGroup /> Reorder Level Thresholds:</span>
                                    <span>Min: {batch.minStock} Packs | Max: {batch.maxStock} Packs</span>
                                </div>
                                <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (batch.qty / (batch.maxStock || 100)) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-indigo-700 m-0 text-right">
                                    Current Available Stock: <strong>{batch.qty.toLocaleString("en-IN")} Packs</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: FINANCIALS */}
                    {activeTab === "financials" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase m-0">Landed Unit Cost</p>
                                    <p className="text-lg font-black text-blue-900 m-0 mt-0.5">₹{batch.unitCost}</p>
                                    <p className="text-[9px] text-blue-500 m-0">Supplier Purchase Rate</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase m-0">Stockist Sale Rate</p>
                                    <p className="text-lg font-black text-emerald-900 m-0 mt-0.5">₹{batch.unitSaleRate}</p>
                                    <p className="text-[9px] text-emerald-600 m-0 font-bold">Margin: +{profitMargin}%</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/70 col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-bold text-purple-600 uppercase m-0">Maximum Retail Price</p>
                                    <p className="text-lg font-black text-purple-900 m-0 mt-0.5">₹{batch.unitMRP}</p>
                                    <p className="text-[9px] text-purple-500 m-0">Printed Packaging MRP</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-xs text-slate-300 font-medium">Batch Total Cost Valuation:</span>
                                    <span className="text-base font-black text-emerald-400">{formatCr(batch.stockCostValue)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-xs text-slate-300 font-medium">Batch Total MRP Valuation:</span>
                                    <span className="text-base font-black text-purple-300">{formatCr(batch.stockMRPValue)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-300 font-medium">Potential Gross Profit:</span>
                                    <span className="text-base font-black text-amber-300">
                                        {formatCr(batch.stockMRPValue - batch.stockCostValue)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: EXPIRY & DAYS TRACKER */}
                    {activeTab === "expiry" && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-800 uppercase m-0">Expiration Date</p>
                                        <p className="text-xl font-black text-slate-900 m-0 mt-0.5">{batch.expiryDateStr}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-amber-800 uppercase m-0">Days Remaining</p>
                                        <p className={`text-xl font-black m-0 mt-0.5 ${batch.daysLeft <= 0 ? "text-rose-600" : batch.daysLeft <= 30 ? "text-orange-600" : "text-emerald-700"}`}>
                                            {batch.daysLeft <= 0 ? "EXPIRED" : `${batch.daysLeft} Days`}
                                        </p>
                                    </div>
                                </div>

                                {/* Visual timeline progress bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                        <span>Expired (0d)</span>
                                        <span>Critical (30d)</span>
                                        <span>Warning (90d)</span>
                                        <span>Safe (180d+)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                                        <div
                                            className={`h-full transition-all ${
                                                batch.daysLeft <= 0 ? "bg-rose-600" : batch.daysLeft <= 30 ? "bg-orange-500" : batch.daysLeft <= 90 ? "bg-amber-400" : "bg-emerald-500"
                                            }`}
                                            style={{ width: `${Math.max(5, Math.min(100, (batch.daysLeft / 180) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                                <div className="flex justify-between items-center text-slate-700">
                                    <span className="font-semibold">60-Day Sales Velocity:</span>
                                    <span className="font-bold text-slate-900">{batch.sales60Days} Packs Sold</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700">
                                    <span className="font-semibold">Movement Status:</span>
                                    {batch.isDeadstock ? (
                                        <span className="font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 text-[10px]">
                                            DEADSTOCK (Zero Movement)
                                        </span>
                                    ) : (
                                        <span className="font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">
                                            ACTIVE MOVEMENT
                                        </span>
                                    )}
                                </div>
                                {batch.topDemandState && (
                                    <div className="flex justify-between items-center text-slate-700">
                                        <span className="font-semibold">Recommended Transfer Territory:</span>
                                        <span className="font-bold text-indigo-700 flex items-center gap-1">
                                            <FaMapMarkerAlt size={10} /> {batch.topDemandState.stateName} (High Demand)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SCHEME CIRCULAR */}
                    {activeTab === "scheme" && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <FaBullhorn className="text-amber-500" />
                                Recommended Promotional Offer Circular Text:
                            </label>
                            <textarea
                                readOnly
                                value={schemeText}
                                rows={5}
                                className="w-full text-xs p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 text-slate-800 font-medium focus:outline-none leading-relaxed"
                            />
                            <div className="flex items-center justify-between pt-1">
                                {copied ? (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                        <FaCheck size={12} /> Copied to Clipboard!
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">Share directly with MRs, Stockists &amp; Distributors</span>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-xs font-black text-white px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-md"
                                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                                >
                                    <FaCopy size={12} /> Copy Offer Circular
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">
                        Drug &amp; Cosmetics Compliant Financial Loss Prevention
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-all active:scale-95"
                    >
                        Close Modal
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BatchExpiryLiquidatorPage() {
    const { selectedCompany, loading: companyLoading } = useCompany();
    const isMobile = useIsMobile(640);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDetailBatch, setSelectedDetailBatch] = useState<BatchItem | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const companyIdStr = selectedCompany?._id || "";

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            if (companyIdStr) params.set("companyId", companyIdStr);

            const res = await fetch(`/api/dashboard/stock/expiry-liquidator?${params}`);
            if (!res.ok) {
                const text = await res.text();
                let errMsg = `Server returned status ${res.status}`;
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.error) errMsg = parsed.error;
                } catch {}
                throw new Error(errMsg);
            }
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load expiry data");

            setSummary(json.summary);
            setBatches(json.batches || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [companyIdStr]);

    useEffect(() => {
        if (!companyLoading) {
            fetchData();
        }
    }, [fetchData, companyLoading]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [horizonFilter, searchQuery, pageSize]);

    // Filtered Batches
    const filteredBatches = useMemo(() => {
        return batches.filter(b => {
            // Horizon Filter
            if (horizonFilter === "expired" && b.category !== "expired") return false;
            if (horizonFilter === "critical_30" && b.category !== "critical_30") return false;
            if (horizonFilter === "warning_90" && b.category !== "warning_90") return false;
            if (horizonFilter === "safe_180" && b.category !== "safe_180" && b.category !== "safe_normal") return false;
            if (horizonFilter === "deadstock" && !b.isDeadstock) return false;

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    b.productName.toLowerCase().includes(q) ||
                    b.batchNo.toLowerCase().includes(q) ||
                    b.productCode.toLowerCase().includes(q) ||
                    b.rackNo.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [batches, horizonFilter, searchQuery]);

    // Pagination calculation
    const totalPages = Math.ceil(filteredBatches.length / pageSize) || 1;
    const paginatedBatches = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBatches.slice(start, start + pageSize);
    }, [filteredBatches, currentPage, pageSize]);

    return (
        <div className="min-h-screen p-2.5 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 relative">
            <AmbientBg />

            {/* Header */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EF4444, #F59E0B)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
                            <FaWarehouse size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                                Batch Expiry &amp; Dead-Stock Liquidator
                            </h1>
                            <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5 m-0">
                                Financial Loss Prevention · Product Specs Modal · AI Clearance Scheme Generator
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                        {selectedCompany && (
                            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <FaBuilding size={9} /> {selectedCompany.companyName}
                            </span>
                        )}
                        <button onClick={fetchData} className="p-2 rounded-full bg-white/70 border border-slate-200 text-slate-600 hover:bg-white active:scale-95 transition-all">
                            <FaSync size={11} className={loading ? "animate-spin" : ""} />
                        </button>
                        {batches.length > 0 && (
                            <button onClick={() => exportBatchCSV(filteredBatches)}
                                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                <FaDownload size={9} /> Export Batch CSV
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="rounded-[16px] px-4 py-3 flex items-center gap-2 text-rose-600 text-xs font-medium border border-rose-200 bg-rose-50/70">
                    <FaExclamationTriangle size={13} /> {error}
                </div>
            )}

            {/* Financial Loss Risk KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-slate-50/90 to-blue-50/70 border border-slate-200/70 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0 truncate">Total Stock Valuation</p>
                    <p className="text-sm sm:text-xl font-black text-slate-900 m-0 mt-0.5 truncate">{formatCr(summary?.totalInventoryCostValue || 0)}</p>
                    <p className="text-[9px] text-slate-400 m-0 mt-0.5 truncate">{summary?.totalBatchesCount || batches.length} Active Batches</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-rose-50/90 to-red-100/70 border border-rose-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-600 m-0 truncate">Expired Stock Loss</p>
                        <FaSkullCrossbones size={11} className="text-rose-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-rose-700 m-0 mt-0.5 truncate">{formatCr(summary?.expiredLossCostValue || 0)}</p>
                    <p className="text-[9px] text-rose-500 font-semibold m-0 mt-0.5 truncate">Initiate MabsolCRM Credit Return</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-orange-50/90 to-amber-100/70 border border-orange-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-600 m-0 truncate">Critical (0-30 Days)</p>
                        <FaExclamationTriangle size={11} className="text-orange-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-orange-700 m-0 mt-0.5 truncate">{formatCr(summary?.critical030CostValue || 0)}</p>
                    <p className="text-[9px] text-orange-600 font-semibold m-0 mt-0.5 truncate">Immediate Clearance Needed</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/90 to-yellow-100/70 border border-amber-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 m-0 truncate">Warning (31-90 Days)</p>
                        <FaHourglassHalf size={11} className="text-amber-600 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-amber-800 m-0 mt-0.5 truncate">{formatCr(summary?.warning3190CostValue || 0)}</p>
                    <p className="text-[9px] text-amber-700 font-medium m-0 mt-0.5 truncate">Push Stockist Discounts</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-purple-50/90 to-fuchsia-50/70 border border-purple-200/70 shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-600 m-0 truncate">Deadstock (&gt;60d No Sale)</p>
                        <FaBoxes size={11} className="text-purple-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-purple-800 m-0 mt-0.5 truncate">{formatCr(summary?.deadstockCostValue || 0)}</p>
                    <p className="text-[9px] text-purple-700 font-medium m-0 mt-0.5 truncate">Zero Movement Batches</p>
                </div>
            </div>

            {/* Expiry Horizon Filter Bar */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-[14px] font-black text-slate-800 flex items-center gap-2 m-0">
                            <FaFilter size={12} className="text-indigo-500" />
                            Expiry Risk Horizon &amp; Search Controls
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 m-0 font-medium">Filter inventory by days until expiration or zero-movement deadstock</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <FaSearch size={11} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search product, batch, code, rack..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide pt-2 border-t border-slate-200/60 gap-1.5">
                    {[
                        { key: "all", label: `All Active Batches (${batches.length})`, color: "bg-slate-100 text-slate-700" },
                        { key: "expired", label: "Expired Stock", color: "bg-rose-100 text-rose-800" },
                        { key: "critical_30", label: "Critical (0-30 Days)", color: "bg-orange-100 text-orange-800" },
                        { key: "warning_90", label: "Warning (31-90 Days)", color: "bg-amber-100 text-amber-800" },
                        { key: "safe_180", label: "Safe (90+ Days)", color: "bg-emerald-100 text-emerald-800" },
                        { key: "deadstock", label: "Deadstock (>60d No Sale)", color: "bg-purple-100 text-purple-800" },
                    ].map(opt => {
                        const isActive = horizonFilter === opt.key;
                        return (
                            <button key={opt.key} onClick={() => setHorizonFilter(opt.key as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                                    isActive ? "bg-indigo-600 text-white shadow-md" : opt.color
                                }`}>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </GlassCard>

            {/* Batch Risk Table */}
            <GlassCard title="Batch Risk Management Table" subtitle={`Displaying ${filteredBatches.length} batches matching filter criteria (Click any row to open Product Details Modal)`}>
                <div className="overflow-x-auto mt-2 rounded-xl border border-slate-200/50">
                    <table className="w-full text-xs min-w-[760px]">
                        <thead>
                            <tr className="border-b border-slate-200/60 bg-slate-50/80">
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Formulation &amp; Code</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Batch No</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Rack Location</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Expiry Date</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Available Qty</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Stock Value</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-semibold">Days Left / Status</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        <FaSync size={16} className="animate-spin inline-block mr-2 text-indigo-500" /> Loading batch risk analytics...
                                    </td>
                                </tr>
                            ) : paginatedBatches.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-slate-400">
                                        No batch records matching selected filter
                                    </td>
                                </tr>
                            ) : (
                                paginatedBatches.map((b) => {
                                    let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                    let badgeLabel = `${b.daysLeft} Days`;

                                    if (b.category === "expired") {
                                        badgeBg = "bg-rose-100 text-rose-800 border-rose-300 font-black";
                                        badgeLabel = "EXPIRED";
                                    } else if (b.category === "critical_30") {
                                        badgeBg = "bg-orange-100 text-orange-800 border-orange-300 font-black";
                                        badgeLabel = `${b.daysLeft} Days (Critical)`;
                                    } else if (b.category === "warning_90") {
                                        badgeBg = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                                        badgeLabel = `${b.daysLeft} Days (Warning)`;
                                    }

                                    return (
                                        <tr
                                            key={b.batchId}
                                            onClick={() => setSelectedDetailBatch(b)}
                                            className="border-b border-slate-100/60 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                        >
                                            <td className="py-2.5 px-3 font-bold text-slate-800">
                                                <div className="truncate max-w-[220px] text-indigo-950 font-black">{b.productName}</div>
                                                <div className="text-[9px] text-slate-400 font-mono">Code: {b.productCode} · Pack: {b.packing}</div>
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-indigo-600 font-bold">{b.batchNo}</td>
                                            <td className="py-2.5 px-3 text-slate-600 font-bold text-[11px]">{b.rackNo}</td>
                                            <td className="py-2.5 px-3 text-slate-600 font-semibold">{b.expiryDateStr}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-800">{b.qty.toLocaleString("en-IN")} Packs</td>
                                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                                {formatCr(b.stockCostValue)}
                                                <div className="text-[9px] text-slate-400 font-normal">MRP {formatCr(b.stockMRPValue)}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${badgeBg}`}>
                                                        {badgeLabel}
                                                    </span>
                                                    {b.isDeadstock && (
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                                            DEADSTOCK (0 Sales 60d)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelectedDetailBatch(b)}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95"
                                                    >
                                                        <FaInfoCircle size={9} /> Specs
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedDetailBatch(b)}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95"
                                                    >
                                                        <FaTags size={9} /> Scheme
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredBatches.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 mt-3 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <span>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="ml-2 font-semibold">
                                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredBatches.length)} - {Math.min(currentPage * pageSize, filteredBatches.length)} of {filteredBatches.length} batches
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/80 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 text-[11px]"
                            >
                                <FaChevronLeft size={10} /> Prev
                            </button>
                            <span className="px-3 py-1 font-bold text-slate-800 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/80 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 text-[11px]"
                            >
                                Next <FaChevronRight size={10} />
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* ── Product & Batch Details Modal ────────────────────────────── */}
            {selectedDetailBatch && (
                <ProductBatchModal
                    batch={selectedDetailBatch}
                    onClose={() => setSelectedDetailBatch(null)}
                />
            )}
        </div>
    );
}
