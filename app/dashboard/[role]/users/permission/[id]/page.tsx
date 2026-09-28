"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaShieldAlt,
  FaSearch,
  FaBoxes,
  FaUsers,
  FaShoppingCart,
  FaBuilding,
  FaCalendarAlt,
  FaExchangeAlt,
  FaChartBar,
  FaCog,
  FaTachometerAlt,
  FaSyncAlt,
  FaLayerGroup,
} from "react-icons/fa";

// -------------------------------------------------------
// Module -> icon / accent color mapping.
// Colors echo the sidebar's own icon colors so this page
// reads as part of the same product, not a bolted-on screen.
// -------------------------------------------------------
const MODULE_STYLES: Record<string, { icon: any; accent: string }> = {
  DASHBOARD: { icon: FaTachometerAlt, accent: "blue" },
  USERS: { icon: FaUsers, accent: "violet" },
  INVENTORY: { icon: FaBoxes, accent: "sky" },
  SALES: { icon: FaShoppingCart, accent: "amber" },
  CUSTOMER: { icon: FaBuilding, accent: "emerald" },
  COMPANY: { icon: FaBuilding, accent: "orange" },
  "FINANCIAL YEAR": { icon: FaCalendarAlt, accent: "teal" },
  "DATA MIGRATION": { icon: FaExchangeAlt, accent: "rose" },
  REPORTS: { icon: FaChartBar, accent: "orange" },
  SETTINGS: { icon: FaCog, accent: "slate" },
  VFP: { icon: FaSyncAlt, accent: "cyan" },
};

const DEFAULT_STYLE = { icon: FaLayerGroup, accent: "slate" };

const ACCENT: Record<
  string,
  { chipBg: string; chipText: string; iconBg: string; iconText: string; ring: string }
> = {
  blue: { chipBg: "bg-blue-50", chipText: "text-blue-700", iconBg: "bg-blue-100", iconText: "text-blue-600", ring: "focus:ring-blue-500" },
  violet: { chipBg: "bg-violet-50", chipText: "text-violet-700", iconBg: "bg-violet-100", iconText: "text-violet-600", ring: "focus:ring-violet-500" },
  sky: { chipBg: "bg-sky-50", chipText: "text-sky-700", iconBg: "bg-sky-100", iconText: "text-sky-600", ring: "focus:ring-sky-500" },
  amber: { chipBg: "bg-amber-50", chipText: "text-amber-700", iconBg: "bg-amber-100", iconText: "text-amber-600", ring: "focus:ring-amber-500" },
  emerald: { chipBg: "bg-emerald-50", chipText: "text-emerald-700", iconBg: "bg-emerald-100", iconText: "text-emerald-600", ring: "focus:ring-emerald-500" },
  orange: { chipBg: "bg-orange-50", chipText: "text-orange-700", iconBg: "bg-orange-100", iconText: "text-orange-600", ring: "focus:ring-orange-500" },
  teal: { chipBg: "bg-teal-50", chipText: "text-teal-700", iconBg: "bg-teal-100", iconText: "text-teal-600", ring: "focus:ring-teal-500" },
  rose: { chipBg: "bg-rose-50", chipText: "text-rose-700", iconBg: "bg-rose-100", iconText: "text-rose-600", ring: "focus:ring-rose-500" },
  slate: { chipBg: "bg-slate-100", chipText: "text-slate-700", iconBg: "bg-slate-200", iconText: "text-slate-600", ring: "focus:ring-slate-500" },
  cyan: { chipBg: "bg-cyan-50", chipText: "text-cyan-700", iconBg: "bg-cyan-100", iconText: "text-cyan-600", ring: "focus:ring-cyan-500" },
};

