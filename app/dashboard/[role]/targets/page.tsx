"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaBullseye,
  FaGift,
  FaSearch,
  FaUser,
  FaStore,
  FaCalendarAlt,
  FaWhatsapp,
  FaTrophy,
  FaChartLine,
  FaCog,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaFilter,
  FaLock,
  FaMapMarkerAlt,
} from "react-icons/fa";

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

function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
  if (cleaned.length > 10 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
  return cleaned;
}

export default function GeneralTargetsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [isMrRestricted, setIsMrRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchCurrentUser();
    fetchTargets();
  }, []);

  async function fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.user) {
        setCurrentUser(json.user);
      }
    } catch (e) {
      console.error("Failed to fetch user auth profile", e);
    }
  }

  async function fetchTargets() {
    setLoading(true);
    try {
      const res = await fetch("/api/targets");
      const json = await res.json();
      if (json.success) {
        setTargets(json.data || []);
        setIsMrRestricted(Boolean(json.isMrRestricted));
      }
    } catch (e) {
      setError("Failed to load targets data.");
    } finally {
      setLoading(false);
    }
  }

  // Check if current user is Admin / Manager
  const isAdmin = useMemo(() => {
    if (isMrRestricted) return false;
    if (!currentUser) return true; // Default to admin view while loading
    const roleName = (currentUser.roleId?.roleName || currentUser.role || "").toString().toLowerCase();
    return roleName.includes("admin") || roleName.includes("super") || roleName.includes("manager") || currentUser.isAdmin === true;
  }, [currentUser, isMrRestricted]);

  // Logged-in MR's user ID / name
  const loggedInMrId = currentUser?._id;
  const loggedInMrName = currentUser?.name || "";

  // Filtered targets
  const filteredTargets = useMemo(() => {
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

  // MR's personal target
  const myPersonalTarget = useMemo(() => {
    return targets.find((item) => {
      const itemMrId = typeof item.mrUserId === "string" ? item.mrUserId : item.mrUserId?._id || "";
      return item.targetType === "MR" && (itemMrId === loggedInMrId || item.mrName === loggedInMrName);
    });
  }, [targets, loggedInMrId, loggedInMrName]);

  // Overall Financial Stats
  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalAchieved = 0;
    let totalShortfall = 0;

    filteredTargets.forEach((t) => {
      totalTarget += t.targetAmount || 0;
      totalAchieved += t.achievedAmount || 0;
      totalShortfall += t.shortfall || 0;
    });

    const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

    return {
      totalTarget,
      totalAchieved,
      totalShortfall,
      overallPercent,
      count: filteredTargets.length,
    };
  }, [filteredTargets]);

  const generateWhatsAppShareUrl = (item: TargetItem) => {
    const targetAmt = item.targetAmount || 0;
    const achieved = item.achievedAmount || 0;
    const shortfall = item.shortfall || 0;
    const name = item.customerName || item.mrName || "Valued Customer";
    const month = item.periodMonth;

    let text = `*Sales Target & Scheme Update*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Target for *${month}*: *₹${targetAmt.toLocaleString("en-IN")}*\n`;
    text += `Achieved Till Date: *₹${achieved.toLocaleString("en-IN")}* (${item.achievementPercent}%)\n`;
    text += `Remaining Shortfall: *₹${shortfall.toLocaleString("en-IN")}*\n\n`;

    if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
      const nextSlab = [...item.giftSlabs]
        .sort((a, b) => a.minAchievementPercent - b.minAchievementPercent)
        .find((s) => (item.achievementPercent || 0) < s.minAchievementPercent);

      if (nextSlab) {
        text += `🎁 *Gift Scheme:* Complete just *₹${shortfall.toLocaleString("en-IN")}* more purchase to unlock *${nextSlab.giftName}*!`;
      } else if (item.activeGiftSlab) {
        text += `🎉 *Congratulations!* You have unlocked the *${item.activeGiftSlab.giftName}* reward scheme!`;
      }
    } else {
      text += `Please complete your target before month end to maximize your business growth!`;
    }

    const rawPhone = item.phoneNumber || (typeof item.mrUserId === "object" ? (item.mrUserId?.mobile || item.mrUserId?.phone) : "");
    const cleanPhone = formatWhatsAppPhone(rawPhone);

    if (cleanPhone) {
      // Customer/MR Phone exists -> Open direct WhatsApp chat profile with pre-filled message
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    } else {
      // Phone missing -> Open WhatsApp with pre-filled message so user can pick contact manually
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
  };

  return (
    // <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
    <div className="container-fluid space-y-4 sm:space-y-6 p-3 sm:p-6 ">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-700 via-pink-700 to-purple-800 p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <FaBullseye className="shrink-0" /> <span className="truncate">{isAdmin ? "Admin Sales Target & Achievement Center" : "MR Territory Target Portal"}</span>
              </span>
              <span className="px-2.5 py-0.5 text-[11px] sm:text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <FaGift className="shrink-0" /> Incentive & Gift Tracker
              </span>
              {isMrRestricted && (
                <span className="px-2.5 py-0.5 text-[11px] sm:text-xs font-bold rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <FaLock size={10} className="shrink-0" /> Territory Scope Filter Active
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">
              {isAdmin ? "Global Target & Performance Dashboard" : `My Territory Targets - ${currentUser?.name || "Field Executive"}`}
            </h1>
            <p className="text-xs text-white/80 mt-1">
              {isAdmin
                ? "Track sales achievements, target shortfalls, and reward schemes across all MRs and Customers."
                : "Showing targets exclusively for your assigned territory & assigned customers."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
            <Link
              href="/dashboard/reports/target-vs-actual"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition-all hover:scale-105"
            >
              <FaChartLine className="shrink-0" /> <span>Party vs MR Target Report</span>
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/master/targets"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white text-rose-950 font-bold text-xs shadow-lg hover:bg-rose-50 transition-all hover:scale-105"
              >
                <FaCog className="shrink-0" /> <span>Target Master Setup</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 truncate">Total Assigned Target</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 truncate">₹{stats.totalTarget.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <FaBullseye size={20} />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-emerald-600 truncate">Total Sales Achieved</p>
            <p className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5 truncate">₹{stats.totalAchieved.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <FaChartLine size={20} />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-rose-600 truncate">Remaining Shortfall</p>
            <p className="text-base sm:text-lg font-extrabold text-rose-700 mt-0.5 truncate">₹{stats.totalShortfall.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <FaExclamationTriangle size={20} />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 truncate">Overall Rate</p>
            <p className="text-base sm:text-lg font-extrabold text-purple-700 mt-0.5 truncate">{stats.overallPercent}%</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <FaTrophy size={20} />
          </div>
        </div>
      </div>

      {/* MR Personal Target Showcase (If Logged-in user has personal MR Target) */}
      {myPersonalTarget && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/20 text-white flex items-center gap-1.5">
                <FaUser className="shrink-0" /> <span className="truncate">My Personal Executive Sales Target</span>
              </span>
              <span className="text-xs font-semibold text-indigo-200">Month: {myPersonalTarget.periodMonth}</span>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 self-start sm:self-auto shrink-0">
              {myPersonalTarget.achievementPercent}% Completed
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-indigo-100">
              <span>Target Achievement Progress</span>
              <span>₹{(myPersonalTarget.achievedAmount || 0).toLocaleString("en-IN")} / ₹{(myPersonalTarget.targetAmount || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, myPersonalTarget.achievementPercent || 0)}%` }}
              />
            </div>
          </div>

          {myPersonalTarget.hasGiftScheme && (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FaGift className="text-amber-300 shrink-0" size={16} />
                <span className="min-w-0 truncate">
                  {myPersonalTarget.activeGiftSlab
                    ? `🎁 Reward Unlocked: ${myPersonalTarget.activeGiftSlab.giftName}`
                    : "🎁 Achieve target to unlock special executive incentive rewards!"}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded shrink-0">
                Active Scheme
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
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
            <option value="">All Target Types</option>
            <option value="Customer">Customer Targets</option>
            <option value="MR">MR Executive Targets</option>
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Target Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading live target achievements...</div>
      ) : filteredTargets.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300">
          <p className="text-xs font-semibold text-slate-600">No target records found for your assigned territory/period.</p>
          {isAdmin && (
            <Link
              href="/dashboard/master/targets"
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
            >
              Set New Target
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTargets.map((item) => {
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
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-slate-400 mt-0.5">
                          {item.customerCode && <span>Code: {item.customerCode}</span>}
                          {(() => {
                            const rawPhone = item.phoneNumber || (typeof item.mrUserId === "object" ? (item.mrUserId?.mobile || item.mrUserId?.phone) : "");
                            const cleanPhone = formatWhatsAppPhone(rawPhone);
                            return cleanPhone ? (
                              <span className="text-emerald-700 font-extrabold flex items-center gap-1 break-all">
                                📞 +{cleanPhone}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">
                                ⚠️ No Phone
                              </span>
                            );
                          })()}
                        </div>
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

                  {/* Progress Bar & Financial Summary */}
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
                        Gift Scheme
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  {(() => {
                    const rawPhone = item.phoneNumber || (typeof item.mrUserId === "object" ? (item.mrUserId?.mobile || item.mrUserId?.phone) : "");
                    const cleanPhone = formatWhatsAppPhone(rawPhone);
                    return cleanPhone ? (
                      <a
                        href={generateWhatsAppShareUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-all hover:scale-[1.02] text-center min-w-0"
                      >
                        <FaWhatsapp size={14} className="shrink-0" /> <span className="truncate">Send Direct WhatsApp (+{cleanPhone})</span>
                      </a>
                    ) : (
                      <a
                        href={generateWhatsAppShareUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow hover:bg-indigo-700 transition-all hover:scale-[1.02] text-center min-w-0"
                        title="Number not saved. Opens WhatsApp with message ready so you can pick contact manually."
                      >
                        <FaWhatsapp size={14} className="shrink-0" /> <span className="truncate">Share Message via WhatsApp</span>
                      </a>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
