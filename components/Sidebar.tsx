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
  FaTrash,
  FaDownload,
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
  CORE_MODULE_IDS,
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
    window.addEventListener("mabsol-permissions-updated", handleMenuChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mabsol_permissions_version" || e.key === "mabsol_user") {
        loadMenuAdjustments();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("menu-settings-changed", handleMenuChanged);
      window.removeEventListener("mabsol-permissions-updated", handleMenuChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadMenuAdjustments]);

  const { user: ctxUser } = useUser();
  const currentUser = ctxUser;
  const isSuperAdmin = checkIsSuperAdmin(currentUser);

  // Determine active role dynamically from URL or logged-in user
  const activeRole = useMemo(() => {
    const VALID_ROLES = new Set([
      "admin",
      "super-admin",
      "reception",
      "manager",
      "sales-executive",
      "mr",
      "asm",
      "rsm",
      "zsm",
      "nsm",
      "vp",
      "director",
      "md",
      "telecaller",
      "operator",
      "accountant",
      "user",
    ]);

    if (isSuperAdmin) return "super-admin";

    // 1. Prioritize authenticated user's actual assigned role
    const roleIdName = (currentUser as any)?.roleId?.roleName;
    const directRoleName = (currentUser as any)?.roleName;
    const directRoleType = (currentUser as any)?.roleType;
    const directRole = (currentUser as any)?.role;
    const dashboardType = (currentUser as any)?.dashboardType;

    if (
      roleIdName?.toLowerCase() === "admin" ||
      directRoleName?.toLowerCase() === "admin" ||
      directRoleType?.toLowerCase() === "admin" ||
      directRole?.toLowerCase() === "admin" ||
      dashboardType === "admin" ||
      (currentUser as any)?.isAdmin === true
    ) {
      return "admin";
    }

    const userCandidates = [roleIdName, directRoleName, directRoleType, directRole]
      .filter((r) => typeof r === "string" && r.trim())
      .map((r) => r.toLowerCase().trim().replace(/[\s_]+/g, "-"));

    for (const c of userCandidates) {
      if (VALID_ROLES.has(c)) {
        return c;
      }
    }

    // 2. Fallback to URL segment if not determined from user
    const segments = pathname ? pathname.split("/").filter(Boolean) : [];
    if (segments[0] === "dashboard" && segments[1]) {
      const candidate = segments[1].toLowerCase().trim().replace(/[\s_]+/g, "-");
      if (VALID_ROLES.has(candidate)) {
        return candidate;
      }
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
  // Filter items by visibility, company enabled modules, and user permissions
  const visibleMenuItems = useMemo(() => {
    // SuperAdmin always sees all items
    if (isSuperAdmin) {
      return menuItems;
    }

    // 1. Determine raw enabled modules array from User or Company.
    // Prioritize user's own enabledModules, then company's enabledModules.
    let rawEnabled: string[] | null = null;
    if (Array.isArray(currentUser?.enabledModules)) {
      rawEnabled = currentUser.enabledModules;
    } else if (Array.isArray(currentUser?.companyId?.enabledModules)) {
      rawEnabled = currentUser.companyId.enabledModules;
    } else if (Array.isArray((selectedCompany as any)?.enabledModules)) {
      rawEnabled = (selectedCompany as any).enabledModules;
    }

    // Module restrictions strictly apply to all non-SuperAdmin users.
    // If Super Admin has not granted any modules yet or revoked access, treat as empty []
    const hasModuleRestrictions = !isSuperAdmin;
    const effectiveEnabled = Array.isArray(rawEnabled) ? rawEnabled : [];

    const isChildBranch = Boolean(
      selectedCompany &&
      ((selectedCompany as any).isHeadOffice === false || (selectedCompany as any).parentCompanyId)
    );

    const enabledSet = new Set<string>();
    if (hasModuleRestrictions) {
      for (const m of effectiveEnabled) {
        if (!m) continue;
        const lower = String(m).toLowerCase().trim();
        enabledSet.add(lower);

        // Populate module aliases and sub-route mappings
        const mappedSubIds = MODULE_KEY_MAP[lower] || [];
        for (const subId of mappedSubIds) {
          enabledSet.add(subId.toLowerCase());
        }

        // Add exact single-module route aliases (without bundling other distinct modules)
        if (lower === "purchases" || lower === "purchase") {
          enabledSet.add("purchase");
          enabledSet.add("purchases");
        }
        if (lower === "financial_years" || lower === "financial-year") {
          enabledSet.add("financial-year");
          enabledSet.add("financial_years");
        }
        if (lower === "custom_forms" || lower === "custom-forms") {
          enabledSet.add("custom-forms");
          enabledSet.add("custom_forms");
        }
        if (lower === "migration" || lower === "mabsolcrmsync") {
          enabledSet.add("migration");
          enabledSet.add("mabsolcrmsync");
        }
        if (lower === "fieldforce" || lower === "mr") {
          enabledSet.add("fieldforce");
          enabledSet.add("mr");
        }
      }
    }

    const isSubItemAllowed = (sub: SubMenuItemConfig, parentGroupId?: string): boolean => {
      if (sub.isVisible === false) return false;
      if (!hasModuleRestrictions) return true;

      const subIdLower = sub.id.toLowerCase();
      const parentIdLower = parentGroupId ? parentGroupId.toLowerCase() : "";

      // Direct ID check in enabledSet
      if (enabledSet.has(subIdLower)) return true;

      // If parent group itself is enabled, allow all child subItems
      if (parentIdLower && enabledSet.has(parentIdLower)) return true;

      // Check if sub.id is permitted by any enabled module
      for (const modKey of Array.from(enabledSet)) {
        if (sub.id === modKey) return true;
        const mapped = MODULE_KEY_MAP[modKey] || [];
        if (mapped.includes(sub.id)) return true;
        if (sub.href === `/dashboard/${modKey}` || sub.href?.startsWith(`/dashboard/${modKey}/`)) return true;
      }
      return false;
    };

    return menuItems
      .map((item) => {
        let subItems = item.subItems;

        // When operating in a child branch context, hide "+ Create Company" subItem
        if (item.id === "company" && isChildBranch && !isSuperAdmin && subItems) {
          subItems = subItems.filter((sub) => sub.id !== "company-create");
        }

        // If company has restricted modules, filter subItems according to enabledModules
        if (hasModuleRestrictions && subItems) {
          subItems = subItems.filter((sub) => isSubItemAllowed(sub, item.id));
        }

        return {
          ...item,
          subItems,
        };
      })
      .filter((item) => {
        if (item.isVisible === false) return false;

        // Module-level company permission check: strictly respect enabledModules
        if (hasModuleRestrictions) {
          const itemIdLower = item.id.toLowerCase();

          if (item.isGroup) {
            // Group is permitted if parent ID is explicitly in enabledSet OR has allowed subItems
            if (enabledSet.has(itemIdLower)) return true;
            if (item.subItems && item.subItems.length > 0) return true;
            return false;
          }

          // Standalone item: check if item itself is in enabledSet
          if (enabledSet.has(itemIdLower)) return true;
          let isEnabled = false;
          for (const modKey of Array.from(enabledSet)) {
            if (item.id === modKey) {
              isEnabled = true;
              break;
            }
            const mapped = MODULE_KEY_MAP[modKey] || [];
            if (mapped.includes(item.id)) {
              isEnabled = true;
              break;
            }
            const itemHref = item.href || "";
            if (itemHref === `/dashboard/${modKey}` || itemHref.startsWith(`/dashboard/${modKey}/`)) {
              isEnabled = true;
              break;
            }
          }
          if (!isEnabled) return false;
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
  }, [menuItems, can, selectedCompany, isSuperAdmin, currentUser]);

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

  const logoUrl = selectedCompany?.logo || "/mabsol_logo.ico";

  return (
    <>

      <div
        className={`glass-sidebar flex flex-col ${currentVisuals.isDark && !isSuperAdmin ? "sidebar-dark-theme" : ""}`}
        style={{
          width: mobile ? "270px" : collapsed ? "76px" : "265px",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          background: isSuperAdmin ? "#ffffff" : currentVisuals.bg,
          borderRight: isSuperAdmin ? "none" : `1px solid ${currentVisuals.borderColor}`,
          border: isSuperAdmin ? "none" : undefined,
          boxShadow: isSuperAdmin ? "0 0 24px rgba(15, 23, 42, 0.04)" : undefined,
          transform: mobile && collapsed ? "translateX(-100%)" : "translateX(0)",
          transition:
            "width 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 1050,
          overflow: "visible",
          ...(sidebarCustomTextColor ? { ["--sidebar-custom-text" as any]: sidebarCustomTextColor } : {}),
        }}
      >
        {/* Specular highlight sweeping down panel (only in custom theme) */}
        {!isSuperAdmin && <div className="pointer-events-none absolute inset-0 glass-sidebar-specular" />}

        {/* Sleek floating circular toggle button right on the sidebar seam */}
        {!mobile && setCollapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-toggle-circle absolute -right-3.5 top-[18px] text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 shadow-xs"
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
            isDark={isSuperAdmin ? false : currentVisuals.isDark}
            logoUrl={logoUrl}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Nav List with categorized sections */}
          <div className="flex-1 min-h-0 py-3 sidebar-scroll px-2.5 overflow-y-auto overflow-x-hidden">
            {isSuperAdmin ? (
              <div className="flex flex-col gap-3 py-1">
                {/* 1. MAIN COMMAND */}
                <div>
                  {!iconOnly && (
                    <div className="px-2.5 pb-1 text-[9.5px] font-black tracking-wider text-slate-400 uppercase select-none">
                      Main Command
                    </div>
                  )}
                  <ul className="flex flex-col p-0 m-0 list-none gap-1">
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
                  </ul>
                </div>

                {/* 2. ENTERPRISE LIFECYCLE */}
                <div>
                  {!iconOnly && (
                    <div className="px-2.5 pb-1 text-[9.5px] font-black tracking-wider text-slate-400 uppercase select-none">
                      Enterprise Lifecycle
                    </div>
                  )}
                  <ul className="flex flex-col p-0 m-0 list-none gap-1">
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/branches"
                        icon={<FaCodeBranch size={14} />}
                        label="Branch Management"
                        active={pathname === "/dashboard/super-admin/branches"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
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
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/deleted"
                        icon={<FaTrash size={14} />}
                        label="Deleted Accounts"
                        active={pathname === "/dashboard/super-admin/deleted"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
                  </ul>
                </div>

                {/* 3. PLATFORM GOVERNANCE */}
                <div>
                  {!iconOnly && (
                    <div className="px-2.5 pb-1 text-[9.5px] font-black tracking-wider text-slate-400 uppercase select-none">
                      Platform Governance
                    </div>
                  )}
                  <ul className="flex flex-col p-0 m-0 list-none gap-1">
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/plans"
                        icon={<FaCreditCard size={14} />}
                        label="Subscription Plans"
                        active={pathname === "/dashboard/super-admin/plans"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/reports"
                        icon={<FaChartBar size={14} />}
                        label="Analytics & Reports"
                        active={pathname === "/dashboard/super-admin/reports"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/audit-logs"
                        icon={<FaFileAlt size={14} />}
                        label="Audit Logs"
                        active={pathname === "/dashboard/super-admin/audit-logs"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
                    <li>
                      <SidebarNavLink
                        href="/dashboard/super-admin/exe-logs"
                        icon={<FaDownload size={14} />}
                        label="EXE & Sync Logs"
                        active={pathname === "/dashboard/super-admin/exe-logs"}
                        color="indigo"
                        iconOnly={iconOnly}
                        customActiveStyle={true}
                        onNavigate={handleMobileNavigate}
                      />
                    </li>
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
              </div>
            ) : groupedSections.length === 0 ? (
              <div className="py-8 px-3 text-center">
                {!iconOnly && (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs shadow-2xs">
                    <FaShieldAlt className="mx-auto mb-1.5 text-amber-600 text-base" />
                    <div className="font-bold">No Active Modules</div>
                    <div className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                      Your account does not have any granted CRM modules yet. Please contact your Super Administrator.
                    </div>
                  </div>
                )}
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