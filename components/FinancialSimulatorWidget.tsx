"use client";

import { useState } from "react";
import { Sliders, Sparkles, TrendingUp, DollarSign, Calculator, RefreshCw, Info, Percent, Award, Coins } from "lucide-react";

type FinancialSimulatorProps = {
    kpis: any;
    analytics: any;
    selectedFYName?: string;
};

export default function FinancialSimulatorWidget({ kpis, analytics, selectedFYName = "Current FY" }: FinancialSimulatorProps) {
    const rawMonthlySales = Number(kpis?.monthlySales ?? 0);
    const rawTotalSales = Number(kpis?.totalSales ?? 0);
    const rawYearlySales = Number(kpis?.yearlySales ?? 0);

    // Use monthly sales if available, otherwise calculate average monthly sales from FY total sales or fallback baseline
    const baselineMonthlySales = rawMonthlySales > 0 
        ? rawMonthlySales 
        : rawTotalSales > 0 
        ? Math.round(rawTotalSales / 12) 
        : rawYearlySales > 0 
        ? Math.round(rawYearlySales / 12) 
        : 1250000;

    const totalCollections = Number(kpis?.totalCollections ?? 0) || Math.round(baselineMonthlySales * 0.82);
    const grossMarginVal = Number(analytics?.grossMargin ?? 0) || Math.round(baselineMonthlySales * 0.22);

    // Interactive Slider States
    const [salesBoostPct, setSalesBoostPct] = useState(15); // +15% target boost
    const [targetCollEff, setTargetCollEff] = useState(85); // 85% target collection
    const [discountPct, setDiscountPct] = useState(3); // 3% average discount
    const [incentivePct, setIncentivePct] = useState(2); // 2% MR commission rate
    const [unitFormat, setUnitFormat] = useState<"inr" | "lakhs">("inr");

    // Dynamic Calculations
    const rawProjectedSales = Math.round(baselineMonthlySales * (1 + salesBoostPct / 100));
    const netDiscountDeduction = Math.round(rawProjectedSales * (discountPct / 100));
    const projectedSales = rawProjectedSales - netDiscountDeduction;
    const salesDifference = projectedSales - baselineMonthlySales;

    const projectedCollections = Math.round(projectedSales * (targetCollEff / 100));
    
    const marginRate = baselineMonthlySales > 0 ? (grossMarginVal / baselineMonthlySales) : 0.22;
    const grossMarginBeforeIncentive = Math.round(projectedSales * marginRate);
    const repIncentivePayout = Math.round(projectedSales * (incentivePct / 100));
    const projectedMargin = grossMarginBeforeIncentive - repIncentivePayout;
    const marginGain = projectedMargin - grossMarginVal;

    const formatMoney = (val: number) => {
        if (unitFormat === "lakhs") {
            return `₹${(val / 100000).toFixed(2)} Lakhs`;
        }
        return `₹${val.toLocaleString("en-IN")}`;
    };

    const handleReset = () => {
        setSalesBoostPct(15);
        setTargetCollEff(85);
        setDiscountPct(3);
        setIncentivePct(2);
    };

    return (
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-180 border border-white/80 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all">
            {/* Specular Catch Light Top Rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50 shadow-2xs">
                        <Calculator size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
                                Executive "What-If" Revenue & Margin Simulator
                            </h3>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                Interactive Simulator
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Adjust growth, discount & commission sliders for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedFYName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Unit Format Toggle */}
                    <button
                        onClick={() => setUnitFormat(unitFormat === "inr" ? "lakhs" : "inr")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                    >
                        <Coins size={12} />
                        <span>{unitFormat === "inr" ? "INR Format" : "Lakhs Format"}</span>
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                    >
                        <RefreshCw size={12} /> Reset
                    </button>
                </div>
            </div>

            {/* Data Lineage & Instruction Banner */}
            {/* <div className="mb-5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-cyan-800 dark:text-cyan-200">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-cyan-500 shrink-0" />
                    <span>
                        <strong>Data Origin & Calculation:</strong> Baseline revenue (<strong>{formatMoney(baselineMonthlySales)}</strong>) is pulled live from MongoDB <code className="font-mono bg-cyan-500/20 px-1 py-0.5 rounded text-[11px]">SalesMdis</code> (TYPE="S", Invoiced Sales). Sliders dynamically recalculate gross profit margins, cash recovery, scheme discounts, and rep commissions.
                    </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-600 text-white shrink-0">
                    Data Verified
                </span>
            </div> */}

            {/* Main Content Grid: Sliders Left + Realtime Forecast Cards Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* SLIDERS (6 Cols) */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-3.5 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md">
                    {/* Slider 1: Sales Growth Target */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-cyan-500" /> Target Sales Growth Boost
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800 font-mono">
                                +{salesBoostPct}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={salesBoostPct}
                            onChange={(e) => setSalesBoostPct(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    {/* Slider 2: Target Collection Recovery Rate */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span className="flex items-center gap-1.5">
                                <DollarSign size={14} className="text-emerald-500" /> Target Cash Collection Efficiency
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-mono">
                                {targetCollEff}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="100"
                            step="1"
                            value={targetCollEff}
                            onChange={(e) => setTargetCollEff(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>

                    {/* Slider 3: Scheme Discount Adjustment */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span className="flex items-center gap-1.5">
                                <Percent size={14} className="text-amber-500" /> Scheme Discount Rate
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 font-mono">
                                {discountPct}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={discountPct}
                            onChange={(e) => setDiscountPct(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>

                    {/* Slider 4: MR Field Force Incentive */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span className="flex items-center gap-1.5">
                                <Award size={14} className="text-purple-500" /> Rep Commission Incentive
                            </span>
                            <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 font-mono">
                                {incentivePct}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={incentivePct}
                            onChange={(e) => setIncentivePct(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                </div>

                {/* FORECAST DISPLAY CARDS (6 Cols) */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1: Projected Revenue */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-200/80 dark:border-cyan-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-cyan-600 dark:text-cyan-400 tracking-wider">
                            Projected Net Revenue
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                {formatMoney(projectedSales)}
                            </p>
                            <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> +{formatMoney(salesDifference)} gain
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">After -{discountPct}% scheme discount</span>
                    </div>

                    {/* Card 2: Projected Cash Recovery */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Projected Cash Inflow
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                {formatMoney(projectedCollections)}
                            </p>
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> {targetCollEff}% recovery speed
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">Net bank liquidity</span>
                    </div>

                    {/* Card 3: Estimated Margin Gain */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                            Net Profit Margin
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                {formatMoney(projectedMargin)}
                            </p>
                            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> +{formatMoney(marginGain)} net profit
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">After rep incentive deduction</span>
                    </div>

                    {/* Card 4: Field Force Incentive Payout */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-purple-600 dark:text-purple-400 tracking-wider">
                            Rep Incentive Pool
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                {formatMoney(repIncentivePayout)}
                            </p>
                            <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> {incentivePct}% payout pool
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">Field force commission budget</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
