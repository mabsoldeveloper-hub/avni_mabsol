"use client";

import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <h5 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h5>

      <div className="flex flex-col gap-2.5">
        <Link
          href="/users/create"
          className="text-center px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs border border-blue-600"
        >
          Add User
        </Link>

        <Link
          href="/customers/create"
          className="text-center px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs border border-emerald-600"
        >
          Add Customer
        </Link>

        <Link
          href="/leads/create"
          className="text-center px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs border border-amber-500"
        >
          Add Lead
        </Link>
      </div>
    </div>
  );
}