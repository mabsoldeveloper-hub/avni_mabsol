"use client";

import React, { useState } from "react";
import { FaCog, FaShieldAlt, FaKey, FaClock, FaCheck, FaSave } from "react-icons/fa";
import { DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";
import { DEFAULT_USER_SESSION_HOURS, SUPER_ADMIN_SESSION_DAYS } from "@/lib/constants/session.constant";

export default function SuperAdminSettingsPage() {
  const [defaultDuration, setDefaultDuration] = useState<number>(DEFAULT_ACCESS_DAYS);
  const [defaultSessionHours, setDefaultSessionHours] = useState<number>(DEFAULT_USER_SESSION_HOURS);
  const [autoRevokeExpired, setAutoRevokeExpired] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Super Admin Settings
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
              System Configuration
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global access validity defaults, user authentication timeouts, and platform security rules
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {/* Security Alert / Super Admin Credential Policy */}
        <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shrink-0 mt-0.5 shadow-sm shadow-indigo-600/20">
            <FaShieldAlt />
          </div>
          <div className="text-xs text-indigo-950 space-y-1">
            <h4 className="font-bold text-sm text-indigo-900">Root Governance Level</h4>
            <p className="leading-relaxed">
              Super Admin accounts (e.g. <code>mabsoldeveloper@gmail.com</code>) bypass regular permission restrictions, never require periodic re-approval, and have persistent session authentication valid for <strong>{SUPER_ADMIN_SESSION_DAYS} days (1 year)</strong>.
            </p>
          </div>
        </div>

        {/* Setting Card 1: Default Access Validity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
              <FaClock />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Default Tenant Access Validity</h3>
              <p className="text-xs text-slate-400">
                Number of days granted by default when approving a new tenant registration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[15, 30, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDefaultDuration(days)}
                className={`py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  defaultDuration === days
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {days} Days Validity
              </button>
            ))}
          </div>
        </div>

        {/* Setting Card 2: User Login Session Timeout */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
              <FaKey />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Standard User Session Timeout</h3>
              <p className="text-xs text-slate-400">
                Default inactivity or session duration before tenant users are required to re-authenticate
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[1, 2, 4, 8].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setDefaultSessionHours(hours)}
                className={`py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  defaultSessionHours === hours
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {hours} Hour{hours > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Setting Card 3: Automatic Revocation Switch */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Auto-Revoke Access on Expiry</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically block login and terminate ongoing sessions when account validity lapses
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRevokeExpired(!autoRevokeExpired)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                autoRevokeExpired ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  autoRevokeExpired ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full border border-blue-600 text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FaSave size={13} /> Save System Settings
          </button>

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
              <FaCheck /> Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
