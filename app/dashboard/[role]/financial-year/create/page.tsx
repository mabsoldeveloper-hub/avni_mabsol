"use client";

import { useEffect, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";

export default function CreateFYPage() {
  const { selectedCompany } = useCompany();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyId: "",
    fyCode: "",
    fyName: "",
    startDate: "",
    endDate: "",
    isCurrent: true,
  });

  useEffect(() => {
    fetch("/api/company-master")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data || []);
        if (selectedCompany?._id) {
          setForm((prev) => ({ ...prev, companyId: selectedCompany._id }));
        } else if (data && data.length > 0) {
          setForm((prev) => ({ ...prev, companyId: data[0]._id }));
        }
      });
  }, [selectedCompany]);

  const saveFY = async () => {
    if (!form.companyId) {
      alert("Please select a company");
      return;
    }
    if (!form.fyName) {
      alert("Please enter FY Name (e.g. 2025-26)");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/financial-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create FY");
      }

      alert("Financial Year Created Successfully!");

      setForm({
        companyId: selectedCompany?._id || "",
        fyCode: "",
        fyName: "",
        startDate: "",
        endDate: "",
        isCurrent: true,
      });
    } catch (err: any) {
      alert(err.message || "Error creating Financial Year");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg text-sm px-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all font-medium";

  const labelClass =
    "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        max-w-3xl mx-auto
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaCalendarAlt size={13} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Create Financial Year (ERP Scope)
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Select Company */}
          <div className="md:col-span-2">
            <label className={labelClass}>1. Select Company *</label>
            <select
              className={inputClass}
              value={form.companyId}
              onChange={(e) =>
                setForm({ ...form, companyId: e.target.value })
              }
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.companyCode || "No Code"})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: FY Code */}
          <div>
            <label className={labelClass}>2. FY Code* (e.g. I05, I06, I04)</label>
            <input className={inputClass} placeholder="e.g. I05" value={form.fyCode} onChange={(e) => setForm({ ...form, fyCode: e.target.value.toUpperCase() })} required />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Unique per company table (e.g. SUBDIS_I05)
            </span>
          </div>

          {/* Step 3: FY Name */}
          <div>
            <label className={labelClass}>3. FY Name * (e.g. 2025-26)</label>
            <input
              className={inputClass}
              placeholder="e.g. 2025-26"
              value={form.fyName}
              onChange={(e) =>
                setForm({ ...form, fyName: e.target.value })
              }
            />
          </div>

          {/* Step 4: Start Date */}
          <div>
            <label className={labelClass}>4. Start Date *</label>
            <input
              type="date"
              className={inputClass}
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>

          {/* Step 5: End Date */}
          <div>
            <label className={labelClass}>5. End Date *</label>
            <input
              type="date"
              className={inputClass}
              value={form.endDate}
              onChange={(e) =>
                setForm({ ...form, endDate: e.target.value })
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-200/70 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            Set as Current Active FY for this Company
          </label>

          <button
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            onClick={saveFY}
            disabled={loading}
          >
            {loading ? "Saving..." : "Create Financial Year"}
          </button>
        </div>
      </div>
    </div>
  );
}