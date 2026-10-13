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
  FaLock,
  FaTimes,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { validateEmail } from "@/lib/constants/validation.constant";

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
  const { user } = useUser();
  const { selectedCompany, refreshCompanies } = useCompany();

  // Super Admin check
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.roleType === "SuperAdmin" ||
    user?.role === "SuperAdmin" ||
    user?.email?.toLowerCase() === "mabsoldeveloper@gmail.com"
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoImgError, setLogoImgError] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Password reset state (available for Head Office editing Child Branch OR Super Admin)
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Field errors & touched states for inline validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
    parentCompanyId: null,
  });

  // Self-edit check: user is editing the active company itself
  const isEditingSelf = Boolean(
    selectedCompany && String(selectedCompany._id) === String(id)
  );

  // Child branch active context
  const isOperatingAsChild = Boolean(
    !isSuperAdmin &&
    selectedCompany &&
    (selectedCompany.isHeadOffice === false || selectedCompany.parentCompanyId)
  );

  // Head Office editing its Child Branch check
  const isHOEditingChild = Boolean(
    selectedCompany?.isHeadOffice &&
    form.parentCompanyId &&
    String(form.parentCompanyId) === String(selectedCompany._id) &&
    !isEditingSelf
  );

  // Permissions:
  // Head Office editing child branch OR Super Admin can edit branch email & password!
  const canEditCredentials = isSuperAdmin || isHOEditingChild;

  // Head Office editing child branch OR Super Admin can configure module permissions!
  const canEditModules = isSuperAdmin || isHOEditingChild;

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id, selectedCompany?._id]);

  const loadCompany = async () => {
    // If active context is a child branch, they CANNOT edit parent or sibling companies
    if (isOperatingAsChild && selectedCompany && String(selectedCompany._id) !== String(id)) {
      showToast("Access Denied: Branch companies cannot view or edit the parent company", "error");
      router.replace("/dashboard/company/list");
      return;
    }

    try {
      setFetching(true);
      const res = await fetch(`/api/company-master/${id}`, {
        headers: {
          "x-company-id": selectedCompany?._id || "",
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || "Failed to load company details", "error");
        router.replace("/dashboard/company/list");
        return;
      }

      setForm({
        ...data,
        enabledModules: Array.isArray(data.enabledModules) ? data.enabledModules : PHARMA_MODULES.map((m) => m.id),
      });
      if (data.logo) {
        setLogoPreview(data.logo);
        setLogoImgError(false);
      }
    } catch {
      showToast("Failed to load company details", "error");
    } finally {
      setFetching(false);
    }
  };

  // Field Validator
  const validateField = (field: string, val: string): string => {
    const trimmed = String(val || "").trim();

    if (field === "companyName") {
      if (!trimmed) return "Company legal name is required";
      if (trimmed.length < 3) return "Company name must be at least 3 characters";
      if (trimmed.length > 120) return "Company name must not exceed 120 characters";
    }

    if (field === "email" && canEditCredentials) {
      const emailErr = validateEmail(trimmed);
      if (emailErr) return emailErr;
    }

    if (field === "mobile" && trimmed) {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 10) return "Mobile number must be exactly 10 digits";
      if (!/^[6-9]/.test(digits)) return "Indian mobile numbers must start with 6, 7, 8, or 9";
    }

    if (field === "panNo" && trimmed) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(trimmed.toUpperCase())) {
        return "Must be 10 characters (e.g. AABCE6145N)";
      }
    }

    if (field === "pincode" && trimmed) {
      const pinDigits = trimmed.replace(/\D/g, "");
      if (pinDigits.length !== 6) return "Pincode must be exactly 6 digits";
    }

    if (field === "website" && trimmed) {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      if (!urlPattern.test(trimmed)) return "Enter a valid website URL (e.g. https://example.com)";
    }

    return "";
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field] || "");
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const toggleModule = (modId: string) => {
    if (!canEditModules) {
      showToast("Module access is managed by Head Office. Branch companies cannot edit their permissions.", "warning");
      return;
    }

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
        setLogoImgError(false);
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
    // Validate all inputs
    const nameErr = validateField("companyName", form.companyName || "");
    const mobErr = validateField("mobile", form.mobile || "");
    const panErr = validateField("panNo", form.panNo || "");
    const pinErr = validateField("pincode", form.pincode || "");
    const webErr = validateField("website", form.website || "");

    const newErrors: Record<string, string> = {};
    if (nameErr) newErrors.companyName = nameErr;
    if (mobErr) newErrors.mobile = mobErr;
    if (panErr) newErrors.panNo = panErr;
    if (pinErr) newErrors.pincode = pinErr;
    if (webErr) newErrors.website = webErr;

    if (canEditCredentials) {
      const emailErr = validateField("email", form.email || "");
      if (emailErr) newErrors.email = emailErr;

      if (password.trim() && password.trim().length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        companyName: true,
        email: true,
        mobile: true,
        panNo: true,
        pincode: true,
        website: true,
      });
      const firstError = Object.values(newErrors)[0];
      showToast(firstError, "error");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...form,
        companyCode: form.companyCode,
        gstNo: form.gstNo,
        panNo: (form.panNo || "").toUpperCase().trim(),
        mobile: (form.mobile || "").replace(/\D/g, ""),
        pincode: (form.pincode || "").replace(/\D/g, ""),
      };

      // Email & Password permissions
      if (canEditCredentials) {
        payload.email = (form.email || "").toLowerCase().trim();
        if (password.trim().length >= 6) {
          payload.password = password.trim();
        }
      } else {
        // Cannot change own login email from here
        delete payload.email;
        delete payload.password;
      }

      // Module permissions
      if (!canEditModules) {
        delete payload.enabledModules;
        delete payload.isHeadOffice;
        delete payload.parentCompanyId;
        delete payload.status;
      }

      const res = await fetch(`/api/company-master/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": selectedCompany?._id || "",
        },
        body: JSON.stringify(payload),
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

  const getInputClass = (fieldName: string) => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `w-full h-9 px-3 py-1.5 rounded-lg text-xs font-medium outline-none transition-all ${
      hasError
        ? "bg-rose-50/20 border border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
        : "bg-white border border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 shadow-2xs"
    }`;
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-xs font-semibold">
        <FaSpinner className="animate-spin mr-2" /> Loading company profile...
      </div>
    );
  }

  const allModulesSelected = Array.isArray(form.enabledModules) && form.enabledModules.length === PHARMA_MODULES.length;

  return (
    <div className="w-full space-y-3.5 pb-12">
      {/* ─── Top Bar Header (Compact & Professional) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/dashboard/company/list")}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            title="Back to Company List"
          >
            <FaArrowLeft size={11} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight m-0">
                Edit Company
              </h1>
              {form.companyCode && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase">
                  {form.companyCode}
                </span>
              )}
              {form.companyName && (
                <span className="text-xs font-semibold text-slate-600 truncate max-w-[220px] sm:max-w-xs md:max-w-md">
                  · {form.companyName}
                </span>
              )}
              {isHOEditingChild && (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Child Branch of Head Office
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-normal m-0 mt-0.5">
              Update company identity, address, and module configurations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => router.push("/dashboard/company/list")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={updateCompany}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin text-xs" /> : <FaSave size={11} className="shrink-0" />}
            <span>{loading ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* ─── Card 1: Company Identity & Legal Details ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FaBuilding size={13} />
          </div>
          <div>
            <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 m-0">
              Company Identity & Legal Details
            </h2>
            <p className="text-[11px] text-slate-500 font-normal m-0 mt-0.5">
              Registered business credentials, tax identifiers, and official brand logo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Logo Box (Clean, No Broken Icon) */}
          <div className="md:col-span-3 flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
            <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden relative">
              {logoUploading ? (
                <FaSpinner className="animate-spin text-indigo-600" size={20} />
              ) : logoPreview && !logoImgError ? (
                <img
                  src={logoPreview}
                  alt={form.companyName || "Logo"}
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/80 to-slate-100 text-indigo-600 select-none">
                  <FaBuilding size={22} className="text-indigo-400 mb-1" />
                  <span className="text-[9px] font-mono tracking-wider uppercase text-slate-500 font-bold">
                    {form.companyCode || "LOGO"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200/70 cursor-pointer transition-colors shadow-2xs">
                <FaCamera size={10} />
                <span>{logoUploading ? "Uploading..." : logoPreview ? "Change" : "Upload"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={uploadLogo}
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview("");
                    setLogoImgError(false);
                    setForm((p: any) => ({ ...p, logo: "" }));
                  }}
                  className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">PNG, JPG, WEBP up to 5MB</span>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Company Legal / Trade Name <span className="text-rose-500">*</span>
                </label>
                {form.companyName?.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {form.companyName.length} chars
                  </span>
                )}
              </div>
              <input
                className={getInputClass("companyName")}
                value={form.companyName || ""}
                onChange={(e) => handleFieldChange("companyName", e.target.value)}
                onBlur={() => handleBlur("companyName")}
                placeholder="Enter Company Registered Name"
              />
              {touched.companyName && errors.companyName && (
                <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                  <FaExclamationCircle size={10} /> {errors.companyName}
                </p>
              )}
            </div>

            {/* Permanent Locked Company Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">Company CRM Code</label>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  <FaLock size={8} /> Permanent
                </span>
              </div>
              <input
                disabled
                readOnly
                className="w-full h-9 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-200/90 text-slate-700 cursor-not-allowed select-none shadow-2xs"
                value={form.companyCode || "—"}
                title="Company Code is permanently locked"
              />
            </div>

            {/* Verified GSTIN Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">GSTIN Number</label>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                  <FaCheck size={8} /> Verified
                </span>
              </div>
              <input
                disabled
                readOnly
                className="w-full h-9 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-200/90 text-slate-700 cursor-not-allowed select-none shadow-2xs"
                value={form.gstNo || "NOT PROVIDED"}
                title="GSTIN Number is verified and locked"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Owner / Director Name
              </label>
              <input
                className={getInputClass("ownerName")}
                value={form.ownerName || ""}
                onChange={(e) => handleFieldChange("ownerName", e.target.value)}
                placeholder="Director or Owner Name"
              />
            </div>

            {/* PAN Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  PAN Number <span className="text-slate-400 font-normal">(10 chars)</span>
                </label>
                <span className={`text-[10px] font-mono ${form.panNo?.length === 10 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                  {form.panNo?.length || 0}/10
                </span>
              </div>
              <input
                maxLength={10}
                className={`${getInputClass("panNo")} font-mono uppercase`}
                value={form.panNo || ""}
                onChange={(e) => handleFieldChange("panNo", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("panNo")}
                placeholder="e.g. AABCE6145N"
              />
              {touched.panNo && errors.panNo && (
                <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                  <FaExclamationCircle size={10} /> {errors.panNo}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Drug License No (DL)
              </label>
              <input
                className={getInputClass("drugLicenseNo")}
                value={form.drugLicenseNo || ""}
                onChange={(e) => handleFieldChange("drugLicenseNo", e.target.value)}
                placeholder="e.g. DL-20B/21B-XXXX"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card 2: Contact, Credentials & Registered Address ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FaMapMarkerAlt size={13} />
          </div>
          <div>
            <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 m-0">
              Contact, Login Account & Registered Address
            </h2>
            <p className="text-[11px] text-slate-500 font-normal m-0 mt-0.5">
              Official communication channels, premises location, and administrator login credentials.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Work Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Administrator Work Email {canEditCredentials && <span className="text-rose-500">*</span>}
              </label>
              {canEditCredentials ? (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                  Branch Login
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  <FaLock size={8} /> Locked
                </span>
              )}
            </div>
            {canEditCredentials ? (
              <>
                <input
                  type="email"
                  className={getInputClass("email")}
                  value={form.email || ""}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="admin@branch.com"
                />
                {touched.email && errors.email && (
                  <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                    <FaExclamationCircle size={10} /> {errors.email}
                  </p>
                )}
              </>
            ) : (
              <input
                type="email"
                disabled
                readOnly
                className="w-full h-9 px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200/90 text-slate-600 font-medium cursor-not-allowed select-none shadow-2xs"
                value={form.email || "No email assigned"}
                title="Administrator Work Email cannot be changed for your own enterprise"
              />
            )}
          </div>

          {/* Password (Visible when Head Office is editing Child Branch OR Super Admin) */}
          {canEditCredentials && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Reset Password <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                  <FaKey size={8} /> Security
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-9 pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none transition-all shadow-2xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 m-0">
                Leave blank to keep existing password
              </p>
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Phone / Mobile <span className="text-slate-400 font-normal">(10 digits)</span>
              </label>
              <span className={`text-[10px] font-mono ${form.mobile?.length === 10 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                {form.mobile?.length || 0}/10
              </span>
            </div>
            <input
              type="tel"
              maxLength={10}
              className={getInputClass("mobile")}
              value={form.mobile || ""}
              onChange={(e) => handleFieldChange("mobile", e.target.value.replace(/\D/g, ""))}
              onBlur={() => handleBlur("mobile")}
              placeholder="10-digit mobile number"
            />
            {touched.mobile && errors.mobile && (
              <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                <FaExclamationCircle size={10} /> {errors.mobile}
              </p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company Website</label>
            <input
              className={getInputClass("website")}
              value={form.website || ""}
              onChange={(e) => handleFieldChange("website", e.target.value)}
              onBlur={() => handleBlur("website")}
              placeholder="https://example.com"
            />
            {touched.website && errors.website && (
              <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                <FaExclamationCircle size={10} /> {errors.website}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Premises / Street Address</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none transition-all shadow-2xs font-medium resize-none"
              value={form.address || ""}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              placeholder="Registered street address, office floor or industrial unit"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
            <input
              className={getInputClass("city")}
              value={form.city || ""}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              placeholder="City name"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
            <input
              className={getInputClass("state")}
              value={form.state || ""}
              onChange={(e) => handleFieldChange("state", e.target.value)}
              placeholder="State / Province"
            />
          </div>

          {/* Pincode */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Pincode <span className="text-slate-400 font-normal">(6 digits)</span>
              </label>
              <span className={`text-[10px] font-mono ${form.pincode?.length === 6 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                {form.pincode?.length || 0}/6
              </span>
            </div>
            <input
              maxLength={6}
              className={getInputClass("pincode")}
              value={form.pincode || ""}
              onChange={(e) => handleFieldChange("pincode", e.target.value.replace(/\D/g, ""))}
              onBlur={() => handleBlur("pincode")}
              placeholder="6-digit PIN"
            />
            {touched.pincode && errors.pincode && (
              <p className="text-[10.5px] font-medium text-rose-500 mt-1 m-0 flex items-center gap-1">
                <FaExclamationCircle size={10} /> {errors.pincode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Card 3: Module Permissions & Visibility ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FaLayerGroup size={13} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 m-0">
                  Module Permissions & Access Control ({PHARMA_MODULES.length} Total)
                </h2>
                {canEditModules && (
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    {isSuperAdmin ? "Super Admin Full Control" : "Head Office Branch Control"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal m-0 mt-0.5">
                {canEditModules
                  ? isSuperAdmin
                    ? "Super Admin Master Access: Configure all available modules for this enterprise."
                    : "Head Office Control: Grant or revoke feature module access for this child branch."
                  : "Permissions are assigned centrally by Head Office. Branch companies cannot modify module access."}
              </p>
            </div>
          </div>

          {canEditModules && (
            <button
              type="button"
              onClick={() =>
                setForm((prev: any) => ({
                  ...prev,
                  enabledModules: allModulesSelected ? ["dashboard"] : PHARMA_MODULES.map((m) => m.id),
                }))
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200/60 self-start sm:self-auto cursor-pointer transition-colors whitespace-nowrap"
            >
              {allModulesSelected ? "Deselect All Modules" : "Select All Modules"}
            </button>
          )}
        </div>

        {!canEditModules && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold">
            <FaLock className="text-amber-600 shrink-0" size={12} />
            <div>
              <span className="font-bold">Module Permissions Controlled by Head Office:</span>
              <span className="ml-1 text-amber-800">
                Branch companies cannot grant or alter their own module access. All permissions are centrally managed by Head Office ({selectedCompany?.companyName || "Parent Company"}).
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {PHARMA_MODULES.map((mod) => {
            const isSelected = Array.isArray(form.enabledModules) && form.enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                onClick={canEditModules ? () => toggleModule(mod.id) : undefined}
                className={`p-3 rounded-xl border transition-all select-none flex items-start gap-2.5 ${
                  !canEditModules
                    ? isSelected
                      ? "bg-emerald-50/40 border-emerald-200 text-slate-800 cursor-not-allowed"
                      : "bg-slate-50/40 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs cursor-pointer hover:bg-indigo-50"
                    : "bg-slate-50/50 border-slate-200 text-slate-600 opacity-70 hover:opacity-100 hover:bg-white cursor-pointer"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? !canEditModules
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isSelected && <FaCheck size={8} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight text-slate-900 m-0">
                    {mod.label}
                  </p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug m-0">
                    {mod.desc}
                  </p>
                  {!canEditModules && (
                    <div className="mt-1">
                      {isSelected ? (
                        <span className="inline-flex items-center text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                          Granted by Head Office
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9.5px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          Not Granted
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom Action Bar (Compact & Professional) ─── */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.push("/dashboard/company/list")}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={updateCompany}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin text-xs" /> : <FaSave size={11} className="shrink-0" />}
          <span>{loading ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>
    </div>
  );
}