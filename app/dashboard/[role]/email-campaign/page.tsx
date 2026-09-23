"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane,
  FaEnvelope,
  FaFileUpload,
  FaTimes,
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
  FaFileAlt,
  FaDesktop,
  FaMobileAlt,
  FaCode,
  FaExpand,
} from "react-icons/fa";

interface LogEntry {
  id: string;
  timestamp: string;
  email: string;
  status: "sending" | "sent" | "failed";
  messageId?: string;
  error?: string;
}

interface CampaignRecord {
  _id: string;
  subject: string;
  message: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdAt: string;
  attachments?: { filename: string; size: number }[];
  recipients?: { email: string; status: string; error?: string; sentAt?: string }[];
}

export default function EmailCampaignPage() {
  const [activeTab, setActiveTab] = useState<"composer" | "history">("composer");

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Preview State
  const [bodyTab, setBodyTab] = useState<"edit" | "preview">("edit");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Sending State & Live Logging
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending" | "completed" | "failed">("idle");

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

  // Auto-scroll log console
  const logTerminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Load campaign history on mount or tab change
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/email-campaign/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.campaigns || []);
        setHistorySummary(
          data.summary || { totalCampaigns: 0, totalSent: 0, totalFailed: 0, totalRecipients: 0 }
        );
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Preset Templates
  const applyTemplate = (type: string) => {
    if (type === "product_launch") {
      setSubject("🔥 Exclusively Launching: MultiVite Plus Softgels - Special Pharma Deal");
      setMessage(
        `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <h2 style="color: #343872; margin-top: 0;">MultiVite Plus Softgels Now Available</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    Dear Healthcare Partner,
  </p>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    We are thrilled to announce the official launch of <strong>MultiVite Plus Softgels</strong> in our formulation lineup. Formulated with high-potency Antioxidants & Trace Minerals for ultimate patient wellness.
  </p>
  <div style="background: #f8fafc; border-left: 4px solid #fb8c00; padding: 15px; margin: 20px 0; border-radius: 6px;">
    <h4 style="margin: 0 0 8px 0; color: #fb8c00;">Introductory Stockist Offer:</h4>
    <ul style="margin: 0; padding-left: 20px; color: #334155;">
      <li>Order 50 Units - Get 5 Units FREE</li>
      <li>Instant 5% Additional Margin on Pre-orders</li>
      <li>Free Express Doorstep Delivery</li>
    </ul>
  </div>
  <p style="font-size: 14px; color: #64748b;">
    Contact your regional sales executive or place your order directly via Mabsol Pharma CRM Portal.
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">
    © ${new Date().getFullYear()} Mabsol Pharma CRM. All rights reserved.
  </p>
</div>`
      );
    } else if (type === "invoice_reminder") {
      setSubject("Important Notice: Outstanding Payment & Ledger Account Statement");
      setMessage(
        `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <h2 style="color: #e11d48; margin-top: 0;">Payment Reminder & Account Summary</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    Dear Valued Partner,
  </p>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    This is a friendly reminder regarding your outstanding invoice balance with Mabsol Pharma. Attached with this email is your latest detailed ledger statement.
  </p>
  <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 16px; margin: 20px 0; border-radius: 8px;">
    <p style="margin: 0; font-weight: bold; color: #be123c;">Action Required:</p>
    <p style="margin: 6px 0 0 0; color: #9f1239; font-size: 14px;">
      Please verify the statement and arrange the settlement at your earliest convenience to maintain uninterrupted order processing.
    </p>
  </div>
  <p style="font-size: 14px; color: #64748b;">
    For any billing discrepancies, reach out to accounting@mabsolpharma.com.
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">
    Mabsol Pharma Finance & Accounts Division
  </p>
</div>`
      );
    } else if (type === "mr_visit") {
      setSubject("Upcoming Medical Representative Visit & Product Samples");
      setMessage(
        `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <h2 style="color: #059669; margin-top: 0;">MR Representative Visit Notification</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    Respected Doctor / Partner,
  </p>
  <p style="font-size: 15px; line-height: 1.6; color: #475569;">
    Our senior Medical Representative is scheduled to visit your clinic/establishment this week to present sample kits and clinical trial data for our recent Cardiology & Gastroenterology range.
  </p>
  <p style="font-size: 14px; color: #64748b;">
    Thank you for your continued trust in Mabsol Pharma products.
  </p>
</div>`
      );
    }
  };

  // Load Sample Emails
  const loadSampleEmails = () => {
    const sampleList = [
      "doctor.apollo@pharma.com",
      "purchase.cityhospital@healthnet.org",
      "chemist.medplus@pharma.in",
      "orders.careclinic@gmail.com",
      "stockist.gupta@mabsolpharma.com",
    ].join(",\n");
    setRecipients((prev) => (prev ? `${prev},\n${sampleList}` : sampleList));
  };

  // File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Launch Campaign
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      alert("Please provide a campaign subject line.");
      return;
    }
    if (!message.trim()) {
      alert("Please enter the email message body.");
      return;
    }
    if (!recipients.trim()) {
      alert("Please enter at least one recipient email address.");
      return;
    }

    setIsSending(true);
    setSendingStatus("sending");
    setLogs([]);
    setProgress(0);
    setStats({ sent: 0, failed: 0, total: 0 });

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("message", message);
    formData.append("recipients", recipients);

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      const response = await fetch("/api/email-campaign/send", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to start campaign");
      }

      if (!response.body) {
        throw new Error("No response body stream received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
              setStats((prev) => ({ ...prev, total: data.total }));
            } else if (data.type === "sending") {
              setLogs((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  email: data.email,
                  status: "sending",
                },
              ]);
            } else if (data.type === "log") {
              setLogs((prev) => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex((l) => l.email === data.email);
                if (lastIdx !== -1) {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    status: data.status,
                    messageId: data.messageId,
                    error: data.error,
                  };
                }
                return updated;
              });

              setStats({
                sent: data.sentCount,
                failed: data.failedCount,
                total: stats.total || 0,
              });
              setProgress(data.progressPct || 0);
            } else if (data.type === "complete") {
              setProgress(100);
              setSendingStatus(data.status);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      }
    } catch (err: any) {
      alert(`Campaign Error: ${err.message || "Something went wrong"}`);
      setSendingStatus("failed");
    } finally {
      setIsSending(false);
    }
  };

  const parsedRecipientList = Array.from(
    new Set(
      recipients
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes("@"))
    )
  );

  const parsedRecipientCount = parsedRecipientList.length;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 p-6 md:p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <FaEnvelope className="text-2xl text-amber-300" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Email Campaign Studio
                </h1>
                <p className="text-sm text-indigo-200 mt-1">
                  Send bulk marketing emails, invoices, and product launches with real-time streaming delivery logs.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
            <button
              onClick={() => setActiveTab("composer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "composer"
                  ? "bg-white text-indigo-950 shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <FaPaperPlane className="text-xs" /> New Campaign
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-white text-indigo-950 shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <FaHistory className="text-xs" /> History & Logs
            </button>
          </div>
        </div>
      </div>

      {activeTab === "composer" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Templates Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FaMagic className="text-amber-500" /> Quick Pharma Email Templates
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-500/20"
                >
                  <FaEye /> Full Inbox Preview
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate("product_launch")}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200/60 dark:border-indigo-800"
                >
                  🚀 Product Launch
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("invoice_reminder")}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors border border-rose-200/60 dark:border-rose-800"
                >
                  💳 Invoice Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("mr_visit")}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200/60 dark:border-emerald-800"
                >
                  👨‍⚕️ MR Representative Visit
                </button>
              </div>
            </div>

            {/* Form Box */}
            <form onSubmit={handleSendCampaign} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campaign Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Discount on Antibiotics Order - Mabsol Pharma"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-sm transition-all"
                  required
                />
              </div>

              {/* Message Body with Edit / Live Preview Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Email Message Content <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setBodyTab("edit")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        bodyTab === "edit"
                          ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <FaCode /> Edit HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyTab("preview")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        bodyTab === "preview"
                          ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <FaEye /> Live Render
                    </button>
                  </div>
                </div>

                {bodyTab === "edit" ? (
                  <textarea
                    rows={8}
                    placeholder="Compose your email message here or choose a preset template above..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-sm font-mono transition-all"
                    required
                  />
                ) : (
                  <div className="w-full min-h-[220px] max-h-[350px] overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 shadow-inner">
                    {message ? (
                      <div dangerouslySetInnerHTML={{ __html: message }} />
                    ) : (
                      <div className="text-slate-400 text-xs text-center py-12">
                        No message body typed yet. Type message or select a template above to see the live rendering.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recipient Emails */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Email Addresses <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleEmails}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <FaUsers className="text-xs" /> Load Sample CRM Emails
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Enter email addresses separated by commas or newlines... (e.g. doctor@hospital.com, buyer@pharma.com)"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-sm transition-all"
                  required
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Detected Valid Emails: <strong className="text-indigo-600 dark:text-indigo-400">{parsedRecipientCount}</strong></span>
                  <span>Duplicate emails are automatically filtered</span>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  File Attachments (PDF, Images, Brochures)
                </label>

                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FaFileUpload className="mx-auto text-2xl text-slate-400 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Drag & drop files here or <span className="text-indigo-600 font-bold">Browse Files</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Supports PDF, DOCX, PNG, JPG up to 10MB each</p>
                </div>

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 px-3 py-1.5 rounded-xl text-xs"
                      >
                        <FaFileAlt className="text-indigo-500" />
                        <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                        <span className="text-[10px] text-indigo-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="text-rose-500 hover:text-rose-700 ml-1"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <FaEye /> Preview Email
                </button>
                <button
                  type="submit"
                  disabled={isSending || parsedRecipientCount === 0}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isSending ? (
                    <>
                      <FaSpinner className="animate-spin text-lg" /> Dispatching Campaign...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane /> Send Email Campaign ({parsedRecipientCount} Recipients)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Progress & Real-time Console Log (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Progress Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
                <span>Campaign Progress</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {sendingStatus}
                </span>
              </h3>

              {/* Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Sending Stream</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <span className="block text-2xl font-black text-slate-700 dark:text-slate-200">
                    {stats.total}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-900">
                  <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.sent}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Sent</span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/60 dark:border-rose-900">
                  <span className="block text-2xl font-black text-rose-600 dark:text-rose-400">
                    {stats.failed}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Failed</span>
                </div>
              </div>
            </div>

            {/* Live Terminal Log Console */}
            <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 shadow-2xl text-slate-200 font-mono text-xs flex flex-col h-[420px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-400 text-[11px] ml-2 font-bold uppercase tracking-wider">
                    Live Dispatch Logs
                  </span>
                </div>
                {isSending && (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-sans font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Streaming
                  </span>
                )}
              </div>

              {/* Log List */}
              <div
                ref={logTerminalRef}
                className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-4">
                    <FaEnvelope className="text-3xl mb-2 opacity-40" />
                    <p className="text-xs">No active campaign logs.</p>
                    <p className="text-[11px] opacity-70 mt-1">
                      Logs will stream here live as emails are being delivered.
                    </p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-2 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                          <span className="text-slate-200 font-semibold truncate">{log.email}</span>
                        </div>
                        {log.status === "sending" && (
                          <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                            <FaSpinner className="animate-spin" /> Connecting & sending mail...
                          </div>
                        )}
                        {log.status === "sent" && (
                          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                            <FaCheckCircle /> Sent successfully ({log.messageId})
                          </div>
                        )}
                        {log.status === "failed" && (
                          <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                            <FaExclamationTriangle /> Failed: {log.error}
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          log.status === "sending"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : log.status === "sent"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History & Analytics Tab */
        <div className="space-y-6">
          {/* History Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Total Campaigns
              </span>
              <span className="block text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {historySummary.totalCampaigns}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Total Processed
              </span>
              <span className="block text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {historySummary.totalRecipients}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Successfully Delivered
              </span>
              <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {historySummary.totalSent}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Failed Deliveries
              </span>
              <span className="block text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {historySummary.totalFailed}
              </span>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Campaign Log Archives
              </h3>
              <button
                onClick={fetchHistory}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Refresh List
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-12 text-center text-slate-500">
                <FaSpinner className="animate-spin text-2xl mx-auto mb-2 text-indigo-600" />
                Loading campaign archives...
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FaEnvelope className="text-3xl mx-auto mb-2 opacity-40 text-slate-400" />
                No past email campaigns recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Recipients</th>
                      <th className="p-4">Delivery Rate</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {history.map((c) => {
                      const successRate =
                        c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0;
                      return (
                        <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                            {c.subject}
                          </td>
                          <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(c.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                            {c.sentCount} / {c.totalCount} sent
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                c.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : c.status === "sending"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedCampaign(c)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <FaEye /> View Logs
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

      {/* FULL INBOX PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header Bar */}
            <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <FaEye className="text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Email Client Preview</h3>
                  <p className="text-xs text-slate-400">
                    Exact representation of how recipients will see your email in their Inbox
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Device Switcher */}
                <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaDesktop /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaMobileAlt /> Mobile
                  </button>
                </div>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
            </div>

            {/* Modal Body / Email Client View */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 flex justify-center items-start">
              <div
                className={`bg-white rounded-2xl text-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ${
                  previewDevice === "mobile" ? "w-[380px] my-2" : "w-full max-w-3xl"
                }`}
              >
                {/* Gmail Header Simulation Bar */}
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 text-slate-700 font-sans">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">
                      {subject || "(No Subject Title Specified)"}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded text-[11px] uppercase">
                      Inbox
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-md">
                      {subject ? subject.charAt(0).toUpperCase() : "M"}
                    </div>
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 text-sm">
                          {subject || "Mabsol CRM"}
                        </strong>
                        <span className="text-slate-500 font-mono">
                          &lt;support@mabsolinfotech.com&gt;
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        to: {parsedRecipientList[0] || "recipient@example.com"}{" "}
                        {parsedRecipientCount > 1 && `(+${parsedRecipientCount - 1} others)`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-6 min-h-[300px] overflow-x-auto text-slate-800">
                  {message ? (
                    <div dangerouslySetInnerHTML={{ __html: message }} />
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <FaEnvelope className="text-4xl mx-auto mb-3 opacity-30 text-indigo-400" />
                      Email body is empty. Type your message or select a template to see it rendered.
                    </div>
                  )}
                </div>

                {/* Attachments Section in Preview */}
                {attachments.length > 0 && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <FaFileAlt className="text-indigo-600" /> {attachments.length} Attachment(s)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-300 rounded-xl p-2.5 flex items-center gap-2 text-xs shadow-sm max-w-xs"
                        >
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <FaFileAlt />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                This preview shows exact rendering & sender layout in recipient inbox.
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedCampaign.subject}
                </h3>
                <p className="text-xs text-slate-500">
                  Dispatched on {new Date(selectedCampaign.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recipient Delivery List ({selectedCampaign.recipients?.length || 0})
              </p>
              {selectedCampaign.recipients?.map((r, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.email}</span>
                    {r.error && <p className="text-[11px] text-rose-500 mt-0.5">{r.error}</p>}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      r.status === "sent"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-right mt-4">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
