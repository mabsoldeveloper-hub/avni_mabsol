"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import {
  SYNC_SYSTEMS,
  SyncSystemConfig,
  getSyncSystem,
} from "./syncSystems";

export type { SyncSystemConfig };
export { SYNC_SYSTEMS, getSyncSystem };

interface SyncSystemSelectorProps {
  currentSystemId?: string;
  onSystemChange?: (system: SyncSystemConfig) => void;
}

export default function SyncSystemSelector({
  currentSystemId = "mabsolcrm",
  onSystemChange,
}: SyncSystemSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSystem =
    SYNC_SYSTEMS.find((s) => s.id === currentSystemId) || SYNC_SYSTEMS[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (system: SyncSystemConfig) => {
    setIsOpen(false);
    if (onSystemChange) {
      onSystemChange(system);
    }

    // Preserve existing query params like range, startDate, endDate
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("source", system.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Small & Simple Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border bg-white shadow-2xs hover:bg-slate-50 transition-all cursor-pointer ${
          isOpen
            ? "border-slate-400 ring-1 ring-slate-300 text-slate-900"
            : "border-slate-200 text-slate-800"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-slate-400 text-[11px] font-normal">Sync:</span>
        <span className="font-semibold text-slate-900 truncate max-w-[160px]">
          {selectedSystem.name}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? "rotate-180 text-slate-600" : ""
          }`}
        />
      </button>

      {/* Small & Simple Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-lg z-50 py-1 overflow-hidden"
          role="menu"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Select Sync Target
          </div>

          <div className="py-1">
            {SYNC_SYSTEMS.map((system) => {
              const isSelected = system.id === selectedSystem.id;

              return (
                <button
                  key={system.id}
                  type="button"
                  onClick={() => handleSelect(system)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-950 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 font-normal"
                  }`}
                  role="menuitem"
                >
                  <span className="truncate">{system.name}</span>
                  {isSelected && (
                    <Check size={14} className="text-slate-900 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
