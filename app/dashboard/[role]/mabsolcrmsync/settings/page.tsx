"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

interface LicenseDetails {
  license: string;
  licenseExpiresAt: string | null;
  licenseIssuedAt: string | null;
  isExpired: boolean;
  daysRemaining: number;
  boundDeviceId: string;
  boundDeviceName: string;
  isBound: boolean;
}

export default function VfpSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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

  useEffect(() => {
    loadLicense();
  }, []);

  const loadLicense = async () => {
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
        await loadLicense();
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
              onClick={loadLicense}
              title="Refresh"
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>

            <a
              href="/api/mabsolcrmsync/download-agent?type=portable"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>Download agent (.EXE)</span>
            </a>
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>Active — {daysLeft} days left</span>
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

              {/* Validity Term Progress */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Validity term</span>
                  <span className="font-semibold text-slate-800">
                    {daysLeft} remaining of 30 days
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
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
                    ? `Key is active for ${daysLeft} more days. Cannot regenerate until expired.`
                    : licenseInfo.isExpired
                    ? "Key expired. Click below to generate a new 30-day key."
                    : "Generate an initial 30-day single-device key."}
                </span>
              </div>

              {isKeyActive ? (
                <span className="inline-block bg-white border border-amber-300/80 text-amber-900 text-[10px] font-semibold px-2 py-0.2 rounded shadow-3xs">
                  Locked
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

            {/* Policy disclaimer */}
            <p className="text-[10.5px] text-slate-400 leading-normal m-0 pt-0.5">
              Policy: one key per machine. Once generated, a key cannot be replaced until its 30-day validity period expires.
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

            {/* Download Option 1: Portable Client */}
            <div className="rounded-lg border-2 border-blue-500/80 bg-blue-50/20 p-2.5 sm:p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-white border border-blue-200 flex items-center justify-center text-slate-700 shrink-0">
                  <AppWindow size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900">
                      Portable client
                    </strong>
                    <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      Recommended
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Direct run • no installation • 76.4 MB
                  </span>
                </div>
              </div>

              <a
                href="/api/mabsolcrmsync/download-agent?type=portable"
                title="Download Portable EXE"
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
              >
                <Download size={14} />
              </a>
            </div>

            {/* Download Option 2: Windows Installer */}
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
