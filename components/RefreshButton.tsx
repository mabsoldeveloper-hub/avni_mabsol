"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    // setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <button 
      onClick={handleRefresh} 
      type="button"
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
    >
      <RefreshCw size={13} className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
      <span>Refresh logs</span>
    </button>
  );
}

