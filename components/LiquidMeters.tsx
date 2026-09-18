"use client";

import { useState } from "react";
import {
    FaShieldAlt,
    FaChartPie,
    FaInfoCircle,
    FaArrowUp,
    FaCheckCircle,
    FaExclamationCircle,
    FaFire,
} from "react-icons/fa";

type LiquidMetersProps = {
    kpis: any;
    analytics: any;
};

export default function LiquidMeters({ kpis, analytics }: LiquidMetersProps) {
    const [hoveredMeter, setHoveredMeter] = useState<string | null>(null);

    // 1. Collection Efficiency Score
    const collectionEfficiency = Math.min(
        100,
        Math.max(0, Number(analytics?.collectionEfficiency ?? 0))
    );

    // 2. Stock Health Safety Score
    const totalBatches = Math.max(1, Number(kpis?.totalBatches ?? kpis?.totalProducts ?? 50));
    const expiredCount = Number(kpis?.expiredBatches ?? 0);
    const nearExpiryCount = Number(kpis?.nearExpiryBatches ?? 0);
    const safeStockCount = Math.max(0, totalBatches - expiredCount - nearExpiryCount);
    const stockHealthScore = Math.min(100, Math.round((safeStockCount / totalBatches) * 100));

    // 3. Credit Risk Meter — arc fills RED to show DANGER level (overdueRatio)
    // Higher overdueRatio = more arc filled = more danger visible at a glance
    const totalOutAmt = Number(kpis?.totalOutstanding ?? 0);
    const totalOut = Math.max(1, totalOutAmt);
    const overdueAmt = Number(kpis?.overdueAmount ?? 0);
    const overdueRatio = totalOut > 0 ? Math.min(100, Math.round((Math.min(overdueAmt, totalOut) / totalOut) * 100)) : 0;
    // creditRiskLevel = how filled the arc is (100% overdue = arc completely filled with red)
    const creditRiskLevel = overdueRatio; // arc driven by RISK, not safety
    const creditSafetyScore = 100 - overdueRatio; // kept for label text only

    // 4. Sales Velocity Meter
    const todaySales = Number(kpis?.todaySales ?? 0);
    const avgDailySalesRaw = Number(analytics?.avgDailySales ?? 0);
    const yearlySales = Number(kpis?.yearlySales ?? kpis?.totalSales ?? 0);
    const avgDailySales = avgDailySalesRaw > 0 ? avgDailySalesRaw : (yearlySales > 0 ? yearlySales / 365 : 0);
    // Primary: today's sales pace vs daily benchmark
    const salesPaceRatio = avgDailySales > 0 ? Math.min(150, Math.round((todaySales / avgDailySales) * 100)) : 0;
    // Fallback when todaySales=0: FY completion rate — how much of expected-by-now sales achieved
    // Expected by today = avgDailySales * dayOfYear
    const dayOfYear = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
    const expectedSalesByNow = avgDailySales * dayOfYear;
    const fyCompletionRate = expectedSalesByNow > 0 ? Math.min(120, Math.round((yearlySales / expectedSalesByNow) * 100)) : 0;
    // Use fyCompletionRate when no today sales — gives a meaningful filled gauge
    const displayPaceRatio = todaySales > 0 ? Math.min(100, salesPaceRatio) : Math.min(100, fyCompletionRate);
    const isPaceToday = todaySales > 0;

    // SVG Math for Circular Rings
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    
    // SVG Math for Semi-Circle Gauges
    const semiRadius = 52;
    const semiCircumference = Math.PI * semiRadius;

    return (
        <div className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200 uppercase">
                        Live Executive Meters & Liquid Gauges
                    </h3>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:flex items-center gap-1">
                    <FaInfoCircle className="text-indigo-500" size={11} /> Hover meter for detailed breakdown
                </span>
            </div>

            {/* Grid of 4 Apple Liquid Glass Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                
                {/* METER 1: Collection Efficiency Liquid Ring */}
                <div
                    onMouseEnter={() => setHoveredMeter("collection")}
                    onMouseLeave={() => setHoveredMeter(null)}
                    className="
                        group relative isolate overflow-hidden rounded-2xl
                        bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150
                        border border-white/80 dark:border-slate-800
                        shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]
                        hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700
                        transition-all duration-150
                        p-3 sm:p-4 flex flex-col justify-between
                    "
                >
                    {/* Apple Top Sheen Edge */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                    
                    {/* Ambient Glow */}
                    <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/10 blur-2xl" />

                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                Cash Flow Meter
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                                Collection Efficiency
                            </h4>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50">
                            <FaArrowUp size={12} className="rotate-45" />
                        </div>
                    </div>

                    {/* SVG Radial Meter */}
                    <div className="relative flex items-center justify-center my-2">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            {/* Track Circle */}
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                className="text-slate-100 dark:text-slate-800 stroke-current"
                                strokeWidth="10"
                                fill="transparent"
                            />
                            {/* Liquid Gradient Progress Arc */}
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="url(#emeraldGradient)"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - (circumference * collectionEfficiency) / 100}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Center Glass Score Display */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                                {collectionEfficiency.toFixed(0)}<span className="text-xs text-emerald-600 font-semibold">%</span>
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {collectionEfficiency >= 80 ? "Optimal" : collectionEfficiency >= 50 ? "Moderate" : "Action Needed"}
                            </span>
                        </div>
                    </div>

                    {/* Footer Status Pill */}
                    <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Recovered:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                            ₹{Number(kpis?.totalCollections || 0).toLocaleString("en-IN")}
                        </span>
                    </div>
                </div>


                {/* METER 2: Stock Health & Safety Gauge */}
                <div
                    onMouseEnter={() => setHoveredMeter("stock")}
                    onMouseLeave={() => setHoveredMeter(null)}
                    className="
                        group relative isolate overflow-hidden rounded-2xl
                        bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150
                        border border-white/80 dark:border-slate-800
                        shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]
                        hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700
                        transition-all duration-150
                        p-3 sm:p-4 flex flex-col justify-between
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
                    <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-blue-500/10 blur-2xl" />

                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                Inventory Safety
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                                Stock Health Score
                            </h4>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50">
                            <FaShieldAlt size={12} />
                        </div>
                    </div>

                    {/* Radial Meter */}
                    <div className="relative flex items-center justify-center my-2">
                        <svg className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                className="text-slate-100 dark:text-slate-800 stroke-current"
                                strokeWidth="10"
                                fill="transparent"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="url(#blueGradient)"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - (circumference * stockHealthScore) / 100}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                                {stockHealthScore}<span className="text-xs text-blue-600 font-semibold">%</span>
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {expiredCount > 0 ? `${expiredCount} Expired` : "100% Safe"}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Near Expiry Batches:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {nearExpiryCount} Batches
                        </span>
                    </div>
                </div>


                {/* METER 3: Outstanding Credit Risk Speedometer Arc */}
                <div
                    onMouseEnter={() => setHoveredMeter("risk")}
                    onMouseLeave={() => setHoveredMeter(null)}
                    className="
                        group relative isolate overflow-hidden rounded-2xl
                        bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150
                        border border-white/80 dark:border-slate-800
                        shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]
                        hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700
                        transition-all duration-150
                        p-3 sm:p-4 flex flex-col justify-between
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
                    <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-rose-500/10 blur-2xl" />

                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                Credit Risk Index
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                                Ledger Safety & Overdue
                            </h4>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50">
                            <FaExclamationCircle size={12} />
                        </div>
                    </div>

                    {/* Semi-Circle Speedometer Arc — fills RED based on RISK level */}
                    <div className="relative flex flex-col items-center justify-center my-1 pt-2">
                        <svg className="w-32 h-18 sm:w-36 sm:h-20" viewBox="0 0 120 65">
                            {/* Track Arc */}
                            <path
                                d="M 10 60 A 50 50 0 0 1 110 60"
                                fill="none"
                                className="text-slate-100 dark:text-slate-800 stroke-current"
                                strokeWidth="10"
                                strokeLinecap="round"
                            />
                            {/* Risk Arc — fills based on overdueRatio so 100% risk = full arc */}
                            <path
                                d="M 10 60 A 50 50 0 0 1 110 60"
                                fill="none"
                                stroke="url(#riskGradient)"
                                strokeWidth="10"
                                strokeDasharray={semiCircumference}
                                strokeDashoffset={semiCircumference - (semiCircumference * creditRiskLevel) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                {/* Green → Orange → Red: left=safe, right=danger */}
                                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#f43f5e" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="absolute bottom-0 text-center">
                            <span className={`text-xl sm:text-2xl font-extrabold tracking-tight font-sans ${
                                creditRiskLevel >= 80 ? "text-rose-600" : creditRiskLevel >= 50 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                                {creditRiskLevel}<span className="text-xs font-normal text-slate-500">%</span>
                            </span>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {creditRiskLevel <= 20 ? "✅ Low Risk" : creditRiskLevel <= 50 ? "⚠️ Moderate" : "🚨 High Risk"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[11px]">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Overdue Amount:</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                ₹{overdueAmt.toLocaleString("en-IN")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total Outstanding:</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                ₹{Number(kpis?.totalOutstanding ?? 0).toLocaleString("en-IN")} ({overdueRatio}%)
                            </span>
                        </div>
                    </div>
                </div>


                {/* METER 4: Daily Sales Velocity Pace Meter */}
                <div
                    onMouseEnter={() => setHoveredMeter("salesPace")}
                    onMouseLeave={() => setHoveredMeter(null)}
                    className="
                        group relative isolate overflow-hidden rounded-2xl
                        bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150
                        border border-white/80 dark:border-slate-800
                        shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]
                        hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700
                        transition-all duration-150
                        p-3 sm:p-4 flex flex-col justify-between
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
                    <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl" />

                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                Daily Momentum
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                                Sales Velocity Pace
                            </h4>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50">
                            <FaFire size={12} />
                        </div>
                    </div>

                    {/* Radial Progress Ring — shows today pace OR FY completion rate */}
                    <div className="relative flex items-center justify-center my-2">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                className="text-slate-100 dark:text-slate-800 stroke-current"
                                strokeWidth="10"
                                fill="transparent"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="url(#purpleGradient)"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - (circumference * displayPaceRatio) / 100}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                                {displayPaceRatio}<span className="text-xs text-purple-600 font-semibold">%</span>
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {isPaceToday
                                    ? (salesPaceRatio >= 100 ? "🔥 Ahead of Avg" : "Building Pace")
                                    : (fyCompletionRate >= 100 ? "🏆 On Track" : fyCompletionRate >= 75 ? "Good Pace" : "Below Target")}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[11px]">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">
                                {isPaceToday ? "Today vs Benchmark:" : "FY Completion Rate:"}
                            </span>
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                                {displayPaceRatio}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                                {isPaceToday ? "Daily Avg Benchmark:" : "Total FY Sales:"}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {isPaceToday
                                    ? `₹${Math.round(avgDailySales).toLocaleString("en-IN")}/day`
                                    : `₹${Math.round(yearlySales).toLocaleString("en-IN")}`}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
