"use client";

import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Upload,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import {
  EMAIL_REGEX,
  MOBILE_REGEX,
  GSTIN_REGEX,
  PINCODE_REGEX,
  PAN_REGEX,
} from "@/lib/constants/validation.constant";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export default function SettingsPage() {
  const { selectedCompany, setSelectedCompany, refreshCompanies } = useCompany();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  });

  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    website: "",
    gstNo: "",
    panNo: "",
    drugLicenseNo: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    invoicePrefix: "INV",
    purchasePrefix: "PUR",
    currency: "INR",
    logo: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    loadCompany();
  }, [selectedCompany?._id]);

  const loadCompany = async () => {
    setFetching(true);
    try {
      const companyId = selectedCompany?._id || "";
      const url = companyId ? `/api/company-settings?companyId=${companyId}` : "/api/company-settings";
      const res = await fetch(url);
      const data = await res.json();

      if (data && !data.error) {
        const logoUrl = data.logo || "";
        setLogoPreview(logoUrl);
        setImgError(false);

        setForm({
          companyName: data.companyName || selectedCompany?.companyName || "",
          ownerName: data.ownerName || selectedCompany?.ownerName || "",
          email: data.email || selectedCompany?.email || "",
          mobile: data.mobile || selectedCompany?.mobile || "",
          website: data.website || selectedCompany?.website || "",
          gstNo: data.gstNo || selectedCompany?.gstNo || "",
          panNo: data.panNo || selectedCompany?.panNo || "",
          drugLicenseNo: data.drugLicenseNo || selectedCompany?.drugLicenseNo || "",
          address: data.address || selectedCompany?.address || "",
          city: data.city || selectedCompany?.city || "",
          state: data.state || selectedCompany?.state || "",
          pincode: data.pincode || selectedCompany?.pincode || "",
          invoicePrefix: data.invoicePrefix || "INV",
          purchasePrefix: data.purchasePrefix || "PUR",
          currency: data.currency || "INR",
          logo: logoUrl,
        });
      }
    } catch (error) {
      console.error("Load company error:", error);
      showToast("Could not load company settings", "error");
    } finally {
      setFetching(false);
    }
  };

  const validateField = (name: string, value: string): string => {
    const val = (value || "").trim();

    switch (name) {
      case "companyName":
        if (!val) return "Company name is required";
        if (val.length < 2) return "Min 2 characters required";
        if (val.length > 120) return "Max 120 characters allowed";
        return "";

      case "ownerName":
        if (!val) return "Owner name is required";
        if (val.length < 2) return "Min 2 characters required";
        if (val.length > 80) return "Max 80 characters allowed";
        if (/\d/.test(val)) return "Letters and spaces only";
        return "";

      case "email":
        if (!val) return "Email address is required";
        if (!EMAIL_REGEX.test(val)) return "Invalid email address format";
        return "";

      case "mobile":
        if (!val) return "Mobile number is required";
        const digits = val.replace(/\D/g, "");
        if (digits.length !== 10) return "Must be exactly 10 digits";
        if (!MOBILE_REGEX.test(digits)) return "Must start with 6, 7, 8, or 9";
        return "";

      case "website":
        if (val) {
          const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/i;
          if (!urlPattern.test(val)) return "Invalid website URL format";
        }
        return "";

      case "gstNo":
        if (val) {
          if (val.length !== 15) return "Must be exactly 15 characters";
          if (!GSTIN_REGEX.test(val)) return "Invalid GSTIN format (e.g. 06AALCM8009M1Z1)";
        }
        return "";

      case "panNo":
        if (val) {
          if (val.length !== 10) return "Must be exactly 10 characters";
          if (!PAN_REGEX.test(val)) return "Invalid PAN format (e.g. AALCM8009M)";
        }
        return "";

      case "drugLicenseNo":
        if (val && val.length > 40) return "Max 40 characters allowed";
        return "";

      case "address":
        if (!val) return "Address is required";
        if (val.length < 5) return "Min 5 characters required";
        if (val.length > 250) return "Max 250 characters allowed";
        return "";

      case "city":
        if (!val) return "City is required";
        if (val.length < 2) return "Min 2 characters required";
        return "";

      case "state":
        if (!val) return "State is required";
        return "";

      case "pincode":
        if (!val) return "Pincode is required";
        if (!PINCODE_REGEX.test(val)) return "Invalid 6-digit Indian PIN code";
        return "";

      case "invoicePrefix":
        if (!val) return "Prefix is required";
        if (!/^[A-Z0-9_-]{1,8}$/i.test(val)) return "1-8 alphanumeric chars";
        return "";

      case "purchasePrefix":
        if (!val) return "Prefix is required";
        if (!/^[A-Z0-9_-]{1,8}$/i.test(val)) return "1-8 alphanumeric chars";
        return "";

      default:
        return "";
    }
  };

  const handleChange = (name: string, value: string) => {
    let finalVal = value;
    if (["gstNo", "panNo", "invoicePrefix", "purchasePrefix"].includes(name)) {
      finalVal = value.toUpperCase();
    }

    // Auto extract PAN from GSTIN if PAN is currently empty
    if (name === "gstNo" && finalVal.length === 15 && GSTIN_REGEX.test(finalVal)) {
      const extractedPan = finalVal.substring(2, 12);
      setForm((prev) => ({
        ...prev,
        [name]: finalVal,
        panNo: prev.panNo ? prev.panNo : extractedPan,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: finalVal }));
    }

    if (touched[name]) {
      const err = validateField(name, finalVal);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, (form as any)[name]);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    Object.keys(form).forEach((key) => {
      newTouched[key] = true;
      const err = validateField(key, (form as any)[key]);
      if (err) newErrors[key] = err;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const processUploadedFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Maximum logo file size is 5MB", "error");
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      showToast("Please upload a valid image file (PNG, JPG, WEBP, SVG)", "error");
      return;
    }

    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || "Failed to upload logo", "error");
        return;
      }

      const newUrl = data.url || data.dataUrl;
      setLogoPreview(newUrl);
      setImgError(false);
      setForm((prev) => ({ ...prev, logo: newUrl }));
      showToast("Logo uploaded successfully!", "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      showToast("Failed to upload logo to server", "error");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    setImgError(false);
    setForm((prev) => ({ ...prev, logo: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast("Logo removed", "info");
  };

  const saveCompany = async () => {
    if (!validateAll()) {
      showToast("Please correct highlighted validation errors", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        companyId: selectedCompany?._id || undefined,
      };

      const res = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.message || "Failed to save company settings");
      }

      if (data.company) {
        setSelectedCompany(data.company);
        await refreshCompanies();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("company-changed"));
        }
      }

      showToast("✓ Company Settings Saved Successfully", "success");
    } catch (error: any) {
      console.error("Save company error:", error);
      showToast(error.message || "Error saving company data", "error");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName: string) => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `w-full rounded-lg text-xs px-3 py-1.5 transition outline-none font-medium ${
      hasError
        ? "bg-rose-50/50 border border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
        : "bg-slate-50/50 border border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
    }`;
  };

  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1";

  const renderFieldError = (fieldName: string) => {
    if (touched[fieldName] && errors[fieldName]) {
      return (
        <p className="mt-0.5 text-[11px] text-rose-500 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{errors[fieldName]}</span>
        </p>
      );
    }
    return null;
  };

  if (fetching) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xl transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-rose-600"
              : "bg-indigo-600"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <h1 className="text-sm font-bold tracking-wide">Company Settings</h1>
          </div>

          {selectedCompany?.companyCode && (
            <span className="text-[11px] font-mono bg-white/15 px-2 py-0.5 rounded-md font-semibold">
              {selectedCompany.companyCode}
            </span>
          )}
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Logo Section - Solid clean border, zero clutter, hover actions */}
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-24 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-slate-50/80 transition-all shadow-xs"
              title={logoPreview ? "Click to change logo" : "Click to upload logo"}
            >
              {logoUploading ? (
                <div className="flex flex-col items-center gap-1 text-indigo-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[9px] font-bold">Uploading…</span>
                </div>
              ) : logoPreview && !imgError ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="h-full w-full object-contain p-2"
                    onError={() => setImgError(true)}
                  />
                  {/* Clean Dark Overlay on Hover with Change & Remove options inside */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100 p-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white text-white hover:text-slate-900 text-[10px] font-bold transition backdrop-blur-xs"
                      title="Change Logo"
                    >
                      <Camera className="h-3 w-3" />
                      <span>Change</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLogo();
                      }}
                      disabled={logoUploading}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] font-bold transition shadow-sm"
                      title="Remove Logo"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center p-2 text-center text-slate-400 group-hover:text-indigo-600 transition">
                  <Camera className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition" />
                  <span className="text-[10px] font-bold text-slate-600 mt-1">Upload Logo</span>
                  <span className="text-[9px] text-slate-400">Click to select</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={logoUploading}
            />
          </div>

          {/* All Input Fields in unified compact grid (No Section Headings) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Company Name */}
            <div className="sm:col-span-6">
              <label className={labelClass}>
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Company Name"
                className={getInputClass("companyName")}
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                onBlur={() => handleBlur("companyName")}
              />
              {renderFieldError("companyName")}
            </div>

            {/* Owner Name */}
            <div className="sm:col-span-6">
              <label className={labelClass}>
                Owner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Owner / Authorized Person"
                className={getInputClass("ownerName")}
                value={form.ownerName}
                onChange={(e) => handleChange("ownerName", e.target.value)}
                onBlur={() => handleBlur("ownerName")}
              />
              {renderFieldError("ownerName")}
            </div>

            {/* Email */}
            <div className="sm:col-span-6">
              <label className={labelClass}>
                Company Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="email@company.com"
                className={getInputClass("email")}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
              />
              {renderFieldError("email")}
            </div>

            {/* Mobile */}
            <div className="sm:col-span-6">
              <label className={labelClass}>
                Company Mobile <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                className={getInputClass("mobile")}
                value={form.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                onBlur={() => handleBlur("mobile")}
              />
              {renderFieldError("mobile")}
            </div>

            {/* Website */}
            <div className="sm:col-span-6">
              <label className={labelClass}>Website</label>
              <input
                type="text"
                placeholder="https://company.com"
                className={getInputClass("website")}
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                onBlur={() => handleBlur("website")}
              />
              {renderFieldError("website")}
            </div>

            {/* GST Number */}
            <div className="sm:col-span-6">
              <label className={labelClass}>GST Number</label>
              <input
                type="text"
                maxLength={15}
                placeholder="06AALCM8009M1Z1"
                className={`${getInputClass("gstNo")} uppercase font-mono`}
                value={form.gstNo}
                onChange={(e) => handleChange("gstNo", e.target.value)}
                onBlur={() => handleBlur("gstNo")}
              />
              {renderFieldError("gstNo")}
            </div>

            {/* PAN Number */}
            <div className="sm:col-span-6">
              <label className={labelClass}>PAN Number</label>
              <input
                type="text"
                maxLength={10}
                placeholder="AALCM8009M"
                className={`${getInputClass("panNo")} uppercase font-mono`}
                value={form.panNo}
                onChange={(e) => handleChange("panNo", e.target.value)}
                onBlur={() => handleBlur("panNo")}
              />
              {renderFieldError("panNo")}
            </div>

            {/* Drug License No */}
            <div className="sm:col-span-6">
              <label className={labelClass}>Drug License No</label>
              <input
                type="text"
                placeholder="e.g. 20B/21B-DL12345"
                className={getInputClass("drugLicenseNo")}
                value={form.drugLicenseNo}
                onChange={(e) => handleChange("drugLicenseNo", e.target.value)}
                onBlur={() => handleBlur("drugLicenseNo")}
              />
              {renderFieldError("drugLicenseNo")}
            </div>

            {/* Address */}
            <div className="sm:col-span-12">
              <label className={labelClass}>
                Company Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Address details"
                className={getInputClass("address")}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
              />
              {renderFieldError("address")}
            </div>

            {/* City */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="City"
                className={getInputClass("city")}
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                onBlur={() => handleBlur("city")}
              />
              {renderFieldError("city")}
            </div>

            {/* State */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="State"
                className={getInputClass("state")}
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                onBlur={() => handleBlur("state")}
              />
              {renderFieldError("state")}
            </div>

            {/* Pincode */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                Pincode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit PIN"
                className={getInputClass("pincode")}
                value={form.pincode}
                onChange={(e) => handleChange("pincode", e.target.value)}
                onBlur={() => handleBlur("pincode")}
              />
              {renderFieldError("pincode")}
            </div>

            {/* Invoice Prefix */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                Invoice Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="INV"
                className={`${getInputClass("invoicePrefix")} uppercase font-mono`}
                value={form.invoicePrefix}
                onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                onBlur={() => handleBlur("invoicePrefix")}
              />
              {renderFieldError("invoicePrefix")}
            </div>

            {/* Purchase Prefix */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                Purchase Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="PUR"
                className={`${getInputClass("purchasePrefix")} uppercase font-mono`}
                value={form.purchasePrefix}
                onChange={(e) => handleChange("purchasePrefix", e.target.value)}
                onBlur={() => handleBlur("purchasePrefix")}
              />
              {renderFieldError("purchasePrefix")}
            </div>

            {/* Currency */}
            <div className="sm:col-span-4">
              <label className={labelClass}>
                Currency <span className="text-rose-500">*</span>
              </label>
              <select
                className={getInputClass("currency")}
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              * Required fields
            </span>

            <button
              type="button"
              onClick={saveCompany}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Company Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}