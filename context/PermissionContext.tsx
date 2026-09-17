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

const getCachedPermissions = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const cached = localStorage.getItem("mabsol_permissions");
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }
  return [];
};

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<string[]>(() => getCachedPermissions());
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const cachedUser = localStorage.getItem("mabsol_user");
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u.role === "Admin" || u.roleType === "Admin" || u.roleId?.roleName === "Admin") {
          return false;
        }
      } catch {
        // ignore
      }
    }
    return !localStorage.getItem("mabsol_permissions");
  });
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const loadPermissions = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && !hasLoadedRef.current && permissions.length === 0) {
        setLoading(true);
      }
      const res = await fetch("/api/auth/permissions");
      const data = await res.json();

      if (data.success && Array.isArray(data.permissions)) {
        setPermissions((prev) => {
          if (
            prev.length === data.permissions.length &&
            prev.every((p, i) => p === data.permissions[i])
          ) {
            return prev;
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("mabsol_permissions", JSON.stringify(data.permissions));
            } catch {
              // ignore
            }
          }
          return data.permissions;
        });
        hasLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [permissions.length]);

  useEffect(() => {
    const currentUserId = user?._id ? String(user._id) : null;
    if (!hasLoadedRef.current || lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      loadPermissions(true);
    }
  }, [user?._id, loadPermissions]);

  const can = (key: string) => {
    // If the logged-in user is an Admin, grant instant full access
    if (user?.roleType === "Admin" || user?.role === "Admin" || (user?.roleId as any)?.roleName === "Admin") {
      return true;
    }
    if (loading) return false;
    return permissions.includes("*") || permissions.includes(key);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        reload: loadPermissions,
        can,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
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