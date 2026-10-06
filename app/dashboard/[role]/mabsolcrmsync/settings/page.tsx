"use client";

import { useEffect, useState, useRef } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { useToast } from "@/context/ToastContext";
import "./vfp-settings.css";
import {
  Download,
  Copy,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  Monitor,
  RotateCw,
  Lock,
  AppWindow,
  FileCode2,
  Trash2,
  Laptop,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

interface AuthorizedDevice {
  deviceId: string;
  fullDeviceId: string;
  deviceName: string;
  licenseKey: string;
  activationEmail?: string;
  activatedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  status: string;
  isExpired: boolean;
  daysRemaining: number;
}

interface LicenseDetails {
  license: string;
  licenseExpiresAt: string | null;
  licenseIssuedAt: string | null;
  isExpired: boolean;
  daysRemaining: number;
  boundDeviceId: string;
  boundDeviceName: string;
  isBound: boolean;
  authorizedDevices?: AuthorizedDevice[];
  companyName?: string;
  companyCode?: string;
}

export default function VfpSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [agentPinInput, setAgentPinInput] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Debouncing refs to prevent multiple simultaneous / duplicate API calls in console terminal
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // License Details State
  const [licenseInfo, setLicenseInfo] = useState<LicenseDetails>({
    license: "",
    licenseExpiresAt: null,
    licenseIssuedAt: null,
    isExpired: false,
    daysRemaining: 0,
    boundDeviceId: "",
    boundDeviceName: "",
    isBound: false,
  });

  // Live countdown timer state (Days, Hours, Minutes, Seconds)
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formatted: "--",
    isExpired: false,
  });

  // Ticking 1-second countdown calculation
  useEffect(() => {
    const calcCountdown = () => {
      if (!licenseInfo.licenseExpiresAt || !licenseInfo.license) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "--", isExpired: false });
        return;
      }
      const target = new Date(licenseInfo.licenseExpiresAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "Expired", isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => String(n).padStart(2, "0");
      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        formatted: `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
        isExpired: false,
      });
    };

    calcCountdown();
    const timer = setInterval(calcCountdown, 1000);
    return () => clearInterval(timer);
  }, [licenseInfo.licenseExpiresAt, licenseInfo.license]);

  const loadLicense = async (force = false) => {
    const now = Date.now();
    // Throttle duplicate calls: ignore if already running or called within 3.5s unless explicitly forced
    if (!force && (isFetchingRef.current || now - lastFetchTimeRef.current < 3500)) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    try {
      setLoading(true);
      const res = await fetch("/api/mabsolcrmsync/license");
      const data = await res.json();
      if (data.success) {
        setLicenseInfo(data);
      }
    } catch (err) {
      console.error("Failed to load license details:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadLicense(true);
    // Poll gently every 20 seconds; window focus listener removed to stop console spamming
    const interval = setInterval(() => loadLicense(false), 20000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleRevokeDevice = async (deviceId: string, devName: string, devKey?: string) => {
    if (!confirm(`Are you sure you want to unlink machine "${devName}"? It will be disconnected from its license key and require re-linking.`)) {
      return;
    }
    setRevokingDeviceId(deviceId);
    try {
      const res = await fetch("/api/mabsolcrmsync/license/revoke-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, licenseKey: devKey || licenseInfo.license }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Access revoked for ${devName}.`);
        await loadLicense(true);
      } else {
        toast.error(data.error || "Failed to unlink machine.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleGenerateLicenseKey = async () => {
    try {
      setGeneratingKey(true);
      const res = await fetch("/api/mabsolcrmsync/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "New 30-day license key generated!");
        await loadLicense(true);
      } else {
        toast.error(data.error || "Failed to generate license key.");
      }
    } catch {
      toast.error("Error generating license key.");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopyLicenseKey = () => {
    const keyToCopy = licenseInfo.license;
    if (!keyToCopy) return;
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(true);
    toast.success("License key copied!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const handleVerifyAgentPin = async () => {
    const cleanPin = agentPinInput.trim().replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      toast.error("Please enter the complete 6-digit PIN from your Desktop Agent.");
      return;
    }
    try {
      setVerifyingPin(true);
      const res = await fetch("/api/mabsolcrmsync/license/agent-pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Desktop Agent authorized successfully!`);
        setAgentPinInput("");
        await loadLicense(true);
      } else {
        toast.error(data.error || "Failed to verify PIN.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error verifying PIN.");
    } finally {
      setVerifyingPin(false);
    }
  };

  const isKeyActive = Boolean(licenseInfo.license && !licenseInfo.isExpired);
  const daysLeft = licenseInfo.daysRemaining || 0;
  const percent = Math.min(100, Math.max(0, Math.round((daysLeft / 30) * 100)));

  return (
    <ProtectedPage permission="vfp.settings">
      <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 space-y-3 text-slate-800 font-sans">
        
        {/* BREADCRUMB */}
        <div className="text-[11.5px] text-slate-500 font-medium px-1">
          Workspace <span className="text-slate-400">/</span> <span className="text-slate-700 font-semibold">Desktop Sync</span>
        </div>

        {/* COMPACT TOP HEADER CARD */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs py-2.5 px-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Monitor size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 m-0">
                Desktop sync setup & licensing
              </h1>
              <p className="text-[11.5px] text-slate-500 m-0">
                Activate your Windows sync client in a few guided steps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => loadLicense(true)}
              title="Refresh"
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>

            <a
              href="/api/mabsolcrmsync/download-agent?type=zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>Download agent (.ZIP)</span>
            </a>
          </div>
        </div>

        {/* LINK DESKTOP AGENT VIA 6-DIGIT PIN CARD */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-xl p-4 sm:p-5 text-white shadow-md border border-indigo-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
                  <KeyRound size={18} />
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white m-0">
                  Link Desktop Agent via 6-Digit PIN
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Instant Authorization
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl m-0 leading-relaxed">
                Enter the random 6-digit PIN generated inside your Desktop Agent (.exe). This will bind that computer to your organization's license cycle and activate syncing instantly.
              </p>
            </div>

            {/* PIN Input and Verify Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={agentPinInput}
                  onChange={(e) => setAgentPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && agentPinInput.trim().length === 6) {
                      handleVerifyAgentPin();
                    }
                  }}
                  className="w-full sm:w-44 text-center font-mono text-xl tracking-[0.3em] font-bold bg-white/10 text-white placeholder-white/30 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyAgentPin}
                disabled={verifyingPin || agentPinInput.length !== 6}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={14} className={verifyingPin ? "animate-spin" : ""} />
                <span>{verifyingPin ? "Verifying PIN..." : "Verify & Generate License"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN GRID (NO EXCESSIVE GAPS OR PADDING) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
          
          {/* LEFT CARD: AGENT LICENSE KEY */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
            
            {/* Card Header with Status Pill */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0 whitespace-nowrap">
                  Agent license key
                </h2>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  30-day single-device term
                </p>
              </div>

              {isKeyActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0 font-mono shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active • {countdown.formatted}</span>
                </span>
              ) : licenseInfo.isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60 shrink-0">
                  <AlertCircle size={11} />
                  <span>Expired</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                  <span>No Key</span>
                </span>
              )}
            </div>

            {/* License Key Box */}
            <div className="bg-slate-50/80 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  Active key token
                </span>
                <button
                  type="button"
                  onClick={handleCopyLicenseKey}
                  disabled={!licenseInfo.license}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copiedKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="font-mono text-sm sm:text-base font-bold text-slate-900 tracking-wider select-all">
                {licenseInfo.license || "No license generated"}
              </div>

              {/* Dynamic Company Details Badge (filters out legacy static strings) */}
              {licenseInfo.companyName &&
                licenseInfo.companyName.toLowerCase() !== "" &&
                licenseInfo.companyName.toLowerCase() !== "" && (
                <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/70 rounded-md px-2.5 py-1.5 text-xs text-blue-900">
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldCheck size={13} className="text-blue-600 shrink-0" />
                    <span className="text-[11px] text-slate-500">Company:</span>
                    <strong className="text-slate-900 font-semibold truncate">{licenseInfo.companyName}</strong>
                  </div>
                  {licenseInfo.companyCode &&
                    licenseInfo.companyCode.toUpperCase() !== "DEFAULT" && (
                    <span className="font-mono text-[10.5px] bg-white border border-blue-200 text-blue-700 font-bold px-1.5 py-0.5 rounded shrink-0 ml-2">
                      {licenseInfo.companyCode}
                    </span>
                  )}
                </div>
              )}

              {/* Validity Term & Live Countdown Timer */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Live countdown</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {isKeyActive ? `${countdown.formatted} remaining` : (licenseInfo.isExpired ? "Term Expired" : "Not Active")}
                  </span>
                </div>

                {isKeyActive && (
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-white rounded-md border border-slate-200/90 py-1.5 px-1 text-center shadow-2xs">
                      <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-none">
                        {countdown.days}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        Days
                      </div>
                    </div>
                    <div className="bg-white rounded-md border border-slate-200/90 py-1.5 px-1 text-center shadow-2xs">
                      <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-none">
                        {String(countdown.hours).padStart(2, "0")}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        Hours
                      </div>
                    </div>
                    <div className="bg-white rounded-md border border-slate-200/90 py-1.5 px-1 text-center shadow-2xs">
                      <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-none">
                        {String(countdown.minutes).padStart(2, "0")}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        Mins
                      </div>
                    </div>
                    <div className="bg-white rounded-md border border-slate-200/90 py-1.5 px-1 text-center shadow-2xs">
                      <div className="text-sm sm:text-base font-black font-mono text-blue-600 leading-none">
                        {String(countdown.seconds).padStart(2, "0")}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        Secs
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span>30-Day Cycle Progress</span>
                    <span>{daysLeft} days of 30 ({percent}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Metadata Boxes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg border border-slate-200/80 p-2 sm:p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-slate-500 font-medium text-[10.5px]">
                  <Clock size={11} className="text-slate-400" />
                  <span>Expires on</span>
                </div>
                <span className="font-bold text-slate-900 text-[12px] block">
                  {formatDate(licenseInfo.licenseExpiresAt)}
                </span>
              </div>

              <div className="bg-white rounded-lg border border-slate-200/80 p-2 sm:p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-slate-500 font-medium text-[10.5px]">
                  <Lock size={11} className="text-slate-400" />
                  <span>Hardware binding</span>
                </div>
                <span className="font-bold text-slate-900 text-[12px] block truncate">
                  {licenseInfo.isBound
                    ? (licenseInfo.boundDeviceName || "Machine Bound")
                    : "Ready for 1st device"}
                </span>
              </div>
            </div>

            {/* Amber Lock Banner / Action */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-amber-900">
                <Lock size={13} className="text-amber-700 shrink-0" />
                <span>
                  {isKeyActive
                    ? `Key is active for ${daysLeft} more days. Attached workstations can be unlinked individually below.`
                    : licenseInfo.isExpired
                    ? "Key expired. Click below to generate a new 30-day key."
                    : "Generate an initial 30-day single-device key."}
                </span>
              </div>

              {isKeyActive ? (
                <span className="inline-block bg-white border border-amber-300/80 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded shadow-3xs">
                  Active &amp; Bound
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateLicenseKey}
                  disabled={generatingKey}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={11} className={generatingKey ? "animate-spin" : ""} />
                  <span>{generatingKey ? "Generating..." : "Generate Key"}</span>
                </button>
              )}
            </div>

            {/* Multi-Device Sync Authorized Machines */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Laptop size={14} className="text-blue-600" />
                  <span>Attached &amp; Logged-in Devices</span>
                  <span className="ml-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {licenseInfo.authorizedDevices?.length || (licenseInfo.isBound ? 1 : 0)} Machines Using this Key
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    Multi-Device Sync Enabled
                  </span>
                </div>
              </div>

              {licenseInfo.authorizedDevices && licenseInfo.authorizedDevices.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {licenseInfo.authorizedDevices.map((dev, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/90 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs hover:border-blue-300 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <Monitor size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{dev.deviceName}</span>
                            <span className={`text-[9.5px] px-2 py-0.5 rounded font-semibold ${dev.isExpired ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {dev.isExpired ? 'Expired' : `${dev.daysRemaining} days left`}
                            </span>
                          </div>
                          {dev.activationEmail && (
                            <div className="text-[11px] text-blue-800 bg-blue-50/80 border border-blue-200/70 rounded px-1.5 py-0.5 mt-0.5 inline-flex items-center gap-1 font-medium">
                              <span>👤 Attached User: <strong>{dev.activationEmail}</strong></span>
                            </div>
                          )}
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>ID: <strong className="text-slate-700">{dev.deviceId || dev.fullDeviceId?.substring(0, 8)}</strong></span>
                            <span>•</span>
                            <span>Key: <strong className="text-emerald-600 font-semibold">{dev.licenseKey || licenseInfo.license}</strong></span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            {dev.lastSeenAt ? `Last active: ${new Date(dev.lastSeenAt).toLocaleString()}` : 'Authorized & Ready'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(dev.fullDeviceId || dev.deviceId, dev.deviceName, dev.licenseKey)}
                          disabled={revokingDeviceId === (dev.fullDeviceId || dev.deviceId)}
                          title="Unlink this machine from its license key"
                          className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          <span>{revokingDeviceId === (dev.fullDeviceId || dev.deviceId) ? "Revoking..." : "Unlink"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 bg-white border border-slate-200/80 rounded-md p-2.5 text-center">
                  {licenseInfo.isBound
                    ? `Primary Machine: ${licenseInfo.boundDeviceName || "Bound"}`
                    : "No machines attached yet. Start the Desktop EXE on any computer to link and sync."}
                </div>
              )}

              <div className="bg-blue-50/70 border border-blue-200/80 rounded-md p-2 text-[10.5px] text-blue-900 leading-relaxed">
                💡 <strong>Sync across multiple computers:</strong> Any user with your account email can use this same license key on multiple PCs. Opening the Desktop EXE on another computer will prompt for a 6-digit OTP code sent to your email to verify and authorize the new machine.
              </div>
            </div>

            {/* Policy disclaimer */}
            <p className="text-[10.5px] text-slate-400 leading-normal m-0 pt-0.5">
              Security Policy: Verified computers share your sync license. You can unlink any machine at any time above.
            </p>
          </div>

          {/* RIGHT CARD: WINDOWS DESKTOP AGENT */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
            
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0 whitespace-nowrap">
                Windows desktop agent
              </h2>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                v1.0.0 (x64)
              </span>
            </div>

            {/* Download Option 1: Portable Client (ZIP - Recommended) */}
            <div className="rounded-lg border-2 border-blue-500/80 bg-blue-50/20 p-2.5 sm:p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-white border border-blue-200 flex items-center justify-center text-slate-700 shrink-0">
                  <AppWindow size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900">
                      Portable client (.ZIP)
                    </strong>
                    <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      Recommended
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Clean download • No Chrome warning • 76.3 MB
                  </span>
                </div>
              </div>

              <a
                href="/api/mabsolcrmsync/download-agent?type=zip"
                title="Download Portable ZIP"
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
              >
                <Download size={14} />
              </a>
            </div>

            {/* Download Option 2: Direct Standalone EXE */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <AppWindow size={16} />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                    Direct portable (.EXE)
                  </strong>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Standalone executable without ZIP • 76.4 MB
                  </span>
                </div>
              </div>

              <a
                href="/api/mabsolcrmsync/download-agent?type=portable"
                title="Download Portable EXE"
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                <Download size={14} />
              </a>
            </div>

            {/* Download Option 3: Windows Installer */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <FileCode2 size={16} />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                    Windows installer
                  </strong>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Setup with Start Menu shortcut • 76.6 MB
                  </span>
                </div>
              </div>

              <a
                href="/api/mabsolcrmsync/download-agent?type=setup"
                title="Download Setup EXE"
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                <Download size={14} />
              </a>
            </div>

            {/* Quick Setup Stepper */}
            <div className="space-y-2 pt-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                Quick setup
              </h3>

              <div className="space-y-1.5 text-xs text-slate-600">
                {/* Step 1 */}
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span className="leading-tight text-[11.5px]">
                    Download and launch the <strong className="text-blue-600 font-semibold">Portable EXE</strong> on your workstation.
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span className="leading-tight text-[11.5px]">
                    Sign in with your operator credentials, then open <strong className="text-blue-600 font-semibold">Edit configuration</strong>.
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span className="leading-tight text-[11.5px]">
                    Paste your 30-day license key to start real-time data sync.
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </ProtectedPage>
  );
}
