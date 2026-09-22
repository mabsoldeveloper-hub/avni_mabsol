"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Key, RefreshCw, Mail, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export interface LogItem {
  _id: string;
  action?: string;
  tableName?: string;
  status?: string;
  message?: string;
  error?: string;
  createdAt?: string | Date;
}

interface SyncActivityLogsProps {
  logs: LogItem[];
  userEmail?: string;
  currentSystemId: string;
  range: string;
  startDate?: string;
  endDate?: string;
  rangeOptions: readonly string[];
  isAdmin?: boolean;
}

function formatDate(value?: Date | string) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const rangeLabels: Record<string, string> = {
  all: "All time",
  day: "Today",
  week: "This week",
  month: "This month",
};

function formatAction(action?: string): string {
  if (!action) return "sync";
  return action
    .replace(/dbf_to_crm/gi, "crm_sync")
    .replace(/_dbf/gi, "")
    .replace(/dbf_/gi, "")
    .replace(/dbf/gi, "data");
}

function cleanTableName(tableName?: string): string {
  if (!tableName) return "";
  return tableName.replace(/\.dbf$/i, "").trim();
}

function sanitizeLogMessage(text?: string, rawTableName?: string, isUnlocked?: boolean): string {
  if (!text) return "";

  let result = text;

  // 1. If locked, mask the target table name if present
  if (!isUnlocked && rawTableName && rawTableName.trim()) {
    const raw = rawTableName.trim();
    const clean = raw.replace(/\.dbf$/i, "").trim();

    const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escapedRaw, "gi"), "••••••••");

    if (clean.length > 0) {
      const escapedClean = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escapedClean, "gi"), "••••••••");
    }
  }

  // 2. If locked, mask any remaining file or uppercase table identifiers
  if (!isUnlocked) {
    result = result.replace(/\b[A-Za-z0-9_.-]+\.(?:dbf|DBF)\b/gi, "••••••••");
    result = result.replace(/\b[A-Z0-9_]{4,}\b(?=\s*\.{3}|\s+table|\s+file)/g, "••••••••");
  }

  // 3. Remove .DBF / .dbf extensions completely everywhere
  result = result.replace(/\.(?:dbf|DBF)\b/gi, "");

  // 4. Clean up any leftover masked extensions (e.g. ••••••••.DBF -> ••••••••)
  result = result.replace(/••••••••\.(?:dbf|DBF)/gi, "••••••••");

  // 5. Remove or replace the word "DBF" completely
  result = result
    .replace(/\bDBF\s+table\(s\)/gi, "table(s)")
    .replace(/\bDBF\s+table/gi, "table")
    .replace(/\bDBF\s+sync/gi, "data sync")
    .replace(/\bserver\s+DBF\s+sync/gi, "server data sync")
    .replace(/\bDBF\b/gi, "data")
    .replace(/\bdbf\b/gi, "data");

  // 6. Clean up spacing
  result = result.replace(/\s{2,}/g, " ").trim();

  return result;
}

