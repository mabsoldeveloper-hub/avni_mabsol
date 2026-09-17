"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useCompany } from "./CompanyContext";

export interface FinancialYearType {
  _id: string;
  fyCode?: string;
  fyName: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  isAll?: boolean;
  companyId?: any;
}

interface FinancialYearContextType {
  fyList: FinancialYearType[];
  selectedFY: FinancialYearType | null;
  setSelectedFY: (fy: FinancialYearType) => void;
  loading: boolean;
  refreshFYs: () => Promise<void>;
}

const FinancialYearContext = createContext<FinancialYearContextType>({
  fyList: [],
  selectedFY: null,
  setSelectedFY: () => {},
  loading: true,
  refreshFYs: async () => {},
});

export const ALL_FY: FinancialYearType = {
  _id: "ALL",
  fyName: "All Financial Years",
  isAll: true,
};

const getInitialFY = (): FinancialYearType | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("mabsol_selected_fy");
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return null;
};

export function FinancialYearProvider({ children }: { children: React.ReactNode }) {
  const { selectedCompany } = useCompany();
  const [fyList, setFyList] = useState<FinancialYearType[]>([]);
  const [selectedFY, setSelectedFYState] = useState<FinancialYearType | null>(() => getInitialFY());
  const [loading, setLoading] = useState(() => (typeof window !== "undefined" && localStorage.getItem("mabsol_selected_fy") ? false : true));

  const fetchFYs = useCallback(async () => {
    try {
      const url = selectedCompany?._id
        ? `/api/financial-year?companyId=${selectedCompany._id}`
        : "/api/financial-year";

      const res = await fetch(url);
      if (!res.ok) return;
      const data: FinancialYearType[] = await res.json();

      const companyAllFY: FinancialYearType = {
        _id: "ALL",
        fyName: selectedCompany ? `All FY (${selectedCompany.companyName})` : "All Financial Years",
        isAll: true,
      };

      const fullList = [companyAllFY, ...data];
      setFyList(fullList);

      // Check saved selection in localStorage for current company
      let savedStr: string | null = null;
      if (typeof window !== "undefined") {
        savedStr = localStorage.getItem(`mabsol_selected_fy_${selectedCompany?._id || "global"}`);
        if (!savedStr) {
          savedStr = localStorage.getItem("mabsol_selected_fy");
        }
      }

      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          const match = fullList.find((x) => x._id === parsed._id || x.fyName === parsed.fyName);
          if (match) {
            setSelectedFYState((prev) =>
              prev?._id === match._id && prev?.fyCode === match.fyCode ? prev : match
            );
            setLoading(false);
            return;
          }
        } catch {
          // Fall back
        }
      }

      // Default to current calendar year FY (e.g. 2026-27) or current FY from DB
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
      const expectedFyName = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

      const matchedCurrentDateFY = data.find(
        (x) => x.fyName?.includes(expectedFyName) || x.fyName === expectedFyName
      );
      const currentFY =
        matchedCurrentDateFY || data.find((x) => x.isCurrent) || data[0] || companyAllFY;

      setSelectedFYState((prev) =>
        prev?._id === currentFY._id && prev?.fyCode === currentFY.fyCode ? prev : currentFY
      );
    } catch (err) {
      console.error("Failed to load financial years", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?._id]);

  useEffect(() => {
    fetchFYs();
  }, [fetchFYs]);

  const changeSelectedFY = useCallback((fy: FinancialYearType) => {
    setSelectedFYState((prev) => (prev?._id === fy._id && prev?.fyCode === fy.fyCode ? prev : fy));
    if (typeof window !== "undefined") {
      const storageKey = `mabsol_selected_fy_${selectedCompany?._id || "global"}`;
      localStorage.setItem(storageKey, JSON.stringify(fy));
      localStorage.setItem("mabsol_selected_fy", JSON.stringify(fy));
      window.dispatchEvent(new Event("financial-year-changed"));
    }

    if (!fy.isAll) {
      fetch("/api/financial-year/set-current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fyId: fy._id, companyId: selectedCompany?._id }),
      }).catch((err) => console.error("Error setting current FY", err));
    }
  }, [selectedCompany?._id]);

  return (
    <FinancialYearContext.Provider
      value={{
        fyList,
        selectedFY,
        setSelectedFY: changeSelectedFY,
        loading,
        refreshFYs: fetchFYs,
      }}
    >
      {children}
    </FinancialYearContext.Provider>
  );
}

export function useFinancialYear() {
  return useContext(FinancialYearContext);
}

export function useFinancialYearListener(onFYChange: () => void) {
  const { selectedFY } = useFinancialYear();

  useEffect(() => {
    onFYChange();
    const handleEvent = () => onFYChange();
    window.addEventListener("financial-year-changed", handleEvent);
    return () => window.removeEventListener("financial-year-changed", handleEvent);
  }, [selectedFY, onFYChange]);
}
