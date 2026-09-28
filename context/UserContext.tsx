"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { SESSION_CHECK_INTERVAL_MS } from "@/lib/constants/session.constant";

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mabsol_user");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return !localStorage.getItem("mabsol_user");
      } catch {}
    }
    return true;
  });
  const loadStarted = useRef(false);
  const userRef = useRef<any>(null);
  userRef.current = user;

  const logoutAndRedirect = useCallback(async (isSuspended = false) => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("mabsol_user");
      localStorage.removeItem("mabsol_permissions");
      if (window.location.pathname.startsWith("/dashboard")) {
        window.location.href = isSuspended ? "/login?suspended=1" : "/login";
      }
    }
  }, []);

  // const loadUser = useCallback(async (isBackground = false) => {
  //   try {
  //     const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
  //       cache: "no-store",
  //       headers: {
  //         "Cache-Control": "no-cache",
  //       },
  //     });

  //     if (res.status === 401 || res.status === 403) {
  //       let isSuspended = false;
  //       try {
  //         const errData = await res.json();
  //         if (errData.suspended || errData.expired) isSuspended = true;
  //       } catch {}

  //       setUser(null);
  //       if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
  //         await logoutAndRedirect(isSuspended);
  //       }
  //       return;
  //     }

  //     if (!res.ok) {
  //       // Transient network or server error: do not force logout during background check
  //       return;
  //     }

  //     const data = await res.json();

  //     if (res.ok && data.success && data.user) {
  //       setUser((prev: any) => {
  //         // Compare essential fields to prevent unnecessary reference re-renders
  //         if (
  //           prev &&
  //           prev._id === data.user._id &&
  //           prev.email === data.user.email &&
  //           prev.role === data.user.role &&
  //           prev.roleType === data.user.roleType &&
  //           prev.name === data.user.name &&
  //           String(prev.companyId) === String(data.user.companyId) &&
  //           prev.updatedAt === data.user.updatedAt
  //         ) {
  //           return prev; // Same reference -> NO re-render!
  //         }
  //         if (typeof window !== "undefined") {
  //           try {
  //             localStorage.setItem("mabsol_user", JSON.stringify(data.user));
  //           } catch {}
  //         }
  //         return data.user;
  //       });
  //     } else {
  //       if (!isBackground) {
  //         setUser(null);
  //         if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
  //           await logoutAndRedirect();
  //         }
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Failed to load user:", err);
  //     if (!isBackground && !userRef.current) {
  //       setUser(null);
  //       if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
  //         await logoutAndRedirect();
  //       }
  //     }
  //   } finally {
  //     if (!isBackground) {
  //       setLoading(false);
  //     }
  //   }
  // }, [logoutAndRedirect]);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      console.log("me api",data);
      
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem("mabsol_user", JSON.stringify(data.user));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    // if (loadStarted.current) return;
    // loadStarted.current = true;
    loadUser();
  }, [loadUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        reload: () => loadUser(),
        logout: logoutAndRedirect,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
