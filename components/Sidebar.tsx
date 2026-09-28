"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { usePermission } from "@/context/PermissionContext";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  DEFAULT_MENU_ITEMS,
  MenuItemConfig,
  SubMenuItemConfig,
  renderMenuIcon,
  getRoleBasedHref,
  isPathActive,
} from "@/lib/defaultMenuData";
import Link from "next/link";
import {
  FaChevronLeft,
  FaChevronRight,
  FaShieldAlt,
  FaUserCheck,
  FaUsers,
  FaUserTimes,
  FaChartPie,
  FaCogs,
  FaTachometerAlt,
  FaAddressCard,
  FaBan,
  FaCodeBranch,
  FaCreditCard,
  FaChartBar,
  FaFileAlt,
  FaCog,
} from "react-icons/fa";
import { checkIsSuperAdmin } from "@/lib/constants/superAdmin.constant";

// Modular Sidebar Subcomponents, Constants, and Types
import {
  SidebarProps,
  SidebarThemeId,
  SidebarPresetTheme,
  SidebarVisuals,
  SIDEBAR_PRESET_THEMES,
  SIDEBAR_SECTIONS,
  MODULE_KEY_MAP,
  isColorDark,
  hexToRgba,
  SidebarHeader,
  SidebarNavLink,
  SidebarGroup,
  SidebarFooter,
} from "./sidebar-nav";

// Re-export for full backward compatibility across the application
export * from "./sidebar-nav";

// Import external CSS stylesheet
import "./sidebar-nav/sidebar.css";

