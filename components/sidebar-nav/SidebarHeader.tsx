"use client";

import React from "react";
import { SIDEBAR_TEXT } from "./constants";

interface SidebarHeaderProps {
  iconOnly: boolean;
  isDark: boolean;
  logoUrl?: string;
}

export default React.memo(function SidebarHeader({
  iconOnly,
  isDark,
  logoUrl,
}: SidebarHeaderProps) {
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
