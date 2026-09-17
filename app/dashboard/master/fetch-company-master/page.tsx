"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaBuilding,
  FaSearch,
  FaSync,
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaDownload,
  FaChartBar,
  FaSitemap,
  FaTimes,
} from "react-icons/fa";
import { HiOfficeBuilding } from "react-icons/hi";

interface Company {
  _id: string;
  companyCode: string;
  companyName: string;
  status: string;
}

export default function FetchCompanyMasterPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Active" | "Inactive">("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setAnimateCards(true), 50);
    }
  }, [loading]);

  async function fetchCompanies(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/master/fetch-company-master");
      const json = await res.json();
      if (json.success) {
        setCompanies(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return companies.filter((c) => {
      const matchSearch =
        !kw ||
        c.companyCode.toLowerCase().includes(kw) ||
        c.companyName.toLowerCase().includes(kw);
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  const total = companies.length;
  const active = companies.filter((c) => c.status === "Active").length;
  const inactive = companies.filter((c) => c.status === "Inactive").length;

  function exportCSV() {
    const rows = [
      ["#", "Company Code", "Company Name", "Status"],
      ...filtered.map((c, i) => [i + 1, c.companyCode, c.companyName, c.status]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "company-master.csv";
    a.click();
  }

  const statCards = [
    {
      label: "Total Companies",
      value: total,
      icon: <FaBuilding size={20} />,
      color: "from-indigo-500 to-blue-600",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-200",
      ring: "ring-indigo-300/40",
    },
    {
      label: "Active",
      value: active,
      icon: <FaCheckCircle size={20} />,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      ring: "ring-emerald-300/40",
    },
    {
      label: "Inactive",
      value: inactive,
      icon: <FaTimesCircle size={20} />,
      color: "from-rose-500 to-red-600",
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-200",
      ring: "ring-rose-300/40",
    },
    {
      label: "Coverage",
      value: total > 0 ? `${Math.round((active / total) * 100)}%` : "0%",
      icon: <FaChartBar size={20} />,
      color: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      text: "text-violet-600",
      border: "border-violet-200",
      ring: "ring-violet-300/40",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 md:p-6">

      {/* ─── Page Header ─── */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <HiOfficeBuilding size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                  Phase 1 · Architecture Hierarchy
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Company Master
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage all companies synced from MabsolCRM SaleType master
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchCompanies(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <FaSync size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <FaDownload size={13} />
              Export CSV
            </button>

            <Link
              href="/dashboard/master/division-master"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200"
            >
              Add Party 
              <FaArrowRight size={12} />
            </Link>

            <Link
              href="/dashboard/master/division-master"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200"
            >
              Division Master
              <FaArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            style={{ animationDelay: `${i * 80}ms` }}
            className={`
              relative overflow-hidden rounded-2xl
              bg-white/70 backdrop-blur-xl
              border ${card.border}
              shadow-sm ring-1 ${card.ring}
              p-5
              transition-all duration-500 ease-out
              hover:-translate-y-1 hover:shadow-lg
              ${animateCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            {/* BG Glow */}
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl`} />

            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {card.label}
                </p>
                <p className={`text-3xl font-black ${card.text}`}>
                  {loading ? (
                    <span className="inline-block w-10 h-8 bg-slate-200 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`${card.bg} ${card.text} p-3 rounded-xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Progress Bar ─── */}
      {!loading && total > 0 && (
        <div className="mb-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Companies Coverage</span>
            <span className="text-xs font-bold text-emerald-600">{Math.round((active / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(active / total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-emerald-600 font-medium">{active} Active</span>
            <span className="text-[10px] text-rose-500 font-medium">{inactive} Inactive</span>
          </div>
        </div>
      )}

      {/* ─── Table Card ─── */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

        {/* Table Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-blue-50/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

            <div className="flex items-center gap-2">
              <FaSitemap className="text-indigo-500" size={16} />
              <h2 className="text-sm font-bold text-slate-800">
                Company List
              </h2>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {filtered.length} of {total}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FaTimes size={11} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <FaFilter size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "" | "Active" | "Inactive")}
                  className="pl-8 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-14">#</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company Code
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded-lg animate-pulse" style={{ width: j === 2 ? "60%" : "80%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <FaBuilding size={28} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        {search || statusFilter ? "No companies match your filters" : "No companies found"}
                      </p>
                      {(search || statusFilter) && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter(""); }}
                          className="mt-3 text-xs text-indigo-600 hover:underline font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((company, index) => (
                  <tr
                    key={company._id}
                    className="border-b border-slate-50 group hover:bg-gradient-to-r hover:from-indigo-50/60 hover:to-blue-50/40 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg tracking-wider">
                        {company.companyCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                          <FaBuilding size={11} className="text-white" />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">
                          {company.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          company.status === "Active"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-rose-100 text-rose-600 border border-rose-200"
                        }`}
                      >
                        {company.status === "Active" ? (
                          <FaCheckCircle size={9} />
                        ) : (
                          <FaTimesCircle size={9} />
                        )}
                        {company.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{total}</span> companies
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>{active} Active</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              <span>{inactive} Inactive</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Next Step Footer ─── */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">P1</span>
            <span className="font-semibold text-slate-700">Company</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">P2</span>
            <span>Division</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">P3</span>
            <span>Sub Division</span>
            <span className="hidden sm:inline text-slate-300">→</span>
            <span className="hidden sm:inline">Category → Product → Customer → Salesman</span>
          </div>
          <Link
            href="/dashboard/master/division-master"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
          >
            Next Step: Division
            <FaArrowRight size={12} />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}