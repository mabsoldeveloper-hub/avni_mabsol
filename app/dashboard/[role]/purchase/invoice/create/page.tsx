import React, { Suspense } from "react";
import PurchaseBillForm from "@/components/purchase/PurchaseBillForm";

export default function CreatePurchaseBillPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading purchase bill form...</div>}>
      <PurchaseBillForm />
    </Suspense>
  );
}

