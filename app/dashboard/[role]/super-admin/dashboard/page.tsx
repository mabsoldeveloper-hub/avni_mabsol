"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import {
  FaSync,
  FaShieldAlt,
  FaUsers,
  FaUserCheck,
  FaBan,
  FaServer,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaBuilding,
  FaBoxes,
  FaIdCard,
  FaCog,
  FaCreditCard,
} from "react-icons/fa";
import StatCards from "@/components/super-admin/StatCards";
import CategoryCards from "@/components/super-admin/CategoryCards";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function DashboardOverviewContent() {
  const { users, stats, loading, refetch } = useSuperAdminData();

  const recentUsers = users.slice(0, 6);
  const total = stats.total || 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 text-slate-800">
      {/* Top Header / Executive Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Platform Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operational
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time enterprise metrics, tenant capacity distribution, and security governance
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Link
            href="/dashboard/super-admin"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full border border-blue-600 shadow-sm shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FaUserCheck size={12} />
            <span>Review Approvals</span>
            {stats.pending > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {stats.pending}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/super-admin/accounts"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-full border border-slate-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FaIdCard size={12} className="text-slate-500" />
            <span>Directory</span>
          </Link>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
            title="Refresh metrics"
          >
            <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Row 1: Master 4-KPI Metric Grid */}
      <StatCards stats={stats} />

      {/* Row 2: 12-Column Responsive Operational Work Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left 8 Columns: Main Operations Area */}
        <div className="xl:col-span-8 space-y-4">
          {/* Recent Registration & Clearance Queue */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Registration & Clearance Queue
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {recentUsers.length} Recent
                </span>
              </div>

              <Link
                href="/dashboard/super-admin/accounts"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <span>View Full Directory</span>
                <FaArrowRight size={10} />
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent registrations found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentUsers.map((u) => {
                  const companyName = u.companyId?.companyName || u.name || "Pharma Enterprise";
                  const initials = companyName.substring(0, 2).toUpperCase();
                  const isPending = !u.isApproved;
                  const isSuspended = u.status === "Suspended";

                  return (
                    <div
                      key={u._id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-600 font-extrabold text-xs flex items-center justify-center shrink-0 select-none shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate uppercase tracking-tight">
                            {companyName}
                          </div>
                          <div className="text-[10.5px] text-slate-400 truncate mt-0.5">
                            {u.email} • {u.companyId?.city || "Unassigned"} • GSTIN: {u.companyId?.gstNo || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200/80"
                              : isSuspended
                              ? "bg-rose-50 text-rose-700 border-rose-200/80"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          }`}
                        >
                          {isPending ? "Pending Review" : isSuspended ? "Suspended" : "Active"}
                        </span>

                        <Link
                          href={`/dashboard/super-admin/approvals/${u._id}`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pharma Sector Distribution (Category Breakdown) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FaBoxes className="text-blue-600" />
                Pharma Sector Distribution
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Categorized by business formulation
              </span>
            </div>
            <CategoryCards users={users} />
          </div>
        </div>

        {/* Right 4 Columns: Platform Governance & Health Side Area */}
        <div className="xl:col-span-4 space-y-4">
          {/* Card 1: System Policies & Session Security */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FaShieldAlt className="text-blue-600" />
                Security & Policies
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Operational
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Super Admin Session</span>
                <span className="font-bold text-slate-900">365 Days (Persistent)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">User Login Timeout</span>
                <span className="font-bold text-slate-900">1 Hour (Configurable)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Suspension Revocation</span>
                <span className="font-bold text-emerald-600">Immediate Logout</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Approval Enforcement</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tenant Capacity Gauge */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FaBuilding className="text-indigo-600" />
              Tenant Capacity Status
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Approved / Active</span>
                  <span className="font-bold text-slate-900">
                    {total > 0 ? Math.round((stats.active / total) * 100) : 0}% ({stats.active})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (stats.active / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Pending Clearances</span>
                  <span className="font-bold text-slate-900">
                    {total > 0 ? Math.round((stats.pending / total) * 100) : 0}% ({stats.pending})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (stats.pending / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Suspended / Restricted</span>
                  <span className="font-bold text-slate-900">
                    {total > 0 ? Math.round(((stats.suspended || 0) / total) * 100) : 0}% ({stats.suspended || 0})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? ((stats.suspended || 0) / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Quick Governance Shortcuts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FaServer className="text-purple-600" />
              Quick Governance Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2 text-xs">
              <Link
                href="/dashboard/super-admin"
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <FaUserCheck size={11} />
                  </div>
                  <span className="font-semibold text-slate-800">Pending Approvals</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800">
                  {stats.pending}
                </span>
              </Link>

              <Link
                href="/dashboard/super-admin/accounts"
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <FaIdCard size={11} />
                  </div>
                  <span className="font-semibold text-slate-800">Tenant Directory</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800">
                  {total}
                </span>
              </Link>

              <Link
                href="/dashboard/super-admin/deactivated"
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/40 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <FaBan size={11} />
                  </div>
                  <span className="font-semibold text-slate-800">Suspended Accounts</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100/80 text-rose-800">
                  {stats.suspended || 0}
                </span>
              </Link>

              <Link
                href="/dashboard/super-admin/settings"
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <FaCog size={11} />
                  </div>
                  <span className="font-semibold text-slate-800">Security & Settings</span>
                </div>
                <FaArrowRight size={10} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading super admin command center...
          </div>
        </div>
      }
    >
      <DashboardOverviewContent />
    </Suspense>
  );
}
