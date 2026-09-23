"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { SidebarGroupProps } from "./types";
import { COLOR_MAP } from "./constants";
import SidebarSubLink from "./SidebarSubLink";
import { renderMenuIcon, getRoleBasedHref, isPathActive } from "@/lib/defaultMenuData";

export default React.memo(function SidebarGroup({
  id,
  icon,
  label,
  open,
  active,
  color = "indigo",
  subItems,
  iconOnly,
  pathname,
  currentVisuals,
  can,
  role,
  onToggle,
  onNavigate,
}: SidebarGroupProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  const [isHovered, setIsHovered] = useState(false);
  const [flyoutCoords, setFlyoutCoords] = useState<{ top: number; left: number } | null>(null);
  const groupRef = useRef<HTMLLIElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter subitems by permissions & visibility
  const visibleSubs = subItems.filter((sub) => {
    if (sub.isVisible === false) return false;
    if (sub.permission && !can(sub.permission)) return false;
    return true;
  });

  const updateFlyoutPosition = () => {
    if (groupRef.current && typeof window !== "undefined") {
      const rect = groupRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Realistic flyout height: Header ~40px, padding ~16px, each item ~38px
      const estimatedHeight = visibleSubs.length * 38 + 58;
      const maxHeightAllowed = vh - 24;
      const flyoutHeight = Math.min(estimatedHeight, maxHeightAllowed);

      const left = Math.min(rect.right + 8, vw - 260);
      let top = rect.top;

      // If flyout would overflow viewport bottom, shift it upward
      if (top + flyoutHeight > vh - 12) {
        top = Math.max(12, vh - flyoutHeight - 12);
      }

      setFlyoutCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    updateFlyoutPosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  if (visibleSubs.length === 0) return null;

  const renderedSubs = visibleSubs.map((sub) => {
    const targetHref = getRoleBasedHref(sub.href, role);
    const isSubActive = isPathActive(sub.href, pathname, role);

    return (
      <li key={sub.id || sub.href}>
        <SidebarSubLink
          href={targetHref}
          icon={renderMenuIcon(sub.icon)}
          label={sub.label}
          active={isSubActive}
          color={color}
          isDark={currentVisuals.isDark}
          onNavigate={() => {
            setIsHovered(false);
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (onNavigate) onNavigate();
          }}
        />
      </li>
    );
  });

  return (
    <li
      ref={groupRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full"
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className={`glass-nav-item relative flex items-center h-[40px] w-full rounded-xl transition-all duration-300 ease-out group select-none cursor-pointer overflow-hidden px-2.5 ${
          active
            ? "glass-nav-item-active font-semibold text-slate-900 dark:text-white"
            : "text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-white font-medium"
        }`}
      >
        {active && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${c.bar} transition-all duration-300`}
          />
        )}
        <span
          className={`relative flex items-center justify-center w-8 h-8 shrink-0 rounded-xl text-[14px] overflow-hidden transition-all duration-300 ${
            active
              ? "icon-chip-active text-white scale-105"
              : `glass-icon-chip ${c.iconText} group-hover:scale-105`
          }`}
          style={
            active
              ? {
                  background: `linear-gradient(155deg, ${c.glow} 0%, ${c.glowDark} 100%)`,
                  boxShadow: `0 3px 10px -1px ${c.glow}80, inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.15)`,
                }
              : undefined
          }
        >
          {active && (
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 to-transparent" />
          )}
          <span className="relative">{icon}</span>
        </span>
        <span
          className="sidebar-label whitespace-nowrap overflow-hidden transition-all duration-300 ease-out flex-1 text-left font-medium"
          style={{
            opacity: iconOnly ? 0 : 1,
            maxWidth: iconOnly ? 0 : "170px",
            marginLeft: iconOnly ? 0 : "10px",
            transform: iconOnly ? "translateX(-8px)" : "translateX(0)",
            pointerEvents: iconOnly ? "none" : "auto",
          }}
        >
          {label}
        </span>
        <FaChevronDown
          size={9}
          className="text-slate-400 group-hover:text-slate-600 dark:text-white/80 dark:group-hover:text-white transition-all duration-300 ease-out shrink-0"
          style={{
            opacity: iconOnly ? 0 : 1,
            maxWidth: iconOnly ? 0 : "12px",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            pointerEvents: iconOnly ? "none" : "auto",
          }}
        />
      </button>

      {/* Inline accordion (expanded sidebar) */}
      <div className={`sidebar-submenu ${open && !iconOnly ? "open" : ""}`}>
        <div className="sidebar-submenu-inner">
          <ul className="flex flex-col p-0 m-0 list-none gap-0.5 ml-3 pl-2 border-l-2 border-slate-200/80 dark:border-slate-700/80 my-0.5">
            {renderedSubs}
          </ul>
        </div>
      </div>

      {/* Hover flyout (collapsed icon-only sidebar) */}
      {iconOnly && isHovered && flyoutCoords && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[9999] flex flex-col"
          style={{
            top: `${flyoutCoords.top}px`,
            left: `${flyoutCoords.left}px`,
            width: "236px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: `calc(100vh - ${flyoutCoords.top}px - 12px)`,
          }}
        >
          {/* Bridge to prevent hover loss between sidebar button and flyout popup */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: "-16px", width: "20px" }}
          />

          <div
            className="flex flex-col rounded-2xl p-2 shadow-2xl transition-all duration-150 ease-out animate-in fade-in zoom-in-95 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-h-full overflow-hidden"
          >
            <div className="px-2.5 py-1.5 mb-1 text-[11.5px] font-bold border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-800 dark:text-white shrink-0">
              <span className="truncate pr-2">{label}</span>
              <span className="text-[10px] font-medium text-slate-400">
                {visibleSubs.length} items
              </span>
            </div>

            <ul
              className="flex flex-col p-0 m-0 list-none gap-0.5 overflow-y-auto sidebar-scroll pr-0.5 flex-1 min-h-0"
              style={{
                scrollbarWidth: "thin",
              }}
            >
              {renderedSubs}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
});
