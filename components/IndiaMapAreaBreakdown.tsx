"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  FaMapMarkerAlt,
  FaChartBar,
  FaUsers,
  FaBoxes,
  FaSearch,
  FaGlobeAsia,
  FaArrowUp,
  FaRupeeSign,
  FaCheckCircle,
  FaFilter,
} from "react-icons/fa";
import { INDIA_LOCATIONS, INDIA_VIEWBOX, type StatePath } from "@/app/dashboard/[role]/area/india-map-data";

export interface StateSummaryData {
  stateId: string;
  stateName: string;
  sales: number;
  salesReturns: number;
  purchase: number;
  customers: number | Set<string>;
  suppliers: number | Set<string>;
  outstanding: number;
  collection: number;
  payment: number;
  dispatch: number;
  topProduct?: string;
}

interface IndiaMapAreaBreakdownProps {
  mode: "sales" | "purchase";
  stateData: StateSummaryData[];
  selectedState: string | null;
  onSelectState: (stateId: string | null) => void;
  loading?: boolean;
}

function formatCurrency(val: number) {
  const v = Math.abs(val || 0);
  const sign = val < 0 ? "-" : "";
  if (v >= 1_00_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2)} Lac`;
  return `${sign}₹${v.toLocaleString("en-IN")}`;
}

function getPartyCount(val: number | Set<string> | undefined): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "size" in val) return (val as Set<string>).size;
  return 0;
}

export default function IndiaMapAreaBreakdown({
  mode,
  stateData,
  selectedState,
  onSelectState,
  loading = false,
}: IndiaMapAreaBreakdownProps) {
  const [hoveredState, setHoveredState] = useState<StateSummaryData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Map state ID to StateSummaryData
  const stateDataMap = useMemo(() => {
    const map = new Map<string, StateSummaryData>();
    stateData.forEach((s) => {
      if (s.stateId) {
        map.set(s.stateId.toLowerCase(), s);
      }
      if (s.stateName) {
        map.set(s.stateName.toLowerCase(), s);
      }
    });
    return map;
  }, [stateData]);

  // Determine max value for heatmap coloring
  const maxVal = useMemo(() => {
    let max = 0;
    stateData.forEach((s) => {
      const val = mode === "sales" ? s.sales : s.purchase;
      if (val > max) max = val;
    });
    return max || 1;
  }, [stateData, mode]);

  // Color generator for map states
  const getHeatColor = (stateId: string, stateName: string) => {
    const data = stateDataMap.get(stateId.toLowerCase()) || stateDataMap.get(stateName.toLowerCase());
    const isSelected = selectedState && (selectedState.toLowerCase() === stateId.toLowerCase() || selectedState.toLowerCase() === stateName.toLowerCase());

    if (isSelected) {
      return mode === "sales" ? "#6366F1" : "#F59E0B"; // Indigo for Sales, Amber for Purchase
    }

    if (!data) return "#E2E8F0";

    const val = mode === "sales" ? data.sales : data.purchase;
    if (!val || val <= 0) return "#CBD5E1";

    const ratio = val / maxVal;
    if (mode === "sales") {
      if (ratio >= 0.6) return "#4338CA"; // Dark Indigo
      if (ratio >= 0.3) return "#6366F1"; // Medium Indigo
      if (ratio >= 0.1) return "#818CF8"; // Light Indigo
      return "#C7D2FE"; // Pale Indigo
    } else {
      if (ratio >= 0.6) return "#D97706"; // Dark Amber
      if (ratio >= 0.3) return "#F59E0B"; // Medium Amber
      if (ratio >= 0.1) return "#FBBF24"; // Light Amber
      return "#FDE68A"; // Pale Amber
    }
  };

  const handleMouseMove = (e: React.MouseEvent, location: StatePath) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const data =
      stateDataMap.get(location.id.toLowerCase()) ||
      stateDataMap.get(location.name.toLowerCase()) || {
        stateId: location.id,
        stateName: location.name,
        sales: 0,
        salesReturns: 0,
        purchase: 0,
        customers: 0,
        suppliers: 0,
        outstanding: 0,
        collection: 0,
        payment: 0,
        dispatch: 0,
      };

    setHoveredState(data);
    setTooltipPos({ x: x + 15, y: y + 15 });
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
  };

  // Filter states list for side panel ranking
  const filteredStatesList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = INDIA_LOCATIONS.map((loc) => {
      const data = stateDataMap.get(loc.id.toLowerCase()) || stateDataMap.get(loc.name.toLowerCase());
      const val = data ? (mode === "sales" ? data.sales : data.purchase) : 0;
      const count = data ? getPartyCount(mode === "sales" ? data.customers : data.suppliers) : 0;

      return {
        id: loc.id,
        name: loc.name,
        value: val,
        count,
        topProduct: data?.topProduct || "N/A",
        outstanding: data?.outstanding || 0,
      };
    });

    list.sort((a, b) => b.value - a.value);

    if (!query) return list;
    return list.filter((item) => item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
  }, [stateDataMap, searchQuery, mode]);

  // Aggregate Total Metrics
  const totals = useMemo(() => {
    let grandVal = 0;
    let grandCount = 0;
    let activeStates = 0;

    stateData.forEach((s) => {
      const val = mode === "sales" ? s.sales : s.purchase;
      if (val > 0) {
        grandVal += val;
        activeStates++;
      }
      grandCount += getPartyCount(mode === "sales" ? s.customers : s.suppliers);
    });

    return { grandVal, grandCount, activeStates };
  }, [stateData, mode]);

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-900/90 dark:to-slate-950/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total {mode === "sales" ? "Sales Value" : "Purchase Inward"}</span>
            <div className={`p-1.5 rounded-lg ${mode === "sales" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"}`}>
              <FaRupeeSign size={12} />
            </div>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-800 dark:text-white mt-1">
            {formatCurrency(totals.grandVal)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <FaArrowUp size={8} /> Across All Regions
          </span>
        </div>

        <div className="bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-900/90 dark:to-slate-950/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Active States & UTs</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <FaGlobeAsia size={12} />
            </div>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-800 dark:text-white mt-1">
            {totals.activeStates} <span className="text-xs font-normal text-slate-400">/ 36</span>
          </p>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
            States with transactions
          </span>
        </div>

        <div className="bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-900/90 dark:to-slate-950/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total {mode === "sales" ? "Buyers" : "Suppliers"}</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <FaUsers size={12} />
            </div>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-800 dark:text-white mt-1">
            {totals.grandCount.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5">
            Linked accounts
          </span>
        </div>

        <div className="bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-900/90 dark:to-slate-950/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Top Performing State</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FaMapMarkerAlt size={12} />
            </div>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mt-1 truncate">
            {filteredStatesList[0]?.name || "N/A"}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium truncate mt-0.5 block">
            {formatCurrency(filteredStatesList[0]?.value || 0)}
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left) + Ranked Area List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* SVG INDIA MAP DISPLAY */}
        <div
          ref={mapContainerRef}
          className="lg:col-span-7 relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-4 rounded-3xl border border-indigo-500/20 shadow-2xl overflow-hidden min-h-[420px] flex flex-col justify-between"
        >
          {/* Map Controls Header */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                India State Analytics Heatmap
              </h4>
            </div>

            {selectedState && (
              <button
                onClick={() => onSelectState(null)}
                className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-[10px] sm:text-xs font-semibold transition flex items-center gap-1"
              >
                <FaFilter size={9} /> Reset Map Filter
              </button>
            )}
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full h-[360px] sm:h-[400px] flex items-center justify-center my-2">
            <svg
              viewBox={INDIA_VIEWBOX}
              className="w-full h-full max-h-[380px] drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
            >
              {INDIA_LOCATIONS.map((location) => {
                const isSelected =
                  selectedState &&
                  (selectedState.toLowerCase() === location.id.toLowerCase() ||
                    selectedState.toLowerCase() === location.name.toLowerCase());
                const strokeColor = isSelected ? "#FFFFFF" : "#475569";
                const strokeWidth = isSelected ? 2.5 : 0.8;
                const fill = getHeatColor(location.id, location.name);

                return (
                  <path
                    key={location.id}
                    d={location.path}
                    fill={fill}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="transition-all duration-200 cursor-pointer hover:opacity-90 hover:stroke-white hover:stroke-2"
                    onMouseMove={(e) => handleMouseMove(e, location)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (isSelected) {
                        onSelectState(null);
                      } else {
                        onSelectState(location.name);
                      }
                    }}
                  />
                );
              })}
            </svg>

            {/* Hover Floating Glass Tooltip */}
            {hoveredState && (
              <div
                style={{
                  left: `${Math.min(tooltipPos.x, 260)}px`,
                  top: `${Math.min(tooltipPos.y, 280)}px`,
                }}
                className="pointer-events-none absolute z-50 min-w-[200px] max-w-[240px] bg-slate-900/90 backdrop-blur-2xl border border-indigo-400/40 p-3 rounded-2xl shadow-2xl text-white text-xs animate-[fadeIn_0.15s_ease-out]"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                  <h5 className="font-bold text-indigo-300 text-sm">{hoveredState.stateName}</h5>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 uppercase font-mono">
                    {hoveredState.stateId}
                  </span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total {mode === "sales" ? "Sales" : "Purchases"}:</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(mode === "sales" ? hoveredState.sales : hoveredState.purchase)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{mode === "sales" ? "Customers" : "Suppliers"}:</span>
                    <span className="font-semibold text-sky-300">
                      {getPartyCount(mode === "sales" ? hoveredState.customers : hoveredState.suppliers)}
                    </span>
                  </div>
                  {hoveredState.topProduct && hoveredState.topProduct !== "N/A" && (
                    <div className="flex justify-between truncate">
                      <span className="text-slate-400">Top Product:</span>
                      <span className="font-medium text-amber-300 truncate max-w-[110px]">
                        {hoveredState.topProduct}
                      </span>
                    </div>
                  )}
                  {hoveredState.outstanding > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Outstanding:</span>
                      <span className="font-semibold text-rose-300">
                        {formatCurrency(hoveredState.outstanding)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 z-10">
            <span className="font-medium">Intensity Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${mode === "sales" ? "bg-[#C7D2FE]" : "bg-[#FDE68A]"}`} />
                Low
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${mode === "sales" ? "bg-[#6366F1]" : "bg-[#F59E0B]"}`} />
                Mid
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${mode === "sales" ? "bg-[#4338CA]" : "bg-[#D97706]"}`} />
                High
              </span>
            </div>
          </div>
        </div>

        {/* RANKED STATES SIDEBAR */}
        <div className="lg:col-span-5 bg-white/90 dark:bg-slate-900/90 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col max-h-[500px]">
          
          {/* Header & Search */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <FaChartBar className={mode === "sales" ? "text-indigo-500" : "text-amber-500"} />
              State Performance Ranking
            </h4>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {filteredStatesList.length} Regions
            </span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* States Scrollable List */}
          <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
            {filteredStatesList.map((st, idx) => {
              const share = totals.grandVal > 0 ? (st.value / totals.grandVal) * 100 : 0;
              const isSelected =
                selectedState &&
                (selectedState.toLowerCase() === st.id.toLowerCase() ||
                  selectedState.toLowerCase() === st.name.toLowerCase());

              return (
                <div
                  key={st.id}
                  onClick={() => onSelectState(isSelected ? null : st.name)}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? mode === "sales"
                        ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 shadow-sm"
                        : "bg-amber-50/90 dark:bg-amber-950/60 border-amber-500 shadow-sm"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {st.name}
                      </span>
                      {isSelected && (
                        <FaCheckCircle
                          className={mode === "sales" ? "text-indigo-600 text-xs" : "text-amber-600 text-xs"}
                        />
                      )}
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-white flex-shrink-0">
                      {formatCurrency(st.value)}
                    </span>
                  </div>

                  {/* Share Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex items-center">
                    <div
                      style={{ width: `${Math.min(100, Math.max(share, 2))}%` }}
                      className={`h-full rounded-full ${
                        mode === "sales" ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-gradient-to-r from-amber-500 to-orange-600"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>{st.count} {mode === "sales" ? "Customers" : "Suppliers"}</span>
                    <span>{share.toFixed(1)}% Share</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
