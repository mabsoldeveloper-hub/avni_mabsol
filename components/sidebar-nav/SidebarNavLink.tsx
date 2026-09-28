"use client";

import React from "react";
import Link from "next/link";
import { COLOR_MAP } from "./constants";
import { SidebarNavLinkProps } from "./types";

export default React.memo(function SidebarNavLink({
  href,
  icon,
  label,
  active,
  color = "indigo",
  iconOnly,
  badge,
  customActiveStyle,
  onNavigate,
}: SidebarNavLinkProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;

  if (customActiveStyle) {
    return (
      <Link
        href={href}
        title={iconOnly ? label : undefined}
        onClick={onNavigate}
        className={`relative flex items-center h-[42px] w-full rounded-xl transition-all duration-200 group no-underline select-none px-3 ${
          active
            ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25"
            : "text-white hover:text-white hover:bg-white/10 font-medium"
        }`}
      >
        <span
          className="flex items-center justify-center w-7 h-7 shrink-0 text-[14px] text-white"
        >
          {icon}
        </span>
        <span
          className="whitespace-nowrap overflow-hidden transition-all duration-200 flex-1 text-left text-xs font-medium text-white"
          style={{
            opacity: iconOnly ? 0 : 1,
            maxWidth: iconOnly ? 0 : "180px",
            marginLeft: iconOnly ? 0 : "8px",
            display: iconOnly ? "none" : "block",
          }}
        >
          {label}
        </span>
        {badge && !iconOnly && (
          <span className="ml-auto text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      title={iconOnly ? label : undefined}
      onClick={onNavigate}
      className={`glass-nav-item relative flex items-center h-[40px] w-full rounded-xl transition-all duration-300 ease-out group no-underline select-none overflow-hidden px-2.5 ${
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
          maxWidth: iconOnly ? 0 : "180px",
          marginLeft: iconOnly ? 0 : "10px",
          transform: iconOnly ? "translateX(-8px)" : "translateX(0)",
          pointerEvents: iconOnly ? "none" : "auto",
        }}
      >
        {label}
      </span>
      {badge && !iconOnly && (
        <span className="ml-auto text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
          {badge}
        </span>
      )}
    </Link>
  );
});
