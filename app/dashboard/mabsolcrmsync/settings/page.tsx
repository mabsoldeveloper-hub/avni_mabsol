"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { useToast } from "@/context/ToastContext";
import "./vfp-settings.css";
import {
  Database,
  Save,
  RefreshCw,
  Terminal,
  Key,
  ShieldCheck,
  Laptop,
} from "lucide-react";

interface VfpSettingLogEntry {
  _id: string;
  userName: string;
  companyName: string;
  license: string;
  vfpExePath: string;
  action: string;
  status: string;
  message?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function VfpSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<VfpSettingLogEntry[]>([]);

  // Form State
  const [savedForm, setSavedForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
    prgPath: "",
    sourceDir: "",
    dataDir: "",
  });

  const [form, setForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
    prgPath: "",
    sourceDir: "",
    dataDir: "",
  });

  const hasChanges =
    form.userName.trim() !== savedForm.userName.trim() ||
    form.companyName.trim() !== savedForm.companyName.trim() ||
    form.license.trim() !== savedForm.license.trim();

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mabsolcrmsync/config");
      const data = await res.json();
      if (data.success) {
        const configData = {
          userName: data.userName || "",
          companyName: data.companyName || "",
          license: data.license || "",
          vfpExePath: data.vfpExePath || "/home/vfpuser/MabsolEXE/MabsolCRM.exe",
          prgPath: data.prgPath || "/home/vfpuser/MabsolPRG/7.PRG",
          sourceDir: data.sourceDir || "/home/vfpuser/MabsolData",
          dataDir: data.dataDir || "/home/vfpuser/MabsolSyncData",
        };
        setForm(configData);
        setSavedForm(configData);
      }
    } catch (error) {
      console.error("Failed to load sync config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/mabsolcrmsync/setting-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load setting logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.userName.trim() || !form.companyName.trim() || !form.license.trim()) {
      toast.error("Operator, Company name, and License Key are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.userName,
          companyName: form.companyName,
          license: form.license,
          vfpExePath: form.vfpExePath,
          prgPath: form.prgPath,
          sourceDir: form.sourceDir,
          dataDir: form.dataDir,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Configuration saved successfully.");
        setSavedForm(form);
        loadLogs();
      } else {
        toast.error(data.error || "Failed to save configuration.");
      }
    } catch {
      toast.error("An error occurred while saving settings.");
    } finally {
      setLoading(false);
    }
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // Filter logs for VFP console extraction logs
  const vfpDataLogs = logs.filter((log) => {
    const act = (log.action || "").toLowerCase();
    const msg = (log.message || "").toLowerCase();
    return (
      act === "vfp_launched" ||
      act === "launch_vfp" ||
      msg.includes("visual foxpro") ||
      (msg.includes("vfp") && !msg.includes("sync"))
    );
  });

  return (
    <ProtectedPage permission="vfp.settings">
      <div className="w-full max-w-full p-2 sm:p-3 space-y-3 text-slate-800 box-border bg-slate-50/40 min-h-screen font-sans">
        
        {/* Header Banner */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-teal-200/80 shadow-xs">
          <div className="space-y-0.5">
            <div 
              className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-teal-500 text-teal-700 text-[10px] font-bold uppercase tracking-wider bg-teal-50/40"
              style={{ borderRadius: "9999px" }}
            >
              <Database size={11} className="text-teal-600" />
              <span>Data Migration Engine</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight m-0">
              Data Migration & Agent Settings
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 m-0">
              Operator credentials, company license key, and extraction audit trail logs.
            </p>
          </div>
        </div>

        {/* CARD: Credentials & Server Path Targets */}
        <div className="bg-white border border-teal-200/80 shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                style={{ borderRadius: "9999px" }}
              >
                <Key size={16} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                  Integration Credentials & Targets
                </h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Operator authentication, company code, and auto-managed server paths
                </p>
              </div>
            </div>

            <span 
              className="text-[10px] font-bold text-teal-700 border border-teal-300 px-2.5 py-0.5 bg-teal-50/30"
              style={{ borderRadius: "9999px" }}
            >
              ⚡ Server Managed
            </span>
          </div>

          <form onSubmit={handleSave} className="p-3.5 sm:p-4 space-y-3.5">
            
            {/* Operator Credentials */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Operator Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Operator Display Name <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="Enter Operator name"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Company Code (e.g. E10) <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="e.g. E10"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    License Key <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="Enter License Key"
                    value={form.license}
                    onChange={(e) => setForm({ ...form, license: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Desktop Sync Agent (EXE) Section */}
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 via-slate-50/50 to-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        Desktop Sync Agent (EXE)
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100/80 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                        Inbuilt MabsolCRM Engine
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Standalone Windows application with automated decryption, OTP 2-factor login, and auto-sync on internet reconnect.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                  <span>Standalone Agent (dist-electron)</span>
                </div>
              </div>

              {/* Security & Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-3xs">
                  <ShieldCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <strong className="text-slate-800 block">Real-time Auto-Purge</strong>
                    <span className="text-slate-500">Security core is permanently purged immediately after each extraction.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-3xs">
                  <RefreshCw size={16} className="text-teal-600 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <strong className="text-slate-800 block">Offline Resilient</strong>
                    <span className="text-slate-500">Decrypts without internet; auto-uploads to cloud as soon as connection is restored.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-3xs">
                  <Key size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <strong className="text-slate-800 block">2-Factor Authentication</strong>
                    <span className="text-slate-500">Sign in securely to the desktop app with your CRM Email, Password & 6-digit OTP.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="btn-pill-primary inline-flex items-center justify-center gap-2 py-1.5 px-6 text-xs sm:text-sm font-bold active:scale-[0.98]"
              >
                <Save size={14} className="text-current" />
                <span>{loading ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}</span>
              </button>

              {hasChanges && (
                <span className="text-[11px] font-semibold text-teal-700 animate-pulse">
                  ● Unsaved changes detected
                </span>
              )}
            </div>
          </form>
        </div>

        {/* CARD 4: Audit Trail Log */}
        <div className="bg-white border border-teal-200/80 shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                style={{ borderRadius: "9999px" }}
              >
                <Terminal size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                  Extraction Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500 m-0">
                  Execution log of manual and scheduled MabsolCRM decryption events
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={logsLoading}
              className="btn-pill-secondary inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold cursor-pointer"
            >
              <RefreshCw size={11} className={logsLoading ? "animate-spin text-current" : "text-current"} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-2.5 pl-4">Timestamp</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Operator</th>
                  <th className="p-2.5">License</th>
                  <th className="p-2.5 pr-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={13} className="animate-spin text-teal-600" />
                        <span>Loading audit entries...</span>
                      </div>
                    </td>
                  </tr>
                ) : vfpDataLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 font-medium text-xs">
                      No MabsolCRM data extraction events recorded yet.
                    </td>
                  </tr>
                ) : (
                  vfpDataLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 pl-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border border-teal-400 text-teal-700 bg-white"
                          style={{ borderRadius: "9999px" }}
                        >
                          MabsolCRM Extraction
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap text-xs">
                        {log.userName}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap text-xs">
                        {log.license ? log.license.substring(0, 12) : "N/A"}
                      </td>
                      <td className="p-2.5 pr-4 text-slate-700 max-w-[280px] break-words text-xs">
                        {log.message || "MabsolCRM engine executed data extraction."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ProtectedPage>
  );
}
