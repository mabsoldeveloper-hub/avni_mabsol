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
  FaExclamationTriangle,
  FaCodeBranch,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import { DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";
import { SESSION_TIMEOUT_PRESETS, DEFAULT_USER_SESSION_HOURS } from "@/lib/constants/session.constant";

const SYSTEM_MODULES = [
  { id: "billing", name: "Billing & Invoicing", desc: "GST sales, invoices, and credit notes" },
  { id: "inventory", name: "Inventory & Stock", desc: "Batch tracking, expiry, and godown stock" },
  { id: "purchases", name: "Purchases & Inward", desc: "PO management and supplier inward challans" },
  { id: "sales", name: "Sales & Distribution", desc: "Sales orders, rate lists, and dispatch" },
  { id: "fieldforce", name: "Field Force & MR Reporting", desc: "Daily MR calls, tour programs, and expenses" },
  { id: "financial_years", name: "Financial Year Transitions", desc: "Accounting year closing and balance forward" },
  { id: "custom_forms", name: "AI Form Studio", desc: "Dynamic field forms and custom inspection templates" },
  { id: "reports", name: "Reports & Compliance", desc: "Drug schedule registers and tax analytics" },
];

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
  const [enabledModules, setEnabledModules] = useState<string[]>([
    "billing",
    "inventory",
    "purchases",
    "sales",
    "fieldforce",
    "financial_years",
    "custom_forms",
    "reports",
  ]);

  // Track initial saved values to enable Save button only on actual changes
  const [initialSessionHours, setInitialSessionHours] = useState<number>(DEFAULT_USER_SESSION_HOURS);

  // Modal states for subscription days management (Matches exact adjustment UI)
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [adjustmentAction, setAdjustmentAction] = useState<"add" | "remove">("add");
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentInput, setAdjustmentInput] = useState<string>("0");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "access" | "modules" | "audit">("overview");

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
        if (data.user.companyId?.enabledModules && Array.isArray(data.user.companyId.enabledModules) && data.user.companyId.enabledModules.length > 0) {
          setEnabledModules(data.user.companyId.enabledModules);
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
  const userModules = user?.companyId?.enabledModules || [];
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

      // ONLY send durationDays when first approving or explicitly adjusting tenure
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

  // Submit subscription days update from the modal (Matches exact user screenshot)
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
            ? `Successfully added +${days} days to subscription!`
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

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto min-h-[65vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-3 border border-blue-100 shadow-2xs">
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
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mb-4 border border-rose-200">
          <FaBan />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Tenant Record Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          {error || "The requested tenant record could not be found or has been removed from the directory."}
        </p>
        <Link
          href="/dashboard/super-admin"
          className="px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-all"
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
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
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
    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    let dotClass = "bg-emerald-500";

    if (isExpired) {
      status = "Subscription Expired";
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
      dotClass = "bg-rose-500";
    } else if (remainingDays <= 5) {
      status = "Expiring Soon";
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
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

  // Helper to project new expiry date in modal
  const getProjectedExpiry = (daysToAdd: number, mode: "extend" | "set") => {
    const now = new Date().getTime();
    let base = now;
    if (mode === "extend" && user?.accessValidUntil) {
      const currentExpiry = new Date(user.accessValidUntil).getTime();
      if (currentExpiry > now) base = currentExpiry;
    }
    const newDate = new Date(base + daysToAdd * 24 * 60 * 60 * 1000);
    return newDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3 text-slate-800">
      {/* DELETED ACCOUNT ALERT BANNER */}
      {user.isDeleted && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-base shadow-2xs">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FaUndo size={11} /> Restore Account
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handlePermanentDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FaTrash size={11} /> Purge Forever
            </button>
          </div>
        </div>
      )}      {/* 1. TOP HERO BANNER & AVATAR CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        {/* Gradient Top Half with Action Buttons */}
        <div className="h-24 sm:h-28 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 relative p-4 sm:p-5 flex items-start justify-between">
          <Link
            href="/dashboard/super-admin"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-2xs border border-white/10"
          >
            <FaArrowLeft size={10} /> Back to Clearance
          </Link>

          {/* Quick Action Buttons in Top Right */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user.isDeleted ? (
              <>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FaUndo size={11} /> Restore Account
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FaTrash size={11} /> Purge Forever
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
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-600 text-amber-200 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-amber-400/30 flex items-center gap-1.5"
                  >
                    <FaBan size={10} /> Reject
                  </button>
                )}

                {user.isApproved && (
                  <button
                    type="button"
                    onClick={() => handleAction(isSuspended ? "activate" : "suspend")}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-white/20"
                  >
                    {isSuspended ? "Reactivate" : "Suspend"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-rose-400/30 flex items-center gap-1.5"
                  title="Soft delete this account"
                >
                  <FaTrash size={10} /> Delete
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(user.isApproved ? "update_settings" : "approve")}
                  disabled={actionLoading || (user.isApproved && !isDirty)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    user.isApproved && !isDirty
                      ? "bg-white/20 text-white/50 cursor-not-allowed border border-white/10"
                      : "bg-white text-indigo-950 hover:bg-indigo-50 cursor-pointer shadow-sm"
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

        {/* Bottom Profile Details with Overlapping Initials Avatar */}
        <div className="px-4 pb-3.5 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
              {/* Avatar Box with Soft Shadow - pulls up into banner alone */}
              <div className="-mt-8 sm:-mt-10 w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md border-4 border-white flex items-center justify-center text-blue-600 text-xl sm:text-2xl font-extrabold tracking-tight shrink-0">
                {initials}
              </div>

              {/* Company Title & Badges - cleanly positioned on the white card */}
              <div className="pt-1.5 sm:pt-2">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {companyName}
                  </h1>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                      user.isDeleted
                        ? "bg-red-50 text-red-700 border-red-200"
                        : user.status === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : !user.isApproved
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isSuspended
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
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
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${degradation.badgeClass}`}>
                    {degradation.remainingDays} Days Active
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-mono mt-1">
                  {companyCode ? (
                    <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
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
                      <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        Head Office ({branchCount} Branches)
                      </span>
                    </>
                  ) : parentComp ? (
                    <>
                      <span>•</span>
                      <span className="text-teal-700 font-bold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        Branch of {parentComp.companyCode || parentComp.companyName}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Ribbon with Icons */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
            <a
              href={`mailto:${user.email}`}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
            >
              <FaEnvelope className="text-slate-400" size={12} /> {user.email}
            </a>
            {(user.mobile || company.mobile) && (
              <a
                href={`tel:${user.mobile || company.mobile}`}
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
              >
                <FaPhone className="text-slate-400" size={12} /> {user.mobile || company.mobile}
              </a>
            )}
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <FaMapMarkerAlt className="text-slate-400" size={12} /> {[city, state, country].filter(Boolean).join(", ") || "India"}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 ml-auto text-[11px]">
              <FaClock className="text-slate-400" size={11} />
              Registered: {new Date(user.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 5-KPI METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* KPI 1: Active Days Remaining & Degradation */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs border border-blue-100 shadow-2xs">
              <FaCalendarAlt />
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/70 uppercase">
              Validity
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tabular-nums tracking-tight">
              {degradation.remainingDays} Days
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Remaining Balance</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {degradation.status} • {degradation.totalDays}d total
            </div>
          </div>
        </div>

        {/* KPI 2: Session Timeout */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs border border-indigo-100 shadow-2xs">
              <FaClock />
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/70 uppercase">
              Security
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tabular-nums tracking-tight">
              {selectedSessionHours} Hour{selectedSessionHours > 1 ? "s" : ""}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Session Timeout</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Inactivity re-auth</div>
          </div>
        </div>

        {/* KPI 3: Enabled Modules */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xs border border-cyan-100 shadow-2xs">
              <FaBoxes />
            </div>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200/70 uppercase">
              Modules
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tabular-nums tracking-tight">
              {enabledModules.length} / {SYSTEM_MODULES.length}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Active Modules</div>
            <div className="text-[11px] text-slate-400 mt-0.5">CRM capabilities</div>
          </div>
        </div>

        {/* KPI 4: Primary Admin */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shadow-2xs">
              <FaUserCheck />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 uppercase">
              Admin
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-slate-900 leading-tight truncate tracking-tight">
              {user.name || "Primary User"}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Root Administrator</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{user.email}</div>
          </div>
        </div>

        {/* KPI 5: Compliance Status */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md transition-all flex flex-col justify-between col-span-2 sm:col-span-1 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-xs border border-violet-100 shadow-2xs">
              <FaShieldAlt />
            </div>
            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200/70 uppercase">
              Audit
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">
              {gstin !== "N/A" ? "Verified" : "Pending"}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Pharma Compliance</div>
            <div className="text-[11px] text-slate-400 mt-0.5">GSTIN & License</div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1 text-xs font-bold pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-3 transition-all cursor-pointer relative ${
            activeTab === "overview"
              ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("access")}
          className={`pb-2 px-3 transition-all cursor-pointer relative ${
            activeTab === "access"
              ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Subscription & Session Access
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("modules")}
          className={`pb-2 px-3 transition-all cursor-pointer relative ${
            activeTab === "modules"
              ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Module Permissions
        </button>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEFT COLUMN: Admin Account Details, Company Info, Module Permissions (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Card 1: Admin Account Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-1">
              <h3 className="text-sm font-bold text-slate-900">Admin Account Details</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(user.email)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <FaIdCard size={11} /> Copy Details
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Account Owner</span>
                <span className="font-bold text-slate-900">{companyName}</span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Login Email</span>
                <span className="font-mono text-slate-700 font-semibold">{user.email}</span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Contact Phone</span>
                <span className="font-mono text-slate-800 font-semibold">{user.mobile || company.mobile || "N/A"}</span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Designation Role</span>
                <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">
                  {user.role || "ADMIN"}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Registered Date</span>
                <span className="text-slate-800 font-medium">
                  {new Date(user.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Company Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Company & Branch Details
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isHeadOffice
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-teal-50 text-teal-700 border-teal-200"
                }`}
              >
                {isHeadOffice ? "Head Office" : "Child Branch"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CRM Company Code
                </span>
                <span className="font-mono font-bold text-slate-900 mt-1 block bg-white border border-slate-200 px-2 py-0.5 rounded-md w-fit shadow-2xs">
                  {companyCode || "N/A"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Branch Hierarchy
                </span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {isHeadOffice ? `Head Office (${branchCount} Sub-Branches)` : `Branch of ${parentComp?.companyName || "Head Office"}`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Entity Formulation
                </span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {(company.businessType || "Pharma Distribution").toUpperCase().replace(/_/g, " ")}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Operating Location
                </span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {[city, state].filter(Boolean).join(", ") || "Unassigned"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  GSTIN Number
                </span>
                <span className="font-mono font-bold text-slate-900 mt-1 block bg-white border border-slate-200 px-2 py-0.5 rounded-md w-fit shadow-2xs">
                  {gstin || "N/A"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Drug License No
                </span>
                <span className="font-mono font-bold text-slate-900 mt-1 block bg-white border border-slate-200 px-2 py-0.5 rounded-md w-fit shadow-2xs">
                  {drugLicense || "N/A"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  PAN Number
                </span>
                <span className="font-mono font-bold text-slate-900 mt-1 block">{pan || "N/A"}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contact Person
                </span>
                <span className="font-bold text-slate-900 mt-1 block">{user.name}</span>
              </div>

              <div className="sm:col-span-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Registered Commercial Address
                </span>
                <span className="text-slate-700 font-medium mt-1 block leading-relaxed">
                  {fullAddress}
                </span>
              </div>

              {/* Connected Sub-Branches list if Head Office */}
              {isHeadOffice && childBranches.length > 0 && (
                <div className="sm:col-span-2 pt-2 mt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Connected Sub-Branches ({childBranches.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {childBranches.map((cb: any) => (
                      <span
                        key={cb._id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-semibold shadow-2xs"
                      >
                        <FaCodeBranch size={9} className="text-teal-600" />
                        <span>{cb.companyName} ({cb.companyCode})</span>
                        <span className="text-[9.5px] text-teal-600 font-mono">[{cb.city || "Branch"}]</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Module Permissions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enabled Modules & Capabilities</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Select active CRM capabilities for this tenant</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (enabledModules.length === SYSTEM_MODULES.length) {
                    setEnabledModules([]);
                  } else {
                    setEnabledModules(SYSTEM_MODULES.map((m) => m.id));
                  }
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                {enabledModules.length === SYSTEM_MODULES.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYSTEM_MODULES.map((mod) => {
                const isSelected = enabledModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-200/90 ring-1 ring-indigo-500/20 shadow-2xs"
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] mt-0.5 shrink-0 border transition-all ${
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <FaCheck />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{mod.name}</div>
                      <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{mod.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Subscription & Active Days Degradation, Session Timeout (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Card 1: Subscription & Degradation Analytics (With + Manage Days Button) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Subscription & Active Days</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Daily degradation & active authorization</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentAction("add");
                  setAdjustmentDays(0);
                  setAdjustmentInput("0");
                  setShowDaysModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FaPlus size={9} /> Manage Days
              </button>
            </div>

            {/* Circular Degradation Gauge Ring */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="relative w-26 h-26 sm:w-28 sm:h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className={`transition-all duration-700 ease-out ${
                      degradation.isExpired
                        ? "stroke-rose-500"
                        : degradation.remainingDays <= 5
                        ? "stroke-amber-500"
                        : "stroke-indigo-600"
                    }`}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - degradation.percent / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span
                    className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${
                      degradation.isExpired ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {degradation.isExpired ? "0" : degradation.remainingDays}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">
                    {degradation.isExpired ? "EXPIRED" : "DAYS LEFT"}
                  </span>
                </div>
              </div>
            </div>

            {/* Degradation Telemetry Rows */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <div className="flex justify-between items-center font-semibold mb-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        degradation.isExpired
                          ? "bg-rose-500"
                          : degradation.remainingDays <= 5
                          ? "bg-amber-500"
                          : "bg-indigo-600"
                      }`}
                    />
                    Active Days Degradation
                  </span>
                  <span className="text-slate-900 font-bold">{degradation.percent}% Remaining</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      degradation.isExpired
                        ? "bg-rose-500"
                        : degradation.remainingDays <= 5
                        ? "bg-amber-500"
                        : "bg-indigo-600"
                    }`}
                    style={{ width: `${degradation.percent}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Subscription Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${degradation.badgeClass}`}>
                    {degradation.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Granted Plan</span>
                  <span className="font-bold text-slate-800">{degradation.totalDays} Days Total</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Days Elapsed</span>
                  <span className="font-medium text-slate-600">{degradation.daysElapsed} Days Degraded</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Expires On</span>
                  <span className="font-semibold text-slate-800 font-mono text-[10.5px]">
                    {degradation.expiryFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: User Login Session Timeout */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FaClock className="text-indigo-600" />
                User Login Session Timeout
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                Super Admin = 365 Days
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SESSION_TIMEOUT_PRESETS.map((preset) => {
                const isSelected = selectedSessionHours === preset.hours && !customSessionHours;
                const match = preset.label.match(/^([^(]+)(?:\((.*)\))?$/);
                const main = match ? match[1].trim() : preset.label;
                const sub = match && match[2] ? `(${match[2].trim()})` : null;

                return (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => {
                      setSelectedSessionHours(preset.hours);
                      setCustomSessionHours("");
                    }}
                    className={`min-h-[44px] py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/30"
                        : "bg-slate-50/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{main}</span>
                    {sub ? (
                      <span className={`text-[9.5px] leading-tight font-normal mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                        {sub}
                      </span>
                    ) : (
                      <span className="text-[9.5px] leading-tight opacity-0 select-none mt-0.5">-</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Session Input */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 font-medium">Or custom hours:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="8760"
                  placeholder="e.g. 3 or 6"
                  value={customSessionHours}
                  onChange={(e) => setCustomSessionHours(e.target.value)}
                  className="w-full pl-3.5 pr-14 py-2 rounded-xl text-xs bg-slate-50/80 border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Hours
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: ADJUSTMENT ACTION & SUBSCRIPTION DAYS (Matches User Reference Image) */}
      {showDaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-7 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            
            {/* Modal Header with Title & Close 'X' Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Adjust Subscription Days
                </h3>
                <p className="text-[11px] text-slate-500">
                  Update active account tenure and access validity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Section 1: ADJUSTMENT ACTION */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                Adjustment Action
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentAction("add");
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    adjustmentAction === "add"
                      ? "border border-blue-500 bg-blue-50/70 text-blue-600 shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base font-bold leading-none">+</span> Add Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentAction("remove");
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    adjustmentAction === "remove"
                      ? "border border-blue-500 bg-blue-50/70 text-blue-600 shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base font-bold leading-none">—</span> Remove Days
                </button>
              </div>
            </div>

            {/* Section 2: DAYS TO ADD / REMOVE (MAX 365) */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                {adjustmentAction === "add" ? "Days to Add (Max 365)" : "Days to Remove (Max 365)"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[30, 90, 180, 365].map((preset) => {
                  const isSelected = adjustmentDays === preset && adjustmentInput === String(preset);
                  const sign = adjustmentAction === "add" ? "+" : "-";
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAdjustmentDays(preset);
                        setAdjustmentInput(String(preset));
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {sign}{preset} Days
                    </button>
                  );
                })}
              </div>

              {/* Input Box with + or — prefix (Matches Screenshot) */}
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  {adjustmentAction === "add" ? "+" : "—"}
                </span>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={adjustmentInput}
                  onChange={(e) => {
                    setAdjustmentInput(e.target.value);
                    const val = Number(e.target.value);
                    if (!isNaN(val)) setAdjustmentDays(val);
                  }}
                  placeholder="0"
                  className="w-full py-2.5 pl-9 pr-4 text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons (Matches Screenshot) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDaysModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSubscription}
                disabled={modalSubmitting}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {modalSubmitting ? (
                  <>
                    <FaSync className="animate-spin text-xs" /> Updating...
                  </>
                ) : (
                  "Update Subscription"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
