"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/super-admin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
      Redirecting to Super Admin Area...
    </div>
  );
}
