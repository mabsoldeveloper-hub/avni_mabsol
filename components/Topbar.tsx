"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Menu,
  Trash2,
  Calendar,
  Search,
  Building2,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Check,
  MapPin,
  Layers,
  ArrowRight,
} from "lucide-react";

import { useUser } from "@/context/UserContext";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import LogoutButton from "./LogoutButton";
import GlobalSearchModal from "./GlobalSearchModal";
import { checkIsSuperAdmin } from "@/lib/constants/superAdmin.constant";

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
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [fyMenuOpen, setFyMenuOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const companyMenuRef = useRef<HTMLDivElement>(null);
  const fyMenuRef = useRef<HTMLDivElement>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [profileImgError, setProfileImgError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setFormattedTime(`${dateStr} · ${weekday} | ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
      } else if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          searchInputRef.current?.blur();
        }
        setCompanyMenuOpen(false);
        setFyMenuOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
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
    if (rawId && companies?.length) {
      const match = companies.find((c: any) => c._id === rawId);
      if (match?.companyName) {
        setCompanyName(match.companyName);
        return;
      }
    }
    if (selectedCompany?.companyName) {
      setCompanyName(selectedCompany.companyName);
    }
  }, [user, companies, selectedCompany]);


  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }

      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setCompanyMenuOpen(false);
      }

      if (fyMenuRef.current && !fyMenuRef.current.contains(e.target as Node)) {
        setFyMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  const isSuperAdminUser = checkIsSuperAdmin(user);

  const fetchNotifications = () => {
    if (isSuperAdminUser) return;
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
    if (isSuperAdminUser) return;
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchNotifications();
      }
    }, 180000); // 3 minutes, only when tab is visible
    return () => clearInterval(interval);
  }, [isSuperAdminUser]);

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

  const rolePrefix = checkIsSuperAdmin(user)
    ? "super-admin"
    : ((user?.roleId?.roleName || (user as any)?.roleType || (user as any)?.role || "admin"))
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-");

  const canManageCompanies =
    user?.roleType === "Admin" ||
    user?.role === "Admin" ||
    user?.roleId?.roleName?.toLowerCase().includes("admin") ||
    checkIsSuperAdmin(user);

  return (
    <div
      style={{ zIndex: searchOpen ? 1065 : 1020 }}
      className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 shadow-xs sticky top-0 transition-all"
    >
      {/* LEFT: Sidebar Toggle & Company/FY Selectors */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">        {/* Mobile-only toggle button (Desktop toggle is integrated on sidebar seam) */}
        {mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="topbar-circle-btn flex items-center justify-center w-8.5 h-8.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shrink-0 cursor-pointer shadow-xs"
            style={{ borderRadius: "9999px" }}
          >
            <Menu size={16} />
          </button>
        )}

        {/* SUPER ADMIN CONSOLE BADGE OR COMPANY & FY SELECTORS */}
        {isSuperAdminUser ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-blue-50/80 dark:from-slate-800 dark:to-slate-800 border border-indigo-200/80 dark:border-slate-700 shadow-2xs select-none">
            <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              <img
                src="/mabsol_logo.ico"
                alt="Mabsol"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden xs:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Super Admin Console
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  ROOT
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Multi-Tenant Platform Governance
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* COMPANY CUSTOM DROPDOWN SWITCHER */}
            <div className="relative inline-block" ref={companyMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setCompanyMenuOpen((prev) => !prev);
                  setFyMenuOpen(false);
                }}
                className={`h-9 px-2 sm:px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border shadow-2xs group max-w-[125px] xs:max-w-[165px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[400px] ${
                  companyMenuOpen
                    ? "bg-indigo-50/70 dark:bg-slate-800 border-indigo-500/80 text-indigo-950 dark:text-white ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                title={`Active Enterprise: ${selectedCompany?.companyName || "Select Company"}`}
              >
                {/* Logo / Monogram Icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden border shadow-2xs ${
                  companyMenuOpen
                    ? "border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                }`}>
                  {selectedCompany?.logo ? (
                    <img src={selectedCompany.logo} alt="" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <Building2 size={12} />
                  )}
                </div>

                {/* Company Name */}
                <span className="truncate tracking-tight font-bold text-[12px] sm:text-[12.5px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {selectedCompany?.companyName || "Select Company"}
                </span>

                {/* Company Code Tag */}
                {selectedCompany?.companyCode && (
                  <span className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                    {selectedCompany.companyCode}
                  </span>
                )}

                {/* Animated Chevron */}
                <ChevronDown
                  size={12}
                  className={`shrink-0 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 ${
                    companyMenuOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                  }`}
                />
              </button>

              {/* COMPANY POPUP MENU */}
              {companyMenuOpen && (
                <div
                  className="absolute left-0 mt-2.5 w-[330px] xs:w-[380px] sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl z-[1100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{
                    boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 8px 16px -6px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  {/* Popover Header (Without +Add button as requested) */}
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/90 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Switch Enterprise
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {companies.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                      Available Companies ({companies.length})
                    </p>
                  </div>

                  {/* Search box if companies > 2 */}
                  {companies.length > 2 && (
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <div className="relative flex items-center">
                        <Search size={13} className="absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search enterprise name, code or location..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                        />
                        {companySearch && (
                          <button
                            type="button"
                            onClick={() => setCompanySearch("")}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Company items */}
                  <div className="max-h-76 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                    {companies
                      .filter((c) => {
                        if (!companySearch.trim()) return true;
                        const q = companySearch.toLowerCase();
                        return (
                          c.companyName?.toLowerCase().includes(q) ||
                          c.companyCode?.toLowerCase().includes(q) ||
                          c.city?.toLowerCase().includes(q)
                        );
                      })
                      .map((c) => {
                        const isSelected =
                          selectedCompany?._id === c._id ||
                          String(selectedCompany?._id) === String(c._id);
                        return (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setSelectedCompany(c);
                              setCompanyMenuOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer select-none group border ${
                              isSelected
                                ? "bg-gradient-to-r from-indigo-50/90 to-blue-50/60 dark:from-indigo-950/60 dark:to-blue-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-2xs"
                                : "hover:bg-slate-50/90 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200/70 dark:hover:border-slate-700/60"
                            }`}
                          >
                            {/* Logo or Initials Avatar */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden transition-transform group-hover:scale-102 ${
                              isSelected
                                ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-indigo-600 shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-500"
                            }`}>
                              {c.logo ? (
                                <img src={c.logo} alt="" className="w-full h-full object-contain p-1" />
                              ) : (
                                <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                  {(c.companyName || "CO").trim().slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <p className={`text-xs leading-tight truncate m-0 ${
                                  isSelected
                                    ? "font-extrabold text-indigo-950 dark:text-indigo-100"
                                    : "font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors"
                                }`}>
                                  {c.companyName}
                                </p>

                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active
                                  </span>
                                ) : (
                                  <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 rounded-md shrink-0 transition-all">
                                    Switch <ArrowRight size={10} />
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                  {c.companyCode || "Code"}
                                </span>

                                {(c as any).isHeadOffice ? (
                                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                                    Head Office
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/70">
                                    Branch
                                  </span>
                                )}

                                {c.city && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5 truncate">
                                    <MapPin size={10} className="text-slate-400 shrink-0" />
                                    {c.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {/* Footer Link */}
                  <div className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {companies.length} {companies.length === 1 ? "enterprise" : "enterprises"} configured
                    </span>
                    <a
                      href={`/dashboard/${rolePrefix}/company/list`}
                      onClick={() => setCompanyMenuOpen(false)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 transition-colors hover:underline"
                    >
                      Manage Directory <ArrowRight size={11} />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* FINANCIAL YEAR CUSTOM DROPDOWN SWITCHER (Cleaned, no "FY", no ERP code) */}
            <div className="relative inline-block" ref={fyMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setFyMenuOpen((prev) => !prev);
                  setCompanyMenuOpen(false);
                }}
                className={`h-9 px-2.5 sm:px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border shadow-2xs group max-w-[110px] xs:max-w-[135px] sm:max-w-[170px] ${
                  fyMenuOpen
                    ? "bg-emerald-50/70 dark:bg-slate-800 border-emerald-500/80 text-emerald-950 dark:text-white ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                title={`Accounting Period: ${selectedFY?.isAll ? "All Years" : selectedFY?.fyName ? selectedFY.fyName.replace(/^FY\s*/i, "") : "Select Year"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border shadow-2xs ${
                  fyMenuOpen
                    ? "border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <Calendar size={12} />
                </div>

                <span className="truncate tracking-tight font-bold text-[12px] sm:text-[12.5px] text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {selectedFY?.isAll
                    ? "All Years"
                    : selectedFY?.fyName
                    ? selectedFY.fyName.replace(/^FY\s*/i, "")
                    : "Select Year"}
                </span>

                <ChevronDown
                  size={12}
                  className={`shrink-0 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 ${
                    fyMenuOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""
                  }`}
                />
              </button>

              {/* FINANCIAL YEAR POPUP MENU */}
              {fyMenuOpen && (
                <div
                  className="absolute left-0 mt-2.5 w-[260px] sm:w-[280px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl z-[1100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{
                    boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 8px 16px -6px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Accounting Cycle
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {fyList.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                        Financial Year ({fyList.length})
                      </p>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                    {fyList.map((fy) => {
                      const isSelected = selectedFY?._id === fy._id;
                      const displayName = fy.isAll ? "All Financial Years" : fy.fyName.replace(/^FY\s*/i, "");
                      return (
                        <button
                          key={fy._id}
                          type="button"
                          onClick={() => {
                            setSelectedFY(fy);
                            setFyMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer select-none border ${
                            isSelected
                              ? "bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 font-bold shadow-2xs"
                              : "hover:bg-slate-50/90 dark:hover:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-200 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-white dark:bg-slate-800 border-emerald-200 text-emerald-600 shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200/80 text-slate-400"
                            }`}>
                              {fy.isAll ? <Layers size={13} /> : <Calendar size={13} />}
                            </div>

                            <span className="text-xs truncate font-semibold">
                              {displayName}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CENTER GLOBAL SEARCH INPUT (Desktop / Tablet) - Hidden for Super Admin */}
      {!isSuperAdminUser && (
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
      )}

      {/* Mobile search bar dropdown banner */}
      {!isSuperAdminUser && mobileSearchOpen && (
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
        {!isSuperAdminUser && (
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
        )}

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
            <Minimize2 size={15} className="transition-transform hover:scale-110" />
          ) : (
            <Maximize2 size={14} className="transition-transform hover:scale-110" />
          )}
        </button>

        {/* LIVE DATE & TIME (Matching Screenshot) */}
        {checkIsSuperAdmin(user) && formattedTime && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-600 text-xs font-semibold shadow-2xs select-none">
            <Calendar size={12} className="text-indigo-600" />
            <span>{formattedTime}</span>
          </div>
        )}

        {/* NOTIFICATIONS - Hidden for Super Admin */}
        {!isSuperAdminUser && (
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
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
                <span className="text-[12.5px] font-bold text-slate-800 dark:text-white">
                  {checkIsSuperAdmin(user) ? "System Owner" : user?.name || "User"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {checkIsSuperAdmin(user) ? "Super Admin" : user?.roleId?.roleName || "—"}
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
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                    {checkIsSuperAdmin(user) ? "Super Administrator" : user?.roleId?.roleName || user?.email || "Manager"}
                  </p>
                </div>
              </div>

              <div className="py-1">
                {(() => {
                  const rolePath = checkIsSuperAdmin(user)
                    ? "super-admin"
                    : ((user?.roleId?.roleName || (user as any)?.roleType || (user as any)?.role || "admin"))
                        .toLowerCase()
                        .trim()
                        .replace(/[\s_]+/g, "-");
                  return (
                    <>
                      <a
                        href={`/dashboard/${rolePath}/profile`}
                        className="block px-3.5 py-2 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 font-medium"
                      >
                        My Profile
                      </a>

                      <a
                        href={`/dashboard/${rolePath}/settings`}
                        className="block px-3.5 py-2 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 font-medium"
                      >
                        Settings
                      </a>
                    </>
                  );
                })()}
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
