"use client";

import {
  FaExclamationTriangle,
  FaClock,
  FaShieldAlt,
  FaPaperPlane,
  FaEdit,
  FaFileInvoice,
  FaCog,
} from "react-icons/fa";

interface Props {
  customer: any;
  onSendAlertClick: () => void;
  onEditClick: () => void;
  onAutoAlertSettingsClick?: () => void;
}

export default function CustomerAlertBanner({
  customer,
  onSendAlertClick,
  onEditClick,
  onAutoAlertSettingsClick,
}: Props) {
  if (!customer) return null;

  const balance = Number(customer.BALANCE ?? customer.FINAL ?? 0);
  const credit = Number(customer.CREDIT ?? 0);
  const dueDays = Number(customer.DUEDAYS ?? customer.DAYS ?? 0);

  // 1. Credit Limit Alert
  const isCreditLimitExceeded = credit > 0 && balance > credit;
  const excessCredit = isCreditLimitExceeded ? Math.round(balance - credit) : 0;
  const utilization = credit > 0 ? Math.round((balance / credit) * 100) : 0;

  // 2. Days Kam Bache / Days Expired Alert
  const minDaysRemaining = Number(
    customer.minDaysRemaining ?? customer.financialAlerts?.minDaysRemaining ?? 0
  );
  const maxOverdueDays = Number(
    customer.maxOverdueDays ?? customer.financialAlerts?.maxOverdueDays ?? 0
  );
  const isDaysKamBache = Boolean(
    customer.isDaysKamBache ?? customer.financialAlerts?.isDaysKamBache
  );
  const isDaysExpired = Boolean(
    customer.isDaysExpired ?? customer.financialAlerts?.isDaysExpired ?? (maxOverdueDays > 0)
  );

  // 3. Number of Bills (Bill Limit) Alert
  const billLimit = Number(
    customer.billLimit ??
    customer.financialAlerts?.billLimit ??
    customer.BILL_LIMIT ??
    customer.BILLLIMIT ??
    0
  );
  const totalPendingBills = Number(
    customer.totalPendingBills ??
    customer.financialAlerts?.totalPendingBills ??
    0
  );
  const isBillLimitExceeded = billLimit > 0 && totalPendingBills > billLimit;
  const excessBills = isBillLimitExceeded ? totalPendingBills - billLimit : 0;

  const hasAnyAlert = isCreditLimitExceeded || isDaysKamBache || isDaysExpired || isBillLimitExceeded;

  return (
    <div className="space-y-3 print:hidden">
      {/* 1. CREDIT LIMIT EXCEEDED ALERT */}
      {isCreditLimitExceeded && (
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-4 text-white shadow-xl shadow-rose-600/20 border border-rose-400/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pointer-events-none absolute inset-0 bg-white/10 backdrop-blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white shrink-0 mt-0.5">
                <FaExclamationTriangle size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white text-rose-700 shadow-sm">
                    Credit Limit Exceeded
                  </span>
                  <span className="text-xs font-semibold text-rose-100">
                    Utilization: <strong className="text-white font-extrabold">{utilization}%</strong>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
                  Credit Limit Exceeded: Outstanding balance of ₹{balance.toLocaleString("en-IN")} exceeds the sanctioned limit (₹{credit.toLocaleString("en-IN")}) by ₹{excessCredit.toLocaleString("en-IN")}!
                </h3>
                <p className="text-xs text-rose-100/90 mt-0.5 max-w-2xl">
                  Send payment alert via WhatsApp or Email to prompt timely settlement of pending balance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={onSendAlertClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white text-rose-700 hover:bg-rose-50 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                <FaPaperPlane size={11} className="text-rose-600" />
                <span>Send Credit Limit Alert</span>
              </button>
              <button
                type="button"
                onClick={onEditClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md transition cursor-pointer"
              >
                <FaEdit size={11} />
                <span>Update Limit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. NUMBER OF BILLS (BILL LIMIT) EXCEEDED ALERT */}
      {isBillLimitExceeded && (
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-4 text-white shadow-xl shadow-purple-700/20 border border-purple-400/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pointer-events-none absolute inset-0 bg-white/10 backdrop-blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white shrink-0 mt-0.5">
                <FaFileInvoice size={20} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white text-purple-900 shadow-sm">
                    Invoice Count Exceeded
                  </span>
                  <span className="text-xs font-semibold text-purple-100">
                    Pending Invoices: <strong className="text-white font-extrabold">{totalPendingBills} / {billLimit} Allowed</strong>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
                  Invoice Count Exceeded: Customer has {totalPendingBills} pending invoices, which exceeds the limit ({billLimit}) by {excessBills} invoices!
                </h3>
                <p className="text-xs text-purple-100/90 mt-0.5 max-w-2xl">
                  Sanctioned bill count limit has been reached. Notify the customer to clear prior pending invoices.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={onSendAlertClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white text-purple-900 hover:bg-purple-50 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                <FaPaperPlane size={11} className="text-purple-700" />
                <span>Send Bill Limit Alert</span>
              </button>
              <button
                type="button"
                onClick={onEditClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md transition cursor-pointer"
              >
                <FaEdit size={11} />
                <span>Update Bill Limit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAYS EXPIRING SOON / OVERDUE ALERT */}
      {(isDaysKamBache || isDaysExpired) && (
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white shadow-xl shadow-amber-500/20 border border-amber-300/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pointer-events-none absolute inset-0 bg-white/10 backdrop-blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white shrink-0 mt-0.5">
                <FaClock size={20} className="animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white text-amber-900 shadow-sm">
                    {isDaysExpired ? "Credit Term Overdue" : "Credit Term Expiring Soon"}
                  </span>
                  <span className="text-xs font-semibold text-amber-100">
                    Term: <strong className="text-white font-extrabold">{dueDays} Days</strong>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
                  {isDaysExpired
                    ? `Payment Overdue: Invoices are overdue by ${maxOverdueDays} days!`
                    : `Credit Term Alert: Only ${minDaysRemaining} days remaining in the payment term!`}
                </h3>
                <p className="text-xs text-amber-100/90 mt-0.5 max-w-2xl">
                  {isDaysExpired
                    ? "Payment credit term has expired. Send payment reminder notification to customer."
                    : `Credit term (${dueDays} days) is expiring soon. Notify customer to settle pending dues before due date.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={onSendAlertClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white text-amber-900 hover:bg-amber-50 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
              >
                <FaPaperPlane size={11} className="text-amber-700" />
                <span>Send Term Reminder</span>
              </button>
              <button
                type="button"
                onClick={onEditClick}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md transition cursor-pointer"
              >
                <FaEdit size={11} />
                <span>Update Days</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SAFE LIMITS STATUS BAR */}
      {!hasAnyAlert && (
        <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-emerald-500/20 p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600">
              <FaShieldAlt size={13} />
            </span>
            <div className="text-xs">
              <span className="font-bold text-slate-800">Account Limits Normal:</span>{" "}
              <span className="text-slate-600">
                Credit Limit (₹{credit.toLocaleString("en-IN")}), Bill Limit ({billLimit || "No cap"} invoices), and Credit Term ({dueDays} days) are within normal parameters.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={onSendAlertClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border border-indigo-200"
            >
              <FaPaperPlane size={10} />
              <span>Send Statement</span>
            </button>
            <button
              type="button"
              onClick={onEditClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition border border-slate-200"
            >
              <FaEdit size={10} />
              <span>Edit Limits</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
