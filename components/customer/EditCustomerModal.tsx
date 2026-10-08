"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaSave,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCoins,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaSpinner,
  FaPercent,
  FaFileInvoice,
} from "react-icons/fa";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onSuccess: (updatedCustomer: any) => void;
}

export default function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<"financial" | "contact" | "address" | "tax">("financial");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Financial & Limits
    CREDIT: "",
    DUEDAYS: "",
    BILL_LIMIT: "",
    BALANCE: "",
    OPNING: "",
    DISCOUNT: "",
    PRICE: "",
    STATUS: "Y",

    // Basic & Contact
    PARNAM: "",
    REF: "",
    PHONE1: "",
    PHONE2: "",
    MAILNAM: "",

    // Address & Territory
    PARADD: "",
    PARADD2: "",
    PARADD3: "",
    CITY: "",
    state1: "",
    country: "India",
    PINCODE: "",
    Area: "",
    station: "",
    route: "",
    ZONE: "",

    // Tax & Licenses
    GSTNO: "",
    DLNO: "",
    DLNO2: "",
    PANNO: "",
    FSSAINO: "",
  });

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        CREDIT: customer.CREDIT !== undefined && customer.CREDIT !== null ? String(customer.CREDIT) : "0",
        DUEDAYS: customer.DUEDAYS || customer.DAYS ? String(customer.DUEDAYS || customer.DAYS) : "0",
        BILL_LIMIT: customer.BILL_LIMIT ?? customer.BILLLIMIT ?? customer.MAXBILLS ?? "5",
        BALANCE: customer.BALANCE !== undefined && customer.BALANCE !== null ? String(customer.BALANCE) : "0",
        OPNING: customer.OPNING ?? customer.OPENING ? String(customer.OPNING ?? customer.OPENING) : "0",
        DISCOUNT: customer.DISCOUNT !== undefined && customer.DISCOUNT !== null ? String(customer.DISCOUNT) : "0",
        PRICE: customer.PRICE || "RATEF",
        STATUS: customer.STATUS === "N" || customer.STATUS === "Inactive" ? "N" : "Y",

        PARNAM: customer.PARNAM || "",
        REF: customer.REF || "",
        PHONE1: customer.PHONE1 || "",
        PHONE2: customer.PHONE2 || "",
        MAILNAM: customer.MAILNAM || "",

        PARADD: customer.PARADD || customer.ADDRESS || "",
        PARADD2: customer.PARADD2 || "",
        PARADD3: customer.PARADD3 || "",
        CITY: customer.CITY || "",
        state1: customer.state1 || customer.STATE || "",
        country: customer.country || "India",
        PINCODE: customer.PINCODE || customer.PIN || "",
        Area: customer.Area || customer.AREA || "",
        station: customer.station || "",
        route: customer.route || customer.ROUT || "",
        ZONE: customer.ZONE || "",

        GSTNO: customer.GSTNO || "",
        DLNO: customer.DLNO || "",
        DLNO2: customer.DLNO2 || "",
        PANNO: customer.PANNO || "",
        FSSAINO: customer.FSSAINO || "",
      });
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Real-time calculations
  const parsedCredit = Number(formData.CREDIT || 0);
  const parsedBalance = Number(formData.BALANCE || 0);
  const isOverLimit = parsedCredit > 0 && parsedBalance > parsedCredit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer details");
      }

      setSuccessMessage("Customer profile & limits saved successfully!");
      setTimeout(() => {
        onSuccess(data.data);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden my-6">
        {/* Top Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 font-bold text-xs">
                Edit Customer
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Update Customer & Limits
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Party: <span className="font-semibold text-slate-700">{customer?.PARNAM}</span> (Code: {customer?.CODEP || customer?.ORDNO || "-"})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === "financial"
                ? "border-amber-500 text-amber-700 bg-amber-50/60"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaCoins size={12} className={activeTab === "financial" ? "text-amber-600" : "text-slate-400"} />
            <span>Credit & Financial Limits</span>
            {isOverLimit && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === "contact"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaPhoneAlt size={12} className={activeTab === "contact" ? "text-indigo-600" : "text-slate-400"} />
            <span>Basic & Contact Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === "address"
                ? "border-cyan-600 text-cyan-700 bg-cyan-50/60"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaMapMarkerAlt size={12} className={activeTab === "address" ? "text-cyan-600" : "text-slate-400"} />
            <span>Address & Location</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === "tax"
                ? "border-purple-600 text-purple-700 bg-purple-50/60"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaFileInvoiceDollar size={12} className={activeTab === "tax" ? "text-purple-600" : "text-slate-400"} />
            <span>Taxation & Licenses</span>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
            {/* Feedback Messages */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
                <FaExclamationTriangle size={14} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-in fade-in">
                <FaCheckCircle size={14} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* TAB 1: FINANCIAL & CREDIT LIMITS */}
            {activeTab === "financial" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Credit Limit */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50/40 border border-amber-200/60">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Credit Limit (₹)</span>
                      <span className="text-[10px] text-amber-700 font-semibold uppercase">Amount Cap</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="CREDIT"
                      value={formData.CREDIT}
                      onChange={handleChange}
                      placeholder="e.g. 100000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-500">Maximum credit amount allowed before alert.</p>
                  </div>

                  {/* 2. Credit Days (Day Limit) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-sky-50/40 border border-sky-200/60">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Credit Days / Day Limit</span>
                      <span className="text-[10px] text-sky-700 font-semibold uppercase">Days</span>
                    </label>
                    <input
                      type="number"
                      name="DUEDAYS"
                      value={formData.DUEDAYS}
                      onChange={handleChange}
                      placeholder="e.g. 30"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-500">Allowed credit term days before sending alert.</p>
                  </div>

                  {/* 3. Number of Bills Limit (Bill Limit) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/40 border border-purple-200/60">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Max Bills / Bill Limit</span>
                      <span className="text-[10px] text-purple-700 font-semibold uppercase">Bills Cap</span>
                    </label>
                    <input
                      type="number"
                      name="BILL_LIMIT"
                      value={formData.BILL_LIMIT}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-500">Maximum pending bills allowed before alert.</p>
                  </div>

                  {/* Outstanding Balance (Standard clean field) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Outstanding Balance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      name="BALANCE"
                      value={formData.BALANCE}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500">Current ledger balance.</p>
                  </div>

                  {/* Opening Balance */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      name="OPNING"
                      value={formData.OPNING}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Party Discount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FaPercent size={10} className="text-slate-400" />
                      <span>Party Discount (%)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="DISCOUNT"
                      value={formData.DISCOUNT}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Applicable Rate / Price List */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Price List Rate</label>
                    <select
                      name="PRICE"
                      value={formData.PRICE}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="RATEA">Rate A</option>
                      <option value="RATEB">Rate B</option>
                      <option value="RATEC">Rate C</option>
                      <option value="RATED">Rate D</option>
                      <option value="RATEE">Rate E</option>
                      <option value="RATEF">Rate F (Standard Sale Rate)</option>
                      <option value="RATEG">Rate G</option>
                    </select>
                  </div>

                  {/* Account Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Account Status</label>
                    <select
                      name="STATUS"
                      value={formData.STATUS}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Y">Active Account</option>
                      <option value="N">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BASIC & CONTACT INFO */}
            {activeTab === "contact" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-700">Customer / Party Name *</label>
                  <input
                    type="text"
                    name="PARNAM"
                    required
                    value={formData.PARNAM}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Contact Person / Reference</label>
                  <input
                    type="text"
                    name="REF"
                    value={formData.REF}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Sharma / Mr. Rajesh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Primary Mobile (Alert SMS/WhatsApp)</label>
                  <input
                    type="text"
                    name="PHONE1"
                    value={formData.PHONE1}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Alert notifications will be sent to this number.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Secondary Mobile</label>
                  <input
                    type="text"
                    name="PHONE2"
                    value={formData.PHONE2}
                    onChange={handleChange}
                    placeholder="Alternate contact number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    name="MAILNAM"
                    value={formData.MAILNAM}
                    onChange={handleChange}
                    placeholder="customer@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: ADDRESS & LOCATION */}
            {activeTab === "address" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-full">
                  <label className="text-xs font-bold text-slate-700">Street Address</label>
                  <input
                    type="text"
                    name="PARADD"
                    value={formData.PARADD}
                    onChange={handleChange}
                    placeholder="Address Line 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Address Line 2</label>
                  <input
                    type="text"
                    name="PARADD2"
                    value={formData.PARADD2}
                    onChange={handleChange}
                    placeholder="Address Line 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">City / Town</label>
                  <input
                    type="text"
                    name="CITY"
                    value={formData.CITY}
                    onChange={handleChange}
                    placeholder="City name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">State</label>
                  <input
                    type="text"
                    name="state1"
                    value={formData.state1}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pincode</label>
                  <input
                    type="text"
                    name="PINCODE"
                    value={formData.PINCODE}
                    onChange={handleChange}
                    placeholder="e.g. 380001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Locality / Area</label>
                  <input
                    type="text"
                    name="Area"
                    value={formData.Area}
                    onChange={handleChange}
                    placeholder="Area"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Delivery Route</label>
                  <input
                    type="text"
                    name="route"
                    value={formData.route}
                    onChange={handleChange}
                    placeholder="Delivery Route"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: TAXATION & LICENSES */}
            {activeTab === "tax" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">GSTIN / GST Number</label>
                  <input
                    type="text"
                    name="GSTNO"
                    value={formData.GSTNO}
                    onChange={handleChange}
                    placeholder="15-character GSTIN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">PAN Number</label>
                  <input
                    type="text"
                    name="PANNO"
                    value={formData.PANNO}
                    onChange={handleChange}
                    placeholder="10-digit PAN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Drug License 1 (DL NO)</label>
                  <input
                    type="text"
                    name="DLNO"
                    value={formData.DLNO}
                    onChange={handleChange}
                    placeholder="e.g. 20B/21B License"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Drug License 2 (DL NO 2)</label>
                  <input
                    type="text"
                    name="DLNO2"
                    value={formData.DLNO2}
                    onChange={handleChange}
                    placeholder="Secondary license if any"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-full">
                  <label className="text-xs font-bold text-slate-700">FSSAI License</label>
                  <input
                    type="text"
                    name="FSSAINO"
                    value={formData.FSSAINO}
                    onChange={handleChange}
                    placeholder="FSSAI registration number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <FaSave size={13} />
                    <span>Save Customer & Limits</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
