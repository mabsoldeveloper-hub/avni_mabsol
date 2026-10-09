"use client";

import React from "react";
import {
  FaSearch,
  FaChevronDown,
  FaDownload,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaBuilding,
  FaCodeBranch,
  FaTimes,
  FaThList,
} from "react-icons/fa";
import { STATUS_FILTER_OPTIONS, PLAN_FILTER_OPTIONS } from "./constants";
import { FilterState, SuperAdminStats } from "./types";

interface AccountsFilterBarProps {
  filter: FilterState;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>;
  cities?: string[];
  headOffices?: Array<{ _id: string; companyName: string; companyCode: string }>;
  stats?: SuperAdminStats;
  onExport?: () => void;
  className?: string;
}

export default function AccountsFilterBar({
  filter,
  onFilterChange,
  cities = [],
  headOffices = [],
  stats,
  onExport,
  className = "",
}: AccountsFilterBarProps) {
  const currentStatus = filter.status || "all";
  const currentBranchType = filter.branchType || "all";
  const currentParentId = filter.parentCompanyId || "all";
  const currentPlan = filter.plan || "all";
  const currentCity = filter.city || "all";
  const currentDate = filter.date || "";

  const setStatusTab = (status: string) => {
    onFilterChange((prev) => ({ ...prev, status }));
  };

  const setBranchType = (branchType: string) => {
    onFilterChange((prev) => ({ ...prev, branchType }));
  };

  const setParentCompany = (parentCompanyId: string) => {
    onFilterChange((prev) => ({ ...prev, parentCompanyId }));
  };

  const handleSearch = (search: string) => {
    onFilterChange((prev) => ({ ...prev, search }));
  };

  const clearAllFilters = () => {
    onFilterChange((prev) => ({
      ...prev,
      search: "",
      status: "all",
      branchType: "all",
      parentCompanyId: "all",
      plan: "all",
      city: "all",
      date: "",
    }));
  };

  const hasActiveFilters =
    filter.search.trim() !== "" ||
    filter.status !== "all" ||
    filter.branchType !== "all" ||
    filter.parentCompanyId !== "all" ||
    filter.plan !== "all" ||
    filter.city !== "all" ||
    filter.date !== "";

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* SECTION TABS: Approved vs Unapproved Clearance Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* TAB 1: All Accounts */}
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currentStatus === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <FaThList size={11} className={currentStatus === "all" ? "text-slate-300" : "text-slate-400"} />
            <span>All Accounts</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {stats.total}
              </span>
            )}
          </button>

          {/* TAB 2: Approved Accounts */}
          <button
            type="button"
            onClick={() => setStatusTab("approved")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currentStatus === "approved" || currentStatus === "active"
                ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-emerald-50/70"
            }`}
          >
            <FaCheckCircle
              size={11}
              className={currentStatus === "approved" || currentStatus === "active" ? "text-emerald-100" : "text-emerald-500"}
            />
            <span>Approved</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "approved" || currentStatus === "active"
                    ? "bg-white/25 text-white"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                }`}
              >
                {stats.active}
              </span>
            )}
          </button>

          {/* TAB 3: Unapproved / Pending Review */}
          <button
            type="button"
            onClick={() => setStatusTab("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currentStatus === "pending" || currentStatus === "unapproved"
                ? "bg-amber-500 text-white shadow-xs shadow-amber-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
            }`}
          >
            <FaClock
              size={11}
              className={currentStatus === "pending" || currentStatus === "unapproved" ? "text-amber-100" : "text-amber-500"}
            />
            <span>Unapproved / Pending</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "pending" || currentStatus === "unapproved"
                    ? "bg-white/25 text-white"
                    : "bg-amber-50 text-amber-800 border border-amber-200/60"
                }`}
              >
                {stats.pending}
              </span>
            )}
          </button>

          {/* TAB 4: Deactivated / Suspended */}
          <button
            type="button"
            onClick={() => setStatusTab("suspended")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currentStatus === "suspended"
                ? "bg-rose-600 text-white shadow-xs shadow-rose-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-rose-50/70"
            }`}
          >
            <FaBan size={11} className={currentStatus === "suspended" ? "text-rose-100" : "text-rose-500"} />
            <span>Deactivated / Locked</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "suspended"
                    ? "bg-white/25 text-white"
                    : "bg-rose-50 text-rose-800 border border-rose-200/60"
                }`}
              >
                {stats.suspended || 0}
              </span>
            )}
          </button>
        </div>

        {/* Clear Filter Indicator */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FaTimes size={10} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* FILTER CONTROLS: Search, Branch-Wise Filter, Parent Hub, City, Plan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search company, CRM code (e.g. MABS148), GSTIN, email, city..."
            value={filter.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-slate-50/60 hover:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Branch-Wise Filter Dropdown */}
        <div className="relative min-w-[155px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <FaCodeBranch size={11} />
          </div>
          <select
            value={currentBranchType}
            onChange={(e) => setBranchType(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-8 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            title="Filter by enterprise hierarchy"
          >
            <option value="all">All Branch Types</option>
            <option value="head_office">Head Office Only (Main)</option>
            <option value="child_branch">Branches Only (Sub-Branch)</option>
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Parent Head Office Selector Dropdown (When headOffices provided) */}
        {headOffices.length > 0 && (
          <div className="relative min-w-[170px] max-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <FaBuilding size={11} />
            </div>
            <select
              value={currentParentId}
              onChange={(e) => setParentCompany(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-8 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs truncate"
              title="Filter child branches by their parent organization"
            >
              <option value="all">All Parent Hubs</option>
              {headOffices.map((ho) => (
                <option key={ho._id} value={ho._id}>
                  {ho.companyName} {ho.companyCode ? `(${ho.companyCode})` : ""}
                </option>
              ))}
            </select>
            <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
          </div>
        )}

        {/* City Filter */}
        <div className="relative min-w-[120px]">
          <select
            value={currentCity}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-4 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Plan Filter */}
        <div className="relative min-w-[120px]">
          <select
            value={currentPlan}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, plan: e.target.value }))}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-4 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
          >
            {PLAN_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[125px]">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            title="Filter by registration date"
          />
        </div>

        {/* Export Action */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <FaDownload size={11} className="text-slate-500" />
            <span>Export</span>
          </button>
        )}
      </div>
    </div>
  );
}
