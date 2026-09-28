"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaChartBar,
  FaUserTie,
  FaArrowLeft,
  FaSearch,
  FaFilter,
  FaBuilding,
  FaMapMarkerAlt,
  FaSitemap,
  FaTag,
  FaTimes,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFileExcel,
  FaChevronRight,
} from "react-icons/fa";

interface UserItem { _id: string; name: string; employeeCode?: string; designation?: string; }
interface CompanyItem { _id: string; companyCode: string; companyName: string; }
interface TerritoryItem {
  _id: string;
  userId: string;
  userName: string;
  employeeCode: string;
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  subDivisionCode: string;
  subDivisionName: string;
  categoryCode: string;
  categoryName: string;
  status: string;
}

interface MrSummary {
  _id: string;
  userName: string;
  employeeCode: string;
  totalTerritories: number;
  totalCompanies: number;
  totalDivisions: number;
  territories: TerritoryItem[];
  userDetails?: UserItem;
}

export default function MrTerritoryReportPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [mrSummaries, setMrSummaries] = useState<MrSummary[]>([]);
  const [territories, setTerritories] = useState<TerritoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMr, setSelectedMr] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchCompanies(), fetchMrSummary(), fetchTerritories()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      setUsers(Array.isArray(json) ? json : json.data || json.users || []);
    } catch (e) { console.error(e); }
  }

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/master/fetch-company-master");
      const json = await res.json();
      if (json.success) setCompanies(json.data || []);
    } catch (e) { console.error(e); }
  }

  async function fetchMrSummary() {
    try {
      const res = await fetch("/api/mr-territory/summary");
      const json = await res.json();
      if (json.success) setMrSummaries(json.data || []);
    } catch (e) { console.error(e); }
  }

  async function fetchTerritories() {
    try {
      const res = await fetch("/api/mr-territory");
      const json = await res.json();
      if (json.success) setTerritories(json.data || []);
      else setError(json.message);
    } catch { setError("Failed to load territory data"); }
  }

  // Filtered territories
  const filtered = useMemo(() => {
    return territories.filter(t => {
      const matchMr = selectedMr === "all" || t.userId === selectedMr;
      const matchCompany = !companyFilter || t.companyCode === companyFilter;
      const matchStatus = !statusFilter || t.status === statusFilter;
      const s = search.toLowerCase();
      const matchSearch = !search ||
        t.userName.toLowerCase().includes(s) ||
        t.companyName.toLowerCase().includes(s) ||
        t.divisionName.toLowerCase().includes(s) ||
        t.subDivisionName.toLowerCase().includes(s) ||
        t.categoryName.toLowerCase().includes(s);
      return matchMr && matchCompany && matchStatus && matchSearch;
    });
  }, [territories, selectedMr, companyFilter, statusFilter, search]);

  // Group by MR
  const grouped = useMemo(() => {
    const map = new Map<string, { mrName: string; employeeCode: string; items: TerritoryItem[] }>();
    filtered.forEach(t => {
      if (!map.has(t.userId)) {
        map.set(t.userId, { mrName: t.userName, employeeCode: t.employeeCode, items: [] });
      }
      map.get(t.userId)!.items.push(t);
    });
    return Array.from(map.values());
  }, [filtered]);

  // Overall metrics
  const metrics = useMemo(() => ({
    totalMrs: new Set(territories.map(t => t.userId)).size,
    totalAssignments: territories.filter(t => t.status === "Active").length,
    unassignedMrs: users.filter(u => !territories.find(t => t.userId === u._id)).length,
    totalCompanies: new Set(territories.map(t => t.companyCode)).size,
  }), [territories, users]);

  const scopeLabel = (item: TerritoryItem) => {
    const parts = [item.divisionName];
    if (item.subDivisionName) parts.push(item.subDivisionName);
    if (item.categoryName) parts.push(item.categoryName);
    return parts.join(" → ");
  };

  const scopeType = (item: TerritoryItem) => {
    if (item.categoryCode) return { label: "Category Level", color: "bg-purple-100 text-purple-700 border-purple-200" };
    if (item.subDivisionCode) return { label: "Sub Division Level", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    return { label: "Division Level", color: "bg-blue-100 text-blue-700 border-blue-200" };
  };

  function handleExcelExport() {
    // Build CSV
    const rows = [
      ["MR Name", "Employee Code", "Company", "Division", "Sub Division", "Category", "Scope Level", "Status"],
      ...filtered.map(t => [
        t.userName,
        t.employeeCode || "",
        t.companyName,
        t.divisionName,
        t.subDivisionName || "All",
        t.categoryName || "All",
        t.categoryCode ? "Category" : t.subDivisionCode ? "Sub Division" : "Division",
        t.status,
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mr_territory_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 p-5 rounded-2xl text-white shadow-xl border border-teal-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
            <FaChartBar className="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                Territory Report
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              MR Territory Report
            </h1>
            <p className="text-xs text-slate-400">MR-wise territory scope coverage and product hierarchy mapping</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master/mr-territory"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
          >
            <FaArrowLeft /> Manage Territories
          </Link>
          <button
            onClick={handleExcelExport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all"
          >
            <FaFileExcel /> Export CSV
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total MRs Assigned", value: metrics.totalMrs, color: "text-teal-600", bg: "bg-teal-50", icon: <FaUserTie /> },
          { label: "Active Assignments", value: metrics.totalAssignments, color: "text-emerald-600", bg: "bg-emerald-50", icon: <FaCheckCircle /> },
          { label: "Unassigned MRs", value: metrics.unassignedMrs, color: "text-rose-500", bg: "bg-rose-50", icon: <FaExclamationTriangle /> },
          { label: "Companies Covered", value: metrics.totalCompanies, color: "text-indigo-600", bg: "bg-indigo-50", icon: <FaBuilding /> },
        ].map((m) => (
          <div key={m.label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${m.color}`}>{m.label}</p>
              <h3 className={`text-3xl font-extrabold mt-1 ${m.color}`}>{m.value}</h3>
            </div>
            <div className={`w-11 h-11 rounded-xl ${m.bg} ${m.color} flex items-center justify-center text-xl`}>
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search MR, company, division, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><FaTimes /></button>}
        </div>

        <div className="flex items-center gap-2">
          <FaUserTie className="text-slate-400 text-xs" />
          <select
            value={selectedMr}
            onChange={e => setSelectedMr(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
          >
            <option value="all">All MRs</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>
                {u.name}{u.employeeCode ? ` (${u.employeeCode})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FaBuilding className="text-slate-400 text-xs" />
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c._id} value={c.companyCode}>{c.companyName}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-slate-400 text-xs" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <button onClick={fetchAll} className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition" title="Refresh">
          <FaSync className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* MR Territory Detail Table */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <FaSync className="animate-spin text-3xl text-teal-500" />
          <span>Loading report data...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
          <FaExclamationTriangle className="text-rose-500" />
          <span className="text-sm">{error}</span>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <FaChartBar className="text-4xl text-slate-300" />
          <span className="font-semibold text-slate-600">No Territory Data Found</span>
          <Link href="/dashboard/master/mr-territory" className="text-teal-600 hover:underline text-sm">
            Go to MR Territory Management →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ mrName, employeeCode, items }) => (
            <div key={mrName + employeeCode} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* MR Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-50 to-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    {mrName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      {mrName}
                      {employeeCode && <span className="text-xs font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{employeeCode}</span>}
                    </div>
                    <div className="text-xs text-slate-500">{items.length} territory assignments</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(items.map(i => i.companyName))).map(cn => (
                    <span key={cn} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{cn}</span>
                  ))}
                </div>
              </div>

              {/* Territories Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5 w-10">#</th>
                      <th className="py-3 px-5">Company</th>
                      <th className="py-3 px-5">Division</th>
                      <th className="py-3 px-5">Sub Division</th>
                      <th className="py-3 px-5">Category</th>
                      <th className="py-3 px-5">Scope Level</th>
                      <th className="py-3 px-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => {
                      const scope = scopeType(item);
                      return (
                        <tr key={item._id} className="hover:bg-teal-50/20 transition">
                          <td className="py-3 px-5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-3 px-5">
                            <div className="font-semibold text-slate-700">{item.companyName}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.companyCode}</div>
                          </td>
                          <td className="py-3 px-5">
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100">{item.divisionCode}</span>
                            <div className="text-xs text-slate-600 mt-0.5">{item.divisionName}</div>
                          </td>
                          <td className="py-3 px-5 text-sm text-slate-600">
                            {item.subDivisionName || <span className="text-slate-300 italic text-xs">All Sub Divisions</span>}
                          </td>
                          <td className="py-3 px-5 text-sm text-slate-600">
                            {item.categoryName || <span className="text-slate-300 italic text-xs">All Categories</span>}
                          </td>
                          <td className="py-3 px-5">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${scope.color}`}>
                              {scope.label}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && grouped.length > 0 && (
        <div className="text-xs text-slate-500 text-right">
          Showing <strong>{filtered.length}</strong> territory assignments across <strong>{grouped.length}</strong> MRs
        </div>
      )}
    </div>
  );
}
