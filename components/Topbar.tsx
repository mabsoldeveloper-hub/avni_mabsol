"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, List, PersonCircle, Trash, CalendarEvent, Search, Building, Command, ArrowsFullscreen, FullscreenExit, X } from "react-bootstrap-icons";

import { useUser } from "@/context/UserContext";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import LogoutButton from "./LogoutButton";
import GlobalSearchModal from "./GlobalSearchModal";

export default function Topbar({
  collapsed,
  setCollapsed,
  mobile,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobile: boolean;
}) {
  const { user } = useUser();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const { fyList, selectedFY, setSelectedFY } = useFinancialYear();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [profileImgError, setProfileImgError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    if (
      !doc.fullscreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.msFullscreenElement
    ) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => console.warn("Fullscreen request error:", err));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => console.warn("Fullscreen exit error:", err));
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    setProfileImgError(false);
  }, [user?.profilePhoto]);

  const getUserInitials = (name?: string) => {
    if (!name || !name.trim()) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 1).toUpperCase() || "U";
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    const raw = user?.companyId as any;

    if (raw && typeof raw === "object" && raw.companyName) {
      setCompanyName(raw.companyName);
      return;
    }

    const rawId = typeof raw === "string" ? raw : raw?._id;
    if (!rawId) return;

    fetch("/api/company-master")
      .then((res) => res.json())
      .then((companies: any[]) => {
        const match = companies?.find((c) => c._id === rawId);
        if (match?.companyName) setCompanyName(match.companyName);
      })
      .catch(() => { });
  }, [user]);


  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.notifications)) {
          setLiveNotifications(data.notifications);
        }
      })
      .catch((err) => console.error("Notifications fetch error:", err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = liveNotifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).then(() => fetchNotifications());
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setLiveNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const clearAllNotifications = async () => {
    setLiveNotifications([]);
    try {
      await fetch("/api/notifications?clearAll=true", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const [activeCat, setActiveCat] = useState<string>("ALL");

  const filteredNotifications = liveNotifications.filter((n) => {
    if (activeCat === "ALL") return true;
    return (n.category || "SYSTEM").toUpperCase() === activeCat;
  });

  const handleNotifClick = (n: any) => {
    if (!n.isRead && n._id) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: n._id }),
      }).then(() => fetchNotifications());
    }
    setNotifOpen(false);
    if (n.actionUrl) {
      window.location.href = n.actionUrl;
    }
  };

  return (
    <div
      style={{ zIndex: searchOpen ? 1065 : 1020 }}
      className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 shadow-xs sticky top-0 transition-all"
    >
      {/* LEFT: Sidebar Toggle & Company/FY Selectors */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
        {/* Mobile-only toggle button (Desktop toggle is integrated on sidebar seam) */}
        {mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="topbar-circle-btn flex items-center justify-center w-8.5 h-8.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shrink-0 cursor-pointer shadow-xs"
            style={{ borderRadius: "9999px" }}
          >
            <List size={16} />
          </button>
        )}

        {/* DESKTOP COMPANY & FY SELECTORS */}
        {!mobile ? (
          <div className="flex items-center gap-2 min-w-0">
            {/* COMPANY SELECTOR DROPDOWN */}
            <div className="relative inline-flex items-center">
              <div className="absolute left-3 text-blue-600 pointer-events-none">
                <Building size={13} />
              </div>
              <select
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c._id === e.target.value);
                  if (comp) setSelectedCompany(comp);
                }}
                className="topbar-pill-btn pl-8 pr-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-[12.5px] font-bold border border-blue-200 dark:border-blue-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition-all max-w-[210px] lg:max-w-[240px] truncate"
                style={{ borderRadius: "9999px" }}
                title="Select Active Company"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id} className="text-slate-900 font-medium">
                    {c.companyName} ({c.companyCode || "Code"})
                  </option>
                ))}
              </select>
            </div>

            {/* FINANCIAL YEAR SELECTOR DROPDOWN */}
            <div className="relative inline-flex items-center">
              <div className="absolute left-3 text-emerald-600 pointer-events-none">
                <CalendarEvent size={13} />
              </div>
              <select
                value={selectedFY?._id || ""}
                onChange={(e) => {
                  const fy = fyList.find((x) => x._id === e.target.value);
                  if (fy) setSelectedFY(fy);
                }}
                className="topbar-pill-btn pl-8 pr-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[12.5px] font-bold border border-emerald-200 dark:border-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition-all max-w-[210px] lg:max-w-[240px] truncate"
                style={{ borderRadius: "9999px" }}
                title="Select Financial Year"
              >
                {fyList.map((fy) => (
                  <option key={fy._id} value={fy._id} className="text-slate-900 font-medium">
                    {fy.isAll
                      ? fy.fyName
                      : fy.fyCode
                        ? `${fy.fyCode} - FY ${fy.fyName}`
                        : `FY ${fy.fyName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* MOBILE COMPACT COMPANY & FY SELECTORS */
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Mobile Company Select */}
            <div className="relative inline-flex items-center flex-1 min-w-0 max-w-[130px] xs:max-w-[150px]">
              <div className="absolute left-2 text-blue-600 pointer-events-none">
                <Building size={11} />
              </div>
              <select
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c._id === e.target.value);
                  if (comp) setSelectedCompany(comp);
                }}
                className="topbar-pill-btn w-full pl-6 pr-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 text-[10px] font-bold border border-blue-200 dark:border-blue-800/60 focus:outline-none cursor-pointer truncate"
                style={{ borderRadius: "9999px" }}
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id} className="text-slate-900">
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile FY Select */}
            <div className="relative inline-flex items-center flex-1 min-w-0 max-w-[110px] xs:max-w-[130px]">
              <div className="absolute left-2 text-emerald-600 pointer-events-none">
                <CalendarEvent size={11} />
              </div>
              <select
                value={selectedFY?._id || ""}
                onChange={(e) => {
                  const fy = fyList.find((x) => x._id === e.target.value);
                  if (fy) setSelectedFY(fy);
                }}
                className="topbar-pill-btn w-full pl-6 pr-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60 focus:outline-none cursor-pointer truncate"
                style={{ borderRadius: "9999px" }}
              >
                {fyList.map((fy) => (
                  <option key={fy._id} value={fy._id} className="text-slate-900">
                    {fy.isAll
                      ? "All FYs"
                      : fy.fyCode
                        ? `${fy.fyCode}`
                        : `FY ${fy.fyName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* CENTER GLOBAL SEARCH INPUT (Desktop / Tablet) */}
      <div
        ref={searchContainerRef}
        className={`relative hidden md:flex flex-1 transition-all duration-200 mx-3 lg:mx-6 ${
          searchOpen ? "max-w-2xl lg:max-w-3xl z-50" : "max-w-sm lg:max-w-lg z-20"
        }`}
      >
        <div
          className={`topbar-search-bar w-full flex items-center justify-between px-4 py-2 transition-all duration-150 group relative z-50 ${
            searchOpen
              ? "search-open bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 rounded-full shadow-lg ring-2 ring-indigo-500/20 opacity-100"
              : "border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs opacity-100"
          }`}
        >
          <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
            <Search
              size={16}
              className={`shrink-0 transition-colors ${
                searchOpen
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchOpen) setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search pages, products, stock, customers, vouchers..."
              className="w-full bg-transparent border-none outline-none text-[13.5px] font-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            ) : (
              <span className="text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400 select-none bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Global Search Results Dropdown (Attached directly below header search input) */}
        <GlobalSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          query={searchQuery}
          setQuery={setSearchQuery}
        />
      </div>

      {/* Mobile search bar dropdown banner */}
      {mobileSearchOpen && (
        <div className="flex md:hidden items-center w-full px-3 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 gap-2 absolute top-0 left-0 right-0 z-40">
          <Search size={15} className="text-indigo-600 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            placeholder="Search products, customers, vouchers..."
            className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false);
              setSearchOpen(false);
            }}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* RIGHT: Search Icon, Notifications, Fullscreen & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* MOBILE GLOBAL SEARCH ICON BUTTON */}
        <button
          onClick={() => {
            setMobileSearchOpen((prev) => !prev);
            setSearchOpen((prev) => !prev);
          }}
          aria-label="Global Search"
          className="topbar-circle-btn flex md:hidden items-center justify-center w-8.5 h-8.5 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors duration-200 shrink-0 cursor-pointer shadow-xs"
          style={{ borderRadius: "9999px" }}
          title="Search Anything (Products, Customers, Invoices, MRs...)"
        >
          <Search size={14} />
        </button>

        {/* FULLSCREEN TOGGLE (Hidden on Mobile) */}
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (F11)"}
          className={`topbar-circle-btn hidden sm:flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full border transition-all duration-200 shrink-0 cursor-pointer shadow-xs ${isFullscreen
              ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900"
              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-slate-700"
            }`}
          style={{ borderRadius: "9999px" }}
        >
          {isFullscreen ? (
            <FullscreenExit size={15} className="transition-transform hover:scale-110" />
          ) : (
            <ArrowsFullscreen size={14} className="transition-transform hover:scale-110" />
          )}
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="topbar-circle-btn relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors duration-200 shadow-xs cursor-pointer"
            style={{ borderRadius: "9999px" }}
          >
            <Bell size={15} className="sm:hidden" />
            <Bell size={17} className="hidden sm:block" />

            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[17px] sm:h-[17px] rounded-full bg-red-500 text-white text-[9px] sm:text-[9.5px] font-bold px-1 animate-pulse"
                style={{ borderRadius: "9999px" }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="fixed left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-auto sm:mt-2 sm:w-96 max-w-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 shadow-2xl py-2 z-[1100] overflow-hidden backdrop-blur-xl transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                  {liveNotifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Chips: Targets & Stock only */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto text-[11px] font-extrabold bg-slate-50/60 no-scrollbar">
                {[
                  { id: "ALL", label: "All Alerts" },
                  { id: "TARGETS", label: "Targets 🎯" },
                  { id: "INVENTORY", label: "Stock & Expiry 📦" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${activeCat === cat.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400 font-semibold">
                    No notifications in this category
                  </div>
                ) : (
                  filteredNotifications.map((n, i) => {
                    const isErr = n.severity === "error";
                    const isWarn = n.severity === "warning";
                    const isSucc = n.severity === "success";

                    return (
                      <div
                        key={n._id || i}
                        onClick={() => handleNotifClick(n)}
                        className={`group px-3.5 py-3 text-[13px] cursor-pointer transition-all duration-150 flex gap-2.5 items-start ${!n.isRead ? "bg-indigo-50/30 hover:bg-indigo-50/60 font-medium" : "hover:bg-slate-50"
                          }`}
                      >
                        {/* Status Icon */}
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isErr
                            ? "bg-rose-500 ring-4 ring-rose-100"
                            : isWarn
                              ? "bg-amber-500 ring-4 ring-amber-100"
                              : isSucc
                                ? "bg-emerald-500 ring-4 ring-emerald-100"
                                : "bg-indigo-500 ring-4 ring-indigo-100"
                            }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800 text-xs truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>

                        {/* Individual Remove Button */}
                        <button
                          onClick={(e) => deleteNotification(n._id, e)}
                          title="Delete notification"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition-all shrink-0 ml-1.5 shadow-2xs flex items-center justify-center"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 sm:pl-1.5 sm:pr-3.5 h-8.5 sm:h-9.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 shadow-xs cursor-pointer"
          >
            <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-xs shrink-0 bg-indigo-50 dark:bg-slate-800">
              {user?.profilePhoto && !profileImgError ? (
                <img
                  src={user.profilePhoto}
                  alt={user?.name || "User"}
                  className="w-full h-full object-cover"
                  onError={() => setProfileImgError(true)}
                />
              ) : (
                <span className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center select-none uppercase tracking-wider">
                  {getUserInitials(user?.name)}
                </span>
              )}
            </span>

            {!mobile && (
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[13px] font-semibold">
                  {user?.name || "User"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {user?.roleId?.roleName || "—"}
                </span>
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl py-1.5 z-[1100] divide-y divide-gray-100 dark:divide-slate-800">
              <div className="px-3.5 py-2.5 flex items-center gap-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-slate-700 shadow-xs shrink-0 bg-indigo-50 dark:bg-slate-800">
                  {user?.profilePhoto && !profileImgError ? (
                    <img
                      src={user.profilePhoto}
                      alt={user?.name || "User"}
                      className="w-full h-full object-cover"
                      onError={() => setProfileImgError(true)}
                    />
                  ) : (
                    <span className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-[11px] flex items-center justify-center select-none uppercase tracking-wider">
                      {getUserInitials(user?.name)}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || "User"}</p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{user?.roleId?.roleName || user?.email || "Manager"}</p>
                </div>
              </div>

              <div className="py-1">
                <a
                  href="/dashboard/profile"
                  className="block px-3.5 py-2 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 font-medium"
                >
                  My Profile
                </a>

                <a
                  href="/dashboard/settings"
                  className="block px-3.5 py-2 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 font-medium"
                >
                  Settings
                </a>
              </div>

              <div className="px-3 py-1.5">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
