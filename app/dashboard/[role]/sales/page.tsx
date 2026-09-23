"use client";

import {
  Users,
  UserPlus,
  IndianRupee,
  TrendingUp,
  Target,
  Award,
  Percent,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---------- Theme ----------
// Primary brand color: #343872 (deep indigo). Secondary hues are chosen to
// sit well next to it for charts where multiple categories need to be told
// apart at a glance (pie/donut, bar comparisons).
const BRAND = "#343872";
const BRAND_LIGHT = "#EEEEF6";
const BRAND_SOFT = "#6266AC";

const CHART_COLORS = ["#343872", "#0E7C86", "#E2A63C", "#D64545", "#6266AC", "#16A34A"];

// ---------- Mock data (replace with your API / DB calls) ----------

const revenueTrend = [
  { month: "Jan", revenue: 180000 },
  { month: "Feb", revenue: 210000 },
  { month: "Mar", revenue: 195000 },
  { month: "Apr", revenue: 240000 },
  { month: "May", revenue: 228000 },
  { month: "Jun", revenue: 265000 },
  { month: "Jul", revenue: 250000 },
];

const pipeline = [
  { stage: "New Leads", count: 250, value: 4200000, color: BRAND },
  { stage: "Contacted", count: 168, value: 3100000, color: "#4A4F94" },
  { stage: "Qualified", count: 96, value: 2050000, color: BRAND_SOFT },
  { stage: "Proposal", count: 54, value: 1380000, color: "#E2A63C" },
  { stage: "Won", count: 31, value: 890000, color: "#16A34A" },
];

const dealsByStage = pipeline.map((p) => ({ name: p.stage, value: p.count }));

const leadSources = [
  { name: "Referral", value: 92 },
  { name: "Website", value: 68 },
  { name: "WhatsApp campaign", value: 51 },
  { name: "Cold outreach", value: 24 },
  { name: "Partner (ERP Expert)", value: 15 },
];

const teamRevenue = [
  { name: "Simran Kaur", revenue: 620000 },
  { name: "Manpreet Singh", revenue: 540000 },
  { name: "Ravi Thakur", revenue: 385000 },
  { name: "Pooja Sharma", revenue: 298000 },
];

const leads = [
  { name: "Rohit Sharma", company: "Vardhman Textiles", value: "₹1,20,000", stage: "Proposal", owner: "Simran K.", date: "05 Jul" },
  { name: "Anita Verma", company: "Shivalik Foods", value: "₹85,000", stage: "Qualified", owner: "Manpreet S.", date: "05 Jul" },
  { name: "Karan Mehta", company: "Himalayan Auto Parts", value: "₹2,40,000", stage: "Negotiation", owner: "Simran K.", date: "04 Jul" },
  { name: "Pooja Nair", company: "Trident Hospitality", value: "₹65,000", stage: "New", owner: "Ravi T.", date: "04 Jul" },
  { name: "Suresh Rana", company: "Panchkula Motors", value: "₹1,50,000", stage: "Won", owner: "Manpreet S.", date: "03 Jul" },
  { name: "Neha Chopra", company: "ERP Expert Ltd.", value: "₹3,10,000", stage: "Proposal", owner: "Ravi T.", date: "03 Jul" },
];

const activity = [
  { icon: Phone, text: "Call with Karan Mehta scheduled for tomorrow, 11 AM", time: "10 min ago" },
  { icon: Mail, text: "Proposal sent to Neha Chopra (ERP Expert Ltd.)", time: "45 min ago" },
  { icon: Award, text: "Deal closed — Suresh Rana, ₹1,50,000", time: "2 hr ago" },
  { icon: Calendar, text: "Follow-up reminder: Pooja Nair, Trident Hospitality", time: "3 hr ago" },
];

const stageBadge: Record<string, string> = {
  New: "bg-blue-50 text-blue-700",
  Qualified: "bg-amber-50 text-amber-700",
  Proposal: "bg-[#EEEEF6] text-[#343872]",
  Negotiation: "bg-purple-50 text-purple-700",
  Won: "bg-green-50 text-green-700",
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompactINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n}`;
}

// ---------- Custom legend (recharts default legends look generic) ----------

function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

// ---------- Building blocks ----------

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  positive,
}: {
  icon: any;
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: BRAND_LIGHT }}
        >
          <Icon style={{ color: BRAND }} size={20} />
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta}
        </span>
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 font-mono tracking-tight mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

function PipelineFunnel() {
  const maxCount = pipeline[0].count;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-slate-900">Sales pipeline</h3>
          <p className="text-sm text-slate-500">Deal count and value by stage</p>
        </div>
        <Target className="text-slate-400" size={20} />
      </div>

      <div className="space-y-3">
        {pipeline.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 14);
          const prev = pipeline[i - 1];
          const dropOff = prev
            ? Math.round(((prev.count - stage.count) / prev.count) * 100)
            : null;
          return (
            <div key={stage.stage}>
              {dropOff !== null && (
                <p className="text-[11px] text-slate-400 mb-1 pl-1">↓ {dropOff}% drop-off</p>
              )}
              <div className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-sm text-slate-600">{stage.stage}</div>
                <div className="flex-1">
                  <div
                    className="h-9 rounded-lg flex items-center justify-between px-3 text-white text-xs font-medium transition-all"
                    style={{ width: `${widthPct}%`, backgroundColor: stage.color, minWidth: "120px" }}
                  >
                    <span>{stage.count} deals</span>
                    <span className="font-mono">{formatINR(stage.value)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Revenue trend</h3>
          <p className="text-sm text-slate-500">Last 7 months</p>
        </div>
        <button className="text-sm text-slate-500 flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5">
          Monthly <ChevronDown size={14} />
        </button>
      </div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F4" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickFormatter={(v) => `₹${v / 1000}k`}
              width={50}
            />
            <Tooltip
              formatter={(value: any) => [formatINR(Number(value)), "Revenue"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
            <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2} fill="url(#revFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DealsByStageDonut() {
  const total = dealsByStage.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
      <div className="mb-2">
        <h3 className="font-semibold text-slate-900">Deals by stage</h3>
        <p className="text-sm text-slate-500">Share of open + closed deals</p>
      </div>
      <div style={{ width: "100%", height: 220 }} className="relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dealsByStage}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {dealsByStage.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [`${value} deals`, name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold font-mono text-slate-900">{total}</p>
          <p className="text-xs text-slate-500">Total deals</p>
        </div>
      </div>
      <ChartLegend
        items={dealsByStage.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))}
      />
    </div>
  );
}

function LeadSourcePie() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
      <div className="mb-2">
        <h3 className="font-semibold text-slate-900">Lead source</h3>
        <p className="text-sm text-slate-500">Where this month's leads came from</p>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={leadSources} dataKey="value" nameKey="name" outerRadius={90} stroke="none">
              {leadSources.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [`${value} leads`, name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={leadSources.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))}
      />
    </div>
  );
}

function TeamRevenueBar() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Revenue by rep</h3>
          <p className="text-sm text-slate-500">This month</p>
        </div>
        <Award className="text-slate-400" size={20} />
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={teamRevenue} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F4" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickFormatter={(v) => formatCompactINR(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={110}
              tick={{ fontSize: 12, fill: "#475569" }}
            />
            <Tooltip
              formatter={(value: any) => [formatINR(Number(value)), "Revenue"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
            <Bar dataKey="revenue" fill={BRAND} radius={[0, 4, 4, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Recent activity</h3>
      <div className="space-y-4">
        {activity.map((a, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <a.icon size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-700 leading-snug">{a.text}</p>
              <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Recent leads</h3>
          <p className="text-sm text-slate-500">Latest activity across your pipeline</p>
        </div>
        <button className="text-sm font-medium" style={{ color: BRAND }}>
          View all
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="font-medium py-2 pr-4">Lead</th>
              <th className="font-medium py-2 pr-4">Company</th>
              <th className="font-medium py-2 pr-4">Value</th>
              <th className="font-medium py-2 pr-4">Stage</th>
              <th className="font-medium py-2 pr-4">Owner</th>
              <th className="font-medium py-2 pr-4">Date</th>
              <th className="font-medium py-2"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-3 pr-4 font-medium text-slate-800">{lead.name}</td>
                <td className="py-3 pr-4 text-slate-500">{lead.company}</td>
                <td className="py-3 pr-4 font-mono text-slate-700">{lead.value}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageBadge[lead.stage]}`}>
                    {lead.stage}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-500">{lead.owner}</td>
                <td className="py-3 pr-4 text-slate-400">{lead.date}</td>
                <td className="py-3">
                  <MoreHorizontal size={16} className="text-slate-400 cursor-pointer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
     <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: BRAND }}>
            Sales dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back — here's how the pipeline looks today
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          <KpiCard icon={Users} label="Total leads" value="250" delta="12%" positive />
          <KpiCard icon={UserPlus} label="New leads" value="15" delta="4%" positive />
          <KpiCard icon={IndianRupee} label="Revenue (MTD)" value={formatCompactINR(2500000)} delta="8%" positive />
          <KpiCard icon={Percent} label="Conversion rate" value="72%" delta="3%" positive={false} />
          <KpiCard icon={Award} label="Deals won" value="31" delta="6%" positive />
          <KpiCard icon={Wallet} label="Avg deal size" value={formatCompactINR(80645)} delta="2%" positive />
        </div>

        {/* Revenue trend + deals by stage donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <DealsByStageDonut />
        </div>

        {/* Pipeline funnel + lead source pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PipelineFunnel />
          </div>
          <LeadSourcePie />
        </div>

        {/* Team revenue bar + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TeamRevenueBar />
          </div>
          <RecentActivity />
        </div>

        {/* Leads table */}
        <LeadsTable />
      </div>
    </div>
  );
}