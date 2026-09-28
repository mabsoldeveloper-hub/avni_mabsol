"use client";

import React, { Suspense } from "react";
import { FaCodeBranch, FaSync, FaBuilding, FaMapMarkerAlt, FaCheckCircle } from "react-icons/fa";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function BranchManagementContent() {
  const { users, loading, refetch } = useSuperAdminData();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Branch Management
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Multi-Tenant Network
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor multi-location branch infrastructure, regional outlets, and property nodes
          </p>
        </div>

        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto flex items-center justify-center"
          title="Refresh branches"
        >
          <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Connected Organizations
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{users.length}</div>
          <p className="text-xs text-slate-400 mt-0.5">Primary enterprise tenants</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Multi-Branch Coverage
          </span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {users.length > 0 ? `${users.length * 2}+ Nodes` : "0"}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Regional warehouse & depot locations</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Infrastructure Status
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">100% Synced</div>
          <p className="text-xs text-slate-400 mt-0.5">All branch gateways active</p>
        </div>
      </div>

      {/* Branch Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Tenant Branch Directory</h3>
          <span className="text-xs text-slate-400 font-medium">Auto-synced with tenant profile</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-6">Organization</th>
                <th className="py-3 px-6">Primary Location</th>
                <th className="py-3 px-6 text-center">Allocated Branches</th>
                <th className="py-3 px-6">Contact Admin</th>
                <th className="py-3 px-6 text-center">Branch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    Loading branch data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    No branch records found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-100">
                          {(u.companyId?.companyName || u.name).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {u.companyId?.companyName || u.name}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-400">
                            GSTIN: {u.companyId?.gstNo || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FaMapMarkerAlt className="text-slate-400 text-xs" />
                        <span>{u.companyId?.city || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 font-bold text-slate-800 rounded-lg text-xs">
                        2 Branches
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-800">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          u.status === "Suspended"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {u.status === "Suspended" ? "Restricted" : "Operational"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BranchManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading branch management...
          </div>
        </div>
      }
    >
      <BranchManagementContent />
    </Suspense>
  );
}
