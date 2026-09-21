"use client";

import React, { useState, useEffect } from "react";
import { FaCalendarAlt, FaClock } from "react-icons/fa";

interface DashboardLiveClockProps {
  isDark?: boolean;
  accentColor?: "cyan" | "indigo" | "emerald";
}

export default function DashboardLiveClock({
  isDark = true,
  accentColor = "indigo",
}: DashboardLiveClockProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) return null;

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const calendarIconColor =
    accentColor === "cyan"
      ? "text-cyan-300"
      : isDark
      ? "text-indigo-300"
      : "text-orange-500";

  const dateTextColor =
    accentColor === "cyan"
      ? "text-cyan-200"
      : isDark
      ? "text-indigo-200"
      : "text-slate-700";

  return (
    <div
      className={`flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-xl border text-[11px] sm:text-xs shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default ${
        isDark
          ? "bg-white/10 hover:bg-white/15 border-white/20 text-white"
          : "bg-white/90 hover:bg-white border-slate-200/80 text-slate-800"
      }`}
    >
      <div className={`flex items-center gap-1 sm:gap-1.5 ${dateTextColor}`}>
        <FaCalendarAlt size={10.5} className={`${calendarIconColor} flex-shrink-0`} />
        <span className="font-bold text-[10.5px] sm:text-[11px] whitespace-nowrap">
          {formattedDate}
        </span>
      </div>
      <div className={`w-[1px] h-3 sm:h-3.5 ${isDark ? "bg-white/20" : "bg-slate-200"}`} />
      <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 font-mono font-extrabold tracking-wider">
        <FaClock size={10.5} className="text-emerald-400 animate-pulse flex-shrink-0" />
        <span className="text-[10.5px] sm:text-[11px] whitespace-nowrap">{formattedTime}</span>
      </div>
    </div>
  );
}
