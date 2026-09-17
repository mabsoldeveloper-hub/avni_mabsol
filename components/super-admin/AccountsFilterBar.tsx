"use client";

import React from "react";
import { FaSearch, FaChevronDown, FaDownload } from "react-icons/fa";
import { STATUS_FILTER_OPTIONS, PLAN_FILTER_OPTIONS } from "./constants";
import { FilterState } from "./types";

interface AccountsFilterBarProps {
  // Option 1: Object-based filter state (recommended)
  filter?: FilterState;
  onFilterChange?: (updater: React.SetStateAction<FilterState>) => void;
  cities?: string[];

  // Option 2: Individual props for backwards compatibility
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
  planFilter?: string;
  onPlanChange?: (val: string) => void;
  cityFilter?: string;
  onCityChange?: (val: string) => void;
  availableCities?: string[];
  dateFilter?: string;
  onDateChange?: (val: string) => void;
  onExport?: () => void;
  className?: string;
}

export default function AccountsFilterBar({
  filter,
  onFilterChange,
  cities,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  planFilter,
  onPlanChange,
  cityFilter,
  onCityChange,
  availableCities,
  dateFilter,
  onDateChange,
  onExport,
  className = "",
}: AccountsFilterBarProps) {
  // Normalize values
  const currentSearch = filter ? filter.search : searchQuery || "";
  const currentStatus = filter ? filter.status : statusFilter || "all";
  const currentPlan = filter ? filter.plan : planFilter || "all";
  const currentCity = filter ? filter.city : cityFilter || "all";
  const currentDate = filter ? filter.date : dateFilter || "";
  const cityList = cities || availableCities || [];

  const handleSearch = (val: string) => {
    if (onFilterChange && filter) {
      onFilterChange((prev) => ({ ...prev, search: val }));
    } else if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleStatus = (val: string) => {
    if (onFilterChange && filter) {
      onFilterChange((prev) => ({ ...prev, status: val }));
    } else if (onStatusChange) {
      onStatusChange(val);
    }
  };

  const handlePlan = (val: string) => {
    if (onFilterChange && filter) {
      onFilterChange((prev) => ({ ...prev, plan: val }));
    } else if (onPlanChange) {
      onPlanChange(val);
    }
  };

  const handleCity = (val: string) => {
    if (onFilterChange && filter) {
      onFilterChange((prev) => ({ ...prev, city: val }));
    } else if (onCityChange) {
      onCityChange(val);
    }
  };

  const handleDate = (val: string) => {
    if (onFilterChange && filter) {
      onFilterChange((prev) => ({ ...prev, date: val }));
    } else if (onDateChange) {
      onDateChange(val);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
        <input
          type="text"
          placeholder="Search pharma company, GSTIN, city, or admin..."
          value={currentSearch}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>

      {/* Status Filter */}
      <div className="relative min-w-[125px]">
        <select
          value={currentStatus}
          onChange={(e) => handleStatus(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-4 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
      </div>

      {/* Plan Filter */}
      <div className="relative min-w-[120px]">
        <select
          value={currentPlan}
          onChange={(e) => handlePlan(e.target.value)}
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

      {/* City Filter */}
      <div className="relative min-w-[120px]">
        <select
          value={currentCity}
          onChange={(e) => handleCity(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-4 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
        >
          <option value="all">All Cities</option>
          {cityList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
      </div>

      {/* Date Filter */}
      <div className="relative min-w-[130px]">
        <input
          type="date"
          value={currentDate}
          onChange={(e) => handleDate(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
        />
      </div>

      {/* Export Action */}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          <FaDownload size={11} className="text-slate-500" />
          <span>Export</span>
        </button>
      )}
    </div>
  );
}
