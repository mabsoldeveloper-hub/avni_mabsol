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
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 ${className}`}>
      {/* Category 1: PCD & DISTRIBUTORS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            PCD & Distributors
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 border border-blue-100/60">
            <FaBoxes />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {counts.distributors}
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
              {distPct}% share
            </span>
          </div>
          <div className="text-[10.5px] text-blue-600 font-semibold mt-0.5 truncate">
            Franchises & marketing networks
          </div>
        </div>
      </div>

      {/* Category 2: PHARMA MANUFACTURERS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Manufacturers
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0 border border-amber-100/60">
            <FaIndustry />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {counts.manufacturers}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
              {mfgPct}% share
            </span>
          </div>
          <div className="text-[10.5px] text-amber-600 font-semibold mt-0.5 truncate">
            Formulation & production units
          </div>
        </div>
      </div>

      {/* Category 3: STOCKISTS & PHARMACIES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
            Stockists & Chemist
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 border border-emerald-100/60">
            <FaClinicMedical />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {counts.stockists}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
              {stockPct}% share
            </span>
          </div>
          <div className="text-[10.5px] text-emerald-600 font-semibold mt-0.5 truncate">
            Wholesale & retail pharmacies
          </div>
        </div>
      </div>
    </div>
  );
}
