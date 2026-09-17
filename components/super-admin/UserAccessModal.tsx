"use client";

import React, { useState } from "react";
import {
  FaTimes,
  FaShieldAlt,
  FaHospital,
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaBan,
  FaKey,
  FaUserCheck,
  FaPhone,
  FaEnvelope,
  FaIdCard,
} from "react-icons/fa";
import { SuperAdminUserItem } from "./types";
import { ACCESS_DURATION_OPTIONS, DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";
import { SESSION_TIMEOUT_PRESETS, DEFAULT_USER_SESSION_HOURS } from "@/lib/constants/session.constant";

interface UserAccessModalProps {
  user: SuperAdminUserItem | null;
  onClose: () => void;
  onSave: (
    userId: string,
    action: "approve" | "extend" | "reject" | "suspend" | "activate",
    durationDays?: number,
    notes?: string,
    sessionTimeoutHours?: number
  ) => Promise<void>;
  actionLoading: boolean;
}

export default function UserAccessModal({
  user,
  onClose,
  onSave,
  actionLoading,
}: UserAccessModalProps) {
  if (!user) return null;

  const [selectedDuration, setSelectedDuration] = useState<number>(
    user.accessDurationDays || DEFAULT_ACCESS_DAYS
  );
  const [customDays, setCustomDays] = useState<string>("");

  const [selectedSessionHours, setSelectedSessionHours] = useState<number>(
    user.sessionTimeoutHours || DEFAULT_USER_SESSION_HOURS
  );
  const [customSessionHours, setCustomSessionHours] = useState<string>("");

  const [notes, setNotes] = useState<string>(user.approvalNotes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalDays = selectedDuration;
    if (customDays && !isNaN(Number(customDays))) {
      finalDays = Math.max(1, Number(customDays));
    }

    let finalSessionHours = selectedSessionHours;
    if (customSessionHours && !isNaN(Number(customSessionHours))) {
      finalSessionHours = Math.max(1, Number(customSessionHours));
    }

    const action = !user.isApproved ? "approve" : "extend";
    onSave(user._id, action, finalDays, notes, finalSessionHours);
  };

  const handleReject = () => {
    onSave(user._id, "reject", undefined, notes);
  };

  const handleToggleSuspend = () => {
    const action = user.status === "Suspended" ? "activate" : "suspend";
    onSave(user._id, action, undefined, notes);
  };

  const companyName = user.companyId?.companyName || user.name || "Mabsol Enterprise";
  const gstin = user.companyId?.gstNo || "N/A";
  const city = user.companyId?.city || "Unassigned";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm shadow-blue-600/20 shrink-0">
              <FaShieldAlt />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {user.isApproved ? "Manage Account Access" : "Approve Account Request"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure account validity duration and session timeout for this tenant
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close modal"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Tenant Information Summary */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FaHospital className="text-blue-500" /> Pharma Enterprise Profile
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10.5px]">Pharma Company / Enterprise</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">{companyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Admin Contact & Email</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{user.name} ({user.email})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">GSTIN Number</span>
                <span className="font-mono font-bold text-slate-700 block mt-0.5">{gstin}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">City / Location</span>
                <span className="font-medium text-slate-700 block mt-0.5">{city} • {user.mobile || "No phone"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Access Duration (Validity) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarAlt className="text-blue-600" />
                Access Duration (Account Validity)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Auto-disables after period expires
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACCESS_DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    setSelectedDuration(opt.days);
                    setCustomDays("");
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    selectedDuration === opt.days && !customDays
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Or custom duration:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="e.g. 45 or 120"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full pl-3 pr-12 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Days
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Session Timeout (Re-login frequency) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FaClock className="text-blue-600" />
                Login Session Timeout (Re-login Frequency)
              </label>
              <span className="text-[10.5px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Super Admin = 365 Days
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SESSION_TIMEOUT_PRESETS.map((preset) => (
                <button
                  key={preset.hours}
                  type="button"
                  onClick={() => {
                    setSelectedSessionHours(preset.hours);
                    setCustomSessionHours("");
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    selectedSessionHours === preset.hours && !customSessionHours
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Or custom timeout:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="8760"
                  placeholder="e.g. 3 or 6"
                  value={customSessionHours}
                  onChange={(e) => setCustomSessionHours(e.target.value)}
                  className="w-full pl-3 pr-14 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Hours
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Administrative Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Administrative Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Internal notes regarding this approval or access validity..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
            <div>
              {!user.isApproved ? (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reject Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleSuspend}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                    user.status === "Suspended"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      : "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  {user.status === "Suspended" ? "Reactivate Account" : "Suspend Account"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <FaUserCheck size={12} />
                {user.isApproved ? "Save Changes" : "Confirm & Approve Access"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
