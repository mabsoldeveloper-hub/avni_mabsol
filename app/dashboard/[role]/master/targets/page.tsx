"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaBullseye,
  FaGift,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaUser,
  FaStore,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWhatsapp,
  FaTrophy,
  FaChartLine,
  FaShareAlt,
} from "react-icons/fa";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  designation?: string;
}

interface CustomerOption {
  uniqueId: string;
  code: string;
  name: string;
  city?: string;
}

interface GiftSlab {
  minAchievementPercent: number;
  giftName: string;
  giftDescription?: string;
}

interface TargetItem {
  _id: string;
  targetType: "MR" | "Customer";
  periodMonth: string;
  mrUserId?: string | { _id: string; name: string; email: string; employeeCode?: string; mobile?: string; phone?: string };
  mrName?: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  phoneNumber?: string;
  targetAmount: number;
  collectionTargetAmount?: number;
  achievedAmount?: number;
  shortfall?: number;
  achievementPercent?: number;
  hasGiftScheme?: boolean;
  giftSlabs?: GiftSlab[];
  activeGiftSlab?: GiftSlab | null;
  notes?: string;
  status: "Active" | "Closed";
  createdAt?: string;
}

export default function TargetMasterPage() {
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Views & Modals
  const [viewState, setViewState] = useState<"list" | "add" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    targetType: "Customer" as "MR" | "Customer",
    periodMonth: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    mrUserId: "",
    mrName: "",
    customerId: "",
    customerName: "",
    customerCode: "",
    targetAmount: 1000000,
    collectionTargetAmount: 800000,
    hasGiftScheme: true,
    giftSlabs: [
      { minAchievementPercent: 100, giftName: "Smartwatch", giftDescription: "Premium Smartwatch / 5% Extra Cashback" },
      { minAchievementPercent: 80, giftName: "Executive Dinner Set", giftDescription: "32-Piece Premium Dinner Set" },
      { minAchievementPercent: 50, giftName: "Branded Office Bag", giftDescription: "Leatherette Executive Laptop Bag" },
    ] as GiftSlab[],
    notes: "",
    status: "Active" as "Active" | "Closed",
  });

  useEffect(() => {
    fetchUsers();
    fetchCustomers();
    fetchTargets();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success || Array.isArray(json)) {
        setUsers(Array.isArray(json) ? json : json.users || json.data || []);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    }
  }

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/reports/customer?report=master&limit=2000");
      const json = await res.json();
      if (json.success && json.data?.rows) {
        const list = json.data.rows.map((c: any, index: number) => {
          const code = (c.CODEP || c.CODE || c.ORDNO || "").toString().trim();
          const name = (c.PARNAM || c.customerName || "Unknown Customer").toString().trim();
          const city = (c.CITY || "").toString().trim();
          return {
            uniqueId: `${code || "nocode"}_${index}`,
            code,
            name,
            city,
          };
        });
        setCustomers(list);
      }
    } catch (e) {
      console.error("Failed to load customer list", e);
    }
  }

  async function fetchTargets() {
    setLoading(true);
    try {
      const res = await fetch("/api/targets");
      const json = await res.json();
      if (json.success) {
        setTargets(json.data || []);
      }
    } catch (e) {
      setError("Failed to load target records");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return targets.filter((item) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        (item.mrName && item.mrName.toLowerCase().includes(s)) ||
        (item.customerName && item.customerName.toLowerCase().includes(s)) ||
        (item.customerCode && item.customerCode.toLowerCase().includes(s)) ||
        (item.periodMonth && item.periodMonth.toLowerCase().includes(s));
      const matchType = !typeFilter || item.targetType === typeFilter;
      const matchMonth = !monthFilter || item.periodMonth === monthFilter;
      return matchSearch && matchType && matchMonth;
    });
  }, [targets, search, typeFilter, monthFilter]);

  // Derive unique identifier for currently selected customer in form
  const selectedCustomerUniqueId = useMemo(() => {
    if (!formData.customerName && !formData.customerCode) return "";
    const match = customers.find(
      (c) =>
        (formData.customerCode && c.code === formData.customerCode && c.name === formData.customerName) ||
        (formData.customerName && c.name === formData.customerName)
    );
    return match ? match.uniqueId : "";
  }, [customers, formData.customerName, formData.customerCode]);

  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        c.uniqueId === selectedCustomerUniqueId
    );
  }, [customers, customerSearch, selectedCustomerUniqueId]);

  const handleOpenAdd = () => {
    setCustomerSearch("");
    setFormData({
      targetType: "Customer",
      periodMonth: new Date().toISOString().slice(0, 7),
      mrUserId: "",
      mrName: "",
      customerId: "",
      customerName: "",
      customerCode: "",
      targetAmount: 1000000,
      collectionTargetAmount: 800000,
      hasGiftScheme: true,
      giftSlabs: [
        { minAchievementPercent: 100, giftName: "Smartwatch", giftDescription: "Premium Smartwatch or 5% Extra Cashback" },
        { minAchievementPercent: 80, giftName: "Executive Dinner Set", giftDescription: "32-Piece Premium Dinner Set" },
        { minAchievementPercent: 50, giftName: "Branded Office Bag", giftDescription: "Leatherette Executive Laptop Bag" },
      ],
      notes: "",
      status: "Active",
    });
    setEditId(null);
    setError(null);
    setSuccess(null);
    setViewState("add");
  };

  const handleOpenEdit = (item: TargetItem) => {
    setCustomerSearch("");
    const uid = typeof item.mrUserId === "string" ? item.mrUserId : item.mrUserId?._id || "";
    setFormData({
      targetType: item.targetType,
      periodMonth: item.periodMonth || new Date().toISOString().slice(0, 7),
      mrUserId: uid,
      mrName: item.mrName || "",
      customerId: item.customerId || "",
      customerName: item.customerName || "",
      customerCode: item.customerCode || "",
      targetAmount: item.targetAmount || 0,
      collectionTargetAmount: item.collectionTargetAmount || 0,
      hasGiftScheme: Boolean(item.hasGiftScheme),
      giftSlabs: Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0 ? item.giftSlabs : [],
      notes: item.notes || "",
      status: item.status,
    });
    setEditId(item._id);
    setError(null);
    setSuccess(null);
    setViewState("edit");
  };

  const handleAddSlab = () => {
    setFormData((prev) => ({
      ...prev,
      giftSlabs: [
        ...prev.giftSlabs,
        { minAchievementPercent: 100, giftName: "", giftDescription: "" },
      ],
    }));
  };

  const handleRemoveSlab = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      giftSlabs: prev.giftSlabs.filter((_, i) => i !== index),
    }));
  };

  const handleSlabChange = (index: number, field: keyof GiftSlab, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.giftSlabs];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, giftSlabs: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.periodMonth || !formData.targetAmount) {
      setError("Please specify Target Month and Target Amount.");
      return;
    }

    if (formData.targetType === "MR" && !formData.mrUserId && !formData.mrName) {
      setError("Please select an MR Executive for MR Target.");
      return;
    }

    if (formData.targetType === "Customer" && !formData.customerName) {
      setError("Please select a Customer for Customer Target.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editId ? `/api/targets/${editId}` : "/api/targets";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(editId ? "Target record updated successfully!" : "Target record created successfully!");
        fetchTargets();
        setViewState("list");
      } else {
        setError(json.message || "Operation failed.");
      }
    } catch (err: any) {
      setError("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this target record?")) return;
    try {
      const res = await fetch(`/api/targets/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSuccess("Target record removed.");
        fetchTargets();
      } else {
        setError(json.message || "Delete failed.");
      }
    } catch {
      setError("Failed to delete record.");
    }
  };

  const formatWhatsAppPhone = (phone?: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return "";
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
    if (cleaned.length > 10 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
    return cleaned;
  };

  const generateWhatsAppShareUrl = (item: TargetItem) => {
    const targetAmt = item.targetAmount || 0;
    const achieved = item.achievedAmount || 0;
    const shortfall = item.shortfall || 0;
    const name = item.customerName || item.mrName || "Valued Customer";
    const month = item.periodMonth;

    let text = `*Sales Target & Reward Alert*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Your sales target for *${month}* is *₹${targetAmt.toLocaleString("en-IN")}*.\n`;
    text += `Current Achieved: *₹${achieved.toLocaleString("en-IN")}* (${item.achievementPercent}%)\n`;
    text += `Remaining Shortfall: *₹${shortfall.toLocaleString("en-IN")}*\n\n`;

    if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
      const nextSlab = [...item.giftSlabs]
        .sort((a, b) => a.minAchievementPercent - b.minAchievementPercent)
        .find((s) => (item.achievementPercent || 0) < s.minAchievementPercent);

      if (nextSlab) {
        text += `🎁 *Special Scheme:* Complete just *₹${shortfall.toLocaleString("en-IN")}* more purchase to unlock *${nextSlab.giftName}*!`;
      } else if (item.activeGiftSlab) {
        text += `🎉 *Congratulations!* You have unlocked the *${item.activeGiftSlab.giftName}* reward scheme!`;
      }
    } else {
      text += `Please complete your target before month end to maximize your business growth!`;
    }

    const rawPhone = item.phoneNumber || (typeof item.mrUserId === "object" ? (item.mrUserId?.mobile || item.mrUserId?.phone) : "");
    const cleanPhone = formatWhatsAppPhone(rawPhone);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    } else {
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
  };

  return (
    <div className="container-fluid space-y-4 sm:space-y-6 p-3 sm:p-6 ">
      {/* // <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-x-hidden"> */}
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-700 via-pink-700 to-purple-800 p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <FaBullseye className="shrink-0" /> Target & Incentive Master
              </span>
              <span className="px-2.5 py-0.5 text-[11px] sm:text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <FaGift className="shrink-0" /> Gift Scheme Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">Target & Achievement Management Hub</h1>
            <p className="text-xs text-white/80 mt-1">
              Set monthly targets for MRs & Customers, monitor live sales achievements, and reward growth with optional gift schemes.
            </p>
          </div>
          {viewState === "list" && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-rose-950 font-bold text-xs shadow-lg hover:bg-rose-50 transition-all hover:scale-105 shrink-0"
            >
              <FaPlus className="shrink-0" /> Create Target Record
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2 min-w-0">
          <span className="min-w-0 truncate">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0"><FaTimes /></button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between gap-2 min-w-0">
          <span className="min-w-0 truncate">{success}</span>
          <button onClick={() => setSuccess(null)} className="shrink-0"><FaTimes /></button>
        </div>
      )}

      {/* LIST VIEW */}
      {viewState === "list" ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full md:w-72">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MR, customer name or code..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
              >
                <option value="">All Types (MR & Customer)</option>
                <option value="Customer">Customer Targets</option>
                <option value="MR">MR Executive Targets</option>
              </select>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
              />
              {monthFilter && (
                <button
                  onClick={() => setMonthFilter("")}
                  className="w-full sm:w-auto px-2.5 py-2 rounded-xl text-xs bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300"
                >
                  Clear Month
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">Calculating target achievements...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs font-semibold text-slate-600">No target records found.</p>
              <button
                onClick={handleOpenAdd}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                <FaPlus size={10} /> Create First Target
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const targetAmt = item.targetAmount || 0;
                const achieved = item.achievedAmount || 0;
                const shortfall = item.shortfall || 0;
                const pct = Math.min(100, item.achievementPercent || 0);

                let progressColor = "bg-rose-500";
                if (pct >= 100) progressColor = "bg-emerald-500";
                else if (pct >= 80) progressColor = "bg-indigo-500";
                else if (pct >= 50) progressColor = "bg-amber-500";

                return (
                  <div
                    key={item._id}
                    className="relative rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl shrink-0 ${item.targetType === "MR" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {item.targetType === "MR" ? <FaUser size={16} /> : <FaStore size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 break-words line-clamp-2">
                              {item.targetType === "MR" ? item.mrName || "MR Executive" : item.customerName || "Customer"}
                            </h4>
                            {item.customerCode && (
                              <span className="text-[10px] font-semibold text-slate-400 block truncate">Code: {item.customerCode}</span>
                            )}
                            {item.mrName && item.targetType === "Customer" && (
                              <span className="text-[10px] font-semibold text-indigo-600 block truncate">MR: {item.mrName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${item.targetType === "MR" ? "bg-indigo-100 text-indigo-800 border-indigo-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}>
                            {item.targetType === "MR" ? "MR Target" : "Customer Target"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                            <FaCalendarAlt size={10} /> {item.periodMonth}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Financials */}
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Achievement Rate</span>
                          <span className="font-extrabold text-slate-900">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center pt-2">
                          <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-100 min-w-0">
                            <p className="text-[9px] uppercase font-bold text-slate-400 truncate">Target</p>
                            <p className="text-[11px] sm:text-xs font-extrabold text-slate-800 truncate">₹{targetAmt.toLocaleString("en-IN")}</p>
                          </div>
                          <div className="bg-emerald-50/60 p-1.5 sm:p-2 rounded-xl border border-emerald-100 min-w-0">
                            <p className="text-[9px] uppercase font-bold text-emerald-600 truncate">Achieved</p>
                            <p className="text-[11px] sm:text-xs font-extrabold text-emerald-700 truncate">₹{achieved.toLocaleString("en-IN")}</p>
                          </div>
                          <div className="bg-rose-50/60 p-1.5 sm:p-2 rounded-xl border border-rose-100 min-w-0">
                            <p className="text-[9px] uppercase font-bold text-rose-600 truncate">Shortfall</p>
                            <p className="text-[11px] sm:text-xs font-extrabold text-rose-700 truncate">₹{shortfall.toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>

                      {/* Active Gift Scheme Badge */}
                      {item.hasGiftScheme && (
                        <div className="mt-3 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-300/40 p-2.5 rounded-xl flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FaGift className="text-amber-600 shrink-0" size={14} />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-amber-900 truncate">
                                {item.activeGiftSlab ? `Unlocked: ${item.activeGiftSlab.giftName}` : "Reward Scheme Active"}
                              </p>
                              {item.activeGiftSlab?.giftDescription && (
                                <p className="text-[9px] text-amber-700 truncate">{item.activeGiftSlab.giftDescription}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                            Gift Enabled
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                      <a
                        href={generateWhatsAppShareUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] shadow hover:bg-emerald-700 transition-all shrink-0"
                      >
                        <FaWhatsapp size={13} /> Share Shortfall
                      </a>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* FORM MODE: ADD / EDIT */
        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {viewState === "add" ? "Create New Target & Gift Scheme" : "Edit Target Record"}
            </h3>
            <button
              onClick={() => setViewState("list")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <FaArrowLeft /> Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Type *</label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold"
                >
                  <option value="Customer">Customer Target (Chemist / Doctor / Stockist)</option>
                  <option value="MR">MR Executive Sales Target</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Period Month *</label>
                <input
                  type="month"
                  value={formData.periodMonth}
                  onChange={(e) => setFormData({ ...formData, periodMonth: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Dynamic Target Assignee */}
            {formData.targetType === "MR" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MR Executive *</label>
                <select
                  value={formData.mrUserId}
                  onChange={(e) => setFormData({ ...formData, mrUserId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold"
                  required
                >
                  <option value="">-- Select MR Executive --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {u.designation || "Executive"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer / Party *</label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="🔍 Type to filter customer list..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <select
                      value={selectedCustomerUniqueId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const found = customers.find((c) => c.uniqueId === targetId);
                        if (found) {
                          setFormData({
                            ...formData,
                            customerCode: found.code,
                            customerName: found.name,
                            customerId: found.code || found.name,
                          });
                        } else {
                          setFormData({
                            ...formData,
                            customerName: "",
                            customerCode: "",
                            customerId: "",
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold"
                      required
                    >
                      <option value="">-- Choose Customer --</option>
                      {filteredCustomerOptions.map((c) => (
                        <option key={c.uniqueId} value={c.uniqueId}>
                          {c.name} {c.code ? `(${c.code})` : ""} {c.city ? `- ${c.city}` : ""}
                        </option>
                      ))}
                    </select>

                    {formData.customerName && (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                        <span>✓ Selected: {formData.customerName} {formData.customerCode ? `(${formData.customerCode})` : ""}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned MR Executive (Optional)</label>
                  <select
                    value={formData.mrUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      const matchedUser = users.find((u) => u._id === uid);
                      setFormData({
                        ...formData,
                        mrUserId: uid,
                        mrName: matchedUser ? matchedUser.name : "",
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold"
                  >
                    <option value="">-- Optional (Auto-mapped via Territory) --</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-map via MR Territory Assignment</p>
                </div>
              </div>
            )}

            {/* Target Financial Amounts: Sales & Collection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sales Target Amount (₹) *</label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) || 0 })}
                  placeholder="1000000"
                  min={0}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Collection Target Amount (₹)</label>
                <input
                  type="number"
                  value={formData.collectionTargetAmount}
                  onChange={(e) => setFormData({ ...formData, collectionTargetAmount: Number(e.target.value) || 0 })}
                  placeholder="800000"
                  min={0}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-900"
                />
              </div>
            </div>

            {/* Optional Gift / Reward Scheme Toggle */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/60 to-rose-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaGift className="text-amber-600" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">🎁 Enable Gift / Reward Scheme</h4>
                    <p className="text-[11px] text-slate-500">Configure reward items based on achievement percentage slabs</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hasGiftScheme}
                  onChange={(e) => setFormData({ ...formData, hasGiftScheme: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {formData.hasGiftScheme && (
                <div className="space-y-2 pt-2 border-t border-amber-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">Gift Reward Slabs</span>
                    <button
                      type="button"
                      onClick={handleAddSlab}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                    >
                      <FaPlus size={10} /> Add Reward Slab
                    </button>
                  </div>

                  {formData.giftSlabs.map((slab, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200">
                      <div className="w-full sm:w-28 shrink-0">
                        <label className="text-[9px] font-bold text-slate-400 block">Min Achieved %</label>
                        <input
                          type="number"
                          value={slab.minAchievementPercent}
                          onChange={(e) => handleSlabChange(idx, "minAchievementPercent", Number(e.target.value) || 0)}
                          className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div className="w-full sm:flex-1">
                        <label className="text-[9px] font-bold text-slate-400 block">Gift / Incentive Title</label>
                        <input
                          type="text"
                          value={slab.giftName}
                          onChange={(e) => handleSlabChange(idx, "giftName", e.target.value)}
                          placeholder="e.g. Smartwatch"
                          className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div className="w-full sm:flex-1">
                        <label className="text-[9px] font-bold text-slate-400 block">Description (Optional)</label>
                        <input
                          type="text"
                          value={slab.giftDescription || ""}
                          onChange={(e) => handleSlabChange(idx, "giftDescription", e.target.value)}
                          placeholder="e.g. Boat Smartwatch"
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlab(idx)}
                        className="self-end sm:self-center mt-1 sm:mt-3 p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewState("list")}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md flex items-center justify-center gap-1.5"
              >
                <FaSave /> {saving ? "Saving..." : "Save Target"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
