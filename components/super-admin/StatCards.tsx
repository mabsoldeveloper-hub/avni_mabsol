"use client";

import React from "react";
import {
  FaHospital,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaCodeBranch,
  FaBuilding,
  FaTrash,
  FaTimes,
  FaArrowUp,
} from "react-icons/fa";
import { SuperAdminStats } from "./types";

interface StatCardsProps {
  stats: SuperAdminStats;
}

export default function StatCards({ stats }: StatCardsProps) {
  const computedDeactive = stats.deactive ?? (stats.expired + (stats.rejected || 0) + (stats.suspended || 0));
  const total = stats.total || 0;

  const activePct = total > 0 ? Math.round((stats.active / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((stats.pending / total) * 100) : 0;
  const deactivePct = total > 0 ? Math.round((computedDeactive / total) * 100) : 0;

  const headOffices = stats.headOffices || 0;
  const childBranches = stats.childBranches || 0;
  const deletedCount = stats.deleted || 0;
  const rejectedCount = stats.rejected || 0;

  const totalLifetime = total + deletedCount;
  const lockedOrArchivedCount = computedDeactive + deletedCount;
  const archivedPct = totalLifetime > 0 ? Math.min(100, Math.round((lockedOrArchivedCount / totalLifetime) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: TOTAL ENTERPRISES */}
      <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.02)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 opacity-90 group-hover:h-1.5 transition-all" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Total Tenants
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
            <FaHospital />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
            {total}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
              <FaBuilding size={9} />
              {headOffices} Hubs
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100/70 px-2 py-0.5 rounded-md">
              <FaCodeBranch size={9} />
              {childBranches} Branches
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: APPROVED & ACTIVE */}
      <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.02)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 opacity-90 group-hover:h-1.5 transition-all" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Approved & Active
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
            <FaCheckCircle />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
              {stats.active}
            </span>
            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 inline-flex items-center gap-1">
              <FaArrowUp size={8} /> {activePct}%
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-emerald-700 font-medium">Licensed Tenants</span>
            <span className="font-semibold text-slate-700">{stats.active} of {total}</span>
          </div>
        </div>
      </div>

      {/* Card 3: PENDING APPROVAL */}
      <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.02)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 opacity-90 group-hover:h-1.5 transition-all" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Pending Clearance
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
            <FaClock />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
              {stats.pending}
            </span>
            <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingPct}%
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-amber-700 font-medium">Awaiting Clearance</span>
            <span className="font-semibold text-slate-700">{stats.pending > 0 ? "Action Required" : "Queue Empty"}</span>
          </div>
        </div>
      </div>

      {/* Card 4: SUSPENDED & ARCHIVED */}
      <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.02)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 opacity-90 group-hover:h-1.5 transition-all" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Locked & Archived
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
            <FaBan />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
              {lockedOrArchivedCount}
            </span>
            <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/80">
              {archivedPct}%
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
              <FaBan size={9} /> {stats.suspended || 0} Locked
            </span>
            {deletedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200/60">
                <FaTrash size={8} /> {deletedCount} Deleted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
