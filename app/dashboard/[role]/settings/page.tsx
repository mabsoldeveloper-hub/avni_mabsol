"use client";

import { useEffect, useState } from "react";
import { FaCog } from "react-icons/fa";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("/logo.png");

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

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const res = await fetch("/api/company-settings");
      const data = await res.json();

      if (data.logo) {
        setLogoPreview(data.logo);
      }

      if (data) {
        setForm({
          companyName: data.companyName || "",
          ownerName: data.ownerName || "",
          email: data.email || "",
          mobile: data.mobile || "",
          website: data.website || "",
          gstNo: data.gstNo || "",
          panNo: data.panNo || "",
          drugLicenseNo: data.drugLicenseNo || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          pincode: data.pincode || "",
          invoicePrefix: data.invoicePrefix || "INV",
          purchasePrefix: data.purchasePrefix || "PUR",
          currency: data.currency || "INR",
          logo: data.logo || "",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const saveCompany = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      await res.json();

      alert("Company Settings Saved");
    } catch (error) {
      alert("Error Saving Data");
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Maximum file size is 2MB");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload-logo", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (!data.success) {
      alert("Upload Failed");
      return;
    }

    setLogoPreview(data.url);
    setForm((prev) => ({ ...prev, logo: data.url }));
  };

  const inputClass =
    "w-full rounded-lg text-sm px-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const labelClass =
    "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaCog size={13} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Company Settings
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img
            src={logoPreview}
            alt="Company Logo"
            width={110}
            height={110}
            className="rounded-xl object-contain bg-white/50 ring-4 ring-white/60 shadow-md p-2"
          />
          <div className="flex flex-col items-center">
            <input
              type="file"
              className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-500/90 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
              onChange={uploadLogo}
            />
            <small className="text-gray-400 mt-1">
              PNG, JPG, JPEG (Max 2MB)
            </small>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Company Name */}
          <div className="md:col-span-6">
            <label className={labelClass}>Company Name</label>
            <input
              className={inputClass}
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
            />
          </div>

          {/* Owner Name */}
          <div className="md:col-span-6">
            <label className={labelClass}>Owner Name</label>
            <input
              className={inputClass}
              value={form.ownerName}
              onChange={(e) =>
                setForm({ ...form, ownerName: e.target.value })
              }
            />
          </div>

          {/* Email */}
          <div className="md:col-span-6">
            <label className={labelClass}>Company Email</label>
            <input
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Mobile */}
          <div className="md:col-span-6">
            <label className={labelClass}>Company Mobile</label>
            <input
              className={inputClass}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          {/* Website */}
          <div className="md:col-span-6">
            <label className={labelClass}>Website</label>
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          {/* GST */}
          <div className="md:col-span-6">
            <label className={labelClass}>GST Number</label>
            <input
              className={inputClass}
              value={form.gstNo}
              onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
            />
          </div>

          {/* PAN */}
          <div className="md:col-span-6">
            <label className={labelClass}>PAN Number</label>
            <input
              className={inputClass}
              value={form.panNo}
              onChange={(e) => setForm({ ...form, panNo: e.target.value })}
            />
          </div>

          {/* Drug License */}
          <div className="md:col-span-6">
            <label className={labelClass}>Drug License No</label>
            <input
              className={inputClass}
              value={form.drugLicenseNo}
              onChange={(e) =>
                setForm({ ...form, drugLicenseNo: e.target.value })
              }
            />
          </div>

          {/* Address */}
          <div className="md:col-span-12">
            <label className={labelClass}>Company Address</label>
            <textarea
              rows={3}
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* City */}
          <div className="md:col-span-4">
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          {/* State */}
          <div className="md:col-span-4">
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>

          {/* Pincode */}
          <div className="md:col-span-4">
            <label className={labelClass}>Pincode</label>
            <input
              className={inputClass}
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
          </div>

          {/* Invoice Prefix */}
          <div className="md:col-span-4">
            <label className={labelClass}>Invoice Prefix</label>
            <input
              className={inputClass}
              value={form.invoicePrefix}
              onChange={(e) =>
                setForm({ ...form, invoicePrefix: e.target.value })
              }
            />
          </div>

          {/* Purchase Prefix */}
          <div className="md:col-span-4">
            <label className={labelClass}>Purchase Prefix</label>
            <input
              className={inputClass}
              value={form.purchasePrefix}
              onChange={(e) =>
                setForm({ ...form, purchasePrefix: e.target.value })
              }
            />
          </div>

          {/* Currency */}
          <div className="md:col-span-4">
            <label className={labelClass}>Currency</label>
            <select
              className={inputClass}
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value })
              }
            >
              <option>INR</option>
              <option>USD</option>
              <option>AED</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-200/70 pt-4">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={saveCompany}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Company Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}