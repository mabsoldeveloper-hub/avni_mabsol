"use client";

import React, { useState, useMemo } from "react";
import {
  FaTimes,
  FaShieldAlt,
  FaHospital,
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaBan,
  FaUserCheck,
  FaLayerGroup,
  FaSearch,
  FaBoxes,
  FaSlidersH,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { SuperAdminUserItem } from "./types";
import {
  ACCESS_DURATION_OPTIONS,
  DEFAULT_ACCESS_DAYS,
  SUPER_ADMIN_SIDEBAR_MODULES,
  ALL_SIDEBAR_MODULE_IDS,
} from "@/lib/constants/superAdmin.constant";
import { SESSION_TIMEOUT_PRESETS, DEFAULT_USER_SESSION_HOURS } from "@/lib/constants/session.constant";

interface UserAccessModalProps {
  user: SuperAdminUserItem | null;
  onClose: () => void;
  onSave: (
    userId: string,
    action: "approve" | "extend" | "reject" | "suspend" | "activate" | "update_modules",
    durationDays?: number,
    notes?: string,
    sessionTimeoutHours?: number,
    enabledModules?: string[]
  ) => Promise<void>;
  actionLoading: boolean;
  initialTab?: "access" | "modules";
}

export default function UserAccessModal({
  user,
  onClose,
  onSave,
  actionLoading,
  initialTab = "modules",
}: UserAccessModalProps) {
  if (!user) return null;

  const [activeTab, setActiveTab] = useState<"access" | "modules">(initialTab);

  // Tenure & Session State
  const [selectedDuration, setSelectedDuration] = useState<number>(
    user.accessDurationDays || DEFAULT_ACCESS_DAYS
  );
  const [customDays, setCustomDays] = useState<string>("");

  const [selectedSessionHours, setSelectedSessionHours] = useState<number>(
    user.sessionTimeoutHours || DEFAULT_USER_SESSION_HOURS
  );
  const [customSessionHours, setCustomSessionHours] = useState<string>("");

  const [notes, setNotes] = useState<string>(user.approvalNotes || "");

  // Modules State
  const initialModules = useMemo(() => {
    if (Array.isArray(user.enabledModules)) {
      return [...user.enabledModules];
    }
    if (Array.isArray(user.companyId?.enabledModules)) {
      return [...user.companyId.enabledModules];
    }
    // Default: all modules enabled for new unconfigured accounts
    return [...ALL_SIDEBAR_MODULE_IDS];
  }, [user]);

  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules);
  const [moduleSearch, setModuleSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  // Toggle single module access
  const handleToggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  // Grant all modules access
  const handleGrantAll = () => {
    setSelectedModules([...ALL_SIDEBAR_MODULE_IDS]);
  };

  // Stop all modules access
  const handleStopAll = () => {
    setSelectedModules([]);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setSelectedModules([...initialModules]);
  };

  // Filter modules by search and category
  const filteredModules = useMemo(() => {
    return SUPER_ADMIN_SIDEBAR_MODULES.filter((mod) => {
      if (categoryFilter !== "ALL" && mod.category !== categoryFilter) {
        return false;
      }
      if (moduleSearch.trim()) {
        const q = moduleSearch.toLowerCase();
        const matchesName = mod.name.toLowerCase().includes(q);
        const matchesId = mod.id.toLowerCase().includes(q);
        const matchesDesc = mod.desc.toLowerCase().includes(q);
        const matchesSub = mod.subModules.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesId && !matchesDesc && !matchesSub) {
          return false;
        }
      }
      return true;
    });
  }, [categoryFilter, moduleSearch]);

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
    onSave(user._id, action, finalDays, notes, finalSessionHours, selectedModules);
  };

  // Dedicated Save Modules action
  const handleSaveModulesOnly = () => {
    onSave(user._id, "update_modules", undefined, notes, undefined, selectedModules);
  };

  const handleReject = () => {
    onSave(user._id, "reject", undefined, notes, undefined, selectedModules);
  };

  const handleToggleSuspend = () => {
    const action = user.status === "Suspended" ? "activate" : "suspend";
    onSave(user._id, action, undefined, notes, undefined, selectedModules);
  };

  const companyName = user.companyId?.companyName || user.name || "Pharma Enterprise";
  const gstin = user.companyId?.gstNo || "N/A";
  const city = user.companyId?.city || "Unassigned";

  const totalModulesCount = SUPER_ADMIN_SIDEBAR_MODULES.length;
  const activeCount = selectedModules.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center text-lg shadow-sm shadow-indigo-600/25 shrink-0">
              <FaShieldAlt />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Super Admin Control: {companyName}
                </h2>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-bold">
                  {user.name} ({user.email})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Grant or stop access to sidebar modules and configure tenancy subscription validity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("modules")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "modules"
                  ? "border-indigo-600 text-indigo-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FaBoxes size={13} />
              <span>Sidebar Modules Control</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}
              >
                {activeCount} / {totalModulesCount} Active
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("access")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "access"
                  ? "border-indigo-600 text-indigo-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FaCalendarAlt size={12} />
              <span>Tenure, Validity & Status</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                {user.accessDurationDays || 30} Days
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            GSTIN: <span className="font-mono font-bold text-slate-700">{gstin}</span> • {city}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* TAB 1: SIDEBAR MODULES CONTROL */}
          {activeTab === "modules" && (
            <div className="space-y-4">
              {/* Top Controls: Search, Quick Actions, Stats */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search sidebar modules by name, keyword, or route..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FaCheckCircle size={11} /> Grant All Access
                    </button>
                    <button
                      type="button"
                      onClick={handleStopAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FaBan size={11} /> Stop All Access
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      title="Reset to initial"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Section:
                  </span>
                  {[
                    { key: "ALL", label: `All (${totalModulesCount})` },
                    { key: "DASHBOARD", label: "Dashboard & AI (6)" },
                    { key: "OPERATIONS", label: "Operations & Billing (7)" },
                    { key: "LEADS", label: "Marketing & Leads (5)" },
                    { key: "MASTERS", label: "Masters & Catalogs (4)" },
                    { key: "REPORTS_ADMIN", label: "Reports & Admin (4)" },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        categoryFilter === cat.key
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModules.map((mod) => {
                  const isGranted = selectedModules.includes(mod.id);
                  const isExpanded = expandedModuleId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 shadow-2xs ${
                        isGranted
                          ? "bg-white border-slate-200 hover:border-indigo-300 ring-1 ring-emerald-500/10"
                          : "bg-slate-50/70 border-slate-200/80 opacity-80"
                      }`}
                    >
                      {/* Top: Module Header & Toggle Button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 border mt-0.5 ${
                              isGranted
                                ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white border-indigo-400 shadow-2xs"
                                : "bg-slate-200 text-slate-500 border-slate-300"
                            }`}
                          >
                            <FaLayerGroup />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {mod.name}
                              </h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                {mod.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {mod.desc}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Give / Stop Access Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleModule(mod.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                            isGranted
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                              : "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {isGranted ? (
                            <>
                              <FaCheck size={10} />
                              <span>Access Granted</span>
                            </>
                          ) : (
                            <>
                              <FaBan size={10} />
                              <span>Access Stopped</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Bottom Info & Submodule Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 font-bold">
                            {mod.categoryLabel}
                          </span>
                          <span className="font-mono text-slate-400">•</span>
                          <span className="font-medium text-slate-600">
                            {mod.subModulesCount} {mod.subModulesCount === 1 ? "route" : "sub-routes"}
                          </span>
                        </div>

                        {mod.subModules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? "Hide" : "View"} Sub-routes</span>
                            {isExpanded ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
                          </button>
                        )}
                      </div>

                      {/* Expanded Submodules preview */}
                      {isExpanded && mod.subModules.length > 1 && (
                        <div className="mt-1 pt-2 border-t border-dashed border-slate-200 bg-slate-50/90 rounded-xl p-2.5 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Included Sub-routes & Navigation:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {mod.subModules.map((sub, idx) => (
                              <span
                                key={idx}
                                className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredModules.length === 0 && (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500">
                    No sidebar modules match your filter.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TENURE, VALIDITY & STATUS */}
          {activeTab === "access" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tenant Profile Summary */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <FaHospital className="text-indigo-600" /> Pharma Enterprise Profile
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

              {/* Section 1: Access Duration (Validity) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FaCalendarAlt className="text-indigo-600" />
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
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25"
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
                      className="w-full pl-3 pr-12 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Session Timeout */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FaClock className="text-indigo-600" />
                    Login Session Timeout (Re-login Frequency)
                  </label>
                  <span className="text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
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
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25"
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
                      className="w-full pl-3 pr-14 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Hours
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Administrative Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes regarding this approval or access validity..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 bg-slate-50/80 shrink-0">
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === "modules" ? (
              <button
                type="button"
                onClick={handleSaveModulesOnly}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <FaBoxes size={12} />
                Save Module Permissions ({activeCount}/{totalModulesCount})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <FaUserCheck size={12} />
                {user.isApproved ? "Save Changes" : "Confirm & Approve Access"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