export default function Sidebar({ collapsed, setCollapsed, mobile }: SidebarProps) {
  const { can } = usePermission();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const pathname = usePathname();

  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>(DEFAULT_MENU_ITEMS);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Sidebar Theme Customization State
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeId>("default");
  const [sidebarCustomHex, setSidebarCustomHex] = useState<string>("#001f54");
  const [sidebarCustomTextColor, setSidebarCustomTextColor] = useState<string>("");

  // Load saved theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sidebar_theme");
      if (savedTheme) setSidebarTheme(savedTheme as SidebarThemeId);
      const savedCustom = localStorage.getItem("sidebar_custom_hex");
      if (savedCustom) setSidebarCustomHex(savedCustom);
      const savedCustomText = localStorage.getItem("sidebar_custom_text_color");
      if (savedCustomText) setSidebarCustomTextColor(savedCustomText);
    }
  }, []);

  // Listen to external sidebar-theme-changed event (e.g. from Dashboard topbar)
  useEffect(() => {
    const handleThemeChanged = () => {
      if (typeof window !== "undefined") {
        const savedTheme = localStorage.getItem("sidebar_theme");
        if (savedTheme) setSidebarTheme(savedTheme as SidebarThemeId);
        const savedCustom = localStorage.getItem("sidebar_custom_hex");
        if (savedCustom) setSidebarCustomHex(savedCustom);
        const savedCustomText = localStorage.getItem("sidebar_custom_text_color");
        if (savedCustomText) setSidebarCustomTextColor(savedCustomText);
      }
    };
    window.addEventListener("sidebar-theme-changed", handleThemeChanged);
    return () => window.removeEventListener("sidebar-theme-changed", handleThemeChanged);
  }, []);

  const handleSelectSidebarTheme = useCallback((themeId: SidebarThemeId) => {
    setSidebarTheme(themeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_theme", themeId);
      window.dispatchEvent(new Event("sidebar-theme-changed"));
    }
  }, []);

  const handleSidebarCustomColorChange = useCallback((hex: string) => {
    setSidebarCustomHex(hex);
    setSidebarTheme("custom");
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_theme", "custom");
      localStorage.setItem("sidebar_custom_hex", hex);
      window.dispatchEvent(new Event("sidebar-theme-changed"));
    }
  }, []);

  const handleSidebarCustomTextColorChange = useCallback((hex: string) => {
    setSidebarCustomTextColor(hex);
    if (typeof window !== "undefined") {
      if (hex) {
        localStorage.setItem("sidebar_custom_text_color", hex);
      } else {
        localStorage.removeItem("sidebar_custom_text_color");
      }
      window.dispatchEvent(new Event("sidebar-theme-changed"));
    }
  }, []);

  const currentVisuals: SidebarVisuals = useMemo(() => {
    let base: SidebarVisuals;
    if (sidebarTheme === "custom") {
      const dark = isColorDark(sidebarCustomHex);
      base = {
        bg: dark
          ? `linear-gradient(180deg, ${sidebarCustomHex} 0%, #0a0f1d 100%)`
          : `linear-gradient(165deg, #ffffff 0%, ${hexToRgba(sidebarCustomHex, 0.08)} 50%, ${hexToRgba(sidebarCustomHex, 0.2)} 100%)`,
        borderColor: hexToRgba(sidebarCustomHex, dark ? 0.35 : 0.25),
        isDark: dark,
        color: sidebarCustomHex,
      };
    } else {
      const matched =
        SIDEBAR_PRESET_THEMES.find((t: SidebarPresetTheme) => t.id === sidebarTheme) ||
        SIDEBAR_PRESET_THEMES[0];
      base = {
        bg: matched.bgGradient,
        borderColor: matched.borderColor,
        isDark: matched.isDark,
        color: matched.color,
      };
    }
    if (sidebarCustomTextColor) {
      base.textColor = sidebarCustomTextColor;
    }
    return base;
  }, [sidebarTheme, sidebarCustomHex, sidebarCustomTextColor]);

  // Fetch Menu Adjustments based on active Company & FY
  const loadMenuAdjustments = useCallback(async () => {
    try {
      const companyId = selectedCompany?._id;
      const fyId = selectedFY?._id || "ALL";

      const url = companyId
        ? `/api/menu-adjustments?companyId=${companyId}&financialYearId=${fyId}`
        : `/api/menu-adjustments`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        const sorted = [...data.items].sort(
          (a: MenuItemConfig, b: MenuItemConfig) => (a.order ?? 0) - (b.order ?? 0)
        );
        sorted.forEach((item: MenuItemConfig) => {
          if (item.subItems && Array.isArray(item.subItems)) {
            item.subItems.sort(
              (a: SubMenuItemConfig, b: SubMenuItemConfig) => (a.order ?? 0) - (b.order ?? 0)
            );
          }
        });
        const newJson = JSON.stringify(sorted);
        setMenuItems((prev) => (JSON.stringify(prev) === newJson ? prev : sorted));
      } else {
        setMenuItems((prev) => (prev === DEFAULT_MENU_ITEMS ? prev : DEFAULT_MENU_ITEMS));
      }
    } catch (err) {
      console.error("Failed to load menu adjustments:", err);
      setMenuItems((prev) => (prev === DEFAULT_MENU_ITEMS ? prev : DEFAULT_MENU_ITEMS));
    }
  }, [selectedCompany?._id, selectedFY?._id]);

  useEffect(() => {
    loadMenuAdjustments();

    const handleMenuChanged = () => {
      loadMenuAdjustments();
    };

    window.addEventListener("menu-settings-changed", handleMenuChanged);
    return () => {
      window.removeEventListener("menu-settings-changed", handleMenuChanged);
    };
  }, [loadMenuAdjustments]);

  // Fetch company settings & current user profile
  useEffect(() => {
    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((data) => setCompanySettings(data))
      .catch(() => {});

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const { user: ctxUser } = useUser();
  const currentUser = ctxUser || user;
  const isSuperAdmin = checkIsSuperAdmin(currentUser);

  // Determine active role dynamically from URL or logged-in user
  const activeRole = useMemo(() => {
    const segments = pathname ? pathname.split("/").filter(Boolean) : [];
    if (segments[0] === "dashboard" && segments[1]) {
      const candidate = segments[1].toLowerCase().trim();
      return candidate.replace(/[\s_]+/g, "-");
    }

    if (isSuperAdmin) return "super-admin";

    const userRole = (currentUser as any)?.role || (currentUser as any)?.roleType;
    if (typeof userRole === "string" && userRole.trim()) {
      return userRole.toLowerCase().trim().replace(/[\s_]+/g, "-");
    }

    return "admin";
  }, [pathname, isSuperAdmin, currentUser]);

  // Automatically expand group containing the active pathname
  useEffect(() => {
    menuItems.forEach((group) => {
      if (group.isGroup && group.subItems) {
        const hasActiveChild = group.subItems.some((sub) => {
          return isPathActive(sub.href, pathname, activeRole);
        });
        if (hasActiveChild) {
          setOpenGroups((prev) => (prev[group.id] ? prev : { ...prev, [group.id]: true }));
        }
      }
    });
  }, [pathname, menuItems, activeRole]);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const handleMobileNavigate = useCallback(() => {
    if (mobile && setCollapsed) {
      setCollapsed(true);
    }
  }, [mobile, setCollapsed]);

  const iconOnly = collapsed && !mobile;

  // Filter items by visibility, company enabled modules, and user permissions
  const visibleMenuItems = useMemo(() => {
    const enabledModules = (selectedCompany as any)?.enabledModules;

    return menuItems.filter((item) => {
      if (item.isVisible === false) return false;

      // Module-level company permission check
      if (enabledModules && Array.isArray(enabledModules) && enabledModules.length > 0) {
        const isAlwaysAllowed =
          item.id === "standard-dashboard" ||
          item.id === "executive-ai" ||
          item.href === "/dashboard";

        if (!isAlwaysAllowed) {
          const itemHref = item.href || (item.subItems && item.subItems[0]?.href) || "";
          const isEnabled = enabledModules.some((modKey: string) => {
            if (item.id === modKey || item.id.includes(modKey)) return true;
            if (itemHref.includes(`/dashboard/${modKey}`)) return true;
            const mappedIds = MODULE_KEY_MAP[modKey] || [];
            if (mappedIds.includes(item.id)) return true;
            if (
              item.subItems?.some(
                (sub) =>
                  mappedIds.includes(sub.id) ||
                  sub.id.includes(modKey) ||
                  sub.href?.includes(modKey)
              )
            )
              return true;
            return false;
          });

          if (!isEnabled) return false;
        }
      }

      // User role permission check for main item
      if (item.permission && !can(item.permission)) {
        if (item.isGroup && item.subItems && item.subItems.length > 0) {
          const hasAnyPermittedSub = item.subItems.some(
            (sub) => sub.isVisible !== false && (!sub.permission || can(sub.permission))
          );
          if (!hasAnyPermittedSub) return false;
        } else {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, can, selectedCompany]);

  // Group visible items into logical sections defined in SIDEBAR_SECTIONS
  const groupedSections = useMemo(() => {
    const assignedIds = new Set<string>();
    const sectionsWithItems = SIDEBAR_SECTIONS.map((sec) => {
      const items = visibleMenuItems.filter((item) => {
        const matches = sec.ids.some(
          (secId) => item.id === secId || item.id.startsWith(secId + "-") || item.id.includes(secId)
        );
        if (matches) assignedIds.add(item.id);
        return matches;
      });
      return { ...sec, items };
    });

    // Capture any remaining items that weren't explicitly categorized into OPERATIONS
    const unassignedItems = visibleMenuItems.filter((item) => !assignedIds.has(item.id));
    if (unassignedItems.length > 0) {
      const opSec = sectionsWithItems.find((s) => s.key === "OPERATIONS");
      if (opSec) {
        opSec.items.push(...unassignedItems);
      } else {
        sectionsWithItems.push({
          key: "OTHER",
          label: "MORE",
          ids: [],
          items: unassignedItems,
        });
      }
    }

    return sectionsWithItems.filter((s) => s.items.length > 0);
  }, [visibleMenuItems]);

  const logoUrl = selectedCompany?.logo || companySettings?.logo || "/mabsol_logo.ico";

  return (
    <>

      <div
        className={`glass-sidebar flex flex-col ${currentVisuals.isDark || isSuperAdmin ? "sidebar-dark-theme" : ""}`}
        style={{
          width: mobile ? "270px" : collapsed ? "76px" : "265px",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          background: isSuperAdmin ? "#0B101B" : currentVisuals.bg,
          borderRight: isSuperAdmin ? "1px solid rgba(30, 41, 59, 0.8)" : `1px solid ${currentVisuals.borderColor}`,
          transform: mobile && collapsed ? "translateX(-100%)" : "translateX(0)",
          transition:
            "width 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 1050,
          overflow: "visible",
          ...(sidebarCustomTextColor ? { ["--sidebar-custom-text" as any]: sidebarCustomTextColor } : {}),
        }}
      >
        {/* Specular highlight sweeping down panel */}
        <div className="pointer-events-none absolute inset-0 glass-sidebar-specular" />

        {/* Sleek floating circular toggle button right on the sidebar seam */}
        {!mobile && setCollapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-toggle-circle absolute -right-3.5 top-[18px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            style={{ zIndex: 1060 }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
          </button>
        )}

        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Logo / Brand Header */}
          <SidebarHeader
            iconOnly={iconOnly}
            isDark={currentVisuals.isDark || isSuperAdmin}
            logoUrl={logoUrl}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Nav List with categorized sections */}
          <div className="flex-1 min-h-0 py-3 sidebar-scroll px-2 overflow-y-auto overflow-x-hidden">
            {isSuperAdmin ? (
              <div className="flex flex-col gap-1">
                <ul className="flex flex-col p-0 m-0 list-none gap-1">
                  {/* 1. Dashboard */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/dashboard"
                      icon={<FaTachometerAlt size={14} />}
                      label="Dashboard"
                      active={pathname === "/dashboard/super-admin/dashboard"}
                      color="indigo"
                      iconOnly={iconOnly}
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 2. Approve Admins */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin"
                      icon={<FaUserCheck size={14} />}
                      label="Approve Admins"
                      active={pathname === "/dashboard/super-admin"}
                      color="indigo"
                      iconOnly={iconOnly}
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 3. All Accounts */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/accounts"
                      icon={<FaAddressCard size={14} />}
                      label="All Accounts"
                      active={pathname === "/dashboard/super-admin/accounts"}
                      color="indigo"
                      iconOnly={iconOnly}
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 4. Deactivated Accounts */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/deactivated"
                      icon={<FaBan size={14} />}
                      label="Deactivated Accounts"
                      active={pathname === "/dashboard/super-admin/deactivated"}
                      color="indigo"
                      iconOnly={iconOnly}
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 5. Branch Management */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/branches"
                      icon={<FaCodeBranch size={14} />}
                      label="Branch Management"
                      active={pathname === "/dashboard/super-admin/branches"}
                      color="indigo"
                      iconOnly={iconOnly}
                      badge="Soon"
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 6. Subscription Plans */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/plans"
                      icon={<FaCreditCard size={14} />}
                      label="Subscription Plans"
                      active={pathname === "/dashboard/super-admin/plans"}
                      color="indigo"
                      iconOnly={iconOnly}
                      badge="Soon"
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 7. Reports */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/reports"
                      icon={<FaChartBar size={14} />}
                      label="Reports"
                      active={pathname === "/dashboard/super-admin/reports"}
                      color="indigo"
                      iconOnly={iconOnly}
                      badge="Soon"
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 8. Audit Logs */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/audit-logs"
                      icon={<FaFileAlt size={14} />}
                      label="Audit Logs"
                      active={pathname === "/dashboard/super-admin/audit-logs"}
                      color="indigo"
                      iconOnly={iconOnly}
                      badge="Soon"
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>

                  {/* 9. System Settings */}
                  <li>
                    <SidebarNavLink
                      href="/dashboard/super-admin/settings"
                      icon={<FaCog size={14} />}
                      label="System Settings"
                      active={pathname === "/dashboard/super-admin/settings"}
                      color="indigo"
                      iconOnly={iconOnly}
                      customActiveStyle={true}
                      onNavigate={handleMobileNavigate}
                    />
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {groupedSections.map((section) => (
                  <div key={section.key} className="flex flex-col">
                    {/* Smooth Category Header Label */}
                    <div
                      className="sidebar-category-label transition-all duration-300 ease-out overflow-hidden select-none whitespace-nowrap text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-white/70"
                      style={{
                        height: iconOnly ? "4px" : "20px",
                        opacity: iconOnly ? 0 : 1,
                        paddingLeft: "8px",
                        paddingTop: iconOnly ? "0px" : "5px",
                        paddingBottom: iconOnly ? "0px" : "1px",
                      }}
                    >
                      {section.label}
                    </div>

                    <ul className="flex flex-col p-0 m-0 list-none gap-1">
                      {section.items.map((item) => {
                        const color = item.color || "indigo";

                        if (item.isGroup && item.subItems && item.subItems.length > 0) {
                          const isGroupActive = item.subItems.some((sub) =>
                            isPathActive(sub.href, pathname, activeRole)
                          );

                          return (
                            <SidebarGroup
                              key={item.id}
                              id={item.id}
                              icon={renderMenuIcon(item.icon)}
                              label={item.label}
                              open={!!openGroups[item.id]}
                              active={isGroupActive}
                              color={color}
                              subItems={item.subItems}
                              iconOnly={iconOnly}
                              pathname={pathname}
                              currentVisuals={currentVisuals}
                              can={can}
                              role={activeRole}
                              onToggle={() => toggleGroup(item.id)}
                              onNavigate={handleMobileNavigate}
                            />
                          );
                        }

                        // Single link item
                        const resolvedHref = getRoleBasedHref(item.href, activeRole);
                        const isSingleActive = isPathActive(item.href, pathname, activeRole);

                        return (
                          <li key={item.id}>
                            <SidebarNavLink
                              href={resolvedHref}
                              icon={renderMenuIcon(item.icon)}
                              label={item.label}
                              active={isSingleActive}
                              color={color}
                              iconOnly={iconOnly}
                              onNavigate={handleMobileNavigate}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile & Theme customizer footer */}
          <SidebarFooter
            iconOnly={iconOnly}
            user={currentUser}
            companyName={selectedCompany?.companyName}
            currentVisuals={currentVisuals}
            sidebarTheme={sidebarTheme}
            sidebarCustomHex={sidebarCustomHex}
            sidebarCustomTextColor={sidebarCustomTextColor}
            onSelectSidebarTheme={handleSelectSidebarTheme}
            onSidebarCustomColorChange={handleSidebarCustomColorChange}
            onSidebarCustomTextColorChange={handleSidebarCustomTextColorChange}
          />
        </div>
      </div>
    </>
  );
}