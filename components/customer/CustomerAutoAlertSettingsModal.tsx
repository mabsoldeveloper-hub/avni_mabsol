"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaCog,
  FaSave,
  FaPlay,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaEnvelope,
  FaWhatsapp,
  FaClock,
  FaFileInvoice,
  FaCoins,
  FaCalendarAlt,
  FaShieldAlt,
  FaPaperPlane,
} from "react-icons/fa";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CustomerAutoAlertSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setFeedback(null);
      setScanResults(null);
    }
  }, [isOpen]);

  const loadSettings = async () => {
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    const targetEmail = form.adminNotificationEmail?.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setFeedback({
        type: "error",
        message: "Please enter your Gmail / Admin email address first before sending a test email.",
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
        throw new Error(data.message || "Failed to deliver test email");
      }

      setFeedback({
        type: "success",
        message: `✅ Test email successfully delivered to ${targetEmail}! Please check your Gmail Inbox (or Spam folder).`,
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

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/customers/alert-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save settings");
      }

      setFeedback({
        type: "success",
        message: "Customer alert rules and automated background scheduler saved successfully!",
      });

      if (data.schedulerStatus) {
        setSchedulerStatus(data.schedulerStatus);
      }

      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "Error occurred while saving settings",
      });
    } finally {
      setSaving(false);
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
        message: `Auto-scan finished: ${data.scannedCount} customers evaluated, ${data.alertsTriggered} alerts triggered!`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "Error running auto-scan",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden my-6">
        {/* Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-700">
              <FaCog size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Customer Alert Rules & Background Scheduler
                </h3>
                {schedulerStatus?.isSchedulerRunning ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Daemon Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                    Daemon Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure automatic email alerts for Days Remaining, Pending Bills, and Credit Limit with automated background scheduler.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="p-5 max-h-[68vh] overflow-y-auto space-y-4">
            {feedback && (
              <div
                className={`flex items-center gap-2 p-3.5 rounded-2xl text-xs font-semibold animate-in fade-in ${
                  feedback.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {feedback.type === "success" ? (
                  <FaCheckCircle size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <FaExclamationTriangle size={14} className="text-rose-500 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Enable Automatic Customer Alerts</p>
                <p className="text-[11px] text-slate-500">
                  When enabled, customers crossing your thresholds will trigger alerts automatically.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {/* RULE 1: DAYS REMAINING THRESHOLD */}
            <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <FaClock size={13} className="text-amber-600" />
                <span>Rule 1: Days Remaining Alert Threshold</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block">
                    Alert Threshold (Days Remaining):
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Alert triggers when credit term days remaining are at or below this threshold.
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
            </div>

            {/* RULE 2: NUMBER OF BILLS THRESHOLD */}
            <div className="p-4 rounded-2xl border border-purple-200/80 bg-purple-50/40 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <FaFileInvoice size={13} className="text-purple-600" />
                <span>Rule 2: Pending Invoices Count Threshold</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block">
                    Invoice Count Threshold (Max Pending Bills):
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Alert triggers when pending invoice count reaches or exceeds this limit.
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
            </div>

            {/* RULE 3: CREDIT LIMIT BREACH THRESHOLD */}
            <div className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/40 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <FaCoins size={13} className="text-rose-600" />
                <span>Rule 3: Credit Limit Breach Threshold</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block">
                    Credit Limit Percentage (%):
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Alert triggers when outstanding balance reaches or exceeds this percentage of limit.
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                  <span className="text-xs font-bold text-slate-700">% of Limit</span>
                </div>
              </div>
            </div>

            {/* AUTOMATED BACKGROUND SCHEDULER SECTION */}
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <FaCalendarAlt size={14} className="text-indigo-600" />
                  <span>Automated Background Scheduler (Daemon)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.schedulerEnabled}
                    onChange={(e) => setForm({ ...form, schedulerEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                When active, the server runs in the background on your schedule, automatically evaluates all accounts, and dispatches email alerts to customers matching your thresholds.
              </p>

              {form.schedulerEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
                  {/* Frequency Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 block">
                      Execution Schedule:
                    </label>
                    <select
                      value={form.scheduleFrequency}
                      onChange={(e) => setForm({ ...form, scheduleFrequency: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="every_15_mins">Every 15 Minutes (Testing / Real-time)</option>
                      <option value="hourly">Every 1 Hour</option>
                      <option value="every_6_hours">Every 6 Hours</option>
                      <option value="daily">Daily at Scheduled Time (09:00 AM)</option>
                    </select>
                  </div>

                  {/* Scheduled Time or Cooldown or Real-time info */}
                  {form.scheduleFrequency === "every_15_mins" ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-800 block">
                        Real-Time Testing Mode:
                      </label>
                      <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-[11px] leading-tight">
                        <p className="font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          15-Minute Scan Active
                        </p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          24h spam cooldown is bypassed so test alerts arrive immediately.
                        </p>
                      </div>
                    </div>
                  ) : form.scheduleFrequency === "daily" ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 block">
                        Daily Run Time:
                      </label>
                      <input
                        type="time"
                        value={form.scheduledTime}
                        onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 block">
                        Spam Cooldown Window:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="72"
                          value={form.cooldownHours}
                          onChange={(e) => setForm({ ...form, cooldownHours: Number(e.target.value || 24) })}
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-center"
                        />
                        <span className="text-[11px] text-slate-600">Hours per customer</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ADMIN / NOTIFICATION RECIPIENT EMAIL SECTION */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <FaEnvelope size={13} className="text-blue-600" />
                  <span>Admin / Recipient Email for Alerts (Your Gmail)</span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Inbox Target
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Enter your Gmail address here. Whenever the scanner evaluates customers, a copy of the alert will be delivered directly to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  type="email"
                  value={form.adminNotificationEmail}
                  onChange={(e) => setForm({ ...form, adminNotificationEmail: e.target.value })}
                  placeholder="e.g. director@yourpharmacy.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-blue-300 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testingEmail || !form.adminNotificationEmail}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer shrink-0 shadow-sm"
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
              <p className="text-[10px] text-slate-500">
                ⚡ Click &quot;Send Test Alert to My Gmail&quot; to verify GoDaddy SMTP delivery directly to your inbox immediately.
              </p>
            </div>

            {/* AUTOMATIC DISPATCH CHANNELS */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-800">Auto Delivery Channels:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Channel */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-indigo-600" size={14} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Auto-Send Email</p>
                      <p className="text-[10px] text-slate-400">Via GoDaddy SMTP (Active)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.autoDispatchEmail}
                    onChange={(e) => setForm({ ...form, autoDispatchEmail: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* WhatsApp Channel */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <FaWhatsapp className="text-emerald-600" size={15} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Auto-Send WhatsApp</p>
                      <p className="text-[10px] text-slate-400">Via Meta Cloud API</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.autoDispatchWhatsApp}
                    onChange={(e) => setForm({ ...form, autoDispatchWhatsApp: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Cloud API Credentials (Optional) */}
            {form.autoDispatchWhatsApp && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs animate-in fade-in">
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
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Scan Results Panel */}
            {scanResults && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-emerald-400">
                    Scan Results: {scanResults.alertsTriggered} Accounts Match Rules
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Checked {scanResults.scannedCount} Total Accounts
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {scanResults.results?.map((res: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-200">{res.name}</p>
                        <p className="text-[10px] text-amber-300">{res.triggers?.join(" • ")}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold shrink-0">
                        {res.channelsSent}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={handleRunScan}
              disabled={scanning || saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200 transition cursor-pointer"
            >
              {scanning ? (
                <>
                  <FaSpinner className="animate-spin" size={12} />
                  <span>Evaluating Customers...</span>
                </>
              ) : (
                <>
                  <FaPlay size={10} />
                  <span>Test & Run Auto-Scan Now</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaSave size={12} />
                    <span>Save Rules & Start Scheduler</span>
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
