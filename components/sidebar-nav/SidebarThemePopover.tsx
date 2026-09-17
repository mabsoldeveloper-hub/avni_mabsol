"use client";

import React, { useRef, useEffect } from "react";
import { FaPalette, FaUndoAlt, FaCheck } from "react-icons/fa";
import { SidebarThemeId } from "./types";
import { SIDEBAR_PRESET_THEMES, SIDEBAR_TEXT } from "./constants";

interface SidebarThemePopoverProps {
  sidebarTheme: SidebarThemeId;
  sidebarCustomHex: string;
  sidebarCustomTextColor?: string;
  pickerPos: { top: number; left: number };
  onSelectTheme: (id: SidebarThemeId) => void;
  onCustomColorChange: (hex: string) => void;
  onCustomTextColorChange: (hex: string) => void;
  onClose: () => void;
}

export default React.memo(function SidebarThemePopover({
  sidebarTheme,
  sidebarCustomHex,
  sidebarCustomTextColor = "",
  pickerPos,
  onSelectTheme,
  onCustomColorChange,
  onCustomTextColorChange,
  onClose,
}: SidebarThemePopoverProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: pickerPos.top,
        left: pickerPos.left,
        zIndex: 9999,
        width: Math.min(384, typeof window !== "undefined" ? window.innerWidth - 16 : 384),
      }}
      className="max-h-[82vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-3.5 sm:p-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <FaPalette size={12} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">
              {SIDEBAR_TEXT.themeTitle}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {SIDEBAR_TEXT.themeSubtitle}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelectTheme("default")}
          className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
        >
          <FaUndoAlt size={9} /> {SIDEBAR_TEXT.resetTheme}
        </button>
      </div>

      {/* Blue Shaders */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
          {SIDEBAR_TEXT.blueShadesTitle}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
          {SIDEBAR_TEXT.blueShadesCount}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "blue").map((theme) => {
          const isSelected = sidebarTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/40 scale-102"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-50/50 hover:border-sky-300"
              }`}
              title={theme.name}
            >
              <div
                className="w-5 h-5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                style={{ background: theme.color }}
              >
                {isSelected && <FaCheck size={8} className="text-white drop-shadow-sm" />}
              </div>
              <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Other Palettes */}
      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {SIDEBAR_TEXT.otherPalettesTitle}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3.5">
        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "other").map((theme) => {
          const isSelected = sidebarTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/30 scale-102"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 hover:border-slate-300"
              }`}
              title={theme.name}
            >
              <div
                className="w-4.5 h-4.5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                style={{ background: theme.color }}
              >
                {isSelected && <FaCheck size={7.5} className="text-white drop-shadow-sm" />}
              </div>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Color Section */}
      <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>{SIDEBAR_TEXT.customColorTitle}</span>
          {sidebarTheme === "custom" && (
            <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
              {SIDEBAR_TEXT.customActiveBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer">
            <input
              type="color"
              value={sidebarCustomHex}
              onChange={(e) => onCustomColorChange(e.target.value)}
              className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
              title="Pick custom sidebar color"
            />
          </div>
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <span className="text-slate-400 text-xs font-mono select-none">#</span>
            <input
              type="text"
              value={sidebarCustomHex.replace("#", "")}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                if (raw.length === 6) {
                  onCustomColorChange("#" + raw);
                }
              }}
              placeholder="001F54"
              className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
              maxLength={6}
            />
          </div>
          <button
            type="button"
            onClick={() => onCustomColorChange(sidebarCustomHex)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              sidebarTheme === "custom"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
            }`}
          >
            {sidebarTheme === "custom" ? SIDEBAR_TEXT.appliedButton : SIDEBAR_TEXT.applyButton}
          </button>
        </div>
      </div>

      {/* Custom Text Color Section */}
      <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Custom Text Color</span>
          {sidebarCustomTextColor ? (
            <button
              type="button"
              onClick={() => onCustomTextColorChange("")}
              className="text-[9.5px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
            >
              Reset Default
            </button>
          ) : (
            <span className="text-[9.5px] text-slate-400 font-medium">Default</span>
          )}
        </div>
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer">
            <input
              type="color"
              value={sidebarCustomTextColor || "#334155"}
              onChange={(e) => onCustomTextColorChange(e.target.value)}
              className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
              title="Pick custom text color"
            />
          </div>
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <span className="text-slate-400 text-xs font-mono select-none">#</span>
            <input
              type="text"
              value={(sidebarCustomTextColor || "334155").replace("#", "")}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                if (raw.length === 6) {
                  onCustomTextColorChange("#" + raw);
                }
              }}
              placeholder="334155"
              className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
              maxLength={6}
            />
          </div>
          <button
            type="button"
            onClick={() => onCustomTextColorChange(sidebarCustomTextColor || "#334155")}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
});
