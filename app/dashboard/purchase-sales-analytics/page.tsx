import React from "react";
import PurchaseSalesDashboard from "@/components/purchase-sales/PurchaseSalesDashboard";

export const metadata = {
  title: "Purchase & Sale Analytics | CRM",
  description: "Exclusive visual graphs and pie charts for Purchase vs Sale condition analytics.",
};




export default function PurchaseSalesAnalyticsPage() {
  return <PurchaseSalesDashboard />;
}
