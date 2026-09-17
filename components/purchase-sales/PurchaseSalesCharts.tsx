"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
} from "recharts";
import {
  FaChartArea,
  FaTachometerAlt,
  FaChartPie,
  FaBuffer,
  FaProjectDiagram,
  FaBoxes,
  FaExchangeAlt,
  FaInfoCircle,
} from "react-icons/fa";

const formatCurrency = (val: number) => {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
  return `₹${val}`;
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group/info inline-flex items-center z-30">
    <FaInfoCircle className="text-slate-400 hover:text-indigo-500 text-xs transition-colors cursor-pointer shrink-0" />
    <div className="absolute left-0 top-full mt-2 hidden group-hover/info:block w-60 sm:w-64 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-medium rounded-2xl shadow-2xl z-[100] border border-slate-700/80 backdrop-blur-xl pointer-events-none leading-relaxed">
      <div className="font-bold text-sky-400 mb-1 flex items-center gap-1">
        <span>ℹ️ Data Origin & Formula</span>
      </div>
      <p className="text-slate-200 text-[10.5px] leading-snug">{text}</p>
    </div>
  </div>
);

interface ChartsProps {
  dualTrendData: any[];
  categoriesData: any[];
  tradeFunnelData: any[];
  categoryRadarData: any[];
  treemapItemsData: any[];
  salesPaymentBreakdown: any[];
  purchasePaymentBreakdown: any[];
  returnsComparison: any[];
  summary: any;
  onItemClick?: (item: any) => void;
}

