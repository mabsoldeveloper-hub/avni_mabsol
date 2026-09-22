"use client";

import React, { Suspense } from "react";
import { FaSync, FaBan, FaShieldAlt, FaChevronDown } from "react-icons/fa";
import { TIME_RANGE_OPTIONS } from "@/components/super-admin/constants";
import AccountsFilterBar from "@/components/super-admin/AccountsFilterBar";
import AccountsTable from "@/components/super-admin/AccountsTable";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function DeactivatedAccountsContent() {
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
  } = useSuperAdminData("suspended");

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 text-slate-800">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Deactivated & Suspended Accounts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
              <FaBan size={10} />
              {stats.suspended || 0} Locked Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accounts with revoked access, locked logins, or expired subscriptions
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

      {/* Security Enforcement Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200/70">
          <FaShieldAlt />
        </div>
        <div className="leading-relaxed flex-1">
          <span className="font-bold">Real-time Revocation Security:</span> Suspended or deactivated tenants are immediately blocked from logging in. Any active browser sessions are auto-terminated within seconds. Use the toggle switch in the table to instantly reactivate any account.
        </div>
      </div>

      {/* Unified Filter & Data Table */}
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

export default function DeactivatedAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading deactivated accounts...
          </div>
        </div>
      }
    >
      <DeactivatedAccountsContent />
    </Suspense>
  );
}
