"use client";

import React, { Suspense } from "react";
import { FaSync, FaTrash, FaChevronDown } from "react-icons/fa";
import { TIME_RANGE_OPTIONS } from "@/components/super-admin/constants";
import StatCards from "@/components/super-admin/StatCards";
import AccountsFilterBar from "@/components/super-admin/AccountsFilterBar";
import AccountsTable from "@/components/super-admin/AccountsTable";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function DeletedAccountsContent() {
  const {
    filteredUsers,
    stats,
    loading,
    actionLoading,
    filter,
    setFilter,
    availableCities,
    availableHeadOffices,
    handleToggleActive,
    handleReject,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    refetch,
  } = useSuperAdminData("deleted");

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 text-slate-800">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-lg shadow-sm shadow-red-600/25 shrink-0">
            <FaTrash />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Deleted Accounts & Archived Tenants
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-red-50 text-red-700 border border-red-200/80">
                <FaTrash size={10} />
                {stats.deleted || 0} Deleted Accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Archived tenant records hidden from public view. Review metadata, restore access, or permanently purge from the system.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="relative">
            <select
              value={filter.timeRange}
              onChange={(e) => setFilter((prev) => ({ ...prev, timeRange: e.target.value as any }))}
              className="appearance-none bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs cursor-pointer transition-all"
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
          </div>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
            title="Refresh list"
          >
            <FaSync className={`text-xs ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <StatCards stats={stats} />

      {/* Row 2: Unified Filter & Data Table */}
      <div className="space-y-3">
        <AccountsFilterBar
          filter={filter}
          onFilterChange={setFilter}
          cities={availableCities}
          headOffices={availableHeadOffices}
          stats={stats}
        />

        <AccountsTable
          users={filteredUsers}
          loading={loading}
          actionLoading={actionLoading}
          onToggleActive={handleToggleActive}
          onReject={handleReject}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      </div>
    </div>
  );
}

export default function DeletedAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-indigo-600" />
            Loading deleted accounts...
          </div>
        </div>
      }
    >
      <DeletedAccountsContent />
    </Suspense>
  );
}
