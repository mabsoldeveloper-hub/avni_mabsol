"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaShieldAlt,
  FaHospital,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaKey,
  FaCalendarAlt,
  FaUserCheck,
  FaMapMarkerAlt,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaCheck,
  FaTimes,
  FaSync,
  FaBoxes,
  FaPlus,
  FaMinus,
  FaExclamationTriangle,
  FaCodeBranch,
  FaTrash,
  FaUndo,
  FaBuilding,
  FaExternalLinkAlt,
  FaSlidersH,
  FaLayerGroup,
  FaCopy,
  FaEye,
  FaPowerOff,
} from "react-icons/fa";
import {
  DEFAULT_ACCESS_DAYS,
  SUPER_ADMIN_SIDEBAR_MODULES,
  ALL_SIDEBAR_MODULE_IDS,
} from "@/lib/constants/superAdmin.constant";
import { SESSION_TIMEOUT_PRESETS, DEFAULT_USER_SESSION_HOURS } from "@/lib/constants/session.constant";

function getRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export default function TenantApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedSessionHours, setSelectedSessionHours] = useState<number>(DEFAULT_USER_SESSION_HOURS);
  const [customSessionHours, setCustomSessionHours] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [enabledModules, setEnabledModules] = useState<string[]>([...ALL_SIDEBAR_MODULE_IDS]);
  const [approvalModuleSearch, setApprovalModuleSearch] = useState<string>("");
  const [approvalCategoryFilter, setApprovalCategoryFilter] = useState<string>("ALL");
  const [expandedApprovalModId, setExpandedApprovalModId] = useState<string | null>(null);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);

  // Overview Module clips filter state
  const [overviewModuleClipFilter, setOverviewModuleClipFilter] = useState<"all" | "granted" | "stopped">("all");

  // Track initial saved values to enable Save button only on actual changes
  const [initialSessionHours, setInitialSessionHours] = useState<number>(DEFAULT_USER_SESSION_HOURS);

  // Modal states for subscription days management (Give / Remove Days)
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [adjustmentAction, setAdjustmentAction] = useState<"add" | "remove">("add");
  const [adjustmentDays, setAdjustmentDays] = useState<number>(30);
  const [adjustmentInput, setAdjustmentInput] = useState<string>("30");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Sub-branch full dossier & actions state
  const [selectedSubBranch, setSelectedSubBranch] = useState<any | null>(null);
  const [selectedSubBranchModules, setSelectedSubBranchModules] = useState<string[]>([]);
  const [branchActionLoading, setBranchActionLoading] = useState<string | null>(null);
  const [batchBranchLoading, setBatchBranchLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "branches" | "all">("overview");

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`);
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        const sess = data.user.sessionTimeoutHours || DEFAULT_USER_SESSION_HOURS;
        setSelectedSessionHours(sess);
        setCustomSessionHours("");
        setInitialSessionHours(sess);
        setNotes(data.user.approvalNotes || "");
        if (Array.isArray(data.user.enabledModules)) {
          setEnabledModules(data.user.enabledModules);
        } else if (Array.isArray(data.user.companyId?.enabledModules)) {
          setEnabledModules(data.user.companyId.enabledModules);
        } else {
          setEnabledModules([...ALL_SIDEBAR_MODULE_IDS]);
        }
      } else {
        setError(data.message || "Failed to load tenant record");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred fetching tenant details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const toggleModule = (modId: string) => {
    setEnabledModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const copyToClipboard = (text: string) => {
    if (!text || text === "N/A") return;
    navigator.clipboard.writeText(text);
  };

  // Determine if there are unsaved changes
  const currentEffectiveHours = customSessionHours && !isNaN(Number(customSessionHours))
    ? Math.max(1, Number(customSessionHours))
    : selectedSessionHours;
  const userModules = Array.isArray(user?.enabledModules)
    ? user.enabledModules
    : Array.isArray(user?.companyId?.enabledModules)
    ? user.companyId.enabledModules
    : ALL_SIDEBAR_MODULE_IDS;
  const modulesChanged = JSON.stringify([...enabledModules].sort()) !== JSON.stringify([...userModules].sort());
  const isDirty = !user?.isApproved || currentEffectiveHours !== initialSessionHours || modulesChanged;

  const handleAction = async (
    action: "approve" | "update_settings" | "extend" | "reject" | "suspend" | "activate"
  ) => {
    setActionLoading(true);
    try {
      let finalSessionHours = selectedSessionHours;
      if (customSessionHours && !isNaN(Number(customSessionHours))) {
        finalSessionHours = Math.max(1, Number(customSessionHours));
      }

      const body: any = {
        action,
        sessionTimeoutHours: finalSessionHours,
        enabledModules,
      };

      if (action === "approve") {
        body.durationDays = user?.accessDurationDays || DEFAULT_ACCESS_DAYS;
      }
      if (notes) {
        body.approvalNotes = notes;
      }

      const res = await fetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchUser();
        alert(
          action === "approve"
            ? "Tenant account successfully approved and clearance granted!"
            : action === "reject"
            ? "Account registration rejected."
            : action === "suspend"
            ? "Account suspended. Active sessions revoked."
            : "Settings saved successfully."
        );
      } else {
        alert(data.message || "Failed to perform action");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const reason = window.prompt(
      `Delete account "${user?.companyId?.companyName || user?.name}"?\nEnter reason for deletion:`,
      "Decommissioned by Super Admin"
    );
    if (reason === null) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", notes: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Account deleted and moved to Deleted Accounts (visible exclusively to Super Admin).");
        await fetchUser();
      } else {
        alert(data.message || "Failed to delete account");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete account");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(`Restore account "${user?.companyId?.companyName || user?.name}"? This will re-enable access.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Account restored successfully.");
        await fetchUser();
      } else {
        alert(data.message || "Failed to restore account");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to restore account");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (
      !window.confirm(
        `WARNING: PERMANENTLY PURGE account "${user?.companyId?.companyName || user?.name}" and its company record from MongoDB?\nThis CANNOT be undone.`
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${id}?permanent=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("Account permanently purged from database.");
        router.push("/dashboard/super-admin/deleted");
      } else {
        alert(data.message || "Failed to purge account");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to purge account");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit subscription days update from the modal (Give Days or Remove Days)
  const handleUpdateSubscription = async () => {
    const days = Number(adjustmentInput) || adjustmentDays;
    if (!days || days <= 0) {
      alert("Please specify a valid number of days (greater than 0)");
      return;
    }

    setModalSubmitting(true);
    try {
      const deltaDays = adjustmentAction === "add" ? days : -days;
      const res = await fetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_days",
          durationDays: deltaDays,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchUser();
        setShowDaysModal(false);
        alert(
          adjustmentAction === "add"
            ? `Successfully given +${days} days to subscription!`
            : `Successfully removed -${days} days from subscription!`
        );
      } else {
        alert(data.message || "Failed to update subscription days");
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error updating subscription");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open subscription days modal with preset action
  const openDaysModal = (action: "add" | "remove") => {
    setAdjustmentAction(action);
    setAdjustmentDays(30);
    setAdjustmentInput("30");
    setShowDaysModal(true);
  };

  // Sub-branch handlers: Toggle status (Suspend / Activate)
  const handleToggleBranchStatus = async (branch: any) => {
    const isCurrentlyActive = branch.status === "Active";
    const newStatus = isCurrentlyActive ? "Suspended" : "Active";
    const confirmMsg = isCurrentlyActive
      ? `Suspend branch "${branch.companyName}" (${branch.companyCode || "BRANCH"})?\nAll user logins under this branch will be paused.`
      : `Reactivate branch "${branch.companyName}" (${branch.companyCode || "BRANCH"})?`;
    if (!window.confirm(confirmMsg)) return;

    setBranchActionLoading(branch._id);
    try {
      const res = await fetch(`/api/super-admin/branches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: branch._id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Branch status updated to ${newStatus}.`);
        await fetchUser();
        if (selectedSubBranch && selectedSubBranch._id === branch._id) {
          setSelectedSubBranch((prev: any) => ({ ...prev, status: newStatus }));
        }
      } else {
        alert(data.message || "Failed to update branch status");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update branch status");
    } finally {
      setBranchActionLoading(null);
    }
  };

  // Batch Suspend All Branches
  const handleBatchSuspendAllBranches = async (childBranches: any[]) => {
    if (!childBranches || childBranches.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to SUSPEND ALL (${childBranches.length}) connected sub-branches?\nThis will stop CRM access across all branch locations.`
      )
    ) {
      return;
    }
    setBatchBranchLoading(true);
    try {
      const res = await fetch(`/api/super-admin/branches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIds: childBranches.map((b: any) => b._id),
          status: "Suspended",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("All connected sub-branches have been suspended.");
        await fetchUser();
      } else {
        alert(data.message || "Failed to suspend all branches");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to suspend all branches");
    } finally {
      setBatchBranchLoading(false);
    }
  };

  // Batch Activate All Branches
  const handleBatchActivateAllBranches = async (childBranches: any[]) => {
    if (!childBranches || childBranches.length === 0) return;
    if (
      !window.confirm(
        `Activate ALL (${childBranches.length}) connected sub-branches?`
      )
    ) {
      return;
    }
    setBatchBranchLoading(true);
    try {
      const res = await fetch(`/api/super-admin/branches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIds: childBranches.map((b: any) => b._id),
          status: "Active",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("All connected sub-branches have been activated.");
        await fetchUser();
      } else {
        alert(data.message || "Failed to activate all branches");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to activate all branches");
    } finally {
      setBatchBranchLoading(false);
    }
  };

  // Open Sub-Branch Full Dossier Modal (matches Head Office Checkout View)
  const openSubBranchDossier = (branch: any) => {
    setSelectedSubBranch(branch);
    const branchMods = Array.isArray(branch.enabledModules) ? branch.enabledModules : enabledModules;
    setSelectedSubBranchModules(branchMods);
  };

  // Toggle module on selected sub-branch
  const toggleSubBranchModule = (modId: string) => {
    setSelectedSubBranchModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  // Save modules specifically for sub-branch
  const handleSaveSubBranchModules = async () => {
    if (!selectedSubBranch) return;
    setBranchActionLoading(selectedSubBranch._id);
    try {
      const res = await fetch(`/api/super-admin/branches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedSubBranch._id,
          enabledModules: selectedSubBranchModules,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Branch modules saved successfully for "${selectedSubBranch.companyName}".`);
        await fetchUser();
        setSelectedSubBranch((prev: any) => ({ ...prev, enabledModules: selectedSubBranchModules }));
      } else {
        alert(data.message || "Failed to update branch modules");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update branch modules");
    } finally {
      setBranchActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto min-h-[65vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center text-xl mb-3 border border-blue-200/80 shadow-2xs">
          <FaSync className="animate-spin text-blue-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Loading Tenant Dossier...
        </span>
        <p className="text-[11px] text-slate-400 mt-1">Retrieving organization credentials, license data & telemetry</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="w-full max-w-[1600px] mx-auto min-h-[65vh] p-8 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-50 to-red-50 text-rose-600 flex items-center justify-center text-2xl mb-4 border border-rose-200">
          <FaBan />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Tenant Record Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          {error || "The requested tenant record could not be found or has been removed from the directory."}
        </p>
        <Link
          href="/dashboard/super-admin"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          Return to Approval Queue
        </Link>
      </div>
    );
  }

  const company = user.companyId || {};
  const companyName = company.companyName || user.name || "Pharma Enterprise";
  const companyCode = company.companyCode || "";
  const gstin = company.gstNo || "N/A";
  const drugLicense = company.drugLicenseNo || "N/A";
  const pan = company.panNo || "N/A";
  const address = company.address || "";
  const city = company.city || "";
  const state = company.state || "";
  const country = company.country || "India";
  const pincode = company.pincode || "";
  const fullAddress = [address, city, state, pincode].filter((p) => p && p !== "N/A").join(", ") || "Address not provided";
  const isSuspended = user.status === "Suspended";
  const isHeadOffice = !company.parentCompanyId || company.isHeadOffice === true;
  const parentComp = company.parentCompanyId;
  const childBranches = user.childBranches || [];
  const branchCount = user.branchCount || childBranches.length || 0;

  // Calculate initials for avatar
  const initials = companyName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "MA";

  // Real-time Days Degradation & Status calculation
  const calculateDegradation = () => {
    const now = new Date().getTime();
    const totalDays = user.accessDurationDays || 30;

    if (!user.accessValidUntil) {
      return {
        status: !user.isApproved ? "Pending Review" : "Not Activated",
        badgeClass: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
        remainingDays: totalDays,
        totalDays,
        percent: 100,
        isExpired: false,
        expiryFormatted: "Pending Approval Activation",
        daysElapsed: 0,
      };
    }

    const expiryTime = new Date(user.accessValidUntil).getTime();
    const diffMs = expiryTime - now;
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = diffMs <= 0;
    const daysElapsed = Math.max(0, totalDays - remainingDays);
    const percent = isExpired
      ? 0
      : Math.min(100, Math.max(0, Math.round((remainingDays / Math.max(1, totalDays)) * 100)));

    let status = "Active Subscription";
    let badgeClass = "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200";
    let dotClass = "bg-emerald-500";

    if (isExpired) {
      status = "Subscription Expired";
      badgeClass = "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200";
      dotClass = "bg-rose-500";
    } else if (remainingDays <= 5) {
      status = "Expiring Soon";
      badgeClass = "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200";
      dotClass = "bg-amber-500 animate-pulse";
    }

    const expiryFormatted = new Date(user.accessValidUntil).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      status,
      badgeClass,
      dotClass,
      remainingDays,
      totalDays,
      percent,
      isExpired,
      expiryFormatted,
      daysElapsed,
    };
  };

  const degradation = calculateDegradation();

  // Helper to project new expiry date in modal for Give / Remove Days
  const getProjectedExpiry = (daysToAddOrSubtract: number, action: "add" | "remove") => {
    const now = new Date().getTime();
    let base = now;
    if (user?.accessValidUntil) {
      const currentExpiry = new Date(user.accessValidUntil).getTime();
      if (currentExpiry > now || action === "remove") {
        base = currentExpiry;
      }
    }
    const deltaMs = (action === "add" ? daysToAddOrSubtract : -daysToAddOrSubtract) * 24 * 60 * 60 * 1000;
    const newDate = new Date(base + deltaMs);
    return newDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filtered overview clips
  const filteredOverviewModules = SUPER_ADMIN_SIDEBAR_MODULES.filter((m) => {
    const isGranted = enabledModules.includes(m.id);
    if (overviewModuleClipFilter === "granted") return isGranted;
    if (overviewModuleClipFilter === "stopped") return !isGranted;
    return true;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 pb-12 pt-1 text-slate-800">
      {/* DELETED ACCOUNT ALERT BANNER */}
      {user.isDeleted && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 text-red-600 flex items-center justify-center shrink-0 text-base shadow-2xs">
              <FaTrash />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-red-950">Archived / Deleted Account</h3>
                <span className="text-[10px] font-bold bg-red-200/80 text-red-900 px-2 py-0.5 rounded-full border border-red-300/80">
                  Visible Exclusively To Super Admin
                </span>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                Deleted on {user.deletedAt ? new Date(user.deletedAt).toLocaleString() : "Recently"}
                {user.deletedReason ? ` • Reason: "${user.deletedReason}"` : ""}
                {user.deletedBy?.name ? ` • Performed by: ${user.deletedBy.name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleRestore}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FaUndo size={11} /> Restore Account
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handlePermanentDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FaTrash size={11} /> Purge Forever
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER BAR (Light Gradient Background Only - Elegant & Clean) */}
      <div className="bg-gradient-to-r from-white via-slate-50/90 to-blue-50/30 rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Clean Light Avatar */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100/60 text-blue-700 border border-blue-200/90 flex items-center justify-center text-lg font-black tracking-tight shrink-0 shadow-2xs">
              {initials}
            </div>

            {/* Title & Badges */}
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  {companyName}
                </h1>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    user.isDeleted
                      ? "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200"
                      : user.status === "Rejected"
                      ? "bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border-rose-200"
                      : !user.isApproved
                      ? "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200"
                      : isSuspended
                      ? "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200"
                      : "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  ● {user.isDeleted
                    ? "Deleted"
                    : user.status === "Rejected"
                    ? "Rejected"
                    : !user.isApproved
                    ? "Pending Review"
                    : isSuspended
                    ? "Suspended"
                    : "Approved"}
                </span>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${degradation.badgeClass}`}>
                  {degradation.remainingDays} Days Active
                </span>
              </div>

              {/* Identifiers & Details Ribbon */}
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-mono mt-1">
                {companyCode ? (
                  <span className="font-bold text-slate-800 bg-gradient-to-r from-slate-100 to-gray-100 border border-slate-200/90 px-1.5 py-0.2 rounded text-[11px]">
                    CODE: {companyCode}
                  </span>
                ) : (
                  <span>ID: MBR-{user._id ? user._id.slice(-6).toUpperCase() : ""}</span>
                )}
                <span>•</span>
                <span>GST: {gstin}</span>
                {pan !== "N/A" && (
                  <>
                    <span>•</span>
                    <span>PAN: {pan}</span>
                  </>
                )}
                {isHeadOffice ? (
                  <>
                    <span>•</span>
                    <span className="text-indigo-700 font-bold bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[11px]">
                      Head Office ({branchCount} Branches)
                    </span>
                  </>
                ) : parentComp ? (
                  <>
                    <span>•</span>
                    <span className="text-teal-700 font-bold bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-1.5 py-0.2 rounded text-[11px]">
                      Branch of {parentComp.companyCode || parentComp.companyName}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Buttons (Light Gradient Theme, Minimal Padding) */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              href="/dashboard/super-admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <FaArrowLeft size={10} /> Back
            </Link>

            {user.isDeleted ? (
              <>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FaUndo size={10} /> Restore
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FaTrash size={10} /> Purge
                </button>
              </>
            ) : (
              <>
                {user.status !== "Rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Enter rejection notes / reason:");
                      if (reason !== null) {
                        setNotes(reason);
                        handleAction("reject");
                      }
                    }}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FaBan size={10} /> Reject
                  </button>
                )}

                {user.isApproved && (
                  <button
                    type="button"
                    onClick={() => handleAction(isSuspended ? "activate" : "suspend")}
                    disabled={actionLoading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSuspended
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border-emerald-300"
                        : "bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 text-rose-800 border-rose-200"
                    }`}
                  >
                    <FaPowerOff size={10} />
                    {isSuspended ? "Reactivate Tenant" : "Suspend Tenant"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Soft delete this account"
                >
                  <FaTrash size={10} /> Delete
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(user.isApproved ? "update_settings" : "approve")}
                  disabled={actionLoading || (user.isApproved && !isDirty)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    user.isApproved && !isDirty
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/20"
                  }`}
                >
                  {actionLoading
                    ? "Saving..."
                    : !user.isApproved
                    ? "Confirm Approval"
                    : isDirty
                    ? "Save Changes"
                    : "Saved"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contact Ribbon with Icons */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
          >
            <FaEnvelope className="text-slate-400" size={11} /> {user.email}
          </a>
          {(user.mobile || company.mobile) && (
            <a
              href={`tel:${user.mobile || company.mobile}`}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
            >
              <FaPhone className="text-slate-400" size={11} /> {user.mobile || company.mobile}
            </a>
          )}
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <FaMapMarkerAlt className="text-slate-400" size={11} /> {[city, state, country].filter(Boolean).join(", ") || "India"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 ml-auto text-[11px]">
            <FaClock className="text-slate-400" size={10} />
            Registered: {new Date(user.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* 2. FLAT UNDERLINE NAVIGATION TABS */}
      <div className="border-b border-slate-200/90 pt-1">
        <div className="flex items-center gap-6 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-1 transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === "overview"
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("modules")}
            className={`pb-3 px-1 transition-all cursor-pointer whitespace-nowrap relative flex items-center gap-1.5 ${
              activeTab === "modules"
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
            }`}
          >
            <span>Module Permissions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold border border-blue-200">
              {enabledModules.length}/{SUPER_ADMIN_SIDEBAR_MODULES.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("branches")}
            className={`pb-3 px-1 transition-all cursor-pointer whitespace-nowrap relative flex items-center gap-1.5 ${
              activeTab === "branches"
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
            }`}
          >
            <span>Branches & Hierarchy</span>
            {branchCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 font-bold border border-teal-200">
                {branchCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-3 px-1 transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === "all"
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
            }`}
          >
            All Details
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT: OVERVIEW (Light Gradients Only, Modern Module Clips, Direct Days Control) */}
      {(activeTab === "overview" || activeTab === "all") && (
        <div className="space-y-4">
          {/* Row 1: Approval Information (Left) + Subscription Details with Give & Remove Days Controls (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Approval Information (Light Gradient Background) */}
            <div className="bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FaShieldAlt className="text-blue-600 text-xs" />
                  Approval Information
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STATUS</span>
                  <span className="font-bold text-xs mt-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${user.isApproved ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className={user.isApproved ? "text-emerald-700" : "text-amber-700"}>
                      {user.isDeleted
                        ? "Deleted"
                        : user.status === "Rejected"
                        ? "Rejected"
                        : !user.isApproved
                        ? "Pending Review"
                        : isSuspended
                        ? "Suspended"
                        : "Approved"}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">APPROVED BY</span>
                  <span className="font-bold text-slate-900 text-xs mt-1 block">
                    {user.approvedBy?.name || (user.isApproved ? "Super Admin" : "Pending Action")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REQUEST RECEIVED</span>
                  <span className="text-slate-800 font-medium text-xs mt-1 block">
                    {new Date(user.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} ({getRelativeTime(user.createdAt)})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">APPROVAL DATE</span>
                  <span className="text-slate-800 font-medium text-xs mt-1 block">
                    {user.approvedAt
                      ? new Date(user.approvedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : user.isApproved
                      ? "Approved on Initial Setup"
                      : "Pending Clearance"}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-100/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REMARKS / AUDIT NOTE</span>
                  <span className="text-slate-700 italic text-xs mt-0.5 block">
                    {user.approvalNotes || (user.isApproved ? "Approved by super admin panel" : "Application awaiting review")}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Subscription Details with Direct Give Days & Remove Days Buttons (Light Gradient Background) */}
            <div className="bg-gradient-to-br from-white via-sky-50/20 to-indigo-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-blue-600 text-xs" />
                  <h3 className="text-sm font-bold text-slate-900">Subscription Details</h3>
                </div>

                {/* Direct Action Controls: Give Days and Remove Days */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openDaysModal("add")}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Give extra access days to this tenant"
                  >
                    <FaPlus size={8} /> Give Days
                  </button>
                  <button
                    type="button"
                    onClick={() => openDaysModal("remove")}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Deduct access days from this tenant"
                  >
                    <FaMinus size={8} /> Remove Days
                  </button>
                  <button
                    type="button"
                    onClick={() => openDaysModal("add")}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200 text-slate-700 text-[11px] font-bold transition-all border border-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <FaSlidersH size={9} /> Manage
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CURRENT PLAN</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {user.planName || "Enterprise Suite"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STATUS</span>
                  <span className="font-bold text-emerald-600 text-xs mt-0.5 block">
                    {degradation.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">START DATE</span>
                  <span className="text-slate-800 font-medium text-xs mt-0.5 block">
                    {new Date(user.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EXPIRY DATE</span>
                  <span className="font-mono text-slate-800 font-bold text-xs mt-0.5 block">
                    {degradation.expiryFormatted}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL DURATION</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {degradation.totalDays} Days
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REMAINING DAYS</span>
                  <span className="font-extrabold text-blue-600 text-xs mt-0.5 block font-mono">
                    {degradation.remainingDays} Days Left
                  </span>
                </div>
              </div>

              {/* Subscription Validity Progress Bar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Subscription Validity</span>
                  <span className="font-bold text-blue-600">{degradation.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      degradation.isExpired
                        ? "bg-rose-500"
                        : degradation.remainingDays <= 5
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                    }`}
                    style={{ width: `${degradation.percent}%` }}
                  />
                </div>
              </div>

              {/* User Login Session Timeout Control */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    USER LOGIN SESSION TIMEOUT
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Active: {selectedSessionHours} Hours
                  </span>
                </div>

                {/* Compact Session Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {SESSION_TIMEOUT_PRESETS.map((preset) => {
                    const isSelected = selectedSessionHours === preset.hours && !customSessionHours;
                    return (
                      <button
                        key={preset.hours}
                        type="button"
                        onClick={() => {
                          setSelectedSessionHours(preset.hours);
                          setCustomSessionHours("");
                        }}
                        className={`py-1 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-2xs"
                            : "bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {preset.hours}h
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hours Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-slate-400 font-medium">Or custom:</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      placeholder="e.g. 3 or 6"
                      value={customSessionHours}
                      onChange={(e) => setCustomSessionHours(e.target.value)}
                      className="w-full pl-2.5 pr-12 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      Hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Admin Account Details (Left) + Module Access Control Clips (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 3: Admin Account Details (Light Gradient Background) */}
            <div className="bg-gradient-to-br from-white via-slate-50/60 to-purple-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FaIdCard className="text-purple-600 text-xs" />
                  <h3 className="text-sm font-bold text-slate-900">Admin Account Details</h3>
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                      user.status === "Active"
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                        : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {user.status || "Active"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${user.name} | ${user.email} | ${user.mobile || ""}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <FaCopy size={11} /> Copy Details
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ADMIN FULL NAME</span>
                  <span className="font-bold text-slate-900 text-xs mt-1 block">{user.name}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LOGIN EMAIL</span>
                  <span className="font-mono text-slate-800 font-semibold text-xs mt-1 block">{user.email}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CONTACT MOBILE</span>
                  <span className="font-mono text-slate-800 font-semibold text-xs mt-1 block">
                    {user.mobile || company.mobile || "N/A"}
                    {user.mobileVerified && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded ml-1.5">
                        OTP Verified
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DESIGNATION & ROLE</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase mt-1 inline-block">
                    {user.designation || user.roleType || user.role || "COMPANY ADMIN"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EMPLOYEE / CRM CODE</span>
                  <span className="font-mono font-bold text-slate-800 text-xs mt-1 block">
                    {user.employeeCode || `EMP-${user._id?.slice(-5)?.toUpperCase() || "N/A"}`}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">APPROVAL STATUS</span>
                  <span className="font-semibold text-slate-800 text-xs mt-1 block">
                    {user.isApproved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <FaCheckCircle size={11} /> Approved by {user.approvedBy?.name || "Super Administrator"}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold flex items-center gap-1">
                        <FaClock size={11} /> Pending Super Admin Clearance
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Module Access Control Clips (Modern Pill Tags, Light Gradient, Selected & Hover States, NO Strikethrough) */}
            <div className="bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FaLayerGroup className="text-emerald-600 text-xs" />
                  <h3 className="text-sm font-bold text-slate-900">Module Access Control</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300">
                    {enabledModules.length} / {SUPER_ADMIN_SIDEBAR_MODULES.length} Granted
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("modules")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                >
                  Configure All (26) →
                </button>
              </div>

              {/* Sub-header with Quick Actions & View Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {/* Filter chips: All, Granted, Stopped */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOverviewModuleClipFilter("all")}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                      overviewModuleClipFilter === "all"
                        ? "bg-slate-800 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({SUPER_ADMIN_SIDEBAR_MODULES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModuleClipFilter("granted")}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                      overviewModuleClipFilter === "granted"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    Granted ({enabledModules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModuleClipFilter("stopped")}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                      overviewModuleClipFilter === "stopped"
                        ? "bg-slate-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Stopped ({SUPER_ADMIN_SIDEBAR_MODULES.length - enabledModules.length})
                  </button>
                </div>

                {/* Batch buttons: Grant All, Stop All */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setEnabledModules([...ALL_SIDEBAR_MODULE_IDS])}
                    className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnabledModules([])}
                    className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-rose-300 transition-all cursor-pointer shadow-2xs"
                  >
                    Stop All
                  </button>
                </div>
              </div>

              {/* MODERN MODULE CLIPS / PILL TAGS CONTAINER */}
              <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pt-1 pr-1">
                {filteredOverviewModules.map((m) => {
                  const isGranted = enabledModules.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:translate-y-0 ${
                        isGranted
                          ? "bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 text-emerald-900 border-emerald-300/90 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-400 hover:shadow-xs"
                          : "bg-gradient-to-r from-slate-50 via-gray-50 to-slate-100/70 text-slate-600 border-slate-200/90 hover:from-slate-100 hover:to-blue-50/40 hover:text-slate-900 hover:border-blue-300 hover:shadow-2xs"
                      }`}
                      title={
                        isGranted
                          ? `Granted: Click to revoke "${m.name}"`
                          : `Stopped: Click to grant "${m.name}"`
                      }
                    >
                      {/* Clean Status Dot / Icon Indicator */}
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 transition-colors ${
                          isGranted
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {isGranted ? <FaCheck size={7} /> : "+"}
                      </span>
                      <span className="font-bold tracking-tight">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Company & Branch Hierarchy Details + Connected Sub-Branches */}
          <div className="bg-gradient-to-br from-white via-slate-50/70 to-teal-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FaBuilding className="text-teal-600 text-xs" />
                <h3 className="text-sm font-bold text-slate-900">Company & Branch Hierarchy Details</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isHeadOffice
                      ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-200"
                      : "bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-teal-200"
                  }`}
                >
                  {isHeadOffice ? `Head Office (${branchCount} Branches)` : "Child Branch"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CRM COMPANY CODE</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit text-[11px]">
                  {companyCode || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BRANCH HIERARCHY</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {isHeadOffice ? `Head Office (${branchCount} Branches)` : `Branch under ${parentComp?.companyName || "Head Office"}`}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSTIN NUMBER</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit text-[11px]">
                  {gstin}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DRUG LICENSE NO</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit text-[11px]">
                  {drugLicense}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAN NUMBER</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{pan}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ENTITY TYPE</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {(company.businessType || "Pharma Distribution").toUpperCase().replace(/_/g, " ")}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REGISTERED COMMERCIAL ADDRESS</span>
                <span className="text-slate-700 font-medium mt-0.5 block leading-relaxed">
                  {fullAddress}
                </span>
              </div>
            </div>

            {/* Connected Sub-Branches & Locations Section (Full Controls: Suspend All, Suspend Branch, Checkout Dossier) */}
            {isHeadOffice && childBranches.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FaCodeBranch className="text-teal-600 text-xs" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Connected Sub-Branches & Locations ({childBranches.length})
                    </span>
                    <span className="text-[10px] text-teal-700 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                      Inherits Head Office Modules & Tenure
                    </span>
                  </div>

                  {/* Batch Actions for Branches */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={batchBranchLoading}
                      onClick={() => handleBatchSuspendAllBranches(childBranches)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-2xs"
                      title="Suspend all connected sub-branches at once"
                    >
                      <FaPowerOff size={9} /> Suspend All Branches
                    </button>
                    <button
                      type="button"
                      disabled={batchBranchLoading}
                      onClick={() => handleBatchActivateAllBranches(childBranches)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-2xs"
                      title="Reactivate all connected sub-branches"
                    >
                      <FaCheckCircle size={9} /> Activate All
                    </button>
                  </div>
                </div>

                {/* Sub-Branch List Cards (Rich Details, Suspend/Activate Toggle, Full Dossier Modal) */}
                <div className="grid grid-cols-1 gap-2.5">
                  {childBranches.map((cb: any) => {
                    const branchAdmin = cb.adminUser;
                    const branchModules = Array.isArray(cb.enabledModules) ? cb.enabledModules : enabledModules;
                    const isBranchExpanded = expandedBranchId === cb._id;
                    const isBranchActive = cb.status === "Active";
                    const isBranchUpdating = branchActionLoading === cb._id;

                    return (
                      <div
                        key={cb._id}
                        className="p-3.5 rounded-xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/20 border border-slate-200/90 hover:from-white hover:to-indigo-50/30 hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {cb.companyName}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2 py-0.5 rounded">
                              {cb.companyCode || "BRANCH"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              GST: {cb.gstNo || "N/A"} • PAN: {cb.panNo || pan} {cb.drugLicenseNo && `• DL: ${cb.drugLicenseNo}`}
                            </span>
                          </div>

                          {/* Branch Actions Ribbon */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {/* Status Badge */}
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                                isBranchActive
                                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                                  : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              ● {cb.status || "Active"}
                            </span>

                            {/* Suspend / Activate Branch Button */}
                            <button
                              type="button"
                              disabled={isBranchUpdating}
                              onClick={() => handleToggleBranchStatus(cb)}
                              className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                isBranchActive
                                  ? "bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 text-rose-800 border-rose-200"
                                  : "bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {isBranchUpdating ? (
                                <FaSync className="animate-spin text-[10px]" />
                              ) : (
                                <FaPowerOff size={9} />
                              )}
                              <span>{isBranchActive ? "Suspend Branch" : "Activate Branch"}</span>
                            </button>

                            {/* View Full Dossier / Checkout Modal Button */}
                            <button
                              type="button"
                              onClick={() => openSubBranchDossier(cb)}
                              className="text-[10.5px] font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Inspect full details, credentials & permissions for this sub-branch"
                            >
                              <FaEye size={10} /> Full Details Dossier
                            </button>

                            {/* Direct Checkout Link (Opens admin user page if exists) */}
                            {branchAdmin?._id && (
                              <Link
                                href={`/dashboard/super-admin/approvals/${branchAdmin._id}`}
                                className="text-[10.5px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Checkout sub-branch admin user approval record"
                              >
                                <FaExternalLinkAlt size={8} /> Checkout
                              </Link>
                            )}

                            {/* Module Count Toggle */}
                            <button
                              type="button"
                              onClick={() => setExpandedBranchId(isBranchExpanded ? null : cb._id)}
                              className="text-[10.5px] font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              {isBranchExpanded ? "Hide Clips" : `${branchModules.length} Modules`}
                            </button>
                          </div>
                        </div>

                        {/* Branch Details Row: Address & Branch Admin user info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/50 text-slate-600">
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px]">Location & Address:</span>
                            <span className="font-medium text-slate-800 text-[11px]">
                              {[cb.address, cb.city, cb.state, cb.pincode].filter(Boolean).join(", ") || "Location unassigned"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-medium block text-[10px]">Branch Contact / Admin:</span>
                            <span className="font-medium text-slate-800 text-[11px]">
                              {branchAdmin ? (
                                <span>
                                  {branchAdmin.name} ({branchAdmin.email} • {branchAdmin.mobile || "No phone"})
                                  {branchAdmin.employeeCode && (
                                    <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.2 rounded ml-1">
                                      {branchAdmin.employeeCode}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span>{cb.email || user.email} • {cb.mobile || user.mobile || "N/A"}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Module Clips for this Branch */}
                        {isBranchExpanded && (
                          <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                              <span>Active CRM Modules on {cb.companyCode || "Branch"} ({branchModules.length})</span>
                              <button
                                type="button"
                                onClick={() => openSubBranchDossier(cb)}
                                className="text-[10px] text-blue-600 hover:underline font-bold"
                              >
                                Manage Permissions →
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {SUPER_ADMIN_SIDEBAR_MODULES.filter((m) => branchModules.includes(m.id)).map((m) => (
                                <span
                                  key={m.id}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800"
                                >
                                  ✓ {m.name}
                                </span>
                              ))}
                              {branchModules.length === 0 && (
                                <span className="text-[11px] text-rose-600 italic">No modules enabled on this branch</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. DEDICATED VIEW: MODULE PERMISSIONS (Full 3-Column Grid) */}
      {(activeTab === "modules" || activeTab === "all") && (
        <div className={`bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5 ${activeTab === "all" ? "mt-4" : ""}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FaBoxes className="text-blue-600 text-xs" />
                <h3 className="text-sm font-bold text-slate-900">Sidebar Modules Access Control</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    enabledModules.length > 0
                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200"
                      : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {enabledModules.length} / {SUPER_ADMIN_SIDEBAR_MODULES.length} Granted
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enable or revoke access to all individual sidebar modules and routes for this tenant
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnabledModules([...ALL_SIDEBAR_MODULE_IDS])}
                className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={() => setEnabledModules([])}
                className="px-3 py-1 rounded-lg text-xs font-bold text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Stop All
              </button>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              placeholder="Search modules by name or route..."
              value={approvalModuleSearch}
              onChange={(e) => setApprovalModuleSearch(e.target.value)}
              className="sm:w-72 px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {/* Flex-Wrap Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: "ALL", label: "All (26)" },
                { key: "DASHBOARD", label: "Dashboard (6)" },
                { key: "OPERATIONS", label: "Operations (7)" },
                { key: "LEADS", label: "Marketing (5)" },
                { key: "MASTERS", label: "Masters (4)" },
                { key: "REPORTS_ADMIN", label: "Admin (4)" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setApprovalCategoryFilter(c.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                    approvalCategoryFilter === c.key
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modules Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SUPER_ADMIN_SIDEBAR_MODULES.filter((mod) => {
              if (approvalCategoryFilter !== "ALL" && mod.category !== approvalCategoryFilter) return false;
              if (approvalModuleSearch.trim()) {
                const q = approvalModuleSearch.toLowerCase();
                return (
                  mod.name.toLowerCase().includes(q) ||
                  mod.id.toLowerCase().includes(q) ||
                  mod.desc.toLowerCase().includes(q) ||
                  mod.subModules.some((s) => s.toLowerCase().includes(q))
                );
              }
              return true;
            }).map((mod) => {
              const isSelected = enabledModules.includes(mod.id);
              const isExpanded = expandedApprovalModId === mod.id;

              return (
                <div
                  key={mod.id}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-200 ring-1 ring-blue-500/10"
                      : "bg-gradient-to-br from-slate-50/70 to-gray-50/50 border-slate-200 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-start gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] mt-0.5 shrink-0 border transition-all ${
                          isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <FaCheck />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate leading-tight">{mod.name}</div>
                        <div className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">{mod.desc}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-2xs"
                          : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 hover:from-rose-100 hover:to-red-100 border border-rose-200"
                      }`}
                    >
                      {isSelected ? "Granted" : "Stopped"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                    <span>{mod.categoryLabel} • {mod.subModulesCount} routes</span>
                    {mod.subModules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpandedApprovalModId(isExpanded ? null : mod.id)}
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        {isExpanded ? "Hide routes" : "View routes"}
                      </button>
                    )}
                  </div>

                  {isExpanded && mod.subModules.length > 1 && (
                    <div className="pt-1.5 border-t border-dashed border-slate-200 flex flex-wrap gap-1">
                      {mod.subModules.map((sub, i) => (
                        <span key={i} className="text-[9.5px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. DEDICATED VIEW: BRANCHES & HIERARCHY */}
      {activeTab === "branches" && (
        <div className="bg-gradient-to-br from-white via-slate-50/70 to-teal-50/20 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FaCodeBranch className="text-teal-600 text-xs" />
                <h3 className="text-sm font-bold text-slate-900">
                  Connected Sub-Branches & Locations ({childBranches.length})
                </h3>
                <span className="text-[10px] text-teal-700 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Inherits Head Office Modules & Tenure
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Manage branch activation, module access controls, and view full individual sub-branch dossiers
              </p>
            </div>

            {/* Batch Branch Action Buttons */}
            {childBranches.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={batchBranchLoading}
                  onClick={() => handleBatchSuspendAllBranches(childBranches)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  <FaPowerOff size={10} /> Suspend All Branches
                </button>
                <button
                  type="button"
                  disabled={batchBranchLoading}
                  onClick={() => handleBatchActivateAllBranches(childBranches)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  <FaCheckCircle size={10} /> Activate All Branches
                </button>
              </div>
            )}
          </div>

          {childBranches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              This account does not have any connected sub-branches or branch locations.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {childBranches.map((cb: any) => {
                const branchAdmin = cb.adminUser;
                const branchModules = Array.isArray(cb.enabledModules) ? cb.enabledModules : enabledModules;
                const isBranchExpanded = expandedBranchId === cb._id;
                const isBranchActive = cb.status === "Active";
                const isBranchUpdating = branchActionLoading === cb._id;

                return (
                  <div
                    key={cb._id}
                    className="p-3.5 rounded-xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/20 border border-slate-200/90 hover:from-white hover:to-indigo-50/30 hover:border-blue-300 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {cb.companyName}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2 py-0.5 rounded">
                          {cb.companyCode || "BRANCH"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          GST: {cb.gstNo || "N/A"} • PAN: {cb.panNo || pan} {cb.drugLicenseNo && `• DL: ${cb.drugLicenseNo}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isBranchActive
                              ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                              : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          ● {cb.status || "Active"}
                        </span>

                        {/* Suspend / Activate Branch Button */}
                        <button
                          type="button"
                          disabled={isBranchUpdating}
                          onClick={() => handleToggleBranchStatus(cb)}
                          className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                            isBranchActive
                              ? "bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 text-rose-800 border-rose-200"
                              : "bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {isBranchUpdating ? (
                            <FaSync className="animate-spin text-[10px]" />
                          ) : (
                            <FaPowerOff size={9} />
                          )}
                          <span>{isBranchActive ? "Suspend Branch" : "Activate Branch"}</span>
                        </button>

                        {/* View Full Dossier / Checkout Modal Button */}
                        <button
                          type="button"
                          onClick={() => openSubBranchDossier(cb)}
                          className="text-[10.5px] font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <FaEye size={10} /> Full Details Dossier
                        </button>

                        {branchAdmin?._id && (
                          <Link
                            href={`/dashboard/super-admin/approvals/${branchAdmin._id}`}
                            className="text-[10.5px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <FaExternalLinkAlt size={8} /> Checkout
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedBranchId(isBranchExpanded ? null : cb._id)}
                          className="text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          {isBranchExpanded ? "Hide Clips" : `${branchModules.length} Modules`}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200/50 text-slate-600">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Location & Address:</span>
                        <span className="font-medium text-slate-800">
                          {[cb.address, cb.city, cb.state, cb.pincode].filter(Boolean).join(", ") || "Location unassigned"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Branch Contact / Admin:</span>
                        <span className="font-medium text-slate-800">
                          {branchAdmin ? (
                            <span>
                              {branchAdmin.name} ({branchAdmin.email} • {branchAdmin.mobile || "No phone"})
                              {branchAdmin.employeeCode && (
                                <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.2 rounded ml-1">
                                  {branchAdmin.employeeCode}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>{cb.email || user.email} • {cb.mobile || user.mobile || "N/A"}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {isBranchExpanded && (
                      <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Active CRM Modules on {cb.companyCode || "Branch"} ({branchModules.length})</span>
                          <button
                            type="button"
                            onClick={() => openSubBranchDossier(cb)}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            Manage Permissions →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SUPER_ADMIN_SIDEBAR_MODULES.filter((m) => branchModules.includes(m.id)).map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800"
                            >
                              ✓ {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: GIVE DAYS / REMOVE DAYS SUBSCRIPTION CONTROL (Light Gradient Background Only) */}
      {showDaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-gradient-to-b from-white via-slate-50/80 to-blue-50/20 rounded-2xl border border-slate-200/90 shadow-xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Subscription Control: Give & Remove Days
                </h3>
                <p className="text-[11px] text-slate-500">
                  Directly grant extra validity or deduct tenure days for this organization
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Section 1: ACTION SELECTOR TABS (Give Days vs Remove Days) */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Subscription Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentAction("add")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                    adjustmentAction === "add"
                      ? "border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FaPlus size={10} className="text-emerald-600" />
                  <span>Give / Add Days (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentAction("remove")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                    adjustmentAction === "remove"
                      ? "border-2 border-rose-500 bg-gradient-to-r from-rose-50 to-red-50 text-rose-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FaMinus size={10} className="text-rose-600" />
                  <span>Remove Days (—)</span>
                </button>
              </div>
            </div>

            {/* Section 2: QUICK CHIPS (Add or Remove) */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {adjustmentAction === "add" ? "Quick Preset (Give Days)" : "Quick Preset (Remove Days)"}
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {(adjustmentAction === "add" ? [7, 15, 30, 60, 90, 180, 365] : [7, 15, 30, 60, 90, 180]).map((preset) => {
                  const isSelected = adjustmentDays === preset && adjustmentInput === String(preset);
                  const sign = adjustmentAction === "add" ? "+" : "—";
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAdjustmentDays(preset);
                        setAdjustmentInput(String(preset));
                      }}
                      className={`py-1 px-1 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? adjustmentAction === "add"
                            ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20"
                            : "border-rose-500 bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 shadow-2xs ring-1 ring-rose-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {sign}{preset}d
                    </button>
                  );
                })}
              </div>

              {/* Input Box with + or — prefix */}
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  {adjustmentAction === "add" ? "+" : "—"}
                </span>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={adjustmentInput}
                  onChange={(e) => {
                    setAdjustmentInput(e.target.value);
                    const val = Number(e.target.value);
                    if (!isNaN(val)) setAdjustmentDays(val);
                  }}
                  placeholder="30"
                  className="w-full py-2 pl-7 pr-14 text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                  Days
                </span>
              </div>
            </div>

            {/* LIVE PROJECTED EXPIRY FEEDBACK CARD (Light Gradient Background) */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30 border border-blue-100/80 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Live Projected Expiry Date
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>
                  New Expiry:{" "}
                  <strong className="text-blue-700 font-mono">
                    {getProjectedExpiry(Number(adjustmentInput) || adjustmentDays || 0, adjustmentAction)}
                  </strong>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    adjustmentAction === "add"
                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-200"
                      : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {adjustmentAction === "add" ? `+${adjustmentInput || 0}d Added` : `-${adjustmentInput || 0}d Deducted`}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSubscription}
                disabled={modalSubmitting}
                className={`w-full sm:w-auto px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  adjustmentAction === "add"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
                }`}
              >
                {modalSubmitting ? (
                  <>
                    <FaSync className="animate-spin text-xs" /> Updating...
                  </>
                ) : adjustmentAction === "add" ? (
                  `Confirm & Give +${adjustmentInput || 0} Days`
                ) : (
                  `Confirm & Remove -${adjustmentInput || 0} Days`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: FULL SUB-BRANCH DETAILS DOSSIER (Same comprehensive view as Head Office Checkout) */}
      {selectedSubBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-gradient-to-b from-white via-slate-50/80 to-blue-50/20 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl sm:max-w-3xl w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto my-auto text-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-800 border border-teal-200 flex items-center justify-center text-base font-black shadow-2xs">
                  {selectedSubBranch.companyCode ? selectedSubBranch.companyCode.slice(0, 3) : "BR"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedSubBranch.companyName}
                    </h2>
                    <span className="font-mono text-[10px] font-bold text-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2 py-0.5 rounded">
                      {selectedSubBranch.companyCode || "BRANCH"}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedSubBranch.status === "Active"
                          ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                          : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      ● {selectedSubBranch.status || "Active"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sub-Branch node of <strong>{companyName}</strong> • Inherits parent subscription tenure
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBranchStatus(selectedSubBranch)}
                  disabled={branchActionLoading === selectedSubBranch._id}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    selectedSubBranch.status === "Active"
                      ? "bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 text-rose-800 border-rose-200"
                      : "bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  <FaPowerOff size={10} />
                  <span>{selectedSubBranch.status === "Active" ? "Suspend Branch" : "Activate Branch"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubBranch(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <FaTimes size={13} />
                </button>
              </div>
            </div>

            {/* Grid of Sub-Branch Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card A: Branch Node Information */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Branch Node & Hierarchy
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Classification:</span>
                    <span className="font-bold text-slate-900">Connected Satellite Branch</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Branch Code:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSubBranch.companyCode || "BRANCH"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent Head Office:</span>
                    <span className="font-bold text-blue-700">{companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className={selectedSubBranch.status === "Active" ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                      {selectedSubBranch.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card B: Legal & Tax Identifiers */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tax & Licensing Credentials
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GSTIN:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSubBranch.gstNo || gstin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSubBranch.panNo || pan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Drug License:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSubBranch.drugLicenseNo || drugLicense}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commercial Address:</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">
                      {[selectedSubBranch.address, selectedSubBranch.city, selectedSubBranch.state].filter(Boolean).join(", ") || fullAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card C: Branch Contact / Admin */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Branch Admin Contact Profile
                  </span>
                  {selectedSubBranch.adminUser?._id && (
                    <Link
                      href={`/dashboard/super-admin/approvals/${selectedSubBranch.adminUser._id}`}
                      target="_blank"
                      className="text-[10.5px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <FaExternalLinkAlt size={8} /> Open Direct Admin User Approval Page
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name</span>
                    <span className="font-bold text-slate-900">
                      {selectedSubBranch.adminUser?.name || "Branch Manager"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Email Address</span>
                    <a
                      href={`mailto:${selectedSubBranch.adminUser?.email || selectedSubBranch.email}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {selectedSubBranch.adminUser?.email || selectedSubBranch.email || "N/A"}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Phone Number</span>
                    <a
                      href={`tel:${selectedSubBranch.adminUser?.mobile || selectedSubBranch.mobile}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {selectedSubBranch.adminUser?.mobile || selectedSubBranch.mobile || "N/A"}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Branch Module Access Control (Clips with Individual Toggle & Head Office Sync) */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      Active Modules on {selectedSubBranch.companyCode || "Branch"}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300">
                      {selectedSubBranchModules.length} / {SUPER_ADMIN_SIDEBAR_MODULES.length} Granted
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Click any clip to grant or revoke specific module privileges for this sub-branch
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSubBranchModules([...ALL_SIDEBAR_MODULE_IDS])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubBranchModules([])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                  >
                    Stop All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubBranchModules([...enabledModules])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                    title="Copy module settings from Head Office"
                  >
                    Sync with Head Office
                  </button>
                </div>
              </div>

              {/* Clips for Sub-Branch Modules */}
              <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pt-1 pr-1">
                {SUPER_ADMIN_SIDEBAR_MODULES.map((m) => {
                  const isGranted = selectedSubBranchModules.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleSubBranchModule(m.id)}
                      className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs ${
                        isGranted
                          ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border-emerald-300 hover:from-emerald-100 hover:to-teal-100"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-500 border-slate-200 hover:from-slate-100 hover:to-gray-100 hover:text-slate-800"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                          isGranted ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {isGranted ? <FaCheck size={7} /> : "+"}
                      </span>
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Save Branch Modules Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={branchActionLoading === selectedSubBranch._id}
                  onClick={handleSaveSubBranchModules}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {branchActionLoading === selectedSubBranch._id ? (
                    <>
                      <FaSync className="animate-spin text-xs" /> Saving Branch Modules...
                    </>
                  ) : (
                    "Save Branch Module Privileges"
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedSubBranch(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
