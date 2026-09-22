"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Target,
  Award,
  Percent,
  Users,
  Filter,
  ChevronDown,
  Download,
  Printer,
  Search,
  ArrowUpDown,
  CalendarDays,
  RefreshCcw,
  Clock,
  Gauge,
  UserPlus,
  Layers,
  Sparkles,
  Activity,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
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
const BRAND = "#343872";
const BRAND_LIGHT = "#EEEEF6";
const BRAND_SOFT = "#6266AC";
const CHART_COLORS = ["#343872", "#0E7C86", "#E2A63C", "#D64545", "#6266AC", "#16A34A"];
const COMPANY_NAME = "CRM";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
type Stage = (typeof STAGES)[number];

const REPS = ["Simran Kaur", "Manpreet Singh", "Ravi Thakur", "Pooja Sharma"] as const;
const SOURCES = ["Referral", "Website", "WhatsApp campaign", "Cold outreach", "Partner (ERP Expert)"] as const;
const LOST_REASONS = ["Price too high", "Chose competitor", "No budget", "Went silent", "Timing not right"];

// Probability weighting used for the forecast KPI — reflects typical close likelihood per stage
const STAGE_PROBABILITY: Record<Stage, number> = {
  New: 0.1,
  Contacted: 0.2,
  Qualified: 0.4,
  Proposal: 0.6,
  Negotiation: 0.8,
  Won: 1,
  Lost: 0,
};

const stageBadge: Record<Stage, string> = {
  New: "bg-blue-50 text-blue-700",
  Contacted: "bg-sky-50 text-sky-700",
  Qualified: "bg-amber-50 text-amber-700",
  Proposal: "bg-[#EEEEF6] text-[#343872]",
  Negotiation: "bg-purple-50 text-purple-700",
  Won: "bg-green-50 text-green-700",
  Lost: "bg-red-50 text-red-700",
};

// ---------- Types ----------
interface Lead {
  id: number;
  name: string;
  company: string;
  value: number;
  stage: Stage;
  owner: string;
  source: string;
  date: Date; // last activity / stage-change date
  createdDate: Date; // when the lead entered the pipeline
  lostReason: string | null;
}

type SortKey = "name" | "company" | "value" | "stage" | "owner" | "source" | "date";
type SortDir = "asc" | "desc";

// ---------- Mock dataset (swap with your API / MySQL query) ----------
function seedLeads(): Lead[] {
  const companies = [
    "Vardhman Textiles", "Shivalik Foods", "Himalayan Auto Parts", "Trident Hospitality",
    "Panchkula Motors", "ERP Expert Ltd.", "Zenith Pharma", "Kalka Steel Works",
    "Sunrise Convent School", "Client - Baddi", "Green Valley Resorts", "NorthPeak Realty",
    "Chandigarh Diagnostics", "Yamuna Textile Mills", "Ambala Auto Care", "Solan Dairy Co-op",
    "Ridge View Hotels", "Parwanoo Plastics", "Kasauli Retreats", "Nalagarh Industries",
    "Baddi Pharma Works", "Zirakpur Logistics", "Derabassi Fabrics", "Pinjore Agro Traders",
  ];
  const names = [
    "Rohit Sharma", "Anita Verma", "Karan Mehta", "Pooja Nair", "Suresh Rana", "Neha Chopra",
    "Vikram Singh", "Deepak Bansal", "Ritu Kapoor", "Ajay Malhotra", "Simran Bedi", "Harpreet Gill",
    "Manoj Thakur", "Priya Dutta", "Sandeep Kumar", "Kavita Rawat", "Arjun Kohli", "Meena Joshi",
    "Tarun Vij", "Isha Sood", "Nikhil Chauhan", "Rachna Bhatia", "Gagan Oberoi", "Sonal Mahajan",
  ];

  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return companies.map((company, i) => {
    const stage = STAGES[Math.floor(rand() * STAGES.length)];
    const value = Math.round((30000 + rand() * 290000) / 1000) * 1000;
    const daysBack = Math.floor(rand() * 90);
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const cycleLength = 8 + Math.floor(rand() * 42);
    const created = new Date(d);
    created.setDate(created.getDate() - cycleLength);
    return {
      id: i + 1,
      name: names[i],
      company,
      value,
      stage,
      owner: REPS[Math.floor(rand() * REPS.length)],
      source: SOURCES[Math.floor(rand() * SOURCES.length)],
      date: d,
      createdDate: created,
      lostReason: stage === "Lost" ? LOST_REASONS[Math.floor(rand() * LOST_REASONS.length)] : null,
    };
  });
}