export default function SyncActivityLogs({
  logs,
  userEmail = "",
  currentSystemId,
  range,
  startDate,
  endDate,
  rangeOptions,
  isAdmin = true,
}: SyncActivityLogsProps) {
  // Guard: only admin can view logs
  if (!isAdmin) {
    return null;
  }

  const router = useRouter();
  const { toast } = useToast();

  const [refreshing, setRefreshing] = useState(false);

  // OTP file / table name unlock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedRemainingSec, setUnlockedRemainingSec] = useState(0);

  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<"send" | "verify">("send");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpModalMsg, setOtpModalMsg] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({
    type: "",
    text: "",
  });
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check sessionStorage on mount
  useEffect(() => {
    const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
    const storedUntil = sessionStorage.getItem(storageKey);
    if (storedUntil) {
      const remainingMs = Number(storedUntil) - Date.now();
      if (remainingMs > 0) {
        setIsUnlocked(true);
        setUnlockedRemainingSec(Math.ceil(remainingMs / 1000));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [userEmail]);

  // Sync across tabs & components (VfpSyncActions <-> SyncActivityLogs)
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvt = e as CustomEvent<{ unlocked: boolean; expiresAt?: number }>;
      if (customEvt.detail?.unlocked) {
        setIsUnlocked(true);
        if (customEvt.detail.expiresAt) {
          setUnlockedRemainingSec(Math.max(0, Math.ceil((customEvt.detail.expiresAt - Date.now()) / 1000)));
        }
      } else {
        setIsUnlocked(false);
        setUnlockedRemainingSec(0);
      }
    };

    window.addEventListener("vfp_files_unlock_sync", handleSync);
    return () => window.removeEventListener("vfp_files_unlock_sync", handleSync);
  }, []);

  // 1s countdown timer
  useEffect(() => {
    if (!isUnlocked || unlockedRemainingSec <= 0) return;

    const timer = setInterval(() => {
      setUnlockedRemainingSec((prev) => {
        if (prev <= 1) {
          setIsUnlocked(false);
          const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
          sessionStorage.removeItem(storageKey);
          window.dispatchEvent(new CustomEvent("vfp_files_unlock_sync", { detail: { unlocked: false } }));
          toast.info("🔒 5-minute view period expired. Table names have been hidden.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isUnlocked, unlockedRemainingSec, userEmail, toast]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOpenOtpModal = () => {
    setShowOtpModal(true);
    setOtpStep("send");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpValue("");
    setOtpModalMsg({ type: "", text: "" });
  };

  const handleSendOtpCode = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    setOtpModalMsg({ type: "info", text: `Sending 6-digit verification code to ${userEmail || "your email"}...` });

    try {
      const res = await fetch("/api/mabsolcrmsync/send-otp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setOtpStep("verify");
        const msg = data.message || `Verification code sent to ${userEmail}`;
        setOtpModalMsg({ type: "success", text: msg });
        toast.success(msg);
        setResendCooldown(30);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        const errMsg = data.message || "Failed to send verification code.";
        setOtpModalMsg({ type: "error", text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "Error sending verification code.";
      setOtpModalMsg({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setOtpModalMsg({ type: "info", text: "Resending code..." });

    try {
      const res = await fetch("/api/mabsolcrmsync/send-otp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setOtpModalMsg({ type: "success", text: data.message || "New OTP code sent!" });
        toast.success("New OTP code sent!");
        setResendCooldown(30);
      } else {
        setOtpModalMsg({ type: "error", text: data.message || "Failed to resend code." });
      }
    } catch {
      setOtpModalMsg({ type: "error", text: "Error resending code." });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setOtpValue(newDigits.join(""));

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newDigits = ["", "", "", "", "", ""];
      pasted.split("").forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      setOtpValue(newDigits.join(""));
      const focusIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpValue || otpValue.trim().length === 0) {
      setOtpModalMsg({ type: "error", text: "Please enter the 6-digit verification code." });
      return;
    }

    setVerifyingOtp(true);
    setOtpModalMsg({ type: "info", text: "Verifying code..." });

    try {
      const res = await fetch("/api/mabsolcrmsync/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        const unlockMs = 5 * 60 * 1000;
        const expiresAt = Date.now() + unlockMs;
        const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
        sessionStorage.setItem(storageKey, String(expiresAt));

        setIsUnlocked(true);
        setUnlockedRemainingSec(300);
        setShowOtpModal(false);
        window.dispatchEvent(new CustomEvent("vfp_files_unlock_sync", { detail: { unlocked: true, expiresAt } }));
        toast.success("🔓 Verified! Table names visible for 5 minutes.");
      } else {
        const errMsg = data.message || "Invalid verification code.";
        setOtpModalMsg({ type: "error", text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      setOtpModalMsg({ type: "error", text: "Verification request failed." });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLockNow = () => {
    setIsUnlocked(false);
    setUnlockedRemainingSec(0);
    const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
    sessionStorage.removeItem(storageKey);
    window.dispatchEvent(new CustomEvent("vfp_files_unlock_sync", { detail: { unlocked: false } }));
    toast.info("🔒 Table names hidden.");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div
      className="bg-white border border-slate-200/90 shadow-2xs overflow-hidden w-full max-w-full box-border"
      style={{ borderRadius: "18px" }}
    >
      {/* Logs Card Header - Clean & Tight */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 gap-2.5 w-full box-border">
        <div>
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-700">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
            </svg>
            <span>Sync Activity Logs</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Filter and review CRM data transfer logs
          </span>
        </div>

        {/* Header Right: OTP Lock/Unlock Status & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isUnlocked ? (
            <button
              type="button"
              onClick={handleOpenOtpModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-full transition-colors cursor-pointer"
              title="Verify OTP to reveal table names"
            >
              <Lock size={12} className="text-teal-600" />
              <span>Names masked · Verify OTP to view</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full">
              <Unlock size={12} className="text-emerald-600 shrink-0" />
              <span>Visible ({formatCountdown(unlockedRemainingSec)})</span>
              <button
                type="button"
                onClick={handleLockNow}
                className="ml-1 text-emerald-800 hover:text-emerald-950 underline font-bold text-[10px] cursor-pointer"
                title="Hide table names now"
              >
                Hide
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={12} className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar - Compact, Flush & Clean */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between px-4 py-2 sm:px-5 sm:py-2.5 border-b border-slate-100 gap-2.5 w-full box-border bg-slate-50/40">
        {/* Range Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {rangeOptions.map((option) => (
            <Link
              key={option}
              className={`text-[11px] font-bold px-3 py-1 border transition-all whitespace-nowrap inline-flex items-center ${
                range === option && !startDate && !endDate
                  ? "bg-black border-black text-white shadow-2xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
              style={{ borderRadius: "9999px" }}
              href={`/dashboard/mabsolcrmsync?source=${currentSystemId}&range=${option}`}
            >
              {rangeLabels[option] || option}
            </Link>
          ))}
        </div>

        {/* Date Filter Form */}
        <form className="flex items-center gap-1.5 flex-wrap flex-1 lg:flex-initial" method="get">
          <input type="hidden" name="source" value={currentSystemId} />
          <div
            className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 shadow-2xs flex-1 sm:flex-initial"
            style={{ borderRadius: "9999px" }}
          >
            <input
              className="font-mono text-[11px] text-slate-800 bg-transparent outline-none w-full"
              type="date"
              name="startDate"
              defaultValue={startDate || ""}
              placeholder="mm/dd/yyyy"
            />
          </div>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">to</span>
          <div
            className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 shadow-2xs flex-1 sm:flex-initial"
            style={{ borderRadius: "9999px" }}
          >
            <input
              className="font-mono text-[11px] text-slate-800 bg-transparent outline-none w-full"
              type="date"
              name="endDate"
              defaultValue={endDate || ""}
              placeholder="mm/dd/yyyy"
            />
          </div>

          <button
            className="px-3.5 py-1 text-[11px] font-bold bg-black text-white hover:bg-slate-900 transition-all cursor-pointer whitespace-nowrap shadow-2xs ml-0.5"
            style={{ borderRadius: "9999px" }}
            type="submit"
          >
            Apply
          </button>
          <Link
            href={`/dashboard/mabsolcrmsync?source=${currentSystemId}`}
            className="px-3 py-1 text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            style={{ borderRadius: "9999px" }}
          >
            Reset
          </Link>
        </form>
      </div>

      {/* Short & Clean Logs List (Max-height reduced to 280px for a clean compact view) */}
      <div className="max-h-[280px] overflow-y-auto w-full box-border divide-y divide-slate-100" id="log-list">
        {logs.length === 0 ? (
          <div
            className="text-center py-8 px-4 text-xs text-slate-400 bg-slate-50/30 m-3 border border-dashed border-slate-200 font-medium"
            style={{ borderRadius: "12px" }}
          >
            No sync activity logs found.
          </div>
        ) : (
          logs.map((log) => {
            const logStatus = (log.status || "unknown").toLowerCase();
            const isSuccess = logStatus === "success";
            const isRunning = logStatus === "running";

            const cleanName = cleanTableName(log.tableName);
            const displayedTableName = cleanName
              ? isUnlocked
                ? cleanName
                : "••••••••"
              : null;

            const rawDescription = log.message || log.error || "No description logged.";
            const displayedMessage = sanitizeLogMessage(rawDescription, log.tableName, isUnlocked);
            const displayedAction = formatAction(log.action);

            return (
              <div
                key={String(log._id)}
                className="px-4 py-2 sm:px-5 sm:py-2.5 hover:bg-slate-50/60 transition-colors bg-white flex flex-col sm:flex-row sm:items-start justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  {/* Top line: Action, Table name & Status badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {displayedAction}
                    </span>

                    {displayedTableName && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                        {!isUnlocked && <Lock size={9} className="text-teal-600" />}
                        {displayedTableName}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 border ${
                        isSuccess
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          : isRunning
                            ? "bg-sky-50 text-sky-700 border-sky-200/80"
                            : "bg-red-50 text-red-700 border-red-200/80"
                      }`}
                      style={{ borderRadius: "9999px" }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSuccess ? "bg-emerald-500" : isRunning ? "bg-sky-500 animate-pulse" : "bg-red-500"
                        }`}
                      />
                      {log.status ? log.status.toUpperCase() : "UNKNOWN"}
                    </span>
                  </div>

                  {/* Second line: Log Message */}
                  <div className="text-[11px] text-slate-500 font-mono break-words leading-relaxed">
                    {displayedMessage}
                  </div>
                </div>

                {/* Right side timestamp */}
                <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0 sm:pt-0.5">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* OTP MODAL */}
      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl border border-slate-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Teal Square Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-teal-700 text-white shadow-xs">
              {otpStep === "send" ? <Mail size={18} /> : <Key size={18} />}
            </div>

            {/* Title */}
            <h2 className="text-base font-bold text-slate-900 mb-1 leading-snug">
              {otpStep === "send" ? "Verify email to view table names" : "Enter verification code"}
            </h2>

            {/* Step progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <div className="w-5 h-1 rounded-full bg-teal-700" />
                <div className={`w-5 h-1 rounded-full transition-all ${otpStep === "verify" ? "bg-teal-700" : "bg-slate-200"}`} />
              </div>
              <span className="text-[11px] text-slate-500">
                Step <strong className="text-slate-700">{otpStep === "send" ? "1" : "2"}</strong> of 2 · {otpStep === "send" ? "Confirm email" : "Enter 6-digit code"}
              </span>
            </div>

            {/* STEP 1: SEND OTP */}
            {otpStep === "send" ? (
              <>
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mail size={12} className="text-teal-700" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
                      Security Verification
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-teal-100 rounded-lg px-2.5 py-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-teal-50 text-teal-700 border border-teal-200">
                      {(userEmail || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-800 truncate flex-1">
                      {userEmail || "your@email.com"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 bg-teal-50 text-teal-700 border-teal-200">
                      ✓ Ready
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    We will send a 6-digit verification code to your email to unlock table details.
                  </p>
                </div>

                <div className="flex items-stretch gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 min-h-[40px] text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={handleSendOtpCode}
                    className="flex-1 min-h-[40px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all cursor-pointer rounded-full shadow-xs disabled:opacity-50"
                  >
                    {sendingOtp ? "Sending code..." : "Send Verification Code"}
                  </button>
                </div>
              </>
            ) : (
              /* STEP 2: ENTER OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the 6-digit code sent to <strong className="text-slate-800">{userEmail}</strong>:
                </p>

                {/* 6 Digits input boxes */}
                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-bold font-mono border-2 border-slate-200 rounded-xl focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
                    />
                  ))}
                </div>

                {otpModalMsg.text && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium ${
                      otpModalMsg.type === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-teal-50 text-teal-700 border border-teal-200"
                    }`}
                  >
                    {otpModalMsg.text}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || sendingOtp}
                    onClick={handleResendOtp}
                    className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer disabled:text-slate-400"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpStep("send")}
                    className="text-slate-500 hover:text-slate-700 text-[11px]"
                  >
                    Change email
                  </button>
                </div>

                <div className="flex items-stretch gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 min-h-[40px] text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingOtp || otpValue.length < 6}
                    className="flex-1 min-h-[40px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all cursor-pointer rounded-full shadow-xs disabled:opacity-50"
                  >
                    {verifyingOtp ? "Verifying..." : "Verify & Unlock"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
