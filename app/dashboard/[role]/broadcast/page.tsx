"use client";

import React, { useState, useEffect } from "react";
import {
  FaBroadcastTower,
  FaWhatsapp,
  FaEnvelope,
  FaSms,
  FaBell,
  FaUsers,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaCheckCircle,
  FaTimesCircle,
  FaHistory,
  FaTag,
  FaMagic,
} from "react-icons/fa";

export default function BroadcastMessagePage() {
  const [channels, setChannels] = useState<{ [key: string]: boolean }>({
    whatsapp: true,
    email: true,
    sms: false,
    inApp: true,
  });

  const [targetRoles, setTargetRoles] = useState<string[]>(["All"]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [areasList, setAreasList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  const [title, setTitle] = useState("Important Announcement from Mabsol Pharma");
  const [messageBody, setMessageBody] = useState(
    "Dear {name},\n\nPlease review your latest targets and active customer orders for {area}. Kindly ensure all daily field reports are updated on time.\n\nRegards,\nMabsol Pharma Team"
  );

  const [sending, setSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  useEffect(() => {
    fetchAreas();
    fetchRoles();
    fetchHistory();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await fetch("/api/master/area");
      const data = await res.json();
      if (Array.isArray(data)) setAreasList(data);
      else if (data?.areas) setAreasList(data.areas);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (Array.isArray(data)) setRolesList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/broadcast/send");
      const data = await res.json();
      if (data.success && Array.isArray(data.broadcasts)) {
        setBroadcasts(data.broadcasts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  const toggleRole = (rName: string) => {
    if (rName === "All") {
      setTargetRoles(["All"]);
      return;
    }
    setTargetRoles((prev) => {
      const filtered = prev.filter((r) => r !== "All");
      if (filtered.includes(rName)) {
        const next = filtered.filter((r) => r !== rName);
        return next.length === 0 ? ["All"] : next;
      } else {
        return [...filtered, rName];
      }
    });
  };

  const toggleArea = (aName: string) => {
    setSelectedAreas((prev) =>
      prev.includes(aName) ? prev.filter((a) => a !== aName) : [...prev, aName]
    );
  };

  const applyTemplate = (type: string) => {
    if (type === "launch") {
      setTitle("🚀 New Product Launch Notice");
      setMessageBody(
        "Dear {name},\n\nWe are excited to introduce our new formulation now available in {area}! Reach out to your doctor network to discuss samples and place initial stock bookings.\n\nBest,\nMabsol Pharma"
      );
    } else if (type === "target") {
      setTitle("🎯 Mid-Cycle Target & Performance Update");
      setMessageBody(
        "Hi {name},\n\nYou are on track to achieve your monthly target in {area}. Check your live sales progress on the CRM dashboard and follow up on pending chemist orders today!"
      );
    } else if (type === "reminder") {
      setTitle("⚠️ Important Payment Due Reminder");
      setMessageBody(
        "Dear {name},\n\nThis is a friendly reminder regarding your outstanding balance in {area}. Please clear your overdue invoices to ensure uninterrupted stock dispatch.\n\nThank you!"
      );
    }
  };

  const handleSendBroadcast = async () => {
    const activeChannels = Object.keys(channels).filter((k) => channels[k]);
    if (activeChannels.length === 0) {
      alert("Please select at least one delivery channel (WhatsApp, Email, SMS, or In-App).");
      return;
    }
    if (!title || !messageBody) {
      alert("Please enter a title and message body.");
      return;
    }

    try {
      setSending(true);
      setDispatchResult(null);

      const res = await fetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          messageBody,
          channels: activeChannels,
          targetRoles,
          targetAreaNames: selectedAreas,
        }),
      });

      const data = await res.json();
      setDispatchResult(data);
      if (data.success) {
        fetchHistory();
      }
    } catch (err: any) {
      setDispatchResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300">
            Targeted Communications
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2.5">
            <FaBroadcastTower className="text-purple-400" /> 1-Click Multi-Channel Broadcast
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Send custom messages to all users, specific roles (MR, Chemist, Manager), or specific territories across WhatsApp, Email, SMS, and In-App with 1 click.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Composer & Targeting */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* STEP 1: CHANNELS */}
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              1. Select Delivery Channels
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => toggleChannel("whatsapp")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  channels.whatsapp
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <FaWhatsapp size={16} className={channels.whatsapp ? "text-emerald-600" : ""} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel("email")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  channels.email
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <FaEnvelope size={15} className={channels.email ? "text-indigo-600" : ""} />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel("sms")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  channels.sms
                    ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <FaSms size={16} className={channels.sms ? "text-purple-600" : ""} />
                <span>SMS</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel("inApp")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  channels.inApp
                    ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <FaBell size={15} className={channels.inApp ? "text-amber-600" : ""} />
                <span>In-App</span>
              </button>
            </div>
          </div>

          {/* STEP 2: TARGET AUDIENCE (ROLES & AREAS) */}
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Filter Target Audience
            </h3>

            {/* Roles Chips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FaUsers size={12} className="text-indigo-600" /> By User Role
              </label>
              <div className="flex flex-wrap gap-2">
                {["All", "MR", "RSM", "ZSM", "Admin", "Customer", ...rolesList.map((r) => r.roleName)]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((r) => {
                    const active = targetRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400"
                        }`}
                      >
                        {r === "All" ? "🌐 All Available Users" : r}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Areas Chips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FaMapMarkerAlt size={12} className="text-purple-600" /> By Area / Territory (Optional)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                {areasList.length === 0 && (
                  <span className="text-[11px] text-slate-400">Loading areas...</span>
                )}
                {areasList.map((a) => {
                  const name = a.areaName || a.name;
                  const active = selectedAreas.includes(name);
                  return (
                    <button
                      key={a._id || name}
                      type="button"
                      onClick={() => toggleArea(name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                        active
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: MESSAGE COMPOSER */}
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Compose Broadcast Message
              </h3>
              {/* Quick Templates */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Templates:</span>
                <button
                  type="button"
                  onClick={() => applyTemplate("launch")}
                  className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100"
                >
                  🚀 Product Launch
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("target")}
                  className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 text-[10px] font-bold hover:bg-purple-100"
                >
                  🎯 Target Push
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("reminder")}
                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 text-[10px] font-bold hover:bg-rose-100"
                >
                  ⚠️ Payment Due
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Title / Subject</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Content</label>
                <span className="text-[10px] text-slate-400">Available: {"{name}"}, {"{area}"}, {"{role}"}</span>
              </div>
              <textarea
                rows={5}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none leading-relaxed"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
            >
              <FaPaperPlane size={14} />
              {sending ? "Dispatching Broadcast to All Recipients..." : "⚡ 1-Click Broadcast Now"}
            </button>

            {dispatchResult && (
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${
                  dispatchResult.success
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {dispatchResult.success ? <FaCheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" /> : <FaTimesCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-bold">{dispatchResult.message || dispatchResult.error}</p>
                  {dispatchResult.success && (
                    <p className="text-[11px] mt-0.5">Delivered to: {dispatchResult.sentCount} recipients ({dispatchResult.failedCount} failed/skipped)</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Broadcast History */}
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FaHistory size={12} /> Broadcast Dispatch Log
            </h3>

            <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
              {broadcasts.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No broadcast messages sent yet.
                </div>
              )}
              {broadcasts.map((b) => (
                <div
                  key={b._id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {b.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                      {b.sentCount} Sent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {b.messageBody}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>{new Date(b.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="font-medium text-indigo-600">Roles: {b.targetRoles?.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
