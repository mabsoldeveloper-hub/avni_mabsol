"use client";

import React from "react";
import Link from "next/link";
import { FaEye, FaCheckCircle, FaSync } from "react-icons/fa";
import { SuperAdminUserItem } from "./types";
import { DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";

interface AccountsTableProps {
  users: SuperAdminUserItem[];
  loading: boolean;
  actionLoading: string | null;
  onToggleActive: (u: SuperAdminUserItem) => void;
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
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
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
      color: "text-emerald-600",
    };
  }
  const totalDays = u.accessDurationDays || DEFAULT_ACCESS_DAYS;
  if (!u.accessValidUntil) {
    return {
      text: `${totalDays} / ${totalDays} days`,
      status: u.isApproved ? "ACTIVE" : "PENDING",
      color: u.isApproved ? "text-emerald-600" : "text-amber-600",
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
    color: isSuspended ? "text-slate-400" : isExpired ? "text-rose-600" : "text-emerald-600",
  };
}

export default function AccountsTable({
  users,
  loading,
  actionLoading,
  onToggleActive,
  onSelectUser,
  className = "",
}: AccountsTableProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs ${className}`}>
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
          <FaSync className="animate-spin text-xl text-blue-600" />
          <p className="text-xs font-semibold text-slate-600">Loading accounts...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <FaCheckCircle className="text-2xl text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Accounts Found</p>
          <p className="text-xs text-slate-400 max-w-sm">
            No registration requests match the selected filters or criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-3.5">ORGANIZATION / COMPANY</th>
                <th className="py-3 px-3.5">EMAIL</th>
                <th className="py-3 px-3.5">PLAN</th>
                <th className="py-3 px-3.5 text-center">TOTAL BRANCHES</th>
                <th className="py-3 px-3.5">STATUS</th>
                <th className="py-3 px-3.5 text-center">ACTIVE</th>
                <th className="py-3 px-3.5">SUBSCRIPTION</th>
                <th className="py-3 px-3.5">REGISTERED AT</th>
                <th className="py-3 px-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const companyName = u.companyId?.companyName || u.name || "MABSOL ENTERPRISE";
                const gstin = u.companyId?.gstNo || "06AALCM8009M1Z1";
                const initials = (companyName.slice(0, 2) || "MA").toUpperCase();
                const subInfo = getSubscriptionInfo(u);
                const isUserActive = u.status !== "Suspended" && u.isApproved;

                return (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                    {/* PHARMA COMPANY / ENTERPRISE */}
                    <td className="py-3 px-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 select-none">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs uppercase tracking-tight">
                            {companyName}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-mono">
                            GSTIN: {gstin}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}
                    <td className="py-3 px-3.5 align-middle text-slate-600 text-xs font-medium">
                      {u.email}
                    </td>

                    {/* PLAN */}
                    <td className="py-3 px-3.5 align-middle">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100/80 border border-slate-200/80 text-slate-700 tracking-wider">
                        {u.isUnlimitedAccess ? "UNLIMITED" : "FREE_TRIAL"}
                      </span>
                    </td>

                    {/* TOTAL BRANCHES */}
                    <td className="py-3 px-3.5 align-middle text-center text-slate-700 text-xs font-bold">
                      2
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-3.5 align-middle">
                      {u.isApproved ? (
                        <span className="text-xs font-bold text-emerald-600">
                          Approved
                        </span>
                      ) : u.status === "Suspended" ? (
                        <span className="text-xs font-bold text-slate-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* ACTIVE (Interactive Modern iOS Toggle Switch) */}
                    <td className="py-3 px-3.5 align-middle text-center">
                      <button
                        type="button"
                        disabled={actionLoading === u._id}
                        onClick={() => onToggleActive(u)}
                        title={
                          u.status === "Suspended"
                            ? "Click to activate account"
                            : "Click to suspend account (auto-logout immediately)"
                        }
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                          isUserActive ? "bg-blue-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isUserActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* SUBSCRIPTION */}
                    <td className="py-3 px-3.5 align-middle">
                      <div className="font-semibold text-slate-800 text-xs">
                        {subInfo.text}
                      </div>
                      <div className={`text-[10px] font-bold uppercase mt-0.5 ${subInfo.color}`}>
                        {subInfo.status}
                      </div>
                    </td>

                    {/* RECEIVED AT */}
                    <td className="py-3 px-3.5 align-middle">
                      <div className="text-xs font-semibold text-slate-800">
                        {getRelativeTime(u.createdAt)}
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">
                        {getFormattedDateTime(u.createdAt)}
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3 px-3.5 align-middle text-center">
                      <Link
                        href={`/dashboard/super-admin/approvals/${u._id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all duration-150 shadow-2xs cursor-pointer"
                        title="Review credentials and configure permissions"
                      >
                        <FaEye size={11} />
                        <span>Review</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
