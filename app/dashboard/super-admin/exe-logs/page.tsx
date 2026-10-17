"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaDownload,
  FaSyncAlt,
  FaLaptop,
  FaKey,
  FaBan,
  FaCheckCircle,
  FaTimesCircle,
  FaBuilding,
  FaCodeBranch,
  FaUser,
  FaSearch,
  FaFilter,
  FaClock,
  FaShieldAlt,
  FaEye,
  FaChevronDown,
  FaChevronRight,
  FaDesktop,
  FaWindows,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaIdCard,
  FaFileInvoice,
  FaCalendarAlt,
  FaUndo,
} from "react-icons/fa";

type TabType = "hierarchy" | "users" | "downloads" | "syncs";

interface ExeStats {
  totalDownloads: number;
  totalSyncRuns: number;
  successfulSyncs: number;
  failedSyncs: number;
  rejectedSyncs: number;
  suspendedUsersCount: number;
  activeWorkstationsCount: number;
  suspendedWorkstationsCount: number;
  liveAgentsCount: number;
  activeLicensesCount: number;
}

interface CompanyHierarchyNode {
  _id: string;
  companyName: string;
  companyCode: string;
  isHeadOffice: boolean;
  parentCompanyId?: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  website?: string;
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  totalDownloads: number;
  totalSyncs: number;
  lastSyncAt?: string;
  successSyncCount: number;
  rejectedSyncCount: number;
  devices: any[];
  users: any[];
  allUsersSuspended: boolean;
  anyUserSuspended: boolean;
  subBranches?: CompanyHierarchyNode[];
  rollupDownloads?: number;
  rollupSyncs?: number;
  rollupDeviceCount?: number;
  createdAt?: string;
}

