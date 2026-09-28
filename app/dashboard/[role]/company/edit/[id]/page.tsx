"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaBuilding,
  FaCheckCircle,
  FaSpinner,
  FaSearch,
  FaLayerGroup,
  FaArrowLeft,
  FaFileInvoice,
  FaSave,
  FaCamera,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";

const PHARMA_MODULES = [
  { id: "dashboard", label: "Executive AI Dashboard", desc: "Performance Radar, KPI Cards & Simulator" },
  { id: "sales", label: "Sales & Invoicing", desc: "Invoices, Credit Notes & Order Management" },
  { id: "purchase", label: "Purchase & Inward (GRN)", desc: "Purchase Bills, Debit Notes & Payments" },
  { id: "inventory", label: "Inventory & Expiry Control", desc: "Batch Tracking, Expiry Alerts & Valuation" },
  { id: "accounting", label: "Financial Accounts & Ledgers", desc: "Receipts, Ledgers & Outstanding Dues" },
  { id: "leads", label: "MabsolCrm & Leads", desc: "Lead Pipelines, Stages & Follow-ups" },
  { id: "fieldforce", label: "MR Fieldforce & Reporting", desc: "Doctor Calls, Chemist Visits & Tours" },
  { id: "reports", label: "Executive Reports & MIS", desc: "Sales Analytics, Territory & Tax Reports" },
  { id: "master", label: "Pharma Master Data", desc: "Products, Categories, Divisions & Areas" },
  { id: "custom_forms", label: "Custom Form Studio", desc: "Dynamic Inspections & Order Templates" },
];

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const { refreshCompanies } = useCompany();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [gstData, setGstData] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [form, setForm] = useState<any>({
    companyCode: "",
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    gstNo: "",
    panNo: "",
    drugLicenseNo: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    invoicePrefix: "INV-001",
    purchasePrefix: "PUR-001",
    currency: "INR",
    logo: "",
    status: "Active",
    enabledModules: [],
  });

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id]);

  const loadCompany = async () => {
    try {
      setFetching(true);
      const res = await fetch(`/api/company-master/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setForm({
          ...data,
          enabledModules: Array.isArray(data.enabledModules) ? data.enabledModules : PHARMA_MODULES.map((m) => m.id),
        });
        if (data.logo) setLogoPreview(data.logo);
        if (data.gstNo) setGstVerified(true);
      }
    } catch {
      showToast("Failed to load company details", "error");
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyGst = async (overrideGst?: string) => {
    const rawGst = (overrideGst || form.gstNo || "").trim().toUpperCase();
    if (rawGst.length !== 15) {
      showToast("Please enter a valid 15-character GSTIN", "error");
      return;
    }

    setVerifyingGst(true);
    try {
      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: rawGst }),
      });
      const data = await res.json();

      if (data.valid && data.details) {
        const d = data.details;
        setGstVerified(true);
        setGstData(d);

        const resolvedName = d.businessName || d.tradeName || d.legalName || form.companyName;

        setForm((prev: any) => ({
          ...prev,
          gstNo: rawGst,
          companyName: resolvedName || prev.companyName,
          panNo: d.pan || prev.panNo,
          address: d.address || prev.address,
          city: d.city || prev.city,
          state: d.state || prev.state,
          pincode: d.pincode || prev.pincode,
        }));

        showToast(`GST Verified: ${resolvedName} (${d.status || "Active"})`, "success");
      } else {
        setGstVerified(false);
        showToast(data.message || "Invalid GST Number", "error");
      }
    } catch {
      showToast("Failed to verify GST with Government Portal", "error");
    } finally {
      setVerifyingGst(false);
    }
  };

  const toggleModule = (modId: string) => {
    setForm((prev: any) => {
      const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
      const exists = current.includes(modId);
      if (exists) {
        return { ...prev, enabledModules: current.filter((m: string) => m !== modId) };
      } else {
        return { ...prev, enabledModules: [...current, modId] };
      }
    });
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Maximum logo size is 2MB", "error");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setLogoPreview(data.url);
        setForm((prev: any) => ({ ...prev, logo: data.url }));
        showToast("Company logo updated", "success");
      }
    } catch {
      showToast("Failed to upload logo", "error");
    }
  };

  const updateCompany = async () => {
    if (!form.companyName?.trim()) {
      showToast("Company name is required", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/company-master/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success || data._id) {
        showToast("Company updated successfully", "success");
        await refreshCompanies();
        await loadCompany();
        router.push("/dashboard/company/list");
      } else {
        showToast(data.error || "Update Failed", "error");
      }
    } catch {
      showToast("Failed to update company", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl text-xs sm:text-[13px] px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all font-medium";

  const labelClass =
    "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1";

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-sm font-semibold">
        <FaSpinner className="animate-spin mr-2" /> Loading company profile...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* ─── Top Bar Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/company/list")}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Back to Company List"
          >
            <FaArrowLeft size={12} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight m-0">
              Edit Company: {form.companyName || "Company"}
            </h1>
            <p className="text-xs text-slate-500 font-medium m-0">
              Manage enterprise details, GST verification, and module permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => router.push("/dashboard/company/list")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={updateCompany}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSave size={12} />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ─── Card 1: Fast GST Auto-Fill Header Card ─── */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-purple-50/70 border border-indigo-100 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-indigo-950">
            <FaFileInvoice className="text-indigo-600 shrink-0" size={15} />
            <span className="text-xs sm:text-sm font-extrabold">GSTIN Verification & Auto-Fill</span>
          </div>

          {gstVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-300 self-start sm:self-auto">
              <FaCheckCircle className="text-emerald-600" /> GST Active & Verified
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <input
              className="w-full pl-3.5 pr-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-slate-900 font-mono font-bold text-sm tracking-wider uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
              placeholder="Enter 15-Digit GSTIN"
              maxLength={15}
              value={form.gstNo || ""}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setForm({ ...form, gstNo: val });
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleVerifyGst()}
            disabled={verifyingGst || !form.gstNo?.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
          >
            {verifyingGst ? <FaSpinner className="animate-spin" /> : <FaSearch size={11} />}
            {verifyingGst ? "Verifying..." : "Verify GST"}
          </button>
        </div>
      </div>

      {/* ─── Card 2: Company Identity & Basic Info ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900">
          <FaBuilding className="text-indigo-600" size={14} />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
            Company Identity & Legal Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Logo Box */}
          <div className="md:col-span-3 flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <FaBuilding className="text-slate-300" size={28} />
              )}
            </div>
            <label className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold border border-indigo-200/60 cursor-pointer transition-colors">
              <FaCamera size={10} /> Change Logo
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            </label>
            <span className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 2MB</span>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Legal / Trade Name *</label>
              <input
                className={inputClass}
                value={form.companyName || ""}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Company Code</label>
              <input
                className={`${inputClass} font-mono uppercase font-bold`}
                value={form.companyCode || ""}
                onChange={(e) => setForm({ ...form, companyCode: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label className={labelClass}>Owner / Director Name</label>
              <input
                className={inputClass}
                value={form.ownerName || ""}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>PAN Number</label>
              <input
                className={`${inputClass} font-mono uppercase`}
                maxLength={10}
                value={form.panNo || ""}
                onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label className={labelClass}>Drug License No (DL)</label>
              <input
                className={inputClass}
                value={form.drugLicenseNo || ""}
                onChange={(e) => setForm({ ...form, drugLicenseNo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card 3: Contact & Address Information ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900">
          <FaMapMarkerAlt className="text-indigo-600" size={14} />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
            Contact & Registered Address
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          <div>
            <label className={labelClass}>Work Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Phone / Mobile Number</label>
            <input
              className={inputClass}
              value={form.mobile || ""}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Company Website</label>
            <input
              className={inputClass}
              value={form.website || ""}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className={labelClass}>Premises / Street Address</label>
            <textarea
              rows={2}
              className={inputClass}
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city || ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.state || ""}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Pincode</label>
            <input
              className={inputClass}
              maxLength={6}
              value={form.pincode || ""}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ─── Card 4: Module Permissions & Visibility ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900">
          <FaLayerGroup className="text-indigo-600" size={14} />
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
              Module Permissions & Capabilities
            </h2>
            <p className="text-[11px] text-slate-500 font-medium m-0">
              Toggle module access for this company. Disabled modules will not show in navigation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PHARMA_MODULES.map((mod) => {
            const isSelected = Array.isArray(form.enabledModules) && form.enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs"
                    : "bg-slate-50/50 border-slate-200 text-slate-600 opacity-60 hover:opacity-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer pointer-events-none shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold leading-tight m-0">
                    {mod.label}
                  </p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight m-0">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/company/list")}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={updateCompany}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSave size={12} />}
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}