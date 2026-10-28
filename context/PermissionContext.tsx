"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import { useUser } from "./UserContext";

const PermissionContext = createContext<any>(null);

const getUserId = (user: any): string | null => {
  if (!user?._id) return null;
  return String(user._id);
};

const getPermissionStorageKey = (userId: string | null) => {
  if (!userId) return null;
  return `mabsol_permissions_${userId}`;
};

const getCachedPermissions = (userId: string | null): string[] => {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  try {
    const key = getPermissionStorageKey(userId);

    if (!key) return [];

    const cached = localStorage.getItem(key);

    if (!cached) return [];

    const parsed = JSON.parse(cached);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isAdminUser = (user: any) => {
  if (!user) return false;

  return (
    user.roleType === "SuperAdmin" ||
    user.role === "SuperAdmin" ||
    user.isSuperAdmin === true ||
    user.email?.toLowerCase() === "mabsoldeveloper@gmail.com" ||
    user.roleType === "Admin" ||
    user.role === "Admin" ||
    user.roleId?.roleName === "Admin"
  );
};

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();

  const userId = getUserId(user);

  const [permissions, setPermissions] = useState<string[]>(() =>
    getCachedPermissions(userId)
  );

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }

    if (isAdminUser(user)) {
      return false;
    }

    if (!userId) {
      return false;
    }

    return getCachedPermissions(userId).length === 0;
  });

  const lastUserIdRef = useRef<string | null>(null);

  const loadingRef = useRef(false);

  /**
   * Load fresh permissions from server.
   *
   * Important:
   * We intentionally do NOT trust localStorage as the
   * final permission source.
   *
   * localStorage is only used for temporary UI cache.
   */
  const loadPermissions = useCallback(
    async (showLoading = true) => {
      if (!userId) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Prevent duplicate simultaneous requests.
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const res = await fetch("/api/auth/permissions", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        const data = await res.json();

        if (data.success && Array.isArray(data.permissions)) {
          const freshPermissions = data.permissions;

          setPermissions(freshPermissions);

          /**
           * Save cache against CURRENT USER only.
           */
          if (typeof window !== "undefined") {
            try {
              const key = getPermissionStorageKey(userId);

              if (key) {
                localStorage.setItem(
                  key,
                  JSON.stringify(freshPermissions)
                );
              }

              /**
               * Remove old global permission cache.
               *
               * This prevents old versions of the application
               * from continuing to use:
               * mabsol_permissions
               */
              localStorage.removeItem("mabsol_permissions");
            } catch {
              // Ignore localStorage errors.
            }
          }
        } else {
          /**
           * If API returns an unsuccessful response,
           * do not blindly keep another user's permissions.
           */
          setPermissions([]);
        }
      } catch (error) {
        console.error(
          "Failed to load permissions:",
          error
        );

        /**
         * On network/API failure we can use the CURRENT
         * user's cache only.
         *
         * Never use the old global cache.
         */
        const cached = getCachedPermissions(userId);

        setPermissions(cached);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * When user changes:
   *
   * User A logout
   * User B login
   *
   * User A permissions must immediately disappear.
   */
  useEffect(() => {
    if (lastUserIdRef.current === userId) {
      return;
    }

    lastUserIdRef.current = userId;

    /**
     * No logged-in user.
     */
    if (!userId) {
      setPermissions([]);
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    /**
     * IMPORTANT:
     * Clear previous user's permissions immediately.
     *
     * This prevents a short period where User B sees
     * User A's permissions.
     */
    setPermissions([]);

    /**
     * Admin does not need permission loading for access,
     * but loading the server permissions is still useful
     * for keeping the context synchronized.
     */
    loadPermissions(false);
  }, [userId, loadPermissions]);

  /**
   * Check permission.
   */
  const can = useCallback(
    (key: string) => {
      /**
       * Admin / SuperAdmin bypass.
       */
      if (isAdminUser(user)) {
        return true;
      }

      /**
       * While permissions are loading, don't allow
       * protected actions accidentally.
       */
      if (loading) {
        return false;
      }

      /**
       * Wildcard permission.
       */
      if (permissions.includes("*")) {
        return true;
      }

      return permissions.includes(key);
    },
    [user, loading, permissions]
  );

  /**
   * Reload permissions manually.
   *
   * Useful after changing permissions from the
   * User Permission management screen.
   */
  const reload = useCallback(async () => {
    await loadPermissions(true);
  }, [loadPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        reload,
        can,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);

  /**
   * Safe fallback when provider is not available.
   */
  if (!context) {
    return {
      permissions: [],
      loading: false,
      reload: async () => {},
      can: (_key: string) => true,
    };
  }

  return context;
}