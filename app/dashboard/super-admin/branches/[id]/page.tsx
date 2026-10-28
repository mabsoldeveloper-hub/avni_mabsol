"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaBuilding,
  FaCodeBranch,
  FaPowerOff,
  FaSync,
  FaExternalLinkAlt,
  FaCalendarAlt,
  FaPlus,
  FaMinus,
  FaCheck,
  FaTimes,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaInfoCircle,
  FaCopy,
  FaCheckCircle,
  FaBan,
  FaClock,
  FaSlidersH,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaEdit,
} from "react-icons/fa";
import {
  SUPER_ADMIN_SIDEBAR_MODULES,
  ALL_SIDEBAR_MODULE_IDS,
} from "@/lib/constants/superAdmin.constant";

function BranchDossierContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id as string;
  const fromApproval = searchParams.get("fromApproval");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<any>(null);
  const [parentCompany, setParentCompany] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [parentAdminUser, setParentAdminUser] = useState<any>(null);

  // Branch Info Editing State (Name, Company Name, and Address only)
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [updatingBranch, setUpdatingBranch] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");

  // Status & action loading
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Modules State
  const [branchModules, setBranchModules] = useState<string[]>([]);
  const [originalModules, setOriginalModules] = useState<string[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "granted" | "revoked">("all");
  const [savingModules, setSavingModules] = useState(false);

  // Days adjustment modal state
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [daysAction, setDaysAction] = useState<"add" | "remove">("add");
  const [daysAdjustment, setDaysAdjustment] = useState<number>(30);
  const [daysInput, setDaysInput] = useState<string>("30");
  const [daysSubmitting, setDaysSubmitting] = useState(false);

  // Fetch branch details
  const fetchBranch = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/super-admin/branches/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load branch dossier.");
      }
      setBranch(data.branch);
      setParentCompany(data.parentCompany);
      setAdminUser(data.adminUser);
      setParentAdminUser(data.parentAdminUser);
      setEditBranchName(data.adminUser?.name || "");
      setEditCompanyName(data.branch?.companyName || "");
      setEditAddress(data.branch?.address || "");
      setEditCity(data.branch?.city || "");
      setEditState(data.branch?.state || "");
      setEditPincode(data.branch?.pincode || "");

      const mods = Array.isArray(data.branch.enabledModules)
        ? data.branch.enabledModules
        : ALL_SIDEBAR_MODULE_IDS;
      setBranchModules(mods);
      setOriginalModules(mods);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch branch details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBranch();
  }, [fetchBranch]);

  const handleCancelEditBranch = () => {
    if (branch) {
      setEditBranchName(adminUser?.name || "");
      setEditCompanyName(branch.companyName || "");
      setEditAddress(branch.address || "");
      setEditCity(branch.city || "");
      setEditState(branch.state || "");
      setEditPincode(branch.pincode || "");
    }
    setIsEditingBranch(false);
  };

  const handleSaveBranchInfo = async () => {
    if (!editCompanyName.trim()) {
      alert("Please enter a valid branch company name.");
      return;
    }
    setUpdatingBranch(true);
    try {
      const res = await fetch(`/api/super-admin/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBranchName.trim(),
          companyName: editCompanyName.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          pincode: editPincode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchBranch();
        setIsEditingBranch(false);
        setSaveSuccessMessage("Branch name, contact name, and commercial address updated successfully!");
        setTimeout(() => setSaveSuccessMessage(null), 5000);
      } else {
        alert(data.message || "Failed to update branch details");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update branch details");
    } finally {
      setUpdatingBranch(false);
    }
  };

  // Check if module privileges changed
  const modulesChanged = useMemo(() => {
    if (branchModules.length !== originalModules.length) return true;
    const sortedA = [...branchModules].sort();
    const sortedB = [...originalModules].sort();
    return sortedA.some((val, idx) => val !== sortedB[idx]);
  }, [branchModules, originalModules]);

  // Module actions
  const toggleModule = (modId: string) => {
    setBranchModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleGrantAllModules = () => {
    setBranchModules([...ALL_SIDEBAR_MODULE_IDS]);
  };

  const handleStopAllModules = () => {
    setBranchModules([]);
  };

  const handleSyncWithHeadOffice = () => {
    if (parentCompany?.enabledModules && Array.isArray(parentCompany.enabledModules)) {
      setBranchModules([...parentCompany.enabledModules]);
    } else {
      setBranchModules([...ALL_SIDEBAR_MODULE_IDS]);
    }
  };

  const handleSaveModules = async () => {
    if (!branch) return;
    setSavingModules(true);
    try {
      const res = await fetch(`/api/super-admin/branches/${branch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledModules: branchModules,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOriginalModules([...branchModules]);
        setSaveSuccessMessage(`Module privileges saved for "${branch.companyName}".`);
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      } else {
        alert(data.message || "Failed to save module privileges");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to save module privileges");
    } finally {
      setSavingModules(false);
    }
  };

  // Branch Status Toggle
  const handleToggleStatus = async () => {
    if (!branch) return;
    const isCurrentlyActive = branch.status === "Active";
    const nextStatus = isCurrentlyActive ? "Suspended" : "Active";
    const confirmMsg = isCurrentlyActive
      ? `Suspend branch "${branch.companyName}" (${branch.companyCode || "BRANCH"})?\nAll user logins associated with this branch will be paused.`
      : `Reactivate branch "${branch.companyName}" (${branch.companyCode || "BRANCH"})?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/branches/${branch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setBranch((prev: any) => ({ ...prev, status: nextStatus }));
        setSaveSuccessMessage(`Branch status updated to ${nextStatus}.`);
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      } else {
        alert(data.message || "Failed to update branch status");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update branch status");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text || text === "N/A") return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Degradation calculation for inherited subscription tenure
  const subscriptionUser = parentAdminUser || adminUser;
  const calculateSubscription = () => {
    const now = new Date().getTime();
    const totalDays = subscriptionUser?.accessDurationDays || 30;

    if (!subscriptionUser?.accessValidUntil) {
      return {
        status: "Active Subscription",
        badgeClass: "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-300",
        remainingDays: totalDays,
        totalDays,
        percent: 100,
        isExpired: false,
        expiryFormatted: "Inherited from Head Office",
      };
    }

    const expiryTime = new Date(subscriptionUser.accessValidUntil).getTime();
    const diffMs = expiryTime - now;
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = diffMs <= 0;
    const percent = isExpired
      ? 0
      : Math.min(100, Math.max(0, Math.round((remainingDays / Math.max(1, totalDays)) * 100)));

    let status = "Active Subscription";
    let badgeClass = "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-300";

    if (isExpired) {
      status = "Subscription Expired";
      badgeClass = "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-rose-300";
    } else if (remainingDays <= 5) {
      status = "Expiring Soon";
      badgeClass = "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border-amber-300";
    }

    const expiryFormatted = new Date(subscriptionUser.accessValidUntil).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      status,
      badgeClass,
      remainingDays,
      totalDays,
      percent,
      isExpired,
      expiryFormatted,
    };
  };

  const tenure = calculateSubscription();

  // Helper to project new expiry date in Give/Remove Days modal
  const getProjectedExpiry = (daysToAddOrSubtract: number, action: "add" | "remove") => {
    const now = new Date().getTime();
    let base = now;
    if (subscriptionUser?.accessValidUntil) {
      const current = new Date(subscriptionUser.accessValidUntil).getTime();
      if (current > base) {
        base = current;
      }
    }
    const delta = action === "add" ? daysToAddOrSubtract : -daysToAddOrSubtract;
    const projectedTime = base + delta * 24 * 60 * 60 * 1000;
    return new Date(Math.max(now, projectedTime)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDaysModal = (action: "add" | "remove") => {
    setDaysAction(action);
    setDaysAdjustment(30);
    setDaysInput("30");
    setShowDaysModal(true);
  };

  const handleUpdateSubscriptionDays = async () => {
    const days = Number(daysInput) || daysAdjustment;
    if (!days || days <= 0) {
      alert("Please specify a valid number of days (greater than 0)");
      return;
    }

    setDaysSubmitting(true);
    try {
      const deltaDays = daysAction === "add" ? days : -days;
      const res = await fetch(`/api/super-admin/branches/${branch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_days",
          durationDays: deltaDays,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowDaysModal(false);
        setSaveSuccessMessage(
          daysAction === "add"
            ? `Successfully given +${days} days to subscription tenure!`
            : `Successfully removed -${days} days from subscription tenure!`
        );
        setTimeout(() => setSaveSuccessMessage(null), 5000);
        await fetchBranch();
      } else {
        alert(data.message || "Failed to update subscription days");
      }
    } catch (err: any) {
      alert(err?.message || "Error updating subscription");
    } finally {
      setDaysSubmitting(false);
    }
  };

  // Filter modules based on search and tab
  const filteredModules = useMemo(() => {
    return SUPER_ADMIN_SIDEBAR_MODULES.filter((m) => {
      const q = moduleSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.desc && m.desc.toLowerCase().includes(q)) ||
        (Array.isArray(m.subModules) && m.subModules.some((s) => s.toLowerCase().includes(q))) ||
        (m.route && m.route.toLowerCase().includes(q));

      const isGranted = branchModules.includes(m.id);
      if (moduleFilter === "granted") return matchesSearch && isGranted;
      if (moduleFilter === "revoked") return matchesSearch && !isGranted;
      return matchesSearch;
    });
  }, [branchModules, moduleSearch, moduleFilter]);

  // Back button destination
  const handleBackNavigation = () => {
    if (fromApproval) {
      router.push(`/dashboard/super-admin/approvals/${fromApproval}`);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/super-admin/branches");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1500px] mx-auto min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center text-xl mb-3 border border-blue-200/80 shadow-2xs">
          <FaSync className="animate-spin text-blue-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Loading Sub-Branch Dossier...
        </span>
        <p className="text-[11px] text-slate-400 mt-1">
          Retrieving branch hierarchy credentials, license data & active module permissions
        </p>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="w-full max-w-[1500px] mx-auto min-h-[60vh] p-6 sm:p-8 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mb-4 border border-rose-200">
          <FaBan />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
          Branch Dossier Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-md mb-6">
          {error || "The requested branch node could not be retrieved or has been removed from the directory."}
        </p>
        <button
          type="button"
          onClick={handleBackNavigation}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-2 cursor-pointer"
        >
          <FaArrowLeft size={10} /> Go Back
        </button>
      </div>
    );
  }

  const parentName = parentCompany?.companyName || "Head Office Enterprise";
  const parentId = parentCompany?._id || "";
  const branchInitials = (branch.companyCode ? branch.companyCode.slice(0, 3) : branch.companyName ? branch.companyName.slice(0, 3) : "BR").toUpperCase();
  const isBranchActive = branch.status === "Active";

  return (
    <div className="w-full max-w-[1500px] mx-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5 text-slate-800">
      {/* 1. TOP NAVIGATION / BREADCRUMB & BACK BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Return to parent approval or branches list"
          >
            <FaArrowLeft size={11} className="text-slate-500" />
            <span>Back</span>
          </button>

          <nav className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            <Link
              href="/dashboard/super-admin"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/dashboard/super-admin/branches"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Branch Network
            </Link>
            <span className="text-slate-300">/</span>
            {fromApproval ? (
              <Link
                href={`/dashboard/super-admin/approvals/${fromApproval}`}
                className="hover:text-blue-600 transition-colors font-medium truncate max-w-[140px] sm:max-w-[200px]"
                title={parentName}
              >
                {parentName}
              </Link>
            ) : (
              <span className="truncate max-w-[140px] sm:max-w-[200px] text-slate-600 font-medium">
                {parentName}
              </span>
            )}
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[220px]">
              {branch.companyName}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={fetchBranch}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs transition-all shadow-2xs cursor-pointer"
            title="Refresh branch data"
          >
            <FaSync className={`text-slate-500 ${loading ? "animate-spin" : ""}`} size={12} />
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {saveSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
          <FaCheckCircle className="text-emerald-600 shrink-0" size={14} />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* 2. HERO HEADER CARD */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/70 to-blue-50/30 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar Monogram */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-800 border border-teal-200 flex items-center justify-center text-base sm:text-lg font-black shadow-2xs shrink-0">
              {branchInitials}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                  {branch.companyName}
                </h1>
                <span className="font-mono text-[10px] sm:text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  {branch.companyCode || "BRANCH"}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                    isBranchActive
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                  style={
                    isBranchActive
                      ? { backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }
                      : { backgroundColor: "#fff1f2", color: "#9f1239", borderColor: "#fca5a5" }
                  }
                >
                  ● {branch.status || "Active"}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Satellite Branch Node
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Sub-Branch node of{" "}
                {fromApproval ? (
                  <Link
                    href={`/dashboard/super-admin/approvals/${fromApproval}`}
                    className="font-bold text-blue-700 hover:underline"
                  >
                    {parentName}
                  </Link>
                ) : (
                  <strong className="text-slate-800">{parentName}</strong>
                )}{" "}
                • Inherits parent subscription tenure
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isEditingBranch) {
                  handleCancelEditBranch();
                } else {
                  setIsEditingBranch(true);
                }
              }}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                isEditingBranch
                  ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              }`}
            >
              <FaEdit size={11} />
              <span>{isEditingBranch ? "Cancel Edit" : "Edit Branch Info"}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95 ${
                isBranchActive
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
              style={
                isBranchActive
                  ? { backgroundColor: "#fff1f2", color: "#9f1239", borderColor: "#fca5a5" }
                  : { backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }
              }
              title={isBranchActive ? "Pause login access for this branch" : "Re-enable access for this branch"}
            >
              {actionLoading ? (
                <FaSync className="animate-spin text-xs" />
              ) : (
                <FaPowerOff size={11} />
              )}
              <span>{isBranchActive ? "Suspend Branch" : "Activate Branch"}</span>
            </button>

            {adminUser?._id && (
              <Link
                href={`/dashboard/super-admin/approvals/${adminUser._id}`}
                target="_blank"
                className="text-xs font-bold px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all flex items-center gap-2 shadow-2xs active:scale-95"
                style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}
                title="Open user approval & credentials dossier"
              >
                <FaExternalLinkAlt size={10} />
                <span>Admin User Profile</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* INLINE EDIT BRANCH FORM (Name, Company Name, Address only) */}
      {isEditingBranch && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-blue-400 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FaEdit className="text-blue-600 text-sm" />
              <h3 className="text-sm font-bold text-slate-900">Edit Branch Details</h3>
              <span className="text-[10px] text-slate-500 font-medium">
                (Super Admin can edit Name, Company Name, and Address)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelEditBranch}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Branch Manager / Contact Name
              </label>
              <input
                type="text"
                value={editBranchName}
                onChange={(e) => setEditBranchName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Branch / Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                placeholder="e.g. Mabsol - Amritsar Branch"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Registered Street Address
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="e.g. SCO 45, GT Road"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                City
              </label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="e.g. Amritsar"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="e.g. Punjab"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value)}
                  placeholder="e.g. 143001"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Read-Only Non-Editable System Attributes */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">BRANCH EMAIL (LOCKED)</span>
              <span className="font-mono text-slate-800 font-medium block truncate" title={adminUser?.email || branch.email}>{adminUser?.email || branch.email || "N/A"}</span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">ROLE (LOCKED)</span>
              <span className="font-semibold text-slate-800 block truncate">{adminUser?.roleName || adminUser?.roleType || "Branch Admin"}</span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">BRANCH CODE (LOCKED)</span>
              <span className="font-mono text-slate-800 font-semibold block">{branch.companyCode || "BRANCH"}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={updatingBranch}
              onClick={handleCancelEditBranch}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updatingBranch}
              onClick={handleSaveBranchInfo}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              {updatingBranch ? (
                <>
                  <FaSync className="animate-spin text-xs" /> Saving...
                </>
              ) : (
                <>
                  <FaSave size={11} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. KEY CREDENTIALS & DETAILS (RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Branch Node & Hierarchy */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FaCodeBranch className="text-teal-600" size={11} /> Branch Node & Hierarchy
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                Satellite
              </span>
            </div>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Classification:</span>
                <span className="font-bold text-slate-900">Connected Satellite Branch</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Branch Code:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {branch.companyCode || "BRANCH"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Parent Head Office:</span>
                {fromApproval ? (
                  <Link
                    href={`/dashboard/super-admin/approvals/${fromApproval}`}
                    className="font-bold text-blue-700 hover:underline truncate max-w-[160px]"
                    title={parentName}
                  >
                    {parentName}
                  </Link>
                ) : (
                  <span className="font-bold text-slate-900 truncate max-w-[160px]">{parentName}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold ${
                    isBranchActive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  ● {branch.status || "Active"}
                </span>
              </div>
            </div>
          </div>
          {branch.createdAt && (
            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              Created on {new Date(branch.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Card 2: Tax & Licensing Credentials */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FaShieldAlt className="text-blue-600" size={11} /> Tax & Licensing Credentials
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Verified
              </span>
            </div>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">GSTIN:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-slate-900">
                    {branch.gstNo || parentCompany?.gstNo || "N/A"}
                  </span>
                  {(branch.gstNo || parentCompany?.gstNo) && (
                    <button
                      type="button"
                      onClick={() => handleCopy(branch.gstNo || parentCompany?.gstNo, "gstin")}
                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                      title="Copy GSTIN"
                    >
                      {copiedField === "gstin" ? <FaCheck size={9} className="text-emerald-600" /> : <FaCopy size={9} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">PAN:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-slate-900">
                    {branch.panNo || parentCompany?.panNo || "N/A"}
                  </span>
                  {(branch.panNo || parentCompany?.panNo) && (
                    <button
                      type="button"
                      onClick={() => handleCopy(branch.panNo || parentCompany?.panNo, "pan")}
                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                      title="Copy PAN"
                    >
                      {copiedField === "pan" ? <FaCheck size={9} className="text-emerald-600" /> : <FaCopy size={9} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Drug License:</span>
                <span className="font-mono font-bold text-slate-900">
                  {branch.drugLicenseNo || parentCompany?.drugLicenseNo || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-start pt-1">
                <span className="text-slate-500 shrink-0">Address:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[190px]" title={branch.address || "Location unassigned"}>
                  {branch.address || "Location unassigned"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">City & State:</span>
                <span className="font-semibold text-slate-800">
                  {[branch.city, branch.state].filter(Boolean).join(", ") || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pincode:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {branch.pincode || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Branch Admin Contact Profile */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FaEnvelope className="text-indigo-600" size={11} /> Admin Contact Profile
              </span>
              {adminUser?._id && (
                <Link
                  href={`/dashboard/super-admin/approvals/${adminUser._id}`}
                  target="_blank"
                  className="text-[10.5px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <FaExternalLinkAlt size={8} /> Open Page
                </Link>
              )}
            </div>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-bold text-slate-900">
                  {adminUser?.name || "Branch Manager Unassigned"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Email:</span>
                <a
                  href={`mailto:${adminUser?.email || branch.email}`}
                  className="font-medium text-blue-600 hover:underline truncate max-w-[170px]"
                  title={adminUser?.email || branch.email || "N/A"}
                >
                  {adminUser?.email || branch.email || "N/A"}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Phone:</span>
                <a
                  href={`tel:${adminUser?.mobile || branch.mobile}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {adminUser?.mobile || branch.mobile || "N/A"}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Role & Status:</span>
                <span className="font-bold text-slate-800">
                  {adminUser?.roleName || adminUser?.roleType || "Branch Admin"} •{" "}
                  <span className={adminUser?.isApproved ? "text-emerald-700" : "text-amber-700"}>
                    {adminUser?.status || "Pending"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          {adminUser?.lastLoginAt && (
            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1">
              <FaClock size={9} />
              <span>Last active: {new Date(adminUser.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. SUBSCRIPTION VALIDITY & TENURE CONTROLS (IDENTICAL TO HEAD OFFICE CONTROLS) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FaCalendarAlt className="text-blue-600 text-sm" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Subscription Validity & Tenure Controls
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tenure.badgeClass}`}
                style={{ backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }}
              >
                ● {tenure.status}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Sub-branch inherits enterprise tenure from <strong>{parentName}</strong>:{" "}
              <strong className="text-slate-900">{tenure.remainingDays} days remaining</strong> (Valid until {tenure.expiryFormatted})
            </p>
          </div>

          {/* Days Adjustment Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => openDaysModal("add")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              style={{ backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }}
              title="Add bonus validity days to enterprise subscription"
            >
              <FaPlus size={9} />
              <span>Give Days</span>
            </button>
            <button
              type="button"
              onClick={() => openDaysModal("remove")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              style={{ backgroundColor: "#fff1f2", color: "#9f1239", borderColor: "#fca5a5" }}
              title="Deduct validity days from enterprise subscription"
            >
              <FaMinus size={9} />
              <span>Remove Days</span>
            </button>
            {fromApproval && (
              <Link
                href={`/dashboard/super-admin/approvals/${fromApproval}`}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
                style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                title="View parent head office approval page"
              >
                <FaBuilding size={10} />
                <span>Head Office Page</span>
              </Link>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>Tenure Consumption</span>
            <span>{tenure.remainingDays} / {tenure.totalDays} Days ({tenure.percent}%)</span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tenure.isExpired
                  ? "bg-rose-500"
                  : tenure.remainingDays <= 5
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500"
              }`}
              style={{ width: `${tenure.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. ACTIVE MODULE PRIVILEGES CARD */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Active Modules on {branch.companyCode || branch.companyName}
              </h2>
              <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                {branchModules.length} / {SUPER_ADMIN_SIDEBAR_MODULES.length} Granted
              </span>
              {modulesChanged && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any clip to grant or revoke specific module privileges for this sub-branch
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleGrantAllModules}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95"
              style={{ backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }}
            >
              Grant All
            </button>
            <button
              type="button"
              onClick={handleStopAllModules}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-95"
              style={{ backgroundColor: "#fff1f2", color: "#9f1239", borderColor: "#fca5a5" }}
            >
              Stop All
            </button>
            <button
              type="button"
              onClick={handleSyncWithHeadOffice}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 transition-all cursor-pointer shadow-2xs active:scale-95"
              style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}
              title="Copy active modules configured on parent Head Office"
            >
              Sync with Head Office
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Search module name or keyword..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setModuleFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                moduleFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({SUPER_ADMIN_SIDEBAR_MODULES.length})
            </button>
            <button
              type="button"
              onClick={() => setModuleFilter("granted")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                moduleFilter === "granted"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Granted ({branchModules.length})
            </button>
            <button
              type="button"
              onClick={() => setModuleFilter("revoked")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                moduleFilter === "revoked"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              Revoked ({SUPER_ADMIN_SIDEBAR_MODULES.length - branchModules.length})
            </button>
          </div>
        </div>

        {/* Module Cards Grid with All Sub-Modules Displayed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 max-h-[480px] overflow-y-auto pr-1">
          {filteredModules.map((m) => {
            const isGranted = branchModules.includes(m.id);
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isGranted
                    ? "bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 border-emerald-300/80 shadow-2xs"
                    : "bg-slate-50/60 border-slate-200/80 opacity-85"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isGranted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isGranted ? <FaCheck size={8} /> : <FaTimes size={8} />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {m.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                          {m.categoryLabel}
                        </span>
                      </div>
                      {m.desc && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {m.desc}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleModule(m.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs ${
                      isGranted
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                    }`}
                    style={
                      isGranted
                        ? { backgroundColor: "#f0fdf4", color: "#065f46", borderColor: "#86efac" }
                        : { backgroundColor: "#fff1f2", color: "#9f1239", borderColor: "#fca5a5" }
                    }
                  >
                    {isGranted ? "Granted ✓" : "Stopped ✕"}
                  </button>
                </div>

                {/* Sub-Modules Display: Clearly list all sub-modules */}
                {Array.isArray(m.subModules) && m.subModules.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>Sub-Modules ({m.subModules.length})</span>
                      <span className="font-mono text-[9px] text-slate-400">{m.route}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.subModules.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className={`text-[9.5px] font-medium px-2 py-0.5 rounded-md border ${
                            isGranted
                              ? "bg-white/90 text-slate-700 border-slate-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}
                        >
                          • {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Bar inside card */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {modulesChanged ? (
              <span className="font-bold text-amber-700">
                You have unsaved changes to this branch&apos;s permissions.
              </span>
            ) : (
              <span>All module permissions are synchronized and saved.</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {modulesChanged && (
              <button
                type="button"
                onClick={() => setBranchModules([...originalModules])}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Reset Changes
              </button>
            )}

            <button
              type="button"
              disabled={savingModules || !modulesChanged}
              onClick={handleSaveModules}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2 ${
                modulesChanged
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
              style={
                modulesChanged
                  ? { backgroundColor: "#2563eb", color: "#ffffff", borderColor: "#2563eb" }
                  : undefined
              }
            >
              {savingModules ? (
                <>
                  <FaSync className="animate-spin text-xs" /> Saving Privileges...
                </>
              ) : (
                <>
                  <FaSave size={11} /> Save Branch Module Privileges
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6. GIVE / REMOVE DAYS INTERACTIVE MODAL */}
      {showDaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                    daysAction === "add"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {daysAction === "add" ? <FaPlus /> : <FaMinus />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {daysAction === "add" ? "Grant Bonus Validity Days" : "Deduct Validity Days"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Modifying enterprise tenure for {parentName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Preset:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[7, 15, 30, 60, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDaysAdjustment(d);
                      setDaysInput(String(d));
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      Number(daysInput) === d
                        ? daysAction === "add"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-400"
                          : "bg-rose-50 text-rose-800 border-rose-400"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {daysAction === "add" ? `+${d}` : `-${d}`} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Custom Days:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={daysInput}
                  onChange={(e) => {
                    setDaysInput(e.target.value);
                    setDaysAdjustment(Number(e.target.value) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 transition-all"
                  placeholder="Enter number of days"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                  Days
                </span>
              </div>
            </div>

            {/* Projected Expiry Preview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Current Expiry:</span>
                <span className="font-semibold text-slate-800">{tenure.expiryFormatted}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200/80">
                <span className="font-bold">Projected New Expiry:</span>
                <span
                  className={`font-mono font-bold ${
                    daysAction === "add" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {getProjectedExpiry(Number(daysInput) || 0, daysAction)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={daysSubmitting || !Number(daysInput) || Number(daysInput) <= 0}
                onClick={handleUpdateSubscriptionDays}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                  daysAction === "add"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {daysSubmitting ? (
                  <>
                    <FaSync className="animate-spin text-xs" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave size={10} /> Confirm {daysAction === "add" ? "+ Give" : "- Remove"} Days
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BranchDossierPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1500px] mx-auto min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
          <FaSync className="animate-spin text-blue-600 text-2xl mb-2" />
          <span className="text-xs font-bold text-slate-700">Loading Branch Dossier...</span>
        </div>
      }
    >
      <BranchDossierContent />
    </Suspense>
  );
}
