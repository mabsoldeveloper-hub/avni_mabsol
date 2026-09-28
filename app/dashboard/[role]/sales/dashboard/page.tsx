"use client";

import { useEffect, useState, useCallback } from "react";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";

import SalesCards from "@/components/sales/SalesCards";
import RecentBills from "@/components/sales/RecentBills";
import TopProducts from "@/components/sales/TopProducts";
import CustomerWiseSales from "@/components/sales/CustomerWiseSales";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

export default function SalesDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const { selectedFY } = useFinancialYear();
  const { selectedCompany } = useCompany();

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

  const loadDashboard = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

    if (selectedFY) {
      if (selectedFY.isAll) {
        params.set("fyId", "ALL");
      } else if (selectedFY._id) {
        params.set("fyId", selectedFY._id);
        if (selectedFY.startDate && selectedFY.endDate) {
          const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
          const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
          params.set("startDate", s);
          params.set("endDate", e);
        }
      }
    }

    const url = `/api/sales/dashboard?${params.toString()}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  }, [selectedFY, selectedCompany?._id]);

  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

  useEffect(() => {
    loadDashboard();
    const onFyChange = () => loadDashboard();
    window.addEventListener("financial-year-changed", onFyChange);
    return () => window.removeEventListener("financial-year-changed", onFyChange);
  }, [loadDashboard]);

  if (!summary) {
    return <div className="text-center mt-5">Loading...</div>;
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
              Aap sirf apni assigned territory ka sales dashboard data dekh sakte hain.
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

      <SalesCards summary={summary} />

      <div className="row mt-4">
        <div className="col-lg-12">
          <TopProducts />
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-lg-12">
          <CustomerWiseSales />
        </div>
      </div>

      <div className="mt-4">
        <RecentBills />
      </div>
    </div>
  );
}