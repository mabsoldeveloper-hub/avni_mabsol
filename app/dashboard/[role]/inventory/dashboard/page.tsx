"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaArrowRight,
  FaTimesCircle,
  FaExclamationTriangle,
  FaLayerGroup,
  FaBoxes,
} from "react-icons/fa";

import InventoryCards from "@/components/inventory/InventoryCards";
import LowStockTable from "@/components/inventory/LowStockTable";
import NegativeStockTable from "@/components/inventory/NegativeStockTable";
import TopProductsTable from "@/components/inventory/TopProductsTable";
import DashboardProductsTable from "@/components/inventory/DashboardProductsTable";
import InventoryHierarchyFilter, {
  HierarchyFilterValues,
} from "@/components/inventory/InventoryHierarchyFilter";

import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

export default function InventoryDashboard() {
  const params = useParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

  // 5-Tier Product Hierarchy Filter State
  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilterValues>({
    companyCode: "",
    divisionCode: "",
    subDivisionCode: "",
    categoryCode: "",
    productCode: "",
  });

  // Interactive View: "negative" (default for quick visibility), "low_stock", or "both"
  const [alertView, setAlertView] = useState<"negative" | "low_stock" | "both">("negative");

  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCompany?._id, selectedFY?._id]);

  const loadMrTerritoryInfo = async () => {
    try {
      const res = await fetch("/api/mr-territory/my-territories");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMrTerritoryInfo({
            isMrRestricted: json.isMrRestricted,
            territories: json.territories || [],
            allowedCompanyCodes: json.allowedCompanyCodes || [],
          });
        }
      }
    } catch {
      // Silently ignore
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  };

  // Filter products by selected 5-Tier Hierarchy (Company -> Division -> Sub-Division -> Category -> Product)
  const filteredProducts = useMemo(() => {
    let list = products;

    if (hierarchyFilters.companyCode) {
      const cCode = hierarchyFilters.companyCode.trim().toLowerCase();
      const cName = (hierarchyFilters.companyName || "").trim().toLowerCase();
      list = list.filter((p) => {
        const comp = (p.companyName || "").toLowerCase();
        const gcode = (p.GCODE || "").toLowerCase();
        const pcomp = (p.COMPANY || "").toLowerCase();
        return (
          comp === cCode ||
          gcode === cCode ||
          pcomp === cCode ||
          (cName && (comp.includes(cName) || cName.includes(comp)))
        );
      });
    }

    if (hierarchyFilters.divisionCode) {
      const dCode = hierarchyFilters.divisionCode.trim().toLowerCase();
      const dName = (hierarchyFilters.divisionName || "").trim().toLowerCase();
      list = list.filter((p) => {
        const div = (p.division || p.DIV || p.DIVISION || "").toLowerCase();
        return div === dCode || (dName && div === dName);
      });
    }

    if (hierarchyFilters.subDivisionCode) {
      const sCode = hierarchyFilters.subDivisionCode.trim().toLowerCase();
      const sName = (hierarchyFilters.subDivisionName || "").trim().toLowerCase();
      list = list.filter((p) => {
        const sdiv = (p.subDivision || p.SUBDIV || p.SUB_DIV || "").toLowerCase();
        return sdiv === sCode || (sName && sdiv === sName);
      });
    }

    if (hierarchyFilters.categoryCode) {
      const catCode = hierarchyFilters.categoryCode.trim().toLowerCase();
      const catName = (hierarchyFilters.categoryName || "").trim().toLowerCase();
      list = list.filter((p) => {
        const cat = (p.category || p.CAT || p.CATEGORY || "").toLowerCase();
        return cat === catCode || (catName && cat === catName);
      });
    }

    if (hierarchyFilters.productCode) {
      const pCode = hierarchyFilters.productCode.trim().toLowerCase();
      list = list.filter((p) => {
        const code = String(p.CODE || "").toLowerCase();
        const name = (p.PRODUCT || "").toLowerCase();
        return code === pCode || name === pCode;
      });
    }

    return list;
  }, [products, hierarchyFilters]);

  // Compute live summary from filteredProducts
  const summary = useMemo(() => {
    const totalProducts = filteredProducts.length;

    const activeProducts = filteredProducts.filter(
      (p: any) => p.STATUS === "Y"
    ).length;

    const inactiveProducts = filteredProducts.filter(
      (p: any) => p.STATUS !== "Y"
    ).length;

    const totalCompanies = new Set(
      filteredProducts
        .map((p: any) => p.companyName || p.GCODE)
        .filter(Boolean)
    ).size;

    const availableProducts = filteredProducts.filter(
      (p: any) => Number(p.BALANCE) > 0
    ).length;

    const lowStock = filteredProducts.filter(
      (p: any) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10
    ).length;

    const outOfStock = filteredProducts.filter(
      (p: any) => Number(p.BALANCE) <= 0
    ).length;

    const negativeStock = filteredProducts.filter(
      (p: any) => Number(p.BALANCE) < 0
    ).length;

    const totalStock = filteredProducts.reduce(
      (sum: number, p: any) => sum + Number(p.BALANCE || 0),
      0
    );

    const stockValue = filteredProducts.reduce(
      (sum: number, p: any) =>
        sum + Number(p.BALANCE || 0) * Number(p.PRATE || 0),
      0
    );

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalCompanies,
      availableProducts,
      lowStock,
      outOfStock,
      negativeStock,
      totalStock,
      stockValue,
    };
  }, [filteredProducts]);

  const lowStockProducts = useMemo(
    () =>
      filteredProducts.filter(
        (p: any) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10
      ),
    [filteredProducts]
  );

  const negativeProducts = useMemo(
    () => filteredProducts.filter((p: any) => Number(p.BALANCE) < 0),
    [filteredProducts]
  );

  const topProducts = useMemo(
    () =>
      [...filteredProducts]
        .sort((a: any, b: any) => Number(b.BALANCE) - Number(a.BALANCE))
        .slice(0, 10),
    [filteredProducts]
  );

  // Handle card clicks: clicking Negative Stock or Low Stock focuses the view directly!
  const handleCardClick = (filterKey: string) => {
    if (filterKey === "negative_stock") {
      setAlertView("negative");
      const el = document.getElementById("stock-alerts-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (filterKey === "low_stock") {
      setAlertView("low_stock");
      const el = document.getElementById("stock-alerts-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = `/dashboard/${role}/inventory/products?filter=${filterKey}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8 text-center text-sm font-medium text-slate-500">
        Loading Inventory Dashboard...
      </div>
    );
  }

  return (
    <div className="container-fluid space-y-4 pb-12">
      {/* ==================== MR TERRITORY BANNER ==================== */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
          <div className="flex-shrink-0 mt-0.5">
            <FaMapMarkerAlt size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Aap sirf apni assigned territory ka inventory dashboard data dekh sakte hain.
              {mrTerritoryInfo.territories.length > 0 && (
                <>
                  {" "}Assigned:
                  {" "}
                  {Array.from(
                    new Set(
                      mrTerritoryInfo.territories.map(
                        (t) => t.companyName || t.companyCode
                      )
                    )
                  ).join(", ")}
                </>
              )}
            </p>
            {mrTerritoryInfo.territories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {mrTerritoryInfo.territories.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                  >
                    <FaBuilding size={8} />
                    {t.companyName || t.companyCode}
                    {t.divisionName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.divisionName}
                      </>
                    ) : null}
                    {t.subDivisionName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.subDivisionName}
                      </>
                    ) : null}
                    {t.categoryName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.categoryName}
                      </>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-0">
            Inventory Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-0">
            Live Inventory Analytics & 5-Tier Product Hierarchy Breakdown
          </p>
        </div>
      </div>

      {/* 5-Tier Product Hierarchy Filter on Dashboard */}
      <InventoryHierarchyFilter
        initialValues={hierarchyFilters}
        onChange={(newFilters) => setHierarchyFilters(newFilters)}
        onReset={() =>
          setHierarchyFilters({
            companyCode: "",
            divisionCode: "",
            subDivisionCode: "",
            categoryCode: "",
            productCode: "",
          })
        }
        title="Dashboard Hierarchy Filter (Company → Division → Sub-Division → Category → Product)"
        subtitle="Narrow down all dashboard metrics, stock alerts, and breakdowns by selecting any level"
      />

      {/* KPI Cards (Including Negative Stock!) */}
      <InventoryCards
        summary={summary}
        role={role}
        activeFilter={
          alertView === "negative"
            ? "negative_stock"
            : alertView === "low_stock"
            ? "low_stock"
            : undefined
        }
        onCardClick={handleCardClick}
      />

      {/* ==================== STOCK ALERTS SECTION (LOW STOCK & NEGATIVE STOCK) ==================== */}
      <div id="stock-alerts-section" className="space-y-3 pt-2">
        {/* Interactive View Selector Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stock Alerts View:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              (Click to toggle full views)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Negative Stock Button */}
            <button
              type="button"
              onClick={() => setAlertView("negative")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                alertView === "negative"
                  ? "bg-rose-600 text-white ring-2 ring-rose-400 scale-[1.02]"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <FaTimesCircle size={12} />
              <span>Negative Stock ({negativeProducts.length})</span>
            </button>

            {/* 2. Low Stock Button */}
            <button
              type="button"
              onClick={() => setAlertView("low_stock")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                alertView === "low_stock"
                  ? "bg-amber-500 text-white ring-2 ring-amber-400 scale-[1.02]"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <FaExclamationTriangle size={12} />
              <span>Low Stock ({lowStockProducts.length})</span>
            </button>

            {/* 3. Side-by-Side (Both) */}
            <button
              type="button"
              onClick={() => setAlertView("both")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                alertView === "both"
                  ? "bg-slate-800 text-white ring-2 ring-slate-400 scale-[1.02]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              <FaLayerGroup size={12} />
              <span>Side-by-Side (Both)</span>
            </button>
          </div>
        </div>

        {/* View 1: Focused Negative Stock Table */}
        {alertView === "negative" && (
          <div className="w-full animate-fadeIn">
            <NegativeStockTable
              products={negativeProducts}
              role={role}
              isFullWidth={true}
            />
          </div>
        )}

        {/* View 2: Focused Low Stock Table */}
        {alertView === "low_stock" && (
          <div className="w-full animate-fadeIn">
            <LowStockTable
              products={lowStockProducts}
              role={role}
              isFullWidth={true}
            />
          </div>
        )}

        {/* View 3: Side-by-Side */}
        {alertView === "both" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
            <div>
              <NegativeStockTable
                products={negativeProducts}
                role={role}
                isFullWidth={false}
              />
            </div>
            <div>
              <LowStockTable
                products={lowStockProducts}
                role={role}
                isFullWidth={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* ==================== FILTERED PRODUCTS LIST TABLE ==================== */}
      <div>
        <DashboardProductsTable
          products={filteredProducts}
          role={role}
        />
      </div>

      {/* ==================== TOP PRODUCTS ==================== */}
      <div>
        <TopProductsTable products={topProducts} />
      </div>
    </div>
  );
}
