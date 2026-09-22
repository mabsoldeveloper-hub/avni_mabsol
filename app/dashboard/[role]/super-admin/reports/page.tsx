"use client";

import React, { Suspense } from "react";
import { FaChartBar, FaDownload, FaSync, FaCalendarAlt, FaFileAlt } from "react-icons/fa";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function ReportsContent() {
  const { users, stats, loading, refetch } = useSuperAdminData();

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const headers = [
      "Company Name",
      "GSTIN",
      "Contact Person",
      "Email",
      "Mobile",
      "City",
      "Status",
      "Approved",
      "Access Days",
      "Valid Until",
      "Session Timeout (Hours)",
      "Created At",
    ];

    const rows = users.map((u) => [
      `"${u.companyId?.companyName || u.name}"`,
      `"${u.companyId?.gstNo || ""}"`,
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.mobile || ""}"`,
      `"${u.companyId?.city || ""}"`,
      `"${u.status}"`,
      u.isApproved ? "YES" : "NO",
      u.isUnlimitedAccess ? "UNLIMITED" : u.accessDurationDays || 30,
      `"${u.accessValidUntil || "N/A"}"`,
      u.sessionTimeoutHours || 1,
      `"${new Date(u.createdAt).toISOString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mabsol_tenants_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tenant & User Reports
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Analytics Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate and export comprehensive registration, subscription, and compliance reports
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={users.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold border border-blue-600 shadow-sm shadow-blue-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FaDownload size={11} /> Export CSV Report
          </button>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
            title="Refresh reports"
          >
            <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Tenants Recorded
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Subscriptions
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Pending Clearances
          </span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Suspended Accounts
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{stats.suspended || 0}</div>
        </div>
      </div>

      {/* Available Pre-built Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-3">
              <FaFileAlt />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tenant Registration Master</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Complete list of all registered pharma manufacturers, PCD distributors, stockists, and retail pharmacies with GSTIN and contact details.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200 transition-colors"
          >
            Download Master Sheet
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-3">
              <FaCalendarAlt />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Validity & Expiry Forecast</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Forecast report detailing accounts due to expire within 7, 15, and 30 days for proactive renewal management.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200 transition-colors"
          >
            Download Expiry Forecast
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg mb-3">
              <FaChartBar />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Security & Session Audit</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Summary of configured session timeouts, approval audit trails, and tenant administrative actions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200 transition-colors"
          >
            Download Security Log
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading reports...
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
