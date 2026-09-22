"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { usePermission } from "@/context/PermissionContext";
import {
  MenuItemConfig,
  SubMenuItemConfig,
  ColorKey,
  COLOR_OPTIONS,
  ICON_CATALOG,
  renderMenuIcon,
  getDefaultMenuItems,
} from "@/lib/defaultMenuData";
import {
  FaSlidersH,
  FaPlus,
  FaArrowUp,
  FaArrowDown,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaUndo,
  FaCheck,
  FaSearch,
  FaLayerGroup,
  FaLink,
  FaExclamationTriangle,
  FaShieldAlt,
  FaTimes,
  FaPalette,
  FaBuilding,
  FaCalendarAlt,
} from "react-icons/fa";

export default function MenuAdjustmentsPage() {
  const { can, loading: permissionsLoading } = usePermission();
  const { selectedCompany, companies, setSelectedCompany } = useCompany();
  const { selectedFY, fyList, setSelectedFY } = useFinancialYear();

  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modals state
  const [editingMainMenu, setEditingMainMenu] = useState<{
    item: MenuItemConfig;
    isNew: boolean;
  } | null>(null);

  const [editingSubMenu, setEditingSubMenu] = useState<{
    parentGroupId: string;
    item: SubMenuItemConfig;
    isNew: boolean;
  } | null>(null);

  const [confirmResetModal, setConfirmResetModal] = useState(false);

  // Icon picker filter
  const [iconSearch, setIconSearch] = useState("");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch current menu adjustments
  const fetchMenuAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = selectedCompany?._id;
      const fyId = selectedFY?._id || "ALL";

      const url = companyId
        ? `/api/menu-adjustments?companyId=${companyId}&financialYearId=${fyId}`
        : "/api/menu-adjustments";

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        const sorted = [...data.items].sort((a: MenuItemConfig, b: MenuItemConfig) => (a.order ?? 0) - (b.order ?? 0));
        sorted.forEach((item: MenuItemConfig) => {
          if (item.subItems && Array.isArray(item.subItems)) {
            item.subItems.sort((a: SubMenuItemConfig, b: SubMenuItemConfig) => (a.order ?? 0) - (b.order ?? 0));
          }
        });
        setMenuItems(sorted);
      } else {
        setMenuItems(getDefaultMenuItems());
      }
    } catch (err) {
      console.error("Error loading menu data:", err);
      setMenuItems(getDefaultMenuItems());
      showToast("Could not load customized menu, loaded default template", "info");
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    fetchMenuAdjustments();
  }, [fetchMenuAdjustments]);

  // Expand all by default initially
  useEffect(() => {
    if (menuItems.length > 0) {
      const initial: Record<string, boolean> = {};
      menuItems.forEach((m) => {
        initial[m.id] = true;
      });
      setExpandedCards(initial);
    }
  }, [menuItems.length]);

  // Reorder Main Menus Up / Down
  const moveMainMenu = (index: number, direction: "up" | "down") => {
    const newItems = [...menuItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Recalculate order indices
    const updated = newItems.map((item, idx) => ({ ...item, order: idx }));
    setMenuItems(updated);
  };

  // Reorder Submenus Up / Down
  const moveSubMenu = (parentGroupId: string, subIndex: number, direction: "up" | "down") => {
    setMenuItems((prev) => {
      return prev.map((group) => {
        if (group.id !== parentGroupId || !group.subItems) return group;

        const newSubs = [...group.subItems];
        const targetIndex = direction === "up" ? subIndex - 1 : subIndex + 1;
        if (targetIndex < 0 || targetIndex >= newSubs.length) return group;

        const temp = newSubs[subIndex];
        newSubs[subIndex] = newSubs[targetIndex];
        newSubs[targetIndex] = temp;

        const updatedSubs = newSubs.map((sub, idx) => ({ ...sub, order: idx }));
        return { ...group, subItems: updatedSubs };
      });
    });
  };

  // Transfer Submenu from one Main Menu group to another
  const transferSubMenu = (fromGroupId: string, subId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;

    setMenuItems((prev) => {
      let subToMove: SubMenuItemConfig | null = null;

      // Remove from source group
      const cleaned = prev.map((group) => {
        if (group.id === fromGroupId && group.subItems) {
          const found = group.subItems.find((s) => s.id === subId);
          if (found) subToMove = found;
          const filtered = group.subItems.filter((s) => s.id !== subId);
          return {
            ...group,
            subItems: filtered.map((s, idx) => ({ ...s, order: idx })),
          };
        }
        return group;
      });

      if (!subToMove) return prev;

      // Add to target group
      return cleaned.map((group) => {
        if (group.id === toGroupId) {
          const currentSubs = group.subItems ? [...group.subItems] : [];
          currentSubs.push({
            ...subToMove!,
            order: currentSubs.length,
          });
          return {
            ...group,
            isGroup: true,
            subItems: currentSubs,
          };
        }
        return group;
      });
    });

    showToast("Submenu transferred successfully!");
  };

  // Toggle Visibility for Main Menu
  const toggleMainMenuVisibility = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isVisible: !item.isVisible } : item))
    );
  };

  // Toggle Visibility for Submenu
  const toggleSubMenuVisibility = (parentGroupId: string, subId: string) => {
    setMenuItems((prev) =>
      prev.map((group) => {
        if (group.id !== parentGroupId || !group.subItems) return group;
        return {
          ...group,
          subItems: group.subItems.map((sub) =>
            sub.id === subId ? { ...sub, isVisible: !sub.isVisible } : sub
          ),
        };
      })
    );
  };

  // Delete Main Menu
  const deleteMainMenu = (id: string) => {
    if (!window.confirm("Are you sure you want to remove this menu item?")) return;
    setMenuItems((prev) => prev.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx })));
    showToast("Menu removed");
  };

  // Delete Submenu
  const deleteSubMenu = (parentGroupId: string, subId: string) => {
    if (!window.confirm("Are you sure you want to remove this submenu?")) return;
    setMenuItems((prev) =>
      prev.map((group) => {
        if (group.id !== parentGroupId || !group.subItems) return group;
        const filtered = group.subItems.filter((sub) => sub.id !== subId);
        return {
          ...group,
          subItems: filtered.map((s, idx) => ({ ...s, order: idx })),
        };
      })
    );
    showToast("Submenu removed");
  };

  // Save Configuration to Backend
  const saveConfiguration = async () => {
    if (!selectedCompany?._id) {
      showToast("Please select a company first", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/menu-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          financialYearId: selectedFY?._id || "ALL",
          items: menuItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("🎉 Menu Adjustments saved successfully!");
        // Dispatch event to live update sidebar
        window.dispatchEvent(new CustomEvent("menu-settings-changed"));
      } else {
        showToast(data.error || "Failed to save menu adjustments", "error");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      showToast("An error occurred while saving", "error");
    } finally {
      setSaving(false);
    }
  };

  // Reset to Default Template
  const resetToDefault = async () => {
    if (!selectedCompany?._id) return;
    try {
      setResetting(true);
      const res = await fetch("/api/menu-adjustments/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          financialYearId: selectedFY?._id || "ALL",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMenuItems(getDefaultMenuItems());
        setConfirmResetModal(false);
        showToast("Sidebar layout reset to Default Template!");
        window.dispatchEvent(new CustomEvent("menu-settings-changed"));
      } else {
        showToast(data.error || "Failed to reset", "error");
      }
    } catch (err) {
      console.error("Reset error:", err);
      showToast("Failed to reset menu configuration", "error");
    } finally {
      setResetting(false);
    }
  };

  // Filtered menu list based on search
  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    const lower = searchTerm.toLowerCase();

    return menuItems.filter((item) => {
      const matchMain =
        item.label.toLowerCase().includes(lower) ||
        (item.href && item.href.toLowerCase().includes(lower));
      const matchSub = item.subItems?.some(
        (sub) =>
          sub.label.toLowerCase().includes(lower) ||
          sub.href.toLowerCase().includes(lower)
      );
      return matchMain || matchSub;
    });
  }, [menuItems, searchTerm]);

  // Filtered icons in modal
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return ICON_CATALOG;
    const lower = iconSearch.toLowerCase();
    return ICON_CATALOG.filter(
      (i) =>
        i.label.toLowerCase().includes(lower) ||
        i.name.toLowerCase().includes(lower)
    );
  }, [iconSearch]);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    menuItems.forEach((m) => (all[m.id] = true));
    setExpandedCards(all);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 text-slate-800 dark:text-slate-100 max-w-full">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:top-6 z-[9999] flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl transition-all duration-300 text-white font-medium text-xs sm:text-sm backdrop-blur-xl max-w-md ${
            toast.type === "success"
              ? "bg-emerald-600/95 border border-emerald-400/40 shadow-emerald-500/20"
              : toast.type === "error"
              ? "bg-rose-600/95 border border-rose-400/40 shadow-rose-500/20"
              : "bg-blue-600/95 border border-blue-400/40 shadow-blue-500/20"
          }`}
        >
          {toast.type === "success" ? <FaCheck className="shrink-0" /> : <FaExclamationTriangle className="shrink-0" />}
          <span className="break-words">{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Company Context Bar */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-4 sm:p-6 lg:p-8 shadow-xl shadow-indigo-900/10 border border-white/10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-indigo-200 border border-white/10">
              <FaSlidersH className="text-sky-300 shrink-0" />
              <span>Sidebar & Navigation Manager</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Menu Adjustments Studio
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
              Customize main menus and submenus, position them up/down, create new custom navigation categories, edit labels, assign icons, and configure visibility tailored for each Company & Financial Year.
            </p>
          </div>

          {/* Company & Financial Year Scoping Selectors */}
          <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 sm:gap-3 bg-white/10 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/15">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                <FaBuilding className="text-amber-300 shrink-0" /> Company Context
              </span>
              <select
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c._id === e.target.value);
                  if (comp) setSelectedCompany(comp);
                }}
                className="w-full bg-slate-900/80 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-white/20 mt-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer truncate"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-white">
                    {c.companyName} {c.companyCode ? `(${c.companyCode})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                <FaCalendarAlt className="text-emerald-300 shrink-0" /> Financial Year
              </span>
              <select
                value={selectedFY?._id || "ALL"}
                onChange={(e) => {
                  const fy = fyList.find((f) => f._id === e.target.value);
                  if (fy) setSelectedFY(fy);
                }}
                className="w-full bg-slate-900/80 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-white/20 mt-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer truncate"
              >
                {fyList.map((fy) => (
                  <option key={fy._id} value={fy._id} className="bg-slate-900 text-white">
                    {fy.fyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        {/* Search and Expand/Collapse */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1 w-full md:max-w-md">
          <div className="relative w-full">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm" />
            <input
              type="text"
              placeholder="Search menus or links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center shrink-0">
            <button
              onClick={expandAll}
              title="Expand all groups"
              className="px-3 py-2 text-xs font-semibold text-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              title="Collapse all groups"
              className="px-3 py-2 text-xs font-semibold text-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 transition"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Studio Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setConfirmResetModal(true)}
            disabled={saving || resetting}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex items-center justify-center gap-2"
          >
            <FaUndo size={12} className="shrink-0" />
            <span>Reset Default</span>
          </button>

          <button
            onClick={() =>
              setEditingMainMenu({
                item: {
                  id: `custom-${Date.now()}`,
                  label: "New Main Group",
                  icon: "FaLayerGroup",
                  color: "indigo",
                  isGroup: true,
                  permission: "",
                  isVisible: true,
                  order: menuItems.length,
                  subItems: [],
                },
                isNew: true,
              })
            }
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition flex items-center justify-center gap-2"
          >
            <FaPlus size={12} className="shrink-0" />
            <span>+ Main Menu</span>
          </button>

          <button
            onClick={saveConfiguration}
            disabled={saving || loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <FaSave size={13} className="shrink-0" />
            )}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Menus List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 bg-white/60 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs sm:text-sm font-medium text-slate-500">Loading sidebar configuration...</p>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="text-center p-8 sm:p-12 bg-white/60 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-white/5">
          <p className="text-slate-500 text-xs sm:text-sm font-medium">No menu items found matching "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredMenuItems.map((mainItem, mainIndex) => {
            const isFirst = mainIndex === 0;
            const isLast = mainIndex === filteredMenuItems.length - 1;
            const isExpanded = !!expandedCards[mainItem.id];
            const colorOption = COLOR_OPTIONS.find((c) => c.key === mainItem.color) || COLOR_OPTIONS[0];

            return (
              <div
                key={mainItem.id}
                className={`rounded-2xl transition-all duration-200 border overflow-hidden ${
                  mainItem.isVisible !== false
                    ? "bg-white/90 dark:bg-slate-800/90 border-slate-200/90 dark:border-white/10 shadow-sm"
                    : "bg-slate-100/70 dark:bg-slate-900/60 border-dashed border-slate-300 dark:border-white/10 opacity-75"
                }`}
              >
                {/* Main Menu Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4">
                  {/* Left info & icon */}
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Position Reorder Up / Down */}
                    <div className="flex sm:flex-row items-center gap-0.5 sm:gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => moveMainMenu(mainIndex, "up")}
                        disabled={isFirst}
                        title="Move Up"
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isFirst
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 shadow-xs"
                        }`}
                      >
                        <FaArrowUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMainMenu(mainIndex, "down")}
                        disabled={isLast}
                        title="Move Down"
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isLast
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 shadow-xs"
                        }`}
                      >
                        <FaArrowDown />
                      </button>
                    </div>

                    {/* Color & Icon Badge */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${colorOption.bg}`}
                    >
                      <span className="text-sm sm:text-base">{renderMenuIcon(mainItem.icon)}</span>
                    </div>

                    {/* Label & Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                          {mainItem.label}
                        </span>
                        {mainItem.isGroup ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                            Group ({mainItem.subItems?.length || 0})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1 max-w-[160px] sm:max-w-[280px] truncate">
                            <FaLink size={9} className="shrink-0" />
                            <span className="truncate">{mainItem.href}</span>
                          </span>
                        )}
                        {!mainItem.isVisible && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                            Hidden
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>Position #{mainIndex + 1}</span>
                        {mainItem.permission && (
                          <span className="flex items-center gap-1 text-slate-500 font-mono truncate max-w-[140px] sm:max-w-none">
                            <FaShieldAlt size={10} className="text-indigo-500 shrink-0" />
                            <span className="truncate">{mainItem.permission}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions right side */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5 shrink-0">
                    {/* Add Submenu Button (only for groups) */}
                    {mainItem.isGroup && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSubMenu({
                            parentGroupId: mainItem.id,
                            item: {
                              id: `sub-${Date.now()}`,
                              label: "New Submenu",
                              href: "/dashboard",
                              icon: "FaListUl",
                              permission: "",
                              isVisible: true,
                              order: mainItem.subItems?.length || 0,
                            },
                            isNew: true,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200/60 dark:border-indigo-800/40 transition flex items-center gap-1"
                      >
                        <FaPlus size={10} />
                        <span>+ Submenu</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => setEditingMainMenu({ item: { ...mainItem }, isNew: false })}
                        className="p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Edit Main Menu Info"
                      >
                        <FaEdit />
                      </button>

                      {/* Visibility toggle */}
                      <button
                        type="button"
                        onClick={() => toggleMainMenuVisibility(mainItem.id)}
                        className={`p-2 rounded-xl text-xs font-semibold transition ${
                          mainItem.isVisible !== false
                            ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                        }`}
                        title={mainItem.isVisible !== false ? "Hide menu" : "Show menu"}
                      >
                        {mainItem.isVisible !== false ? <FaEye /> : <FaEyeSlash />}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteMainMenu(mainItem.id)}
                        className="p-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete menu"
                      >
                        <FaTrash />
                      </button>

                      {/* Accordion toggle if group */}
                      {mainItem.isGroup && mainItem.subItems && mainItem.subItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(mainItem.id)}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 ml-1"
                        >
                          <span className="hidden sm:inline">{isExpanded ? "Hide" : "Show"}</span>
                          <FaArrowDown
                            className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            size={10}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submenus List (Nested Accordion) */}
                {mainItem.isGroup && isExpanded && (
                  <div className="border-t border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 sm:p-3">
                    {!mainItem.subItems || mainItem.subItems.length === 0 ? (
                      <div className="text-center p-3 sm:p-4 text-xs text-gray-400">
                        No submenus in this group yet. Click "+ Submenu" to add one!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mainItem.subItems.map((sub, subIndex) => {
                          const isSubFirst = subIndex === 0;
                          const isSubLast = subIndex === mainItem.subItems!.length - 1;

                          return (
                            <div
                              key={sub.id || sub.href}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition ${
                                sub.isVisible !== false
                                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-xs"
                                  : "bg-slate-100/60 dark:bg-slate-900/60 border-dashed border-slate-300 dark:border-white/10 opacity-70"
                              }`}
                            >
                              {/* Left: Reorder, icon, label, link */}
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                {/* Submenu Up / Down */}
                                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => moveSubMenu(mainItem.id, subIndex, "up")}
                                    disabled={isSubFirst}
                                    className={`p-1 rounded text-[11px] transition ${
                                      isSubFirst
                                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        : "text-slate-600 hover:text-indigo-600"
                                    }`}
                                    title="Move Submenu Up"
                                  >
                                    <FaArrowUp />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSubMenu(mainItem.id, subIndex, "down")}
                                    disabled={isSubLast}
                                    className={`p-1 rounded text-[11px] transition ${
                                      isSubLast
                                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        : "text-slate-600 hover:text-indigo-600"
                                    }`}
                                    title="Move Submenu Down"
                                  >
                                    <FaArrowDown />
                                  </button>
                                </div>

                                <span className="text-slate-400 text-xs shrink-0">
                                  {renderMenuIcon(sub.icon)}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {sub.label}
                                    </span>
                                    {!sub.isVisible && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                        Hidden
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-gray-400 truncate max-w-[200px] sm:max-w-none">
                                    {sub.href}
                                  </div>
                                </div>
                              </div>

                              {/* Submenu actions */}
                              <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5 shrink-0">
                                {/* Transfer to another Group Dropdown */}
                                <select
                                  value={mainItem.id}
                                  onChange={(e) => transferSubMenu(mainItem.id, sub.id, e.target.value)}
                                  title="Transfer submenu to another main group"
                                  className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-none flex-1 sm:flex-none max-w-[130px] sm:max-w-[160px] truncate"
                                >
                                  <option value={mainItem.id} disabled>
                                    Move to...
                                  </option>
                                  {menuItems
                                    .filter((m) => m.id !== mainItem.id && m.isGroup)
                                    .map((g) => (
                                      <option key={g.id} value={g.id}>
                                        → {g.label}
                                      </option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Edit Submenu */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSubMenu({
                                        parentGroupId: mainItem.id,
                                        item: { ...sub },
                                        isNew: false,
                                      })
                                    }
                                    className="p-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                    title="Edit submenu"
                                  >
                                    <FaEdit />
                                  </button>

                                  {/* Toggle visibility */}
                                  <button
                                    type="button"
                                    onClick={() => toggleSubMenuVisibility(mainItem.id, sub.id)}
                                    className={`p-1.5 text-xs rounded-lg transition ${
                                      sub.isVisible !== false
                                        ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                    }`}
                                    title={sub.isVisible !== false ? "Hide submenu" : "Show submenu"}
                                  >
                                    {sub.isVisible !== false ? <FaEye /> : <FaEyeSlash />}
                                  </button>

                                  {/* Delete submenu */}
                                  <button
                                    type="button"
                                    onClick={() => deleteSubMenu(mainItem.id, sub.id)}
                                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                    title="Delete submenu"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Edit / Create Main Menu                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingMainMenu && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaSlidersH className="text-indigo-600 shrink-0" />
                <span>{editingMainMenu.isNew ? "Create New Main Menu" : "Edit Main Menu"}</span>
              </h3>
              <button
                onClick={() => setEditingMainMenu(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl text-sm"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Menu Label
                </label>
                <input
                  type="text"
                  value={editingMainMenu.item.label}
                  onChange={(e) =>
                    setEditingMainMenu({
                      ...editingMainMenu,
                      item: { ...editingMainMenu.item, label: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Sales Hub, Inventory..."
                />
              </div>

              {/* Type: Group with submenus or Single link */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Menu Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingMainMenu({
                        ...editingMainMenu,
                        item: { ...editingMainMenu.item, isGroup: true, href: "" },
                      })
                    }
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      editingMainMenu.item.isGroup
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                        : "border-slate-200 dark:border-white/10 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <FaLayerGroup className="shrink-0" />
                    <span className="text-xs">Group with Submenus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingMainMenu({
                        ...editingMainMenu,
                        item: { ...editingMainMenu.item, isGroup: false },
                      })
                    }
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      !editingMainMenu.item.isGroup
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                        : "border-slate-200 dark:border-white/10 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <FaLink className="shrink-0" />
                    <span className="text-xs">Direct Link Only</span>
                  </button>
                </div>
              </div>

              {/* Destination URL if single link */}
              {!editingMainMenu.item.isGroup && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Destination URL (Route)
                  </label>
                  <input
                    type="text"
                    value={editingMainMenu.item.href || ""}
                    onChange={(e) =>
                      setEditingMainMenu({
                        ...editingMainMenu,
                        item: { ...editingMainMenu.item, href: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. /dashboard/sales/invoice"
                  />
                </div>
              )}

              {/* Color Scheme Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <FaPalette className="text-indigo-500 shrink-0" /> Theme Color
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() =>
                        setEditingMainMenu({
                          ...editingMainMenu,
                          item: { ...editingMainMenu.item, color: c.key },
                        })
                      }
                      className={`flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl border transition ${
                        editingMainMenu.item.color === c.key
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${c.bg}`} />
                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate w-full text-center">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Icon
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                    <span>Selected:</span>
                    <span className="text-base">{renderMenuIcon(editingMainMenu.item.icon)}</span>
                  </div>
                </div>

                <div className="relative mb-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search 50+ icons..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 max-h-36 sm:max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
                  {filteredIcons.map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() =>
                        setEditingMainMenu({
                          ...editingMainMenu,
                          item: { ...editingMainMenu.item, icon: ic.name },
                        })
                      }
                      title={ic.label}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition text-sm sm:text-base ${
                        editingMainMenu.item.icon === ic.name
                          ? "bg-indigo-600 text-white shadow-md scale-105"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                      }`}
                    >
                      {ic.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Key */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Permission Gate (Optional)
                </label>
                <input
                  type="text"
                  value={editingMainMenu.item.permission || ""}
                  onChange={(e) =>
                    setEditingMainMenu({
                      ...editingMainMenu,
                      item: { ...editingMainMenu.item, permission: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. sales.view, master.view (Leave blank if visible to all)"
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setEditingMainMenu(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingMainMenu.item.label.trim()) {
                    alert("Please enter a menu label");
                    return;
                  }

                  if (editingMainMenu.isNew) {
                    setMenuItems((prev) => [...prev, editingMainMenu.item]);
                    showToast("New main menu created!");
                  } else {
                    setMenuItems((prev) =>
                      prev.map((item) =>
                        item.id === editingMainMenu.item.id ? editingMainMenu.item : item
                      )
                    );
                    showToast("Menu updated!");
                  }
                  setEditingMainMenu(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 text-center"
              >
                Save Menu Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Edit / Create Submenu                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingSubMenu && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaLink className="text-indigo-600 shrink-0" />
                <span>{editingSubMenu.isNew ? "Add New Submenu" : "Edit Submenu"}</span>
              </h3>
              <button
                onClick={() => setEditingSubMenu(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl text-sm"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Submenu Label
                </label>
                <input
                  type="text"
                  value={editingSubMenu.item.label}
                  onChange={(e) =>
                    setEditingSubMenu({
                      ...editingSubMenu,
                      item: { ...editingSubMenu.item, label: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Invoices List, Create Bill..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Destination URL (Route)
                </label>
                <input
                  type="text"
                  value={editingSubMenu.item.href}
                  onChange={(e) =>
                    setEditingSubMenu({
                      ...editingSubMenu,
                      item: { ...editingSubMenu.item, href: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. /dashboard/sales/invoice"
                />
              </div>

              {/* Icon selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Submenu Icon
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                    <span>Selected:</span>
                    <span className="text-base">{renderMenuIcon(editingSubMenu.item.icon)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
                  {ICON_CATALOG.map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() =>
                        setEditingSubMenu({
                          ...editingSubMenu,
                          item: { ...editingSubMenu.item, icon: ic.name },
                        })
                      }
                      title={ic.label}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition text-xs sm:text-sm ${
                        editingSubMenu.item.icon === ic.name
                          ? "bg-indigo-600 text-white shadow-md scale-105"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                      }`}
                    >
                      {ic.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Key */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Permission Gate (Optional)
                </label>
                <input
                  type="text"
                  value={editingSubMenu.item.permission || ""}
                  onChange={(e) =>
                    setEditingSubMenu({
                      ...editingSubMenu,
                      item: { ...editingSubMenu.item, permission: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. sales.view (Leave blank if visible to all)"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setEditingSubMenu(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingSubMenu.item.label.trim() || !editingSubMenu.item.href.trim()) {
                    alert("Please enter label and destination URL");
                    return;
                  }

                  const parentId = editingSubMenu.parentGroupId;

                  setMenuItems((prev) =>
                    prev.map((group) => {
                      if (group.id !== parentId) return group;
                      const subs = group.subItems ? [...group.subItems] : [];

                      if (editingSubMenu.isNew) {
                        subs.push(editingSubMenu.item);
                      } else {
                        const idx = subs.findIndex((s) => s.id === editingSubMenu.item.id);
                        if (idx >= 0) subs[idx] = editingSubMenu.item;
                      }

                      return { ...group, isGroup: true, subItems: subs };
                    })
                  );

                  showToast(editingSubMenu.isNew ? "Submenu added!" : "Submenu updated!");
                  setEditingSubMenu(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 text-center"
              >
                Save Submenu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Confirm Reset to Default                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {confirmResetModal && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 text-center space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl sm:text-2xl shadow-inner">
              <FaExclamationTriangle />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Reset to Default Template?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                This will delete any custom order, renamed labels, and added links for{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedCompany?.companyName || "selected company"}
                </strong>{" "}
                and restore the canonical CRM navigation layout.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                disabled={resetting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/25 flex items-center justify-center gap-2 text-center"
              >
                {resetting && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Yes, Reset to Default</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
