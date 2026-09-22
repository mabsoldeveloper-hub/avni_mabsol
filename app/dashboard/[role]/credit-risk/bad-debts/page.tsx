/**
 * app/dashboard/credit-risk/bad-debts/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Bad Debt Parties & Credit Risk Recovery — Liquid Glass 2.0 (Dynamic Credit Hold)
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    FaUserShield, FaExclamationTriangle, FaHourglassHalf, FaSync,
    FaSearch, FaDownload, FaFilter, FaTimes, FaBoxes, FaTags,
    FaCopy, FaCheck, FaBuilding, FaBullhorn, FaSkullCrossbones,
    FaMapMarkerAlt, FaChevronLeft, FaChevronRight, FaPhoneAlt,
    FaBan, FaShieldAlt, FaWhatsapp, FaEnvelope, FaPaperPlane,
    FaLock, FaUnlock
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";

type PartyItem = {
    partyId: string;
    partyName: string;
    city: string;
    gstNo: string;
    phone: string;
    email: string;
    balance: number;
    creditLimit: number;
    rhythmScore: number;
    aging030: number;
    aging3160: number;
    aging6190: number;
    aging90Plus: number;
    category: "critical_90" | "high_60" | "moderate_30" | "low_0";
    creditHold: boolean;
};

type SummaryData = {
    totalPartiesCount: number;
    totalReceivablesCost: number;
    badDebt90PlusValue: number;
    highRisk6090Value: number;
    moderate3060Value: number;
    defaultPartiesCount: number;
    avgCollectionDays: number;
};

type HorizonFilter = "all" | "critical_90" | "high_60" | "moderate_30" | "low_0";
type NoticeTone = "polite" | "firm" | "legal";
type NoticeChannel = "whatsapp" | "email" | "mr_field";

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
function exportBadDebtCSV(parties: PartyItem[]) {
    const rows: string[] = [];
    rows.push(["Party Name", "City", "GST No", "Phone", "Email", "Total Outstanding", "Credit Limit", "Payment Rhythm Score", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days Bad Debt", "Risk Category", "Credit Hold"].join(","));
    parties.forEach(p => {
        rows.push([`"${p.partyName}"`, `"${p.city}"`, p.gstNo, p.phone, p.email, String(p.balance), String(p.creditLimit), String(p.rhythmScore), String(p.aging030), String(p.aging3160), String(p.aging6190), String(p.aging90Plus), p.category.toUpperCase(), p.creditHold ? "YES" : "NO"].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Bad_Debt_Credit_Risk_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// Visual Aging Ratio Bar
function AgingRatioBar({ p }: { p: PartyItem }) {
    const total = p.balance || 1;
    const pct030 = Math.round((p.aging030 / total) * 100);
    const pct3160 = Math.round((p.aging3160 / total) * 100);
    const pct6190 = Math.round((p.aging6190 / total) * 100);
    const pct90P = Math.round((p.aging90Plus / total) * 100);

    return (
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-100">
            {pct030 > 0 && <div style={{ width: `${pct030}%` }} className="bg-emerald-500" title={`0-30d: ${pct030}%`} />}
            {pct3160 > 0 && <div style={{ width: `${pct3160}%` }} className="bg-amber-400" title={`31-60d: ${pct3160}%`} />}
            {pct6190 > 0 && <div style={{ width: `${pct6190}%` }} className="bg-orange-500" title={`61-90d: ${pct6190}%`} />}
            {pct90P > 0 && <div style={{ width: `${pct90P}%` }} className="bg-rose-600" title={`90+d: ${pct90P}%`} />}
        </div>
    );
}

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
                background: "rgba(255,255,255,0.68)",
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
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BadDebtCreditRiskPage() {
    const { selectedCompany } = useCompany();
    const isMobile = useIsMobile(640);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNoticeParty, setSelectedNoticeParty] = useState<PartyItem | null>(null);
    const [noticeTone, setNoticeTone] = useState<NoticeTone>("firm");
    const [noticeChannel, setNoticeChannel] = useState<NoticeChannel>("whatsapp");
    const [copiedToast, setCopiedToast] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const companyIdStr = selectedCompany?._id || "";

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            if (companyIdStr) params.set("companyId", companyIdStr);

            const res = await fetch(`/api/dashboard/credit-risk/bad-debts?${params}`);
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
            if (!json.success) throw new Error(json.error || "Failed to load bad debt data");

            setSummary(json.summary);
            setParties(json.parties || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [companyIdStr]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [horizonFilter, searchQuery, pageSize]);

    // Set default tone based on party risk when modal opens
    useEffect(() => {
        if (selectedNoticeParty) {
            if (selectedNoticeParty.category === "critical_90" || selectedNoticeParty.creditHold) setNoticeTone("legal");
            else if (selectedNoticeParty.category === "high_60") setNoticeTone("firm");
            else setNoticeTone("polite");
        }
    }, [selectedNoticeParty]);

    // Clean phone number for WhatsApp deep link
    const phoneClean = useMemo(() => {
        if (!selectedNoticeParty?.phone) return "";
        const cleaned = selectedNoticeParty.phone.replace(/[^0-9]/g, "");
        if (cleaned.length === 10) return `91${cleaned}`;
        if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
        if (cleaned.length > 10) return cleaned;
        return "";
    }, [selectedNoticeParty]);

    const formattedPhoneDisplay = useMemo(() => {
        if (!phoneClean) return null;
        const num = phoneClean.startsWith("91") ? phoneClean.slice(2) : phoneClean;
        return `+91 ${num}`;
    }, [phoneClean]);

    // Filtered Parties
    const filteredParties = useMemo(() => {
        return parties.filter(p => {
            if (horizonFilter === "critical_90" && p.category !== "critical_90") return false;
            if (horizonFilter === "high_60" && p.category !== "high_60") return false;
            if (horizonFilter === "moderate_30" && p.category !== "moderate_30") return false;
            if (horizonFilter === "low_0" && p.category !== "low_0") return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return p.partyName.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.gstNo.toLowerCase().includes(q);
            }
            return true;
        });
    }, [parties, horizonFilter, searchQuery]);

    // Pagination calculation
    const totalPages = Math.ceil(filteredParties.length / pageSize) || 1;
    const paginatedParties = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredParties.slice(start, start + pageSize);
    }, [filteredParties, currentPage, pageSize]);

    // Dynamic Credit Hold Toggle with Backend API Persistence
    const toggleCreditHold = async (party: PartyItem) => {
        const nextHoldState = !party.creditHold;

        // Optimistic State Update
        setParties(prev => prev.map(p => p.partyId === party.partyId ? { ...p, creditHold: nextHoldState } : p));
        if (selectedNoticeParty?.partyId === party.partyId) {
            setSelectedNoticeParty(prev => prev ? { ...prev, creditHold: nextHoldState } : null);
        }

        try {
            const res = await fetch("/api/dashboard/credit-risk/bad-debts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partyId: party.partyId,
                    partyName: party.partyName,
                    creditHold: nextHoldState,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to update credit hold");

            // Toast Alert
            setToastMsg(`Credit Hold ${nextHoldState ? "APPLIED 🔴 (Supply Frozen)" : "REMOVED 🟢 (Active Credit)"} for ${party.partyName}`);
            setTimeout(() => setToastMsg(null), 3200);
        } catch (e: any) {
            // Rollback on error
            setParties(prev => prev.map(p => p.partyId === party.partyId ? { ...p, creditHold: party.creditHold } : p));
            alert("Error updating credit hold: " + e.message);
        }
    };

    // Advanced Multi-Channel AI Notice Text Generator
    const generatedNoticeText = useMemo(() => {
        if (!selectedNoticeParty) return "";
        const p = selectedNoticeParty;
        const compName = selectedCompany?.companyName || "Mabsol Healthcare";
        const holdStatusStr = p.creditHold ? "🛑 CREDIT HOLD APPLIED (NEW ORDERS BLOCKED)" : "🟢 ACTIVE CREDIT";

        if (noticeChannel === "mr_field") {
            return `📍 FIELD MR ACTION DIRECTIVE — Party: ${p.partyName} (${p.city})\nLedger Overdue: ${formatCr(p.balance)} | 90+ Days Bad Debt: ${formatCr(p.aging90Plus)}\nAccount Status: ${holdStatusStr}\nMR Action Required: Visit party location immediately, collect payment cheque/NEFT, and verify store status. Credit Limit: ${formatCr(p.creditLimit)}.`;
        }

        if (noticeTone === "legal" || p.creditHold) {
            return `🚨 FINAL LEGAL & CREDIT HOLD NOTICE\nFrom: ${compName}\nTo: ${p.partyName} (${p.city}) [GST: ${p.gstNo}]\n\nYour account has an overdue ledger balance of ${formatCr(p.balance)}, including ${formatCr(p.aging90Plus)} past 90 DAYS OVERDUE.\n\nAccount Status: ${holdStatusStr}. All pending orders are currently FROZEN. Kindly remit payment to UPI/Bank Account (UPI: mabsol@upi | HDFC Bank A/c: 50200012345678, IFSC: HDFC0001234) within 48 hours to avoid legal proceedings.\n\nRegards,\nAccounts & Recovery Dept.`;
        }

        if (noticeTone === "firm") {
            return `⚠️ URGENT PAYMENT OVERDUE ALERT\nFrom: ${compName}\nTo: ${p.partyName} (${p.city})\n\nThis is a firm reminder regarding pending invoices totaling ${formatCr(p.balance)}, overdue by 60-90 DAYS (${formatCr(p.aging6190)}).\n\nKindly clear your outstanding balance today via UPI (mabsol@upi) or Bank Transfer to maintain uninterrupted dispatch of upcoming medicine orders.\n\nThank you,\nCredit Control Manager`;
        }

        return `🔔 FRIENDLY PAYMENT REMINDER\nFrom: ${compName}\nTo: ${p.partyName} (${p.city})\n\nDear Valued Stockist, friendly reminder that your balance of ${formatCr(p.balance)} is now due for payment. Kindly process payment at your earliest convenience to keep your ledger up to date.\n\nPayment UPI: mabsol@upi\nThank you for your business!`;
    }, [selectedNoticeParty, noticeTone, noticeChannel, selectedCompany]);

    const handleCopyNotice = () => {
        if (!generatedNoticeText) return;
        navigator.clipboard.writeText(generatedNoticeText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
    };

    const generatedOfferUrl = useMemo(() => {
        if (!generatedNoticeText) return "";
        const encoded = encodeURIComponent(generatedNoticeText);
        if (phoneClean) {
            return `https://wa.me/${phoneClean}?text=${encoded}`;
        }
        return `https://wa.me/?text=${encoded}`;
    }, [generatedNoticeText, phoneClean]);

    const generatedEmailUrl = useMemo(() => {
        if (!generatedNoticeText) return "";
        const compName = selectedCompany?.companyName || "Mabsol Healthcare";
        const subject = encodeURIComponent(`Payment Overdue Recovery Notice - ${compName}`);
        const body = encodeURIComponent(generatedNoticeText);
        if (selectedNoticeParty?.email) {
            return `mailto:${selectedNoticeParty.email}?subject=${subject}&body=${body}`;
        }
        return `mailto:?subject=${subject}&body=${body}`;
    }, [generatedNoticeText, selectedNoticeParty, selectedCompany]);

    const handleWhatsAppShare = () => {
        if (!generatedOfferUrl) return;
        window.open(generatedOfferUrl, "_blank");
    };

    const handleEmailShare = () => {
        if (!generatedEmailUrl) return;
        window.open(generatedEmailUrl, "_self");
    };

    return (
        <div className="min-h-screen p-2.5 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 relative">
            <AmbientBg />

            {/* Dynamic Toast Feedback */}
            {toastMsg && (
                <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top duration-300">
                    <div className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700">
                        <FaShieldAlt className="text-amber-400" size={14} />
                        <span>{toastMsg}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EF4444, #8B5CF6)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
                            <FaUserShield size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                                Bad Debt Parties &amp; Credit Risk Recovery
                            </h1>
                            <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5 m-0 font-medium">
                                Financial Loss Recovery · Overdue Aging (90+ Days) · Dynamic Credit Hold &amp; AI Recovery Circular
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
                        {parties.length > 0 && (
                            <button onClick={() => exportBadDebtCSV(filteredParties)}
                                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                <FaDownload size={9} /> Export Bad Debt CSV
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

            {/* Financial Credit Risk KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-slate-50/90 to-blue-50/70 border border-slate-200/70 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0 truncate">Total Outstanding Receivables</p>
                    <p className="text-sm sm:text-xl font-black text-slate-900 m-0 mt-0.5 truncate">{formatCr(summary?.totalReceivablesCost || 0)}</p>
                    <p className="text-[9px] text-slate-400 m-0 mt-0.5 truncate">{summary?.totalPartiesCount || parties.length} Total Overdue Parties</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-rose-50/90 to-red-100/70 border border-rose-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-600 m-0 truncate">90+ Days Bad Debt</p>
                        <FaSkullCrossbones size={11} className="text-rose-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-rose-700 m-0 mt-0.5 truncate">{formatCr(summary?.badDebt90PlusValue || 0)}</p>
                    <p className="text-[9px] text-rose-500 font-semibold m-0 mt-0.5 truncate">Critical Default Recovery</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-orange-50/90 to-amber-100/70 border border-orange-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-600 m-0 truncate">60-90 Days High Risk</p>
                        <FaExclamationTriangle size={11} className="text-orange-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-orange-700 m-0 mt-0.5 truncate">{formatCr(summary?.highRisk6090Value || 0)}</p>
                    <p className="text-[9px] text-orange-600 font-semibold m-0 mt-0.5 truncate">Send Urgent Notice</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/90 to-yellow-100/70 border border-amber-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 m-0 truncate">30-60 Days Moderate</p>
                        <FaHourglassHalf size={11} className="text-amber-600 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-amber-800 m-0 mt-0.5 truncate">{formatCr(summary?.moderate3060Value || 0)}</p>
                    <p className="text-[9px] text-amber-700 font-medium m-0 mt-0.5 truncate">Payment Reminders</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-purple-50/90 to-fuchsia-50/70 border border-purple-200/70 shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-600 m-0 truncate">Default Risk Parties</p>
                        <FaUserShield size={11} className="text-purple-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-purple-800 m-0 mt-0.5 truncate">{summary?.defaultPartiesCount || 0} Parties</p>
                    <p className="text-[9px] text-purple-700 font-medium m-0 mt-0.5 truncate">Score &lt; 60 or 60d+ Overdue</p>
                </div>
            </div>

            {/* Aging Risk Horizon Filter Controls */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-[14px] font-black text-slate-800 flex items-center gap-2 m-0">
                            <FaFilter size={12} className="text-indigo-500" />
                            Aging Overdue Horizon &amp; Risk Matrix Controls
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 m-0 font-medium font-sans">Filter parties by overdue aging buckets or credit risk score</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <FaSearch size={11} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search party name, city, GST..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide pt-2 border-t border-slate-200/60 gap-1.5">
                    {[
                        { key: "all", label: `All Overdue Parties (${parties.length})`, color: "bg-slate-100 text-slate-700" },
                        { key: "critical_90", label: "Critical Bad Debt (90+ Days)", color: "bg-rose-100 text-rose-800" },
                        { key: "high_60", label: "High Risk (60-90 Days)", color: "bg-orange-100 text-orange-800" },
                        { key: "moderate_30", label: "Moderate Risk (30-60 Days)", color: "bg-amber-100 text-amber-800" },
                        { key: "low_0", label: "Current (0-30 Days)", color: "bg-emerald-100 text-emerald-800" },
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

            {/* Party Credit Risk Management Table */}
            <GlassCard title="Party Credit Risk Management Table" subtitle={`Displaying ${filteredParties.length} parties matching risk criteria`}>
                <div className="overflow-x-auto mt-2 rounded-xl border border-slate-200/50">
                    <table className="w-full text-xs min-w-[820px]">
                        <thead>
                            <tr className="border-b border-slate-200/60 bg-slate-50/80">
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Party Name &amp; City</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Total Outstanding</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-semibold">Rhythm Score</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold w-28">Aging Mix</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">90+d Bad Debt</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-semibold">Status / Hold</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-400">
                                        <FaSync size={16} className="animate-spin inline-block mr-2 text-indigo-500" /> Loading credit risk analytics...
                                    </td>
                                </tr>
                            ) : paginatedParties.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-400">
                                        No party records matching selected risk filter
                                    </td>
                                </tr>
                            ) : (
                                paginatedParties.map((p) => {
                                    let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                    let badgeLabel = "LOW RISK";

                                    if (p.category === "critical_90") {
                                        badgeBg = "bg-rose-100 text-rose-800 border-rose-300 font-black";
                                        badgeLabel = "CRITICAL BAD DEBT";
                                    } else if (p.category === "high_60") {
                                        badgeBg = "bg-orange-100 text-orange-800 border-orange-300 font-black";
                                        badgeLabel = "HIGH RISK";
                                    } else if (p.category === "moderate_30") {
                                        badgeBg = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                                        badgeLabel = "MODERATE RISK";
                                    }

                                    const scoreColor = p.rhythmScore >= 75 ? "text-emerald-600" : p.rhythmScore >= 50 ? "text-amber-600" : "text-rose-600";

                                    return (
                                        <tr key={p.partyId} className={`border-b border-slate-100/60 transition-colors ${p.creditHold ? "bg-rose-50/30" : "hover:bg-white/60"}`}>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">
                                                <div className="truncate max-w-[200px] text-slate-900">{p.partyName}</div>
                                                <div className="text-[9px] text-slate-400 flex items-center gap-1.5 font-normal mt-0.5">
                                                    <span className="flex items-center gap-0.5"><FaMapMarkerAlt size={8} className="text-indigo-400" /> {p.city}</span>
                                                    <span>• GST: {p.gstNo}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                                {formatCr(p.balance)}
                                                <div className="text-[9px] text-slate-400 font-normal">Limit: {formatCr(p.creditLimit)}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className={`font-black text-xs ${scoreColor}`}>{p.rhythmScore}/100</span>
                                                    <span className="text-[8px] text-slate-400">Rhythm Score</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <AgingRatioBar p={p} />
                                                <div className="flex justify-between text-[8px] text-slate-400 mt-1 font-semibold">
                                                    <span className="text-emerald-600">{formatCr(p.aging030)}</span>
                                                    <span className="text-rose-600">{formatCr(p.aging90Plus)}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-rose-700 font-black">{p.aging90Plus > 0 ? formatCr(p.aging90Plus) : "—"}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] border ${badgeBg}`}>
                                                        {badgeLabel}
                                                    </span>
                                                    {p.creditHold && (
                                                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                                                            <FaLock size={7} /> CREDIT HOLD APPLIED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => toggleCreditHold(p)}
                                                        className={`px-2 py-1 rounded-lg border text-[10px] font-black transition-all flex items-center gap-1 active:scale-95 shadow-sm ${
                                                            p.creditHold
                                                                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                                                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                        }`}
                                                        title={p.creditHold ? "Click to Remove Credit Hold" : "Click to Apply Credit Hold & Freeze Orders"}>
                                                        {p.creditHold ? (
                                                            <>
                                                                <FaUnlock size={9} /> Unlock Credit
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaLock size={9} /> Apply Hold
                                                            </>
                                                        )}
                                                    </button>
                                                    <button onClick={() => setSelectedNoticeParty(p)}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 shadow-sm">
                                                        <FaBullhorn size={9} /> Notice
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
                {!loading && filteredParties.length > 0 && (
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
                            </select>
                            <span className="ml-2 font-semibold">
                                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredParties.length)} - {Math.min(currentPage * pageSize, filteredParties.length)} of {filteredParties.length} parties
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

            {/* ── AI Multi-Channel Recovery Notice Generator Modal 2.0 ───── */}
            {selectedNoticeParty && (
                <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl p-5 sm:p-6 space-y-3.5 border border-white/80 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 pr-8">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                                    <FaBullhorn size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 truncate">AI Recovery Notice Circular</h3>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 m-0 truncate font-semibold">{selectedNoticeParty.partyName} ({selectedNoticeParty.city})</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Right Close Button */}
                        <button onClick={() => setSelectedNoticeParty(null)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100/90 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0 border border-slate-200/60 shadow-sm">
                            <FaTimes size={13} />
                        </button>

                        {/* Stacked Clean Controls */}
                        <div className="space-y-2.5">
                            {/* Channel Target Selector */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Channel Target</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                                    {[
                                        { key: "whatsapp", label: "WhatsApp", icon: <FaWhatsapp size={10} /> },
                                        { key: "email", label: "Email", icon: <FaEnvelope size={10} /> },
                                        { key: "mr_field", label: "MR Direct", icon: <FaPaperPlane size={10} /> },
                                    ].map(ch => (
                                        <button key={ch.key} onClick={() => setNoticeChannel(ch.key as any)}
                                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all truncate ${
                                                noticeChannel === ch.key ? "bg-white text-indigo-700 shadow-sm border border-slate-200/40" : "text-slate-500"
                                            }`}>
                                            {ch.icon} <span className="truncate">{ch.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notice Tone Selector */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Notice Tone</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                                    {[
                                        { key: "polite", label: "Friendly" },
                                        { key: "firm", label: "Firm Overdue" },
                                        { key: "legal", label: "Legal Hold" },
                                    ].map(t => (
                                        <button key={t.key} onClick={() => setNoticeTone(t.key as any)}
                                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all text-center truncate ${
                                                noticeTone === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500"
                                            }`}>
                                            <span className="truncate">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Party Summary Card */}
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/70 text-xs space-y-1">
                            <div className="flex justify-between items-center text-slate-600">
                                <span className="font-medium">Phone Number:</span>
                                <span className="font-bold text-slate-900">
                                    {formattedPhoneDisplay ? (
                                        <a href={`tel:${selectedNoticeParty.phone}`} className="text-indigo-600 hover:underline flex items-center gap-1">
                                            <FaPhoneAlt size={9} /> {formattedPhoneDisplay}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">No Phone Saved</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span className="font-medium">Email Address:</span>
                                <span className="font-bold text-indigo-700 flex items-center gap-1 truncate max-w-[240px]">
                                    <FaEnvelope size={9} className="text-indigo-400 shrink-0" />
                                    <a href={`mailto:${selectedNoticeParty.email}`} className="hover:underline truncate">{selectedNoticeParty.email}</a>
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 pt-0.5 border-t border-slate-200/40">
                                <span className="font-medium">Credit Hold Status:</span>
                                <span className={`font-black text-xs ${selectedNoticeParty.creditHold ? "text-rose-600" : "text-emerald-600"}`}>
                                    {selectedNoticeParty.creditHold ? "🔴 CREDIT HOLD APPLIED" : "🟢 ACTIVE CREDIT"}
                                </span>
                            </div>
                        </div>

                        {/* Generated Notice Text Area */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span className="flex items-center gap-1.5"><FaBullhorn className="text-indigo-500" /> Pre-Filled Recovery Circular Text:</span>
                                <span className="text-[9px] text-slate-400 font-normal">Includes Bank UPI &amp; A/c Details</span>
                            </div>
                            <textarea
                                readOnly
                                value={generatedNoticeText}
                                rows={4}
                                className="w-full text-xs p-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/30 text-slate-800 font-medium focus:outline-none resize-none leading-relaxed shadow-inner font-sans"
                            />
                        </div>

                        {/* Action Buttons Bar */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                            {noticeChannel === "whatsapp" ? (
                                <button onClick={handleWhatsAppShare}
                                    className="flex items-center justify-center gap-1.5 text-xs font-black text-white px-3.5 py-2.5 rounded-xl transition-all active:scale-95 shadow-md flex-1"
                                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 4px 14px rgba(37,211,102,0.35)" }}>
                                    <FaWhatsapp size={14} />
                                    {formattedPhoneDisplay ? `Send to ${formattedPhoneDisplay}` : "Send WhatsApp Message"}
                                </button>
                            ) : noticeChannel === "email" ? (
                                <button onClick={handleEmailShare}
                                    className="flex items-center justify-center gap-1.5 text-xs font-black text-white px-3.5 py-2.5 rounded-xl transition-all active:scale-95 shadow-md flex-1"
                                    style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                                    <FaEnvelope size={14} />
                                    Send Email to {selectedNoticeParty.email.slice(0, 16)}...
                                </button>
                            ) : (
                                <button onClick={handleCopyNotice}
                                    className="flex items-center justify-center gap-1.5 text-xs font-black text-white px-3.5 py-2.5 rounded-xl transition-all active:scale-95 shadow-md flex-1 bg-purple-600 hover:bg-purple-700">
                                    <FaPaperPlane size={14} /> Direct MR Field Note
                                </button>
                            )}

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {copiedToast ? (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-3">
                                        <FaCheck size={12} /> Copied!
                                    </span>
                                ) : (
                                    <button onClick={handleCopyNotice}
                                        className="flex items-center gap-1.5 text-xs font-black text-slate-700 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 bg-slate-100 hover:bg-slate-200 border border-slate-200/80">
                                        <FaCopy size={12} /> Copy Text
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
