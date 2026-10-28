"use client";

import React, { useMemo } from "react";
import { FaBoxes, FaIndustry, FaClinicMedical } from "react-icons/fa";
import { SuperAdminUserItem } from "./types";

interface CategoryCardsProps {
  distributors?: number;
  manufacturers?: number;
  stockists?: number;
  users?: SuperAdminUserItem[];
  className?: string;
}

export default function CategoryCards({
  distributors,
  manufacturers,
  stockists,
  users,
  className = "",
}: CategoryCardsProps) {
  const counts = useMemo(() => {
    if (distributors !== undefined && manufacturers !== undefined && stockists !== undefined) {
      return { distributors, manufacturers, stockists };
    }
    if (!users) {
      return { distributors: 0, manufacturers: 0, stockists: 0 };
    }

    let dist = 0;
    let mfg = 0;
    let stock = 0;

    users.forEach((u) => {
      const type = (u.companyId?.businessType || "").toLowerCase();
      const name = (u.companyId?.companyName || u.name || "").toLowerCase();
      if (type.includes("mfg") || type.includes("manufactur") || name.includes("labs") || name.includes("pharma labs") || name.includes("remedies") || name.includes("biotech")) {
        mfg++;
      } else if (type.includes("retail") || type.includes("chemist") || type.includes("pharmacy") || type.includes("stockist") || name.includes("chemist") || name.includes("medicos") || name.includes("store")) {
        stock++;
      } else {
        dist++;
      }
    });

    return { distributors: dist, manufacturers: mfg, stockists: stock };
  }, [distributors, manufacturers, stockists, users]);

  const total = counts.distributors + counts.manufacturers + counts.stockists || 1;
  const distPct = Math.round((counts.distributors / total) * 100);
  const mfgPct = Math.round((counts.manufacturers / total) * 100);
  const stockPct = Math.round((counts.stockists / total) * 100);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4.5 ${className}`}>
      {/* Category 1: PCD & DISTRIBUTORS */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            PCD & Distributors
          </span>
          <div className="w-8.5 h-8.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 border border-blue-100 shadow-xs group-hover:scale-105 transition-transform">
            <FaBoxes />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {counts.distributors}
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/70">
              {distPct}% share
            </span>
          </div>
          <div className="text-[11px] text-blue-600/90 font-medium mt-1 truncate">
            Franchises & marketing networks
          </div>
        </div>
      </div>

      {/* Category 2: PHARMA MANUFACTURERS */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Manufacturers
          </span>
          <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0 border border-amber-100 shadow-xs group-hover:scale-105 transition-transform">
            <FaIndustry />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {counts.manufacturers}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/70">
              {mfgPct}% share
            </span>
          </div>
          <div className="text-[11px] text-amber-600/90 font-medium mt-1 truncate">
            Formulation & production units
          </div>
        </div>
      </div>

      {/* Category 3: STOCKISTS & PHARMACIES */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Stockists & Chemists
          </span>
          <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 border border-emerald-100 shadow-xs group-hover:scale-105 transition-transform">
            <FaClinicMedical />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {counts.stockists}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
              {stockPct}% share
            </span>
          </div>
          <div className="text-[11px] text-emerald-600/90 font-medium mt-1 truncate">
            Wholesale & retail pharmacies
          </div>
        </div>
      </div>
    </div>
  );
}
