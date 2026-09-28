// "use client";

// import { useEffect,useState } from "react";

// import InventoryCards from "@/components/inventory/InventoryCards";

// export default function InventoryDashboard(){

// const [summary,setSummary]=useState<any>(null);

// useEffect(()=>{

// loadDashboard();

// },[]);

// const loadDashboard=async()=>{

// const res=await fetch("/api/inventory/dashboard");

// const data=await res.json();

// setSummary(data);

// }

// if(!summary){

// return <h4 className="text-center mt-5">Loading...</h4>

// }

// return(

// <div className="container-fluid">

// <h2 className="mb-4">

// Inventory Dashboard

// </h2>

// <InventoryCards summary={summary}/>

// </div>

// )

// }
"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";

import InventoryCards from "@/components/inventory/InventoryCards";
import LowStockTable from "@/components/inventory/LowStockTable";
import NegativeStockTable from "@/components/inventory/NegativeStockTable";
import TopProductsTable from "@/components/inventory/TopProductsTable";
import CompanySummary from "@/components/inventory/CompanySummary";

import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

export default function InventoryDashboard() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

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

  const summary = useMemo(() => {

    const totalProducts = products.length;

    const activeProducts =
      products.filter(
        (p: any) => p.STATUS === "Y"
      ).length;

    const inactiveProducts =
      products.filter(
        (p: any) => p.STATUS !== "Y"
      ).length;

    const totalCompanies =
      new Set(
        products
          .map(
            (p: any) =>
              p.companyName || p.GCODE
          )
          .filter(Boolean)
      ).size;

    const availableProducts =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) > 0
      ).length;

    const lowStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) > 0 &&
          Number(p.BALANCE) <= 10
      ).length;

    const outOfStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) <= 0
      ).length;

    const negativeStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) < 0
      ).length;

    const totalStock =
      products.reduce(
        (sum: number, p: any) =>
          sum + Number(p.BALANCE || 0),
        0
      );

    const stockValue =
      products.reduce(
        (sum: number, p: any) =>
          sum +
          Number(p.BALANCE || 0) *
            Number(p.PRATE || 0),
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

  }, [products]);

  const lowStockProducts =
    products.filter(
      (p: any) =>
        Number(p.BALANCE) > 0 &&
        Number(p.BALANCE) <= 10
    );

  const negativeProducts =
    products.filter(
      (p: any) =>
        Number(p.BALANCE) < 0
    );

  const topProducts =
    [...products]
      .sort(
        (a: any, b: any) =>
          Number(b.BALANCE) -
          Number(a.BALANCE)
      )
      .slice(0, 10);

  if (loading) {

    return (

      <div className="text-center mt-5">

        Loading...

      </div>

    );

  }

  return (

    <div className="container-fluid">

      {/* ==================== MR TERRITORY BANNER ==================== */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm mb-4">
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

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>

          <h2 className="mb-0">

            Inventory Dashboard

          </h2>

          <small className="text-muted">

            Live Inventory Analytics

          </small>

        </div>

      </div>

      <InventoryCards
        summary={summary}
      />

      <div className="row mt-4">

        <div className="col-lg-6">

          <LowStockTable
            products={lowStockProducts}
          />

        </div>

        <div className="col-lg-6">

          <NegativeStockTable
            products={negativeProducts}
          />

        </div>

      </div>

      <div className="row mt-4">

        <div className="col-lg-12">

          <TopProductsTable
            products={topProducts}
          />

        </div>

      </div>

        <div className="row mt-4">
            <div className="col-lg-12">
                <CompanySummary
                    products={products}
                />
            </div>
        </div>

    </div>

  );

}