"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaPalette, FaPowerOff } from "react-icons/fa";
import { SidebarThemeId, SidebarVisuals } from "./types";
import SidebarThemePopover from "./SidebarThemePopover";

interface SidebarFooterProps {
  iconOnly: boolean;
  user: any;
  companyName?: string;
  currentVisuals: SidebarVisuals;
  sidebarTheme: SidebarThemeId;
  sidebarCustomHex: string;
  sidebarCustomTextColor?: string;
  onSelectSidebarTheme: (themeId: SidebarThemeId) => void;
  onSidebarCustomColorChange: (hex: string) => void;
  onSidebarCustomTextColorChange: (hex: string) => void;
}

export default React.memo(function SidebarFooter({
  iconOnly,
  user,
  currentVisuals,
  sidebarTheme,
  sidebarCustomHex,
  sidebarCustomTextColor = "",
  onSelectSidebarTheme,
  onSidebarCustomColorChange,
  onSidebarCustomTextColorChange,
}: SidebarFooterProps) {
  const router = useRouter();
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const colorPickerBtnRef = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (footerRef.current && !footerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker]);

  const handleTogglePicker = () => {
    if (!showColorPicker && colorPickerBtnRef.current && typeof window !== "undefined") {
      const rect = colorPickerBtnRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 992;
      const popupWidth = Math.min(384, window.innerWidth - 16);
      const popupHeight = Math.min(window.innerHeight * 0.82, 640);
      let left: number;
      let top = rect.bottom - popupHeight;

      if (isMobile) {
        left = Math.max(8, (window.innerWidth - popupWidth) / 2);
      } else {
        left = rect.right + 10;
        if (left + popupWidth > window.innerWidth - 8) {
          left = rect.left - popupWidth - 10;
        }
      }

      if (top < 8) top = 8;
      if (top + popupHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - popupHeight - 8);
      }
      if (left < 8) left = 8;
      if (left + popupWidth > window.innerWidth - 8) {
        left = window.innerWidth - popupWidth - 8;
      }

      setPickerPos({ top, left });
    }
    setShowColorPicker((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("mabsol_user");
      localStorage.removeItem("mabsol_permissions");
    }
    router.push("/login");
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = user?.email || "admin@mabsol.com";
  const roleName = user?.roleType || user?.role || user?.roleId?.roleName || "Admin";
  const initials = (displayName.slice(0, 2) || "AD").toUpperCase();

  return (
    <div ref={footerRef} className="p-2 shrink-0 border-t border-slate-100/90 dark:border-slate-800/80">
      {/* Expanded View */}
      <div
        className="transition-all duration-300 ease-out flex flex-col gap-1.5"
        style={{
          opacity: iconOnly ? 0 : 1,
          maxHeight: iconOnly ? "0px" : "130px",
          transform: iconOnly ? "translateY(8px) scale(0.96)" : "translateY(0) scale(1)",
          pointerEvents: iconOnly ? "none" : "auto",
          overflow: "hidden",
        }}
      >
        {/* Separate Theme Customizer Row */}
        <button
          ref={!iconOnly ? colorPickerBtnRef : undefined}
          type="button"
          onClick={handleTogglePicker}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium transition-all group cursor-pointer shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10.5px] group-hover:scale-110 transition-transform">
              <FaPalette />
            </span>
            <span>Customize Theme</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-600">
            Palette
          </span>
        </button>

        {/* Clean User Profile Card */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-[10.5px] shadow-xs">
                {initials}
              </span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">
                {displayEmail}
              </div>
              <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                Role: <span className="text-slate-800 dark:text-slate-200 font-bold">{roleName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Logout"
          >
            <FaPowerOff size={10} />
          </button>
        </div>
      </div>

      {/* Collapsed View */}
      <div
        className="transition-all duration-300 ease-out rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-xs flex flex-col items-center gap-2"
        style={{
          opacity: iconOnly ? 1 : 0,
          maxHeight: iconOnly ? "140px" : "0px",
          transform: iconOnly ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)",
          pointerEvents: iconOnly ? "auto" : "none",
          overflow: "hidden",
        }}
      >
        {/* Avatar */}
        <div className="relative">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs shadow-xs"
            title={`${displayName} (${roleName})`}
          >
            {initials}
          </span>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </div>

        {/* Standalone Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
          title="Logout"
        >
          <FaPowerOff size={10} />
        </button>

        <div className="w-5 h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

        {/* Separated Custom Theme */}
        <button
          ref={iconOnly ? colorPickerBtnRef : undefined}
          type="button"
          onClick={handleTogglePicker}
          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          title="Sidebar Themes"
        >
          <FaPalette size={10} />
        </button>
      </div>

      {showColorPicker && pickerPos && (
        <SidebarThemePopover
          sidebarTheme={sidebarTheme}
          sidebarCustomHex={sidebarCustomHex}
          sidebarCustomTextColor={sidebarCustomTextColor}
          pickerPos={pickerPos}
          onSelectTheme={onSelectSidebarTheme}
          onCustomColorChange={onSidebarCustomColorChange}
          onCustomTextColorChange={onSidebarCustomTextColorChange}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
});
