"use client";

import { ReactNode } from "react";
import { usePermission } from "@/context/PermissionContext";

export default function ProtectedPage({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const perm = usePermission();
  const loading = perm?.loading ?? false;
  const can = perm?.can ? perm.can(permission) : true;

  if (loading) {
    // Keep page layout stable without flashing text
    return <div className="w-full min-h-[400px] opacity-0 pointer-events-none">{children}</div>;
  }

  if (!can) {
    return (
      <div className="card shadow-lg border-0 m-4 rounded-2xl bg-white">
        <div className="card-body text-center p-8">
          <h1 className="text-rose-600 font-extrabold text-5xl mb-2">403</h1>
          <h3 className="font-bold text-slate-800 text-xl mb-1">Access Denied</h3>
          <p className="text-slate-500 text-sm">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}