"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  isHeadOffice?: boolean;
  parentCompanyId?: string | null;
  enabledModules?: string[];
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
  const userCompIdRef = useRef(userCompId);
  userCompIdRef.current = userCompId;

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

      // 1. If user previously chose a company in localStorage (and it is in accessible companies), preserve that selection!
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          const match = data.find(
            (c) => String(c._id) === String(parsed._id) || c.companyCode === parsed.companyCode
          );
          if (match) {
            chosen = match;
          }
        } catch {}
      }

      // 2. Fallback to assigned company if no saved selection
      const currentAssignedId = userCompIdRef.current;
      if (!chosen && currentAssignedId) {
        const userMatch = data.find((c) => String(c._id) === String(currentAssignedId));
        if (userMatch) chosen = userMatch;
      }

      // 3. Fallback to default company or first available
      if (!chosen) {
        chosen =
          data.find((c) => c.isDefault) ||
          data.find((c) => c.companyName?.toLowerCase().includes("skylark")) ||
          data[0];
      }

      if (chosen) {
        setSelectedCompanyState((prev: any) => {
          const isIdentical =
            prev &&
            String(prev._id) === String(chosen?._id) &&
            JSON.stringify(prev.enabledModules) === JSON.stringify(chosen?.enabledModules) &&
            prev.status === chosen?.status &&
            prev.companyName === chosen?.companyName;

          if (isIdentical) return prev;

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("mabsol_selected_company", JSON.stringify(chosen));
              document.cookie = `mabsol_selected_company_id=${chosen._id}; path=/; max-age=31536000; SameSite=Lax`;
            } catch {}
          }
          return chosen;
        });
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies, userCompId]);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      fetchCompanies();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mabsol_permissions_version" || e.key === "mabsol_user") {
        fetchCompanies();
      }
    };
    window.addEventListener("mabsol-permissions-updated", handlePermissionsUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("mabsol-permissions-updated", handlePermissionsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchCompanies]);

  const changeSelectedCompany = useCallback((company: CompanyType) => {
    setSelectedCompanyState(company);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mabsol_selected_company", JSON.stringify(company));
        document.cookie = `mabsol_selected_company_id=${company._id}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
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
