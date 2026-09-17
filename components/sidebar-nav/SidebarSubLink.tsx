"use client";

import React from "react";
import Link from "next/link";
import { SidebarSubLinkProps } from "./types";

export default React.memo(function SidebarSubLink({
  href,
  icon,
  label,
  active,
  onNavigate,
}: SidebarSubLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`sidebar-sublink group/sub relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-200 ease-out no-underline select-none ${
        active
          ? "bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold shadow-2xs"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-medium hover:translate-x-1"
      }`}
      style={{ border: "none" }}
    >
      {/* Active left indicator pill */}
      {active && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      )}

      {/* Icon with subtle rounded chip container */}
      <span
        className={`w-6 h-6 flex items-center justify-center rounded-lg text-[13px] shrink-0 transition-colors duration-200 ${
          active
            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
            : "text-slate-400 dark:text-slate-500 group-hover/sub:text-slate-700 dark:group-hover/sub:text-slate-200"
        }`}
      >
        {icon}
      </span>

      {/* Clean text label */}
      <span className="leading-tight truncate flex-1 text-slate-700 dark:text-slate-300 group-hover/sub:text-slate-900 dark:group-hover/sub:text-white">
        {label}
      </span>
    </Link>
  );
});
