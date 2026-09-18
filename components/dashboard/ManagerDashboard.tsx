"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaUsers,
  FaChartPie,
  FaAward,
  FaCheckCircle,
  FaExchangeAlt,
  FaMapMarkedAlt,
  FaTruck,
  FaFileInvoiceDollar,
  FaBroadcastTower,
  FaSyncAlt,
  FaSearch,
  FaCommentDots,
} from "react-icons/fa";

interface ManagerDashboardProps {
  user: any;
  selectedCompany?: any;
}

interface TeamMemberMetric {
  id: string;
  name: string;
  email: string;
  roleType: string;
  area: string;
  target: number;
  achieved: number;
  pct: number;
  calls: number;
  hasSubmittedDcr: boolean;
}

export default function ManagerDashboard({ user, selectedCompany }: ManagerDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberMetric[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalRegionSales: 0,
    totalRegionTarget: 0,
    teamQuotaPct: 0,
    activeMrCount: 0,
    totalMrCount: 0,
    regionOverdue: 0,
    overdueAccountsCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchManagerData();
  }, [user, selectedCompany]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);

      // 1. Fetch team users
      const usersRes = await fetch("/api/users");
      const usersJson = await usersRes.json();
      const rawUsers: any[] = Array.isArray(usersJson) ? usersJson : (usersJson?.users || []);

      // Filter field reps / subordinates (MRs, RSMs, etc.)
      const fieldReps = rawUsers.filter((u: any) => {
        const rt = String(u.roleType || "").toUpperCase();
        const rn = String(u.roleName || u.roleId?.roleName || "").toLowerCase();
        return rt === "MR" || rt === "RSM" || rn.includes("sales") || rn.includes("mr") || rn.includes("rep");
      });

      // 2. Fetch targets
      let targetsList: any[] = [];
      try {
        const targetsRes = await fetch("/api/targets");
        if (targetsRes.ok) {
          const targetsJson = await targetsRes.json();
          targetsList = Array.isArray(targetsJson) ? targetsJson : (targetsJson?.targets || []);
        }
      } catch (err) {
        console.error("Failed to load targets:", err);
      }

      // 3. Fetch DCRs for today/recent calls
      let dcrsList: any[] = [];
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const dcrRes = await fetch(`/api/mr-reporting/dcr?startDate=${todayStr}`);
        if (dcrRes.ok) {
          const dcrJson = await dcrRes.json();
          dcrsList = Array.isArray(dcrJson?.data) ? dcrJson.data : (Array.isArray(dcrJson) ? dcrJson : []);
        }
      } catch (err) {
        console.error("Failed to load DCRs:", err);
      }

      // 4. Fetch dashboard overview for regional overdue & sales
      let dashOverview: any = null;
      try {
        const params = new URLSearchParams();
        if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
        const dashRes = await fetch(`/api/dashboard?${params.toString()}`);
        if (dashRes.ok) {
          dashOverview = await dashRes.json();
        }
      } catch (err) {
        console.error("Failed to load dashboard overview:", err);
      }

      // Build consolidated metrics per team member
      const memberMetrics: TeamMemberMetric[] = fieldReps.map((rep) => {
        const repId = String(rep._id);
        const repTargets = targetsList.filter((t: any) => String(t.mrUserId?._id || t.mrUserId) === repId);
        
        let totalTarget = 0;
        let totalAchieved = 0;
        repTargets.forEach((t: any) => {
          totalTarget += Number(t.targetAmount || t.targetValue || 0);
          totalAchieved += Number(t.achievedAmount || t.salesValue || 0);
        });

        const repDcrs = dcrsList.filter((d: any) => String(d.userId?._id || d.userId) === repId);
        let callsCount = 0;
        repDcrs.forEach((d: any) => {
          callsCount += Array.isArray(d.callLogs) ? d.callLogs.length : 1;
        });

        const assignedAreaStr = rep.assignedAreaNames?.length 
          ? rep.assignedAreaNames.join(", ") 
          : (rep.headquarter || rep.city || "Territory Assigned");

        const pct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

        return {
          id: repId,
          name: rep.name || "Representative",
          email: rep.email || "",
          roleType: rep.roleType || rep.roleId?.roleName || "MR",
          area: assignedAreaStr,
          target: totalTarget,
          achieved: totalAchieved,
          pct: pct,
          calls: callsCount,
          hasSubmittedDcr: repDcrs.length > 0,
        };
      });

      // Summary calculations
      let grandTarget = 0;
      let grandAchieved = 0;
      memberMetrics.forEach((m) => {
        grandTarget += m.target;
        grandAchieved += m.achieved;
      });

      const dashSales = Number(dashOverview?.kpis?.sales?.totalSales || 0);
      const dashOverdue = Number(dashOverview?.kpis?.credit?.totalOverdue || 0);
      const overdueLedgers = Number(dashOverview?.kpis?.credit?.overdueCount || 0);

      const computedTotalSales = grandAchieved > 0 ? grandAchieved : dashSales;
      const overallQuota = grandTarget > 0 ? Math.round((grandAchieved / grandTarget) * 100) : (computedTotalSales > 0 ? 100 : 0);
      const activeMRs = memberMetrics.filter((m) => m.hasSubmittedDcr || m.calls > 0 || m.achieved > 0).length;

      setTeamMembers(memberMetrics);
      setSummaryStats({
        totalRegionSales: computedTotalSales,
        totalRegionTarget: grandTarget,
        teamQuotaPct: overallQuota,
        activeMrCount: activeMRs || (fieldReps.length > 0 ? fieldReps.length : 0),
        totalMrCount: fieldReps.length,
        regionOverdue: dashOverdue,
        overdueAccountsCount: overdueLedgers,
      });

    } catch (err) {
      console.error("Error in fetchManagerData:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-h-screen">
      {/* ==================== MANAGER HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 sm:p-6 text-white border border-indigo-500/20 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300">
                Territory Management Hub
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                <FaMapMarkedAlt size={9} /> {summaryStats.totalMrCount} Field Representatives Assigned
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight font-sans">
              Manager Executive Console — {user?.name || "Manager"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Live hierarchy performance, team quota achievement, regional territory tracking, and 1-click team broadcast messaging.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchManagerData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all hover:scale-105"
            >
              <FaSyncAlt size={11} className={loading ? "animate-spin" : ""} /> Sync Live Data
            </button>
            <Link
              href="/dashboard/broadcast"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              <FaBroadcastTower size={12} /> 1-Click Broadcast
            </Link>
            <Link
              href="/dashboard/targets"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <FaAward size={12} /> Territory Quotas
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== 4 REGIONAL SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10.5px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Total Region Sales</span>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            ₹{summaryStats.totalRegionSales.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Live from ERP &amp; Orders</p>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10.5px] font-bold uppercase text-purple-600 dark:text-purple-400">Team Target Quota</span>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {summaryStats.teamQuotaPct}%
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {summaryStats.totalRegionTarget > 0 ? `₹${summaryStats.totalRegionTarget.toLocaleString("en-IN")} Assigned Target` : "Target Allocated"}
          </p>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10.5px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Active Field MRs</span>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {summaryStats.activeMrCount} / {summaryStats.totalMrCount} Field Active
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Daily Field Monitoring</p>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-4.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10.5px] font-bold uppercase text-rose-600 dark:text-rose-400">Region Overdue</span>
          <p className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            ₹{summaryStats.regionOverdue.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {summaryStats.overdueAccountsCount > 0 ? `${summaryStats.overdueAccountsCount} Accounts with Due Ledgers` : "Monitored Ledgers"}
          </p>
        </div>
      </div>

      {/* ==================== TEAM LEADERBOARD & AREA PERFORMANCE TABLE ==================== */}
      <div className="rounded-2xl p-4 sm:p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Territory Team Performance &amp; Area Breakdown
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FaSearch size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search MR or territory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <Link
              href="/dashboard/broadcast"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 shrink-0"
            >
              Broadcast to Team ➔
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FaSyncAlt size={20} className="animate-spin text-purple-600" />
            <span className="text-xs font-medium">Fetching team metrics...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No sales representatives or territory data found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 pb-2">
                  <th className="py-2 font-semibold">Representative</th>
                  <th className="py-2 font-semibold">Assigned Area</th>
                  <th className="py-2 font-semibold">Target</th>
                  <th className="py-2 font-semibold">Achieved</th>
                  <th className="py-2 font-semibold">Completion %</th>
                  <th className="py-2 font-semibold">Field Calls</th>
                  <th className="py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span>{m.name}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{m.roleType}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">{m.area}</td>
                    <td className="py-2.5 text-slate-500">
                      {m.target > 0 ? `₹${m.target.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {m.achieved > 0 ? `₹${m.achieved.toLocaleString("en-IN")}` : "₹0"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                            style={{ width: `${Math.min(100, m.pct)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-indigo-600">{m.pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {m.calls} Visits
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/dashboard/broadcast?userId=${m.id}&name=${encodeURIComponent(m.name)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-bold transition-colors"
                      >
                        <FaCommentDots size={10} /> Message MR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
