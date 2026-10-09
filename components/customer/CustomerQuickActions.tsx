"use client";

import Link from "next/link";
import {
  FaEdit,
  FaBook,
  FaFileInvoice,
  FaPlusCircle,
  FaPrint,
  FaArrowLeft,
  FaPaperPlane,
  FaCog,
} from "react-icons/fa";

interface Props {
  customer: any;
  onEditClick?: () => void;
  onSendAlertClick?: () => void;
  onAutoAlertSettingsClick?: () => void;
}

export default function CustomerQuickActions({
  customer,
  onEditClick,
  onSendAlertClick,
  onAutoAlertSettingsClick,
}: Props) {
  const isLimitBreached =
    customer.isCreditLimitExceeded ||
    (Number(customer.CREDIT) > 0 &&
      Number(customer.BALANCE) > Number(customer.CREDIT));

  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/50 shadow-[0_8px_32px_rgba(52,56,114,0.08)] h-full p-4">
      {/* Liquid glass Sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent" />
      <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent blur-xl" />

      <div className="relative z-10 flex flex-col justify-between h-full gap-3">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-white/60 pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Actions</span>
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              <FaArrowLeft size={10} /> Back to List
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {/* 1. Edit Customer & Limits */}
            {/* {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="group relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold overflow-hidden transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/35 hover:-translate-y-0.5 cursor-pointer"
              >
                <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
                <FaEdit size={13} />
                <span>Edit Profile & Limits</span>
              </button>
            )} */}

            {/* 2. Send Alert to Customer */}
            {/* {onSendAlertClick && (
              <button
                type="button"
                onClick={onSendAlertClick}
                className={`group relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold overflow-hidden transition-all duration-300 cursor-pointer ${
                  isLimitBreached
                    ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/40 hover:-translate-y-0.5 animate-pulse"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5"
                }`}
              >
                <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
                <FaPaperPlane size={13} />
                <span>{isLimitBreached ? "Send Credit Alert" : "Send Account Alert"}</span>
              </button>
            )} */}

            {/* 3. Ledger Account */}
            <Link
              href={`/dashboard/customers/ledger/${customer._id}`}
              className="group relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold overflow-hidden transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5"
            >
              <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
              <FaBook size={13} />
              <span>Ledger Account</span>
            </Link>

            {/* 4. Create New Order */}
            <Link
              href={`/dashboard/orders/create?customer=${customer._id}`}
              className="group relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#343872] to-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5"
            >
              <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
              <FaPlusCircle size={13} />
              <span>Create New Order</span>
            </Link>

            {/* 5. Print Profile */}
            <button
              type="button"
              onClick={() => window.print()}
              className="group relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white/80 border border-slate-200/80 shadow-sm hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <FaPrint size={13} className="text-slate-500" />
              <span>Print Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}