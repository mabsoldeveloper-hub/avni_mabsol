"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    RadialBarChart,
    RadialBar,
    ScatterChart,
    Scatter,
    ZAxis,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    TrendingUp,
    ArrowLeftRight,
    AlertTriangle,
    Wallet,
    Package,
    Users,
    Boxes,
    CalendarClock,
    PieChart as PieIcon,
    LineChart as LineIcon,
    LucideIcon,
    X,
    Maximize2,
    Table as TableIcon,
    Activity,
    Compass,
    Layers,
    Sliders,
    Award,
    Sparkles,
    Search,
    Crosshair,
    Milestone,
    BarChart2,
    Truck,
    ShieldAlert,
    Clock,
} from "lucide-react";

const COLORS = ["#343872", "#fb8c00", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#f1c40f"];

const AXIS_STYLE = { fontSize: 11, fill: "#64748b" };
const GRID_STROKE = "#e2e8f0";

function truncateLabel(value: string, max = 16) {
    if (!value) return value;
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
            {label && <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span
                        className="h-2.5 w-2.5 rounded-full shadow-xs"
                        style={{ backgroundColor: p.color || p.fill }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{p.name}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                        {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Card shell — liquid glass with click popover
function ChartCard({
    title,
    subtitle,
    icon: Icon,
    iconColor = "#343872",
    children,
    emptyMessage,
    span,
    index = 0,
    onClick,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    children: React.ReactNode;
    emptyMessage?: string;
    span?: "full";
    index?: number;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`
                group relative isolate overflow-hidden cursor-pointer rounded-2xl
                bg-white/65 dark:bg-slate-900/65 backdrop-blur-2xl backdrop-saturate-180
                border border-white/80 dark:border-slate-800/80
                shadow-[0_8px_32px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]
                animate-[fadeSlideIn_0.5s_cubic-bezier(0.16,1,0.3,1)_both]
                transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                hover:-translate-y-1.5 hover:scale-[1.015]
                hover:shadow-[0_20px_45px_rgba(31,38,135,0.15),inset_0_1px_1px_rgba(255,255,255,1)]
                hover:border-indigo-300/80 dark:hover:border-indigo-700/80
                p-5 sm:p-6
                ${span === "full" ? "xl:col-span-2" : ""}
            `}
        >
            {/* Apple Light Specular Edge */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-slate-700 to-transparent group-hover:via-indigo-400 transition-colors" />

            <div
                className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl opacity-40 scale-90 transition-all duration-700 ease-out group-hover:opacity-80 group-hover:scale-125"
                style={{ background: `radial-gradient(circle, ${iconColor}44, transparent 70%)` }}
            />

            <div className="relative mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md shadow-2xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6"
                    >
                        <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h5 className="truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h5>
                        {subtitle && <p className="mt-0.5 text-[10.5px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200/50">
                    <span>Expand</span> <Maximize2 size={11} />
                </div>
            </div>

            {emptyMessage ? (
                <div className="relative flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/70 bg-white/30 backdrop-blur-sm px-6 text-center">
                    <AlertTriangle className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                    <p className="text-xs leading-relaxed text-slate-500">{emptyMessage}</p>
                </div>
            ) : (
                <div className="relative">
                    <ResponsiveContainer width="100%" height={260}>
                        {children as any}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function mergeByMonth(sales: any[] = [], collection: any[] = []) {
    const map = new Map<string, { month: string; sales: number; collection: number }>();
    for (const item of sales) {
        map.set(item.month, { month: item.month, sales: item.total || 0, collection: 0 });
    }
    for (const item of collection) {
        const existing = map.get(item.month);
        if (existing) {
            existing.collection = item.total || 0;
        } else {
            map.set(item.month, { month: item.month, sales: 0, collection: item.total || 0 });
        }
    }
    return Array.from(map.values());
}

export default function DashboardCharts({ charts }: { charts: any }) {
    const [chartModal, setChartModal] = useState<{
        isOpen: boolean;
        title: string;
        subtitle: string;
        data: any[];
    }>({
        isOpen: false,
        title: "",
        subtitle: "",
        data: [],
    });

    const [modalSearch, setModalSearch] = useState("");

    if (!charts) return null;

    const openModal = (title: string, subtitle: string, data: any[]) => {
        setChartModal({
            isOpen: true,
            title,
            subtitle,
            data: data || [],
        });
        setModalSearch("");
    };

    const filteredModalData = (chartModal.data || []).filter((row: any) => {
        if (!modalSearch) return true;
        const search = modalSearch.toLowerCase();
        const label = String(row.name || row.month || row.bucket || row.status || row.subject || "").toLowerCase();
        return label.includes(search);
    });

    // Calculate sum of values in modal
    const totalModalValue = filteredModalData.reduce((acc: number, row: any) => {
        const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? 0);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    return (
        <div className="space-y-4">
            {/* Section Heading */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200 uppercase">
                        Interactive Analytics & Performance Radar
                    </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Click any chart for full drilldown modal</span>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* 1. Sales Trend (Area Chart) */}
                <ChartCard
                    index={0}
                    title="Sales Revenue Trend"
                    subtitle="Monthly total sales volume"
                    icon={TrendingUp}
                    iconColor="#6366f1"
                    onClick={() => openModal("Sales Revenue Trend", "Monthly Sales Performance Breakdown", charts.salesTrend)}
                >
                    <AreaChart data={charts.salesTrend}>
                        <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="total"
                            name="Sales"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#salesGrad)"
                        />
                    </AreaChart>
                </ChartCard>

                {/* 2. Business Performance Health Web (Radar Chart) */}
                <ChartCard
                    index={1}
                    title="Executive Performance Radar"
                    subtitle="6-Dimension business health Index"
                    icon={Activity}
                    iconColor="#06b6d4"
                    onClick={() => openModal("Executive Performance Radar", "6-Dimension Business Health Scores", charts.radarHealth || [])}
                >
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={charts.radarHealth || []}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Performance Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} strokeWidth={2} />
                        <Tooltip content={<ChartTooltip />} />
                    </RadarChart>
                </ChartCard>

                {/* 3. Cash Flow Dynamics (Composed Area & Line Chart) */}
                <ChartCard
                    index={2}
                    title="Cash Flow Dynamics"
                    subtitle="Sales vs Collections vs Purchases"
                    icon={Layers}
                    iconColor="#10b981"
                    onClick={() => openModal("Cash Flow Dynamics", "Triple-Voucher Cashflow Stream Analysis", charts.cashFlowDynamics || mergeByMonth(charts.salesTrend, charts.collectionTrend))}
                >
                    <ComposedChart data={charts.cashFlowDynamics || mergeByMonth(charts.salesTrend, charts.collectionTrend)}>
                        <defs>
                            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
                        <Area type="monotone" dataKey="sales" name="Sales" fill="url(#cashGrad)" stroke="#10b981" strokeWidth={2.5} />
                        <Line type="monotone" dataKey="collections" name="Collections" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="purchases" name="Purchases (Est)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </ComposedChart>
                </ChartCard>

                {/* 4. Customer Revenue Concentration Donut */}
                <ChartCard
                    index={3}
                    title="Customer Revenue Pareto Ratio"
                    subtitle="VIP vs Standard Account contribution"
                    icon={Award}
                    iconColor="#8b5cf6"
                    onClick={() => openModal("Customer Pareto Concentration", "Top VIP Accounts Share", charts.customerPareto || [])}
                >
                    <PieChart>
                        <Pie
                            data={charts.customerPareto || []}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {(charts.customerPareto || []).map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 5. Outstanding Aging */}
                <ChartCard
                    index={4}
                    title="Outstanding Dues Aging"
                    subtitle="Bucket-wise receivables"
                    icon={Wallet}
                    iconColor="#e74c3c"
                    onClick={() => openModal("Outstanding Aging", "Aging Bucket Dues Analysis", charts.outstandingAging)}
                >
                    <BarChart data={charts.outstandingAging}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="total" name="Outstanding Dues" fill="#e74c3c" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                </ChartCard>

                {/* 6. Collection Trend */}
                <ChartCard
                    index={5}
                    title="Monthly Collection Trend"
                    subtitle="Customer cash recoveries"
                    icon={LineIcon}
                    iconColor="#2ecc71"
                    onClick={() => openModal("Collection Trend", "Monthly Collection Receipts", charts.collectionTrend)}
                >
                    <LineChart data={charts.collectionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Collection"
                            stroke="#2ecc71"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#2ecc71" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartCard>

                {/* 7. Top 10 Products */}
                <ChartCard
                    index={6}
                    title="Top 10 Selling Products"
                    subtitle="By total revenue"
                    icon={Package}
                    iconColor="#3498db"
                    onClick={() => openModal("Top 10 Products", "Best Selling Product Ranks", charts.topProducts)}
                >
                    <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Amount" fill="#3498db" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>

                {/* 8. Top 10 Customers */}
                <ChartCard
                    index={7}
                    title="Top 10 Revenue Customers"
                    subtitle="Highest contributing parties"
                    icon={Users}
                    iconColor="#9b59b6"
                    onClick={() => openModal("Top 10 Customers", "Highest Revenue Customers", charts.topCustomers)}
                >
                    <BarChart data={charts.topCustomers} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Amount" fill="#9b59b6" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>

                {/* 9. Inventory Valuation Rings */}
                <ChartCard
                    index={8}
                    title="Inventory Valuation & Loss Gauges"
                    subtitle="Healthy vs Expired Stock Value"
                    icon={Boxes}
                    iconColor="#3b82f6"
                    onClick={() => openModal("Inventory Valuation Gauges", "Stock Value & Expiry Loss Breakdown", charts.inventoryValuationRings || [])}
                >
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="25%"
                        outerRadius="90%"
                        barSize={14}
                        data={charts.inventoryValuationRings || []}
                    >
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={8}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </RadialBarChart>
                </ChartCard>

                {/* 10. Expiry Status Timeline */}
                <ChartCard
                    index={9}
                    title="Batch Expiry Risk Timeline"
                    subtitle="Batches expiring within 0-90 days"
                    icon={CalendarClock}
                    iconColor="#f1c40f"
                    onClick={() => openModal("Expiry Status", "Batch Expiration Timeline Breakdown", charts.expiryStatus)}
                >
                    <PieChart>
                        <Pie
                            data={charts.expiryStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.expiryStatus?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 11. Sale Type Distribution */}
                <ChartCard
                    index={10}
                    title="Voucher Type Distribution"
                    subtitle="Volume breakdown by transaction type"
                    icon={PieIcon}
                    iconColor="#8e44ad"
                    onClick={() => openModal("Sale Type Distribution", "Transaction Volume Breakdown", charts.saleTypeDistribution)}
                >
                    <PieChart>
                        <Pie
                            data={charts.saleTypeDistribution}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.saleTypeDistribution?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 12. Monthly Growth (%) */}
                <ChartCard
                    index={11}
                    title="Month-over-Month Growth Rate (%)"
                    subtitle="Percentage growth velocity"
                    icon={TrendingUp}
                    iconColor="#16a085"
                    onClick={() => openModal("Monthly Sales Growth", "Month-over-Month Growth Rate (%)", charts.monthlyGrowth)}
                >
                    <LineChart data={charts.monthlyGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="growth"
                            name="Growth %"
                            stroke="#16a085"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#16a085" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartCard>

                {/* 13. Inventory Stock Status Distribution */}
                <ChartCard
                    index={12}
                    title="Inventory Stock Status"
                    subtitle="In-Stock, Low-Stock, Zero & Negative Stock"
                    icon={Boxes}
                    iconColor="#1abc9c"
                    onClick={() => openModal("Inventory Stock Status", "Stock Quantity Status Breakdown", charts.stockStatus)}
                >
                    <PieChart>
                        <Pie
                            data={charts.stockStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.stockStatus?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 14. NEW: Customer Credit Risk 2D Scatter Matrix */}
                <ChartCard
                    index={13}
                    title="Customer Credit Risk Matrix (Scatter)"
                    subtitle="Sales Volume (X) vs Overdue Dues (Y)"
                    icon={Crosshair}
                    iconColor="#ef4444"
                    onClick={() => openModal("Customer Risk Matrix", "Party Sales Volume vs Overdue Dues Risk Distribution", charts.customerRiskScatter || [])}
                >
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis type="number" dataKey="sales" name="Sales" tick={AXIS_STYLE} unit="₹" axisLine={false} />
                        <YAxis type="number" dataKey="dues" name="Overdue" tick={AXIS_STYLE} unit="₹" axisLine={false} />
                        <ZAxis type="number" dataKey="z" range={[60, 300]} name="Volume" />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip />} />
                        <Scatter name="Parties" data={charts.customerRiskScatter || []} fill="#ec4899" />
                    </ScatterChart>
                </ChartCard>

                {/* 15. NEW: Cumulative Recovery Stepped Stream */}
                <ChartCard
                    index={14}
                    title="Cumulative Cash Recovery (Step Stream)"
                    subtitle="Staircase cumulative receipts growth"
                    icon={Milestone}
                    iconColor="#10b981"
                    onClick={() => openModal("Cumulative Cash Stream", "Month-wise Cumulative Receipts Build-up", charts.cumulativeCollectionsStep || [])}
                >
                    <AreaChart data={charts.cumulativeCollectionsStep || []}>
                        <defs>
                            <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="stepAfter" dataKey="cumulative" name="Cumulative Total" stroke="#10b981" strokeWidth={3} fill="url(#stepGrad)" />
                    </AreaChart>
                </ChartCard>

                {/* 16. NEW: Revenue vs MoM Growth Dual Y-Axis Graph */}
                <ChartCard
                    index={15}
                    title="Dual-Axis Sales & Growth Matrix"
                    subtitle="Sales Bar (Left Y) vs MoM Growth % (Right Y)"
                    icon={BarChart2}
                    iconColor="#f59e0b"
                    onClick={() => openModal("Dual-Axis Sales & Growth", "Revenue Volume vs Growth Rate Percentage", charts.dualAxisGrowth || [])}
                >
                    <ComposedChart data={charts.dualAxisGrowth || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis yAxisId="left" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="sales" name="Sales Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Line yAxisId="right" type="monotone" dataKey="growth" name="Growth %" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                </ChartCard>
            </div>

            {/* Apple Liquid Glass Drilldown Chart Modal */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeSlideIn_0.3s_ease-out]">
                    <div className="bg-white/95 dark:bg-slate-900/95 w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[88vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-sans">
                                    <TableIcon className="text-indigo-600" /> {chartModal.title} Drilldown
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{chartModal.subtitle}</p>
                            </div>
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search & Summary Strip */}
                        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="relative w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="Search in modal..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                                />
                                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            </div>
                            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-semibold">
                                <span>Rows: {filteredModalData.length}</span>
                                <span>Total Sum: <strong className="text-indigo-600 dark:text-indigo-400">₹{totalModalValue.toLocaleString("en-IN")}</strong></span>
                            </div>
                        </div>

                        {/* Modal Body Table */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-2.5 px-3">Item / Period / Dimension</th>
                                            <th className="py-2.5 px-3 text-right">Value / Count</th>
                                            <th className="py-2.5 px-3 text-right">% Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredModalData.map((row: any, idx: number) => {
                                            const label = row.name || row.month || row.bucket || row.status || row.subject || `Item ${idx + 1}`;
                                            const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? 0);
                                            const pct = totalModalValue > 0 ? ((val / totalModalValue) * 100).toFixed(1) : "0.0";
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                        {label}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                        {typeof val === "number" ? val.toLocaleString("en-IN") : val}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                                                        {pct}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-indigo-700 transition cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PurchaseDashboardCharts({ charts }: { charts: any }) {
    const [chartModal, setChartModal] = useState<{
        isOpen: boolean;
        title: string;
        subtitle: string;
        data: any[];
    }>({
        isOpen: false,
        title: "",
        subtitle: "",
        data: [],
    });

    const [modalSearch, setModalSearch] = useState("");

    if (!charts) return null;

    const openModal = (title: string, subtitle: string, data: any[]) => {
        setChartModal({
            isOpen: true,
            title,
            subtitle,
            data: data || [],
        });
        setModalSearch("");
    };

    const filteredModalData = (chartModal.data || []).filter((row: any) => {
        if (!modalSearch) return true;
        const search = modalSearch.toLowerCase();
        const label = String(row.name || row.month || row.bucket || row.status || row.subject || "").toLowerCase();
        return label.includes(search);
    });

    const totalModalValue = filteredModalData.reduce((acc: number, row: any) => {
        const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? row.purchases ?? 0);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const purchaseColors = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#06b6d4"];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200 uppercase">
                        Purchase & Vendor Intelligence Visualizer
                    </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Interactive purchase analytics & creditor insights</span>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* 1. Monthly Purchase Inward Trend */}
                <ChartCard
                    index={0}
                    title="Monthly Purchase Inward Trend"
                    subtitle="Inward purchase volume vs return debit notes"
                    icon={Truck}
                    iconColor="#6366f1"
                    onClick={() => openModal("Monthly Purchase Trend", "Inward Purchase Volume vs Debit Notes", charts.purchaseTrend || [])}
                >
                    <ComposedChart data={charts.purchaseTrend || []}>
                        <defs>
                            <linearGradient id="purGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
                        <Area type="monotone" dataKey="purchases" name="Purchases" fill="url(#purGrad)" stroke="#6366f1" strokeWidth={3} />
                        <Line type="monotone" dataKey="returns" name="Purchase Returns" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                    </ComposedChart>
                </ChartCard>

                {/* 2. Top 10 Vendors / Suppliers by Volume */}
                <ChartCard
                    index={1}
                    title="Top 10 Vendors & Suppliers"
                    subtitle="Highest contributing supplier accounts"
                    icon={Users}
                    iconColor="#8b5cf6"
                    onClick={() => openModal("Top 10 Vendors", "Highest Purchase Supplier Accounts", charts.topSuppliers || [])}
                >
                    <BarChart data={charts.topSuppliers || []} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Purchase Amount" fill="#8b5cf6" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>

                {/* 3. Vendor Payment & Bill Status Distribution */}
                <ChartCard
                    index={2}
                    title="Purchase Bill & Payment Status"
                    subtitle="Paid vs Pending Creditor Dues vs Returns"
                    icon={PieIcon}
                    iconColor="#10b981"
                    onClick={() => openModal("Purchase Bill Status", "Paid Payments vs Pending Dues Breakdown", charts.purchaseStatusDist || [])}
                >
                    <PieChart>
                        <Pie
                            data={charts.purchaseStatusDist || []}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {(charts.purchaseStatusDist || []).map((_: any, i: number) => (
                                <Cell key={i} fill={purchaseColors[i % purchaseColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 4. Supplier Creditor Aging Breakdown */}
                <ChartCard
                    index={3}
                    title="Creditor Dues Aging Breakdown"
                    subtitle="Bucket-wise unpaid supplier dues"
                    icon={Wallet}
                    iconColor="#f97316"
                    onClick={() => openModal("Creditor Aging", "Supplier Overdue Dues Bucket Analysis", charts.creditorAging || [])}
                >
                    <BarChart data={charts.creditorAging || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="total" name="Creditor Dues" fill="#f97316" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                </ChartCard>
            </div>

            {/* Drilldown Modal */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeSlideIn_0.3s_ease-out]">
                    <div className="bg-white/95 dark:bg-slate-900/95 w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[88vh]">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-sans">
                                    <TableIcon className="text-indigo-600" /> {chartModal.title} Drilldown
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{chartModal.subtitle}</p>
                            </div>
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="relative w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="Search in modal..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                                />
                                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            </div>
                            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-semibold">
                                <span>Rows: {filteredModalData.length}</span>
                                <span>Total Sum: <strong className="text-indigo-600 dark:text-indigo-400">₹{totalModalValue.toLocaleString("en-IN")}</strong></span>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-2.5 px-3">Item / Supplier / Dimension</th>
                                            <th className="py-2.5 px-3 text-right">Value / Amount</th>
                                            <th className="py-2.5 px-3 text-right">% Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredModalData.map((row: any, idx: number) => {
                                            const label = row.name || row.month || row.bucket || row.status || row.subject || `Item ${idx + 1}`;
                                            const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? row.purchases ?? 0);
                                            const pct = totalModalValue > 0 ? ((val / totalModalValue) * 100).toFixed(1) : "0.0";
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                        {label}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                        {typeof val === "number" ? val.toLocaleString("en-IN") : val}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                                                        {pct}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-indigo-700 transition cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function CreditDashboardCharts({ charts }: { charts: any }) {
    const [chartModal, setChartModal] = useState<{
        isOpen: boolean;
        title: string;
        subtitle: string;
        data: any[];
    }>({
        isOpen: false,
        title: "",
        subtitle: "",
        data: [],
    });

    const [modalSearch, setModalSearch] = useState("");

    if (!charts) return null;

    const openModal = (title: string, subtitle: string, data: any[]) => {
        setChartModal({
            isOpen: true,
            title,
            subtitle,
            data: data || [],
        });
        setModalSearch("");
    };

    const filteredModalData = (chartModal.data || []).filter((row: any) => {
        if (!modalSearch) return true;
        const search = modalSearch.toLowerCase();
        const label = String(row.name || row.month || row.bucket || row.status || row.subject || "").toLowerCase();
        return label.includes(search);
    });

    const totalModalValue = filteredModalData.reduce((acc: number, row: any) => {
        const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? row.dso ?? row.billed ?? 0);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const riskColors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200 uppercase">
                        Credit & Receivables Risk Intelligence Visualizer
                    </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Interactive DSO, credit risk & debtor analytics</span>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* 1. Days Sales Outstanding (DSO) & Payment Velocity */}
                <ChartCard
                    index={0}
                    title="Days Sales Outstanding (DSO) Speed"
                    subtitle="Average collection turnaround days per month"
                    icon={Clock}
                    iconColor="#06b6d4"
                    onClick={() => openModal("Days Sales Outstanding (DSO)", "Monthly Collection Velocity & DSO Days", charts.dsoTrend || [])}
                >
                    <AreaChart data={charts.dsoTrend || []}>
                        <defs>
                            <linearGradient id="dsoGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit=" Days" />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="dso" name="DSO (Days)" fill="url(#dsoGrad)" stroke="#06b6d4" strokeWidth={3} />
                    </AreaChart>
                </ChartCard>

                {/* 2. Customer Credit Risk Breakdown */}
                <ChartCard
                    index={1}
                    title="Debtor Credit Risk Severity"
                    subtitle="Low (0-30d), Moderate (31-60d), High (61-90d) & Critical (>90d)"
                    icon={ShieldAlert}
                    iconColor="#ef4444"
                    onClick={() => openModal("Credit Risk Distribution", "Debtor Overdue Risk Severity Breakdown", charts.creditRiskDist || [])}
                >
                    <PieChart>
                        <Pie
                            data={charts.creditRiskDist || []}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {(charts.creditRiskDist || []).map((_: any, i: number) => (
                                <Cell key={i} fill={riskColors[i % riskColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 3. Billed vs Collected vs Outstanding Stacked Bar */}
                <ChartCard
                    index={2}
                    title="Monthly Billing vs Cash Realization"
                    subtitle="Collected cash vs remaining uncollected dues"
                    icon={BarChart2}
                    iconColor="#10b981"
                    onClick={() => openModal("Monthly Cash Realization", "Billed Sales vs Realized Cash vs Uncollected Dues", charts.realizationStacked || [])}
                >
                    <BarChart data={charts.realizationStacked || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                        <Bar dataKey="collected" name="Collected Cash" stackId="a" fill="#10b981" maxBarSize={36} />
                        <Bar dataKey="dues" name="Uncollected Dues" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                </ChartCard>

                {/* 4. Top 10 High-Risk Outstanding Accounts */}
                <ChartCard
                    index={3}
                    title="Top 10 High-Risk Debtors"
                    subtitle="Parties with highest overdue balances"
                    icon={Wallet}
                    iconColor="#e74c3c"
                    onClick={() => openModal("Top High-Risk Debtors", "Parties with Highest Overdue Balances", charts.topOverdueDebtors || [])}
                >
                    <BarChart data={charts.topOverdueDebtors || []} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Overdue Balance" fill="#e74c3c" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>
            </div>

            {/* Drilldown Modal */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeSlideIn_0.3s_ease-out]">
                    <div className="bg-white/95 dark:bg-slate-900/95 w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[88vh]">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-sans">
                                    <TableIcon className="text-indigo-600" /> {chartModal.title} Drilldown
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{chartModal.subtitle}</p>
                            </div>
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="relative w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="Search in modal..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                                />
                                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            </div>
                            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-semibold">
                                <span>Rows: {filteredModalData.length}</span>
                                <span>Total Sum: <strong className="text-indigo-600 dark:text-indigo-400">₹{totalModalValue.toLocaleString("en-IN")}</strong></span>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-2.5 px-3">Item / Debtor / Dimension</th>
                                            <th className="py-2.5 px-3 text-right">Value / Amount</th>
                                            <th className="py-2.5 px-3 text-right">% Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredModalData.map((row: any, idx: number) => {
                                            const label = row.name || row.month || row.bucket || row.status || row.subject || `Item ${idx + 1}`;
                                            const val = Number(row.total ?? row.amount ?? row.count ?? row.sales ?? row.score ?? row.value ?? row.dso ?? row.billed ?? 0);
                                            const pct = totalModalValue > 0 ? ((val / totalModalValue) * 100).toFixed(1) : "0.0";
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                        {label}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                        {typeof val === "number" ? val.toLocaleString("en-IN") : val}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                                                        {pct}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-indigo-700 transition cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}