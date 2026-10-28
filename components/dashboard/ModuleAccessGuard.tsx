"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useCompany } from "@/context/CompanyContext";
import { getRequiredModuleForPath, isModuleAllowedForUser, isAllowedSuperAdminPath } from "@/lib/moduleAccess";
import { checkIsSuperAdmin } from "@/lib/constants/superAdmin.constant";
import { FaBan, FaArrowLeft, FaSync, FaShieldAlt, FaLock, FaBuilding } from "react-icons/fa";

export default function ModuleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loadUser, loading: userLoading } = useUser();
  const { selectedCompany, loading: companyLoading } = useCompany();
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = checkIsSuperAdmin(user);
  const isSuperAdminPath = isAllowedSuperAdminPath(pathname || "");

  // Auto-redirect Super Admin away from tenant operational pages directly to Super Admin Dashboard
  useEffect(() => {
    if (!userLoading && isSuperAdmin && !isSuperAdminPath) {
      router.replace("/dashboard/super-admin/dashboard");
    }
  }, [userLoading, isSuperAdmin, isSuperAdminPath, router]);

  // Loading state while verifying user credentials
  if (userLoading) {
    return (
      <div className="w-full min-h-[50vh] flex items-center justify-center p-6 text-slate-400">
        <FaSync className="animate-spin text-xl text-indigo-600" />
      </div>
    );
  }

  // 1. SUPER ADMIN SECURITY BOUNDARY:
  // Super Administrator is restricted strictly to platform governance routes.
  // When opening any normal tenant operational page, automatically redirect to the Super Admin Dashboard.
  if (isSuperAdmin) {
    if (!isSuperAdminPath) {
      return (
        <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 text-slate-400 gap-2.5 animate-in fade-in duration-150">
          <FaSync className="animate-spin text-xl text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500">Redirecting to Super Admin Dashboard...</span>
        </div>
      );
    }
    return <>{children}</>;
  }

  // 2. NON-SUPER ADMIN SECURITY BOUNDARY:
  // Non-super-admin accounts cannot access any /super-admin route.
  if (!isSuperAdmin && (pathname || "").toLowerCase().includes("/super-admin")) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-100 to-red-100 text-rose-600 border border-rose-200 flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-sm">
            <FaLock />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              <FaShieldAlt size={11} /> Platform Privilege Required
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Access Denied: Super Admin Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              You do not have Super Administrator privileges to view platform governance consoles.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaArrowLeft size={10} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  const requiredModule = getRequiredModuleForPath(pathname || "");

  // If path doesn't require specific module, allow
  if (!requiredModule) {
    return <>{children}</>;
  }

  const isAllowed = isModuleAllowedForUser(user, selectedCompany, requiredModule.id);

  if (!isAllowed) {
    const handleRecheck = async () => {
      setRefreshing(true);
      try {
        if (typeof loadUser === "function") {
          await loadUser();
        }
      } catch (err) {
        console.error("Recheck permissions error:", err);
      } finally {
        setTimeout(() => setRefreshing(false), 800);
      }
    };

    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-100 to-red-100 text-rose-600 border border-rose-200 flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-sm">
            <FaLock />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              <FaShieldAlt size={11} /> Module Access Restricted
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Access Denied: {requiredModule.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Your account or active branch does not have permission to open the{" "}
              <strong className="text-slate-800">{requiredModule.name}</strong> module.
              Access to this page has been stopped or revoked by the Super Administrator.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 max-w-md mx-auto space-y-1">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Attempted Route:</span>
              <span className="text-slate-700 truncate max-w-[220px]">{pathname}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Required Privilege:</span>
              <span className="font-bold text-rose-700">{requiredModule.id}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaArrowLeft size={10} />
              <span>Return to Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleRecheck}
              disabled={refreshing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaSync size={11} className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Checking..." : "Recheck Permissions"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
