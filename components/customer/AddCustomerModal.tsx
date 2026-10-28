"use client";

import { useEffect, useState } from "react";
import {
  FaTimes,
  FaPlus,
  FaInfoCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaUserTie,
  FaSpinner,
} from "react-icons/fa";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AccountGroupItem {
  ORDNO: string;
  PARNAM: string;
}

interface AreaItem {
  AREA: string;
  PRICE?: string;
  CITY?: string;
  STATE?: string;
}

export default function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "contact" | "address" | "tax" | "sales">("basic");
  const [groups, setGroups] = useState<AccountGroupItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sub-modal state for Add Area
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaForm, setNewAreaForm] = useState({
    areaName: "",
    PRICE: "RATEF",
    city: "",
    state: "Gujarat",
  });
  const [savingArea, setSavingArea] = useState(false);
  const [areaErrorMsg, setAreaErrorMsg] = useState("");

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({
    // Basic & Group
    PARNAM: "",
    CODEP: "",
    SCODE: "",
    PRICE: "",
    DUEDAYS: "",
    STATUS: "Y",
    // Contact
    REF: "",
    PHONE1: "",
    PHONE2: "",
    MAILNAM: "",
    EMAIL: "",
    // Address & Location
    PARADD: "",
    PARADD2: "",
    PARADD3: "",
    CITY: "",
    STATE: "Gujarat",
    COUNTRY: "India",
    PINCODE: "",
    AREA: "",
    ROUT: "",
    // Tax & Licenses
    GSTNO: "",
    DLNO: "",
    DLNO2: "",
    FSSAINO: "",
    PANNO: "",
    TINNO: "",
    STAXNO: "",
    CSTNO: "",
    // Sales Hierarchy & Balances
    DSM: "",
    ASM: "",
    RSM: "",
    COMPANY: "",
    GCODE: "",
    BALANCE: "0",
    CREDIT: "0",
    DEBIT: "0",
    OPNING: "0",
    DISCOUNT: "0",
  });

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      loadAreas();
      setErrorMsg("");
    }
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/master/accounting-group");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setGroups(json);
        }
      }
    } catch (err) {
      console.error("Failed to load account groups", err);
    }
  };

  const loadAreas = async () => {
    try {
      const res = await fetch("/api/master/area");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setAreas(json);
        }
      }
    } catch (err) {
      console.error("Failed to load areas", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Smart Area Handler: when an area is selected, auto-populate Price Rate, City, and State if available
  const handleAreaSelect = (areaName: string) => {
    const matchedArea: any = areas.find(
      (a: any) => (a.AREA || "").trim().toLowerCase() === areaName.trim().toLowerCase()
    );

    setFormData((prev: any) => {
      const updated = { ...prev, AREA: areaName };
      if (matchedArea) {
        if (matchedArea["PRICE"]) {
          updated.PRICE = matchedArea["PRICE"];
        }
        if (matchedArea["CITY"]) {
          updated.CITY = matchedArea["CITY"];
        }
        if (matchedArea["STATE"]) {
          updated.STATE = matchedArea["STATE"];
        }
      }
      return updated;
    });
  };

  // Submit Handler for Add Area sub-modal
  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaForm.areaName || !newAreaForm.areaName.trim()) {
      setAreaErrorMsg("Area Name is required!");
      return;
    }

    try {
      setSavingArea(true);
      setAreaErrorMsg("");

      const res = await fetch("/api/master/area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAreaForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create area");
      }

      await loadAreas();

      // Automatically select newly created area and auto-assign its price rate, city, and state
      const createdAreaName = newAreaForm.areaName.trim();
      const assignedPrice = newAreaForm.PRICE;

      setFormData((prev) => ({
        ...prev,
        AREA: createdAreaName,
        PRICE: assignedPrice || prev.PRICE,
        CITY: newAreaForm.city || prev.CITY,
        STATE: newAreaForm.state || prev.STATE,
      }));

      // Reset & close sub-modal
      setNewAreaForm({ areaName: "", PRICE: "RATEF", city: "", state: "Gujarat" });
      setIsAddAreaOpen(false);
    } catch (err: any) {
      setAreaErrorMsg(err.message || "Error creating area.");
    } finally {
      setSavingArea(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.PARNAM || !formData.PARNAM.trim()) {
      setErrorMsg("Party / Customer Name is required!");
      setActiveTab("basic");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add customer");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong while creating the customer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-[#343872] to-indigo-700 text-white gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/15 backdrop-blur-md text-white flex-shrink-0">
              <FaPlus className="text-sm sm:text-base" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold tracking-wide text-white m-0 truncate">Add New Customer</h3>
              <p className="text-[11px] sm:text-xs text-indigo-100/90 m-0 truncate">Fill customer details into Customer Master</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsAddAreaOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition outline-none cursor-pointer"
            >
              <FaPlus size={9} />
              <span>+ Add Area</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 outline-none cursor-pointer"
            >
              <FaTimes size={13} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Horizontally Scrollable on Mobile */}
        <div className="flex-shrink-0 flex items-center overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-gray-50/80 px-3 sm:px-6 pt-2 sm:pt-3 gap-1.5 sm:gap-2 [scrollbar-width:none] [-ms-overflow-style:none]">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "basic"
                ? "bg-white text-indigo-700 border-indigo-700 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaInfoCircle size={12} />
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "contact"
                ? "bg-white text-emerald-600 border-emerald-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaPhoneAlt size={11} />
            Contact Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "address"
                ? "bg-white text-sky-600 border-sky-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaMapMarkerAlt size={12} />
            Address & Route
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "tax"
                ? "bg-white text-amber-600 border-amber-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaFileInvoiceDollar size={12} />
            Taxation & Licenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "sales"
                ? "bg-white text-purple-600 border-purple-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaUserTie size={12} />
            Sales & Balances
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] sm:text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <FaTimes size={12} />
            </button>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            
            {/* 1. BASIC INFO & ACCOUNT GROUP */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaInfoCircle className="text-indigo-600" /> Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                      Party / Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="PARNAM"
                      value={formData.PARNAM}
                      onChange={handleChange}
                      placeholder="e.g. Apollo Pharmacy Pvt Ltd"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Customer Code</label>
                    <input
                      type="text"
                      name="CODEP"
                      value={formData.CODEP}
                      onChange={handleChange}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Account Group</label>
                    <select
                      name="SCODE"
                      value={formData.SCODE}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    >
                      <option value="">-- Select Account Group --</option>
                      {groups.map((g, idx) => (
                        <option key={g.ORDNO ? `${g.ORDNO}-${idx}` : `group-${idx}`} value={g.ORDNO}>
                          {g.PARNAM} ({g.ORDNO})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Applicable Sale Rate / Price List</label>
                    <select
                      name="PRICE"
                      value={formData.PRICE}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-semibold text-slate-700"
                    >
                      <option value="">-- Select Rate (Default: Rate F) --</option>
                      <option value="RATEA">Rate A</option>
                      <option value="RATEB">Rate B</option>
                      <option value="RATEC">Rate C</option>
                      <option value="RATED">Rate D</option>
                      <option value="RATEE">Rate E</option>
                      <option value="RATEF">Rate F (Sale Rate)</option>
                      <option value="RATEG">Rate G</option>
                      <option value="RETAIL">Retail Rate</option>
                      <option value="WHOLESALE">Wholesale Rate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Credit Days</label>
                    <input
                      type="number"
                      name="DUEDAYS"
                      value={formData.DUEDAYS}
                      onChange={handleChange}
                      placeholder="e.g. 30"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Account Status</label>
                    <select
                      name="STATUS"
                      value={formData.STATUS}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    >
                      <option value="Y">Active (Y)</option>
                      <option value="N">Inactive (N)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONTACT DETAILS */}
            {activeTab === "contact" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaPhoneAlt className="text-emerald-600" /> Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="REF"
                      value={formData.REF}
                      onChange={handleChange}
                      placeholder="e.g. Mr. Rajesh Sharma"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Primary Mobile Number</label>
                    <input
                      type="text"
                      name="PHONE1"
                      value={formData.PHONE1}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Secondary Phone</label>
                    <input
                      type="text"
                      name="PHONE2"
                      value={formData.PHONE2}
                      onChange={handleChange}
                      placeholder="Landline / Alt Phone"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Mailing Name (MAILNAM)</label>
                    <input
                      type="text"
                      name="MAILNAM"
                      value={formData.MAILNAM}
                      onChange={handleChange}
                      placeholder="Mailing / ledger name"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="EMAIL"
                      value={formData.EMAIL}
                      onChange={handleChange}
                      placeholder="e.g. apollo@pharmacy.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. ADDRESS & LOCATION */}
            {activeTab === "address" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-sky-600" /> Address & Location Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      name="PARADD"
                      value={formData.PARADD}
                      onChange={handleChange}
                      placeholder="Address Line 1"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      name="PARADD2"
                      value={formData.PARADD2}
                      onChange={handleChange}
                      placeholder="Address Line 2"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Address Line 3</label>
                    <input
                      type="text"
                      name="PARADD3"
                      value={formData.PARADD3}
                      onChange={handleChange}
                      placeholder="Address Line 3"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  {/* Area Selector + Add Area Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] sm:text-xs font-semibold text-gray-700">Locality / Area</label>
                      <button
                        type="button"
                        onClick={() => setIsAddAreaOpen(true)}
                        className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      >
                        + Create Area
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        name="AREA"
                        value={formData.AREA}
                        onChange={(e) => handleAreaSelect(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none bg-white font-medium text-slate-700"
                      >
                        <option value="">-- Select Area --</option>
                        {areas.map((a, idx) => (
                          <option key={`${a.AREA}-${idx}`} value={a.AREA}>
                            {a.AREA} {a.PRICE ? `(Assigned: ${a.PRICE})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      name="CITY"
                      value={formData.CITY}
                      onChange={handleChange}
                      placeholder="e.g. Ahmedabad"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      name="STATE"
                      value={formData.STATE}
                      onChange={handleChange}
                      placeholder="e.g. Gujarat"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      name="COUNTRY"
                      value={formData.COUNTRY}
                      onChange={handleChange}
                      placeholder="e.g. India"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      name="PINCODE"
                      value={formData.PINCODE}
                      onChange={handleChange}
                      placeholder="e.g. 380015"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Delivery Route</label>
                    <input
                      type="text"
                      name="ROUT"
                      value={formData.ROUT}
                      onChange={handleChange}
                      placeholder="Route / Beat"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. TAXATION & LICENSES */}
            {activeTab === "tax" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaFileInvoiceDollar className="text-amber-600" /> Regulatory Licenses & Tax Numbers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">GSTIN / GST Number</label>
                    <input
                      type="text"
                      name="GSTNO"
                      value={formData.GSTNO}
                      onChange={handleChange}
                      placeholder="24AAAAA0000A1Z5"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Drug License 1</label>
                    <input
                      type="text"
                      name="DLNO"
                      value={formData.DLNO}
                      onChange={handleChange}
                      placeholder="e.g. 20B/12345"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Drug License 2</label>
                    <input
                      type="text"
                      name="DLNO2"
                      value={formData.DLNO2}
                      onChange={handleChange}
                      placeholder="e.g. 21B/12346"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">FSSAI License</label>
                    <input
                      type="text"
                      name="FSSAINO"
                      value={formData.FSSAINO}
                      onChange={handleChange}
                      placeholder="FSSAI Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      name="PANNO"
                      value={formData.PANNO}
                      onChange={handleChange}
                      placeholder="PAN Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">TIN Number</label>
                    <input
                      type="text"
                      name="TINNO"
                      value={formData.TINNO}
                      onChange={handleChange}
                      placeholder="TIN Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Sales Tax No</label>
                    <input
                      type="text"
                      name="STAXNO"
                      value={formData.STAXNO}
                      onChange={handleChange}
                      placeholder="STax Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">CST Number</label>
                    <input
                      type="text"
                      name="CSTNO"
                      value={formData.CSTNO}
                      onChange={handleChange}
                      placeholder="CST Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. SALES HIERARCHY & BALANCES */}
            {activeTab === "sales" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaUserTie className="text-purple-600" /> Sales Hierarchy & Initial Balances
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Salesman / DSM</label>
                    <input
                      type="text"
                      name="DSM"
                      value={formData.DSM}
                      onChange={handleChange}
                      placeholder="MR / Representative"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Area Sales Manager (ASM)</label>
                    <input
                      type="text"
                      name="ASM"
                      value={formData.ASM}
                      onChange={handleChange}
                      placeholder="ASM Name"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Regional Manager (RSM)</label>
                    <input
                      type="text"
                      name="RSM"
                      value={formData.RSM}
                      onChange={handleChange}
                      placeholder="RSM Name"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Territory / Company Code</label>
                    <input
                      type="text"
                      name="GCODE"
                      value={formData.GCODE}
                      onChange={handleChange}
                      placeholder="Territory Code"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      name="COMPANY"
                      value={formData.COMPANY}
                      onChange={handleChange}
                      placeholder="Company"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Outstanding Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="BALANCE"
                      value={formData.BALANCE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="CREDIT"
                      value={formData.CREDIT}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Debit Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="DEBIT"
                      value={formData.DEBIT}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="OPNING"
                      value={formData.OPNING}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Default Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="DISCOUNT"
                      value={formData.DISCOUNT}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200">
            <span className="text-[11px] sm:text-xs text-gray-500">
              Tab {activeTab === "basic" ? "1" : activeTab === "contact" ? "2" : activeTab === "address" ? "3" : activeTab === "tax" ? "4" : "5"} of 5
            </span>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 sm:gap-2 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#343872] to-indigo-700 rounded-xl shadow-md hover:from-[#2a2d5c] hover:to-indigo-800 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaPlus size={11} />
                    <span>Save Customer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ==================== ADD AREA SUB-MODAL POPUP ==================== */}
      {isAddAreaOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4">
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt size={14} />
                <h4 className="text-xs sm:text-sm font-bold m-0">Create New Area</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAreaOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Error message */}
            {areaErrorMsg && (
              <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {areaErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveArea} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                    Area Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAreaForm.areaName}
                    onChange={(e) => setNewAreaForm((prev) => ({ ...prev, areaName: e.target.value }))}
                    placeholder="e.g. Satellite, CG Road, North Zone"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                    Assigned Price Rate for this Area
                  </label>
                  <select
                    value={newAreaForm.PRICE}
                    onChange={(e) => setNewAreaForm((prev) => ({ ...prev, PRICE: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none bg-white font-semibold text-slate-700"
                  >
                    <option value="RATEA">Rate A (City Rate)</option>
                    <option value="RATEB">Rate B (Suburban Rate)</option>
                    <option value="RATEC">Rate C (Bulk Rate)</option>
                    <option value="RATED">Rate D (Outstation Rate)</option>
                    <option value="RATEE">Rate E (Stockist Rate)</option>
                    <option value="RATEF">Rate F (Sale Rate)</option>
                    <option value="RATEG">Rate G (Special Rate)</option>
                    <option value="RETAIL">Retail Rate</option>
                    <option value="WHOLESALE">Wholesale Rate</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Selecting this area on a customer will auto-assign this rate.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={newAreaForm.city}
                      onChange={(e) => setNewAreaForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Ahmedabad"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={newAreaForm.state}
                      onChange={(e) => setNewAreaForm((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. Gujarat"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-end gap-2 p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddAreaOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingArea}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingArea ? (
                    <>
                      <FaSpinner className="animate-spin" size={11} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaPlus size={11} />
                      <span>Save Area</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