export default function SuperAdminExeLogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("hierarchy");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Advanced Filters
  const [search, setSearch] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("all");
  const [branchTypeFilter, setBranchTypeFilter] = useState<"all" | "head" | "sub">("all");
  const [exeStatusFilter, setExeStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [workstationFilter, setWorkstationFilter] = useState<"all" | "has_pc" | "no_pc" | "has_suspended_pc">("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [statusFilter, setStatusFilter] = useState("all"); // For syncs
  const [formatFilter, setFormatFilter] = useState("all"); // For downloads
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<ExeStats>({
    totalDownloads: 0,
    totalSyncRuns: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    rejectedSyncs: 0,
    suspendedUsersCount: 0,
    activeWorkstationsCount: 0,
    suspendedWorkstationsCount: 0,
    liveAgentsCount: 0,
    activeLicensesCount: 0,
  });

  const [hierarchy, setHierarchy] = useState<CompanyHierarchyNode[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [downloadsData, setDownloadsData] = useState<{ docs: any[]; total: number; totalPages: number; page: number }>({
    docs: [],
    total: 0,
    totalPages: 1,
    page: 1,
  });
  const [syncsData, setSyncsData] = useState<{ docs: any[]; total: number; totalPages: number; page: number }>({
    docs: [],
    total: 0,
    totalPages: 1,
    page: 1,
  });

  // Accordion state for Head Offices in hierarchy tab
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  // Action modals
  const [suspendModal, setSuspendModal] = useState<{
    open: boolean;
    type: "user" | "company" | "device";
    targetId: string;
    targetName: string;
    licenseKey?: string;
  } | null>(null);

  const [suspensionReason, setSuspensionReason] = useState("");
  const [includeSubBranches, setIncludeSubBranches] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Inspector / Details Modals
  const [selectedSyncRecord, setSelectedSyncRecord] = useState<any | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<CompanyHierarchyNode | null>(null);
  const [detailsTab, setDetailsTab] = useState<"overview" | "workstations" | "syncs" | "downloads">("overview");

  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setRefreshing(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: "50",
          search,
          status: statusFilter,
          format: formatFilter,
          companyId: selectedCompanyFilter !== "all" ? selectedCompanyFilter : "",
          branchType: branchTypeFilter,
          workstationFilter,
        });

        const res = await fetch(`/api/super-admin/exe-logs?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success) {
          setStats(data.stats);
          setHierarchy(data.hierarchy || []);

          // Double security filter: Ensure super admin account is NEVER displayed under any circumstance
          const safeUsers = (data.usersList || []).filter((u: any) => {
            const email = (u.email || "").toLowerCase().trim();
            const role = (u.role || "").toLowerCase().trim();
            return (
              email !== process.env.SUPER_ADMIN_EMAIL &&
              !role.includes("superadmin") &&
              !role.includes("super_admin")
            );
          });
          setUsersList(safeUsers);

          const safeDownloads = {
            ...(data.downloads || { docs: [], total: 0, totalPages: 1, page: 1 }),
            docs: (data.downloads?.docs || []).filter(
              (d: any) => (d.userEmail || "").toLowerCase().trim() !== "mabsoldeveloper@gmail.com"
            ),
          };
          setDownloadsData(safeDownloads);

          const safeSyncs = {
            ...(data.syncs || { docs: [], total: 0, totalPages: 1, page: 1 }),
            docs: (data.syncs?.docs || []).filter(
              (s: any) => (s.userEmail || "").toLowerCase().trim() !== "mabsoldeveloper@gmail.com"
            ),
          };
          setSyncsData(safeSyncs);
        } else {
          console.error("Failed to load EXE logs:", data.message);
        }
      } catch (err) {
        console.error("Error fetching EXE logs:", err);
      } finally {
        setLoading(false);
        if (showRefreshIndicator) setRefreshing(false);
      }
    },
    [page, search, statusFilter, formatFilter, selectedCompanyFilter, branchTypeFilter, workstationFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (compId: string) => {
    setExpandedBranches((prev) => ({
      ...prev,
      [compId]: !prev[compId],
    }));
  };

  const resetAllFilters = () => {
    setSearch("");
    setSelectedCompanyFilter("all");
    setBranchTypeFilter("all");
    setExeStatusFilter("all");
    setWorkstationFilter("all");
    setTimeRangeFilter("all");
    setStatusFilter("all");
    setFormatFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCompanyFilter !== "all" ||
    branchTypeFilter !== "all" ||
    exeStatusFilter !== "all" ||
    workstationFilter !== "all" ||
    timeRangeFilter !== "all" ||
    statusFilter !== "all" ||
    formatFilter !== "all";

  const handleAction = async (payload: any) => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/super-admin/exe-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({ type: "success", message: data.message });
        setSuspendModal(null);
        setSuspensionReason("");
        // If modal was open, refresh details
        if (selectedUserDetails && payload.userId === selectedUserDetails._id) {
          setSelectedUserDetails((prev: any) => ({
            ...prev,
            exeAccessSuspended: payload.action === "suspend_user_exe",
            exeSuspendedReason: payload.reason || "",
            exeSuspendedAt: payload.action === "suspend_user_exe" ? new Date().toISOString() : null,
          }));
        }
        await fetchData(true);
      } else {
        setActionFeedback({ type: "error", message: data.message || "Action failed." });
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.message || "Failed to communicate with server." });
    } finally {
      setActionLoading(false);
    }
  };

  // List of all unique companies for filter dropdown
  const allCompanyOptions = useMemo(() => {
    const list: { id: string; name: string; isHead: boolean; code: string }[] = [];
    for (const h of hierarchy) {
      list.push({ id: h._id, name: h.companyName, isHead: true, code: h.companyCode });
      for (const s of h.subBranches || []) {
        list.push({ id: s._id, name: s.companyName, isHead: false, code: s.companyCode });
      }
    }
    return list;
  }, [hierarchy]);

  // Filtered Hierarchy
  const filteredHierarchy = useMemo(() => {
    let result = hierarchy;

    // Filter by company dropdown
    if (selectedCompanyFilter !== "all") {
      result = result
        .map((head) => {
          if (head._id === selectedCompanyFilter) return head;
          const matchingSubs = (head.subBranches || []).filter((s) => s._id === selectedCompanyFilter);
          if (matchingSubs.length > 0) {
            return { ...head, subBranches: matchingSubs };
          }
          return null;
        })
        .filter(Boolean) as CompanyHierarchyNode[];
    }

    // Filter by branch type
    if (branchTypeFilter === "head") {
      result = result.map((head) => ({ ...head, subBranches: [] }));
    } else if (branchTypeFilter === "sub") {
      result = result
        .filter((head) => (head.subBranches || []).length > 0)
        .map((head) => ({ ...head, subBranches: head.subBranches }));
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((head) => {
        const matchHead =
          head.companyName?.toLowerCase().includes(q) ||
          head.companyCode?.toLowerCase().includes(q) ||
          head.city?.toLowerCase().includes(q) ||
          head.state?.toLowerCase().includes(q) ||
          head.gstNo?.toLowerCase().includes(q);
        const matchSubs = (head.subBranches || []).some(
          (s) =>
            s.companyName?.toLowerCase().includes(q) ||
            s.companyCode?.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q) ||
            s.state?.toLowerCase().includes(q)
        );
        const matchUsers = (head.users || []).some(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.mobile?.toLowerCase().includes(q)
        );
        return matchHead || matchSubs || matchUsers;
      });
    }

    return result;
  }, [hierarchy, selectedCompanyFilter, branchTypeFilter, search]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let result = usersList;

    // Filter out super admin (strictly enforced)
    result = result.filter((u) => {
      const email = (u.email || "").toLowerCase().trim();
      const role = (u.role || "").toLowerCase().trim();
      return (
        email !== "mabsoldeveloper@gmail.com" &&
        !role.includes("superadmin") &&
        !role.includes("super_admin")
      );
    });

    // Company filter
    if (selectedCompanyFilter !== "all") {
      result = result.filter(
        (u) => String(u.companyId) === selectedCompanyFilter || u.companyDetails?._id === selectedCompanyFilter
      );
    }

    // Branch type filter
    if (branchTypeFilter === "head") {
      result = result.filter((u) => u.companyDetails?.isHeadOffice !== false);
    } else if (branchTypeFilter === "sub") {
      result = result.filter((u) => u.companyDetails?.isHeadOffice === false);
    }

    // EXE Status filter
    if (exeStatusFilter === "active") {
      result = result.filter((u) => !u.exeAccessSuspended);
    } else if (exeStatusFilter === "suspended") {
      result = result.filter((u) => u.exeAccessSuspended);
    }

    // Workstation filter
    if (workstationFilter === "has_pc") {
      result = result.filter((u) => u.devices && u.devices.length > 0);
    } else if (workstationFilter === "no_pc") {
      result = result.filter((u) => !u.devices || u.devices.length === 0);
    } else if (workstationFilter === "has_suspended_pc") {
      result = result.filter((u) => (u.devices || []).some((d: any) => d.status === "suspended"));
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.mobile?.toLowerCase().includes(q) ||
          u.companyName?.toLowerCase().includes(q) ||
          u.companyCode?.toLowerCase().includes(q) ||
          u.licenseKey?.toLowerCase().includes(q) ||
          (u.devices || []).some(
            (d: any) =>
              (d.deviceName || "").toLowerCase().includes(q) || (d.deviceId || "").toLowerCase().includes(q)
          )
      );
    }

    return result;
  }, [usersList, selectedCompanyFilter, branchTypeFilter, exeStatusFilter, workstationFilter, search]);

  return (
    <div className="w-full max-w-[1700px] mx-auto px-2.5 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-3.5 sm:space-y-4 text-slate-800 pb-16">
      {/* Top Command Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white flex items-center justify-center text-lg sm:text-xl shadow-md shadow-indigo-600/20 shrink-0">
            <FaDownload />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Desktop Agent (.EXE) & Sync Governance
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                <FaDesktop size={10} />
                Multi-Branch Workstation Control
              </span>
              {stats.suspendedUsersCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 animate-pulse shrink-0">
                  <FaBan size={10} />
                  {stats.suspendedUsersCount} Suspended Users
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Track desktop sync agent downloads, real-time sync batches, license bindings, and enforce instant
              kill-switch suspension across any user, branch, or PC workstation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 w-full sm:w-auto">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh All Real-time Telemetry"
          >
            <FaSyncAlt className={refreshing ? "animate-spin text-indigo-600" : "text-slate-500"} size={12} />
            <span>{refreshing ? "Refreshing..." : "Sync Live"}</span>
          </button>
        </div>
      </div>

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl text-xs font-semibold border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {actionFeedback.type === "success" ? <FaCheckCircle size={14} className="shrink-0" /> : <FaTimesCircle size={14} className="shrink-0" />}
            <span className="break-words">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-500 hover:text-slate-700 p-1 rounded-md shrink-0 ml-2"
          >
            <FaTimes size={12} />
          </button>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total EXE Downloads</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalDownloads.toLocaleString()}</div>
            <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <FaWindows className="text-sky-500 shrink-0" size={11} /> Setup, Portable & ZIP
            </div>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-base sm:text-lg border border-sky-100 shrink-0 ml-2">
            <FaDownload />
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total Sync Runs</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalSyncRuns.toLocaleString()}</div>
            <div className="text-[10.5px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1 truncate">
              <FaCheckCircle size={11} className="shrink-0" /> {stats.successfulSyncs.toLocaleString()} OK · {stats.failedSyncs} Failed
            </div>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base sm:text-lg border border-emerald-100 shrink-0 ml-2">
            <FaSyncAlt />
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Workstations & Licenses</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {stats.activeWorkstationsCount} <span className="text-xs text-slate-500 font-normal">Active PCs</span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <FaKey className="text-amber-500 shrink-0" size={10} /> {stats.activeLicensesCount} Enterprise Keys
            </div>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base sm:text-lg border border-amber-100 shrink-0 ml-2">
            <FaLaptop />
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Suspension Kill-Switch</div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
              {stats.suspendedUsersCount} <span className="text-xs text-slate-500 font-normal">Users Blocked</span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <FaBan className="text-rose-500 shrink-0" size={10} /> {stats.rejectedSyncs} Rejections
            </div>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base sm:text-lg border border-rose-100 shrink-0 ml-2">
            <FaShieldAlt />
          </div>
        </div>
      </div>

      {/* TABS HEADER (Horizontally swipeable on narrow screens) */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto no-scrollbar scroll-smooth flex-nowrap">
        <button
          onClick={() => {
            setActiveTab("hierarchy");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "hierarchy"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FaBuilding size={12} />
          <span>Head Office & Branches</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold ${
              activeTab === "hierarchy" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {hierarchy.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("users");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FaUser size={12} />
          <span>User Access & PCs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {usersList.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("downloads");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "downloads"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FaDownload size={12} />
          <span>Download Audit</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold ${
              activeTab === "downloads" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {downloadsData.total}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("syncs");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "syncs"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FaSyncAlt size={12} />
          <span>Sync Telemetry Logs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold ${
              activeTab === "syncs" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {syncsData.total}
          </span>
        </button>
      </div>

      {/* COMPREHENSIVE FILTER TOOLBAR (Adaptive Multi-screen Grid) */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search user, email, company, code, city, PC name, license..."
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Quick Clear Filter Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shrink-0"
            >
              <FaUndo size={10} /> Reset Filters
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5 pt-2.5 border-t border-slate-100">
          {/* 1. Company Filter */}
          <div>
            <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
              Enterprise Tenant
            </label>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                setSelectedCompanyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer truncate"
            >
              <option value="all">All Enterprises ({allCompanyOptions.length})</option>
              {allCompanyOptions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.isHead ? "🏢 (Head) " : "↳ (Branch) "}
                  {comp.name} [{comp.code}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Branch Classification */}
          <div>
            <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
              Branch Hierarchy
            </label>
            <select
              value={branchTypeFilter}
              onChange={(e) => {
                setBranchTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Branch Types</option>
              <option value="head">🏢 Head Offices Only</option>
              <option value="sub">↳ Sub-Branches Only</option>
            </select>
          </div>

          {/* 3. EXE Access Status */}
          <div>
            <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
              EXE Access Status
            </label>
            <select
              value={exeStatusFilter}
              onChange={(e) => {
                setExeStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Access Statuses</option>
              <option value="active">🟢 Active & Authorized</option>
              <option value="suspended">🔴 Suspended by Super Admin</option>
            </select>
          </div>

          {/* 4. Workstation Filter */}
          <div>
            <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
              PC Workstation State
            </label>
            <select
              value={workstationFilter}
              onChange={(e) => {
                setWorkstationFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Workstations</option>
              <option value="has_pc">💻 Has Paired PC</option>
              <option value="has_suspended_pc">🚫 Has Suspended PC</option>
              <option value="no_pc">⚠️ No PC Bound Yet</option>
            </select>
          </div>

          {/* 5. Sub-filter depending on Tab */}
          {activeTab === "downloads" ? (
            <div>
              <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                Package Format
              </label>
              <select
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="portable">Portable .EXE</option>
                <option value="setup">Installer Setup</option>
                <option value="zip">ZIP Archive</option>
              </select>
            </div>
          ) : activeTab === "syncs" ? (
            <div>
              <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                Sync Execution Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">All Execution States</option>
                <option value="success">✅ Success</option>
                <option value="failed">❌ Failed</option>
                <option value="rejected_suspended">🚫 Rejected (Suspended)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                Active Filter Summary
              </label>
              <div className="text-[11px] font-semibold text-slate-600 py-1.5 px-2 bg-slate-100 rounded-xl truncate">
                {activeTab === "hierarchy"
                  ? `🏢 ${filteredHierarchy.length} Head Office(s)`
                  : `👥 ${filteredUsers.length} Operator(s)`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Content Display */}
      {loading ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-12 sm:p-16 text-center shadow-2xs">
          <FaSyncAlt className="animate-spin text-indigo-600 text-3xl mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading Enterprise Telemetry & Sync Data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ENTERPRISE HIERARCHY TREE */}
          {activeTab === "hierarchy" && (
            <div className="space-y-3">
              {filteredHierarchy.length === 0 ? (
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center text-slate-500">
                  <FaBuilding className="text-4xl text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Enterprise Head Offices Found</p>
                  <p className="text-xs text-slate-400 mt-1">Try refining or resetting your filters</p>
                </div>
              ) : (
                filteredHierarchy.map((head) => {
                  const isExpanded = !!expandedBranches[head._id];
                  const hasSubs = head.subBranches && head.subBranches.length > 0;

                  return (
                    <div
                      key={head._id}
                      className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Head Office Card Header */}
                      <div className="p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 border-b border-slate-100">
                        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
                          <button
                            onClick={() => toggleExpand(head._id)}
                            className="mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                            title={isExpanded ? "Collapse sub-branches" : "Expand sub-branches"}
                          >
                            {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-black text-slate-900">{head.companyName}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                {head.companyCode || "CODE N/A"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shrink-0">
                                Head Office
                              </span>
                              {head.city && (
                                <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                                  📍 {head.city}
                                  {head.state ? `, ${head.state}` : ""}
                                </span>
                              )}
                            </div>

                            {/* Responsive Stats Rollup Chips */}
                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-3.5 mt-2 sm:mt-2.5 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] sm:text-xs bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg sm:rounded-none border border-slate-200/60 sm:border-0 truncate">
                                <FaCodeBranch className="text-indigo-600 shrink-0" size={11} />
                                {hasSubs ? `${head.subBranches?.length} Sub-Branch(es)` : "Standalone"}
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] sm:text-xs bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg sm:rounded-none border border-slate-200/60 sm:border-0 truncate">
                                <FaDownload className="text-sky-600 shrink-0" size={11} />
                                {head.rollupDownloads ?? head.totalDownloads} Downloads
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] sm:text-xs bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg sm:rounded-none border border-slate-200/60 sm:border-0 truncate">
                                <FaSyncAlt className="text-emerald-600 shrink-0" size={11} />
                                {head.rollupSyncs ?? head.totalSyncs} Sync Runs
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] sm:text-xs bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg sm:rounded-none border border-slate-200/60 sm:border-0 truncate">
                                <FaLaptop className="text-amber-600 shrink-0" size={11} />
                                {head.rollupDeviceCount ?? head.devices.length} Workstations
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Head Office Action & Details Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
                          <button
                            onClick={() => {
                              setSelectedCompanyDetails(head);
                              setDetailsTab("overview");
                            }}
                            className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FaEye size={11} /> View Company Details
                          </button>

                          {head.allUsersSuspended ? (
                            <button
                              onClick={() =>
                                handleAction({
                                  action: "restore_company_exe",
                                  companyId: head._id,
                                  includeSubBranches: true,
                                })
                              }
                              disabled={actionLoading}
                              className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <FaCheck size={11} /> Restore All EXE Access
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setSuspendModal({
                                  open: true,
                                  type: "company",
                                  targetId: head._id,
                                  targetName: `${head.companyName} (Head Office & Branches)`,
                                })
                              }
                              disabled={actionLoading}
                              className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/90 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <FaBan size={11} /> Suspend Company EXE
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Head Office Users & Authorized Workstations List */}
                      <div className="p-3.5 sm:p-5 space-y-4">
                        <div>
                          <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FaUser size={10} /> Head Office Users ({head.users.length})
                          </div>
                          {head.users.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">No users enrolled directly in Head Office</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                              {head.users.map((u) => (
                                <div
                                  key={u._id}
                                  className={`p-2.5 sm:p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                                    u.exeAccessSuspended
                                      ? "bg-rose-50/60 border-rose-200/80"
                                      : "bg-slate-50/70 border-slate-200/70"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                      <span className="truncate">{u.name || "Unknown"}</span>
                                      {u.exeAccessSuspended && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[9.5px] font-black bg-rose-600 text-white shrink-0">
                                          SUSPENDED
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-500 text-[11px] mt-0.5 truncate font-mono">{u.email}</div>
                                    {u.mobile && (
                                      <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">
                                        <FaPhone size={8} /> {u.mobile}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                    <button
                                      onClick={() => {
                                        setSelectedUserDetails(u);
                                        setDetailsTab("overview");
                                      }}
                                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-all cursor-pointer"
                                      title="View User Details"
                                    >
                                      <FaEye size={11} />
                                    </button>

                                    {u.exeAccessSuspended ? (
                                      <button
                                        onClick={() =>
                                          handleAction({
                                            action: "restore_user_exe",
                                            userId: u._id,
                                          })
                                        }
                                        disabled={actionLoading}
                                        className="px-2 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                                      >
                                        Restore
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setSuspendModal({
                                            open: true,
                                            type: "user",
                                            targetId: u._id,
                                            targetName: `${u.name} (${u.email})`,
                                          })
                                        }
                                        disabled={actionLoading}
                                        className="px-2 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-all cursor-pointer"
                                      >
                                        Suspend
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sub-Branches Accordion Display */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-100 space-y-3">
                            <div className="text-[10.5px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                              <FaCodeBranch size={11} /> Affiliated Sub-Branches ({head.subBranches?.length || 0})
                            </div>

                            {!hasSubs ? (
                              <div className="text-xs text-slate-400 italic pl-3 sm:pl-4">No child sub-branches registered under this Head Office.</div>
                            ) : (
                              <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-indigo-200">
                                {head.subBranches!.map((sub) => (
                                  <div
                                    key={sub._id}
                                    className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                          {sub.companyName}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
                                          {sub.companyCode}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                          Sub-Branch
                                        </span>
                                        {sub.city && (
                                          <span className="text-[10.5px] sm:text-[11px] text-slate-500">
                                            📍 {sub.city}
                                            {sub.state ? `, ${sub.state}` : ""}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2.5 sm:gap-3 mt-1.5 text-[10.5px] sm:text-[11px] text-slate-500 flex-wrap">
                                        <span>👥 {sub.users.length} Users</span>
                                        <span>📥 {sub.totalDownloads} Downloads</span>
                                        <span>🔄 {sub.totalSyncs} Syncs</span>
                                        <span>💻 {sub.devices.length} Workstations</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                      <button
                                        onClick={() => {
                                          setSelectedCompanyDetails(sub);
                                          setDetailsTab("overview");
                                        }}
                                        className="px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <FaEye size={10} /> Details
                                      </button>

                                      {sub.allUsersSuspended ? (
                                        <button
                                          onClick={() =>
                                            handleAction({
                                              action: "restore_company_exe",
                                              companyId: sub._id,
                                              includeSubBranches: false,
                                            })
                                          }
                                          disabled={actionLoading}
                                          className="px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                                        >
                                          Restore EXE
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            setSuspendModal({
                                              open: true,
                                              type: "company",
                                              targetId: sub._id,
                                              targetName: `${sub.companyName} (Sub-Branch)`,
                                            })
                                          }
                                          disabled={actionLoading}
                                          className="px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-all cursor-pointer"
                                        >
                                          Suspend EXE
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: USER ACCESS & WORKSTATIONS */}
          {activeTab === "users" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-700">
                  Showing {filteredUsers.length} Enterprise Operators
                </span>
                {hasActiveFilters && (
                  <span className="text-slate-500 text-[11px]">Filtered from total {usersList.length} users</span>
                )}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400">
                  <FaUser className="text-3xl text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No matching enterprise operators found.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing or adjusting your search filters.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (lg screens and wider) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                          <th className="py-3 px-4">Operator User</th>
                          <th className="py-3 px-4">Enterprise Branch</th>
                          <th className="py-3 px-4">EXE Access Status</th>
                          <th className="py-3 px-4">Workstation PCs Bound</th>
                          <th className="py-3 px-4 text-center">Activity</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-slate-500 text-[11px] font-mono">{u.email}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {u.mobile && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <FaPhone size={8} /> {u.mobile}
                                  </span>
                                )}
                                <span className="text-[10px] text-indigo-600 font-semibold uppercase">{u.role}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{u.companyName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-400 font-mono">{u.companyCode}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                                  {u.companyDetails?.isHeadOffice !== false ? "Head Office" : "Sub-Branch"}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {u.exeAccessSuspended ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <FaBan size={9} /> Suspended by Super Admin
                                  </span>
                                  {u.exeSuspendedReason && (
                                    <div className="text-[10.5px] text-rose-600 max-w-xs leading-snug">
                                      {u.exeSuspendedReason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FaCheckCircle size={9} /> Active & Authorized
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {!u.devices || u.devices.length === 0 ? (
                                <span className="text-slate-400 italic text-[11px]">No machines bound yet</span>
                              ) : (
                                <div className="space-y-1">
                                  {u.devices.map((d: any, i: number) => (
                                    <div
                                      key={d.deviceId || i}
                                      className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border text-[11px] ${
                                        d.status === "suspended"
                                          ? "bg-rose-50/70 border-rose-200 text-rose-800"
                                          : "bg-slate-50 border-slate-200 text-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <FaDesktop
                                          className={d.status === "suspended" ? "text-rose-500" : "text-slate-500"}
                                          size={10}
                                        />
                                        <span className="font-semibold truncate">
                                          {d.deviceName || d.deviceId || "Operator PC"}
                                        </span>
                                      </div>

                                      {d.status === "suspended" ? (
                                        <button
                                          onClick={() =>
                                            handleAction({
                                              action: "restore_device",
                                              deviceId: d.deviceId,
                                              licenseKey: u.licenseKey,
                                            })
                                          }
                                          disabled={actionLoading}
                                          className="text-[10px] text-emerald-700 hover:underline font-bold shrink-0 cursor-pointer"
                                        >
                                          Restore PC
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleAction({
                                              action: "suspend_device",
                                              deviceId: d.deviceId,
                                              licenseKey: u.licenseKey,
                                              reason: "Machine suspended by Super Admin",
                                            })
                                          }
                                          disabled={actionLoading}
                                          className="text-[10px] text-rose-700 hover:underline font-bold shrink-0 cursor-pointer"
                                        >
                                          Suspend PC
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="text-slate-800 font-bold">{u.totalSyncs} Syncs</div>
                              <div className="text-[11px] text-slate-400">{u.totalDownloads} Downloads</div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedUserDetails(u);
                                    setDetailsTab("overview");
                                  }}
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                                  title="View Complete Details"
                                >
                                  <FaEye size={10} /> Details
                                </button>

                                {u.exeAccessSuspended ? (
                                  <button
                                    onClick={() =>
                                      handleAction({
                                        action: "restore_user_exe",
                                        userId: u._id,
                                      })
                                    }
                                    disabled={actionLoading}
                                    className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setSuspendModal({
                                        open: true,
                                        type: "user",
                                        targetId: u._id,
                                        targetName: `${u.name} (${u.email})`,
                                      })
                                    }
                                    disabled={actionLoading}
                                    className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & Tablet Card View (screens < lg) */}
                  <div className="block lg:hidden divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <div key={u._id} className="p-3.5 sm:p-4 space-y-3 bg-white">
                        {/* Operator Name, Role & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{u.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                                {u.role}
                              </span>
                            </div>
                            <div className="text-slate-500 text-xs font-mono mt-0.5 break-all">{u.email}</div>
                            {u.mobile && (
                              <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                                <FaPhone size={9} /> {u.mobile}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            {u.exeAccessSuspended ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <FaBan size={9} /> Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <FaCheckCircle size={9} /> Active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Suspension Reason (if suspended) */}
                        {u.exeAccessSuspended && u.exeSuspendedReason && (
                          <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] text-rose-700">
                            <span className="font-semibold">Reason:</span> {u.exeSuspendedReason}
                          </div>
                        )}

                        {/* Company & Activity Snippet */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs gap-2">
                          <div className="min-w-0">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Company / Branch</span>
                            <span className="font-semibold text-slate-800 truncate block">{u.companyName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">[{u.companyCode}] · {u.companyDetails?.isHeadOffice !== false ? "Head Office" : "Sub-Branch"}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Activity</span>
                            <span className="font-bold text-slate-800">{u.totalSyncs} Syncs</span>
                            <span className="text-slate-500 text-[10.5px] block">{u.totalDownloads} Downloads</span>
                          </div>
                        </div>

                        {/* Workstations List */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Workstations ({u.devices?.length || 0})</span>
                            {u.licenseKey && (
                              <span className="font-mono text-[10px] text-amber-800 truncate max-w-[170px]">
                                Key: {u.licenseKey}
                              </span>
                            )}
                          </div>

                          {!u.devices || u.devices.length === 0 ? (
                            <div className="text-slate-400 italic text-[11px] py-1">No workstation PCs bound yet</div>
                          ) : (
                            <div className="space-y-1.5">
                              {u.devices.map((d: any, i: number) => (
                                <div
                                  key={d.deviceId || i}
                                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                                    d.status === "suspended"
                                      ? "bg-rose-50/70 border-rose-200 text-rose-800"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <FaDesktop
                                      className={d.status === "suspended" ? "text-rose-500 shrink-0" : "text-slate-500 shrink-0"}
                                      size={11}
                                    />
                                    <span className="font-semibold truncate">
                                      {d.deviceName || d.deviceId || "Operator PC"}
                                    </span>
                                  </div>

                                  {d.status === "suspended" ? (
                                    <button
                                      onClick={() =>
                                        handleAction({
                                          action: "restore_device",
                                          deviceId: d.deviceId,
                                          licenseKey: u.licenseKey,
                                        })
                                      }
                                      disabled={actionLoading}
                                      className="text-xs text-emerald-700 hover:underline font-bold shrink-0 cursor-pointer"
                                    >
                                      Restore PC
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleAction({
                                          action: "suspend_device",
                                          deviceId: d.deviceId,
                                          licenseKey: u.licenseKey,
                                          reason: "Machine suspended by Super Admin",
                                        })
                                      }
                                      disabled={actionLoading}
                                      className="text-xs text-rose-700 hover:underline font-bold shrink-0 cursor-pointer"
                                    >
                                      Suspend PC
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserDetails(u);
                              setDetailsTab("overview");
                            }}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FaEye size={12} /> View Details
                          </button>

                          {u.exeAccessSuspended ? (
                            <button
                              onClick={() =>
                                handleAction({
                                  action: "restore_user_exe",
                                  userId: u._id,
                                })
                              }
                              disabled={actionLoading}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer text-center"
                            >
                              Restore EXE
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setSuspendModal({
                                  open: true,
                                  type: "user",
                                  targetId: u._id,
                                  targetName: `${u.name} (${u.email})`,
                                })
                              }
                              disabled={actionLoading}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer text-center"
                            >
                              Suspend EXE
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: DOWNLOAD AUDIT TRAIL */}
          {activeTab === "downloads" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {downloadsData.docs.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400">
                  <FaDownload className="text-3xl text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No download audit logs recorded yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Company / Branch</th>
                          <th className="py-3 px-4">Format</th>
                          <th className="py-3 px-4">Client IP & OS</th>
                          <th className="py-3 px-4">Version</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {downloadsData.docs.map((d: any) => (
                          <tr key={d._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {new Date(d.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{d.userName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{d.userEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{d.companyName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">{d.companyCode}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700">
                                  {d.isHeadOffice ? "Head Office" : "Sub-Branch"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                                {d.downloadFormat}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-[11px] text-slate-700">{d.ipAddress}</div>
                              <div className="text-[10.5px] text-slate-500 truncate max-w-xs">{d.os || "Windows"}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">v{d.version || "1.0.0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & Tablet Card View */}
                  <div className="block lg:hidden divide-y divide-slate-100">
                    {downloadsData.docs.map((d: any) => (
                      <div key={d._id} className="p-3.5 space-y-2 bg-white text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{d.userName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{d.userEmail}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                            {d.downloadFormat}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-50">
                          <span className="truncate">{d.companyName} [{d.companyCode}]</span>
                          <span className="font-mono shrink-0 ml-2">v{d.version || "1.0.0"}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                          <span>IP: {d.ipAddress}</span>
                          <span>{new Date(d.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination (Responsive) */}
              {downloadsData.totalPages > 1 && (
                <div className="p-3 sm:p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 text-center sm:text-left">
                    Showing Page {downloadsData.page} of {downloadsData.totalPages} ({downloadsData.total} items)
                  </span>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(downloadsData.totalPages, p + 1))}
                      disabled={page >= downloadsData.totalPages}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL-TIME SYNC LOGS & TELEMETRY */}
          {activeTab === "syncs" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {syncsData.docs.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400">
                  <FaSyncAlt className="text-3xl text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No sync operations recorded yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                          <th className="py-3 px-4">Started At</th>
                          <th className="py-3 px-4">Company & Branch</th>
                          <th className="py-3 px-4">User & Machine</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Tables & Rows</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {syncsData.docs.map((s: any) => (
                          <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {new Date(s.startedAt).toLocaleString()}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{s.companyName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">{s.companyCode}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700">
                                  {s.isHeadOffice ? "Head Office" : "Sub-Branch"}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{s.userName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{s.userEmail}</div>
                              {s.deviceName && (
                                <div className="text-[10.5px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <FaDesktop size={9} /> {s.deviceName}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {s.status === "success" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FaCheckCircle size={9} /> Success
                                </span>
                              )}
                              {s.status === "failed" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <FaTimesCircle size={9} /> Failed
                                </span>
                              )}
                              {s.status === "rejected_suspended" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <FaBan size={9} /> Rejected (Suspended)
                                </span>
                              )}
                              {s.status === "running" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                                  <FaSyncAlt size={9} className="animate-spin" /> In Progress
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">
                                {(s.totalRecords || 0).toLocaleString()} Rows
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {(s.tablesSynced || []).length} Table(s)
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {s.durationSeconds ? `${s.durationSeconds}s` : "< 1s"}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedSyncRecord(s)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-all cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & Tablet Card View */}
                  <div className="block lg:hidden divide-y divide-slate-100">
                    {syncsData.docs.map((s: any) => (
                      <div key={s._id} className="p-3.5 space-y-2.5 bg-white text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{s.companyName}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{s.userName} ({s.userEmail})</div>
                          </div>

                          <div className="shrink-0">
                            {s.status === "success" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <FaCheckCircle size={8} /> Success
                              </span>
                            )}
                            {s.status === "failed" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <FaTimesCircle size={8} /> Failed
                              </span>
                            )}
                            {s.status === "rejected_suspended" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <FaBan size={8} /> Rejected
                              </span>
                            )}
                            {s.status === "running" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                                <FaSyncAlt size={8} className="animate-spin" /> In Progress
                              </span>
                            )}
                          </div>
                        </div>

                        {s.deviceName && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate font-mono">
                            <FaDesktop size={9} className="text-slate-400 shrink-0" /> {s.deviceName} ({s.deviceId})
                          </div>
                        )}

                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{(s.totalRecords || 0).toLocaleString()} Rows</span>
                            <span className="text-slate-500 ml-1.5">({(s.tablesSynced || []).length} Tables)</span>
                          </div>
                          <span className="font-mono text-slate-500">
                            {s.durationSeconds ? `${s.durationSeconds}s` : "< 1s"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(s.startedAt).toLocaleString()}
                          </span>
                          <button
                            onClick={() => setSelectedSyncRecord(s)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                          >
                            Inspect Run
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination (Responsive) */}
              {syncsData.totalPages > 1 && (
                <div className="p-3 sm:p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 text-center sm:text-left">
                    Showing Page {syncsData.page} of {syncsData.totalPages} ({syncsData.total} items)
                  </span>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(syncsData.totalPages, p + 1))}
                      disabled={page >= syncsData.totalPages}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 1. DEDICATED USER DETAILS MODAL / PAGE (100% Mobile & Monitor Responsive) */}
      {/* ========================================================================= */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Sticky) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
                  <FaUser />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                    {selectedUserDetails.name || "Operator Details"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 break-all">{selectedUserDetails.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 ml-2"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Suspension Banner if Suspended */}
              {selectedUserDetails.exeAccessSuspended && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <FaBan className="shrink-0" /> Desktop Agent (.EXE) Sync Access is Suspended
                  </div>
                  {selectedUserDetails.exeSuspendedReason && (
                    <p className="text-[11.5px] text-rose-700 leading-relaxed">
                      <span className="font-semibold">Reason:</span> {selectedUserDetails.exeSuspendedReason}
                    </p>
                  )}
                  {selectedUserDetails.exeSuspendedAt && (
                    <p className="text-[10.5px] text-rose-500">
                      Enforced at: {new Date(selectedUserDetails.exeSuspendedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Details Tabs inside Modal (Swipeable on Mobile) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth flex-nowrap">
                {[
                  { id: "overview", label: "Profile & Company", icon: FaBuilding },
                  { id: "workstations", label: `Workstations (${selectedUserDetails.devices?.length || 0})`, icon: FaLaptop },
                  { id: "syncs", label: `Syncs (${selectedUserDetails.totalSyncs || 0})`, icon: FaSyncAlt },
                  { id: "downloads", label: `Downloads (${selectedUserDetails.totalDownloads || 0})`, icon: FaDownload },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setDetailsTab(t.id as any)}
                      className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        detailsTab === t.id
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={11} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Profile & Company Overview */}
              {detailsTab === "overview" && (
                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        User Credentials & Role
                      </div>
                      <div>
                        <span className="text-slate-500">Role:</span>{" "}
                        <span className="font-bold text-indigo-700 uppercase">{selectedUserDetails.role}</span>
                      </div>
                      {selectedUserDetails.designation && (
                        <div>
                          <span className="text-slate-500">Designation:</span>{" "}
                          <span className="font-semibold text-slate-800">{selectedUserDetails.designation}</span>
                        </div>
                      )}
                      {selectedUserDetails.employeeCode && (
                        <div>
                          <span className="text-slate-500">Employee Code:</span>{" "}
                          <span className="font-mono font-semibold text-slate-800">{selectedUserDetails.employeeCode}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Mobile Phone:</span>{" "}
                        <span className="font-semibold text-slate-800">{selectedUserDetails.mobile || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>{" "}
                        <span className="font-semibold text-emerald-700">{selectedUserDetails.status || "Active"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Assigned Enterprise Branch
                      </div>
                      <div>
                        <span className="text-slate-500">Company:</span>{" "}
                        <span className="font-bold text-slate-900">{selectedUserDetails.companyName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Company Code:</span>{" "}
                        <span className="font-mono font-bold text-indigo-700">{selectedUserDetails.companyCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Branch Type:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {selectedUserDetails.companyDetails?.isHeadOffice !== false ? "Head Office" : "Sub-Branch"}
                        </span>
                      </div>
                      {selectedUserDetails.companyDetails?.city && (
                        <div>
                          <span className="text-slate-500">Location:</span>{" "}
                          <span className="font-semibold text-slate-800">
                            {selectedUserDetails.companyDetails.city}
                            {selectedUserDetails.companyDetails.state ? `, ${selectedUserDetails.companyDetails.state}` : ""}
                          </span>
                        </div>
                      )}
                      {selectedUserDetails.companyDetails?.address && (
                        <div>
                          <span className="text-slate-500">Address:</span>{" "}
                          <span className="text-slate-700 leading-snug">{selectedUserDetails.companyDetails.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* License Key Card */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <FaKey size={10} /> Sync License Key
                      </span>
                      <span className="text-[10.5px] font-bold text-amber-900">
                        Status: {selectedUserDetails.licenseStatus || "Active"}
                      </span>
                    </div>
                    <p className="font-mono text-xs font-bold text-amber-950 mt-1 break-all">
                      {selectedUserDetails.licenseKey || "No License Key assigned"}
                    </p>
                    {selectedUserDetails.licenseExpiresAt && (
                      <p className="text-[10.5px] text-amber-700 mt-0.5">
                        Expires At: {new Date(selectedUserDetails.licenseExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Workstations */}
              {detailsTab === "workstations" && (
                <div className="space-y-2.5 text-xs">
                  {(!selectedUserDetails.devices || selectedUserDetails.devices.length === 0) ? (
                    <div className="text-center py-8 text-slate-400 italic">
                      <FaLaptop className="text-3xl mx-auto mb-2 text-slate-300" />
                      No workstation PCs currently bound to this operator.
                    </div>
                  ) : (
                    selectedUserDetails.devices.map((dev: any, i: number) => (
                      <div
                        key={dev.deviceId || i}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FaDesktop className={dev.status === "suspended" ? "text-rose-500 shrink-0" : "text-slate-600 shrink-0"} />
                            <span className="font-bold text-slate-900">{dev.deviceName || "Operator Workstation"}</span>
                            {dev.status === "suspended" ? (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-rose-600 text-white shrink-0">
                                SUSPENDED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10.5px] text-slate-500 break-all">Device ID: {dev.deviceId}</div>
                          {dev.lastSeenAt && (
                            <div className="text-[10.5px] text-slate-400">
                              Last Connected: {new Date(dev.lastSeenAt).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 w-full sm:w-auto">
                          {dev.status === "suspended" ? (
                            <button
                              onClick={() =>
                                handleAction({
                                  action: "restore_device",
                                  deviceId: dev.deviceId,
                                  licenseKey: selectedUserDetails.licenseKey,
                                })
                              }
                              disabled={actionLoading}
                              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer flex items-center"
                            >
                              Restore PC
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleAction({
                                  action: "suspend_device",
                                  deviceId: dev.deviceId,
                                  licenseKey: selectedUserDetails.licenseKey,
                                  reason: "Workstation suspended by Super Admin",
                                })
                              }
                              disabled={actionLoading}
                              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-all cursor-pointer flex items-center"
                            >
                              Suspend PC
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Recent Syncs */}
              {detailsTab === "syncs" && (
                <div className="space-y-2 text-xs">
                  {(!selectedUserDetails.recentSyncs || selectedUserDetails.recentSyncs.length === 0) ? (
                    <div className="text-center py-8 text-slate-400 italic">No sync records found for this user.</div>
                  ) : (
                    selectedUserDetails.recentSyncs.map((s: any) => (
                      <div
                        key={s._id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {new Date(s.startedAt).toLocaleString()}
                          </div>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {(s.totalRecords || 0).toLocaleString()} Rows · {(s.tablesSynced || []).length} Table(s)
                          </div>
                        </div>
                        <span
                          className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : s.status === "failed"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Recent Downloads */}
              {detailsTab === "downloads" && (
                <div className="space-y-2 text-xs">
                  {(!selectedUserDetails.recentDownloads || selectedUserDetails.recentDownloads.length === 0) ? (
                    <div className="text-center py-8 text-slate-400 italic">No download records found for this user.</div>
                  ) : (
                    selectedUserDetails.recentDownloads.map((d: any) => (
                      <div
                        key={d._id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {new Date(d.createdAt).toLocaleString()}
                          </div>
                          <div className="font-bold text-slate-800 mt-0.5">
                            Format: <span className="uppercase text-sky-700">{d.downloadFormat}</span> · IP: {d.ipAddress}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-slate-500">v{d.version || "1.0.0"}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions (Sticky Footer) */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div>
                {selectedUserDetails.exeAccessSuspended ? (
                  <button
                    onClick={() =>
                      handleAction({
                        action: "restore_user_exe",
                        userId: selectedUserDetails._id,
                      })
                    }
                    disabled={actionLoading}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCheck size={12} /> Restore User EXE Access
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setSuspendModal({
                        open: true,
                        type: "user",
                        targetId: selectedUserDetails._id,
                        targetName: `${selectedUserDetails.name} (${selectedUserDetails.email})`,
                      })
                    }
                    disabled={actionLoading}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FaBan size={12} /> Suspend User EXE Access
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedUserDetails(null)}
                className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-center"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEDICATED COMPANY DETAILS MODAL / PAGE (Responsive)                    */}
      {/* ========================================================================= */}
      {selectedCompanyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Sticky) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
                  <FaBuilding />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {selectedCompanyDetails.companyName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      {selectedCompanyDetails.companyCode}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-slate-900 text-white shrink-0">
                      {selectedCompanyDetails.isHeadOffice !== false ? "Head Office" : "Sub-Branch"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📍 {selectedCompanyDetails.city || "City N/A"}
                    {selectedCompanyDetails.state ? `, ${selectedCompanyDetails.state}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 ml-2"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Corporate & Compliance Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Registration & Contact
                  </div>
                  <div>
                    <span className="text-slate-500">Contact Person / Owner:</span>{" "}
                    <span className="font-bold text-slate-800">{selectedCompanyDetails.ownerName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Official Email:</span>{" "}
                    <span className="font-mono text-slate-800 break-all">{selectedCompanyDetails.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone Number:</span>{" "}
                    <span className="font-semibold text-slate-800">{selectedCompanyDetails.mobile || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Website:</span>{" "}
                    <span className="text-indigo-600 hover:underline break-all">{selectedCompanyDetails.website || "N/A"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tax & Regulatory Compliances
                  </div>
                  <div>
                    <span className="text-slate-500">GSTIN No:</span>{" "}
                    <span className="font-mono font-bold text-slate-900">{selectedCompanyDetails.gstNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">PAN Card No:</span>{" "}
                    <span className="font-mono font-semibold text-slate-800">{selectedCompanyDetails.panNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Drug License No:</span>{" "}
                    <span className="font-mono text-slate-800">{selectedCompanyDetails.drugLicenseNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Complete Address:</span>{" "}
                    <span className="text-slate-700 leading-snug">
                      {selectedCompanyDetails.address || "No street address recorded"}
                      {selectedCompanyDetails.pincode ? ` - ${selectedCompanyDetails.pincode}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Telemetry Stats for this Company (Adaptive Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-center text-xs">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                  <div className="text-[10px] sm:text-[10.5px] font-bold text-sky-700 uppercase">Downloads</div>
                  <div className="text-lg sm:text-xl font-black text-sky-900 mt-1">{selectedCompanyDetails.totalDownloads}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-[10px] sm:text-[10.5px] font-bold text-emerald-700 uppercase">Total Syncs</div>
                  <div className="text-lg sm:text-xl font-black text-emerald-900 mt-1">{selectedCompanyDetails.totalSyncs}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-[10px] sm:text-[10.5px] font-bold text-amber-700 uppercase">Workstations</div>
                  <div className="text-lg sm:text-xl font-black text-amber-900 mt-1">{selectedCompanyDetails.devices?.length || 0}</div>
                </div>
              </div>

              {/* Users enrolled under this company */}
              <div>
                <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Enrolled Enterprise Users ({selectedCompanyDetails.users?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(selectedCompanyDetails.users || []).map((u: any) => (
                    <div
                      key={u._id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900">{u.name}</span>
                        <span className="text-slate-500 ml-1.5 font-mono text-[11px]">{u.email}</span>
                        <span className="ml-1.5 uppercase text-[10px] text-indigo-700 font-semibold">{u.role}</span>
                      </div>

                      <div className="self-start sm:self-auto shrink-0">
                        {u.exeAccessSuspended ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions (Sticky Footer) */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div>
                {selectedCompanyDetails.allUsersSuspended ? (
                  <button
                    onClick={() =>
                      handleAction({
                        action: "restore_company_exe",
                        companyId: selectedCompanyDetails._id,
                        includeSubBranches: true,
                      })
                    }
                    disabled={actionLoading}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCheck size={12} /> Restore All Branch EXE Access
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setSuspendModal({
                        open: true,
                        type: "company",
                        targetId: selectedCompanyDetails._id,
                        targetName: `${selectedCompanyDetails.companyName}`,
                      })
                    }
                    disabled={actionLoading}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FaBan size={12} /> Suspend All Branch EXE Access
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-center"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUSPEND CONFIRMATION MODAL (Responsive)                                */}
      {/* ========================================================================= */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg shrink-0">
                  <FaBan />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Suspend EXE Sync Access
                  </h3>
                  <p className="text-xs text-slate-500">
                    Immediate kill-switch enforcement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <p className="font-bold break-words">Target: {suspendModal.targetName}</p>
                <p className="mt-1 text-[11px] text-rose-700 leading-relaxed">
                  Suspending will immediately block downloads, reject ongoing & scheduled sync heartbeats, and forbid database transfers on this account.
                </p>
              </div>

              {suspendModal.type === "company" && (
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSubBranches}
                    onChange={(e) => setIncludeSubBranches(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Cascade suspension to all child sub-branches as well</span>
                </label>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Suspension (Visible to User & Audit)
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g., Subscription payment pending, Security audit in progress, or Branch deactivated."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white resize-none h-20"
                />
              </div>

              {/* Quick Reason Templates */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Preset Reasons:
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Payment pending",
                    "License validity expired",
                    "Security audit pending",
                    "Branch deactivated",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSuspensionReason(preset)}
                      className="px-2.5 py-1 rounded-md text-[10.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSuspendModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  if (suspendModal.type === "user") {
                    handleAction({
                      action: "suspend_user_exe",
                      userId: suspendModal.targetId,
                      reason: suspensionReason,
                    });
                  } else if (suspendModal.type === "company") {
                    handleAction({
                      action: "suspend_company_exe",
                      companyId: suspendModal.targetId,
                      reason: suspensionReason,
                      includeSubBranches,
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Enforcing..." : "Confirm & Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SYNC RECORD INSPECTOR MODAL (Responsive)                               */}
      {/* ========================================================================= */}
      {selectedSyncRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">
                  <FaEye />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">Sync Execution Telemetry</h3>
                  <p className="text-xs text-slate-500 font-mono truncate">Run ID: {selectedSyncRecord.runId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSyncRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 shrink-0 ml-2"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Enterprise</span>
                  <p className="font-bold text-slate-800 break-words">{selectedSyncRecord.companyName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Company Code</span>
                  <p className="font-mono text-slate-800">{selectedSyncRecord.companyCode}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Operator User</span>
                  <p className="font-semibold text-slate-800">{selectedSyncRecord.userName}</p>
                  <p className="text-[10.5px] text-slate-500 font-mono break-all">{selectedSyncRecord.userEmail}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Machine Workstation</span>
                  <p className="font-semibold text-slate-800">{selectedSyncRecord.deviceName || "N/A"}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{selectedSyncRecord.deviceId}</p>
                </div>
              </div>

              {selectedSyncRecord.licenseKey && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                  <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                    <FaKey size={10} /> Authorized License Key
                  </span>
                  <p className="font-mono text-xs text-amber-950 font-bold mt-0.5 break-all">{selectedSyncRecord.licenseKey}</p>
                </div>
              )}

              {selectedSyncRecord.error && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                    <FaTimesCircle size={10} /> Error / Suspension Log
                  </span>
                  <p className="text-xs text-rose-700 font-medium mt-0.5 break-words">{selectedSyncRecord.error}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Tables Synced ({selectedSyncRecord.tablesSynced?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedSyncRecord.tablesSynced || []).length === 0 ? (
                    <span className="text-slate-400 italic">No individual tables listed</span>
                  ) : (
                    selectedSyncRecord.tablesSynced.map((tbl: string) => (
                      <span
                        key={tbl}
                        className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {tbl}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white text-right shrink-0">
              <button
                onClick={() => setSelectedSyncRecord(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