const ALL_LEADS: Lead[] = seedLeads();

const REVENUE_TARGETS = [
  { month: "Feb", target: 220000, actual: 210000 },
  { month: "Mar", target: 220000, actual: 195000 },
  { month: "Apr", target: 230000, actual: 240000 },
  { month: "May", target: 240000, actual: 228000 },
  { month: "Jun", target: 250000, actual: 265000 },
  { month: "Jul", target: 260000, actual: 250000 },
];

// ---------- Formatters ----------
function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function formatCompactINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${Math.round(n)}`;
}
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return formatDate(d);
}

// ---------- Small reusable bits ----------
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

interface DeltaBadgeProps {
  current: number;
  previous: number | null;
  /** Some metrics (e.g. avg sales cycle) are better when they go down */
  invert?: boolean;
}
function DeltaBadge({ current, previous, invert }: DeltaBadgeProps) {
  if (previous === null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingUp size={12} /> New activity
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const isGood = invert ? pct <= 0 : pct >= 0;
  const color = pct === 0 ? "text-slate-400" : isGood ? "text-emerald-600" : "text-red-600";
  const Icon = pct === 0 ? ArrowUpDown : pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} /> {pct === 0 ? "No change" : `${Math.abs(pct)}%`} <span className="text-slate-400 font-normal">vs prior period</span>
    </span>
  );
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  delta?: React.ReactNode;
  accent?: string;
}
function KpiCard({ icon: Icon, label, value, sub, delta, accent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 print:border-slate-300 print:break-inside-avoid">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent ?? BRAND_LIGHT }}>
        <Icon style={{ color: BRAND }} size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 font-mono tracking-tight mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {delta && <div className="mt-1.5">{delta}</div>}
      </div>
    </div>
  );
}

interface MultiSelectProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}
function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 whitespace-nowrap transition-colors ${
          !allSelected ? "border-[#343872] text-[#343872] bg-[#EEEEF6]" : "border-slate-200 text-slate-600 bg-white"
        }`}
      >
        {label}
        {!allSelected && (
          <span className="text-[11px] font-semibold rounded-full px-1.5" style={{ backgroundColor: BRAND, color: "white" }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="accent-[#343872]"
                />
                {opt}
              </label>
            ))}
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-xs text-center mt-1 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "60", label: "60 days" },
  { key: "all", label: "All time" },
];
const RANGE_LABELS: Record<string, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "60": "Last 60 days",
  all: "All time",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "sales", label: "Sales performance" },
  { key: "leads", label: "Lead analytics" },
  { key: "team", label: "Team performance" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function CrmReportsPage() {
  const [range, setRange] = useState<string>("30");
  const [reps, setReps] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const generatedAt = useMemo(() => new Date(), []);

  // Shared filter predicate (excludes the date-range check so it can be reused
  // for the current window, the prior comparison window, and creation-date checks)
  const matchesCommonFilters = (l: Lead) => {
    if (reps.length && !reps.includes(l.owner)) return false;
    if (sources.length && !sources.includes(l.source)) return false;
    if (stages.length && !stages.includes(l.stage)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.company.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return ALL_LEADS.filter((l) => {
      if (!matchesCommonFilters(l)) return false;
      if (range !== "all") {
        const diffDays = (now.getTime() - l.date.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > Number(range)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, reps, sources, stages, search]);

  const activeFilterCount = reps.length + sources.length + stages.length + (search.trim() ? 1 : 0);

  // ---------- Derived metrics (recomputed live from filtered data) ----------
  const won = filtered.filter((l) => l.stage === "Won");
  const lost = filtered.filter((l) => l.stage === "Lost");
  const openDeals = filtered.filter((l) => l.stage !== "Won" && l.stage !== "Lost");
  const closed = won.length + lost.length;
  const revenue = won.reduce((s, l) => s + l.value, 0);
  const pipelineValue = filtered.reduce((s, l) => s + l.value, 0);
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
  const avgDealSize = won.length ? Math.round(revenue / won.length) : 0;
  const weightedForecast = openDeals.reduce((s, l) => s + l.value * STAGE_PROBABILITY[l.stage], 0);
  const avgSalesCycle = won.length
    ? Math.round(won.reduce((s, l) => s + (l.date.getTime() - l.createdDate.getTime()) / 86400000, 0) / won.length)
    : 0;

  const newLeadsInRange = useMemo(() => {
    const now = new Date();
    return ALL_LEADS.filter((l) => {
      if (!matchesCommonFilters(l)) return false;
      if (range === "all") return true;
      const diffDays = (now.getTime() - l.createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= Number(range);
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, reps, sources, stages, search]);

  // ---------- Prior-period comparison (same filters, equal-length preceding window) ----------
  const previousMetrics = useMemo(() => {
    if (range === "all") return null;
    const days = Number(range);
    const now = new Date();
    const prevLeads = ALL_LEADS.filter((l) => {
      if (!matchesCommonFilters(l)) return false;
      const diffDays = (now.getTime() - l.date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > days && diffDays <= days * 2;
    });
    const prevWon = prevLeads.filter((l) => l.stage === "Won");
    const prevLost = prevLeads.filter((l) => l.stage === "Lost");
    const prevClosed = prevWon.length + prevLost.length;
    const prevRevenue = prevWon.reduce((s, l) => s + l.value, 0);
    const prevPipeline = prevLeads.reduce((s, l) => s + l.value, 0);
    const prevWinRate = prevClosed ? Math.round((prevWon.length / prevClosed) * 100) : 0;
    const prevAvgDeal = prevWon.length ? Math.round(prevRevenue / prevWon.length) : 0;
    const prevCycle = prevWon.length
      ? Math.round(prevWon.reduce((s, l) => s + (l.date.getTime() - l.createdDate.getTime()) / 86400000, 0) / prevWon.length)
      : 0;
    return { revenue: prevRevenue, pipeline: prevPipeline, winRate: prevWinRate, avgDeal: prevAvgDeal, leadCount: prevLeads.length, cycle: prevCycle };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, reps, sources, stages, search]);

  const funnel = useMemo(() => {
    const order: Stage[] = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"];
    return order.map((stage, i) => {
      const count = filtered.filter((l) => l.stage === stage).length;
      return { stage, count, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
  }, [filtered]);

  const bottleneck = useMemo(() => {
    let worst: { from: Stage; to: Stage; dropOff: number } | null = null;
    for (let i = 1; i < funnel.length; i++) {
      const prev = funnel[i - 1];
      const cur = funnel[i];
      if (!prev.count) continue;
      const dropOff = Math.round(((prev.count - cur.count) / prev.count) * 100);
      if (dropOff > 0 && (!worst || dropOff > worst.dropOff)) {
        worst = { from: prev.stage, to: cur.stage, dropOff };
      }
    }
    return worst;
  }, [funnel]);

  const sourcePerf = useMemo(() => {
    return SOURCES.map((src) => {
      const leadsForSrc = filtered.filter((l) => l.source === src);
      const wonForSrc = leadsForSrc.filter((l) => l.stage === "Won");
      const rev = wonForSrc.reduce((s, l) => s + l.value, 0);
      return {
        name: src,
        leads: leadsForSrc.length,
        won: wonForSrc.length,
        conv: leadsForSrc.length ? Math.round((wonForSrc.length / leadsForSrc.length) * 100) : 0,
        revenue: rev,
      };
    }).filter((s) => s.leads > 0);
  }, [filtered]);

  const repPerf = useMemo(() => {
    return REPS.map((rep) => {
      const repLeads = filtered.filter((l) => l.owner === rep);
      const repWon = repLeads.filter((l) => l.stage === "Won");
      const rev = repWon.reduce((s, l) => s + l.value, 0);
      const repClosed = repWon.length + repLeads.filter((l) => l.stage === "Lost").length;
      const convRate = repClosed ? Math.round((repWon.length / repClosed) * 100) : 0;
      return { name: rep, leads: repLeads.length, won: repWon.length, revenue: rev, convRate };
    });
  }, [filtered]);
  const maxRepRevenue = Math.max(...repPerf.map((r) => r.revenue), 1);
  const topRep = [...repPerf].sort((a, b) => b.revenue - a.revenue)[0];
  const topSource = [...sourcePerf].sort((a, b) => b.revenue - a.revenue)[0];

  const lostReasons = useMemo(() => {
    const counts: Record<string, number> = {};
    lost.forEach((l) => {
      if (l.lostReason) counts[l.lostReason] = (counts[l.lostReason] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [lost]);

  const recentActivity = useMemo(() => {
    return [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [filtered]);

  // ---------- Sorting + pagination for table ----------
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av: number | string = a[sortConfig.key] as string | number;
      let bv: number | string = b[sortConfig.key] as string | number;
      if (sortConfig.key === "date") {
        av = a.date.getTime();
        bv = b.date.getTime();
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortConfig.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortConfig.dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    setSortConfig((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };

  const resetFilters = () => {
    setReps([]);
    setSources([]);
    setStages([]);
    setSearch("");
    setRange("30");
    setPage(1);
  };

  const exportCSV = () => {
    const header = ["Name", "Company", "Value", "Stage", "Owner", "Source", "Created", "Last activity"];
    const rows = sorted.map((l) => [
      l.name,
      l.company,
      String(l.value),
      l.stage,
      l.owner,
      l.source,
      formatDate(l.createdDate),
      formatDate(l.date),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th className="font-medium py-2 pr-4 cursor-pointer select-none" onClick={() => toggleSort(sortKey)}>
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortConfig.key === sortKey ? "text-[#343872]" : "text-slate-300"} />
      </span>
    </th>
  );

  const filterSummaryText = [
    reps.length ? `Reps: ${reps.join(", ")}` : null,
    sources.length ? `Sources: ${sources.join(", ")}` : null,
    stages.length ? `Stages: ${stages.join(", ")}` : null,
    search.trim() ? `Search: "${search.trim()}"` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Print-only masthead */}
        <div className="hidden print:block mb-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-3">
            <div>
              <h1 className="text-xl font-bold" style={{ color: BRAND }}>{COMPANY_NAME} — Sales &amp; Pipeline Report</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Period: {RANGE_LABELS[range]} · Generated {formatTimestamp(generatedAt)}
              </p>
              {filterSummaryText && <p className="text-xs text-slate-400 mt-0.5">Filters — {filterSummaryText}</p>}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Confidential</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: BRAND }}>
                {COMPANY_NAME.slice(0, 1)}
              </div>
              <div>
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: BRAND }}>Reports</h1>
                <p className="text-xs text-slate-400 leading-tight">{COMPANY_NAME} · Sales &amp; Pipeline</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Showing {filtered.length} of {ALL_LEADS.length} records · {RANGE_LABELS[range]}
              {activeFilterCount > 0 && <span> · {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} applied</span>}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Confidential · Generated {formatTimestamp(generatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2"
              style={{ backgroundColor: BRAND }}
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-lg px-4 py-2 text-slate-600 bg-white"
            >
              <Printer size={15} /> Print / PDF
            </button>
          </div>
        </div>

        {/* Report tabs */}
        <div className="flex gap-1 border-b border-slate-200 print:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2.5 text-sm font-medium relative"
              style={{ color: tab === t.key ? BRAND : "#64748B" }}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: BRAND }} />
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2 print:hidden">
          <span className="flex items-center gap-1.5 text-sm text-slate-500 pr-2">
            <Filter size={15} /> Filters
          </span>

          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => { setRange(r.key); setPage(1); }}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: range === r.key ? BRAND : "transparent",
                  color: range === r.key ? "white" : "#475569",
                }}
              >
                <CalendarDays size={12} /> {r.label}
              </button>
            ))}
          </div>

          <MultiSelect label="Rep" options={REPS} selected={reps} onChange={(v) => { setReps(v); setPage(1); }} />
          <MultiSelect label="Source" options={SOURCES} selected={sources} onChange={(v) => { setSources(v); setPage(1); }} />
          <MultiSelect label="Stage" options={STAGES} selected={stages} onChange={(v) => { setStages(v); setPage(1); }} />

          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or company"
              className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2"
              style={{ boxShadow: "none" }}
            />
          </div>

          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium text-slate-500 px-2 py-2">
              <RefreshCcw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Primary KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            icon={IndianRupee}
            label="Revenue (won deals)"
            value={formatCompactINR(revenue)}
            sub={`${won.length} deals won`}
            delta={previousMetrics && <DeltaBadge current={revenue} previous={previousMetrics.revenue} />}
          />
          <KpiCard
            icon={Target}
            label="Pipeline value"
            value={formatCompactINR(pipelineValue)}
            sub={`${filtered.length} records in range`}
            delta={previousMetrics && <DeltaBadge current={pipelineValue} previous={previousMetrics.pipeline} />}
          />
          <KpiCard
            icon={Percent}
            label="Win rate"
            value={`${winRate}%`}
            sub={`${won.length} won · ${lost.length} lost`}
            delta={previousMetrics && <DeltaBadge current={winRate} previous={previousMetrics.winRate} />}
          />
          <KpiCard
            icon={Award}
            label="Avg deal size"
            value={formatCompactINR(avgDealSize)}
            sub="Won deals only"
            delta={previousMetrics && <DeltaBadge current={avgDealSize} previous={previousMetrics.avgDeal} />}
          />
        </div>

        {/* Secondary / pipeline-health KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            icon={Gauge}
            label="Weighted forecast"
            value={formatCompactINR(weightedForecast)}
            sub="Open pipeline × stage probability"
            accent="#FDF3E3"
          />
          <KpiCard
            icon={Clock}
            label="Avg sales cycle"
            value={`${avgSalesCycle} days`}
            sub="Created → closed won"
            accent="#E7F6F5"
            delta={previousMetrics && <DeltaBadge current={avgSalesCycle} previous={previousMetrics.cycle} invert />}
          />
          <KpiCard
            icon={Layers}
            label="Open deals"
            value={String(openDeals.length)}
            sub="Active, not yet closed"
            accent="#F2EEF9"
          />
          <KpiCard
            icon={UserPlus}
            label="New leads"
            value={String(newLeadsInRange)}
            sub={`Created within ${RANGE_LABELS[range].toLowerCase()}`}
            accent="#FDEAEA"
          />
        </div>

        {/* Executive summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: BRAND }} />
            <h3 className="font-semibold text-slate-900">Executive summary</h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND }} />
              <span>
                <strong className="text-slate-800">{formatCompactINR(revenue)}</strong> closed from{" "}
                <strong className="text-slate-800">{won.length}</strong> won deals, a{" "}
                <strong className="text-slate-800">{winRate}%</strong> win rate this period.
              </span>
            </li>
            {topRep && topRep.revenue > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND }} />
                <span>
                  <strong className="text-slate-800">{topRep.name}</strong> leads the team with{" "}
                  <strong className="text-slate-800">{formatCompactINR(topRep.revenue)}</strong> closed ({topRep.won} deals).
                </span>
              </li>
            )}
            {topSource && topSource.revenue > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND }} />
                <span>
                  <strong className="text-slate-800">{topSource.name}</strong> is the top-performing source at{" "}
                  <strong className="text-slate-800">{topSource.conv}%</strong> conversion.
                </span>
              </li>
            )}
            {bottleneck ? (
              <li className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                <span>
                  Biggest drop-off is between <strong className="text-slate-800">{bottleneck.from}</strong> and{" "}
                  <strong className="text-slate-800">{bottleneck.to}</strong> at{" "}
                  <strong className="text-slate-800">{bottleneck.dropOff}%</strong> — worth reviewing for a bottleneck.
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND }} />
                <span>No significant stage drop-off detected in the current filter selection.</span>
              </li>
            )}
          </ul>
        </div>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Target vs actual revenue</h3>
                    <p className="text-sm text-slate-500">Monthly performance against goal</p>
                  </div>
                  <TrendingUp className="text-slate-400" size={20} />
                </div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={REVENUE_TARGETS} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F4" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} tickFormatter={(v) => `₹${v / 1000}k`} width={50} />
                      <Tooltip formatter={(v, n) => [formatINR(Number(v)), n === "actual" ? "Actual" : "Target"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                      <Bar dataKey="actual" fill={BRAND} radius={[4, 4, 0, 0]} barSize={28} />
                      <Line type="monotone" dataKey="target" stroke="#E2A63C" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[{ name: "Actual revenue", color: BRAND }, { name: "Target", color: "#E2A63C" }]} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <h3 className="font-semibold text-slate-900 mb-1">Lost deal reasons</h3>
                <p className="text-sm text-slate-500 mb-2">{lost.length} lost in range</p>
                {lostReasons.length ? (
                  <>
                    <div style={{ width: "100%", height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={lostReasons} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                            {lostReasons.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [`${v} deals`, n]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend items={lostReasons.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No lost deals in this range</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-slate-900">Pipeline funnel</h3>
                  <p className="text-sm text-slate-500">Deal count by stage, filtered live</p>
                </div>
                {bottleneck && (
                  <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={12} /> {bottleneck.dropOff}% drop at {bottleneck.to}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {funnel.map((s, i) => {
                  const maxCount = Math.max(...funnel.map((f) => f.count), 1);
                  const widthPct = Math.max((s.count / maxCount) * 100, s.count ? 10 : 3);
                  const prev = funnel[i - 1];
                  const dropOff = prev && prev.count ? Math.round(((prev.count - s.count) / prev.count) * 100) : null;
                  return (
                    <div key={s.stage}>
                      {dropOff !== null && dropOff > 0 && <p className="text-[11px] text-slate-400 mb-1 pl-1">↓ {dropOff}% drop-off</p>}
                      <div className="flex items-center gap-4">
                        <div className="w-28 shrink-0 text-sm text-slate-600">{s.stage}</div>
                        <div className="flex-1">
                          <div
                            className="h-9 rounded-lg flex items-center px-3 text-white text-xs font-medium transition-all"
                            style={{ width: `${widthPct}%`, backgroundColor: s.color, minWidth: "70px" }}
                          >
                            {s.count} deals
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} style={{ color: BRAND }} />
                  <h3 className="font-semibold text-slate-900">Recent activity</h3>
                </div>
                <p className="text-sm text-slate-500">Latest stage movement across filtered records</p>
              </div>
              {recentActivity.length ? (
                <ul className="divide-y divide-slate-50">
                  {recentActivity.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                          style={{ backgroundColor: BRAND_SOFT }}
                        >
                          {l.owner.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 truncate">
                            <span className="font-medium">{l.owner}</span> moved{" "}
                            <span className="font-medium">{l.company}</span> to
                          </p>
                          <p className="text-xs text-slate-400">{l.name} · {formatCompactINR(l.value)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageBadge[l.stage]}`}>{l.stage}</span>
                        <span className="text-xs text-slate-400 w-20 text-right">{relativeTime(l.date)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">No activity in the current filter selection</div>
              )}
            </div>
          </>
        )}

        {tab === "sales" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Revenue by source</h3>
              <p className="text-sm text-slate-500 mb-4">Which channels convert to closed revenue</p>
              <div className="space-y-3">
                {sourcePerf.map((s, i) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-700">{s.name}</span>
                      <span className="font-mono text-slate-500">{formatCompactINR(s.revenue)} · {s.conv}% conv.</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((s.revenue / Math.max(...sourcePerf.map((x) => x.revenue), 1)) * 100, 3)}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Deal size distribution</h3>
              <p className="text-sm text-slate-500 mb-4">Won deals in range</p>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <AreaChart data={won.map((w) => ({ name: w.company.slice(0, 10), value: w.value })).sort((a, b) => b.value - a.value)}>
                    <defs>
                      <linearGradient id="dealFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F4" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} width={50} />
                    <Tooltip formatter={(v) => [formatINR(Number(v)), "Deal value"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                    <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill="url(#dealFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Source performance</h3>
              <p className="text-sm text-slate-500 mb-4">Leads, wins and conversion rate per channel</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="font-medium py-2 pr-4">Source</th>
                    <th className="font-medium py-2 pr-4">Leads</th>
                    <th className="font-medium py-2 pr-4">Won</th>
                    <th className="font-medium py-2 pr-4">Conv. %</th>
                    <th className="font-medium py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePerf.map((s) => (
                    <tr key={s.name} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 text-slate-700">{s.name}</td>
                      <td className="py-3 pr-4 text-slate-500">{s.leads}</td>
                      <td className="py-3 pr-4 text-slate-500">{s.won}</td>
                      <td className="py-3 pr-4 text-slate-500">{s.conv}%</td>
                      <td className="py-3 font-mono text-slate-700">{formatCompactINR(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
              <h3 className="font-semibold text-slate-900 mb-2">Lead volume by source</h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sourcePerf} dataKey="leads" nameKey="name" outerRadius={90} stroke="none">
                      {sourcePerf.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} leads`, n]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend items={sourcePerf.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
            </div>
          </div>
        )}

        {tab === "team" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900">Rep performance</h3>
                <p className="text-sm text-slate-500">Revenue closed vs top performer in range</p>
              </div>
              <Users className="text-slate-400" size={20} />
            </div>
            <div className="space-y-4">
              {[...repPerf].sort((a, b) => b.revenue - a.revenue).map((r, i) => (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{i === 0 && r.revenue > 0 ? "🏆 " : ""}{r.name}</span>
                    <span className="text-slate-500">
                      {r.won}/{r.leads} won · {r.convRate}% conv. · <span className="font-mono">{formatCompactINR(r.revenue)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max((r.revenue / maxRepRevenue) * 100, r.revenue ? 4 : 0)}%`, backgroundColor: BRAND }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail table (always visible, respects filters) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Detailed records</h3>
              <p className="text-sm text-slate-500">Click a column to sort</p>
            </div>
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <SortHeader label="Lead" sortKey="name" />
                  <SortHeader label="Company" sortKey="company" />
                  <SortHeader label="Value" sortKey="value" />
                  <SortHeader label="Stage" sortKey="stage" />
                  <SortHeader label="Owner" sortKey="owner" />
                  <SortHeader label="Source" sortKey="source" />
                  <SortHeader label="Last activity" sortKey="date" />
                  <th className="font-medium py-2 pr-4">Days open</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((lead) => {
                  const daysOpen = Math.max(0, Math.round((Date.now() - lead.createdDate.getTime()) / 86400000));
                  const isStale = lead.stage !== "Won" && lead.stage !== "Lost" && (Date.now() - lead.date.getTime()) / 86400000 > 21;
                  return (
                    <tr key={lead.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-800">{lead.name}</td>
                      <td className="py-3 pr-4 text-slate-500">{lead.company}</td>
                      <td className="py-3 pr-4 font-mono text-slate-700">{formatINR(lead.value)}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageBadge[lead.stage]}`}>{lead.stage}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{lead.owner}</td>
                      <td className="py-3 pr-4 text-slate-500">{lead.source}</td>
                      <td className="py-3 pr-4 text-slate-400">{formatDate(lead.date)}</td>
                      <td className="py-3 pr-4">
                        <span className={isStale ? "text-amber-600 font-medium" : "text-slate-400"}>
                          {daysOpen}d{isStale ? " · stale" : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No records match the current filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4 print:hidden">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400 border-t border-slate-200 pt-5">
          <p>© {new Date().getFullYear()} {COMPANY_NAME}. Confidential — for internal use only. Not for external distribution.</p>
          <p>Report generated {formatTimestamp(generatedAt)} · Data as of {formatDateLong(new Date())}</p>
        </div>
      </div>
    </div>
  );
}