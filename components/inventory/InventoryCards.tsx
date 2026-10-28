"use client";

import Link from "next/link";
import {
  FaBoxes,
  FaWarehouse,
  FaExclamationTriangle,
  FaTimesCircle,
  FaBuilding,
  FaRupeeSign,
  FaLayerGroup,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";

export default function InventoryCards({
  summary,
  role = "admin",
  activeFilter,
  onCardClick,
}: {
  summary: any;
  role?: string;
  activeFilter?: string;
  onCardClick?: (filterKey: string) => void;
}) {
  const cards = [
    {
      title: "Products",
      filterKey: "all",
      value: summary?.totalProducts ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=all`,
      icon: <FaBoxes size={16} />,
      ring: "from-blue-400/40 to-indigo-500/40",
      iconBg: "bg-blue-500/15 text-blue-600",
      glow: "group-hover:shadow-blue-400/30",
    },
    {
      title: "Active",
      filterKey: "active",
      value: summary?.activeProducts ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=active`,
      icon: <FaCheckCircle size={16} />,
      ring: "from-emerald-400/40 to-green-500/40",
      iconBg: "bg-emerald-500/15 text-emerald-600",
      glow: "group-hover:shadow-emerald-400/30",
    },
    {
      title: "Inactive",
      filterKey: "inactive",
      value: summary?.inactiveProducts ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=inactive`,
      icon: <FaTimesCircle size={16} />,
      ring: "from-rose-400/40 to-red-500/40",
      iconBg: "bg-rose-500/15 text-rose-600",
      glow: "group-hover:shadow-rose-400/30",
    },
    {
      title: "Companies",
      filterKey: "companies",
      value: summary?.totalCompanies ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=companies`,
      icon: <FaBuilding size={16} />,
      ring: "from-violet-400/40 to-purple-500/40",
      iconBg: "bg-violet-500/15 text-violet-600",
      glow: "group-hover:shadow-violet-400/30",
    },
    {
      title: "Available",
      filterKey: "available",
      value: summary?.availableProducts ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=available`,
      icon: <FaWarehouse size={16} />,
      ring: "from-cyan-400/40 to-sky-500/40",
      iconBg: "bg-cyan-500/15 text-cyan-600",
      glow: "group-hover:shadow-cyan-400/30",
    },
    {
      title: "Low Stock",
      filterKey: "low_stock",
      value: summary?.lowStock ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=low_stock`,
      icon: <FaExclamationTriangle size={16} />,
      ring: "from-amber-400/40 to-orange-500/40",
      iconBg: "bg-amber-500/15 text-amber-600",
      glow: "group-hover:shadow-amber-400/30",
    },
    {
      title: "Negative Stock",
      filterKey: "negative_stock",
      value: summary?.negativeStock ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=negative_stock`,
      icon: <FaTimesCircle size={16} />,
      ring: "from-rose-500/40 to-red-600/40",
      iconBg: "bg-rose-500/15 text-rose-600",
      glow: "group-hover:shadow-rose-400/30",
    },
    {
      title: "Out Of Stock",
      filterKey: "out_of_stock",
      value: summary?.outOfStock ?? 0,
      href: `/dashboard/${role}/inventory/products?filter=out_of_stock`,
      icon: <FaLayerGroup size={16} />,
      ring: "from-slate-400/40 to-gray-500/40",
      iconBg: "bg-slate-500/15 text-slate-600",
      glow: "group-hover:shadow-slate-400/30",
    },
    {
      title: "Stock Value",
      filterKey: "stock_value",
      value:
        "₹ " +
        Number(summary?.stockValue || 0).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        }),
      href: `/dashboard/${role}/inventory/products?filter=stock_value`,
      icon: <FaRupeeSign size={16} />,
      ring: "from-teal-400/40 to-emerald-500/40",
      iconBg: "bg-teal-500/15 text-teal-600",
      glow: "group-hover:shadow-teal-400/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
      {cards.map((card, index) => {
        const isCurrentActive = activeFilter === card.filterKey;

        const content = (
          <div
            className={`
              relative h-full rounded-2xl overflow-hidden
              ${isCurrentActive ? "bg-white/95 ring-2 ring-blue-500 shadow-md" : "bg-white/70"} backdrop-blur-xl
              border border-white/50
              shadow-[0_4px_20px_rgba(0,0,0,0.06)]
              transition-all duration-300 ease-out
              group-hover:shadow-xl ${card.glow}
              p-3
            `}
          >
            {/* subtle top sheen — liquid glass highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

            {/* animated shine sweep on hover */}
            <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

            <div className="relative flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-medium text-gray-500 tracking-wide truncate">
                  {card.title}
                </p>
                <h3
                  className={`mt-0.5 font-bold text-gray-800 tabular-nums whitespace-nowrap ${
                    String(card.value ?? 0).length > 9
                      ? "text-xs"
                      : String(card.value ?? 0).length > 6
                        ? "text-sm"
                        : "text-base"
                  }`}
                >
                  {card.value ?? 0}
                </h3>
              </div>

              <div
                className={`
                  flex items-center justify-center h-7 w-7 rounded-lg shrink-0
                  ${card.iconBg}
                  ring-1 ring-white/50
                  transition-transform duration-300
                  group-hover:scale-110 group-hover:rotate-3
                `}
              >
                {card.icon}
              </div>
            </div>

            <div className="relative mt-2 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
              <span>{onCardClick ? "Click to view" : "View list"}</span>
              <FaArrowRight size={8} className="transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        );

        if (onCardClick) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => onCardClick(card.filterKey)}
              title={`Click to view ${card.title}`}
              className={`
                group relative rounded-2xl p-[1px] block cursor-pointer text-left w-full
                bg-gradient-to-br ${card.ring}
                transition-all duration-300 ease-out
                hover:-translate-y-1.5 hover:scale-[1.02]
                ${isCurrentActive ? "scale-[1.02]" : ""}
              `}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={index}
            href={card.href}
            title={`Click to view ${card.title}`}
            className={`
              group relative rounded-2xl p-[1px] block cursor-pointer
              bg-gradient-to-br ${card.ring}
              transition-all duration-300 ease-out
              hover:-translate-y-1.5 hover:scale-[1.02]
              ${isCurrentActive ? "scale-[1.02]" : ""}
            `}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}