"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePermission } from "@/context/PermissionContext";
import {
  FaBrain,
  FaBell,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
  FaLightbulb,
  FaArrowRight,
  FaWhatsapp,
  FaEnvelope,
  FaTrash,
  FaFilter,
  FaSearch,
  FaSun,
  FaBoxes,
  FaBullseye,
  FaClipboardList,
  FaCheck,
  FaRobot,
  FaShieldAlt,
  FaExternalLinkAlt,
  FaKey,
} from "react-icons/fa";

interface AiNotificationItem {
  _id: string;
  title: string;
  message: string;
  suggestedAction?: string;
  actionUrl?: string;
  type: string;
  category: string;
  severity: "info" | "warning" | "error" | "success";
  impactScore?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "";
  targetRole?: string;
  aiGenerated?: boolean;
  isRead: boolean;
  metadata?: {
    model?: string;
    scannedAt?: string;
    mode?: string;
    tier?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface AiApiMeta {
  tier: string;
  status: "active" | "quota_exhausted" | "key_invalid" | "key_missing";
  model: string;
  isFreeTier: boolean;
  isQuotaExhausted: boolean;
  alertBanner?: {
    type: "info" | "warning" | "error";
    title: string;
    message: string;
    hint: string;
  };
}

// Client-side route sanitizer to ensure 0 broken links
function safeActionUrl(url?: string, category: string = "GENERAL"): { href: string; label: string } {
  const raw = String(url || "").trim().toLowerCase();

  if (raw.includes("expir")) {
    return { href: "/dashboard/stock/expiry-liquidator", label: "View Expiry Liquidator" };
  }
  if (raw.includes("reorder") || raw.includes("purchase/order") || raw.includes("po")) {
    return { href: "/dashboard/purchase/orders/create", label: "Create Purchase Order" };
  }
  if (raw.includes("purchase")) {
    return { href: "/dashboard/purchase/dashboard", label: "Purchase Dashboard" };
  }
  if (raw.includes("product")) {
    return { href: "/dashboard/inventory/products", label: "View Products" };
  }
  if (raw.includes("inventory") || raw.includes("stock") || category === "INVENTORY") {
    return { href: "/dashboard/inventory/dashboard", label: "Inventory Dashboard" };
  }
  if (raw.includes("target") || category === "TARGETS") {
    return { href: "/dashboard/reports/target-vs-actual", label: "Target vs Actual Report" };
  }
  if (raw.includes("form") || category === "CUSTOM_FORMS") {
    return { href: "/dashboard/custom-forms", label: "Custom Forms Hub" };
  }
  if (raw.includes("outstanding") || raw.includes("credit") || raw.includes("payment") || category === "FINANCIAL") {
    return { href: "/dashboard/reports/outstanding", label: "Outstanding Report" };
  }
  if (raw.includes("mr") || raw.includes("doctor") || raw.includes("dcr") || category === "FIELD_FORCE") {
    return { href: "/dashboard/mr-reporting", label: "MR Reporting & DCR" };
  }
  if (raw === "/dashboard/executive-ai") {
    return { href: "/dashboard/executive-ai", label: "Executive AI Dashboard" };
  }

  // Exact fallback check
  if (url && url.startsWith("/dashboard")) {
    // Avoid non-existent settings subpage
    if (url.includes("/inventory/settings")) {
      return { href: "/dashboard/inventory/dashboard", label: "Inventory Dashboard" };
    }
    return { href: url, label: "Take Action" };
  }

  return { href: "/dashboard", label: "Open Dashboard" };
}

export default function AiNotificationsPage() {
  const perm = usePermission();
  const [notifications, setNotifications] = useState<AiNotificationItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string>("AI Smart Engine");
  const [apiMeta, setApiMeta] = useState<AiApiMeta | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const hasLoadedRef = useRef(false);

  // Fetch API status & metadata
  const fetchApiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-notifications/scan");
      const data = await res.json();
      if (data.success && data.apiMeta) {
        setApiMeta(data.apiMeta);
        if (data.apiMeta.model) {
          setLastModelUsed(data.apiMeta.model);
        }
      }
    } catch (err) {
      console.error("Failed to load API status:", err);
    }
  }, []);

  // Fetch notifications safely without disrupting UI
  const fetchNotifications = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        // Find most recent AI alert to display model name
        const latestAi = data.notifications.find((n: any) => n.aiGenerated);
        if (latestAi?.metadata?.model) {
          setLastModelUsed(latestAi.metadata.model);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchNotifications(false);
      fetchApiStatus();
    }
  }, [fetchNotifications, fetchApiStatus]);

  // Trigger Live AI Scan
  const handleRunAiScan = async (mode: "full_audit" | "morning_briefing" = "full_audit") => {
    try {
      setScanning(true);
      setScanSummary(null);
      const res = await fetch("/api/ai-notifications/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();

      if (data.success) {
        setScanSummary(
          `✨ Scan Complete (${data.modelUsed}): ${data.newAlertsCreated} new alerts generated across ${data.totalAlertsEvaluated} findings.`
        );
        if (data.apiMeta) {
          setApiMeta(data.apiMeta);
        }
        const cleanModel = data.modelUsed ? String(data.modelUsed).replace(/gemini-?/gi, "AI ") : "AI Smart Engine";
        setLastModelUsed(cleanModel);
        setLastScannedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        await fetchNotifications(false);
      } else {
        setScanSummary(`⚠️ Scan Notice: ${data.error || "Could not complete scan."}`);
      }
    } catch (err: any) {
      setScanSummary(`❌ Scan Error: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  // Mark single notification read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    setNotifications([]);
    try {
      await fetch("/api/notifications?clearAll=true", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear all:", err);
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter((n) => {
    if (unreadOnly && n.isRead) return false;

    if (activeTab === "CRITICAL") {
      if (n.severity !== "error" && n.impactScore !== "CRITICAL") return false;
    } else if (activeTab === "INVENTORY") {
      if (n.category !== "INVENTORY") return false;
    } else if (activeTab === "TARGETS") {
      if (n.category !== "TARGETS") return false;
    } else if (activeTab === "FORMS") {
      if (n.category !== "CUSTOM_FORMS" && n.type !== "FORM_ALERT") return false;
    } else if (activeTab === "AI_ONLY") {
      if (!n.aiGenerated && n.type !== "AI_INSIGHT" && n.type !== "BRIEFING") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchAction = n.suggestedAction?.toLowerCase().includes(q);
      const matchCategory = n.category?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchAction || matchCategory;
    }

    return true;
  });

  // Derived Stats
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter(
    (n) => (n.severity === "error" || n.impactScore === "CRITICAL") && !n.isRead
  ).length;
  const inventoryAlertsCount = notifications.filter((n) => n.category === "INVENTORY").length;
  const targetAlertsCount = notifications.filter((n) => n.category === "TARGETS").length;

  const isQuotaExhausted = apiMeta?.isQuotaExhausted || apiMeta?.status === "quota_exhausted";

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & AI Control Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 text-white p-6 sm:p-8 shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-60 h-60 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <FaBrain className="animate-pulse text-indigo-300" />
              <span>AI Intelligent Operations Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              AI Smart Alerts & Notifications
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Autonomous cross-system monitoring across Inventory Stock, Targets, Doctor Visits, Form Submissions, and Collections powered by AI Diagnostic Engine.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              {isQuotaExhausted ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Free Tier Quota Paused (Pharma Fallback Active)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Free Tier Active: {lastModelUsed}
                </span>
              )}
              {lastScannedTime && <span>• Last Scanned: {lastScannedTime}</span>}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleRunAiScan("full_audit")}
              disabled={scanning}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <FaSyncAlt className={`${scanning ? "animate-spin" : ""}`} />
              <span>{scanning ? "AI Scanning CRM..." : "⚡ Run AI System Scan"}</span>
            </button>

            <button
              onClick={() => handleRunAiScan("morning_briefing")}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm backdrop-blur-md border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Generate Daily Morning Briefing"
            >
              <FaSun className="text-amber-300" />
              <span>Morning Briefing</span>
            </button>

            <button
              onClick={() => fetchNotifications(true)}
              disabled={initialLoading || refreshing || scanning}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm backdrop-blur-md border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Refresh Alerts"
            >
              <FaSyncAlt className={`${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Scan Status Toast Banner */}
        {scanSummary && (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-sm text-white flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <FaRobot className="text-indigo-300 text-lg flex-shrink-0" />
              <span>{scanSummary}</span>
            </div>
            <button
              onClick={() => setScanSummary(null)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Live AI Tier Status & Quota Alert Banner */}
      {apiMeta?.alertBanner && !bannerDismissed && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isQuotaExhausted
              ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200"
              : apiMeta.status === "key_missing" || apiMeta.status === "key_invalid"
              ? "bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-950 dark:text-indigo-200"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${
                isQuotaExhausted
                  ? "bg-amber-500 text-white animate-pulse"
                  : apiMeta.status === "key_missing"
                  ? "bg-rose-500 text-white"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {isQuotaExhausted ? (
                <FaExclamationTriangle />
              ) : apiMeta.status === "key_missing" ? (
                <FaKey />
              ) : (
                <FaBrain />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-sm tracking-tight">
                  {apiMeta.alertBanner.title}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isQuotaExhausted
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {isQuotaExhausted ? "Free Quota Limit • Pharma Fallback Active" : "Free Tier Active"}
                </span>
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {apiMeta.alertBanner.message}
              </p>

              {apiMeta.alertBanner.hint && (
                <p className="text-[11px] font-medium opacity-75 pt-0.5 flex items-center gap-1.5">
                  <FaLightbulb className="text-amber-500 flex-shrink-0 text-[10px]" />
                  <span>{apiMeta.alertBanner.hint}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <button
              onClick={() => handleRunAiScan("full_audit")}
              disabled={scanning}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
                isQuotaExhausted
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {scanning ? "Testing API..." : "Test Connection"}
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Alerts</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{unreadCount} unread items</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
            <FaBell />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Critical Actions</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{criticalCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">High business impact</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shadow-inner">
            <FaExclamationTriangle />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Stock & Expiry</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{inventoryAlertsCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Low inventory items</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
            <FaBoxes />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Sales & Targets</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{targetAlertsCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active portfolios</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
            <FaBullseye />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Alerts", count: totalCount },
            { id: "CRITICAL", label: "🚨 Critical", count: criticalCount },
            { id: "INVENTORY", label: "📦 Stock", count: inventoryAlertsCount },
            { id: "TARGETS", label: "🎯 Targets", count: targetAlertsCount },
            { id: "FORMS", label: "📋 Forms" },
            { id: "AI_ONLY", label: "✨ AI Insights" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search alerts, medicines, reps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="hidden sm:inline">Unread</span>
          </label>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              title="Mark all as read"
            >
              Mark Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
              title="Clear all alerts"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Feed */}
      <div className="space-y-3.5">
        {initialLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <FaSyncAlt className="animate-spin text-3xl text-indigo-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading AI Notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <FaCheckCircle />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">All Systems Clear!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto">
                {unreadOnly
                  ? "You have no unread notifications matching this filter."
                  : "No operational alerts detected. Click 'Run AI System Scan' to conduct a real-time AI audit of your inventory, targets, and field submissions."}
              </p>
            </div>
            <button
              onClick={() => handleRunAiScan("full_audit")}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 cursor-pointer"
            >
              <FaSyncAlt className={scanning ? "animate-spin" : ""} />
              <span>Run Instant AI Scan</span>
            </button>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isCritical = notif.severity === "error" || notif.impactScore === "CRITICAL";
            const isWarning = notif.severity === "warning" || notif.impactScore === "HIGH";

            const shareText = encodeURIComponent(
              `*Pharma CRM Alert: ${notif.title}*\n${notif.message}\n${
                notif.suggestedAction ? `*Recommended Action:* ${notif.suggestedAction}` : ""
              }`
            );

            const safeLink = safeActionUrl(notif.actionUrl, notif.category);

            return (
              <div
                key={notif._id}
                className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 hover:shadow-lg p-5 ${
                  !notif.isRead
                    ? isCritical
                      ? "border-rose-400/80 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm"
                      : isWarning
                      ? "border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm"
                      : "border-indigo-300/80 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-sm"
                    : "border-slate-200/80 dark:border-slate-800/80 opacity-90 hover:opacity-100"
                }`}
              >
                {/* Left accent border */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isCritical
                      ? "bg-rose-500"
                      : isWarning
                      ? "bg-amber-500"
                      : notif.severity === "success"
                      ? "bg-emerald-500"
                      : "bg-indigo-500"
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Top Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-black text-[10px] tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                          CRITICAL ALERT
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] uppercase">
                          HIGH PRIORITY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold text-[10px] uppercase">
                          INSIGHT
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                        {notif.category || "SYSTEM"}
                      </span>

                      {notif.aiGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-semibold text-[10px]">
                          <FaBrain className="text-[9px]" />
                          AI Engine
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 ml-auto sm:ml-0">
                        {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" title="Unread" />
                      )}
                    </div>

                    {/* Notification Title */}
                    <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                      {notif.title}
                    </h3>

                    {/* Diagnostic Message */}
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                      {notif.message}
                    </p>

                    {/* AI Recommended Action Box */}
                    {notif.suggestedAction && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
                        <FaLightbulb className="text-amber-500 text-base mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            AI Recommended Action:
                          </p>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {notif.suggestedAction}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex-shrink-0">
                    {/* Primary Deep Link */}
                    {safeLink.href && (
                      <Link
                        href={safeLink.href}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 whitespace-nowrap"
                        title={`Navigate to ${safeLink.label}`}
                      >
                        <span>{safeLink.label}</span>
                        <FaArrowRight className="text-[10px]" />
                      </Link>
                    )}

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Share Button */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${shareText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Share alert on WhatsApp"
                      >
                        <FaWhatsapp className="text-sm" />
                      </a>

                      {/* Mark Read Toggle */}
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif._id)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <FaCheck className="text-xs" />
                        </button>
                      )}

                      {/* Delete / Dismiss */}
                      <button
                        onClick={() => handleDeleteNotification(notif._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
