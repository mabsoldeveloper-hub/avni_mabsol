"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FaSlidersH,
  FaClock,
  FaFileInvoice,
  FaCoins,
  FaCalendarAlt,
  FaEnvelope,
  FaWhatsapp,
  FaPlay,
  FaSave,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPaperPlane,
  FaShieldAlt,
  FaRobot,
  FaHistory,
} from "react-icons/fa";

export default function MasterAlertSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scanResults, setScanResults] = useState<any | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);

  const [form, setForm] = useState({
    enabled: true,
    daysRemainingThreshold: 3,
    billCountThreshold: 5,
    creditLimitPercentage: 100,
    autoDispatchEmail: true,
    autoDispatchWhatsApp: false,
    adminNotificationEmail: "",
    metaPhoneNumberId: "",
    metaAccessToken: "",
    schedulerEnabled: true,
    scheduleFrequency: "every_15_mins",
    scheduledTime: "09:00",
    cooldownHours: 24,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/alert-settings");
      const data = await res.json();
      if (data?.config) {
        setForm({
          enabled: data.config.enabled ?? true,
          daysRemainingThreshold: data.config.daysRemainingThreshold ?? 3,
          billCountThreshold: data.config.billCountThreshold ?? 5,
          creditLimitPercentage: data.config.creditLimitPercentage ?? 100,
          autoDispatchEmail: data.config.autoDispatchEmail ?? true,
          autoDispatchWhatsApp: data.config.autoDispatchWhatsApp ?? false,
          adminNotificationEmail: data.config.adminNotificationEmail || "",
          metaPhoneNumberId: data.config.metaPhoneNumberId || "",
          metaAccessToken: data.config.metaAccessToken || "",
          schedulerEnabled: data.config.schedulerEnabled ?? true,
          scheduleFrequency: data.config.scheduleFrequency || "every_15_mins",
          scheduledTime: data.config.scheduledTime || "09:00",
          cooldownHours: data.config.cooldownHours ?? 24,
        });
      }
      if (data?.schedulerStatus) {
        setSchedulerStatus(data.schedulerStatus);
      }
    } catch (err: any) {
      console.error("Error loading alert settings:", err);
      setFeedback({ type: "error", message: "Failed to load master alert settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setFeedback(null);

    // Guaranteed minimum delay (750ms) so the user clearly sees the spinner & loading progress
    const minLoadingDelay = new Promise((resolve) => setTimeout(resolve, 750));

    try {
      const [res] = await Promise.all([
        fetch("/api/customers/alert-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        minLoadingDelay,
      ]);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      setFeedback({
        type: "success",
        message: "Master alert rules and background scheduler saved and updated successfully!",
      });

      if (data.schedulerStatus) {
        setSchedulerStatus(data.schedulerStatus);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "Error saving alert settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const targetEmail = form.adminNotificationEmail?.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setFeedback({
        type: "error",
        message: "Please enter a valid Gmail / Admin email address in the field below before testing.",
      });
      return;
    }

    setTestingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/customers/alert-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_email",
          email: targetEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send test email");
      }

      setFeedback({
        type: "success",
        message: `✅ Test email successfully delivered to ${targetEmail} via GoDaddy SMTP! Please check your Gmail Inbox.`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to send test email via GoDaddy SMTP",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setScanResults(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/customers/alert-settings/auto-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceIgnoreCooldown: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to run scan");
      }

      setScanResults(data);
      setFeedback({
        type: "success",
        message: `Auto-scan finished: Evaluated ${data.scannedCount} accounts, ${data.alertsTriggered} matched alert rules!`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "Error running customer auto-scan",
      });
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <FaSpinner className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-semibold text-slate-600">Loading Master Alert Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master"
            className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FaSlidersH className="text-indigo-600" /> Customer Alert Rules & Scanner Master
              </h2>
              {schedulerStatus?.isSchedulerRunning ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Daemon Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  Daemon Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure global automated evaluation rules for Due Days, Invoice Count, and Credit Limits across all customer accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={scanning || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {scanning ? (
              <>
                <FaSpinner className="animate-spin" size={12} />
                <span>Scanning Accounts...</span>
              </>
            ) : (
              <>
                <FaPlay size={10} />
                <span>Test & Run Auto-Scan Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Master Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Master Status</p>
            <p className="text-base font-bold text-slate-800 mt-1">
              {form.enabled ? "Active Automation" : "Paused"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Global Rule Engine</p>
          </div>
          <div className={`p-3 rounded-xl ${form.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            <FaShieldAlt size={20} />
          </div>
        </div>

        {/* Card 2: Scheduler Frequency */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daemon Schedule</p>
            <p className="text-base font-bold text-indigo-600 mt-1 capitalize">
              {form.scheduleFrequency === "every_15_mins"
                ? "Every 15 Mins"
                : form.scheduleFrequency === "hourly"
                ? "Every 1 Hour"
                : form.scheduleFrequency === "every_6_hours"
                ? "Every 6 Hours"
                : `Daily (${form.scheduledTime})`}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {form.schedulerEnabled ? "Background Runner On" : "Runner Stopped"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700">
            <FaRobot size={20} />
          </div>
        </div>

        {/* Card 3: Dispatch Channel */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email Gateway</p>
            <p className="text-base font-bold text-slate-800 mt-1">GoDaddy SMTP</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">● Connected & Ready</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
            <FaEnvelope size={20} />
          </div>
        </div>

        {/* Card 4: Last Scan Activity */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Last Scan Activity</p>
            <p className="text-base font-bold text-slate-800 mt-1">
              {scanResults
                ? `${scanResults.alertsTriggered} Triggered`
                : "Awaiting Trigger"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {scanResults ? `Checked ${scanResults.scannedCount} accounts` : "Click Run Scan to test"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
            <FaHistory size={20} />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl text-xs font-semibold shadow-xs animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <FaCheckCircle size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <FaExclamationTriangle size={16} className="text-rose-500 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. MASTER AUTOMATION TOGGLE */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Master Automatic Customer Alerts</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              When enabled, the automated background scheduler monitors all accounts and sends alerts whenever a customer violates credit rules.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        {/* 2. THE THREE MASTER ALERT RULES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rule 1: Days Remaining */}
          <div className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <FaClock size={14} className="text-amber-600" />
              <span>Rule 1: Due Days Remaining</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Triggers when credit term days remaining are at or below this limit, or invoice has become overdue.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="60"
                value={form.daysRemainingThreshold}
                onChange={(e) =>
                  setForm({ ...form, daysRemainingThreshold: Number(e.target.value || 1) })
                }
                className="w-24 px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 text-center"
              />
              <span className="text-xs font-bold text-slate-700">Days Left</span>
            </div>
          </div>

          {/* Rule 2: Pending Invoices Count */}
          <div className="p-5 rounded-2xl border border-purple-200/90 bg-purple-50/40 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
              <FaFileInvoice size={14} className="text-purple-600" />
              <span>Rule 2: Pending Bills Count</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Triggers when customer has pending unpaid bills reaching or exceeding this threshold count.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="100"
                value={form.billCountThreshold}
                onChange={(e) =>
                  setForm({ ...form, billCountThreshold: Number(e.target.value || 1) })
                }
                className="w-24 px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 text-center"
              />
              <span className="text-xs font-bold text-slate-700">Invoices Cap</span>
            </div>
          </div>

          {/* Rule 3: Credit Limit Breach */}
          <div className="p-5 rounded-2xl border border-rose-200/90 bg-rose-50/40 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
              <FaCoins size={14} className="text-rose-600" />
              <span>Rule 3: Credit Limit Breach</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Triggers when total outstanding balance reaches or exceeds this percentage of customer&apos;s credit limit.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="50"
                max="150"
                value={form.creditLimitPercentage}
                onChange={(e) =>
                  setForm({ ...form, creditLimitPercentage: Number(e.target.value || 100) })
                }
                className="w-24 px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 text-center"
              />
              <span className="text-xs font-bold text-slate-700">% of Credit Limit</span>
            </div>
          </div>
        </div>

        {/* 3. AUTOMATED BACKGROUND SCHEDULER (DAEMON) */}
        <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
              <FaCalendarAlt size={16} className="text-indigo-600" />
              <span>Automated Background Scheduler Daemon</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.schedulerEnabled}
                onChange={(e) => setForm({ ...form, schedulerEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The daemon runs in the background on your schedule, automatically evaluates all accounts, and dispatches notices to matching customers.
          </p>

          {form.schedulerEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
              {/* Frequency Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Execution Schedule:
                </label>
                <select
                  value={form.scheduleFrequency}
                  onChange={(e) => setForm({ ...form, scheduleFrequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="every_15_mins">Every 15 Minutes (Testing / Real-time)</option>
                  <option value="hourly">Every 1 Hour</option>
                  <option value="every_6_hours">Every 6 Hours</option>
                  <option value="daily">Daily at Scheduled Time (09:00 AM - Recommended for Production)</option>
                </select>
              </div>

              {/* Dynamic Option based on Frequency */}
              {form.scheduleFrequency === "every_15_mins" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 block">
                    Real-Time Testing Mode:
                  </label>
                  <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      15-Minute Scan Active
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      24h spam cooldown is automatically bypassed so you can observe live alert delivery immediately.
                    </p>
                  </div>
                </div>
              ) : form.scheduleFrequency === "daily" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Daily Run Time:
                  </label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Spam Cooldown Window:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={form.cooldownHours}
                      onChange={(e) => setForm({ ...form, cooldownHours: Number(e.target.value || 24) })}
                      className="w-24 px-3 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-center"
                    />
                    <span className="text-xs text-slate-600">Hours per customer</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. ADMIN / NOTIFICATION RECIPIENT EMAIL */}
        <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs sm:text-sm">
              <FaEnvelope size={15} className="text-blue-600" />
              <span>Admin / Manager Alert Recipient (Your Gmail)</span>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Admin Monitoring Copy
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter your Gmail address if you want to receive an admin copy of alerts triggered by the scanner.
            <br />
            <strong className="text-slate-700">Note:</strong> If you leave this blank, alerts will only be delivered directly to the customers&apos; own registered emails.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="email"
              value={form.adminNotificationEmail}
              onChange={(e) => setForm({ ...form, adminNotificationEmail: e.target.value })}
              placeholder="Leave blank OR enter your Gmail (e.g. abhishek.mabsolinfotech@gmail.com)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-blue-300 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testingEmail || !form.adminNotificationEmail}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer shrink-0 shadow-sm"
            >
              {testingEmail ? (
                <>
                  <FaSpinner className="animate-spin" size={12} />
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane size={11} />
                  <span>Send Test Alert to My Gmail</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. DELIVERY CHANNELS */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-800 block">Automated Dispatch Channels:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email Channel */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <FaEnvelope size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto-Send Email</p>
                  <p className="text-[11px] text-slate-500">Via GoDaddy SMTP Server (Active)</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.autoDispatchEmail}
                onChange={(e) => setForm({ ...form, autoDispatchEmail: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* WhatsApp Channel */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <FaWhatsapp size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto-Send WhatsApp</p>
                  <p className="text-[11px] text-slate-500">Via Meta Cloud API Gateway</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.autoDispatchWhatsApp}
                onChange={(e) => setForm({ ...form, autoDispatchWhatsApp: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Credentials (Optional) */}
        {form.autoDispatchWhatsApp && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs animate-in fade-in">
            <p className="font-bold text-emerald-900">
              Meta WhatsApp Cloud API Credentials (For Automated Background Dispatch):
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">Meta Phone Number ID:</label>
              <input
                type="text"
                value={form.metaPhoneNumberId}
                onChange={(e) => setForm({ ...form, metaPhoneNumberId: e.target.value })}
                placeholder="Enter Meta 15-digit Phone Number ID"
                className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Scan Results Panel */}
        {scanResults && (
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 text-sm">
                Scan Results: {scanResults.alertsTriggered} Accounts Matched Rules
              </span>
              <span className="text-xs text-slate-400">
                Total Evaluated: {scanResults.scannedCount} accounts
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {scanResults.results?.map((res: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">{res.name}</p>
                    <p className="text-[11px] text-amber-300 mt-0.5">{res.triggers?.join(" • ")}</p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold shrink-0">
                    {res.channelsSent}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold text-white transition-all duration-200 shadow-md ${
              saving
                ? "bg-indigo-600/85 cursor-wait opacity-90 shadow-indigo-500/20"
                : saveSuccess
                ? "bg-emerald-600 shadow-emerald-500/25"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/25 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-95"
            }`}
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin text-white" size={14} />
                <span>Saving Master Rules & Updating Scheduler...</span>
              </>
            ) : saveSuccess ? (
              <>
                <FaCheckCircle size={14} className="text-white" />
                <span>Master Rules Saved Successfully!</span>
              </>
            ) : (
              <>
                <FaSave size={14} />
                <span>Save Master Rules & Update Scheduler</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

