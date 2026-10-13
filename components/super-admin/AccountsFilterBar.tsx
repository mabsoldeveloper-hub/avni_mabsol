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
  FaTrash,
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
      branchType: "head_office",
      parentCompanyId: "all",
      plan: "all",
      city: "all",
      date: "",
    }));
  };

  const hasActiveFilters =
    filter.search.trim() !== "" ||
    filter.status !== "all" ||
    (filter.branchType !== "head_office" && filter.branchType !== "all") ||
    filter.parentCompanyId !== "all" ||
    filter.plan !== "all" ||
    filter.city !== "all" ||
    filter.date !== "";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* SECTION TABS: Approved vs Unapproved Clearance Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* TAB 1: All Accounts */}
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "all"
                ? "bg-slate-900 text-white shadow-sm shadow-slate-950/15"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <FaThList size={11} className={currentStatus === "all" ? "text-slate-300" : "text-slate-400"} />
            <span>All Directory</span>
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "approved" || currentStatus === "active"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25"
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "pending" || currentStatus === "unapproved"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
            }`}
          >
            <FaClock
              size={11}
              className={currentStatus === "pending" || currentStatus === "unapproved" ? "text-amber-100" : "text-amber-500"}
            />
            <span>Pending Review</span>
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "suspended"
                ? "bg-slate-800 text-white shadow-sm shadow-slate-800/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FaBan size={11} className={currentStatus === "suspended" ? "text-slate-200" : "text-slate-400"} />
            <span>Deactivated</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "suspended"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-800 border border-slate-200/60"
                }`}
              >
                {stats.suspended || 0}
              </span>
            )}
          </button>

          {/* TAB 5: Rejected Applications */}
          <button
            type="button"
            onClick={() => setStatusTab("rejected")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "rejected"
                ? "bg-rose-600 text-white shadow-sm shadow-rose-600/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-rose-50/70"
            }`}
          >
            <FaTimes size={11} className={currentStatus === "rejected" ? "text-rose-100" : "text-rose-500"} />
            <span>Rejected</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "rejected"
                    ? "bg-white/25 text-white"
                    : "bg-rose-50 text-rose-800 border border-rose-200/60"
                }`}
              >
                {stats.rejected || 0}
              </span>
            )}
          </button>

          {/* TAB 6: Deleted Accounts */}
          <button
            type="button"
            onClick={() => setStatusTab("deleted")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              currentStatus === "deleted"
                ? "bg-red-700 text-white shadow-sm shadow-red-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-red-50/70"
            }`}
          >
            <FaTrash size={10} className={currentStatus === "deleted" ? "text-red-200" : "text-red-500"} />
            <span>Deleted Accounts</span>
            {stats && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  currentStatus === "deleted"
                    ? "bg-white/25 text-white"
                    : "bg-red-50 text-red-800 border border-red-200/60"
                }`}
              >
                {stats.deleted || 0}
              </span>
            )}
          </button>
        </div>

        {/* Clear Filter Indicator */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-50/80 transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200/60"
          >
            <FaTimes size={10} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* FILTER CONTROLS: Search, Branch-Wise Filter, Parent Hub, City, Plan */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
          <input
            type="text"
            placeholder="Search company name, CRM code (e.g. MABS148), GSTIN, email, city..."
            value={filter.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Branch-Wise Filter Dropdown */}
        <div className="relative min-w-[190px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <FaCodeBranch size={11} />
          </div>
          <select
            value={currentBranchType}
            onChange={(e) => setBranchType(e.target.value)}
            className="w-full appearance-none bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold pl-8 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
            title="Filter by enterprise hierarchy"
          >
            <option value="head_office">Head Offices (Primary Accounts)</option>
            <option value="child_branch">Child Branches Only</option>
            <option value="all_including_branches">All (Include Branches)</option>
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Parent Head Office Selector Dropdown (When headOffices provided) */}
        {headOffices.length > 0 && (
          <div className="relative min-w-[180px] max-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <FaBuilding size={11} />
            </div>
            <select
              value={currentParentId}
              onChange={(e) => setParentCompany(e.target.value)}
              className="w-full appearance-none bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold pl-8 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer truncate transition-all"
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
        <div className="relative min-w-[125px]">
          <select
            value={currentCity}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full appearance-none bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
          >
            <option value="all">All Locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Plan Filter */}
        <div className="relative min-w-[125px]">
          <select
            value={currentPlan}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, plan: e.target.value }))}
            className="w-full appearance-none bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
          >
            {PLAN_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[130px]">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full appearance-none bg-slate-50/70 hover:bg-slate-50/90 focus:bg-white border border-slate-200/90 text-slate-700 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
            title="Filter by registration date"
          />
        </div>

        {/* Export Action */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs shrink-0"
          >
            <FaDownload size={11} className="text-slate-500" />
            <span>Export CSV</span>
          </button>
        )}
      </div>
    </div>
  );
}
