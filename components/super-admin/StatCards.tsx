"use client";

import React from "react";
import { FaHospital, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import { SuperAdminStats } from "./types";

interface StatCardsProps {
  stats: SuperAdminStats;
}

export default function StatCards({ stats }: StatCardsProps) {
  const computedDeactive = stats.deactive ?? (stats.expired + stats.rejected + (stats.suspended || 0));
  const total = stats.total || 0;

  const activePct = total > 0 ? Math.round((stats.active / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((stats.pending / total) * 100) : 0;
  const deactivePct = total > 0 ? Math.round((computedDeactive / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: TOTAL ENTERPRISES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Total Enterprises
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 border border-blue-100/60">
            <FaHospital />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {total}
          </div>
          <div className="text-[10.5px] text-blue-600 font-semibold mt-0.5 truncate">
            All registered tenants
          </div>
        </div>
      </div>

      {/* Card 2: APPROVED & ACTIVE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Active / Subscribed
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 border border-emerald-100/60">
            <FaCheckCircle />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {stats.active}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
              {activePct}%
            </span>
          </div>
          <div className="text-[10.5px] text-emerald-600 font-semibold mt-0.5 truncate">
            Active verified licenses
          </div>
        </div>
      </div>

      {/* Card 3: PENDING APPROVAL */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Pending Clearance
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0 border border-amber-100/60">
            <FaClock />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {stats.pending}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
              {pendingPct}%
            </span>
          </div>
          <div className="text-[10.5px] text-amber-600 font-semibold mt-0.5 truncate">
            Requires admin action
          </div>
        </div>
      </div>

      {/* Card 4: SUSPENDED / LOCKED */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Suspended / Locked
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0 border border-rose-100/60">
            <FaBan />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {computedDeactive}
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
              {deactivePct}%
            </span>
          </div>
          <div className="text-[10.5px] text-rose-600 font-semibold mt-0.5 truncate">
            Revoked access
          </div>
        </div>
      </div>
    </div>
  );
}
