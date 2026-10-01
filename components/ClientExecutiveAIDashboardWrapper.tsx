"use client";

import dynamic from "next/dynamic";

const ExecutiveAIDashboardContent = dynamic(
  () => import("@/components/ExecutiveAIDashboardContent"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading Executive AI Dashboard...</p>
        </div>
      </div>
    ),
  }
);

export default function ClientExecutiveAIDashboardWrapper() {
  return <ExecutiveAIDashboardContent />;
}
