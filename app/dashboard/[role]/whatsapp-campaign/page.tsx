"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaWhatsapp,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaChartLine,
  FaUsers,
  FaSpinner,
  FaTrash,
  FaEye,
  FaMagic,
  FaInfoCircle,
  FaMobileAlt,
  FaCopy,
  FaCheck,
  FaStop,
  FaArrowRight,
  FaDownload,
  FaExternalLinkAlt,
  FaBuilding,
  FaUserCheck,
  FaSlidersH,
  FaSearch,
} from "react-icons/fa";

interface LogEntry {
  id: string;
  timestamp: string;
  phone: string;
  status: "sending" | "sent" | "failed";
  messageId?: string;
  error?: string;
}

interface RecipientDetail {
  phone: string;
  status: "pending" | "sent" | "failed";
  messageId?: string;
  error?: string;
  sentAt?: string;
}

interface CampaignRecord {
  _id: string;
  campaignName: string;
  templateName?: string;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttonText?: string;
  buttonUrl?: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdAt: string;
  recipients?: RecipientDetail[];
}

export default function WhatsAppCampaignPage() {
  const [activeTab, setActiveTab] = useState<"composer" | "history">("composer");

  // Form State
  const [campaignName, setCampaignName] = useState("WhatsApp Marketing Campaign");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [messageType, setMessageType] = useState<"template" | "text">("template");
  const [templateName, setTemplateName] = useState("explore_products");
  const [languageCode, setLanguageCode] = useState("en");
  const [customText, setCustomText] = useState(
    `Hello Sir/Madam,\n\nExplore our latest Mabsol Software Solutions including CRM, ERP, Billing, & Inventory.\n\nVisit: https://demo.mabsolinfotech.com`
  );
  const [delayMs, setDelayMs] = useState(300);

  // Template fixed details (from Meta WhatsApp Manager)
  const templateConfig = {
    name: "explore_products",
    language: "English (en_US / en)",
    category: "Marketing",
    header: "Explore Mabsol Products",
    body: `Apne business ke liye CRM, HRMS, Billing, ERP, Inventory aur anya software solutions explore karein.\n\nApni requirement ke according custom software bhi develop karwa sakte hain.\n\n👉 "Explore Products" button par click karke hamare products dekhein.`,
    footer: "Mabsol Infotech Pvt. Ltd.",
    buttonText: "Explore Products",
    buttonUrl: "https://demo.mabsolinfotech.com",
  };

  // Sending State & Live Logging
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
  const [currentPhone, setCurrentPhone] = useState("");
  const [copiedLogs, setCopiedLogs] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Quick Import contacts
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [availableLeadsCount, setAvailableLeadsCount] = useState<number | null>(null);

  // History State
  const [history, setHistory] = useState<CampaignRecord[]>([]);
  const [historySummary, setHistorySummary] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    totalFailed: 0,
    totalRecipients: 0,
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRecord | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [modalFilter, setModalFilter] = useState<"all" | "sent" | "failed">("all");

  // Auto-scroll terminal
  const logTerminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Load available leads count on mount & set current formatted date
  useEffect(() => {
    fetchLeadsCount();
    try {
      setCampaignName(`WhatsApp Campaign - ${new Date().toLocaleDateString("en-IN")}`);
    } catch {
      // fallback
    }
  }, []);

  // Fetch campaign history on tab change
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchLeadsCount = async () => {
    try {
      const res = await fetch("/api/whatsapp-campaign/leads-numbers?source=leads");
      const data = await res.json();
      if (data.success) {
        setAvailableLeadsCount(data.total || 0);
      }
    } catch {
      // ignore
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/whatsapp-campaign/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.campaigns || []);
        setHistorySummary(
          data.summary || {
            totalCampaigns: 0,
            totalSent: 0,
            totalFailed: 0,
            totalRecipients: 0,
          }
        );
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign record?")) return;
    try {
      const res = await fetch(`/api/whatsapp-campaign/history?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => prev.filter((c) => c._id !== id));
        if (selectedCampaign?._id === id) setSelectedCampaign(null);
      }
    } catch (err) {
      alert("Failed to delete campaign");
    }
  };

  // Helper: Extract and normalize numbers for display/count
  const parsedNumbers = Array.from(
    new Set(
      recipientsRaw
        .split(/[\n,;|\s]+/)
        .map((n) => n.replace(/\D/g, ""))
        .filter((n) => n.length >= 10 && n.length <= 15)
    )
  );

  // Import from CRM Leads / Customers
  const handleImportContacts = async (source: "leads" | "customers" | "all") => {
    setIsLoadingContacts(true);
    try {
      const res = await fetch(`/api/whatsapp-campaign/leads-numbers?source=${source}`);
      const data = await res.json();
      if (data.success && data.contacts && data.contacts.length > 0) {
        const numbersToAdd = data.contacts.map((c: any) => c.phone).join("\n");
        setRecipientsRaw((prev) => {
          const existing = prev.trim();
          return existing ? `${existing}\n${numbersToAdd}` : numbersToAdd;
        });
        alert(`Successfully imported ${data.contacts.length} numbers from CRM ${source}!`);
      } else {
        alert("No phone numbers found in CRM records.");
      }
    } catch (err) {
      alert("Failed to fetch CRM contacts");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipientsRaw((prev) => (prev ? `${prev}\n${text}` : text));
      }
    } catch {
      alert("Clipboard access not permitted. Please paste directly into the box.");
    }
  };

  // Insert Demo / Test numbers
  const handleInsertDemoNumbers = () => {
    const demo = ["919876543210", "919123456789", "919988776655"].join("\n");
    setRecipientsRaw((prev) => (prev ? `${prev}\n${demo}` : demo));
  };

  // Copy logs
  const handleCopyLogs = () => {
    const logText = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.status.toUpperCase()}] Phone: ${l.phone} ${
            l.messageId ? `MessageId: ${l.messageId}` : ""
          } ${l.error ? `Error: ${l.error}` : ""}`
      )
      .join("\n");
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2500);
  };

  // Export logs as text file
  const handleExportLogs = () => {
    const logText = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.status.toUpperCase()}] Phone: ${l.phone} ${
            l.messageId ? `MessageId: ${l.messageId}` : ""
          } ${l.error ? `Error: ${l.error}` : ""}`
      )
      .join("\n");
    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-campaign-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Abort ongoing campaign stream
  const handleStopCampaign = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSending(false);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-stop-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phone: "SYSTEM",
          status: "failed",
          error: "Campaign stream aborted by user.",
        },
      ]);
    }
  };

  // Launch WhatsApp Campaign
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedNumbers.length === 0) {
      alert("Please provide at least one valid mobile number.");
      return;
    }

    setIsSending(true);
    setLogs([]);
    setProgress(0);
    setStats({ sent: 0, failed: 0, total: parsedNumbers.length });
    setCurrentPhone("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/whatsapp-campaign/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          recipientsRaw,
          messageType,
          templateName: messageType === "template" ? templateName : undefined,
          languageCode: messageType === "template" ? languageCode : undefined,
          customText: messageType === "text" ? customText : undefined,
          delayMs,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status} error`);
      }

      if (!response.body) {
        throw new Error("No readable response body from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "init") {
              setStats((s) => ({ ...s, total: data.total }));
              setLogs((prev) => [
                ...prev,
                {
                  id: `init-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  phone: "CAMPAIGN INIT",
                  status: "sending",
                  messageId: `Campaign ID: ${data.campaignId} | Total: ${data.total} recipients | Template: ${data.templateName}`,
                },
              ]);
            } else if (data.type === "sending") {
              setCurrentPhone(data.phone);
            } else if (data.type === "log") {
              setProgress(data.progressPct || 0);
              setStats({
                sent: data.sentCount || 0,
                failed: data.failedCount || 0,
                total: parsedNumbers.length,
              });

              setLogs((prev) => [
                ...prev,
                {
                  id: `log-${Date.now()}-${Math.random()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  phone: data.phone,
                  status: data.status,
                  messageId: data.messageId,
                  error: data.error,
                },
              ]);
            } else if (data.type === "complete") {
              setProgress(100);
              setStats({
                sent: data.sentCount || 0,
                failed: data.failedCount || 0,
                total: data.total || parsedNumbers.length,
              });
              setLogs((prev) => [
                ...prev,
                {
                  id: `complete-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  phone: "EXECUTION COMPLETE",
                  status: data.failedCount === 0 ? "sent" : "failed",
                  messageId: `Done! Sent: ${data.sentCount} | Failed: ${data.failedCount} | Final Status: ${data.status}`,
                },
              ]);
            }
          } catch (parseErr) {
            console.error("Error parsing NDJSON line:", parseErr);
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Campaign dispatch was cancelled.");
      } else {
        console.error("Campaign dispatch error:", err);
        setLogs((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            phone: "ERROR",
            status: "failed",
            error: err.message || "Failed to complete campaign stream.",
          },
        ]);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-6">
      {/* ── Top Header Banner (Clean Modern Light Aesthetic) ─────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 md:p-8 text-white shadow-xl shadow-emerald-700/10">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 text-white shadow-inner">
              <FaWhatsapp className="text-3xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  WhatsApp Campaign Studio
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-semibold backdrop-blur-sm">
                  Meta Cloud API
                </span>
              </div>
              <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
                Broadcast WhatsApp marketing templates and bulk messages to customers & leads with real-time live execution logs.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setActiveTab("composer")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "composer"
                  ? "bg-white text-emerald-800 shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <FaPaperPlane className="text-xs" />
              Campaign Composer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-emerald-800 shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <FaHistory className="text-xs" />
              History & Logs
              {historySummary.totalCampaigns > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                  {historySummary.totalCampaigns}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB 1: CAMPAIGN COMPOSER ───────────────────────────────── */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Composer Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSendCampaign} className="space-y-6">
              {/* Campaign Meta Card */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Mabsol Products Launch - August 2026"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none transition font-medium"
                  />
                </div>

                {/* Message Type Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Message Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMessageType("template")}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                        messageType === "template"
                          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-white shadow-sm ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg ${
                          messageType === "template"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <FaMagic className="text-sm" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Meta Template
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Pre-approved business template
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMessageType("text")}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                        messageType === "text"
                          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-white shadow-sm ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg ${
                          messageType === "text"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <FaSlidersH className="text-sm" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Custom Direct Text
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Custom text message body
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Template Info Card */}
                {messageType === "template" ? (
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <FaCheckCircle className="text-emerald-600 text-sm" />
                        Meta Template Settings
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateName("explore_products");
                            setLanguageCode("en");
                          }}
                          className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold border transition cursor-pointer ${
                            templateName === "explore_products"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          explore_products
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateName("crm_verification");
                            setLanguageCode("en");
                          }}
                          className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold border transition cursor-pointer ${
                            templateName === "crm_verification"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          crm_verification
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Template Name (in Meta Manager)
                        </label>
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="e.g. mabsol_infotech_pvt_ltd_demo"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Language Code
                        </label>
                        <select
                          value={languageCode}
                          onChange={(e) => setLanguageCode(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 font-semibold text-xs outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="en_US">en_US (English - US)</option>
                          <option value="en">en (English)</option>
                          <option value="en_GB">en_GB (English - UK)</option>
                          <option value="hi">hi (Hindi)</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-2xs">
                      <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>📌 Header:</span> {templateConfig.header}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {templateConfig.body}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 italic text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        Footer: {templateConfig.footer}
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                      <span className="text-sm">⚠️</span>
                      <span>
                        Meta Cloud API requires templates to be in <strong>APPROVED</strong> status in your WhatsApp Business Manager before broadcasting. If review is in progress, you can also use <strong>Custom Direct Text</strong>.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Custom Message Body
                    </label>
                    <textarea
                      rows={5}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Type custom WhatsApp message here..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3.5 text-sm outline-none transition font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Recipients Input Card */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Recipient Mobile Numbers
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      {parsedNumbers.length} Valid Numbers
                    </span>
                  </div>

                  {/* Action Shortcuts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleImportContacts("leads")}
                      disabled={isLoadingContacts}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1.5 font-semibold transition cursor-pointer"
                    >
                      <FaUsers className="text-xs text-emerald-600" />
                      Import Leads {availableLeadsCount !== null ? `(${availableLeadsCount})` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportContacts("customers")}
                      disabled={isLoadingContacts}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1.5 font-semibold transition cursor-pointer"
                    >
                      <FaBuilding className="text-xs text-emerald-600" />
                      Import Customers
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1.5 font-semibold transition cursor-pointer"
                    >
                      <FaCopy className="text-xs" />
                      Paste
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertDemoNumbers}
                      className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      🧪 Test
                    </button>
                    {recipientsRaw && (
                      <button
                        type="button"
                        onClick={() => setRecipientsRaw("")}
                        className="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <FaTrash className="text-xs" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={6}
                  required
                  value={recipientsRaw}
                  onChange={(e) => setRecipientsRaw(e.target.value)}
                  placeholder="Paste or enter 10-digit mobile numbers here (separated by newline, comma, or space)&#10;e.g.&#10;9876543210&#10;9812345678&#10;919876543210"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-4 text-sm font-mono outline-none transition"
                />

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>
                    💡 Indian 10-digit numbers will automatically be formatted with <strong>+91</strong>.
                  </span>
                  <span>
                    Throttle Delay: <strong>{delayMs}ms</strong>
                  </span>
                </div>

                {/* Delay Slider */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/70 flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Dispatch Delay:
                  </span>
                  <input
                    type="range"
                    min={150}
                    max={1500}
                    step={50}
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {delayMs}ms / msg
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSending || parsedNumbers.length === 0}
                  className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <FaSpinner className="animate-spin text-lg" />
                      Sending Campaign ({stats.sent + stats.failed}/{stats.total})...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Send WhatsApp Campaign ({parsedNumbers.length} Numbers)
                    </>
                  )}
                </button>

                {isSending && (
                  <button
                    type="button"
                    onClick={handleStopCampaign}
                    className="px-6 py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer"
                  >
                    <FaStop />
                    Stop
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: WhatsApp Phone Mockup & Live Logs Console (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* WhatsApp Chat Preview Card (Realistic WhatsApp Light UI) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FaMobileAlt className="text-base text-emerald-600" />
                  Live WhatsApp Preview
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified Meta Business
                </span>
              </div>

              {/* Realistic Phone Shell with Official WhatsApp Light Chat Design */}
              <div className="bg-[#efeae2] rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-md font-sans">
                {/* Chat Top Bar */}
                <div className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-white text-[#008069] flex items-center justify-center font-extrabold text-sm shadow">
                    M
                  </div>
                  <div className="flex-1 leading-tight">
                    <div className="text-white text-xs font-bold flex items-center gap-1">
                      Mabsol Infotech
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <div className="text-[10px] text-emerald-100">Official Business Account</div>
                  </div>
                </div>

                {/* Chat Wallpaper & Message Bubble Area */}
                <div className="p-4 space-y-3 min-h-[220px]">
                  {/* Date Stamp */}
                  <div className="text-center">
                    <span className="bg-white/80 text-[#54656f] text-[10px] px-2.5 py-1 rounded-md shadow-2xs font-medium">
                      TODAY
                    </span>
                  </div>

                  {/* Message Bubble (Official Light Green Outgoing Bubble) */}
                  <div className="bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-xs p-3.5 text-xs shadow-sm space-y-2 max-w-[92%] ml-auto border border-[#c1e7b9]">
                    {/* Header */}
                    <div className="font-bold text-[#008069] text-[13px] tracking-tight border-b border-emerald-200/80 pb-1">
                      {templateConfig.header}
                    </div>

                    {/* Body */}
                    <div className="text-[12px] leading-relaxed whitespace-pre-line text-[#111b21]">
                      {messageType === "template" ? templateConfig.body : customText}
                    </div>

                    {/* Footer & Time */}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#667781]">
                      <span>{templateConfig.footer}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <span>12:30 PM</span>
                        <span className="text-[#53bdeb] font-bold">✓✓</span>
                      </span>
                    </div>

                    {/* Interactive Button */}
                    <div className="pt-1.5 border-t border-[#c1e7b9]">
                      <a
                        href={templateConfig.buttonUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center py-2 px-3 rounded-lg bg-white hover:bg-emerald-50 text-[#008069] font-bold text-xs tracking-wide transition border border-emerald-200 shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <FaExternalLinkAlt className="text-[10px]" />
                        {templateConfig.buttonText}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Streaming Logs Console */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[420px]">
              {/* Terminal Top Bar */}
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-300 font-bold ml-2">
                    Live Dispatch Terminal
                  </span>
                  {isSending && (
                    <span className="flex h-2 w-2 relative ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2 py-0.5 rounded text-[11px] border font-mono transition cursor-pointer ${
                      autoScroll
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Auto-scroll
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    disabled={logs.length === 0}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-xs cursor-pointer"
                    title="Copy Logs"
                  >
                    {copiedLogs ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportLogs}
                    disabled={logs.length === 0}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-xs cursor-pointer"
                    title="Export Logs"
                  >
                    <FaDownload />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogs([])}
                    disabled={logs.length === 0}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition text-xs cursor-pointer"
                    title="Clear Terminal"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Progress & Stat Bar */}
              <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-semibold">
                    Total: <strong className="text-white">{stats.total}</strong>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    Sent: <strong>{stats.sent}</strong>
                  </span>
                  <span className="text-rose-400 font-semibold">
                    Failed: <strong>{stats.failed}</strong>
                  </span>
                </div>
                <div className="text-emerald-400 font-extrabold">{progress}%</div>
              </div>

              {/* Progress Bar Line */}
              <div className="w-full bg-slate-900 h-1.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Log Stream Terminal */}
              <div
                ref={logTerminalRef}
                className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs text-slate-300 select-text"
              >
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2 py-8">
                    <FaWhatsapp className="text-3xl text-slate-600" />
                    <div className="font-semibold text-slate-400">Terminal ready for campaign dispatch.</div>
                    <div className="text-[11px] text-slate-500">
                      Live real-time logs will appear here during execution.
                    </div>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-lg border leading-relaxed text-[11px] ${
                        log.status === "sent"
                          ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                          : log.status === "failed"
                          ? "bg-rose-950/40 border-rose-800/50 text-rose-300"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold flex items-center gap-1.5">
                          {log.status === "sent" ? (
                            <FaCheckCircle className="text-emerald-400 text-xs" />
                          ) : log.status === "failed" ? (
                            <FaExclamationTriangle className="text-rose-400 text-xs" />
                          ) : (
                            <FaSpinner className="animate-spin text-slate-400 text-xs" />
                          )}
                          <span>{log.phone}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                      </div>

                      {log.messageId && (
                        <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                          ID: {log.messageId}
                        </div>
                      )}

                      {log.error && (
                        <div className="text-[11px] text-rose-400 font-sans mt-1">
                          Error: {log.error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CAMPAIGN HISTORY ────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Campaigns
                </span>
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <FaHistory className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {historySummary.totalCampaigns}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total broadcast runs</div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Sent
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                  <FaCheckCircle className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {historySummary.totalSent}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Successfully delivered</div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Failed
                </span>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                  <FaExclamationTriangle className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                {historySummary.totalFailed}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Delivery errors / invalid</div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Success Rate
                </span>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900">
                  <FaChartLine className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">
                {historySummary.totalRecipients > 0
                  ? Math.round((historySummary.totalSent / historySummary.totalRecipients) * 100)
                  : 0}
                %
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Overall delivery efficiency</div>
            </div>
          </div>

          {/* History Data Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Broadcast Execution History</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-600">
                  {history.length} Records
                </span>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white rounded-xl pl-8 pr-3 py-2 text-xs outline-none transition font-medium"
                />
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <FaSpinner className="animate-spin text-2xl text-emerald-600" />
                <div className="text-xs font-semibold">Loading campaign history...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                <FaHistory className="text-3xl mx-auto text-slate-300 mb-2" />
                <div className="font-semibold text-slate-600 dark:text-slate-400">No WhatsApp campaigns recorded yet.</div>
                <div>Send your first campaign using the Composer tab!</div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Campaign Name</th>
                      <th className="py-3 px-4">Template</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {history
                      .filter((c) =>
                        c.campaignName.toLowerCase().includes(historySearch.toLowerCase())
                      )
                      .map((c) => {
                        const pct =
                          c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0;
                        return (
                          <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {c.campaignName}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">
                              {c.templateName || "Custom Text"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                              {new Date(c.createdAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-white">{c.totalCount}</span>{" "}
                              <span className="text-slate-500">
                                ({c.sentCount} sent / {c.failedCount} fail)
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  c.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                                    : c.status === "sending"
                                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                                    : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                }`}
                              >
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCampaign(c)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold transition cursor-pointer"
                              >
                                View Logs
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCampaign(c._id)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Record"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CAMPAIGN DETAILS MODAL ──────────────────────────────────── */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaWhatsapp className="text-emerald-600 text-xl" />
                  {selectedCampaign.campaignName}
                </h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedCampaign._id} • Template: {selectedCampaign.templateName || "Custom Text"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Sub-bar */}
            <div className="bg-slate-100/70 dark:bg-slate-950/40 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">
                  Total: <strong className="text-slate-900 dark:text-white">{selectedCampaign.totalCount}</strong>
                </span>
                <span className="text-emerald-600 font-bold">
                  Sent: {selectedCampaign.sentCount}
                </span>
                <span className="text-rose-600 font-bold">
                  Failed: {selectedCampaign.failedCount}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalFilter("all")}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === "all" ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500"
                  }`}
                >
                  All ({selectedCampaign.recipients?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("sent")}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === "sent" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-slate-500"
                  }`}
                >
                  Sent ({selectedCampaign.sentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("failed")}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === "failed" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "text-slate-500"
                  }`}
                >
                  Failed ({selectedCampaign.failedCount})
                </button>
              </div>
            </div>

            {/* Modal Body / Recipient Logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 text-xs bg-slate-50/50 dark:bg-slate-900">
              {(!selectedCampaign.recipients || selectedCampaign.recipients.length === 0) ? (
                <div className="py-8 text-center text-slate-400">No recipient logs recorded.</div>
              ) : (
                selectedCampaign.recipients
                  .filter((r) => {
                    if (modalFilter === "sent") return r.status === "sent";
                    if (modalFilter === "failed") return r.status === "failed";
                    return true;
                  })
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs ${
                        r.status === "sent"
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300"
                          : r.status === "failed"
                          ? "bg-rose-50/70 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300"
                          : "bg-white border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                          {r.status === "sent" ? (
                            <FaCheckCircle className="text-emerald-600 text-xs" />
                          ) : (
                            <FaExclamationTriangle className="text-rose-600 text-xs" />
                          )}
                          <span>+{r.phone}</span>
                        </div>
                        {r.messageId && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Meta ID: {r.messageId}
                          </div>
                        )}
                        {r.error && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-sans font-medium">
                            {r.error}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                            r.status === "sent"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.sentAt && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(r.sentAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
