"use client";

import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaWhatsapp,
  FaSms,
  FaBell,
  FaSave,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
  FaServer,
  FaShieldAlt,
} from "react-icons/fa";

export default function NotificationSettingsPage() {
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp" | "sms" | "triggers">("email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testRecipient, setTestRecipient] = useState("");

  const [settings, setSettings] = useState<any>({
    email: {
      enabled: true,
      provider: "smtp",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPass: "",
      fromEmail: "notifications@mabsolpharma.com",
      fromName: "MabsolCrm",
    },
    whatsapp: {
      enabled: true,
      provider: "meta",
      metaPhoneNumberId: "",
      metaAccessToken: "",
      metaBusinessAccountId: "",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioFromPhone: "",
    },
    sms: {
      enabled: false,
      provider: "fast2sms",
      apiKey: "",
      senderId: "MABSOL",
      route: "q",
    },
    eventTriggers: {
      orderPlaced: { email: true, whatsapp: true, sms: false, inApp: true },
      orderDispatched: { email: true, whatsapp: true, sms: true, inApp: true },
      orderDelivered: { email: true, whatsapp: true, sms: false, inApp: true },
      lowStockAlert: { email: true, whatsapp: false, sms: false, inApp: true },
      paymentReminder: { email: true, whatsapp: true, sms: true, inApp: true },
      dcrSubmitted: { email: false, whatsapp: false, sms: false, inApp: true },
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/settings");
      const data = await res.json();
      if (data.success && data.config) {
        setSettings(data.config);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Notification gateway settings saved successfully!");
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (channel: "email" | "whatsapp" | "sms") => {
    if (!testRecipient) {
      alert(`Please enter a destination ${channel === "email" ? "email" : "phone number"} for the test.`);
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_CONNECTION",
          channel,
          testRecipient,
          ...settings,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 p-6 text-white border border-indigo-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            Multi-Channel Gateway Hub
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-2">Notification & Gateway Settings</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure SMTP Email, Meta WhatsApp Cloud API, and SMS Gateways with granular trigger matrix controls for automatic stock and order events.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
        >
          <FaSave size={13} />
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {/* Main Tabs Container */}
      <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab("email"); setTestResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <FaEnvelope size={13} /> Email (SMTP)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("whatsapp"); setTestResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <FaWhatsapp size={14} /> WhatsApp Cloud API
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("sms"); setTestResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sms"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <FaSms size={13} /> SMS Gateway
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("triggers"); setTestResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "triggers"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <FaBell size={13} /> Event Trigger Matrix
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="p-6">
          {/* TAB 1: EMAIL (SMTP) */}
          {activeTab === "email" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <FaEnvelope size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Email Dispatch Service</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Send invoices, order dispatch notes, and ledger statements</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email?.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, enabled: e.target.checked } })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>SMTP Host</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. smtp.gmail.com"
                    value={settings.email?.smtpHost || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, smtpHost: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>SMTP Port</label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="587"
                    value={settings.email?.smtpPort || 587}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, smtpPort: Number(e.target.value) } })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>SMTP Username / Email</label>
                  <input
                    className={inputClass}
                    placeholder="user@gmail.com"
                    value={settings.email?.smtpUser || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, smtpUser: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>SMTP Password / App Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="••••••••••••"
                    value={settings.email?.smtpPass || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, smtpPass: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>From Sender Email</label>
                  <input
                    className={inputClass}
                    placeholder="notifications@mabsolpharma.com"
                    value={settings.email?.fromEmail || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, fromEmail: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>From Sender Name</label>
                  <input
                    className={inputClass}
                    placeholder="MabsolCrm"
                    value={settings.email?.fromName || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email: { ...settings.email, fromName: e.target.value } })
                    }
                  />
                </div>
              </div>

              {/* Test Connection Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Enter test email address (e.g. your-email@gmail.com)"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleTestConnection("email")}
                  disabled={testing}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FaPaperPlane size={11} /> {testing ? "Sending Test..." : "Send Test Email"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP CLOUD API */}
          {activeTab === "whatsapp" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <FaWhatsapp size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Meta WhatsApp Cloud Gateway</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Send real-time dispatch alerts and 1-click broadcast messages</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.whatsapp?.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, enabled: e.target.checked } })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Provider</label>
                  <select
                    className={inputClass}
                    value={settings.whatsapp?.provider || "mock"}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, provider: e.target.value } })
                    }
                  >
                    <option value="meta">Meta Official WhatsApp Cloud API</option>
                    <option value="twilio">Twilio WhatsApp</option>
                    <option value="mock">Sandbox / Mock Simulator (Local Testing)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Phone Number ID (from Meta Developers)</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. 109823485728392"
                    value={settings.whatsapp?.metaPhoneNumberId || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, metaPhoneNumberId: e.target.value } })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>System User Access Token (Permanent Token)</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="EAABwz..."
                    value={settings.whatsapp?.metaAccessToken || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, metaAccessToken: e.target.value } })
                    }
                  />
                </div>
              </div>

              {/* Test Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Enter test phone number with country code (e.g. 919876543210)"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleTestConnection("whatsapp")}
                  disabled={testing}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FaPaperPlane size={11} /> {testing ? "Sending WhatsApp..." : "Send Test WhatsApp"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SMS GATEWAY */}
          {activeTab === "sms" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <FaSms size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">SMS Gateway (Fast2SMS / MSG91)</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant transactional and dispatch notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sms?.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, sms: { ...settings.sms, enabled: e.target.checked } })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Provider</label>
                  <select
                    className={inputClass}
                    value={settings.sms?.provider || "mock"}
                    onChange={(e) =>
                      setSettings({ ...settings, sms: { ...settings.sms, provider: e.target.value } })
                    }
                  >
                    <option value="fast2sms">Fast2SMS (Quick OTP / DLT)</option>
                    <option value="msg91">MSG91 Enterprise</option>
                    <option value="twilio">Twilio Programmable SMS</option>
                    <option value="mock">Sandbox / Mock Simulator</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sender ID / Header</label>
                  <input
                    className={inputClass}
                    placeholder="MABSOL"
                    value={settings.sms?.senderId || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, sms: { ...settings.sms, senderId: e.target.value } })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>API Authorization Key</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="API Key..."
                    value={settings.sms?.apiKey || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, sms: { ...settings.sms, apiKey: e.target.value } })
                    }
                  />
                </div>
              </div>

              {/* Test Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Enter 10-digit mobile number for test SMS"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleTestConnection("sms")}
                  disabled={testing}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-purple-500 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FaPaperPlane size={11} /> {testing ? "Sending SMS..." : "Send Test SMS"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: TRIGGER MATRIX */}
          {activeTab === "triggers" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Automated Event Notification Matrix
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                Configure which communication channels are triggered automatically when business events occur in the system.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-3">Business Event</th>
                      <th className="p-3 text-center">✉️ Email</th>
                      <th className="p-3 text-center">💬 WhatsApp</th>
                      <th className="p-3 text-center">📱 SMS</th>
                      <th className="p-3 text-center">🔔 In-App</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      { key: "orderPlaced", title: "New Order Placed", desc: "Triggered when customer or MR creates a new order" },
                      { key: "orderDispatched", title: "Order Dispatched", desc: "Sent to buyer & MR with Courier AWB tracking info" },
                      { key: "orderDelivered", title: "Order Delivered", desc: "Confirmation alert upon delivery sign-off" },
                      { key: "lowStockAlert", title: "Low Stock Alert", desc: "Alert sent when product batch stock falls below threshold" },
                      { key: "paymentReminder", title: "Payment Overdue Reminder", desc: "Automated ledger reminder for dues > 30 days" },
                    ].map((item) => {
                      const t = settings.eventTriggers?.[item.key] || {};
                      return (
                        <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{item.title}</span>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!t.email}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  eventTriggers: {
                                    ...settings.eventTriggers,
                                    [item.key]: { ...t, email: e.target.checked },
                                  },
                                })
                              }
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!t.whatsapp}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  eventTriggers: {
                                    ...settings.eventTriggers,
                                    [item.key]: { ...t, whatsapp: e.target.checked },
                                  },
                                })
                              }
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!t.sms}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  eventTriggers: {
                                    ...settings.eventTriggers,
                                    [item.key]: { ...t, sms: e.target.checked },
                                  },
                                })
                              }
                              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!t.inApp}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  eventTriggers: {
                                    ...settings.eventTriggers,
                                    [item.key]: { ...t, inApp: e.target.checked },
                                  },
                                })
                              }
                              className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Test Feedback Toast / Alert */}
          {testResult && (
            <div
              className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {testResult.success ? (
                <FaCheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <FaExclamationCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {testResult.success ? "Test Message Dispatched Successfully!" : "Test Dispatch Failed"}
                </p>
                <p className="text-[11px] mt-0.5">
                  {testResult.success
                    ? `Message ID: ${testResult.messageId || 'OK'} | Destination: ${testResult.recipient}`
                    : testResult.error || "Unable to send message. Please check API credentials."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
