"use client";

import React, { Suspense } from "react";
import { FaFileAlt, FaShieldAlt, FaSync, FaCheckCircle, FaBan, FaKey } from "react-icons/fa";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

function AuditLogsContent() {
  const { users, loading, refetch } = useSuperAdminData();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Security & Audit Logs
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Governance Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time chronological timeline of administrative approvals, suspensions, and permission changes
          </p>
        </div>

        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          title="Refresh audit logs"
        >
          <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Audit Trail List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recorded Governance Events</h3>
          <span className="text-xs text-slate-400 font-medium">Immutable audit trail</span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              Loading security logs...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              No audit records available.
            </div>
          ) : (
            users.map((u) => (
              <div key={u._id} className="p-5 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                    u.status === "Suspended"
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : u.isApproved
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}
                >
                  {u.status === "Suspended" ? (
                    <FaBan />
                  ) : u.isApproved ? (
                    <FaCheckCircle />
                  ) : (
                    <FaKey />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {u.isApproved
                        ? `Account Granted Access: ${u.companyId?.companyName || u.name}`
                        : `Registration Pending Review: ${u.companyId?.companyName || u.name}`}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Admin user <strong>{u.name}</strong> ({u.email}) • Session timeout configured to{" "}
                    <strong>{u.sessionTimeoutHours || 1} Hour(s)</strong> • Access validity:{" "}
                    <strong>
                      {u.isUnlimitedAccess
                        ? "Unlimited"
                        : `${u.accessDurationDays || 30} Days`}
                    </strong>
                  </p>

                  {u.approvalNotes && (
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200/60 p-2 rounded-lg text-slate-600">
                      <strong>Admin Notes:</strong> {u.approvalNotes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading audit logs...
          </div>
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
