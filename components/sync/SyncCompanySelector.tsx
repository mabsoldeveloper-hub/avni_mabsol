"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useCompany, CompanyType } from "@/context/CompanyContext";

interface SyncCompanySelectorProps {
  initialCompanyCode?: string;
}

export default function SyncCompanySelector({ initialCompanyCode }: SyncCompanySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { companies, selectedCompany, setSelectedCompany, loading } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // If initialCompanyCode is passed and differs from selectedCompany, align if needed
  useEffect(() => {
    if (initialCompanyCode && companies.length > 0 && (!selectedCompany || selectedCompany.companyCode !== initialCompanyCode)) {
      const match = companies.find(
        (c) => (c.companyCode || "").toUpperCase() === initialCompanyCode.toUpperCase()
      );
      if (match) {
        setSelectedCompany(match);
      }
    }
  }, [initialCompanyCode, companies, selectedCompany, setSelectedCompany]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeCompany = selectedCompany || companies[0] || null;

  const handleSelect = (company: CompanyType) => {
    setIsOpen(false);
    setSelectedCompany(company);

    // Notify other components on this page
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mabsol_company_changed", { detail: company }));
    }

    // Preserve existing query params and update companyCode / companyId
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (company.companyCode) {
      params.set("companyCode", company.companyCode);
    }
    if (company._id) {
      params.set("companyId", company._id);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (loading && companies.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white shadow-2xs text-slate-400">
        <Building2 size={13} className="animate-pulse text-teal-600" />
        <span>Loading companies...</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border bg-white shadow-2xs hover:bg-slate-50 transition-all cursor-pointer ${
          isOpen
            ? "border-teal-500 ring-2 ring-teal-100 text-slate-900"
            : "border-slate-200 text-slate-800"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Select company to sync server data"
      >
        <Building2 size={13} className="text-teal-600 shrink-0" />
        <span className="text-slate-400 text-[11px] font-normal hidden sm:inline">Company:</span>
        <span className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">
          {activeCompany?.companyName || "Select Company"}
        </span>
        {activeCompany?.companyCode && (
          <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
            {activeCompany.companyCode}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? "rotate-180 text-slate-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
        >
          <div className="px-3.5 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>SELECT COMPANY TO SYNC</span>
            <span className="text-teal-600 font-mono font-bold">{companies.length} available</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 p-1">
            {companies.map((comp) => {
              const isSelected = activeCompany?._id === comp._id || activeCompany?.companyCode === comp.companyCode;

              return (
                <button
                  key={comp._id || comp.companyCode}
                  type="button"
                  onClick={() => handleSelect(comp)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? "bg-teal-50/80 text-teal-950 font-bold"
                      : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                  }`}
                  role="menuitem"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate leading-snug">
                      {comp.companyName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {comp.companyCode}
                      </span>
                      {comp.isDefault && (
                        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
