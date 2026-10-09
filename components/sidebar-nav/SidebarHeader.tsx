"use client";

import React from "react";
import { SIDEBAR_TEXT } from "./constants";

interface SidebarHeaderProps {
  iconOnly: boolean;
  isDark: boolean;
  logoUrl?: string;
  isSuperAdmin?: boolean;
}

export default React.memo(function SidebarHeader({
  iconOnly,
  isDark,
  logoUrl,
  isSuperAdmin,
}: SidebarHeaderProps) {
  if (isSuperAdmin) {
    return (
      <div
        className={`relative flex items-center shrink-0 ${
          iconOnly ? "justify-center px-1" : "px-4"
        } h-[68px] border-0 bg-white transition-all duration-300`}
      >
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 select-none">
            M
          </div>
          {!iconOnly && (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-black text-slate-900 tracking-wider leading-none">
                  MABSOL
                </span>
                <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                  PRO
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                Super Admin Console
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const displayLogo = logoUrl || SIDEBAR_TEXT.defaultLogo;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${
        iconOnly ? "px-1" : "px-3"
      } h-[68px] border-b ${isDark ? "border-white/10" : "border-slate-100/90"} transition-all duration-300`}
    >
      <img
        src={displayLogo}
        alt="logo"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = SIDEBAR_TEXT.defaultLogo;
        }}
        className={`${
          iconOnly
            ? "w-11 h-11 rounded-xl object-contain shadow-2xs"
            : "max-h-[50px] max-w-[210px] w-auto object-contain"
        } transition-all duration-300 hover:scale-105`}
      />
    </div>
  );
});
