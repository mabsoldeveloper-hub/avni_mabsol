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
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

type Frequency =
  | "every_minute"
  | "every_2_hours"
  | "every_6_hours"
  | "daily"
  | "weekly";

interface BackupSettings {
  _id?: string;
  receiverEmail: string;
  frequency: Frequency;
  enabled: boolean;
  nextBackupAt?: string | null;
  lastBackupAt?: string | null;
}

interface ApiResponse {
  message?: string;
  settings?: BackupSettings;
  fileName?: string;
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

  const [receiverEmail, setReceiverEmail] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("every_2_hours");
  const [enabled, setEnabled] = useState(true);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  // const [sendLoading, setSendLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/backup/settings`, {
        credentials: "include",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load settings");
      }

      if (data.settings) {
        setSettings(data.settings);
        setReceiverEmail(data.settings.receiverEmail || "");
        setFrequency(data.settings.frequency || "every_2_hours");
        setEnabled(data.settings.enabled ?? true);
      }
    } catch (error) {
      console.error("Load backup settings error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load backup settings"
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!receiverEmail.trim()) {
      toast.error("Please enter a valid receiver Gmail address");
      return;
    }

    try {
      setSaveLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/backup/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverEmail: receiverEmail.trim(),
          frequency,
          enabled,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save settings");
      }

      if (result.settings) {
        setSettings(result.settings);
        setReceiverEmail(result.settings.receiverEmail || "");
        setFrequency(result.settings.frequency || "every_2_hours");
        setEnabled(result.settings.enabled ?? true);
      }

      toast.success("Backup schedule settings saved successfully!");
    } catch (error) {
      console.error("Save backup settings error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // const handleSendBackup = async () => {
  //   if (!receiverEmail.trim()) {
  //     toast.error("Please specify a receiver email first and save settings");
  //     return;
  //   }

  //   try {
  //     setSendLoading(true);
  //     const response = await fetch(`${BACKEND_URL}/api/admin/backup/send`, {
  //       method: "POST",
  //       credentials: "include",
  //     });

  //     const result: ApiResponse = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result.message || "Failed to send backup");
  //     }

  //     toast.success(
  //       result.message || `Encrypted backup sent to ${receiverEmail} successfully!`
  //     );
  //     void loadSettings();
  //   } catch (error) {
  //     console.error("Send backup error:", error);
  //     toast.error(
  //       error instanceof Error ? error.message : "Failed to send backup email"
  //     );
  //   } finally {
  //     setSendLoading(false);
  //   }
  // };

  const handleDownloadBackup = async () => {
    try {
      setDownloadLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/backup/export`, {
        credentials: "include",
      });

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
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `database-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.mbak`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Encrypted backup downloaded successfully!");
    } catch (error) {
      console.error("Download backup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Backup download failed"
      );
    } finally {
      setDownloadLoading(false);
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
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile) {
      toast.error("Please select a .mbak file to restore");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: Restoring will overwrite existing database collections with data from "${selectedFile.name}".\n\nAre you sure you want to proceed?`
    );

    if (!confirmed) return;

    try {
      setRestoreLoading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${BACKEND_URL}/api/admin/backup/import`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Database restoration failed");
      }

      toast.success(result.message || "Database restored successfully!");
      setSelectedFile(null);
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

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">
            Loading database backup configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Navigation & Breadcrumb */}
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
                    Administration
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Disaster Recovery
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Database Backup & Restoration
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSettings}
                disabled={settingsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${settingsLoading ? "animate-spin" : ""}`} />
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Status Highlights (3 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Scheduler Status */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                enabled
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Auto-Scheduler</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <p className="text-sm font-semibold text-slate-900">
                  {enabled ? "Active & Running" : "Disabled"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Next Backup Time */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Next Scheduled Run</p>
              <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
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

          {/* Card 3: Security Status */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Protection Layer</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                AES-256-GCM Encrypted
              </p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: Left = Automatic Email, Right = Restore & Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT SIDE: AUTOMATIC EMAIL BACKUP & SCHEDULE SETTINGS     */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Automatic Email Backup
                    </h2>
                    <p className="text-xs text-blue-100">
                      Scheduled encrypted snapshots delivered to Gmail
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full border border-white/25">
                  Side 1: Scheduler
                </span>
              </div>
            </div>

            {/* Form & Controls */}
            <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
              {/* Receiver Gmail */}
              <div>
                <label
                  htmlFor="receiverEmail"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Receiver Gmail Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="receiverEmail"
                    type="email"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="e.g. administrator@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  The server will securely email encrypted .mbak files to this address.
                </p>
              </div>

              {/* Backup Frequency */}
              <div>
                <label
                  htmlFor="frequency"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Backup Frequency & Timing
                </label>
                <div className="relative">
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer appearance-none"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>

                {frequency === "every_minute" && (
                  <div className="mt-2.5 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> 1-minute interval is intended for rapid testing.
                      Use Daily or Every 2 Hours for production to avoid Gmail rate limits.
                    </span>
                  </div>
                )}
              </div>

              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Enable Automatic Scheduler
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trigger backups automatically at the selected frequency
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Info Box */}
              {settings && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Next Scheduled Backup:</span>
                    <span className="font-semibold text-blue-900">
                      {enabled && settings.nextBackupAt
                        ? new Date(settings.nextBackupAt).toLocaleString()
                        : "Paused"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Last Backup Timestamp:</span>
                    <span className="text-slate-800">
                      {settings.lastBackupAt
                        ? new Date(settings.lastBackupAt).toLocaleString()
                        : "No backups recorded yet"}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className={`h-4 w-4 ${saveLoading ? "animate-spin" : ""}`} />
                  {saveLoading ? "Saving Settings..." : "Save Schedule Settings"}
                </button>

                {/* <button
                  type="button"
                  onClick={handleSendBackup}
                  disabled={sendLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm rounded-xl border border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Test sending backup to Gmail right now"
                >
                  <Send className={`h-4 w-4 ${sendLoading ? "animate-spin" : ""}`} />
                  {sendLoading ? "Sending to Gmail..." : "Send Backup Now"}
                </button> */}
              </div>
            </form>
          </div>

          {/* ======================================================== */}
          {/* RIGHT SIDE: RESTORE & UPLOAD / MANUAL DOWNLOAD           */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Restore & Local Upload
                    </h2>
                    <p className="text-xs text-slate-300">
                      Upload .mbak backup archive or export local copy
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full border border-white/25">
                  Side 2: Restore / Upload
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION A: UPLOAD & RESTORE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Restore Database from File
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Accepts .mbak files
                  </span>
                </div>

                {/* Overwrite Warning Banner */}
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200/70 rounded-xl text-xs text-rose-800 mb-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>
                    <strong>High Impact Action:</strong> Restoring will drop & replace existing
                    database collections with the backup data.
                  </p>
                </div>

                {/* Drag and Drop Zone */}
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
                      ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mbak"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 mb-3">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      Click to browse or drag & drop backup file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Only encrypted <code className="text-blue-600 font-mono">.mbak</code> files are supported
                    </p>
                  </div>
                </div>

                {/* Selected File Details & Confirm Restore Button */}
                {selectedFile && (
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileArchive className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatFileSize(selectedFile.size)} • Ready to restore
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        disabled={restoreLoading}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleExecuteRestore}
                        disabled={restoreLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${restoreLoading ? "animate-spin" : ""}`} />
                        {restoreLoading ? "Restoring..." : "Restore Now"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5">
                {/* SECTION B: LOCAL DOWNLOAD / EXPORT */}
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Manual Local Backup Download
                </h3>
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="pr-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Export Encrypted Snapshot
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Save a point-in-time copy of your MongoDB directly onto your device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={downloadLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Download className={`h-4 w-4 ${downloadLoading ? "animate-spin" : ""}`} />
                    {downloadLoading ? "Exporting..." : "Download .mbak"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Explanations & Instructions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">End-to-End Encryption</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Backups are encrypted using AES-256-GCM before transmission or storage.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Full CRM Coverage</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Includes all orders, invoices, medicine stocks, ledger entries & company settings.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Background Worker</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Run <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">npm run backup:worker</code> on your server to automate Gmail delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}