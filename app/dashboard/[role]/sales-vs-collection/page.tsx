import React from "react";
import SalesVsCollectionDashboard from "@/components/sales-vs-collection/SalesVsCollectionDashboard";

export const metadata = {
  title: "Sales Orders vs Collection Analytics | CRM",
  description: "Deep analytics comparing Sales Orders vs Collections with charts, India Map, customer insights, and exportable reports.",
};

export default function SalesVsCollectionPage() {
  return <SalesVsCollectionDashboard />;
}
