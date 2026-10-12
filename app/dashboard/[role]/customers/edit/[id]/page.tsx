"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaArrowLeft,
  FaSave,
  FaCoins,
  FaClock,
  FaFileInvoice,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaPercent,
  FaEye,
} from "react-icons/fa";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const role = (params?.role as string) || "admin";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"financial" | "contact" | "address" | "tax">("financial");

  // Form State
  const [formData, setFormData] = useState({
    // Financial & Alert Limits
    CREDIT: "0",
    DUEDAYS: "0",
    BILL_LIMIT: "5",
    BALANCE: "0",
    OPNING: "0",
    DISCOUNT: "0",
    PRICE: "RATEF",
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

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch customer details`);
      }

      const data = await res.json();
      if (!data || Object.keys(data).length === 0) {
        throw new Error("Customer record not found");
      }

      setFormData({
        CREDIT: data.CREDIT !== undefined && data.CREDIT !== null ? String(data.CREDIT) : "0",
        DUEDAYS: data.DUEDAYS || data.DAYS ? String(data.DUEDAYS || data.DAYS) : "0",
        BILL_LIMIT: String(data.BILL_LIMIT ?? data.BILLLIMIT ?? data.MAXBILLS ?? "5"),
        BALANCE: data.BALANCE !== undefined && data.BALANCE !== null ? String(data.BALANCE) : "0",
        OPNING: data.OPNING ?? data.OPENING ? String(data.OPNING ?? data.OPENING) : "0",
        DISCOUNT: data.DISCOUNT !== undefined && data.DISCOUNT !== null ? String(data.DISCOUNT) : "0",
        PRICE: data.PRICE || "RATEF",
        STATUS: data.STATUS === "N" || data.STATUS === "Inactive" ? "N" : "Y",

        PARNAM: data.PARNAM || "",
        REF: data.REF || "",
        PHONE1: data.PHONE1 || "",
        PHONE2: data.PHONE2 || "",
        MAILNAM: data.MAILNAM || "",

        PARADD: data.PARADD || data.ADDRESS || "",
        PARADD2: data.PARADD2 || "",
        PARADD3: data.PARADD3 || "",
        CITY: data.CITY || "",
        state1: data.state1 || data.STATE || "",
        country: data.country || "India",
        PINCODE: data.PINCODE || data.PIN || "",
        Area: data.Area || data.AREA || "",
        station: data.station || "",
        route: data.route || data.ROUT || "",
        ZONE: data.ZONE || "",

        GSTNO: data.GSTNO || "",
        DLNO: data.DLNO || "",
        DLNO2: data.DLNO2 || "",
        PANNO: data.PANNO || "",
        FSSAINO: data.FSSAINO || "",
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load customer record");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const parsedCredit = Number(formData.CREDIT || 0);
  const parsedBalance = Number(formData.BALANCE || 0);
  const parsedDueDays = Number(formData.DUEDAYS || 0);
  const parsedBillLimit = Number(formData.BILL_LIMIT || 0);
  const isOverLimit = parsedCredit > 0 && parsedBalance > parsedCredit;
  const creditUsagePct = parsedCredit > 0 ? Math.round((parsedBalance / parsedCredit) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer details");
      }

      setSuccessMessage("Customer profile & alert limits updated successfully!");
      setTimeout(() => {
        router.push(`/dashboard/${role}/customers/view/${id}`);
      }, 900);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <FaSpinner className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-semibold text-slate-600">Loading Customer Profile & Limits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${role}/customers/view/${id}`}
            className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                Edit Customer Profile & Limits
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  formData.STATUS === "Y"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {formData.STATUS === "Y" ? "Active Account" : "Inactive Account"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Party: <span className="font-semibold text-slate-700">{formData.PARNAM || "Customer"}</span>
              {formData.CITY ? ` • ${formData.CITY}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${role}/customers/view/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
          >
            <FaEye size={12} />
            <span>View Profile</span>
          </Link>
        </div>
      </div>

      {/* Account Limits & Health Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Balance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Balance
            </p>
            <p className={`text-lg font-extrabold mt-1 ${parsedBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              ₹{parsedBalance.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Current Ledger Due</p>
          </div>
          <div className={`p-3 rounded-xl ${parsedBalance > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
            <FaCoins size={20} />
          </div>
        </div>

        {/* Credit Limit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Sanctioned Credit Limit
            </p>
            <p className="text-lg font-extrabold text-indigo-600 mt-1">
              ₹{parsedCredit.toLocaleString("en-IN")}
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${isOverLimit ? "text-rose-600" : "text-slate-400"}`}>
              {isOverLimit ? `⚠️ Limit Breached (${creditUsagePct}%)` : `${creditUsagePct}% of Limit Used`}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
            <FaShieldAlt size={20} />
          </div>
        </div>

        {/* Day Limit / Term */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Credit Term Limit
            </p>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {parsedDueDays} Days
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Allowed Payment Term</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
            <FaClock size={20} />
          </div>
        </div>

        {/* Bill Limit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Bills Cap
            </p>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {parsedBillLimit} Invoices
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Max Pending Bills Threshold</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
            <FaFileInvoice size={20} />
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 rounded-2xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-800 animate-in fade-in">
          <FaExclamationTriangle size={15} className="text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 rounded-2xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 animate-in fade-in">
          <FaCheckCircle size={15} className="text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "financial"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FaShieldAlt size={12} />
          <span>Financial & Alert Limits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "contact"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FaPhoneAlt size={12} />
          <span>Basic & Contact Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "address"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FaMapMarkerAlt size={12} />
          <span>Address & Territory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tax")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "tax"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FaIdCard size={12} />
          <span>GST & Drug Licenses</span>
        </button>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: FINANCIAL & ALERT LIMITS */}
        {activeTab === "financial" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FaCoins className="text-indigo-600" /> Account Credit Limits & Rule Parameters
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These values are monitored by the Master Alert Scanner to trigger automated notices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Credit Limit */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <FaCoins className="text-indigo-600" size={13} />
                  <span>Sanctioned Credit Limit (₹)</span>
                </label>
                <input
                  type="number"
                  name="CREDIT"
                  value={formData.CREDIT}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  placeholder="0 (No Limit)"
                />
                <p className="text-[10px] text-slate-500">
                  Maximum allowed outstanding amount for this customer.
                </p>
              </div>

              {/* Day Limit / Credit Term */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <FaClock className="text-amber-600" size={13} />
                  <span>Credit Term / Day Limit (Days)</span>
                </label>
                <input
                  type="number"
                  name="DUEDAYS"
                  value={formData.DUEDAYS}
                  onChange={handleChange}
                  min="0"
                  max="365"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  placeholder="e.g. 45"
                />
                <p className="text-[10px] text-slate-500">
                  Credit term allowed before invoices are flagged as overdue.
                </p>
              </div>

              {/* Bill Limit */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <FaFileInvoice className="text-purple-600" size={13} />
                  <span>Max Pending Bills Limit (Count)</span>
                </label>
                <input
                  type="number"
                  name="BILL_LIMIT"
                  value={formData.BILL_LIMIT}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 bg-white text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder="e.g. 5"
                />
                <p className="text-[10px] text-slate-500">
                  Threshold count of unpaid invoices before an alert triggers.
                </p>
              </div>

              {/* Outstanding Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Current Outstanding Balance (₹)
                </label>
                <input
                  type="number"
                  name="BALANCE"
                  value={formData.BALANCE}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Opening Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  name="OPNING"
                  value={formData.OPNING}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Party Discount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <FaPercent size={11} className="text-slate-400" />
                  <span>Default Party Discount (%)</span>
                </label>
                <input
                  type="number"
                  name="DISCOUNT"
                  value={formData.DISCOUNT}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Price Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Price Rate Category</label>
                <select
                  name="PRICE"
                  value={formData.PRICE}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="RATEF">Standard Wholesale (RATEF)</option>
                  <option value="WS">Wholesale Rate (WS)</option>
                  <option value="MRP">Maximum Retail Price (MRP)</option>
                  <option value="RET">Retailer Rate (RET)</option>
                </select>
              </div>

              {/* Account Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Account Status</label>
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Y">Active Customer (Allowed Billing & Alerts)</option>
                  <option value="N">Inactive / Suspended</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BASIC & CONTACT INFO */}
        {activeTab === "contact" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FaPhoneAlt className="text-indigo-600" /> Customer Contact & Communication
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Used for dispatching automated email notices, WhatsApp reminders, and invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Customer / Business Name (PARNAM) *
                </label>
                <input
                  type="text"
                  name="PARNAM"
                  value={formData.PARNAM}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Contact Person / Proprietor (REF)
                </label>
                <input
                  type="text"
                  name="REF"
                  value={formData.REF}
                  onChange={handleChange}
                  placeholder="Mr. Owner Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Primary Mobile / WhatsApp (PHONE1)
                </label>
                <input
                  type="text"
                  name="PHONE1"
                  value={formData.PHONE1}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Alternate Phone / Office (PHONE2)
                </label>
                <input
                  type="text"
                  name="PHONE2"
                  value={formData.PHONE2}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <FaEnvelope className="text-indigo-600" size={12} />
                  <span>Customer Email Address (MAILNAM)</span>
                </label>
                <input
                  type="email"
                  name="MAILNAM"
                  value={formData.MAILNAM}
                  onChange={handleChange}
                  placeholder="pharmacy@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400">
                  Background alert scanner will dispatch email notifications to this address.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADDRESS & TERRITORY */}
        {activeTab === "address" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FaMapMarkerAlt className="text-indigo-600" /> Address & Logistics Route
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block">
                  Address Line 1 (Shop / Building)
                </label>
                <input
                  type="text"
                  name="PARADD"
                  value={formData.PARADD}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">City</label>
                <input
                  type="text"
                  name="CITY"
                  value={formData.CITY}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">State</label>
                <input
                  type="text"
                  name="state1"
                  value={formData.state1}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Pin Code</label>
                <input
                  type="text"
                  name="PINCODE"
                  value={formData.PINCODE}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Area</label>
                <input
                  type="text"
                  name="Area"
                  value={formData.Area}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Station</label>
                <input
                  type="text"
                  name="station"
                  value={formData.station}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Route</label>
                <input
                  type="text"
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GST & DRUG LICENSES */}
        {activeTab === "tax" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FaIdCard className="text-indigo-600" /> Tax Identification & Drug Licenses
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">GSTIN / GST Number</label>
                <input
                  type="text"
                  name="GSTNO"
                  value={formData.GSTNO}
                  onChange={handleChange}
                  placeholder="03AAAFZ6660R1ZK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Drug License No (DLNO)</label>
                <input
                  type="text"
                  name="DLNO"
                  value={formData.DLNO}
                  onChange={handleChange}
                  placeholder="20B / 21B Drug License"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Secondary Drug License (DLNO2)</label>
                <input
                  type="text"
                  name="DLNO2"
                  value={formData.DLNO2}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">PAN Number</label>
                <input
                  type="text"
                  name="PANNO"
                  value={formData.PANNO}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block">FSSAI License No</label>
                <input
                  type="text"
                  name="FSSAINO"
                  value={formData.FSSAINO}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <Link
            href={`/dashboard/${role}/customers/view/${id}`}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin" size={13} />
                <span>Saving Customer Details...</span>
              </>
            ) : (
              <>
                <FaSave size={13} />
                <span>Save Customer & Limit Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

