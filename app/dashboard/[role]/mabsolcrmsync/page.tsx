import Link from "next/link";
import { redirect } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { Fragment } from "react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
import {
  Clock,
  Database,
  FolderOpen,
  Settings,
} from "lucide-react";
import VfpSyncActions from "@/components/VfpSyncActions";
import { getVfpStatus } from "@/lib/vfp/status";
import SyncSystemSelector from "@/components/sync/SyncSystemSelector";
import { SYNC_SYSTEMS, getSyncSystem } from "@/components/sync/syncSystems";
import SyncActivityLogs from "@/components/sync/SyncActivityLogs";

type VfpLogRow = {
  _id: unknown;
  action?: string;
  tableName?: string;
  status?: string;
  message?: string;
  error?: string;
  createdAt?: Date | string;
};

const rangeOptions = ["all", "day", "week", "month"] as const;

type VfpRange = (typeof rangeOptions)[number];

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
  const rawSource = resolvedParams.source;
  const rawRange = resolvedParams.range;
  const rawStartDate = resolvedParams.startDate;
  const rawEndDate = resolvedParams.endDate;
  const selectedSourceId = Array.isArray(rawSource)
    ? rawSource[0]
    : rawSource || "mabsolcrm";
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

  const currentSystem = getSyncSystem(selectedSourceId);

  const fileLimit = 10;
  const email = user.email;

  const roleType = String(user.roleType || "").toUpperCase();
  const roleName = String((user.roleId as any)?.roleName || user.roleName || user.role || "").toLowerCase();
  const isAdmin =
    roleType === "ADMIN" ||
    roleType === "SUPERADMIN" ||
    roleType === "SUPER_ADMIN" ||
    roleName.includes("admin") ||
    roleName.includes("superadmin") ||
    user.isSuperAdmin === true ||
    !user.roleType;

  const status = await getVfpStatus({ range, startDate, endDate, fileLimit }, email);
  const recentLogs = status.recentLogs as VfpLogRow[];

  const SelectedSystemIcon = currentSystem.icon;

  return (
    <ProtectedPage permission="vfp.view">
      <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 space-y-5 text-slate-900 box-border bg-slate-50/40 min-h-screen">

        {/* Eyebrow & Page Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase mb-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-slate-700">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            <span>DATA SYNCHRONIZATION & MIGRATION HUB</span>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full max-w-full">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 m-0 leading-tight">
                Data Sync Control
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl m-0 mt-1">
                Synchronize and migrate master catalogues, transactions, and ledgers between external ERPs and MabsolCRM.
              </p>
            </div>

            {/* Top Right Actions: System Selector Dropdown, Settings Link, Worker Status */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Dropdown: Where to sync data */}
              <SyncSystemSelector currentSystemId={currentSystem.id} />

              {/* Sync Settings button */}
              <Link
                href="/dashboard/mabsolcrmsync/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-all shrink-0"
                title="Open Sync Settings & DB Configuration"
              >
                <Settings size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              {status.workerOnline && (
                <span
                  className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3.5 py-2 border border-emerald-200/80 shadow-2xs whitespace-nowrap shrink-0 rounded-xl"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Worker Online
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1 Unified Container Card for Data Pipeline with Animated Flow */}
        <div
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 w-full box-border relative overflow-hidden"
          style={{ borderRadius: "20px" }}
        >
          {/* Node 1: Dynamic ERP Data Source */}
          <div className="flex items-center gap-3 flex-1 min-w-0 p-1">
            <div
              className={`w-10 h-10 flex items-center justify-center ${currentSystem.iconBg} ${currentSystem.iconColor} shrink-0 shadow-2xs`}
              style={{ borderRadius: "12px" }}
            >
              <SelectedSystemIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                  {currentSystem.shortName} Data
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${currentSystem.badgeBg} ${currentSystem.badgeText} ${currentSystem.badgeBorder}`}>
                  {currentSystem.badge}
                </span>
              </div>
              <div
                className="text-[11px] text-slate-500 font-medium truncate mt-0.5"
                title={status.enabledFiles && status.enabledFiles.length > 0 ? `${status.enabledFiles.length} file(s) ready` : "Direct file upload mode"}
              >
                {status.enabledFiles && status.enabledFiles.length > 0
                  ? `${status.enabledFiles.length} file(s) ready`
                  : "Direct file upload"}
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
              <div className="text-[11px] text-slate-500 font-medium mt-0.5" id="engine-sub">
                Connector: {currentSystem.shortName}
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
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">Cloud CRM Storage</div>
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

        {/* Sync Activity Logs Card - Only accessible to Admin users */}
        {isAdmin && (
          <SyncActivityLogs
            logs={recentLogs.map((l) => ({
              _id: String(l._id),
              action: l.action,
              tableName: l.tableName,
              status: l.status,
              message: l.message,
              error: l.error,
              createdAt: l.createdAt ? String(l.createdAt) : undefined,
            }))}
            userEmail={user.email}
            currentSystemId={currentSystem.id}
            range={range}
            startDate={startDate}
            endDate={endDate}
            rangeOptions={rangeOptions}
            isAdmin={isAdmin}
          />
        )}

      </div>
    </ProtectedPage>
  );
}
