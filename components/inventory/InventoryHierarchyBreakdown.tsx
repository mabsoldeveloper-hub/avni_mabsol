"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FaBuilding,
  FaSitemap,
  FaLayerGroup,
  FaTags,
  FaPills,
  FaChevronDown,
  FaChevronRight,
  FaSearch,
  FaEye,
  FaExclamationTriangle,
  FaTimesCircle,
  FaBoxes,
  FaRupeeSign,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
} from "react-icons/fa";

interface InventoryHierarchyBreakdownProps {
  products: any[];
  role?: string;
}

export default function InventoryHierarchyBreakdown({
  products,
  role = "admin",
}: InventoryHierarchyBreakdownProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "negative" | "low_stock">("all");
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});
  const [expandedSubDivisions, setExpandedSubDivisions] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Build the 5-tier nested hierarchy from products
  const hierarchyTree = useMemo(() => {
    const companyMap = new Map<string, any>();

    (products || []).forEach((p) => {
      const compKey = (p.companyName || p.GCODE || p.COMPANY || "Other / Unassigned").trim();
      const divKey = (p.division || p.DIV || p.DIVISION || "General Division").trim();
      const subDivKey = (p.subDivision || p.SUBDIV || p.SUB_DIV || "General Sub-Div").trim();
      const catKey = (p.category || p.CAT || p.CATEGORY || "General Category").trim();

      const balance = Number(p.BALANCE ?? 0);
      const prate = Number(p.PRATE ?? 0);
      const mrp = Number(p.MRP ?? 0);
      const isNeg = balance < 0;
      const isLow = balance > 0 && balance <= 10;
      const value = balance > 0 ? balance * (prate || mrp) : 0;

      // 1. Company Level
      if (!companyMap.has(compKey)) {
        companyMap.set(compKey, {
          name: compKey,
          code: p.GCODE || p.COMPANY || "",
          totalProducts: 0,
          totalStock: 0,
          negativeCount: 0,
          lowStockCount: 0,
          stockValue: 0,
          divisions: new Map<string, any>(),
        });
      }
      const comp = companyMap.get(compKey);
      comp.totalProducts += 1;
      comp.totalStock += balance;
      if (isNeg) comp.negativeCount += 1;
      if (isLow) comp.lowStockCount += 1;
      comp.stockValue += value;

      // 2. Division Level
      if (!comp.divisions.has(divKey)) {
        comp.divisions.set(divKey, {
          name: divKey,
          code: p.DIV || p.DIVISION || "",
          totalProducts: 0,
          totalStock: 0,
          negativeCount: 0,
          lowStockCount: 0,
          stockValue: 0,
          subDivisions: new Map<string, any>(),
        });
      }
      const div = comp.divisions.get(divKey);
      div.totalProducts += 1;
      div.totalStock += balance;
      if (isNeg) div.negativeCount += 1;
      if (isLow) div.lowStockCount += 1;
      div.stockValue += value;

      // 3. Sub-Division Level
      if (!div.subDivisions.has(subDivKey)) {
        div.subDivisions.set(subDivKey, {
          name: subDivKey,
          code: p.SUBDIV || p.SUB_DIV || "",
          totalProducts: 0,
          totalStock: 0,
          negativeCount: 0,
          lowStockCount: 0,
          stockValue: 0,
          categories: new Map<string, any>(),
        });
      }
      const sdiv = div.subDivisions.get(subDivKey);
      sdiv.totalProducts += 1;
      sdiv.totalStock += balance;
      if (isNeg) sdiv.negativeCount += 1;
      if (isLow) sdiv.lowStockCount += 1;
      sdiv.stockValue += value;

      // 4. Category Level
      if (!sdiv.categories.has(catKey)) {
        sdiv.categories.set(catKey, {
          name: catKey,
          code: p.CAT || p.CATEGORY || "",
          totalProducts: 0,
          totalStock: 0,
          negativeCount: 0,
          lowStockCount: 0,
          stockValue: 0,
          products: [],
        });
      }
      const cat = sdiv.categories.get(catKey);
      cat.totalProducts += 1;
      cat.totalStock += balance;
      if (isNeg) cat.negativeCount += 1;
      if (isLow) cat.lowStockCount += 1;
      cat.stockValue += value;

      // 5. Product Level
      cat.products.push({
        ...p,
        balance,
        isNeg,
        isLow,
        value,
      });
    });

    return Array.from(companyMap.values()).map((c) => ({
      ...c,
      divisions: Array.from(c.divisions.values()).map((d: any) => ({
        ...d,
        subDivisions: Array.from(d.subDivisions.values()).map((s: any) => ({
          ...s,
          categories: Array.from(s.categories.values()),
        })),
      })),
    }));
  }, [products]);

  // Filtered companies based on search and pills
  const filteredCompanies = useMemo(() => {
    let list = hierarchyTree;

    if (filterMode === "negative") {
      list = list.filter((c) => c.negativeCount > 0);
    } else if (filterMode === "low_stock") {
      list = list.filter((c) => c.lowStockCount > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => {
        if (c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))) {
          return true;
        }
        return c.divisions.some((d: any) => {
          if (d.name.toLowerCase().includes(q)) return true;
          return d.subDivisions.some((s: any) => {
            if (s.name.toLowerCase().includes(q)) return true;
            return s.categories.some((cat: any) => {
              if (cat.name.toLowerCase().includes(q)) return true;
              return cat.products.some(
                (p: any) =>
                  (p.PRODUCT || "").toLowerCase().includes(q) ||
                  (p.CODE || "").toString().toLowerCase().includes(q)
              );
            });
          });
        });
      });
    }

    return list;
  }, [hierarchyTree, search, filterMode]);

  const toggleCompany = (name: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleDivision = (key: string) => {
    setExpandedDivisions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubDivision = (key: string) => {
    setExpandedSubDivisions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const comps: Record<string, boolean> = {};
    const divs: Record<string, boolean> = {};
    const sdivs: Record<string, boolean> = {};
    const cats: Record<string, boolean> = {};

    hierarchyTree.forEach((c) => {
      comps[c.name] = true;
      c.divisions.forEach((d: any) => {
        const divKey = `${c.name}_${d.name}`;
        divs[divKey] = true;
        d.subDivisions.forEach((s: any) => {
          const sdivKey = `${divKey}_${s.name}`;
          sdivs[sdivKey] = true;
          s.categories.forEach((cat: any) => {
            cats[`${sdivKey}_${cat.name}`] = true;
          });
        });
      });
    });

    setExpandedCompanies(comps);
    setExpandedDivisions(divs);
    setExpandedSubDivisions(sdivs);
    setExpandedCategories(cats);
  };

  const collapseAll = () => {
    setExpandedCompanies({});
    setExpandedDivisions({});
    setExpandedSubDivisions({});
    setExpandedCategories({});
  };

  const companiesWithNegative = hierarchyTree.filter((c) => c.negativeCount > 0).length;
  const companiesWithLow = hierarchyTree.filter((c) => c.lowStockCount > 0).length;

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md shadow-xs">
              <FaBuilding size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight m-0 text-white flex items-center gap-2">
                <span>Company & 5-Tier Product Hierarchy Breakdown</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                  {hierarchyTree.length} Companies
                </span>
              </h3>
              <p className="text-xs text-violet-100 mt-0.5 mb-0">
                Live drilldown: Company → Division → Sub-Division → Category → Product
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
            >
              <FaAngleDoubleDown size={11} />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
            >
              <FaAngleDoubleUp size={11} />
              <span>Collapse All</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filter Pills */}
        <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === "all"
                  ? "bg-white text-violet-800 shadow-xs"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              All Companies ({hierarchyTree.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("negative")}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === "negative"
                  ? "bg-rose-500 text-white shadow-xs ring-2 ring-white/50"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <FaTimesCircle size={10} />
              <span>Negative Stock ({companiesWithNegative})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("low_stock")}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === "low_stock"
                  ? "bg-amber-500 text-white shadow-xs ring-2 ring-white/50"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <FaExclamationTriangle size={10} />
              <span>Low Stock ({companiesWithLow})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in hierarchy..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/20 text-white placeholder-white/70 ring-1 ring-white/30 focus:ring-white/60 outline-none backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* Hierarchy Tree List */}
      <div className="p-4 sm:p-5 space-y-3">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((comp) => {
            const isCompExpanded = expandedCompanies[comp.name];

            return (
              <div
                key={comp.name}
                className="rounded-xl border border-slate-200/90 bg-white shadow-xs transition-all overflow-hidden"
              >
                {/* 1. Company Level Header */}
                <div
                  onClick={() => toggleCompany(comp.name)}
                  className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 cursor-pointer transition-colors ${
                    isCompExpanded ? "bg-violet-50/70 border-b border-violet-100" : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded text-violet-600 hover:bg-violet-100 shrink-0"
                    >
                      {isCompExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                    </button>
                    <div className="p-1.5 rounded-lg bg-violet-600 text-white shrink-0 shadow-2xs">
                      <FaBuilding size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{comp.name}</span>
                        {comp.code && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                            Code: {comp.code}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({comp.divisions.length} Divisions &middot; {comp.totalProducts} Products)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Company Summary Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {comp.negativeCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                        <FaTimesCircle size={10} />
                        <span>{comp.negativeCount} Negative</span>
                      </span>
                    )}
                    {comp.lowStockCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <FaExclamationTriangle size={10} />
                        <span>{comp.lowStockCount} Low</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      <FaBoxes size={11} className="text-slate-400" />
                      <span>{comp.totalStock.toLocaleString()} Units</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      <FaRupeeSign size={10} className="text-teal-600" />
                      <span>
                        {comp.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </span>

                    <Link
                      href={`/dashboard/${role}/inventory/products?company=${encodeURIComponent(comp.name)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white border border-violet-200 transition"
                      title="Filter products by this company"
                    >
                      <span>Products</span>
                      <FaEye size={10} />
                    </Link>
                  </div>
                </div>

                {/* Expanded Divisions */}
                {isCompExpanded && (
                  <div className="p-3 sm:p-4 bg-slate-50/50 space-y-3">
                    {comp.divisions.map((div: any) => {
                      const divKey = `${comp.name}_${div.name}`;
                      const isDivExpanded = expandedDivisions[divKey];

                      return (
                        <div
                          key={divKey}
                          className="rounded-xl border border-emerald-200/80 bg-white overflow-hidden shadow-2xs"
                        >
                          {/* 2. Division Level Header */}
                          <div
                            onClick={() => toggleDivision(divKey)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 cursor-pointer transition-colors ${
                              isDivExpanded ? "bg-emerald-50/70 border-b border-emerald-100" : "hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <button type="button" className="p-1 rounded text-emerald-600">
                                {isDivExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
                              </button>
                              <div className="p-1.5 rounded-md bg-emerald-600 text-white shrink-0">
                                <FaSitemap size={11} />
                              </div>
                              <span className="font-bold text-slate-800 text-xs">
                                Division: {div.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({div.subDivisions.length} Sub-Divs &middot; {div.totalProducts} Prods)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              {div.negativeCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                                  {div.negativeCount} Neg
                                </span>
                              )}
                              {div.lowStockCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {div.lowStockCount} Low
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-slate-700">
                                Stock: {div.totalStock.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Sub-Divisions */}
                          {isDivExpanded && (
                            <div className="p-3 bg-white space-y-2.5">
                              {div.subDivisions.map((sdiv: any) => {
                                const sdivKey = `${divKey}_${sdiv.name}`;
                                const isSubDivExpanded = expandedSubDivisions[sdivKey];

                                return (
                                  <div
                                    key={sdivKey}
                                    className="rounded-lg border border-amber-200/80 bg-amber-50/20 overflow-hidden"
                                  >
                                    {/* 3. Sub-Division Level Header */}
                                    <div
                                      onClick={() => toggleSubDivision(sdivKey)}
                                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 cursor-pointer transition-colors ${
                                        isSubDivExpanded ? "bg-amber-100/50 border-b border-amber-200" : "hover:bg-amber-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <button type="button" className="p-0.5 rounded text-amber-700">
                                          {isSubDivExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                        </button>
                                        <div className="p-1 rounded bg-amber-600 text-white shrink-0">
                                          <FaLayerGroup size={10} />
                                        </div>
                                        <span className="font-bold text-slate-800 text-[11px]">
                                          Sub-Division: {sdiv.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          ({sdiv.categories.length} Categories)
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 text-[10px]">
                                        {sdiv.negativeCount > 0 && (
                                          <span className="px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-700">
                                            {sdiv.negativeCount} Neg
                                          </span>
                                        )}
                                        <span className="font-medium text-slate-600">
                                          Stock: {sdiv.totalStock.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Expanded Categories */}
                                    {isSubDivExpanded && (
                                      <div className="p-2.5 space-y-2 bg-white">
                                        {sdiv.categories.map((cat: any) => {
                                          const catKey = `${sdivKey}_${cat.name}`;
                                          const isCatExpanded = expandedCategories[catKey];

                                          return (
                                            <div
                                              key={catKey}
                                              className="rounded-lg border border-purple-200/80 overflow-hidden"
                                            >
                                              {/* 4. Category Level Header */}
                                              <div
                                                onClick={() => toggleCategory(catKey)}
                                                className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                                                  isCatExpanded ? "bg-purple-50 border-b border-purple-100" : "hover:bg-purple-50/50"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <button type="button" className="p-0.5 rounded text-purple-700">
                                                    {isCatExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                                                  </button>
                                                  <div className="p-1 rounded bg-purple-600 text-white shrink-0">
                                                    <FaTags size={9} />
                                                  </div>
                                                  <span className="font-bold text-slate-800 text-xs">
                                                    Category: {cat.name}
                                                  </span>
                                                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-100 px-1.5 py-0.2 rounded">
                                                    {cat.products.length} Products
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs">
                                                  {cat.negativeCount > 0 && (
                                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                                                      {cat.negativeCount} Neg
                                                    </span>
                                                  )}
                                                  <span className="text-[11px] font-semibold text-slate-700">
                                                    Stock: {cat.totalStock.toLocaleString()}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* 5. Products Table within Category */}
                                              {isCatExpanded && (
                                                <div className="p-2 bg-white overflow-x-auto">
                                                  <table className="w-full text-xs">
                                                    <thead>
                                                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                                                        <th className="px-3 py-1.5 text-left">Code</th>
                                                        <th className="px-3 py-1.5 text-left">Product Name</th>
                                                        <th className="px-3 py-1.5 text-center">Stock</th>
                                                        <th className="px-3 py-1.5 text-right">Purchase</th>
                                                        <th className="px-3 py-1.5 text-right">MRP</th>
                                                        <th className="px-3 py-1.5 text-right">Value (₹)</th>
                                                        <th className="px-3 py-1.5 text-center w-16">Action</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                      {cat.products.map((prod: any, pIdx: number) => (
                                                        <tr
                                                          key={prod._id || `${catKey}_prod_${pIdx}`}
                                                          className="hover:bg-slate-50/80 transition-colors"
                                                        >
                                                          <td className="px-3 py-2 text-slate-500 font-medium">
                                                            {prod.CODE || "-"}
                                                          </td>
                                                          <td className="px-3 py-2 font-semibold text-slate-800">
                                                            <div className="flex items-center gap-1.5">
                                                              <FaPills size={10} className="text-slate-400 shrink-0" />
                                                              <span>{prod.PRODUCT}</span>
                                                              {prod.pack && (
                                                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                                                  {prod.pack}
                                                                </span>
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="px-3 py-2 text-center">
                                                            <span
                                                              className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                                prod.balance < 0
                                                                  ? "bg-rose-100 text-rose-700 ring-1 ring-rose-400"
                                                                  : prod.balance <= 10
                                                                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400"
                                                                  : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400"
                                                              }`}
                                                            >
                                                              {prod.balance.toLocaleString()}
                                                            </span>
                                                          </td>
                                                          <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                                                            ₹ {Number(prod.PRATE || 0).toFixed(2)}
                                                          </td>
                                                          <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                                                            ₹ {Number(prod.MRP || 0).toFixed(2)}
                                                          </td>
                                                          <td className="px-3 py-2 text-right font-bold text-slate-800 tabular-nums">
                                                            ₹ {prod.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                          </td>
                                                          <td className="px-3 py-2 text-center">
                                                            <Link
                                                              href={`/dashboard/${role}/inventory/products/view/${prod._id}`}
                                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition"
                                                            >
                                                              <FaEye size={9} />
                                                              <span>View</span>
                                                            </Link>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-400">
            <FaBuilding size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No companies match your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

