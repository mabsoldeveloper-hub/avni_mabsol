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
  FaArrowLeft,
  FaFilter,
  FaChevronLeft,
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
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string>("ALL");
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});
  const [expandedSubDivisions, setExpandedSubDivisions] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Pagination for "ALL" companies table overview
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

    return Array.from(companyMap.values())
      .map((c) => ({
        ...c,
        divisions: Array.from(c.divisions.values()).map((d: any) => ({
          ...d,
          subDivisions: Array.from(d.subDivisions.values()).map((s: any) => ({
            ...s,
            categories: Array.from(s.categories.values()),
          })),
        })),
      }))
      .sort((a, b) => b.totalProducts - a.totalProducts);
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

  // Currently focused company when a company is selected in the dropdown
  const currentSelectedCompany = useMemo(() => {
    if (selectedCompanyKey === "ALL") return null;
    return hierarchyTree.find((c) => c.name === selectedCompanyKey) || null;
  }, [hierarchyTree, selectedCompanyKey]);

  // Paginated companies for the "ALL" overview table
  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, page, pageSize]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;

  const toggleDivision = (key: string) => {
    setExpandedDivisions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubDivision = (key: string) => {
    setExpandedSubDivisions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllForCurrent = () => {
    if (!currentSelectedCompany) return;
    const divs: Record<string, boolean> = {};
    const sdivs: Record<string, boolean> = {};
    const cats: Record<string, boolean> = {};

    currentSelectedCompany.divisions.forEach((d: any) => {
      const divKey = `${currentSelectedCompany.name}_${d.name}`;
      divs[divKey] = true;
      d.subDivisions.forEach((s: any) => {
        const sdivKey = `${divKey}_${s.name}`;
        sdivs[sdivKey] = true;
        s.categories.forEach((cat: any) => {
          cats[`${sdivKey}_${cat.name}`] = true;
        });
      });
    });

    setExpandedDivisions(divs);
    setExpandedSubDivisions(sdivs);
    setExpandedCategories(cats);
  };

  const collapseAllForCurrent = () => {
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

          {currentSelectedCompany && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={expandAllForCurrent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
              >
                <FaAngleDoubleDown size={11} />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={collapseAllForCurrent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
              >
                <FaAngleDoubleUp size={11} />
                <span>Collapse All</span>
              </button>
            </div>
          )}
        </div>

        {/* ==================== COMPANY DROPDOWN SELECTOR (PREVENTS 1000+ ROWS FILLING DASHBOARD) ==================== */}
        <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Company Dropdown Select */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="p-1.5 rounded-lg bg-white/20 text-white shrink-0">
              <FaBuilding size={12} />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedCompanyKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCompanyKey(val);
                  setPage(1);
                  if (val !== "ALL") {
                    // Auto expand the first level for immediate visibility
                    setExpandedDivisions({});
                    setExpandedSubDivisions({});
                    setExpandedCategories({});
                  }
                }}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-xs outline-none focus:ring-2 focus:ring-white transition cursor-pointer truncate"
              >
                <option value="ALL">
                  🏢 All Companies Overview Table ({hierarchyTree.length} Companies)
                </option>
                {filteredCompanies.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} {c.code ? `[Code: ${c.code}]` : ""} — ({c.totalProducts} Products &middot; {c.totalStock.toLocaleString()} Units{c.negativeCount > 0 ? ` · ${c.negativeCount} Neg` : ""}{c.lowStockCount > 0 ? ` · ${c.lowStockCount} Low` : ""})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search box within companies */}
          <div className="relative w-full lg:w-64">
            <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search hierarchy..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/20 text-white placeholder-white/70 ring-1 ring-white/30 focus:ring-white/60 outline-none backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setPage(1);
            }}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterMode === "all"
                ? "bg-white text-violet-800 shadow-xs"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            All ({hierarchyTree.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("negative");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterMode === "negative"
                ? "bg-rose-500 text-white shadow-xs ring-2 ring-white/50"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <FaTimesCircle size={9} />
            <span>Negative Stock ({companiesWithNegative})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("low_stock");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterMode === "low_stock"
                ? "bg-amber-500 text-white shadow-xs ring-2 ring-white/50"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <FaExclamationTriangle size={9} />
            <span>Low Stock ({companiesWithLow})</span>
          </button>

          {selectedCompanyKey !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedCompanyKey("ALL")}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition cursor-pointer"
            >
              <FaArrowLeft size={9} />
              <span>Back to All Companies Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== VIEW 1: SPECIFIC COMPANY 5-TIER HIERARCHY DRILLDOWN ==================== */}
      {currentSelectedCompany ? (
        <div className="p-4 sm:p-5 space-y-3">
          <div className="rounded-xl border border-violet-300 bg-white shadow-xs overflow-hidden">
            {/* Company Level Banner */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-xs shrink-0">
                  <FaBuilding size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 m-0">
                      {currentSelectedCompany.name}
                    </h4>
                    {currentSelectedCompany.code && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-200/70 text-violet-800">
                        Code: {currentSelectedCompany.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0 font-medium">
                    {currentSelectedCompany.divisions.length} Divisions &middot; {currentSelectedCompany.totalProducts} Total Products
                  </p>
                </div>
              </div>

              {/* Company Metrics Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {currentSelectedCompany.negativeCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                    <FaTimesCircle size={11} />
                    <span>{currentSelectedCompany.negativeCount} Negative Stock</span>
                  </span>
                )}
                {currentSelectedCompany.lowStockCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <FaExclamationTriangle size={11} />
                    <span>{currentSelectedCompany.lowStockCount} Low Stock</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  <FaBoxes size={12} className="text-slate-400" />
                  <span>{currentSelectedCompany.totalStock.toLocaleString()} Units Total</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                  <FaRupeeSign size={11} className="text-teal-600" />
                  <span>
                    {currentSelectedCompany.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </span>

                <Link
                  href={`/dashboard/${role}/inventory/products?company=${encodeURIComponent(currentSelectedCompany.name)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-xs transition"
                >
                  <span>Open in Catalog</span>
                  <FaEye size={11} />
                </Link>
              </div>
            </div>

            {/* Divisions Drilldown for Selected Company */}
            <div className="p-4 bg-slate-50/60 space-y-3">
              {currentSelectedCompany.divisions.map((div: any) => {
                const divKey = `${currentSelectedCompany.name}_${div.name}`;
                const isDivExpanded = expandedDivisions[divKey] ?? true; // default open for selected company

                return (
                  <div
                    key={divKey}
                    className="rounded-xl border border-emerald-200/90 bg-white overflow-hidden shadow-2xs"
                  >
                    {/* 2. Division Level Header */}
                    <div
                      onClick={() => toggleDivision(divKey)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 cursor-pointer transition-colors ${
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
                          ({div.subDivisions.length} Sub-Divs &middot; {div.totalProducts} Products)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {div.negativeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                            {div.negativeCount} Neg
                          </span>
                        )}
                        {div.lowStockCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {div.lowStockCount} Low
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-700">
                          Stock: {div.totalStock.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Sub-Divisions */}
                    {isDivExpanded && (
                      <div className="p-3 bg-white space-y-2.5">
                        {div.subDivisions.map((sdiv: any) => {
                          const sdivKey = `${divKey}_${sdiv.name}`;
                          const isSubDivExpanded = expandedSubDivisions[sdivKey] ?? true;

                          return (
                            <div
                              key={sdivKey}
                              className="rounded-lg border border-amber-200/90 bg-amber-50/20 overflow-hidden"
                            >
                              {/* 3. Sub-Division Level Header */}
                              <div
                                onClick={() => toggleSubDivision(sdivKey)}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 cursor-pointer transition-colors ${
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

                              {/* Categories */}
                              {isSubDivExpanded && (
                                <div className="p-2.5 space-y-2 bg-white">
                                  {sdiv.categories.map((cat: any) => {
                                    const catKey = `${sdivKey}_${cat.name}`;
                                    const isCatExpanded = expandedCategories[catKey] ?? true;

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

                                        {/* 5. Products Table */}
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
          </div>
        </div>
      ) : (
        /* ==================== VIEW 2: COMPACT ALL COMPANIES OVERVIEW TABLE (PAGINATED) ==================== */
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>
              Showing {paginatedCompanies.length} of {filteredCompanies.length} Manufacturers (Select any to drill down)
            </span>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Company Name & Code</th>
                  <th className="px-4 py-3 text-center">Divisions</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-right">Total Stock</th>
                  <th className="px-4 py-3 text-right">Stock Value (₹)</th>
                  <th className="px-4 py-3 text-center">Alerts</th>
                  <th className="px-4 py-3 text-center w-36">5-Tier Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCompanies.map((c, idx) => (
                  <tr
                    key={c.name}
                    className="hover:bg-violet-50/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400 font-medium">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700 shrink-0">
                          <FaBuilding size={11} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">
                            {c.name}
                          </span>
                          {c.code && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Code: {c.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        {c.divisions.length} Divs
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {c.totalProducts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 tabular-nums">
                      {c.totalStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹ {c.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.negativeCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                            {c.negativeCount} Neg
                          </span>
                        )}
                        {c.lowStockCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {c.lowStockCount} Low
                          </span>
                        )}
                        {c.negativeCount === 0 && c.lowStockCount === 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            ✓ Healthy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompanyKey(c.name);
                          setExpandedDivisions({});
                          setExpandedSubDivisions({});
                          setExpandedCategories({});
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-2xs transition cursor-pointer"
                      >
                        <span>Drilldown</span>
                        <FaChevronDown size={9} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaChevronLeft size={9} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      p === page
                        ? "bg-violet-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaChevronRight size={9} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
