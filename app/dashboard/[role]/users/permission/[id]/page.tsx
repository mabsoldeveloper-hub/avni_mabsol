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
// Module -> icon / accent color mapping
// -------------------------------------------------------

const MODULE_STYLES: Record<
  string,
  { icon: any; accent: string }
> = {
  DASHBOARD: {
    icon: FaTachometerAlt,
    accent: "blue",
  },

  USERS: {
    icon: FaUsers,
    accent: "violet",
  },

  INVENTORY: {
    icon: FaBoxes,
    accent: "sky",
  },

  SALES: {
    icon: FaShoppingCart,
    accent: "amber",
  },

  CUSTOMER: {
    icon: FaBuilding,
    accent: "emerald",
  },

  COMPANY: {
    icon: FaBuilding,
    accent: "orange",
  },

  "FINANCIAL YEAR": {
    icon: FaCalendarAlt,
    accent: "teal",
  },

  "DATA MIGRATION": {
    icon: FaExchangeAlt,
    accent: "rose",
  },

  REPORTS: {
    icon: FaChartBar,
    accent: "orange",
  },

  SETTINGS: {
    icon: FaCog,
    accent: "slate",
  },

  VFP: {
    icon: FaSyncAlt,
    accent: "cyan",
  },
};

const DEFAULT_STYLE = {
  icon: FaLayerGroup,
  accent: "slate",
};

const ACCENT: Record<
  string,
  {
    chipBg: string;
    chipText: string;
    iconBg: string;
    iconText: string;
    ring: string;
  }
