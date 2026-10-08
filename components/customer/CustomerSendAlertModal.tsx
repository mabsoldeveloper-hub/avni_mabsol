"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaWhatsapp,
  FaEnvelope,
  FaCommentDots,
  FaPaperPlane,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaExternalLinkAlt,
  FaClock,
  FaFileInvoice,
  FaCopy,
  FaCheck,
  FaPhoneAlt,
  FaCog,
} from "react-icons/fa";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onOpenAutoAlertSettings?: () => void;
}

export default function CustomerSendAlertModal({
  isOpen,
  onClose,
  customer,
  onOpenAutoAlertSettings,
}: Props) {
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email" | "all">("whatsapp");
  const [alertType, setAlertType] = useState<"credit_limit" | "days_expiring" | "bill_limit">("credit_limit");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [directWhatsAppUrl, setDirectWhatsAppUrl] = useState("");

  const balance = Number(customer?.BALANCE ?? customer?.FINAL ?? 0);
  const credit = Number(customer?.CREDIT ?? 0);
  const dueDays = Number(customer?.DUEDAYS ?? customer?.DAYS ?? 0);
  const billLimit = Number(
    customer?.billLimit ??
    customer?.financialAlerts?.billLimit ??
    customer?.BILL_LIMIT ??
    customer?.BILLLIMIT ??
    0
  );
  const totalPendingBills = Number(
    customer?.totalPendingBills ??
    customer?.financialAlerts?.totalPendingBills ??
    0
  );
  const minDaysRemaining = Number(
    customer?.minDaysRemaining ??
    customer?.financialAlerts?.minDaysRemaining ??
    0
  );

  const isCreditLimitExceeded = credit > 0 && balance > credit;
  const isBillLimitExceeded = billLimit > 0 && totalPendingBills > billLimit;
  const isDaysKamBache = Boolean(
    customer?.isDaysKamBache ?? customer?.financialAlerts?.isDaysKamBache ?? (minDaysRemaining <= 3 && totalPendingBills > 0)
  );

  const excess = isCreditLimitExceeded ? Math.round(balance - credit) : 0;
  const customerName = customer?.PARNAM || "Customer";

  // Sync recipient contact info on open
  useEffect(() => {
    if (isOpen && customer) {
      setRecipientPhone(customer?.PHONE1 || customer?.PHONE2 || "");
      setRecipientEmail(customer?.MAILNAM || "");
      setFeedback(null);
    }
  }, [isOpen, customer]);

  // Auto-select priority alert type
  useEffect(() => {
    if (isOpen && customer) {
      if (isCreditLimitExceeded) {
        setAlertType("credit_limit");
      } else if (isBillLimitExceeded) {
        setAlertType("bill_limit");
      } else if (isDaysKamBache) {
        setAlertType("days_expiring");
      } else {
        setAlertType("credit_limit");
      }
    }
  }, [isOpen, customer, isCreditLimitExceeded, isBillLimitExceeded, isDaysKamBache]);

  // Update default message whenever alertType changes
  useEffect(() => {
    if (!isOpen || !customer) return;

    if (alertType === "credit_limit") {
      setCustomMessage(
        `📢 *URGENT: CREDIT LIMIT EXCEEDED ALERT*\nDear *${customerName}*,\n\nThis is an important update regarding your account with *Mabsol Healthcare*:\n\n• *Current Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}\n• *Sanctioned Credit Limit:* ₹${credit.toLocaleString("en-IN")}\n${excess > 0 ? `• *Excess Amount Over Limit:* ₹${excess.toLocaleString("en-IN")} ⚠️\n` : ""}• *Credit Days Term:* ${dueDays} Days\n\n⚠️ *Notice:* Your account balance has exceeded the sanctioned credit limit. Please arrange for prompt payment clearance to avoid order dispatch delays or account holds.\n\nFor payment confirmations or bank account details, please contact our accounts department.\nThank you!`
      );
    } else if (alertType === "bill_limit") {
      setCustomMessage(
        `📑 *ALERT: INVOICE COUNT LIMIT EXCEEDED*\nDear *${customerName}*,\n\nGreetings from *Mabsol Healthcare*.\n\n• *Current Pending Invoices:* ${totalPendingBills || "Multiple"} Bills\n• *Allowed Bill Limit:* ${billLimit || "Sanctioned"} Bills\n• *Total Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}\n\n⚠️ *Notice:* The number of pending invoices in your account has exceeded the allowed credit limit. Please settle prior outstanding bills to enable processing of new orders.\n\nThank you!`
      );
    } else {
      setCustomMessage(
        `⏰ *PAYMENT REMINDER - CREDIT TERM EXPIRING SOON*\nDear *${customerName}*,\n\nGreetings from *Mabsol Healthcare*.\n\n• *Credit Days Term:* ${dueDays} Days\n• *Days Remaining:* ${minDaysRemaining > 0 ? `${minDaysRemaining} Days Remaining` : "Due Date Passed"}\n• *Pending Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}\n\n⚠️ *Notice:* The credit term for your outstanding invoices is expiring shortly. Please ensure timely payment clearance for uninterrupted order supplies and a healthy credit ledger.\n\nThank you!`
      );
    }
  }, [alertType, isOpen, customerName, balance, credit, excess, dueDays, billLimit, totalPendingBills, minDaysRemaining]);

  // Build live WhatsApp direct web/app URL whenever phone or message changes
  useEffect(() => {
    const rawDigits = recipientPhone.replace(/\D/g, "");
    if (!rawDigits) {
      setDirectWhatsAppUrl("");
      return;
    }
    const waPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    setDirectWhatsAppUrl(
      `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(customMessage)}`
    );
  }, [recipientPhone, customMessage]);

  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    if (!recipientPhone.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a valid mobile number to send the WhatsApp message.",
      });
      return;
    }
    if (directWhatsAppUrl) {
      window.open(directWhatsAppUrl, "_blank");
      setFeedback({
        type: "info",
        message: "WhatsApp Web / App has opened. Click 'Send' in the chat window to deliver your message.",
      });
    }
  };

  const handleCopyMessage = () => {
    if (!customMessage) return;
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaGateway = async () => {
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/customers/${customer._id}/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          alertType,
          customMessage,
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to dispatch alert via server gateway");
      }

      setFeedback({
        type: "success",
        message: data.message || `Alert dispatched successfully via ${channel.toUpperCase()}!`,
      });

      if (data.directWhatsAppUrl) {
        setDirectWhatsAppUrl(data.directWhatsAppUrl);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.message || "An error occurred while dispatching alert",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden my-6">
        {/* Top Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-rose-500 to-indigo-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-700 font-bold text-xs flex items-center gap-1">
                <FaPaperPlane size={11} />
                <span>Customer Alert Center</span>
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Send Notification to Customer
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Party: <span className="font-semibold text-slate-700">{customerName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAutoAlertSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAutoAlertSettings();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                title="Configure Days & Bills Auto Alert Rules"
              >
                <FaCog size={12} />
                <span>Auto-Alert Rules Form</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <FaTimes size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[68vh] overflow-y-auto space-y-4">
          {feedback && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-2xl text-xs font-semibold animate-in fade-in leading-relaxed ${
                feedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : feedback.type === "info"
                  ? "bg-sky-50 border border-sky-200 text-sky-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? (
                <FaCheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : feedback.type === "info" ? (
                <FaExternalLinkAlt size={14} className="text-sky-500 shrink-0 mt-0.5" />
              ) : (
                <FaExclamationTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p>{feedback.message}</p>
                {feedback.type === "error" && channel === "whatsapp" && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                  >
                    <FaWhatsapp size={13} />
                    <span>Click here to Send via WhatsApp Web / App Directly</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Editable Recipient Contact Information Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FaPhoneAlt size={11} className="text-indigo-600" />
                <span>Recipient Contact Information (Editable)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">You can modify the recipient mobile number or email here</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mobile Number Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Customer Mobile / WhatsApp Number:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {recipientPhone && (
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="absolute right-1.5 top-1.5 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                      title="Direct 1-Click WhatsApp Send"
                    >
                      <FaWhatsapp size={12} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Email Address Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Customer Email Address:
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter customer email address"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Outstanding</p>
              <p className="font-bold text-slate-800">₹{balance.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Credit Limit</p>
              <p className={`font-bold ${isCreditLimitExceeded ? "text-rose-600" : "text-slate-700"}`}>
                ₹{credit.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Bill Limit</p>
              <p className={`font-bold ${isBillLimitExceeded ? "text-purple-600" : "text-slate-700"}`}>
                {totalPendingBills} / {billLimit || "∞"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Days Left</p>
              <p className={`font-bold ${isDaysKamBache ? "text-amber-600" : "text-slate-700"}`}>
                {minDaysRemaining > 0 ? `${minDaysRemaining}d` : "Due"}
              </p>
            </div>
          </div>

          {/* 3 Specific Alert Reasons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Alert Trigger Reason:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Credit Limit Exceeded */}
              <button
                type="button"
                onClick={() => setAlertType("credit_limit")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                  alertType === "credit_limit"
                    ? "border-rose-500 bg-rose-50/80 text-rose-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaExclamationTriangle size={13} className="text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">Credit Limit Exceeded</p>
                  <p className="text-[10px] opacity-75 truncate">Balance exceeds limit</p>
                </div>
              </button>

              {/* Option 2: Term Expiring Soon */}
              <button
                type="button"
                onClick={() => setAlertType("days_expiring")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                  alertType === "days_expiring"
                    ? "border-amber-500 bg-amber-50/80 text-amber-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaClock size={13} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">Term Expiring Soon</p>
                  <p className="text-[10px] opacity-75 truncate">Credit period nearing due date</p>
                </div>
              </button>

              {/* Option 3: Invoice Count Exceeded */}
              <button
                type="button"
                onClick={() => setAlertType("bill_limit")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                  alertType === "bill_limit"
                    ? "border-purple-600 bg-purple-50/80 text-purple-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaFileInvoice size={13} className="text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">Invoice Count Exceeded</p>
                  <p className="text-[10px] opacity-75 truncate">Pending invoices exceed cap</p>
                </div>
              </button>
            </div>
          </div>

          {/* Dispatch Channel Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Select Notification Channel:</label>
              <span className="text-[10px] text-emerald-600 font-bold">
                Direct WhatsApp & SMTP Email ready
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  channel === "whatsapp"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaWhatsapp size={14} className="text-emerald-500" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  channel === "sms"
                    ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaCommentDots size={13} className="text-sky-500" />
                <span>SMS</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  channel === "email"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaEnvelope size={13} className="text-indigo-500" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel("all")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  channel === "all"
                    ? "border-purple-500 bg-purple-50 text-purple-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaPaperPlane size={12} className="text-purple-500" />
                <span>All (Multi)</span>
              </button>
            </div>
          </div>

          {/* Editable Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Message Content Preview</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                >
                  {copied ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={11} />}
                  <span>{copied ? "Copied!" : "Copy Text"}</span>
                </button>
                <span className="text-[10px] text-slate-400">({customMessage.length} chars)</span>
              </div>
            </div>
            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="w-full sm:w-auto">
            {/* Primary Direct WhatsApp Button */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!recipientPhone.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
            >
              <FaWhatsapp size={16} />
              <span>📱 Send via WhatsApp (Open Web / App)</span>
              <FaExternalLinkAlt size={10} className="opacity-80" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSendViaGateway}
              disabled={sending || (!recipientPhone.trim() && !recipientEmail.trim())}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-rose-600 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
            >
              {sending ? (
                <>
                  <FaSpinner className="animate-spin" size={13} />
                  <span>Dispatching Alert...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane size={12} />
                  <span>Send via Server (Email / Gateway)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