export default function UserPermissionPage() {
  const { id } = useParams();

  const [permissions, setPermissions] = useState<any[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [initialChecked, setInitialChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      await Promise.all([loadPermissions(), loadUserPermissions()]);
      setInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = async () => {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    setPermissions(data);
  };

  const loadUserPermissions = async () => {
    const res = await fetch(`/api/user-permissions/${id}`);
    const data = await res.json();
    const arr = data.map((x: any) => x.permissionId).filter(Boolean);
    setChecked(arr);
    setInitialChecked(arr);
  };

  const togglePermission = (permissionId: string) => {
    setChecked((prev) =>
      prev.includes(permissionId)
        ? prev.filter((x) => x !== permissionId)
        : [...prev, permissionId]
    );
  };

  const isModuleFullyChecked = (modulePermissions: any[]) =>
    modulePermissions.every((p) => checked.includes(p._id));

  const isModulePartiallyChecked = (modulePermissions: any[]) =>
    modulePermissions.some((p) => checked.includes(p._id)) &&
    !isModuleFullyChecked(modulePermissions);

  const toggleModule = (modulePermissions: any[]) => {
    const moduleIds = modulePermissions.map((p) => p._id);
    const allChecked = isModuleFullyChecked(modulePermissions);
    if (allChecked) {
      setChecked((prev) => prev.filter((id) => !moduleIds.includes(id)));
    } else {
      setChecked((prev) => Array.from(new Set([...prev, ...moduleIds])));
    }
  };

  const isAllChecked =
    permissions.length > 0 && permissions.every((p) => checked.includes(p._id));

  const toggleAll = () => {
    setChecked(isAllChecked ? [] : permissions.map((p) => p._id));
  };

  const savePermissions = async () => {
    setLoading(true);
    const permissionsData = checked.map((pid) => ({
      userId: id,
      permissionId: pid,
      allow: true,
    }));

    try {
      await fetch("/api/user-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, permissions: permissionsData }),
      });
      setInitialChecked(checked);
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => setChecked(initialChecked);

  // Group by module, applying the search filter to individual permissions
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permissions.reduce((acc: Record<string, any[]>, item: any) => {
      if (q && !item.permissionName.toLowerCase().includes(q)) return acc;
      if (!acc[item.moduleName]) acc[item.moduleName] = [];
      acc[item.moduleName].push(item);
      return acc;
    }, {});
  }, [permissions, query]);

  const moduleNames = Object.keys(grouped).sort();
  const hasResults = moduleNames.length > 0;
  const hasUnsavedChanges =
    checked.length !== initialChecked.length ||
    checked.some((c) => !initialChecked.includes(c));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <FaShieldAlt size={15} />
          </div>
          <div>
            <h5 className="m-0 text-sm font-semibold text-slate-900">
              User permissions
            </h5>
            <p className="m-0 text-xs text-slate-500">
              {checked.length} of {permissions.length} permissions granted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter permissions"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-56"
            />
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              checked={isAllChecked}
              onChange={toggleAll}
            />
            Select all
          </label>
        </div>
      </div>

      {/* body */}
      <div className="space-y-3 p-5 pb-24">
        {initialLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        )}

        {!initialLoading && !hasResults && (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            No permissions match "{query}".
          </div>
        )}

        {!initialLoading &&
          moduleNames.map((module) => {
            const modulePermissions = grouped[module];
            const style = MODULE_STYLES[module] ?? DEFAULT_STYLE;
            const colors = ACCENT[style.accent];
            const Icon = style.icon;
            const moduleChecked = isModuleFullyChecked(modulePermissions);
            const modulePartial = isModulePartiallyChecked(modulePermissions);
            const selectedCount = modulePermissions.filter((p) =>
              checked.includes(p._id)
            ).length;

            return (
              <div
                key={module}
                className="overflow-hidden rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${colors.iconBg}`}>
                      <Icon className={colors.iconText} size={13} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {module}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.chipBg} ${colors.chipText}`}>
                      {selectedCount}/{modulePermissions.length}
                    </span>
                  </div>

                  <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      checked={moduleChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = modulePartial;
                      }}
                      onChange={() => toggleModule(modulePermissions)}
                    />
                    Select all
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-4 py-3.5 sm:grid-cols-2 md:grid-cols-3">
                  {modulePermissions.map((permission: any) => (
                    <label
                      key={permission._id}
                      className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        checked={checked.includes(permission._id)}
                        onChange={() => togglePermission(permission._id)}
                      />
                      {permission.permissionName}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* sticky save bar */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <span className="text-xs text-slate-500">
          {hasUnsavedChanges ? "You have unsaved changes" : "All changes saved"}
        </span>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={resetChanges}
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !hasUnsavedChanges}
            onClick={savePermissions}
          >
            {loading ? "Saving…" : "Save permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}