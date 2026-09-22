import Link from "next/link";
import { redirect } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { Fragment } from "react";
import { getCurrentUser } from "@/lib/auth";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";
import {
  Clock,
  Database,
  FolderOpen,
  Settings,
} from "lucide-react";
import VfpSyncActions from "@/components/VfpSyncActions";
import { getVfpStatus } from "@/lib/vfp/status";

type VfpLogRow = {
  _id: unknown;
  action?: string;
  tableName?: string;
  status?: string;
  message?: string;
  error?: string;
  createdAt?: Date | string;
};

function formatDate(value?: Date | string) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

function formatTimeOnly(value?: Date | string) {
  if (!value) return "Never";
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusBadge(status?: string) {
  const normalizedStatus = (status || "unknown").toLowerCase();

  let bgClass = "bg-slate-100 text-slate-700 border-slate-200";

  if (["success", "stored", "online", "live sync active"].includes(normalizedStatus)) {
    bgClass = "bg-green-50 text-green-700 border-green-200";
  } else if (["running", "processing", "syncing"].includes(normalizedStatus)) {
    bgClass = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (["locked", "too_large", "offline", "worker attention needed"].includes(normalizedStatus)) {
    bgClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["failed", "error"].includes(normalizedStatus)) {
    bgClass = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${bgClass}`}>
      {status || "unknown"}
    </span>
  );
}

const rangeOptions = ["all", "day", "week", "month"] as const;

type VfpRange = (typeof rangeOptions)[number];

const rangeLabels: Record<VfpRange, string> = {
  all: "All time",
  day: "Today",
  week: "This week",
  month: "This month",
};

function formatRangeName(range: VfpRange) {
  return rangeLabels[range] || "All time";
}

export default async function VfpDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const rawRange = resolvedParams.range;
  const rawStartDate = resolvedParams.startDate;
  const rawEndDate = resolvedParams.endDate;
  const selectedRange = Array.isArray(rawRange)
    ? rawRange[0]
    : rawRange || "all";
  const startDate = Array.isArray(rawStartDate)
    ? rawStartDate[0]
    : rawStartDate;
  const endDate = Array.isArray(rawEndDate)
    ? rawEndDate[0]
    : rawEndDate;
  const range = rangeOptions.includes(selectedRange as VfpRange)
    ? (selectedRange as VfpRange)
    : "all";

  const fileLimit = 10;
  const email = user.email;
  const status = await getVfpStatus({ range, startDate, endDate, fileLimit }, email);
  const recentLogs = status.recentLogs as VfpLogRow[];

  return (
    <ProtectedPage permission="vfp.view">
      <div className="w-full max-w-full overflow-x-hidden sm:p-6 lg:p-8 space-y-6 text-slate-900 box-border bg-slate-50/40 min-h-screen">

        {/* Eyebrow & Page Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase mb-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-slate-700"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
            <span>ALL DATA MIGRATION</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full max-w-full">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 m-0 leading-tight">Migrate Data Control</h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl m-0 mt-1">Monitor local folder changes, DBF imports, file snapshots, and queued updates from one dashboard.</p>
            </div>
            {status.workerOnline ? (
              <span
                className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-1.5 border border-emerald-200/80 shadow-2xs whitespace-nowrap shrink-0 btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Worker Online
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold px-4 py-1.5 border border-amber-200/80 shadow-2xs whitespace-nowrap shrink-0 btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                AWS Cloud Mode
              </span>
            )}
          </div>
        </div>

        {/* 1 Unified Container Card for Data Pipeline with Animated Flow (No Inner Node Borders) */}
        <div
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 w-full box-border relative overflow-hidden"
          style={{ borderRadius: "20px" }}
        >
          {/* Node 1: MabsolCRM Folder */}
          <div className="flex items-center gap-3 flex-1 min-w-0 p-1">
            <div
              className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-700 shrink-0 shadow-2xs"
              style={{ borderRadius: "12px" }}
            >
              <FolderOpen size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">MabsolCRM Folder</div>
              <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={status.dataDir}>
                {status.dataDir || "Not configured"}
              </div>
            </div>
          </div>

          {/* Animated Flow Track 1 */}
          <div className="hidden md:block flex-1 h-[2px] bg-slate-100 relative overflow-hidden rounded-full min-w-[30px] my-auto">
            <span className="animate-flow-line rounded-full" />
          </div>

          {/* Node 2: Sync Engine */}
          <div className="flex items-center gap-3 flex-1 min-w-0 p-1">
            <div
              className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-700 shrink-0 shadow-2xs"
              style={{ borderRadius: "12px" }}
            >
              <Settings size={17} className="animate-spin text-slate-700" style={{ animationDuration: "10s" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">Sync Engine</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5" id="engine-sub">
                Sync Engine: Ready
              </div>
            </div>
          </div>

          {/* Animated Flow Track 2 */}
          <div className="hidden md:block flex-1 h-[2px] bg-slate-100 relative overflow-hidden rounded-full min-w-[30px] my-auto">
            <span className="animate-flow-line rounded-full" style={{ animationDelay: "1.2s" }} />
          </div>

          {/* Node 3: CRM DBF Table */}
          <div className="flex items-center gap-3 flex-1 min-w-0 p-1">
            <div
              className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-700 shrink-0 shadow-2xs"
              style={{ borderRadius: "12px" }}
            >
              <Database size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">CRM DBF Table</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {status.enabledFiles && status.enabledFiles.length > 0
                  ? `${status.enabledFiles.length} table(s) selected`
                  : "Selected tables"}
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel Section */}
        {/* currentPath uses ONLY consoleSyncDir — no fallback to Settings page fields (dataDir/sourceDir) */}
        <VfpSyncActions
          currentPath={status.consoleSyncDir || ""}
          destinationPath={""}
          enabledFiles={status.enabledFiles}
          initialAutoSync={status.autoSync}
          initialAutoSyncInterval={status.autoSyncInterval}
          workerOnline={status.workerOnline}
          workerStatus={status.workerStatus}
          lastSyncedAt={status.lastSyncedAt}
          pendingCommandCount={status.pendingCommandCount || 0}
          userEmail={user.email}
        />

        {/* Sync Activity Logs Card */}
        <div
          className="bg-white border border-slate-200/90 shadow-xs overflow-hidden w-full max-w-full box-border"
          style={{ borderRadius: "24px" }}
        >

          {/* Logs Card Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-slate-100 gap-3 w-full box-border">
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                SYNC ACTIVITY LOGS
              </span>
              <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5 text-slate-700"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" /></svg>
                <span>Sync activity logs</span>
              </div>
              <span className="text-xs text-slate-400 block mt-0.5">
                Filter and review CRM data transfer logs
              </span>
            </div>
            <RefreshButton />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between p-4 sm:p-5 border-b border-slate-100 gap-4 w-full box-border bg-slate-50/30">

            {/* Range Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {rangeOptions.map((option) => (
                <Link
                  key={option}
                  className={`text-xs font-bold px-4 py-2 border transition-all whitespace-nowrap inline-flex items-center btn-pill ${range === option && !startDate && !endDate
                      ? "bg-black border-black text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    }`}
                  style={{ borderRadius: "9999px" }}
                  href={`/dashboard/mabsolcrmsync?range=${option}`}
                >
                  {formatRangeName(option)}
                </Link>
              ))}
            </div>

            {/* Date Filters Form */}
            <form className="flex items-center gap-2 flex-wrap flex-1 lg:flex-initial" method="get">
              <div
                className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700 shadow-2xs flex-1 sm:flex-initial"
                style={{ borderRadius: "9999px" }}
              >
                <input
                  className="font-mono text-xs text-slate-800 bg-transparent outline-none w-full"
                  type="date"
                  name="startDate"
                  defaultValue={startDate || ""}
                  placeholder="mm/dd/yyyy"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">to</span>
              <div
                className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700 shadow-2xs flex-1 sm:flex-initial"
                style={{ borderRadius: "9999px" }}
              >
                <input
                  className="font-mono text-xs text-slate-800 bg-transparent outline-none w-full"
                  type="date"
                  name="endDate"
                  defaultValue={endDate || ""}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              <button
                className="px-5 py-2 text-xs font-bold bg-black text-white hover:bg-slate-900 transition-all cursor-pointer whitespace-nowrap shadow-xs ml-1 btn-pill"
                style={{ borderRadius: "9999px" }}
                type="submit"
              >
                Apply
              </button>
              <Link
                href="/dashboard/mabsolcrmsync"
                className="px-4 py-2 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-2xs btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                Reset
              </Link>
            </form>
          </div>

          {/* Logs List */}
          <div className="max-h-[520px] overflow-y-auto w-full box-border divide-y divide-slate-100" id="log-list">
            {recentLogs.length === 0 ? (
              <div
                className="text-center py-12 px-4 text-xs sm:text-sm text-slate-400 bg-slate-50/40 m-4 border border-dashed border-slate-200 font-medium"
                style={{ borderRadius: "16px" }}
              >
                No sync activity logs found.
              </div>
            ) : (
              recentLogs.map((log) => {
                const logStatus = (log.status || "unknown").toLowerCase();
                const isSuccess = logStatus === "success";
                const isRunning = logStatus === "running";

                return (
                  <div
                    className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors bg-white flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    key={String(log._id)}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {log.action} {log.tableName ? `· ${log.tableName}` : ""}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-0.5 border btn-pill ${isSuccess
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : isRunning
                                ? "bg-sky-50 text-sky-700 border-sky-200/80"
                                : "bg-red-50 text-red-700 border-red-200/80"
                            }`}
                          style={{ borderRadius: "9999px" }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? "bg-emerald-500" : isRunning ? "bg-sky-500 animate-pulse" : "bg-red-500"
                            }`} />
                          {log.status ? log.status.toUpperCase() : "UNKNOWN"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono break-words leading-relaxed">
                        {log.message || log.error || "No description logged."}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </ProtectedPage>
  );
}
