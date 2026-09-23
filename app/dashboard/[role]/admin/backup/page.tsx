"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Clock,
  ShieldCheck,
  Database,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  Lock,
  ArrowLeft,
  Calendar,
  Sparkles,
  Server,
  X,
  Filter,
  Check,
  Info,
  Layers,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

type Frequency =
  | "every_minute"
  | "every_2_hours"
  | "every_6_hours"
  | "daily"
  | "weekly";

type BackupScope = "current_fy" | "all" | "custom";

interface FinancialYearItem {
  _id: string;
  fyName: string;
  fyCode?: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

interface BackupSettings {
  _id?: string;
  receiverEmail: string;
  frequency: Frequency;
  enabled: boolean;
  scope?: BackupScope;
  financialYearId?: string | null;
  financialYearName?: string | null;
  customStartDate?: string | null;
  customEndDate?: string | null;
  nextBackupAt?: string | null;
  lastBackupAt?: string | null;
}

interface BackupInspection {
  valid: boolean;
  version: string;
  manifest: {
    version: string;
    exportedAt: string;
    isAll: boolean;
    fyName: string;
    startDate: string | null;
    endDate: string | null;
    collectionsCount: number;
    totalDocuments: number;
    collectionsSummary: {
      name: string;
      count: number;
      dateField?: string | null;
    }[];
  } | null;
  message?: string;
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string; desc: string }[] = [
  {
    value: "every_minute",
    label: "Every 1 Minute",
    desc: "Test mode only — high server & email load",
  },
  {
    value: "every_2_hours",
    label: "Every 2 Hours",
    desc: "Frequent backups for busy pharmacies",
  },
  {
    value: "every_6_hours",
    label: "Every 6 Hours",
    desc: "Balanced 4 times daily snapshot",
  },
  {
    value: "daily",
    label: "Daily (Recommended)",
    desc: "Nightly complete CRM database snapshot",
  },
  {
    value: "weekly",
    label: "Weekly",
    desc: "Archive snapshot once every 7 days",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function BackupPage() {
  const { toast } = useToast();

  // Financial Years from CRM
  const [financialYears, setFinancialYears] = useState<FinancialYearItem[]>([]);
  const [selectedFyId, setSelectedFyId] = useState<string>("CURRENT");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Scheduler Settings state
  const [receiverEmail, setReceiverEmail] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("every_2_hours");
  const [enabled, setEnabled] = useState(true);
  const [schedulerScope, setSchedulerScope] = useState<BackupScope>("current_fy");
  const [schedulerFyId, setSchedulerFyId] = useState<string>("");

  // Loading states
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Data states
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInspection, setFileInspection] = useState<BackupInspection | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace_year" | "merge">("replace_year");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Financial Years & Settings on Mount
  const loadInitialData = async () => {
    try {
      setSettingsLoading(true);

      // Load Financial Years
      const fyRes = await fetch(API.FINANCIAL_YEAR, {
        credentials: "include",
      }).catch(() => null);

      if (fyRes && fyRes.ok) {
        const fyData = await fyRes.json();
        if (Array.isArray(fyData)) {
          setFinancialYears(fyData);
          const currentFy = fyData.find((f: FinancialYearItem) => f.isCurrent);
          if (currentFy) {
            setSelectedFyId(currentFy._id);
            setCustomStartDate(currentFy.startDate.slice(0, 10));
            setCustomEndDate(currentFy.endDate.slice(0, 10));
          }
        }
      }

      // Load Settings
      const setRes = await fetch(API.BACKUP_SETTINGS, {
        credentials: "include",
      });
      const data = await setRes.json();

      if (setRes.ok && data.settings) {
        setSettings(data.settings);
        setReceiverEmail(data.settings.receiverEmail || "");
        setFrequency(data.settings.frequency || "every_2_hours");
        setEnabled(data.settings.enabled ?? true);
        setSchedulerScope(data.settings.scope || "current_fy");
        setSchedulerFyId(data.settings.financialYearId || "");
      }
    } catch (error) {
      console.error("Load backup data error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load backup configuration"
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  // When selected FY changes in the top filter bar
  const handleSelectFy = (fyId: string) => {
    setSelectedFyId(fyId);
    if (fyId === "ALL" || fyId === "CUSTOM") return;

    const matched = financialYears.find((f) => f._id === fyId);
    if (matched) {
      setCustomStartDate(matched.startDate.slice(0, 10));
      setCustomEndDate(matched.endDate.slice(0, 10));
    }
  };

  // Save Scheduler Configuration
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!receiverEmail.trim()) {
      toast.error("Please enter a valid receiver Gmail address");
      return;
    }

    try {
      setSaveLoading(true);
      const matchedFy = financialYears.find((f) => f._id === schedulerFyId);

      const response = await fetch(API.BACKUP_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverEmail: receiverEmail.trim(),
          frequency,
          enabled,
          scope: schedulerScope,
          financialYearId: schedulerScope === "custom" ? schedulerFyId : null,
          financialYearName:
            schedulerScope === "custom" ? matchedFy?.fyName || null : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save settings");
      }

      if (result.settings) {
        setSettings(result.settings);
      }

      toast.success("Automated backup settings saved successfully!");
    } catch (error) {
      console.error("Save backup settings error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // Send Immediate Backup Email with Selected Year
  const handleSendBackupNow = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter and save a receiver Gmail address first");
      return;
    }

    try {
      setSendLoading(true);
      const matchedFy = financialYears.find((f) => f._id === selectedFyId);

      const payload: any = {};
      if (selectedFyId === "ALL") {
        payload.isAll = true;
      } else if (selectedFyId === "CUSTOM") {
        payload.startDate = customStartDate;
        payload.endDate = customEndDate;
      } else if (matchedFy) {
        payload.fyId = matchedFy._id;
        payload.fyName = matchedFy.fyName;
        payload.startDate = matchedFy.startDate;
        payload.endDate = matchedFy.endDate;
      }

      const response = await fetch(API.BACKUP_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send backup email");
      }

      toast.success(
        result.message || `Encrypted backup sent to ${receiverEmail} successfully!`
      );
      void loadInitialData();
    } catch (error) {
      console.error("Send backup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send backup email"
      );
    } finally {
      setSendLoading(false);
    }
  };

  // Download Year-Wise Backup File
  const handleDownloadBackup = async () => {
    try {
      setDownloadLoading(true);

      const params = new URLSearchParams();
      if (selectedFyId === "ALL") {
        params.set("all", "true");
      } else if (selectedFyId === "CUSTOM") {
        if (customStartDate) params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      } else {
        const matchedFy = financialYears.find((f) => f._id === selectedFyId);
        if (matchedFy) {
          params.set("fyId", matchedFy._id);
          params.set("fyName", matchedFy.fyName);
        }
      }

      const response = await fetch(
        API.BACKUP_EXPORT + "?" + params.toString(),
        { credentials: "include" }
      );

      if (!response.ok) {
        let message = "Download failed";
        try {
          const result = await response.json();
          message = result.message || message;
        } catch {
          // not json
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadName = `database-backup-${new Date().toISOString().slice(0, 10)}.mbak`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) downloadName = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      const yearHeader = response.headers.get("X-Backup-Year") || "Selected Range";
      toast.success(`Encrypted backup for ${yearHeader} downloaded successfully!`);
    } catch (error) {
      console.error("Download backup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Backup download failed"
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  // Inspect uploaded .mbak file
  const inspectFile = async (file: File) => {
    try {
      setInspectLoading(true);
      setFileInspection(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API.BACKUP_INSPECT, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to inspect backup file");
      }

      setFileInspection(result.inspection);
    } catch (error) {
      console.error("Inspect backup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to read backup file contents"
      );
      setSelectedFile(null);
      setFileInspection(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".mbak")) {
      toast.error("Invalid file format. Only encrypted .mbak files are supported.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    void inspectFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".mbak")) {
      toast.error("Invalid file format. Only encrypted .mbak files are supported.");
      return;
    }

    setSelectedFile(file);
    void inspectFile(file);
  };

  // Execute Database Restore
  const handleExecuteRestore = async () => {
    if (!selectedFile) {
      toast.error("Please select a .mbak file to restore");
      return;
    }

    const manifest = fileInspection?.manifest;
    const yearScopeText = manifest
      ? manifest.isAll
        ? "FULL DATABASE"
        : `FINANCIAL YEAR ${manifest.fyName}`
      : "DATABASE";

    const confirmed = window.confirm(
      `⚠️ CAUTION: You are about to restore data for: ${yearScopeText}.\n\nMode: ${
        restoreMode === "replace_year"
          ? "Clean & Overwrite records for this Financial Year"
          : "Merge / Upsert with existing records"
      }\n\nAre you sure you want to proceed?`
    );

    if (!confirmed) return;

    try {
      setRestoreLoading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", restoreMode);

      const response = await fetch(API.BACKUP_IMPORT, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Database restoration failed");
      }

      toast.success(result.message || "Database restored successfully!");
      setSelectedFile(null);
      setFileInspection(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Restore backup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Database restore failed"
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  // Active Year Label
  const getActiveYearLabel = () => {
    if (selectedFyId === "ALL") return "All Financial Years (Full Database)";
    if (selectedFyId === "CUSTOM")
      return `Custom Range: ${customStartDate || "Start"} to ${customEndDate || "End"}`;
    const matched = financialYears.find((f) => f._id === selectedFyId);
    return matched
      ? `FY ${matched.fyName}${matched.isCurrent ? " (Current Active)" : ""}`
      : "Active Financial Year";
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">
            Loading database backup and financial year configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-xs"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                    System Administration
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Disaster Recovery & Archival
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Year-Wise Database Backup & Restoration
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadInitialData}
                disabled={settingsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${settingsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* YEAR SELECTION CONTROL BAR */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs mb-6 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Select Target Financial Year for Backup
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    <Filter className="h-3 w-3" /> Year Filter Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Backup will export master catalogs plus all transactions strictly within the selected financial year.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <select
                  value={selectedFyId}
                  onChange={(e) => handleSelectFy(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <optgroup label="Financial Years">
                    {financialYears.map((fy) => (
                      <option key={fy._id} value={fy._id}>
                        FY {fy.fyName} {fy.isCurrent ? "★ (Active Current)" : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Options">
                    <option value="ALL">📦 All Financial Years (Full Dump)</option>
                    <option value="CUSTOM">📅 Custom Date Range...</option>
                  </optgroup>
                </select>
              </div>

              {selectedFyId === "CUSTOM" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 shadow-xs focus:ring-1 focus:ring-blue-500"
                    title="From Date"
                  />
                  <span className="text-xs text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 shadow-xs focus:ring-1 focus:ring-blue-500"
                    title="To Date"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Highlights (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Selected Scope */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Selected Scope
              </p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5" title={getActiveYearLabel()}>
                {getActiveYearLabel()}
              </p>
            </div>
          </div>

          {/* Card 2: Auto-Scheduler Status */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                enabled
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Auto-Scheduler
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <p className="text-xs font-bold text-slate-900">
                  {enabled ? "Active & Running" : "Disabled"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Next Scheduled Run */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Next Run
              </p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {enabled && settings?.nextBackupAt
                  ? new Date(settings.nextBackupAt).toLocaleTimeString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not Scheduled"}
              </p>
            </div>
          </div>

          {/* Card 4: Protection Layer */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Encryption
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                AES-256-GCM + EJSON
              </p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: Left = Automated Email Scheduler, Right = Export & Restore */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT: AUTOMATED GMAIL BACKUP & SCHEDULE SETTINGS         */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Automated Email Backup
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically encrypt and dispatch database snapshots directly to Gmail
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
              {/* Receiver Gmail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receiver Gmail Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="e.g. director@yourpharmacy.com"
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Backups are encrypted before email transmission and can only be decrypted inside this CRM.
                </p>
              </div>

              {/* Automatic Email Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Automatic Backup Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSchedulerScope("current_fy")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      schedulerScope === "current_fy"
                        ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Active Year</span>
                      {schedulerScope === "current_fy" && (
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Auto-advances to new FY when year changes (Recommended)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSchedulerScope("all")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      schedulerScope === "all"
                        ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">All Years</span>
                      {schedulerScope === "all" && (
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Full multi-year database snapshot in every email
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSchedulerScope("custom")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      schedulerScope === "custom"
                        ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Fixed FY</span>
                      {schedulerScope === "custom" && (
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Lock to a specific historical financial year
                    </p>
                  </button>
                </div>

                {schedulerScope === "custom" && (
                  <div className="mt-2.5">
                    <select
                      value={schedulerFyId}
                      onChange={(e) => setSchedulerFyId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="">Select Fixed Financial Year...</option>
                      {financialYears.map((fy) => (
                        <option key={fy._id} value={fy._id}>
                          FY {fy.fyName} {fy.isCurrent ? "(Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Frequency Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Backup Dispatch Frequency
                </label>
                <div className="space-y-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        frequency === opt.value
                          ? "border-blue-500 bg-blue-50/40 text-blue-950 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={opt.value}
                        checked={frequency === opt.value}
                        onChange={() => setFrequency(opt.value)}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold">{opt.label}</p>
                          {opt.value === "daily" && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              Optimal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Enable Background Scheduler
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dispatches backups at the scheduled frequency automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    enabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Schedule Configuration
                </button>

                <button
                  type="button"
                  onClick={handleSendBackupNow}
                  disabled={sendLoading || !receiverEmail}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  title="Send immediate backup to the specified email"
                >
                  {sendLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-blue-600" />
                  )}
                  Send Email Now
                </button>
              </div>
            </form>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: MANUAL EXPORT & YEAR-WISE RESTORE BOX              */}
          {/* ======================================================== */}
          <div className="space-y-6">
            {/* Card 1: Immediate Year-Wise Download */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Manual Year-Wise Download
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generate an instant encrypted snapshot file (.mbak) for offline archival
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Export Scope:</span>
                  <span className="font-bold text-slate-800">
                    {getActiveYearLabel()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Encryption:</span>
                  <span className="font-bold text-emerald-600">AES-256-GCM + EJSON</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Compression:</span>
                  <span className="font-bold text-slate-800">Gzip (Max Level)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadLoading}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download {getActiveYearLabel()} Backup (.mbak)
              </button>
            </div>

            {/* Card 2: Safe Year-Wise Restore & File Inspection */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Safe Year-Wise Restore & Upload
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload a .mbak file. Only data belonging to that financial year will be restored.
                  </p>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mbak"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileArchive className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedFile ? selectedFile.name : "Click to select or drag & drop .mbak file"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedFile
                        ? formatFileSize(selectedFile.size)
                        : "Encrypted Mabsol Backup Archives (*.mbak)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inspection Box when file is selected */}
              {inspectLoading && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <p className="text-xs font-medium text-blue-800">
                    Decrypting and inspecting backup archive contents...
                  </p>
                </div>
              )}

              {fileInspection && fileInspection.manifest && (
                <div className="mt-4 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Archive Verified & Inspected
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Archive Year
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {fileInspection.manifest.isAll
                          ? "All Financial Years (Full Dump)"
                          : `FY ${fileInspection.manifest.fyName}`}
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Total Records
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {fileInspection.manifest.totalDocuments.toLocaleString()} documents
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Collections
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {fileInspection.manifest.collectionsCount} collections
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Exported At
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5 truncate">
                        {new Date(fileInspection.manifest.exportedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Restore Mode Options */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Restore Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode("replace_year")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          restoreMode === "replace_year"
                            ? "border-emerald-600 bg-white text-emerald-950 font-bold shadow-xs"
                            : "border-emerald-200 bg-emerald-100/40 text-slate-600"
                        }`}
                      >
                        <p className="font-bold">Clean & Overwrite FY</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Overwrites only this year. Other years safe.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode("merge")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          restoreMode === "merge"
                            ? "border-emerald-600 bg-white text-emerald-950 font-bold shadow-xs"
                            : "border-emerald-200 bg-emerald-100/40 text-slate-600"
                        }`}
                      >
                        <p className="font-bold">Merge / Upsert</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Updates existing docs without deleting any.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Restore Action Button */}
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={restoreLoading || !selectedFile || inspectLoading}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {restoreLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Restore Database from Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}