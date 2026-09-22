import React, { Suspense } from "react";
import AiPurchaseBillEntry from "@/components/purchase/AiPurchaseBillEntry";

export default function AiPurchaseBillEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-center text-slate-500">
          Loading AI Purchase Bill Entry Form...
        </div>
      }
    >
      <AiPurchaseBillEntry />
    </Suspense>
  );
}
