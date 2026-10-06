"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaBuilding,
  FaSpinner,
  FaLayerGroup,
  FaArrowLeft,
  FaSave,
  FaCamera,
  FaMapMarkerAlt,
  FaCheck,
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";

const PHARMA_MODULES = [
  { id: "dashboard", label: "Executive AI & Standard Dashboard", desc: "KPI Cards, AI Smart Alerts, Radar & Targets" },
  { id: "sales", label: "Sales & Invoicing", desc: "Invoices, Orders, Receipts, Bad Debts & Sales vs Collection" },
  { id: "purchase", label: "Purchase & Inward (GRN)", desc: "Purchase Bills, AI Bill Entry, Debit Notes & Payments" },
  { id: "inventory", label: "Inventory & Expiry Control", desc: "Stock Overview, Batch Expiry Liquidator & Stock Ledger" },
  { id: "customer", label: "Customer & Party Accounts", desc: "Customer Directory, Ledgers & Contact Profiles" },
  { id: "master", label: "Pharma Master Data", desc: "Accounting Groups, MR Master, Products, HSN & Divisions" },
  { id: "area", label: "Territory & Area Management", desc: "Territory Assignment, Regional HQ, Zones & Maps" },
  { id: "compare", label: "Comparative Analytics & Radar", desc: "Financial Year Wise & Area Map Analytics" },
  { id: "leads", label: "Leads & Marketing Campaigns", desc: "Pipelines, Email Campaign, WhatsApp & Broadcast Hub" },
  { id: "custom-forms", label: "Custom Form Studio", desc: "Dynamic Inspection Forms, Order Templates & Builders" },
  { id: "financial-year", label: "Financial Year (FY) Control", desc: "Create, Switch & Manage Financial Years" },
  { id: "reports", label: "Executive Reports & MIS", desc: "Sales, Inward/Outward & GST Tax Reports" },
  { id: "mabsolcrmsync", label: "Desktop Sync Agent", desc: "Secure ERP Data Sync Bridge & Multi-Branch Sync" },
  { id: "users", label: "Users & Hierarchy Permissions", desc: "Staff Management, Roles & Hierarchy Assignment" },
  { id: "settings", label: "Settings & Customization", desc: "Company Settings, Menu Layouts, Voice AI & Notifications" },
  { id: "company", label: "Company & Branch Directory", desc: "Branch Entity Management & Multi-Branch Settings" },
];

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const { refreshCompanies } = useCompany();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);

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
      }
    } catch {
      showToast("Failed to load company details", "error");
    } finally {
      setFetching(false);
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

    if (file.size > 5 * 1024 * 1024) {
      showToast("Maximum logo file size is 5MB", "error");
      return;
    }

    setLogoUploading(true);
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
        showToast("Company logo updated successfully", "success");
      } else {
        showToast(data.message || "Failed to upload logo", "error");
      }
    } catch {
      showToast("Failed to upload logo", "error");
    } finally {
      setLogoUploading(false);
    }
  };

  const updateCompany = async () => {
    const name = form.companyName?.trim() || "";
    if (!name) {
      showToast("Company legal name is required", "error");
      return;
    }
    if (name.length < 2) {
      showToast("Company legal name must be at least 2 characters", "error");
      return;
    }

    if (form.mobile) {
      const cleanMobile = form.mobile.replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        showToast("Phone / Mobile number must be exactly 10 digits", "error");
        return;
      }
    }

    if (form.pincode) {
      const cleanPin = form.pincode.replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        showToast("Pincode must be exactly 6 digits", "error");
        return;
      }
    }

    if (form.panNo) {
      const pan = form.panNo.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(pan)) {
        showToast("Invalid PAN format. Must be 10 characters (e.g. AABCE6145N)", "error");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/company-master/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Guarantee that protected fields cannot be altered by tampering
          companyCode: form.companyCode,
          gstNo: form.gstNo,
          email: form.email,
        }),
      });

      const data = await res.json();

      if (res.ok && !data.error) {
        showToast("Company profile updated successfully", "success");
        await refreshCompanies();
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
    "w-full rounded-xl text-xs sm:text-[13px] px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all font-medium";

  const disabledInputClass =
    "w-full rounded-xl text-xs sm:text-[13px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 font-medium select-none cursor-not-allowed outline-none";

  const labelClass =
    "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5";

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-sm font-semibold">
        <FaSpinner className="animate-spin mr-2" /> Loading company profile...
      </div>
    );
  }

  const allModulesSelected = Array.isArray(form.enabledModules) && form.enabledModules.length === PHARMA_MODULES.length;

  return (
    <div className="w-full space-y-4 pb-12">
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
              Update company identity, address, and module permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => router.push("/dashboard/company/list")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={updateCompany}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSave size={12} />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ─── Card 1: Company Identity & Legal Details ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900">
          <FaBuilding className="text-indigo-600" size={14} />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
            Company Identity & Legal Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Logo Box */}
          <div className="md:col-span-3 flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden relative">
              {logoUploading ? (
                <FaSpinner className="animate-spin text-indigo-600" size={24} />
              ) : logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <FaBuilding className="text-slate-300" size={32} />
              )}
            </div>
            <label className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold border border-indigo-200/60 cursor-pointer transition-colors shadow-2xs">
              <FaCamera size={11} /> {logoUploading ? "Uploading..." : "Change Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={logoUploading}
                onChange={uploadLogo}
              />
            </label>
            <span className="text-[10px] text-slate-400 mt-1.5 font-medium">PNG, JPG, WEBP up to 5MB</span>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Legal / Trade Name *</label>
              <input
                className={inputClass}
                value={form.companyName || ""}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Enter Company Registered Name"
              />
            </div>

            {/* Non-editable Company Code */}
            <div>
              <label className={labelClass}>Company CRM Code</label>
              <input
                disabled
                readOnly
                className={`${disabledInputClass} font-mono font-bold uppercase`}
                value={form.companyCode || ""}
                title="Company Code is permanently locked"
              />
            </div>

            {/* Non-editable GSTIN Number */}
            <div>
              <label className={labelClass}>GSTIN Number</label>
              <input
                disabled
                readOnly
                className={`${disabledInputClass} font-mono font-bold uppercase`}
                value={form.gstNo || "NOT PROVIDED"}
                title="GSTIN Number is verified and locked"
              />
            </div>

            <div>
              <label className={labelClass}>Owner / Director Name</label>
              <input
                className={inputClass}
                value={form.ownerName || ""}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="Director or Owner Name"
              />
            </div>

            <div>
              <label className={labelClass}>PAN Number</label>
              <input
                className={`${inputClass} font-mono uppercase`}
                maxLength={10}
                value={form.panNo || ""}
                onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })}
                placeholder="e.g. AABCE6145N"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Drug License No (DL)</label>
              <input
                className={inputClass}
                value={form.drugLicenseNo || ""}
                onChange={(e) => setForm({ ...form, drugLicenseNo: e.target.value })}
                placeholder="e.g. DL-20B/21B-XXXX"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card 2: Contact & Registered Address ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900">
          <FaMapMarkerAlt className="text-indigo-600" size={14} />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
            Contact & Registered Address
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Non-editable Primary Work Email */}
          <div>
            <label className={labelClass}>Work Email (Administrator)</label>
            <input
              type="email"
              disabled
              readOnly
              className={disabledInputClass}
              value={form.email || ""}
              title="Administrator Work Email cannot be changed"
            />
          </div>

          <div>
            <label className={labelClass}>Phone / Mobile Number</label>
            <input
              type="tel"
              maxLength={10}
              className={inputClass}
              value={form.mobile || ""}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })}
              placeholder="10-digit mobile"
            />
          </div>

          <div>
            <label className={labelClass}>Company Website</label>
            <input
              className={inputClass}
              value={form.website || ""}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className={labelClass}>Premises / Street Address</label>
            <textarea
              rows={2}
              className={inputClass}
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Registered street address"
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city || ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="City"
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.state || ""}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="State"
            />
          </div>

          <div>
            <label className={labelClass}>Pincode</label>
            <input
              className={inputClass}
              maxLength={6}
              value={form.pincode || ""}
              onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
              placeholder="6-digit PIN"
            />
          </div>
        </div>
      </div>

      {/* ─── Card 3: Module Permissions & Visibility (All 16 Modules Matching Create Page) ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900">
            <FaLayerGroup className="text-indigo-600 shrink-0" size={15} />
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 m-0">
                Module Permissions & Access Control ({PHARMA_MODULES.length} Total)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium m-0">
                Toggle module access for this company. Disabled modules will not appear in navigation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setForm((prev: any) => ({
                ...prev,
                enabledModules: allModulesSelected ? ["dashboard"] : PHARMA_MODULES.map((m) => m.id),
              }))
            }
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg border border-indigo-200/60 self-start sm:self-auto cursor-pointer transition-colors"
          >
            {allModulesSelected ? "Deselect All Modules" : "Select All Modules"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {PHARMA_MODULES.map((mod) => {
            const isSelected = Array.isArray(form.enabledModules) && form.enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                  isSelected
                    ? "bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-xs"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 opacity-70 hover:opacity-100 hover:bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isSelected && <FaCheck size={9} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight text-slate-900 m-0">
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug m-0">
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