"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser } from "./UserContext";

export interface CompanyType {
  _id: string;
  companyCode: string;
  companyName: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  website?: string;
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logo?: string;
  isDefault?: boolean;
  status?: string;
}

interface CompanyContextType {
  companies: CompanyType[];
  selectedCompany: CompanyType | null;
  setSelectedCompany: (company: CompanyType) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  loading: true,
  refreshCompanies: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyType | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mabsol_selected_company");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return !localStorage.getItem("mabsol_selected_company");
      } catch {}
    }
    return true;
  });

  const userCompId = user?.companyId?._id || (typeof user?.companyId === "string" ? user?.companyId : null);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/company-master");
      if (!res.ok) return;
      const data: CompanyType[] = await res.json();
      setCompanies(data || []);

      if (!data || data.length === 0) {
        setSelectedCompanyState(null);
        setLoading(false);
        return;
      }

      // Check localStorage for saved company selection
      let savedStr: string | null = null;
      if (typeof window !== "undefined") {
        savedStr = localStorage.getItem("mabsol_selected_company");
      }

      let chosen: CompanyType | null = null;

      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          const match = data.find((c) => c._id === parsed._id || c.companyCode === parsed.companyCode);
          if (match) {
            chosen = match;
          }
        } catch {}
      }

      // Fallback 1: User's assigned company from UserContext
      if (!chosen && userCompId) {
        const userMatch = data.find((c) => c._id === userCompId);
        if (userMatch) chosen = userMatch;
      }

      // Fallback 2: Default company
      if (!chosen) {
        chosen =
          data.find((c) => c.isDefault) ||
          data.find((c) => c.companyName?.toLowerCase().includes("skylark")) ||
          data[0];
      }

      if (chosen) {
        setSelectedCompanyState((prev: any) => {
          if (prev && prev._id === chosen?._id) return prev;
          if (typeof window !== "undefined") {
            try { localStorage.setItem("mabsol_selected_company", JSON.stringify(chosen)); } catch {}
          }
          return chosen;
        });
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  }, [userCompId]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const changeSelectedCompany = useCallback((company: CompanyType) => {
    setSelectedCompanyState(company);
    if (typeof window !== "undefined") {
      localStorage.setItem("mabsol_selected_company", JSON.stringify(company));
      window.dispatchEvent(new CustomEvent("company-changed", { detail: company }));
    }
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany: changeSelectedCompany,
        loading,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
