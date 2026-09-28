"use client";
import React, { useState, useMemo, useRef } from "react";
import {
  FaSearch,
  FaFilter,
  FaArrowUp,
  FaMapMarkerAlt,
  FaUsers,
  FaRupeeSign,
  FaGlobeAsia,
} from "react-icons/fa";
import {
  INDIA_LOCATIONS,
  INDIA_VIEWBOX,
  STATE_NAME_TO_MAP_ID,
} from "@/app/dashboard/[role]/area/india-map-data";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

interface StateData {
  state: string;
  salesValue: number;
  collectedValue: number;
  count: number;
  efficiency: number;
}

interface IndiaMapProps {
  stateData: StateData[];
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
  loading?: boolean;
}

export default function SalesVsCollectionIndiaMap({
  stateData,
  selectedState,
  onSelectState,
  loading = false,
}: IndiaMapProps) {
  const [hoveredState, setHoveredState] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<HTMLDivElement | null>(null);

  const stateMap = useMemo(() => {
    const map = new Map<string, StateData>();
    stateData.forEach((s) => {
      if (s.state) {
        const lower = s.state.toLowerCase().trim();
        map.set(lower, s);
        map.set(lower.replace(/\s+/g, "_"), s);
        const mapId = STATE_NAME_TO_MAP_ID[s.state];
        if (mapId) {
          map.set(mapId.toLowerCase().trim(), s);
        }
      }
    });
    return map;
  }, [stateData]);

  const getStateColor = (locId: string, locName: string) => {
    const data =
      stateMap.get(locId.toLowerCase().trim()) ||
      stateMap.get(locName.toLowerCase().trim()) ||
      stateMap.get(locName.toLowerCase().replace(/\s+/g, "_"));
    const isSelected =
      selectedState &&
      (selectedState.toLowerCase() === locId.toLowerCase() ||
        selectedState.toLowerCase() === locName.toLowerCase());

    if (isSelected) return "#6366f1";
    if (!data || data.salesValue === 0) return "#cbd5e1"; // slate-300 for no data in light mode
    const eff = data.efficiency || 0;
    if (eff >= 90) return "#059669";
    if (eff >= 75) return "#10b981";
    if (eff >= 60) return "#0ea5e9";
    if (eff >= 45) return "#6366f1";
    if (eff >= 30) return "#f59e0b";
    if (eff > 0) return "#f43f5e";
    return "#cbd5e1";
  };

  const handleMouseMove = (e: React.MouseEvent, location: any) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const data =
      stateMap.get(location.id.toLowerCase()) ||
      stateMap.get(location.name.toLowerCase()) || {
        state: location.name,
        salesValue: 0,
        collectedValue: 0,
        count: 0,
        efficiency: 0,
      };
    setHoveredState({ ...data, stateName: location.name });
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15,
    });
  };

  const rankedStates = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const list = INDIA_LOCATIONS.map((loc) => {
      const data =
        stateMap.get(loc.id.toLowerCase()) ||
        stateMap.get(loc.name.toLowerCase());
      return {
        id: loc.id,
        name: loc.name,
        salesValue: data?.salesValue || 0,
        collectedValue: data?.collectedValue || 0,
        efficiency: data?.efficiency || 0,
        count: data?.count || 0,
      };
    }).sort((a, b) => b.salesValue - a.salesValue);
    if (!query) return list;
    return list.filter((s) => s.name.toLowerCase().includes(query));
  }, [stateMap, searchQuery]);

  const totals = useMemo(
    () => ({
      totalSales: stateData.reduce((a, s) => a + s.salesValue, 0),
      totalCollected: stateData.reduce((a, s) => a + s.collectedValue, 0),
      activeStates: stateData.filter((s) => s.salesValue > 0).length,
      topState: rankedStates[0],
    }),
    [stateData, rankedStates]
  );

  return (
    <div className="space-y-4">
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Sales Invoiced",
            value: fmt(totals.totalSales),
            icon: <FaRupeeSign size={12} />,
            color: "indigo",
            badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
          },
          {
            label: "Total Collections",
            value: fmt(totals.totalCollected),
            icon: <FaArrowUp size={12} />,
            color: "emerald",
            badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
          },
          {
            label: "Active Territories",
            value: `${totals.activeStates} / 36 States`,
            icon: <FaGlobeAsia size={12} />,
            color: "sky",
            badge: "bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
          },
          {
            label: "Leading State",
            value: totals.topState?.name || "N/A",
            icon: <FaMapMarkerAlt size={12} />,
            color: "amber",
            badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
          },
        ].map((c, i) => (
          <div
            key={i}
            className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-[10.5px] font-bold uppercase tracking-wider truncate">
                {c.label}
              </p>
              <p className="text-slate-900 dark:text-slate-50 text-sm font-black mt-0.5 truncate">
                {c.value}
              </p>
            </div>
            <div className={`p-2 rounded-xl ${c.badge} shrink-0`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Map + Rankings Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Map Container */}
        <div
          ref={mapRef}
          className="lg:col-span-7 relative bg-slate-50/90 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2 z-10 relative">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider">
                Geographic Realization
              </h4>
            </div>
            {selectedState && (
              <button
                onClick={() => onSelectState(null)}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <FaFilter size={9} />
                <span>Reset ({selectedState})</span>
              </button>
            )}
          </div>

          <div className="relative w-full h-[340px] sm:h-[390px] flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse flex items-center justify-center">
                <span className="text-slate-400 text-xs font-medium">
                  Loading map geography...
                </span>
              </div>
            ) : (
              <svg
                viewBox={INDIA_VIEWBOX}
                className="w-full h-full max-h-[390px] drop-shadow-sm"
              >
                {INDIA_LOCATIONS.map((loc) => {
                  const isSelected =
                    selectedState &&
                    (selectedState.toLowerCase() === loc.id.toLowerCase() ||
                      selectedState.toLowerCase() === loc.name.toLowerCase());
                  return (
                    <path
                      key={loc.id}
                      d={loc.path}
                      fill={getStateColor(loc.id, loc.name)}
                      stroke={isSelected ? "#0f172a" : "#ffffff"}
                      strokeWidth={isSelected ? 2 : 0.6}
                      className="transition-all duration-200 cursor-pointer hover:opacity-85 hover:stroke-indigo-600 hover:stroke-2"
                      onMouseMove={(e) => handleMouseMove(e, loc)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() =>
                        onSelectState(isSelected ? null : loc.name)
                      }
                    />
                  );
                })}
              </svg>
            )}

            {/* Hover Tooltip */}
            {hoveredState && (
              <div
                style={{
                  left: `${Math.min(tooltipPos.x, 270)}px`,
                  top: `${Math.min(tooltipPos.y, 290)}px`,
                }}
                className="pointer-events-none absolute z-50 min-w-[200px] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 p-3 rounded-2xl shadow-2xl text-xs text-white"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                  <h5 className="font-bold text-white text-sm">
                    {hoveredState.stateName || hoveredState.state}
                  </h5>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {(hoveredState.efficiency || 0).toFixed(1)}% Realization
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sales Invoiced:</span>
                    <span className="font-bold text-indigo-300">
                      {fmt(hoveredState.salesValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collections:</span>
                    <span className="font-bold text-emerald-300">
                      {fmt(hoveredState.collectedValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Accounts:</span>
                    <span className="font-bold text-sky-300">
                      {hoveredState.count || 0} customers
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Efficiency Color Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400 font-semibold">
            <span>Realization:</span>
            {[
              { color: "#059669", label: "≥90%" },
              { color: "#10b981", label: "75–89%" },
              { color: "#0ea5e9", label: "60–74%" },
              { color: "#6366f1", label: "45–59%" },
              { color: "#f59e0b", label: "30–44%" },
              { color: "#f43f5e", label: "<30%" },
              { color: "#cbd5e1", label: "No Orders" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                  style={{ background: l.color }}
                />
                <span>{l.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* State Rankings Leaderboard */}
        <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h4 className="text-slate-900 dark:text-slate-100 text-sm font-extrabold flex items-center gap-2">
                <span>🏆 State Performance Leaderboard</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Ranked by gross sales order volume
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {rankedStates.length} Regions
            </span>
          </div>

          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
            {rankedStates.map((st, idx) => {
              const isSelected =
                selectedState &&
                (selectedState.toLowerCase() === st.id.toLowerCase() ||
                  selectedState.toLowerCase() === st.name.toLowerCase());
              const share =
                totals.totalSales > 0
                  ? (st.salesValue / totals.totalSales) * 100
                  : 0;
              return (
                <div
                  key={st.id}
                  onClick={() =>
                    onSelectState(isSelected ? null : st.name)
                  }
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/50 shadow-sm"
                      : "bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          idx < 3
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {st.name}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-slate-50 shrink-0">
                      {fmt(st.salesValue)}
                    </span>
                  </div>

                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(st.collectedValue)} collected
                    </span>
                    <span>
                      {st.efficiency.toFixed(1)}% Realization • {share.toFixed(1)}% share
                    </span>
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
