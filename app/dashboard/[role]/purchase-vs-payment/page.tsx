import React from "react";
import PurchaseVsPaymentDashboard from "@/components/purchase-vs-payment/PurchaseVsPaymentDashboard";

export const metadata = {
  title: "Purchase vs Payment Analytics | CRM",
  description: "Deep analytics comparing Purchase Bills vs Payments Made with charts, India Map, supplier insights, and exportable reports.",
};

export default function PurchaseVsPaymentPage() {
  return <PurchaseVsPaymentDashboard />;
}
