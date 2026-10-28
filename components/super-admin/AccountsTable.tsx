"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaEye,
  FaCheckCircle,
  FaSync,
  FaBuilding,
  FaCodeBranch,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaShieldAlt,
  FaTrash,
  FaUndo,
  FaTimes,
  FaBan,
  FaChevronDown,
  FaBoxes,
} from "react-icons/fa";
import { SuperAdminUserItem } from "./types";
import { DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";
import UserAccessModal from "./UserAccessModal";

interface AccountsTableProps {
  users: SuperAdminUserItem[];
  loading: boolean;
  actionLoading: string | null;
  onToggleActive: (u: SuperAdminUserItem) => void;
  onReject?: (userId: string, notes?: string) => void;
  onDelete?: (userId: string, reason?: string) => void;
  onRestore?: (userId: string) => void;
  onPermanentDelete?: (userId: string) => void;
  onSaveAccess?: (
    userId: string,
    action: any,
    durationDays?: number,
    notes?: string,
    sessionTimeoutHours?: number,
    enabledModules?: string[]
  ) => Promise<void>;
  onSelectUser?: (u: SuperAdminUserItem) => void;
  className?: string;
}

function getRelativeTime(dateString: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} mo ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} yr ago`;
}

function getFormattedDateTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${timeStr}`;
}

function getSubscriptionInfo(u: SuperAdminUserItem) {
  if (u.isUnlimitedAccess) {
    return {
      text: "Unlimited Access",
      status: "ACTIVE",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200/80",
    };
  }
  const totalDays = u.accessDurationDays || DEFAULT_ACCESS_DAYS;
  if (!u.accessValidUntil) {
    return {
      text: `${totalDays} / ${totalDays} days`,
      status: u.isApproved ? "ACTIVE" : "PENDING",
      color: u.isApproved
        ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
        : "text-amber-700 bg-amber-50 border-amber-200/80",
    };
  }
  const expiry = new Date(u.accessValidUntil).getTime();
  const now = new Date().getTime();
  const remainingDays = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  const isExpired = remainingDays <= 0;
  const isSuspended = u.status === "Suspended";

  return {
    text: `${remainingDays} / ${totalDays} days`,
    status: isSuspended ? "SUSPENDED" : isExpired ? "EXPIRED" : "ACTIVE",
    color: isSuspended
      ? "text-slate-600 bg-slate-100 border-slate-200"
      : isExpired
      ? "text-rose-700 bg-rose-50 border-rose-200/80"
      : remainingDays <= 5
      ? "text-amber-700 bg-amber-50 border-amber-200/80"
      : "text-emerald-700 bg-emerald-50 border-emerald-200/80",
  };
}