export default function PurchaseSalesCharts({
  dualTrendData,
  categoriesData,
  tradeFunnelData,
  categoryRadarData,
  treemapItemsData,
  salesPaymentBreakdown,
  purchasePaymentBreakdown,
  returnsComparison,
  summary,
  onItemClick,
}: ChartsProps) {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === undefined || percent === null || isNaN(percent) || percent <= 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-[10px] font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* ------------------------------------------------------------- */}
      {/* GRAPH 1 & GRAPH 2: Dual Trend Combo Chart & Radial Speedometer Gauge */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 w-full">
        {/* CHART 1: Sales vs Purchase Dual Trend & Moving Average Overlay */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-indigo-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 w-full">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FaChartArea className="text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    Sales vs Purchase Dual Trend & Moving Average
                  </h3>
                  <InfoTooltip text="Fetched from SalesMdis (TYPE:'S') & PurchaseBill collections. Displays monthly aggregate sales vs purchases along with 3-month moving average trendlines." />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Monthly trade trajectory & moving average overlay
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Sales
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Purchases
              </span>
            </div>
          </div>

          <div className="h-[260px] sm:h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dualTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis width={55} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value: any, name: any) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderRadius: "16px",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchase Spend" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
                <Line type="monotone" dataKey="salesMovingAvg" name="Sales Moving Avg" stroke="#059669" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="purchaseMovingAvg" name="Purchase Moving Avg" stroke="#0369a1" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Purchase-to-Sale Speedometer & Velocity Gauge */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-sky-500/5 hover:shadow-2xl transition-all flex flex-col justify-between w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-2 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <FaTachometerAlt className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Purchase Velocity Gauge
                </h3>
                <InfoTooltip text="Calculated as (Total Sales Revenue / Total Purchase Intake) * 100. Gauges how fast stock inventory is converted into realized sales." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Conversion efficiency speedometer
              </p>
            </div>
          </div>

          {/* Custom SVG Speedometer Gauge */}
          <div className="relative flex flex-col items-center justify-center my-3 w-full">
            <svg className="w-full max-w-[200px] h-auto" viewBox="0 0 200 120">
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * Math.min(100, summary?.purchaseUtilizationRate || 75)) / 100}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Needle Indicator */}
              <g transform={`rotate(${((summary?.purchaseUtilizationRate || 75) / 100) * 180 - 90}, 100, 100)`}>
                <line x1="100" y1="100" x2="100" y2="35" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
                <circle cx="100" cy="100" r="7" fill="#6366f1" />
              </g>
            </svg>

            <div className="text-center -mt-5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {summary?.purchaseUtilizationRate || 0}%
              </span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Purchase-to-Sales Ratio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 w-full">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Gross Margin %</span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary?.grossMarginPercent || 0}%
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Turnover Velocity</span>
              <span className="text-xs sm:text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {summary?.inventoryTurnoverVelocity || 6.4}x / yr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPH 3 & GRAPH 4: Sunburst Category Double Donut & Sales Flow Funnel */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 w-full">
        {/* CHART 3: Category Profit Share & Purchase/Sale Double Ring Matrix */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-emerald-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 w-full">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <FaChartPie className="text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    Category Profit Share & Donut Matrix
                  </h3>
                  <InfoTooltip text="Nested Donut: Inner Ring represents Purchase Cost distribution by Category (PurchaseBill). Outer Ring represents Sales Revenue distribution by Category (SalesMdis)." />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Inner: Purchase | Outer: Sales Revenue
                </p>
              </div>
            </div>
          </div>

          <div className="h-[250px] sm:h-[280px] w-full flex items-center justify-center min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(val: any) => formatCurrency(val)} />
                {/* Inner Ring: Purchase Amount */}
                <Pie
                  data={categoriesData}
                  dataKey="purchaseAmount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {categoriesData.map((_, index) => (
                    <Cell
                      key={`inner-${index}`}
                      fill={["#6366f1", "#0284c7", "#f59e0b", "#8b5cf6", "#ec4899"][index % 5]}
                      opacity={0.8}
                    />
                  ))}
                </Pie>
                {/* Outer Ring: Sales Amount */}
                <Pie
                  data={categoriesData}
                  dataKey="saleAmount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={74}
                  outerRadius={105}
                  paddingAngle={3}
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  {categoriesData.map((_, index) => (
                    <Cell
                      key={`outer-${index}`}
                      fill={["#10b981", "#3b82f6", "#f97316", "#a855f7", "#f43f5e"][index % 5]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full">
            {categoriesData.slice(0, 4).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                <span className="truncate max-w-[130px] font-semibold text-slate-700 dark:text-slate-300">
                  {cat.categoryName}
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {cat.grossMargin}% margin
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 4: Sales Flow & Conversion Funnel Chart */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-amber-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FaProjectDiagram className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Trade Conversion Funnel
                </h3>
                <InfoTooltip text="Tracks trade value progression step-by-step from Purchase Orders -> Inward Stock -> Dispatched Sales -> Realized Collections -> Net Retained Profit." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Stage-by-stage value realization
              </p>
            </div>
          </div>

          {/* Funnel Steps Visualization */}
          <div className="space-y-3 mt-3 w-full">
            {tradeFunnelData.map((item, idx) => {
              const bgGradients = [
                "from-indigo-600 to-sky-500",
                "from-sky-500 to-teal-500",
                "from-teal-500 to-emerald-500",
                "from-emerald-500 to-amber-500",
                "from-amber-500 to-rose-500",
                "from-rose-500 to-violet-600",
              ];
              return (
                <div key={idx} className="relative group w-full">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-200 gap-2">
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="truncate">{item.stage}</span>
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 shrink-0">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-5 sm:h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden p-0.5 relative">
                    <div
                      className={`h-full rounded-lg bg-gradient-to-r ${bgGradients[idx % bgGradients.length]} transition-all duration-700 shadow-sm`}
                      style={{ width: `${item.percentage}%` }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPH 5 & GRAPH 6: Radar Spider Chart & Volume/Margin Treemap Heatmap */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 w-full">
        {/* CHART 5: Product & Category Spider / Radar Matrix */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-violet-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <FaBuffer className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Category Spider Radar
                </h3>
                <InfoTooltip text="Compares the returned category metrics on a 0–100 chart scale. Sales and purchase values are normalized from stored transaction totals; unavailable source metrics remain 0 rather than being estimated." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                5-dimensional trade metrics radar
              </p>
            </div>
          </div>

          <div className="h-[250px] sm:h-[290px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                {Array.from(
                  new Set(
                    categoryRadarData.flatMap((row: any) =>
                      Object.keys(row).filter((key) => key !== "metric")
                    )
                  )
                ).slice(0, 5).map((categoryName, index) => {
                  const strokes = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];
                  const stroke = strokes[index % strokes.length];
                  return (
                    <Radar
                      key={categoryName}
                      name={categoryName}
                      dataKey={categoryName}
                      stroke={stroke}
                      fill={stroke}
                      fillOpacity={0.25}
                    />
                  );
                })}
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: Trade Volume & Profitability Treemap Heatmap */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-rose-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <FaBoxes className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Item Trade Volume & Margin Grid
                </h3>
                <InfoTooltip text="Derived from SalesDis & Product masters. Block size represents Total Sales Volume; color gradient represents Profit Margin % (Emerald >=40%, Sky >=30%, Amber <30%). Click any block to view full details." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Block size: Sales | Color: Profit Margin %
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
            {treemapItemsData.map((item, idx) => {
              const marginColor =
                item.profitMargin >= 40
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : item.profitMargin >= 30
                  ? "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300";

              return (
                <div
                  key={idx}
                  onClick={() => onItemClick && onItemClick(item)}
                  className={`p-3 rounded-2xl border ${marginColor} hover:scale-102 transition-all cursor-pointer shadow-sm w-full min-w-0`}
                >
                  <span className="text-[9px] font-extrabold uppercase opacity-75 tracking-wider block">
                    {item.code}
                  </span>
                  <h4 className="text-xs font-bold truncate mt-0.5">{item.name}</h4>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-current/10 text-[10px]">
                    <span className="font-semibold">{formatCurrency(item.salesVolume)}</span>
                    <span className="font-extrabold">{item.profitMargin}% margin</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPH 7 & GRAPH 8: Payment Mode Donut & Net Balance Divergence Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 w-full">
        {/* CHART 7: Payment & Returns Distribution Donut */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-teal-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <FaExchangeAlt className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Payment Modes & Returns
                </h3>
                <InfoTooltip text="Donut Chart displays Cash vs Credit vs Bank transactions from GLedger & SalesMdis BOOK registers. Bottom list compares Sale Returns vs Purchase Returns ratio." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Cash vs Credit & Return Ratios
              </p>
            </div>
          </div>

          <div className="h-[200px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesPaymentBreakdown}
                  dataKey="value"
                  nameKey="mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={36}
                  paddingAngle={4}
                >
                  {salesPaymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 w-full">
            {returnsComparison.map((ret, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{ret.type}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(ret.amount)}</span>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    {ret.ratio}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 8: Monthly Net Cash Flow & Divergence Bar Chart */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl shadow-indigo-500/5 hover:shadow-2xl transition-all w-full min-w-0 relative">
          <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <FaChartArea className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Financial Divergence & Monthly Net Cash Balance
                </h3>
                <InfoTooltip text="Calculated as (Monthly Sales Revenue - Monthly Purchase Spend). Green bars represent positive net cash inflow; Red bars represent net outflow." />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Net Monthly Cash Spread (Sales - Purchases)
              </p>
            </div>
          </div>

          <div className="h-[250px] sm:h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dualTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis width={55} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="netSpread" name="Net Monthly Cash Spread" radius={[8, 8, 0, 0]}>
                  {dualTrendData.map((entry, index) => (
                    <Cell
                      key={`cell-bar-${index}`}
                      fill={entry.netSpread >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