> = {
  blue: {
    chipBg: "bg-blue-50",
    chipText: "text-blue-700",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    ring: "focus:ring-blue-500",
  },

  violet: {
    chipBg: "bg-violet-50",
    chipText: "text-violet-700",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    ring: "focus:ring-violet-500",
  },

  sky: {
    chipBg: "bg-sky-50",
    chipText: "text-sky-700",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    ring: "focus:ring-sky-500",
  },

  amber: {
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    ring: "focus:ring-amber-500",
  },

  emerald: {
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    ring: "focus:ring-emerald-500",
  },

  orange: {
    chipBg: "bg-orange-50",
    chipText: "text-orange-700",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    ring: "focus:ring-orange-500",
  },

  teal: {
    chipBg: "bg-teal-50",
    chipText: "text-teal-700",
    iconBg: "bg-teal-100",
    iconText: "text-teal-600",
    ring: "focus:ring-teal-500",
  },

  rose: {
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    ring: "focus:ring-rose-500",
  },

  slate: {
    chipBg: "bg-slate-100",
    chipText: "text-slate-700",
    iconBg: "bg-slate-200",
    iconText: "text-slate-600",
    ring: "focus:ring-slate-500",
  },

  cyan: {
    chipBg: "bg-cyan-50",
    chipText: "text-cyan-700",
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
    ring: "focus:ring-cyan-500",
  },
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function getPermissionId(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }
  }

  return null;
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default function UserPermissionPage() {
  const { id } = useParams();

  const userId = Array.isArray(id)
    ? id[0]
    : String(id || "");

  const [permissions, setPermissions] = useState<any[]>([]);

  /*
   * checked = permissions explicitly ON
   */
  const [checked, setChecked] = useState<string[]>([]);

  /*
   * initialChecked = state after last successful save
   */
  const [initialChecked, setInitialChecked] = useState<string[]>(
    []
  );

  /*
   * Explicit user-level permission state.
   *
   * true  = allow
   * false = deny
   *
   * We maintain this separately so role permissions can
   * eventually be overridden by user-level deny.
   */
  const [userPermissionState, setUserPermissionState] =
    useState<Record<string, boolean>>({});

  const [initialPermissionState, setInitialPermissionState] =
    useState<Record<string, boolean>>({});

  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  const [saveMessage, setSaveMessage] = useState("");

  // -------------------------------------------------------
  // Load all permissions
  // -------------------------------------------------------

  const loadPermissions = async () => {
    try {
      const res = await fetch("/api/permissions", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load permissions");
      }

      const data = await res.json();

      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("LOAD PERMISSIONS ERROR:", error);
      setPermissions([]);
    }
  };

  // -------------------------------------------------------
  // Load user's explicit permissions
  // -------------------------------------------------------

  const loadUserPermissions = async () => {
    try {
      const res = await fetch(
        `/api/user-permissions/${userId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load user permissions");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setChecked([]);
        setInitialChecked([]);
        setUserPermissionState({});
        setInitialPermissionState({});
        return;
      }

      const nextState: Record<string, boolean> = {};

      const checkedIds: string[] = [];

      data.forEach((item: any) => {
        /*
         * API may return:
         *
         * permissionId: "abc"
         *
         * OR populated:
         *
         * permissionId: {
         *   _id: "abc",
         *   permissionName: "..."
         * }
         */

        const permissionId = getPermissionId(
          item.permissionId
        );

        if (!permissionId) return;

        const allow = item.allow === true;

        nextState[permissionId] = allow;

        if (allow) {
          checkedIds.push(permissionId);
        }
      });

      setUserPermissionState(nextState);

      setInitialPermissionState({
        ...nextState,
      });

      setChecked(checkedIds);

      setInitialChecked([...checkedIds]);
    } catch (error) {
      console.error(
        "LOAD USER PERMISSIONS ERROR:",
        error
      );

      setChecked([]);
      setInitialChecked([]);
      setUserPermissionState({});
      setInitialPermissionState({});
    }
  };

  // -------------------------------------------------------
  // Initial load
  // -------------------------------------------------------

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);

      try {
        await Promise.all([
          loadPermissions(),
          loadUserPermissions(),
        ]);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -------------------------------------------------------
  // Toggle single permission
  // -------------------------------------------------------

  const togglePermission = (permissionId: string) => {
    setSaveMessage("");

    setChecked((prev) => {
      const exists = prev.includes(permissionId);

      if (exists) {
        return prev.filter(
          (x) => x !== permissionId
        );
      }

      return [...prev, permissionId];
    });

    setUserPermissionState((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
  };

  // -------------------------------------------------------
  // Module checked state
  // -------------------------------------------------------

  const isModuleFullyChecked = (
    modulePermissions: any[]
  ) => {
    if (!modulePermissions.length) return false;

    return modulePermissions.every((permission) =>
      checked.includes(
        String(permission._id)
      )
    );
  };

  // -------------------------------------------------------
  // Module partial state
  // -------------------------------------------------------

  const isModulePartiallyChecked = (
    modulePermissions: any[]
  ) => {
    if (!modulePermissions.length) return false;

    const selectedCount = modulePermissions.filter(
      (permission) =>
        checked.includes(
          String(permission._id)
        )
    ).length;

    return (
      selectedCount > 0 &&
      selectedCount < modulePermissions.length
    );
  };

  // -------------------------------------------------------
  // Toggle complete module
  // -------------------------------------------------------

  const toggleModule = (
    modulePermissions: any[]
  ) => {
    setSaveMessage("");

    const moduleIds = modulePermissions.map(
      (permission) =>
        String(permission._id)
    );

    const allChecked =
      isModuleFullyChecked(modulePermissions);

    if (allChecked) {
      // Turn OFF entire module
      setChecked((prev) =>
        prev.filter(
          (permissionId) =>
            !moduleIds.includes(permissionId)
        )
      );

      setUserPermissionState((prev) => {
        const next = { ...prev };

        moduleIds.forEach((permissionId) => {
          next[permissionId] = false;
        });

        return next;
      });
    } else {
      // Turn ON entire module
      setChecked((prev) =>
        Array.from(
          new Set([
            ...prev,
            ...moduleIds,
          ])
        )
      );

      setUserPermissionState((prev) => {
        const next = { ...prev };

        moduleIds.forEach((permissionId) => {
          next[permissionId] = true;
        });

        return next;
      });
    }
  };

  // -------------------------------------------------------
  // Select all
  // -------------------------------------------------------

  const isAllChecked =
    permissions.length > 0 &&
    permissions.every((permission) =>
      checked.includes(
        String(permission._id)
      )
    );

  const toggleAll = () => {
    setSaveMessage("");

    const allIds = permissions.map(
      (permission) =>
        String(permission._id)
    );

    if (isAllChecked) {
      // Turn everything OFF
      setChecked([]);

      const next: Record<string, boolean> = {};

      allIds.forEach((permissionId) => {
        next[permissionId] = false;
      });

      setUserPermissionState(next);
    } else {
      // Turn everything ON
      setChecked(allIds);

      const next: Record<string, boolean> = {};

      allIds.forEach((permissionId) => {
        next[permissionId] = true;
      });

      setUserPermissionState(next);
    }
  };

  // -------------------------------------------------------
  // SAVE
  // -------------------------------------------------------

  const savePermissions = async () => {
    if (!userId) {
      setSaveMessage("Invalid user.");
      return;
    }

    setLoading(true);
    setSaveMessage("");

    try {
      /*
       * IMPORTANT:
       *
       * Save EVERY permission, not only checked ones.
       *
       * Checked:
       *   allow: true
       *
       * Unchecked:
       *   allow: false
       *
       * This is what allows a user's permission to
       * override a permission inherited from their role.
       */

      const permissionsData = permissions.map(
        (permission: any) => {
          const permissionId = String(
            permission._id
          );

          return {
            userId,
            permissionId,
            allow:
              userPermissionState[
                permissionId
              ] === true,
          };
        }
      );

      const res = await fetch(
        "/api/user-permissions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            userId,
            permissions:
              permissionsData,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Failed to save permissions"
        );
      }

      /*
       * Save successful.
       * Current state becomes the new baseline.
       */

      setInitialChecked([
        ...checked,
      ]);

      setInitialPermissionState({
        ...userPermissionState,
      });

      setSaveMessage(
        "Permissions saved successfully."
      );
    } catch (error: any) {
      console.error(
        "SAVE USER PERMISSIONS ERROR:",
        error
      );

      setSaveMessage(
        error?.message ||
          "Failed to save permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // Reset / Discard
  // -------------------------------------------------------

  const resetChanges = () => {
    setChecked([
      ...initialChecked,
    ]);

    setUserPermissionState({
      ...initialPermissionState,
    });

    setSaveMessage("");
  };

  // -------------------------------------------------------
  // Group permissions by module
  // -------------------------------------------------------

  const grouped = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase();

    return permissions.reduce(
      (
        acc: Record<string, any[]>,
        item: any
      ) => {
        const permissionName =
          String(
            item.permissionName || ""
          );

        const moduleName =
          String(
            item.moduleName ||
              "OTHER"
          );

        if (
          q &&
          !permissionName
            .toLowerCase()
            .includes(q)
        ) {
          return acc;
        }

        if (!acc[moduleName]) {
          acc[moduleName] = [];
        }

        acc[moduleName].push(item);

        return acc;
      },
      {}
    );
  }, [permissions, query]);

  const moduleNames =
    Object.keys(grouped).sort();

  const hasResults =
    moduleNames.length > 0;

  // -------------------------------------------------------
  // Detect changes
  // -------------------------------------------------------

  const hasUnsavedChanges = useMemo(() => {
    if (
      checked.length !==
      initialChecked.length
    ) {
      return true;
    }

    const currentChecked =
      [...checked].sort();

    const savedChecked =
      [...initialChecked].sort();

    for (
      let i = 0;
      i < currentChecked.length;
      i++
    ) {
      if (
        currentChecked[i] !==
        savedChecked[i]
      ) {
        return true;
      }
    }

    const currentKeys = Object.keys(
      userPermissionState
    );

    const initialKeys = Object.keys(
      initialPermissionState
    );

    if (
      currentKeys.length !==
      initialKeys.length
    ) {
      return true;
    }

    const allKeys = Array.from(
      new Set([
        ...currentKeys,
        ...initialKeys,
      ])
    );

    for (const key of allKeys) {
      if (
        Boolean(
          userPermissionState[key]
        ) !==
        Boolean(
          initialPermissionState[key]
        )
      ) {
        return true;
      }
    }

    return false;
  }, [
    checked,
    initialChecked,
    userPermissionState,
    initialPermissionState,
  ]);

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}

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
              {checked.length} of{" "}
              {permissions.length}{" "}
              permissions granted
            </p>
          </div>

        </div>

        <div className="flex items-center gap-3">

          {/* SEARCH */}

          <div className="relative">

            <FaSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={12}
            />

            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Filter permissions"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-56"
            />

          </div>

          {/* SELECT ALL */}

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

      {/* BODY */}

      <div className="space-y-3 p-5 pb-24">

        {/* LOADING */}

        {initialLoading && (
          <div className="space-y-3">

            {[0, 1, 2].map(
              (i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-slate-100"
                />
              )
            )}

          </div>
        )}

        {/* NO RESULTS */}

        {!initialLoading &&
          !hasResults && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No permissions match "
              {query}".
            </div>
          )}

        {/* MODULES */}

        {!initialLoading &&
          moduleNames.map(
            (module) => {
              const modulePermissions =
                grouped[module];

              const style =
                MODULE_STYLES[
                  module
                ] ??
                DEFAULT_STYLE;

              const colors =
                ACCENT[
                  style.accent
                ];

              const Icon =
                style.icon;

              const moduleChecked =
                isModuleFullyChecked(
                  modulePermissions
                );

              const modulePartial =
                isModulePartiallyChecked(
                  modulePermissions
                );

              const selectedCount =
                modulePermissions.filter(
                  (permission) =>
                    checked.includes(
                      String(
                        permission._id
                      )
                    )
                ).length;

              return (
                <div
                  key={module}
                  className="overflow-hidden rounded-lg border border-slate-200"
                >

                  {/* MODULE HEADER */}

                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">

                    <div className="flex items-center gap-2.5">

                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md ${colors.iconBg}`}
                      >
                        <Icon
                          className={
                            colors.iconText
                          }
                          size={13}
                        />
                      </div>

                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {module}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.chipBg} ${colors.chipText}`}
                      >
                        {selectedCount}/
                        {
                          modulePermissions.length
                        }
                      </span>

                    </div>

                    <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-500">

                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        checked={
                          moduleChecked
                        }
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              modulePartial;
                          }
                        }}
                        onChange={() =>
                          toggleModule(
                            modulePermissions
                          )
                        }
                      />

                      Select all

                    </label>

                  </div>

                  {/* PERMISSION CHECKBOXES */}

                  <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-4 py-3.5 sm:grid-cols-2 md:grid-cols-3">

                    {modulePermissions.map(
                      (
                        permission: any
                      ) => {

                        const permissionId =
                          String(
                            permission._id
                          );

                        return (
                          <label
                            key={
                              permissionId
                            }
                            className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700"
                          >

                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                              checked={checked.includes(
                                permissionId
                              )}
                              onChange={() =>
                                togglePermission(
                                  permissionId
                                )
                              }
                            />

                            {
                              permission.permissionName
                            }

                          </label>
                        );
                      }
                    )}

                  </div>

                </div>
              );
            }
          )}

      </div>

      {/* SAVE BAR */}

      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">

        <div className="flex flex-col">

          <span className="text-xs text-slate-500">

            {hasUnsavedChanges
              ? "You have unsaved changes"
              : "All changes saved"}

          </span>

          {saveMessage && (
            <span
              className={`mt-1 text-xs ${
                saveMessage.includes(
                  "successfully"
                )
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {saveMessage}
            </span>
          )}

        </div>

        <div className="flex items-center gap-2">

          {hasUnsavedChanges && (
            <button
              onClick={
                resetChanges
              }
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Discard
            </button>
          )}

          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              loading ||
              !hasUnsavedChanges
            }
            onClick={
              savePermissions
            }
          >
            {loading
              ? "Saving…"
              : "Save permissions"}
          </button>

        </div>

      </div>

    </div>
  );
}