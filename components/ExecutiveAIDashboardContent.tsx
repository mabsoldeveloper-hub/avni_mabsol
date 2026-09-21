"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const TargetRadarChart = dynamic(() => import("@/components/NextGenDashboard/TargetRadarChart"), {
    ssr: false,
    loading: () => <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Performance Radar...</div>,
});
const CreditRiskQuadrant = dynamic(() => import("@/components/NextGenDashboard/CreditRiskQuadrant"), {
    ssr: false,
    loading: () => <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Credit Risk Quadrant...</div>,
});
const DetailingFunnelChart = dynamic(() => import("@/components/NextGenDashboard/DetailingFunnelChart"), {
    ssr: false,
    loading: () => <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Detailing Funnel...</div>,
});

import KPICards from "@/components/KPICards";
import DashboardCharts, { PurchaseDashboardCharts, CreditDashboardCharts } from "@/components/dashboard/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";
import LiquidMeters from "@/components/LiquidMeters";
import FinancialSimulatorWidget from "@/components/FinancialSimulatorWidget";
import SmartInsightsWidget from "@/components/SmartInsightsWidget";
import DashboardLiveClock from "@/components/dashboard/DashboardLiveClock";
import { Sparkles } from "lucide-react";
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaSyncAlt,
    FaCalendarAlt,
    FaChartPie,
    FaChartLine,
    FaBoxes,
    FaWallet,
    FaTruck,
    FaBrain,
    FaMagic,
    FaClock,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

type TabType = "overview" | "simulator" | "inventory" | "credit" | "fieldforce";

export default function ExecutiveAIDashboardContent() {
    const [data, setData] = useState<any>(null);
    const [creditData, setCreditData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

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

    const loadDashboard = useCallback(async () => {
        if (!data) {
            setLoading(true);
        }
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) {
                params.set("companyId", selectedCompany._id);
            }
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

            const queryString = params.toString();
            const url = queryString ? `/api/dashboard?${queryString}` : "/api/dashboard";

            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }

            // Fetch credit risk matrix data
            const creditRes = await fetch(queryString ? `/api/dashboard/credit-risk?${queryString}` : "/api/dashboard/credit-risk");
            if (creditRes.ok) {
                const creditJson = await creditRes.json();
                setCreditData(creditJson);
            }
        } catch (err) {
            console.error("Executive AI Dashboard fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCompany?._id, selectedFY?._id, data]);

    const handleManualRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [selectedCompany?._id, selectedFY?._id]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning ☀️";
        if (hour < 17) return "Good Afternoon 🌤️";
        return "Good Evening 🌙";
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500 animate-pulse">Initializing Executive AI Intelligence OS...</p>
            </div>
        );
    }

    const tabs = [
        { id: "overview", label: "Executive Command Center", icon: FaBrain, badge: "AI Live" },
        { id: "simulator", label: "What-If Revenue Simulator", icon: Sparkles, badge: "Forecast" },
        { id: "inventory", label: "Liquid Stock & Expiry", icon: FaBoxes, badge: "Risk" },
        { id: "credit", label: "Credit Risk Matrix", icon: FaWallet, badge: "Dues" },
        { id: "fieldforce", label: "MR Field Detailing", icon: FaChartLine, badge: "Funnel" },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* ==================== APPLE EXECUTIVE LIQUID GLASS BANNER ==================== */}
            <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-violet-500/20 text-violet-300 px-3 py-0.5 rounded-full border border-violet-400/30 backdrop-blur-md flex items-center gap-1">
                                <Sparkles size={9} /> Executive AI Intelligence OS
                            </span>
                            {selectedCompany?.companyName && (
                                <span className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                                    <FaBuilding size={9} /> {selectedCompany.companyName}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
                            {getGreeting()}
                        </h2>
                        <p className="text-xs text-violet-200/80 font-medium mt-1">
                            Real-time 6-axis performance radar, credit risk quadrant, & "What-If" growth simulator
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <DashboardLiveClock isDark={true} accentColor="cyan" />
                        {selectedFY && (
                            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-white">
                                <FaCalendarAlt size={12} className="text-cyan-300" />
                                <span className="font-semibold text-[11px]">FY: {selectedFY.fyName || "Current FY"}</span>
                            </div>
                        )}
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-violet-600/60 hover:bg-violet-600 active:scale-95 transition-all text-xs font-semibold text-white backdrop-blur-xl border border-violet-400/40 cursor-pointer shadow-md"
                        >
                            <FaSyncAlt size={11} className={`${refreshing ? "animate-spin" : ""}`} />
                            <span>{refreshing ? "Syncing..." : "Refresh Intelligence"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== MR TERRITORY RESTRICTION BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 backdrop-blur-xl px-4 py-3 shadow-xs">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Assigned Territory View</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            Aapki login permission aapki assigned territory tak restricted ha.
                            {mrTerritoryInfo.territories.length > 0 && (
                                <> Assigned: {Array.from(new Set(mrTerritoryInfo.territories.map((t) => t.companyName || t.companyCode))).join(", ")}</>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* ==================== FLOATING GLASS TAB BAR ==================== */}
            <div className="flex flex-wrap items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-2 rounded-2xl border border-white/80 dark:border-slate-800 backdrop-blur-2xl shadow-xs">
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
                                transition-all duration-300 cursor-pointer border
                                ${isActive
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md scale-[1.02]"
                                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
                                }
                            `}
                        >
                            <IconComponent size={14} className={isActive ? "text-white" : "opacity-70"} />
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-500/10 text-slate-500"
                                }`}>
                                {tab.badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ==================== TAB CONTENT RENDERING ==================== */}

            {/* TAB 1: EXECUTIVE COMMAND CENTER */}
            {activeTab === "overview" && (
                <>
                    <TargetRadarChart kpis={data?.kpis} analytics={data?.analytics} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <FinancialSimulatorWidget kpis={data?.kpis} analytics={data?.analytics} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <SmartInsightsWidget kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                    <DetailingFunnelChart analytics={data?.analytics} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <AnalyticsCards analytics={data?.analytics} />
                </>
            )}

            {/* TAB 2: WHAT-IF REVENUE SIMULATOR */}
            {activeTab === "simulator" && (
                <>
                    <FinancialSimulatorWidget kpis={data?.kpis} analytics={data?.analytics} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                    <AnalyticsCards analytics={data?.analytics} />
                </>
            )}

            {/* TAB 3: LIQUID STOCK & EXPIRY */}
            {activeTab === "inventory" && (
                <>
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                </>
            )}

            {/* TAB 4: CREDIT RISK MATRIX */}
            {activeTab === "credit" && (
                <>
                    <CreditRiskQuadrant creditData={creditData} charts={data?.charts} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <CreditDashboardCharts charts={data?.charts} />
                </>
            )}

            {/* TAB 5: MR FIELD DETAILING */}
            {activeTab === "fieldforce" && (
                <>
                    <DetailingFunnelChart analytics={data?.analytics} selectedFYName={selectedFY?.fyName || "Current FY"} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                </>
            )}
        </div>
    );
}