export default function AccountsTable({
  users,
  loading,
  actionLoading,
  onToggleActive,
  onReject,
  onDelete,
  onRestore,
  onPermanentDelete,
  onSaveAccess,
  onSelectUser,
  className = "",
}: AccountsTableProps) {
  const [expandedBranches, setExpandedBranches] = React.useState<Record<string, boolean>>({});
  const [modalUser, setModalUser] = React.useState<SuperAdminUserItem | null>(null);
  const [modalTab, setModalTab] = React.useState<"access" | "modules">("modules");
  const [localSaving, setLocalSaving] = React.useState(false);

  const toggleExpand = (userId: string) => {
    setExpandedBranches((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleModalSave = async (
    userId: string,
    action: any,
    durationDays?: number,
    notes?: string,
    sessionTimeoutHours?: number,
    enabledModules?: string[]
  ) => {
    if (onSaveAccess) {
      await onSaveAccess(userId, action, durationDays, notes, sessionTimeoutHours, enabledModules);
      setModalUser(null);
      return;
    }

    setLocalSaving(true);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          durationDays,
          notes,
          sessionTimeoutHours,
          enabledModules,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setModalUser(null);
        window.location.reload();
      } else {
        alert(data.message || "Failed to update account");
      }
    } catch {
      alert("Error saving account changes");
    } finally {
      setLocalSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs ${className}`}>
      {loading ? (
        <div className="p-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
          <FaSync className="animate-spin text-xl text-indigo-600" />
          <p className="text-xs font-semibold text-slate-600">Retrieving multi-tenant directory...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-14 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-500 text-xl shadow-2xs">
            <FaCheckCircle />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">No Enterprise Accounts Found</p>
            <p className="text-xs text-slate-400 max-w-sm mt-0.5">
              No registration records match the current status filter, branch hierarchy, or search query.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/90 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3.5 px-4">ENTERPRISE / HUB</th>
                <th className="py-3.5 px-4">HIERARCHY</th>
                <th className="py-3.5 px-4">CONTACT & ADMIN</th>
                <th className="py-3.5 px-4 text-center">BRANCHES</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACCESS</th>
                <th className="py-3.5 px-4">SUBSCRIPTION</th>
                <th className="py-3.5 px-4">REGISTERED</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90">
              {users.map((u) => {
                const company = u.companyId;
                const companyName = company?.companyName || u.name || "Pharma Enterprise";
                const companyCode = company?.companyCode || "";
                const gstin = company?.gstNo || "";
                const isHeadOffice = !company?.parentCompanyId || company?.isHeadOffice === true;
                const parentComp = company?.parentCompanyId;
                const branchCount = company?.branchCount || company?.childBranches?.length || 0;
                const childBranches = company?.childBranches || [];
                const isExpanded = Boolean(expandedBranches[u._id]);
                const city = company?.city || "";
                const state = company?.state || "";

                const initials = companyName
                  .split(" ")
                  .map((w: string) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "PE";

                const subInfo = getSubscriptionInfo(u);
                const isUserActive = u.status !== "Suspended" && u.status !== "Inactive" && u.isApproved;

                return (
                  <React.Fragment key={u._id}>
                    <tr className="hover:bg-slate-50/80 transition-colors duration-150">
                    {/* ENTERPRISE / BRANCH */}
                    <td className="py-3.5 px-4 align-middle max-w-[280px]">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs border ${
                            isHeadOffice
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200/90"
                              : "bg-teal-50 text-teal-700 border-teal-200/90"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs tracking-tight truncate hover:text-indigo-600 transition-colors">
                            {companyName}
                          </div>
                          <div className="flex items-center flex-wrap gap-1.5 mt-1 font-mono text-[10px]">
                            {companyCode && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200/90">
                                {companyCode}
                              </span>
                            )}
                            {gstin && (
                              <span className="text-slate-500 font-medium truncate">
                                GST: {gstin}
                              </span>
                            )}
                          </div>
                          {(city || state) && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <FaMapMarkerAlt size={9} className="text-slate-400 shrink-0" />
                              <span className="truncate">{[city, state].filter(Boolean).join(", ")}</span>
                            </div>
                          )}

                          {/* Active Modules Badge */}
                          <div className="mt-1.5">
                            {(() => {
                              const userMods = u.enabledModules;
                              const compMods = u.companyId?.enabledModules;
                              const modCount = Array.isArray(userMods)
                                ? userMods.length
                                : Array.isArray(compMods)
                                ? compMods.length
                                : 0;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalUser(u);
                                    setModalTab("modules");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                                  title="Click to view, give, or stop sidebar modules access for this user"
                                >
                                  <FaBoxes size={10} className="text-indigo-600" />
                                  <span>{modCount} / 26 Modules Active</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* BRANCH HIERARCHY BADGE */}
                    <td className="py-3.5 px-4 align-middle">
                      {isHeadOffice ? (
                        <div className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 w-fit">
                            <FaBuilding size={9} />
                            <span>Head Office</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-medium ml-1">Central Hub</span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col gap-0.5 max-w-[180px]">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 w-fit">
                            <FaCodeBranch size={9} />
                            <span>Branch Node</span>
                          </span>
                          {parentComp && (
                            <span
                              className="text-[10px] text-slate-600 font-medium truncate ml-1"
                              title={`Parent: ${parentComp.companyName || ""} (${parentComp.companyCode || ""})`}
                            >
                              Hub: <strong className="font-semibold text-slate-800">{parentComp.companyCode || parentComp.companyName}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* CONTACT & ADMIN */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-bold text-slate-900 text-xs truncate">{u.name}</div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5 font-medium">
                        <FaEnvelope size={9} className="text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.mobile && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <FaPhone size={8} className="text-slate-400 shrink-0" />
                          <span>{u.mobile}</span>
                        </div>
                      )}
                    </td>

                    {/* TOTAL BRANCHES (Branch-wise real count with expand toggle) */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      {isHeadOffice ? (
                        branchCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(u._id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs transition-colors cursor-pointer"
                            title="Click to view child branches"
                          >
                            <span>{branchCount} {branchCount === 1 ? "Branch" : "Branches"}</span>
                            <FaChevronDown size={8} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200/70">
                            0 Branches
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Node</span>
                      )}
                    </td>

                    {/* APPROVAL STATUS */}
                    <td className="py-3.5 px-4 align-middle">
                      {u.isDeleted ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80"
                          title={u.deletedReason ? `Reason: ${u.deletedReason}` : "Account deleted by Super Admin"}
                        >
                          <FaTrash size={9} />
                          <span>Deleted</span>
                        </span>
                      ) : u.status === "Rejected" ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80"
                          title="Application rejected"
                        >
                          <FaBan size={9} />
                          <span>Rejected</span>
                        </span>
                      ) : u.isApproved && u.status === "Active" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                          <FaCheckCircle size={9} />
                          <span>Approved</span>
                        </span>
                      ) : u.status === "Suspended" || u.status === "Inactive" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    {/* ACTIVE SWITCH (Toggle) */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      <button
                        type="button"
                        disabled={actionLoading === u._id || Boolean(u.isDeleted)}
                        onClick={() => onToggleActive(u)}
                        title={
                          u.isDeleted
                            ? "Account is deleted. Restore account to reactivate."
                            : u.status === "Suspended"
                            ? "Click to activate account"
                            : "Click to suspend account (revokes active logins)"
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          !u.isDeleted && isUserActive ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            !u.isDeleted && isUserActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* SUBSCRIPTION */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-bold text-slate-800 text-xs">
                        {subInfo.text}
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${subInfo.color}`}
                        >
                          {subInfo.status}
                        </span>
                      </div>
                    </td>

                    {/* RECEIVED AT */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">
                        {getRelativeTime(u.createdAt)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {getFormattedDateTime(u.createdAt)}
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/dashboard/super-admin/approvals/${u._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-600 hover:text-white border border-indigo-200/80 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="Review credentials, branches, and account details"
                        >
                          <FaEye size={11} />
                          <span>Review</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setModalUser(u);
                            setModalTab("modules");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50/90 hover:bg-emerald-600 hover:text-white border border-emerald-200/90 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="Give or stop access to sidebar modules for this user"
                        >
                          <FaBoxes size={11} />
                          <span>Modules</span>
                        </button>

                        {u.isDeleted ? (
                          <>
                            {onRestore && (
                              <button
                                type="button"
                                disabled={actionLoading === u._id}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Restore account "${u.companyId?.companyName || u.name}"? This will re-enable access.`
                                    )
                                  ) {
                                    onRestore(u._id);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                                title="Restore account"
                              >
                                <FaUndo size={10} />
                                <span>Restore</span>
                              </button>
                            )}
                            {onPermanentDelete && (
                              <button
                                type="button"
                                disabled={actionLoading === u._id}
                                onClick={() => onPermanentDelete(u._id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50/80 hover:bg-red-700 hover:text-white border border-red-200/80 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                                title="Permanently delete from database"
                              >
                                <FaTrash size={10} />
                                <span>Purge</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {u.status !== "Rejected" && onReject && (
                              <button
                                type="button"
                                disabled={actionLoading === u._id}
                                onClick={() => {
                                  const notes = window.prompt(
                                    `Reject account "${u.companyId?.companyName || u.name}"? Enter rejection reason / notes:`
                                  );
                                  if (notes !== null) {
                                    onReject(u._id, notes);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50/80 hover:bg-amber-600 hover:text-white border border-amber-200/80 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                                title="Reject application/account"
                              >
                                <FaBan size={10} />
                                <span>Reject</span>
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                disabled={actionLoading === u._id}
                                onClick={() => {
                                  const reason = window.prompt(
                                    `Delete account "${u.companyId?.companyName || u.name}"?\nEnter reason for deletion:`,
                                    "Decommissioned by Super Admin"
                                  );
                                  if (reason !== null) {
                                    onDelete(u._id, reason);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                                title="Delete account (soft-delete)"
                              >
                                <FaTrash size={10} />
                                <span>Delete</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* NESTED EXPANDED CHILD BRANCHES ROW */}
                  {isHeadOffice && isExpanded && childBranches.length > 0 && (
                    <tr className="bg-slate-50/70 border-t border-b border-indigo-100/70">
                      <td colSpan={9} className="p-3.5 sm:p-4">
                        <div className="bg-white rounded-xl border border-indigo-100 p-3.5 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs border border-teal-100">
                                <FaCodeBranch />
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                Child Branches under {companyName}
                              </span>
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/70">
                                {childBranches.length} {childBranches.length === 1 ? "Branch" : "Branches"}
                              </span>
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                                Synchronized with Head Office Tenure ({subInfo.text})
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              All branches inherit approval and tenure from Head Office
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {childBranches.map((br: any) => (
                              <div
                                key={br._id}
                                className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 text-xs truncate">
                                      {br.companyName}
                                    </div>
                                    <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                                      {br.companyCode || "BRANCH"} • GST: {br.gstNo || "N/A"}
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                      br.status === "Active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {br.status || "Active"}
                                  </span>
                                  <div className="text-[11px] text-slate-600 space-y-0.5">
                                    <div className="truncate">
                                      <span className="text-slate-400">Address:</span> {br.address ? `${br.address}, ` : ""}{br.city ? `${br.city}, ${br.state || ""}` : "Location unassigned"}
                                    </div>
                                    {(br.adminUser || br.email || br.mobile) && (
                                      <div className="truncate text-[10.5px] text-slate-500">
                                        <span className="text-slate-400">Contact:</span> {br.adminUser ? `${br.adminUser.name} (${br.adminUser.email})` : `${br.email || ""} ${br.mobile || ""}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10.5px] text-slate-500 border-t border-slate-200/70 pt-1.5 mt-0.5 font-medium">
                                  <span>{br.city ? `${br.city}, ${br.state || ""}` : "Branch"}</span>
                                  <span className="text-teal-700 font-semibold font-mono bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                    {br.enabledModules?.length || 0} Modules Active
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    {modalUser && (
        <UserAccessModal
          user={modalUser}
          onClose={() => setModalUser(null)}
          onSave={handleModalSave}
          actionLoading={localSaving || actionLoading === modalUser._id}
          initialTab={modalTab}
        />
      )}
    </div>
  );
}
