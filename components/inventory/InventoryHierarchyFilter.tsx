"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FaBuilding,
  FaSitemap,
  FaLayerGroup,
  FaTags,
  FaPills,
  FaUndo,
  FaFilter,
  FaSearch,
  FaChevronRight,
  FaCheckCircle,
} from "react-icons/fa";

export interface HierarchyFilterValues {
  companyCode: string;
  companyName?: string;
  divisionCode: string;
  divisionName?: string;
  subDivisionCode: string;
  subDivisionName?: string;
  categoryCode: string;
  categoryName?: string;
  productCode: string;
  productName?: string;
}

interface InventoryHierarchyFilterProps {
  initialValues?: Partial<HierarchyFilterValues>;
  onChange: (values: HierarchyFilterValues) => void;
  onReset?: () => void;
  title?: string;
  subtitle?: string;
}

export default function InventoryHierarchyFilter({
  initialValues,
  onChange,
  onReset,
  title = "5-Tier Product Hierarchy Search",
  subtitle = "Filter exact product inventory by Company → Division → Sub-Division → Category → Product",
}: InventoryHierarchyFilterProps) {
  // Selection states
  const [companyCode, setCompanyCode] = useState(initialValues?.companyCode || "");
  const [divisionCode, setDivisionCode] = useState(initialValues?.divisionCode || "");
  const [subDivisionCode, setSubDivisionCode] = useState(initialValues?.subDivisionCode || "");
  const [categoryCode, setCategoryCode] = useState(initialValues?.categoryCode || "");
  const [productCode, setProductCode] = useState(initialValues?.productCode || "");

  // Options states
  const [companies, setCompanies] = useState<{ code: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ code: string; name: string; companyCode?: string }[]>([]);
  const [subDivisions, setSubDivisions] = useState<{ code: string; name: string; companyCode?: string; divisionCode?: string }[]>([]);
  const [categories, setCategories] = useState<{ code: string; name: string; companyCode?: string; divisionCode?: string; subDivisionCode?: string }[]>([]);
  const [products, setProducts] = useState<{ code: string; name: string; pack?: string; stock?: number; company?: string; division?: string; category?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [productSearchInput, setProductSearchInput] = useState("");

  // Load initial options
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (companyCode) sp.set("companyCode", companyCode);
        if (divisionCode) sp.set("divisionCode", divisionCode);
        if (subDivisionCode) sp.set("subDivisionCode", subDivisionCode);
        if (categoryCode) sp.set("categoryCode", categoryCode);

        const res = await fetch(`/api/inventory-intelligence/filter-options?${sp.toString()}`);
        const data = await res.json();

        if (isMounted && data.success) {
          if (!companyCode) setCompanies(data.companies || []);
          setDivisions(data.divisions || []);
          setSubDivisions(data.subDivisions || []);
          setCategories(data.categories || []);
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load hierarchy options:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [companyCode, divisionCode, subDivisionCode, categoryCode]);

  // Handle Company Change
  const handleCompanyChange = (code: string) => {
    setCompanyCode(code);
    setDivisionCode("");
    setSubDivisionCode("");
    setCategoryCode("");
    setProductCode("");
    setProductSearchInput("");

    const comp = companies.find((c) => c.code === code);
    onChange({
      companyCode: code,
      companyName: comp?.name || "",
      divisionCode: "",
      subDivisionCode: "",
      categoryCode: "",
      productCode: "",
    });
  };

  // Handle Division Change
  const handleDivisionChange = (code: string) => {
    setDivisionCode(code);
    setSubDivisionCode("");
    setCategoryCode("");
    setProductCode("");
    setProductSearchInput("");

    const comp = companies.find((c) => c.code === companyCode);
    const div = divisions.find((d) => d.code === code);
    onChange({
      companyCode,
      companyName: comp?.name || "",
      divisionCode: code,
      divisionName: div?.name || "",
      subDivisionCode: "",
      categoryCode: "",
      productCode: "",
    });
  };

  // Handle Sub-Division Change
  const handleSubDivisionChange = (code: string) => {
    setSubDivisionCode(code);
    setCategoryCode("");
    setProductCode("");
    setProductSearchInput("");

    const comp = companies.find((c) => c.code === companyCode);
    const div = divisions.find((d) => d.code === divisionCode);
    const sdiv = subDivisions.find((s) => s.code === code);
    onChange({
      companyCode,
      companyName: comp?.name || "",
      divisionCode,
      divisionName: div?.name || "",
      subDivisionCode: code,
      subDivisionName: sdiv?.name || "",
      categoryCode: "",
      productCode: "",
    });
  };

  // Handle Category Change
  const handleCategoryChange = (code: string) => {
    setCategoryCode(code);
    setProductCode("");
    setProductSearchInput("");

    const comp = companies.find((c) => c.code === companyCode);
    const div = divisions.find((d) => d.code === divisionCode);
    const sdiv = subDivisions.find((s) => s.code === subDivisionCode);
    const cat = categories.find((c) => c.code === code);
    onChange({
      companyCode,
      companyName: comp?.name || "",
      divisionCode,
      divisionName: div?.name || "",
      subDivisionCode,
      subDivisionName: sdiv?.name || "",
      categoryCode: code,
      categoryName: cat?.name || "",
      productCode: "",
    });
  };

  // Handle Product Change
  const handleProductChange = (code: string) => {
    setProductCode(code);
    const comp = companies.find((c) => c.code === companyCode);
    const div = divisions.find((d) => d.code === divisionCode);
    const sdiv = subDivisions.find((s) => s.code === subDivisionCode);
    const cat = categories.find((c) => c.code === categoryCode);
    const prod = products.find((p) => p.code === code);

    onChange({
      companyCode,
      companyName: comp?.name || "",
      divisionCode,
      divisionName: div?.name || "",
      subDivisionCode,
      subDivisionName: sdiv?.name || "",
      categoryCode,
      categoryName: cat?.name || "",
      productCode: code,
      productName: prod?.name || "",
    });
  };

  // Reset All
  const handleReset = () => {
    setCompanyCode("");
    setDivisionCode("");
    setSubDivisionCode("");
    setCategoryCode("");
    setProductCode("");
    setProductSearchInput("");

    onChange({
      companyCode: "",
      divisionCode: "",
      subDivisionCode: "",
      categoryCode: "",
      productCode: "",
    });

    if (onReset) onReset();
  };

  // Active filters count
  const activeCount = [
    companyCode,
    divisionCode,
    subDivisionCode,
    categoryCode,
    productCode,
  ].filter(Boolean).length;

  // Filtered product options by internal input search if user wants to filter dropdown
  const filteredProductOptions = useMemo(() => {
    if (!productSearchInput.trim()) return products;
    const q = productSearchInput.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.pack && p.pack.toLowerCase().includes(q))
    );
  }, [products, productSearchInput]);

  // Selected names for breadcrumb
  const selectedCompName = companies.find((c) => c.code === companyCode)?.name || companyCode;
  const selectedDivName = divisions.find((d) => d.code === divisionCode)?.name || divisionCode;
  const selectedSubDivName = subDivisions.find((s) => s.code === subDivisionCode)?.name || subDivisionCode;
  const selectedCatName = categories.find((c) => c.code === categoryCode)?.name || categoryCode;
  const selectedProdName = products.find((p) => p.code === productCode)?.name || productCode;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
      {/* Header with Title and Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold shadow-xs">
            <FaFilter />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>{title}</span>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {activeCount} Active
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition self-start sm:self-center"
          >
            <FaUndo className="text-[10px]" />
            <span>Reset Filteration</span>
          </button>
        )}
      </div>

      {/* 5-Tier Cascading Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Tier 1: Company */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            <FaBuilding className="text-xs" />
            <span>1. Company</span>
          </label>
          <div className="relative">
            <select
              value={companyCode}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition truncate"
            >
              <option value="">All Companies</option>
              {companies.map((c, idx) => (
                <option key={`comp_${c.code || "unknown"}_${idx}`} value={c.code}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 2: Division */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <FaSitemap className="text-xs" />
            <span>2. Division</span>
          </label>
          <div className="relative">
            <select
              value={divisionCode}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition truncate"
            >
              <option value="">All Divisions</option>
              {divisions.map((d, idx) => (
                <option key={`div_${d.companyCode}_${d.code}_${idx}`} value={d.code}>
                  {d.name} {d.code ? `(${d.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 3: Sub-Division */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <FaLayerGroup className="text-xs" />
            <span>3. Sub-Division</span>
          </label>
          <div className="relative">
            <select
              value={subDivisionCode}
              onChange={(e) => handleSubDivisionChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30 transition truncate"
            >
              <option value="">All Sub-Divisions</option>
              {subDivisions.map((s, idx) => (
                <option key={`sdiv_${s.companyCode}_${s.divisionCode}_${s.code}_${idx}`} value={s.code}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 4: Category */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
            <FaTags className="text-xs" />
            <span>4. Category</span>
          </label>
          <div className="relative">
            <select
              value={categoryCode}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 transition truncate"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={`cat_${cat.companyCode}_${cat.divisionCode}_${cat.subDivisionCode}_${cat.code}_${idx}`} value={cat.code}>
                  {cat.name} {cat.code ? `(${cat.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 5: Exact Product Name */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
            <FaPills className="text-xs" />
            <span>5. Product Name</span>
          </label>
          <div className="relative">
            <select
              value={productCode}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 transition truncate"
            >
              <option value="">All Products ({products.length})</option>
              {filteredProductOptions.map((p, idx) => (
                <option key={`prod_${p.code || "unknown"}_${idx}`} value={p.code}>
                  {p.name} {p.pack ? `[${p.pack}]` : ""} {p.stock !== undefined ? `(Stock: ${p.stock})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Flow Breadcrumb Indicator */}
      {activeCount > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold text-slate-500 dark:text-slate-400">Current Flow:</span>
          {companyCode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
              <FaBuilding className="text-[10px]" />
              <span>{selectedCompName}</span>
            </span>
          )}
          {divisionCode && (
            <>
              <FaChevronRight className="text-slate-400 text-[10px]" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                <FaSitemap className="text-[10px]" />
                <span>{selectedDivName}</span>
              </span>
            </>
          )}
          {subDivisionCode && (
            <>
              <FaChevronRight className="text-slate-400 text-[10px]" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                <FaLayerGroup className="text-[10px]" />
                <span>{selectedSubDivName}</span>
              </span>
            </>
          )}
          {categoryCode && (
            <>
              <FaChevronRight className="text-slate-400 text-[10px]" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                <FaTags className="text-[10px]" />
                <span>{selectedCatName}</span>
              </span>
            </>
          )}
          {productCode && (
            <>
              <FaChevronRight className="text-slate-400 text-[10px]" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 font-extrabold border border-cyan-300 dark:border-cyan-700 shadow-xs">
                <FaCheckCircle className="text-[10px] text-cyan-600 dark:text-cyan-400" />
                <span>{selectedProdName}</span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

