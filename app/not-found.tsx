"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiHome, FiCompass } from "react-icons/fi";

export default function NotFound() {
  const router = useRouter();
  const [dashboardHref, setDashboardHref] = useState<string>("/dashboard/admin");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.user) {
          const role =
            data.user.isSuperAdmin || data.user.roleType === "SuperAdmin"
              ? "super-admin"
              : data.user.roleType
              ? String(data.user.roleType).toLowerCase().trim().replace(/[\s_]+/g, "-")
              : "admin";
          setDashboardHref(`/dashboard/${role}`);
        } else {
          setDashboardHref("/login");
        }
      })
      .catch(() => {
        setDashboardHref("/login");
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-slate-800">
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.06); }
        }
        .anim-float {
          animation: floatSlow 3.4s ease-in-out infinite;
        }
        .anim-orbit {
          animation: orbitSpin 14s linear infinite;
        }
        .anim-glow {
          animation: pulseGlow 3.4s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-md text-center">
        {/* Animated 404 Centerpiece */}
        <div className="anim-float flex items-center justify-center gap-2 mb-3 select-none">
          {/* Left '4' */}
          <span className="text-6xl sm:text-7xl font-black tracking-tight bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            4
          </span>

          {/* Animated Center Compass Orb */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center mx-1">
            <div className="anim-glow absolute inset-0 bg-blue-500/20 rounded-full blur-md" />
            <div className="anim-orbit absolute inset-0 border-2 border-dashed border-indigo-400/50 rounded-full" />
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md shadow-blue-500/30 text-white">
              <FiCompass className="w-6 h-6 sm:w-7 sm:h-7 animate-spin [animation-duration:18s]" />
            </div>
          </div>

          {/* Right '4' */}
          <span className="text-6xl sm:text-7xl font-black tracking-tight bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            4
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          The requested page could not be found. It may have been relocated, renamed, or the address might be mistyped.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-98"
          >
            <FiArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            href={dashboardHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-98 text-decoration-none"
          >
            <FiHome className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
