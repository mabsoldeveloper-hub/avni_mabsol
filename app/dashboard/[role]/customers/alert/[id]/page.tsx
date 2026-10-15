"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaArrowLeft,
  FaWhatsapp,
  FaEnvelope,
  FaPaperPlane,
  FaCopy,
  FaCheck,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaCoins,
  FaClock,
  FaFileInvoice,
  FaExternalLinkAlt,
  FaEdit,
  FaEye,
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useUser } from "@/context/UserContext";

export default function CustomerSendAlertPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const role = (params?.role as string) || "admin";

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form Fields
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const { selectedCompany } = useCompany();
  const { user } = useUser();
  const activeCompanyName = (selectedCompany?.companyName || user?.companyName || "Our Company").trim();

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch customer details`);
      }

      const data = await res.json();
      if (!data || Object.keys(data).length === 0) {
        throw new Error("Customer record not found");
      }

      setCustomer(data);
      const rawEmail = (
        data.EMAIL && data.EMAIL !== "NO EMAIL"
          ? String(data.EMAIL)
          : ""
      ).trim();
      const isAdminOrMailnam =
        /admin\.mabsolinfotech|support@mabsolinfotech/i.test(rawEmail) ||
        (data.MAILNAM && rawEmail.toLowerCase() === String(data.MAILNAM).trim().toLowerCase());
      const email = !isAdminOrMailnam ? rawEmail : "";
      const phone = String(data.PHONE1 || data.PHONE2 || "").trim();
      setRecipientPhone(phone);
      setRecipientEmail(email);

      // Financials
      const custName = (data.PARNAM || "Valued Customer").trim();
      const balance = Number(data.BALANCE ?? data.FINAL ?? 0);
      const credit = Number(data.CREDIT ?? 0);
      const dueDays = Number(data.DUEDAYS || data.DAYS || 0);
      const billCount = Number(data.pendingInvoicesCount ?? data.billCount ?? 0);

      // Evaluate trigger reasons
      const triggers: string[] = [];
      if (credit > 0 && balance >= credit) {
        triggers.push(`• Credit Limit Exceeded: Outstanding ₹${balance.toLocaleString("en-IN")} reaches limit (₹${credit.toLocaleString("en-IN")})`);
      }
      if (dueDays > 0) {
        triggers.push(`• Credit Term Notice: Permitted credit term is ${dueDays} days.`);
      }

      const defaultMsg = `📢 *PAYMENT & ACCOUNT NOTICE*
Dear *${custName}*,

This is a reminder regarding your account ledger status with *${activeCompanyName}*:

• *Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}
• *Sanctioned Credit Limit:* ₹${credit.toLocaleString("en-IN")}
• *Credit Term Allowed:* ${dueDays} Days
${billCount > 0 ? `• *Pending Invoices:* ${billCount} Bills\n` : ""}${triggers.length > 0 ? `\n⚠️ *Notice Details:*\n${triggers.join("\n")}\n` : ""}
Please arrange payment clearance promptly to ensure uninterrupted billing and supplies.
Thank you!`;

      setCustomMessage(defaultMsg);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", message: err.message || "Failed to load customer details" });
    } finally {
      setLoading(false);
    }
  }, [id, activeCompanyName]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!recipientPhone.trim()) {
      setFeedback({ type: "error", message: "Please provide a valid recipient WhatsApp number." });
      return;
    }

    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${formattedPhone}?text=${encoded}`;
    window.open(url, "_blank");

    setFeedback({
      type: "success",
      message: `WhatsApp chat opened for +${formattedPhone}. Click 'Send' in WhatsApp to complete dispatch.`,
    });
  };

  const handleSendViaEmail = async () => {
    if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
      setFeedback({ type: "error", message: "Please provide a valid recipient email address." });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/customers/${id}/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          customMessage: customMessage.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim(),
          companyName: activeCompanyName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to deliver email through GoDaddy SMTP");
      }

      setFeedback({
        type: "success",
        message: `✅ Email alert successfully delivered to ${recipientEmail.trim()} via GoDaddy SMTP!`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", message: err.message || "Failed to dispatch email alert" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <FaSpinner className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-semibold text-slate-600">Loading Customer Alert Details...</p>
      </div>
    );
  }

  const custName = customer?.PARNAM || "Customer";
  const balance = Number(customer?.BALANCE ?? customer?.FINAL ?? 0);
  const credit = Number(customer?.CREDIT ?? 0);
  const dueDays = Number(customer?.DUEDAYS || customer?.DAYS || 0);
  const isOverLimit = credit > 0 && balance > credit;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${role}/customers`}
            className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FaPaperPlane className="text-indigo-600" /> Send Account Alert
              </h2>
              {isOverLimit && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  ⚠️ Limit Exceeded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Party: <span className="font-semibold text-slate-700">{custName}</span>
              {customer?.CITY ? ` • ${customer.CITY}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${role}/customers/edit/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
          >
            <FaEdit size={12} />
            <span>Edit Limits</span>
          </Link>
          <Link
            href={`/dashboard/${role}/customers/view/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
          >
            <FaEye size={12} />
            <span>View Profile</span>
          </Link>
        </div>
      </div>

      {/* Customer Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Balance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Balance
            </p>
            <p className={`text-lg font-extrabold mt-1 ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              ₹{balance.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Current Ledger Due</p>
          </div>
          <div className={`p-3 rounded-xl ${balance > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
            <FaCoins size={20} />
          </div>
        </div>

        {/* Credit Limit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Credit Limit
            </p>
            <p className="text-lg font-extrabold text-indigo-600 mt-1">
              ₹{credit.toLocaleString("en-IN")}
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${isOverLimit ? "text-rose-600" : "text-slate-400"}`}>
              {isOverLimit ? "⚠️ Credit Limit Breached" : "Normal Credit Terms"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
            <FaClock size={20} />
          </div>
        </div>

        {/* Credit Term Days */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Credit Term
            </p>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {dueDays} Days
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Permitted Payment Window</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
            <FaFileInvoice size={20} />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl text-xs font-semibold shadow-xs animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <FaCheckCircle size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <FaExclamationTriangle size={16} className="text-rose-500 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Dispatch Controls & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Communication Targets & Dispatch Buttons */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Channels Box */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Recipients & Dispatch Channels</h3>

            {/* Mobile / WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FaWhatsapp className="text-emerald-600" size={13} />
                <span>Customer Mobile (WhatsApp):</span>
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FaEnvelope className="text-indigo-600" size={13} />
                <span>Customer Email Address:</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="pharmacy@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className=" flex flex-wrap gap-2 pt-2 space-y-2.5">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!recipientPhone.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <FaWhatsapp size={15} />
                <span>Send via WhatsApp</span>
                <FaExternalLinkAlt size={10} className="opacity-75" />
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={handleSendViaEmail}
                disabled={sending || !recipientEmail.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    <span>Delivering Email</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane size={12} />
                    <span>Send via Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Alert Message Text & Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Alert Notice Message</h3>
                <p className="text-[11px] text-slate-500">Auto-formatted ledger statement notice</p>
              </div>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                {copied ? <FaCheck className="text-emerald-500" size={12} /> : <FaCopy size={12} />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>

            <textarea
              rows={12}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/80 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none shadow-inner"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

