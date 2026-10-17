"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { useUser } from "@/context/UserContext";
import {
  FaArrowLeft,
  FaCog,
  FaSave,
  FaPaperPlane,
  FaHourglassHalf,
  FaSkull,
  FaBolt,
  FaEnvelope,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUserCheck,
} from "react-icons/fa";

const defaults: any = {
  enabled: true,
  recipients: [],
  nearExpiry: { enabled: true, windowDays: 90, minStock: 1 },
  deadStock: { enabled: true, noMovementDays: 180, minStock: 1 },
  movement: {
    enabled: true,
    analysisDays: 30,
    fastStockCoverDays: 15,
    slowStockCoverDays: 60,
    minSalesQty: 1,
  },
  email: {
    enabled: true,
    frequency: "daily",
    sendHour: 9,
    sendMinute: 0,
    weeklyDay: 1,
    monthlyDay: 1,
    includeNearExpiry: true,
    includeDeadStock: true,
    includeFastMoving: true,
    includeSlowMoving: true,
  },
};

export default function InventoryAlertSettingsPage() {
  const params = useParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { user } = useUser();

  const [s, setS] = useState<any>(defaults);
  const [recipientsStr, setRecipientsStr] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const inputClass =
    "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20";

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (selectedCompany?._id) sp.set("companyId", selectedCompany._id);

      const r = await fetch(
        `/api/inventory-intelligence/settings?${sp.toString()}`,
      );
      const x = await r.json();
      if (x.success && x.settings) {
        const loggedInEmail = String(user?.email || x.adminEmail || "").trim().toLowerCase();
        let loadedRecs: string[] = Array.isArray(x.settings.recipients) ? x.settings.recipients : [];

        // If no recipients configured, or only the legacy test email 'abhishek.mabsolinfotech@gmail.com'
        if (
          (!loadedRecs.length ||
            (loadedRecs.length === 1 &&
              loadedRecs[0] === "abhishek.mabsolinfotech@gmail.com" &&
              loggedInEmail &&
              loggedInEmail !== "abhishek.mabsolinfotech@gmail.com")) &&
          loggedInEmail
        ) {
          loadedRecs = [loggedInEmail];
        }

        const merged = { ...defaults, ...x.settings, recipients: loadedRecs };
        setS(merged);
        setRecipientsStr(loadedRecs.join(", "));
        if (loggedInEmail) {
          setTestEmail(loggedInEmail);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?._id, user?.email]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const patch = (path: string, v: any) => {
    const [a, b] = path.split(".");
    setS((p: any) => ({ ...p, [a]: { ...p[a], [b]: v } }));
  };

  const handleUseLoginEmail = () => {
    const loginEmail = String(user?.email || "").trim().toLowerCase();
    if (!loginEmail) return;
    setRecipientsStr(loginEmail);
    setS((prev: any) => ({ ...prev, recipients: [loginEmail] }));
    setFeedback({
      type: "success",
      message: `Default recipient set to your login email: ${loginEmail}`,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const parsedRecipients = recipientsStr
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => x.includes("@"));

      const loginEmail = String(user?.email || "").trim().toLowerCase();
      const finalRecipients =
        parsedRecipients.length > 0
          ? [...new Set(parsedRecipients)]
          : loginEmail
          ? [loginEmail]
          : [];

      const payload = {
        ...s,
        recipients: finalRecipients,
        companyId: selectedCompany?._id,
      };

      const r = await fetch("/api/inventory-intelligence/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const x = await r.json();
      if (r.ok && x.success) {
        setS((prev: any) => ({ ...prev, recipients: finalRecipients }));
        setRecipientsStr(finalRecipients.join(", "));
        const timeStr = `${String(s.email.sendHour).padStart(2, "0")}:${String(s.email.sendMinute).padStart(2, "0")}`;
        setFeedback({
          type: "success",
          message: `Settings saved successfully! Automated alerts will be sent to [${finalRecipients.join(", ")}] on schedule (${s.email.frequency} at ${timeStr} IST).`,
        });
      } else {
        setFeedback({
          type: "error",
          message: x.error || "Failed to save settings",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to connect to server",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a test recipient email address.",
      });
      return;
    }

    setTesting(true);
    setFeedback(null);

    try {
      const r = await fetch("/api/inventory-intelligence/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_EMAIL",
          companyId: selectedCompany?._id,
          testRecipient: testEmail.trim(),
        }),
      });

      const x = await r.json();
      if (r.ok && x?.success === true) {
        setFeedback({
          type: "success",
          message:
            x?.message ||
            `Test alert report delivered successfully to ${testEmail}!`,
        });
      } else {
        const nestedError = Array.isArray(x?.results)
          ? x.results
              .map((i: any) => i?.error || i?.reason || i?.message)
              .filter(Boolean)
              .join(" | ")
          : "";
        const errorMsg =
          x?.error ||
          x?.reason ||
          x?.message ||
          nestedError ||
          `HTTP ${r.status}`;
        setFeedback({
          type: "error",
          message: `Test email failed: ${errorMsg}`,
        });
      }
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: `Test email failed: ${error?.message || "Connection error"}`,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
        <FaSyncAlt className="animate-spin text-indigo-500" />
        <span>Loading company intelligence settings...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${role}/inventory-intelligence`}
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-sm transition"
          >
            <FaArrowLeft size={13} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Inventory Intelligence Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                {selectedCompany?.companyName || "Company Scoped"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure expiry horizon, dead stock inactivity days, velocity
              thresholds and scheduled automated email reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-950/20 transition disabled:opacity-50"
          >
            <FaSave className={saving ? "animate-spin" : ""} />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 text-rose-800 dark:text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <FaCheckCircle />
          ) : (
            <FaExclamationTriangle />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Master Enablement */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm text-slate-800 dark:text-white">
              Master Module Control
            </h2>
            <p className="text-xs text-slate-500">
              When disabled, intelligence analysis and scheduled background
              email dispatches are suspended for this company.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!s.enabled}
              onChange={(e) => setS({ ...s, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </section>

      {/* Near Expiry Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FaHourglassHalf className="text-amber-500" />
          <h2 className="font-black text-sm text-slate-800 dark:text-white">
            Near Expiry Alert Rules
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="neEnabled"
              checked={s.nearExpiry.enabled}
              onChange={(e) => patch("nearExpiry.enabled", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label
              htmlFor="neEnabled"
              className="font-bold text-slate-700 dark:text-slate-300"
            >
              Enable Near Expiry Tracking
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Expiry Alert Window (Days Ahead):
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="3650"
              value={s.nearExpiry.windowDays}
              onChange={(e) =>
                patch(
                  "nearExpiry.windowDays",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Minimum Batch Stock:
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={s.nearExpiry.minStock}
              onChange={(e) =>
                patch(
                  "nearExpiry.minStock",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Dead Stock Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FaSkull className="text-rose-500" />
          <h2 className="font-black text-sm text-slate-800 dark:text-white">
            Dead & Dump Stock Rules
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="dsEnabled"
              checked={s.deadStock.enabled}
              onChange={(e) => patch("deadStock.enabled", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label
              htmlFor="dsEnabled"
              className="font-bold text-slate-700 dark:text-slate-300"
            >
              Enable Dead Stock Tracking
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              No Movement Period (Days Idle):
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="3650"
              value={s.deadStock.noMovementDays}
              onChange={(e) =>
                patch(
                  "deadStock.noMovementDays",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Minimum Product Stock:
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={s.deadStock.minStock}
              onChange={(e) =>
                patch("deadStock.minStock", Math.max(1, Number(e.target.value)))
              }
            />
          </div>
        </div>
      </section>

      {/* Fast & Slow Moving Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FaBolt className="text-emerald-500" />
          <h2 className="font-black text-sm text-slate-800 dark:text-white">
            Fast / Slow Moving Velocity Rules
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div className="flex items-center gap-2 md:col-span-1">
            <input
              type="checkbox"
              id="mvEnabled"
              checked={s.movement.enabled}
              onChange={(e) => patch("movement.enabled", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label
              htmlFor="mvEnabled"
              className="font-bold text-slate-700 dark:text-slate-300"
            >
              Enable Movement
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Analysis Days:
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="365"
              value={s.movement.analysisDays}
              onChange={(e) =>
                patch(
                  "movement.analysisDays",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Fast Cover ≤ Days:
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={s.movement.fastStockCoverDays}
              onChange={(e) =>
                patch(
                  "movement.fastStockCoverDays",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Slow Cover ≥ Days:
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={s.movement.slowStockCoverDays}
              onChange={(e) =>
                patch(
                  "movement.slowStockCoverDays",
                  Math.max(1, Number(e.target.value)),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Min Sales Qty:
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={s.movement.minSalesQty}
              onChange={(e) =>
                patch(
                  "movement.minSalesQty",
                  Math.max(0, Number(e.target.value)),
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Automated Email Schedule */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FaEnvelope className="text-indigo-500" />
          <h2 className="font-black text-sm text-slate-800 dark:text-white">
            Automated Scheduled Email Alert
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="emEnabled"
              checked={s.email.enabled}
              onChange={(e) => patch("email.enabled", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label
              htmlFor="emEnabled"
              className="font-bold text-slate-700 dark:text-slate-300"
            >
              Enable Auto Email
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Frequency:
            </label>
            <select
              className={inputClass}
              value={s.email.frequency}
              onChange={(e) => patch("email.frequency", e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Hour (0-23):
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="23"
              value={s.email.sendHour}
              onChange={(e) =>
                patch(
                  "email.sendHour",
                  Math.max(0, Math.min(23, Number(e.target.value))),
                )
              }
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              Minute (0-59):
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="59"
              value={s.email.sendMinute}
              onChange={(e) =>
                patch(
                  "email.sendMinute",
                  Math.max(0, Math.min(59, Number(e.target.value))),
                )
              }
            />
          </div>
        </div>

        {/* Recipients input */}
        <div className="space-y-1.5 text-xs pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Email Recipients (Comma separated):
            </label>
            {user?.email && (
              <button
                type="button"
                onClick={handleUseLoginEmail}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <FaUserCheck size={11} />
                <span>Use My Login Email ({user.email})</span>
              </button>
            )}
          </div>
          <input
            className={inputClass}
            placeholder="admin@company.com, owner@company.com"
            value={recipientsStr}
            onChange={(e) => setRecipientsStr(e.target.value)}
          />
          {/* <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Default me aapka login Admin email set rehta hai. Aap ise edit kar sakte hain ya comma (,) se alag karke multiple email addresses daal sakte hain. <b>Save Settings</b> karte hi background scheduler automatic time ke mutabik inhi emails par alert bhejega.
          </p> */}
        </div>

        {/* Categories to Include */}
        <div className="space-y-2 text-xs pt-1">
          <span className="block font-bold text-slate-600 dark:text-slate-400">
            Include Sections in Email Report:
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.email.includeNearExpiry}
                onChange={(e) =>
                  patch("email.includeNearExpiry", e.target.checked)
                }
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span>Near Expiry</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.email.includeDeadStock}
                onChange={(e) =>
                  patch("email.includeDeadStock", e.target.checked)
                }
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span>Dead Stock</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.email.includeFastMoving}
                onChange={(e) =>
                  patch("email.includeFastMoving", e.target.checked)
                }
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span>Fast Moving</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.email.includeSlowMoving}
                onChange={(e) =>
                  patch("email.includeSlowMoving", e.target.checked)
                }
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span>Slow Moving</span>
            </label>
          </div>
        </div>

        {/* Test Alert Dispatch Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-800 dark:text-white">
              Verify Email Dispatch
            </div>
            <p className="text-[11px] text-slate-500">
              Sends an instant full inventory intelligence summary report via
              configured SMTP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs w-56 bg-white dark:bg-slate-900 outline-none"
            />
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
            >
              <FaPaperPlane className={testing ? "animate-spin" : ""} />
              <span>{testing ? "Sending..." : "Send Test Alert"}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
