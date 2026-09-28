"use client";

import React, { Suspense } from "react";
import { FaSync, FaBuilding, FaChevronDown } from "react-icons/fa";
import { TIME_RANGE_OPTIONS } from "@/components/super-admin/constants";
import StatCards from "@/components/super-admin/StatCards";
import AccountsFilterBar from "@/components/super-admin/AccountsFilterBar";
import AccountsTable from "@/components/super-admin/AccountsTable";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function AllAccountsContent() {
  const {
    filteredUsers,
    stats,
    loading,
    actionLoading,
    filter,
    setFilter,
    availableCities,
    handleToggleActive,
    refetch,
  } = useSuperAdminData("all");

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 text-slate-800">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              All Accounts Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              <FaBuilding size={10} />
              {stats.total} Total Registered Tenants
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete database of enrolled pharma enterprises, active subscriptions, and user accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <div className="relative">
            <select
              value={filter.timeRange}
              onChange={(e) => setFilter({ ...filter, timeRange: e.target.value as any })}
              className="appearance-none bg-white border border-slate-200 rounded-full px-4 py-2 pr-8 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
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
            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
            title="Refresh list"
          >
            <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
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
        />

        <AccountsTable
          users={filteredUsers}
          loading={loading}
          actionLoading={actionLoading}
          onToggleActive={handleToggleActive}
        />
      </div>
    </div>
  );
}

export default function AllAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading accounts directory...
          </div>
        </div>
      }
    >
      <AllAccountsContent />
    </Suspense>
  );
}
