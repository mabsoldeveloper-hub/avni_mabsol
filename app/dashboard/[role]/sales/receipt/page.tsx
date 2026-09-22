"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
    FaArrowLeft,
    FaReceipt,
    FaPlus,
    FaSave,
    FaSearch,
    FaSync,
    FaFileInvoiceDollar,
    FaMoneyBillWave,
    FaUniversity,
    FaQrcode,
    FaMoneyCheck,
    FaCheckCircle,
    FaExclamationCircle,
    FaChevronLeft,
    FaChevronRight,
    FaTimes,
    FaCheck,
    FaPrint,
    FaMagic,
    FaUserCheck,
    FaHandHoldingUsd,
    FaClock,
} from "react-icons/fa";

interface PendingInvoice {
    id: string;
    vcn: string;
    date: string;
    dueDate: string;
    originalAmount: number;
    pendingAmount: number;
    settledAmount: number;
    selected: boolean;
}

export default function ReceiptEntryPage() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");

    // Common State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Metrics State
    const [metrics, setMetrics] = useState({
        totalPendingOutstanding: 0,
        pendingCount: 0,
        todayReceiptsAmount: 0,
        todayReceiptsCount: 0,
    });

    // Form State
    const [nextVcn, setNextVcn] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [partyCode, setPartyCode] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerProfile, setCustomerProfile] = useState<any | null>(null);
    const [fetchingCustProfile, setFetchingCustProfile] = useState(false);

    // Payment Form State
    const [receiptAmount, setReceiptAmount] = useState<number | "">("");
    const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank Transfer" | "UPI" | "Cheque">("Bank Transfer");
    const [refNo, setRefNo] = useState("");
    const [bankName, setBankName] = useState("");
    const [discountAllowed, setDiscountAllowed] = useState<number | "">("");
    const [remarks, setRemarks] = useState("");

    // Invoices State
    const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
    const [fetchingInvoices, setFetchingInvoices] = useState(false);

    // Print Receipt Modal
    const [selectedPrintVoucher, setSelectedPrintVoucher] = useState<any | null>(null);
    const [lastCreatedVoucher, setLastCreatedVoucher] = useState<any | null>(null);

    // History State
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historySearch, setHistorySearch] = useState("");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);

    const getCompanyParams = () => {
        const p = new URLSearchParams();
        if (selectedCompany?._id) p.set("companyId", selectedCompany._id);
        if (selectedFY?._id) p.set("fyId", selectedFY._id);
        return p;
    };

    // Initial Load
    useEffect(() => {
        fetchNextVcn();
        fetchCustomers();
        fetchMetrics();
    }, [selectedCompany?._id, selectedFY?._id]);

    useEffect(() => {
        if (activeTab === "history") {
            fetchHistory();
        }
    }, [activeTab, historyPage, historySearch, selectedCompany?._id, selectedFY?._id]);

    const fetchNextVcn = async () => {
        try {
            const p = getCompanyParams();
            p.set("action", "nextNumber");
            const res = await fetch(`/api/sales/receipt?${p.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.nextVcn) {
                    setNextVcn(data.nextVcn);
                }
            }
        } catch (err) {
            console.error("Failed to fetch next VCN:", err);
        }
    };

    const fetchMetrics = async () => {
        try {
            const p = getCompanyParams();
            p.set("action", "metrics");
            const res = await fetch(`/api/sales/receipt?${p.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMetrics({
                        totalPendingOutstanding: data.totalPendingOutstanding || 0,
                        pendingCount: data.pendingCount || 0,
                        todayReceiptsAmount: data.todayReceiptsAmount || 0,
                        todayReceiptsCount: data.todayReceiptsCount || 0,
                    });
                }
            }
        } catch (err) {
            console.error("Failed to fetch metrics:", err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const p = getCompanyParams();
            const res = await fetch(`/api/master/customer?${p.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || data.customers || []);
                setCustomers(list);
            }
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        }
    };

    const handleCustomerChange = async (code: string) => {
        setPartyCode(code);
        setPendingInvoices([]);
        setCustomerProfile(null);

        if (!code) return;

        // Fetch Customer Profile & Invoices in parallel
        setFetchingInvoices(true);
        setFetchingCustProfile(true);

        try {
            const p1 = getCompanyParams();
            p1.set("action", "customerDetails");
            p1.set("partyCode", code);

            const p2 = getCompanyParams();
            p2.set("action", "pendingInvoices");
            p2.set("partyCode", code);

            const [profileRes, invoicesRes] = await Promise.all([
                fetch(`/api/sales/receipt?${p1.toString()}`),
                fetch(`/api/sales/receipt?${p2.toString()}`),
            ]);

            if (profileRes.ok) {
                const pData = await profileRes.json();
                if (pData.success) setCustomerProfile(pData.customer);
            }

            if (invoicesRes.ok) {
                const iData = await invoicesRes.json();
                if (iData.success && Array.isArray(iData.items)) {
                    const list: PendingInvoice[] = iData.items.map((i: any) => ({
                        ...i,
                        settledAmount: 0,
                        selected: false,
                    }));
                    setPendingInvoices(list);
                }
            }
        } catch (err) {
            console.error("Failed to fetch customer data:", err);
        } finally {
            setFetchingInvoices(false);
            setFetchingCustProfile(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = getCompanyParams();
            params.set("page", historyPage.toString());
            params.set("limit", "25");
            if (historySearch) params.set("search", historySearch);

            const res = await fetch(`/api/sales/receipt?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setHistoryList(data.items || []);
                    setHistoryTotalPages(data.pagination?.totalPages || 1);
                }
            }
        } catch (err) {
            console.error("Failed to fetch receipt history:", err);
        } finally {
            setLoading(false);
        }
    };

    // MARG ERP FIFO Auto Allocation Algorithm
    const applyFifoAllocation = () => {
        const totalAmountAvailable = Number(receiptAmount || 0) + Number(discountAllowed || 0);
        if (totalAmountAvailable <= 0) {
            setErrorMsg("Please enter a valid Receipt Amount first before Auto Settling.");
            return;
        }
        setErrorMsg("");

        let remainingToAllocate = totalAmountAvailable;
        const updated = pendingInvoices.map((inv) => {
            if (remainingToAllocate <= 0) {
                return { ...inv, settledAmount: 0, selected: false };
            }

            const canSettle = Math.min(inv.pendingAmount, remainingToAllocate);
            const settled = Math.round(canSettle * 100) / 100;
            remainingToAllocate = Math.round((remainingToAllocate - settled) * 100) / 100;

            return {
                ...inv,
                settledAmount: settled,
                selected: settled > 0,
            };
        });

        setPendingInvoices(updated);
    };

    const clearAllocations = () => {
        setPendingInvoices(
            pendingInvoices.map((inv) => ({
                ...inv,
                settledAmount: 0,
                selected: false,
            }))
        );
    };

    const toggleSelectInvoice = (index: number) => {
        const updated = [...pendingInvoices];
        const inv = { ...updated[index] };
        inv.selected = !inv.selected;
        if (inv.selected) {
            inv.settledAmount = inv.pendingAmount;
        } else {
            inv.settledAmount = 0;
        }
        updated[index] = inv;
        setPendingInvoices(updated);
    };

    const updateSettledAmount = (index: number, val: number) => {
        const updated = [...pendingInvoices];
        const inv = { ...updated[index] };
        const amt = Math.max(0, Math.min(val, inv.pendingAmount));
        const roundedAmt = Math.round(amt * 100) / 100;
        inv.settledAmount = roundedAmt;
        inv.selected = roundedAmt > 0;
        updated[index] = inv;
        setPendingInvoices(updated);
    };

    // Calculate totals
    const currentReceiptAmountNum = Number(receiptAmount || 0);
    const discountAllowedNum = Number(discountAllowed || 0);
    const totalAllocated = pendingInvoices.reduce(
        (sum, i) => sum + (i.selected ? Number(i.settledAmount || 0) : 0),
        0
    );
    const roundedTotalAllocated = Math.round(totalAllocated * 100) / 100;
    const totalFundsAvailable = currentReceiptAmountNum + discountAllowedNum;
    const unallocatedAmount = Math.max(0, Math.round((totalFundsAvailable - roundedTotalAllocated) * 100) / 100);
    const isOverAllocated = roundedTotalAllocated > totalFundsAvailable && totalFundsAvailable > 0;

    // Format customer options for SearchableSelect
    const customerOptions: OptionItem[] = customers.map((c, idx) => {
        const code = String(c.CODEP || c.ORDNO || c.CODE || `cust-${idx}`);
        const name = String(c.PARNAM || c.NAME || c.MAILNAM || code);
        return {
            value: code,
            label: name,
            subLabel: `#${code}${c.CITY ? ` • ${c.CITY}` : ""}`,
        };
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (!partyCode) {
            setErrorMsg("Please select a Customer / Party");
            return;
        }

        const amt = Number(receiptAmount || 0);
        if (amt <= 0) {
            setErrorMsg("Please enter a valid Receipt Amount");
            return;
        }

        if (isOverAllocated) {
            setErrorMsg(`Total Allocated Amount (₹${roundedTotalAllocated.toLocaleString("en-IN")}) cannot exceed Total Available Funds (₹${totalFundsAvailable.toLocaleString("en-IN")}).`);
            return;
        }

        setSubmitting(true);
        try {
            const adjustedInvoices = pendingInvoices
                .filter((i) => i.selected && i.settledAmount > 0)
                .map((i) => ({
                    id: i.id,
                    vcn: i.vcn,
                    originalAmount: i.originalAmount,
                    settledAmount: Number(i.settledAmount),
                }));

            const payload = {
                partyCode,
                date,
                receiptAmount: amt,
                paymentMode,
                refNo,
                bankName,
                discountAllowed: Number(discountAllowed || 0),
                remarks,
                adjustedInvoices,
            };

            const res = await fetch("/api/sales/receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                const voucherDetails = {
                    vcn: json.vcn,
                    date,
                    partyCode,
                    partyName: customerProfile?.name || partyCode,
                    city: customerProfile?.city || "",
                    amount: amt,
                    paymentMode,
                    refNo,
                    bankName,
                    discountAllowed: Number(discountAllowed || 0),
                    remarks,
                    adjustedInvoices,
                };

                setSuccessMsg(`Receipt Voucher #${json.vcn} created successfully! Customer ledger credited & pendings updated.`);
                setSelectedPrintVoucher(voucherDetails);
                setLastCreatedVoucher(voucherDetails);

                // Reset form & reload metrics
                setPartyCode("");
                setReceiptAmount("");
                setRefNo("");
                setBankName("");
                setDiscountAllowed("");
                setRemarks("");
                setPendingInvoices([]);
                setCustomerProfile(null);
                fetchNextVcn();
                fetchMetrics();
            } else {
                setErrorMsg(json.error || "Failed to save receipt voucher");
            }
        } catch (err: any) {
            console.error("Receipt creation error:", err);
            setErrorMsg("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Utility: calculate overdue days
    const calculateOverdueDays = (dueDateStr: string) => {
        if (!dueDateStr || dueDateStr === "N/A") return 0;
        const due = new Date(dueDateStr);
        const today = new Date();
        const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
        return Math.max(0, diff);
    };

    return (
        <div className="container-fluid p-3 sm:p-6 space-y-4">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/sales/dashboard"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition"
                    >
                        <FaArrowLeft size={14} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                Receipt Entry (Payment Collection)
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                Pharma Collection Engine
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Record customer payments, auto-settle outstanding bills (FIFO), post GLedger receipts, and print slips.
                        </p>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "new"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <FaPlus size={11} /> New Collection
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "history"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <FaReceipt size={11} /> Receipt History
                    </button>
                </div>
            </div>

            {/* MARG EXECUTIVE SUMMARY KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total System Outstanding */}
                <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            Total Outstanding
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{metrics.totalPendingOutstanding.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {metrics.pendingCount} Pending Bills Total
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                        <FaFileInvoiceDollar size={18} />
                    </div>
                </div>

                {/* Today's Collections */}
                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Today's Collections
                        </span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            ₹{metrics.todayReceiptsAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {metrics.todayReceiptsCount} Vouchers Recorded Today
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FaHandHoldingUsd size={20} />
                    </div>
                </div>

                {/* Selected Customer Balance */}
                <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                            Selected Party Outstanding
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{customerProfile ? customerProfile.netBalance.toLocaleString("en-IN") : "0"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[150px]">
                            {customerProfile ? `${customerProfile.pendingInvoicesCount} Pending Invoices` : "Select a customer"}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FaUserCheck size={18} />
                    </div>
                </div>

                {/* Next Voucher Series Preview */}
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                            Receipt VCN Series
                        </span>
                        <span className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono">
                            {nextVcn || "RCT-XXXXX"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Auto Series Counter
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <FaReceipt size={18} />
                    </div>
                </div>
            </div>

            {/* Alert Messages */}
            {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                    <FaExclamationCircle className="flex-shrink-0" size={14} />
                    <span>{errorMsg}</span>
                </div>
            )}
            {successMsg && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                        <FaCheckCircle className="flex-shrink-0" size={14} />
                        <span>{successMsg}</span>
                    </div>
                    {(selectedPrintVoucher || lastCreatedVoucher) && (
                        <button
                            type="button"
                            onClick={() => setSelectedPrintVoucher(selectedPrintVoucher || lastCreatedVoucher)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition"
                        >
                            <FaPrint size={11} /> Print Receipt Slip
                        </button>
                    )}
                </div>
            )}

            {/* TAB 1: NEW RECEIPT COLLECTION */}
            {activeTab === "new" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Header Card: Customer Selection & Financial Profile Banner */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Customer Selection & Payment Setup
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                Voucher VCN: {nextVcn || "RCT-XXXXX"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Party / Customer Search Selector */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Customer / Party <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={customerOptions}
                                    value={partyCode}
                                    onChange={handleCustomerChange}
                                    placeholder="Type or select customer name/code..."
                                />
                            </div>

                            {/* Receipt Date */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Receipt Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Receipt Amount Field */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Received Amount (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="0.00"
                                        value={receiptAmount}
                                        onChange={(e) => setReceiptAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                        className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white font-mono font-bold"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Selected Customer Financial Profile Banner (MARG Style) */}
                        {customerProfile && (
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-[fadeIn_0.2s_ease-out]">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                            {customerProfile.name}
                                        </h4>
                                        <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                            #{customerProfile.code}
                                        </span>
                                        {customerProfile.city && (
                                            <span className="text-[10px] text-slate-500">
                                                📍 {customerProfile.city}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Pending Invoices Count: <strong className="text-slate-800 dark:text-slate-200">{customerProfile.pendingInvoicesCount}</strong>
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Ledger Balance</span>
                                        <span className={`text-sm font-bold font-mono ${customerProfile.netBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                            ₹{customerProfile.netBalance.toLocaleString("en-IN")} {customerProfile.netBalance > 0 ? "Dr" : "Cr"}
                                        </span>
                                    </div>

                                    {pendingInvoices.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={applyFifoAllocation}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs hover:from-emerald-500 hover:to-teal-500 transition"
                                        >
                                            <FaMagic size={11} /> FIFO Auto Settle
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Mode & References Sub-Grid */}
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Payment Instrument Mode
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { mode: "Cash", label: "Cash", icon: FaMoneyBillWave },
                                    { mode: "Bank Transfer", label: "Bank / NEFT", icon: FaUniversity },
                                    { mode: "UPI", label: "UPI / QR", icon: FaQrcode },
                                    { mode: "Cheque", label: "Cheque / DD", icon: FaMoneyCheck },
                                ].map((item) => {
                                    const IconComponent = item.icon;
                                    const isSelected = paymentMode === item.mode;
                                    return (
                                        <button
                                            key={item.mode}
                                            type="button"
                                            onClick={() => setPaymentMode(item.mode as any)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${isSelected
                                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                                                }`}
                                        >
                                            <IconComponent className={isSelected ? "text-emerald-600" : "text-slate-400"} size={14} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Conditional Bank / Ref Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                        Ref / Cheque / UTR No
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. UTR9842145"
                                        value={refNo}
                                        onChange={(e) => setRefNo(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                        Bank Name & Branch
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HDFC Bank, Delhi"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                        Discount Allowed (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={discountAllowed}
                                        onChange={(e) => setDiscountAllowed(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MARG OUTSTANDING INVOICES SETTLEMENT GRID */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <FaFileInvoiceDollar className="text-emerald-500" /> Outstanding Bills Settlement Grid
                                </span>
                                <p className="text-[11px] text-slate-400">
                                    Allocate receipt amount against customer's past invoices or let FIFO settle automatically.
                                </p>
                            </div>

                            {pendingInvoices.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={applyFifoAllocation}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 transition"
                                    >
                                        <FaMagic size={10} /> Auto-Settle FIFO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllocations}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto min-h-[180px]">
                            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="p-2.5 w-10 text-center">Settle</th>
                                        <th className="p-2.5">Invoice VCN</th>
                                        <th className="p-2.5 font-mono">Invoice Date</th>
                                        <th className="p-2.5 font-mono">Due Date</th>
                                        <th className="p-2.5 text-center">Overdue</th>
                                        <th className="p-2.5 text-right font-mono">Bill Amount (₹)</th>
                                        <th className="p-2.5 text-right font-mono">Pending (₹)</th>
                                        <th className="p-2.5 w-32 text-right font-mono">Settled (₹)</th>
                                        <th className="p-2.5 text-right font-mono">Balance (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                    {fetchingInvoices ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-400">
                                                <FaSync className="animate-spin text-emerald-500 mx-auto mb-2" size={16} />
                                                Fetching pending invoices...
                                            </td>
                                        </tr>
                                    ) : !partyCode ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-400">
                                                Select a customer above to view pending invoices.
                                            </td>
                                        </tr>
                                    ) : pendingInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                                🎉 No pending outstanding bills for this customer!
                                            </td>
                                        </tr>
                                    ) : (
                                        pendingInvoices.map((inv, idx) => {
                                            const overdueDays = calculateOverdueDays(inv.dueDate);
                                            const remBal = Math.max(0, inv.pendingAmount - (inv.settledAmount || 0));

                                            return (
                                                <tr
                                                    key={inv.id}
                                                    className={`transition ${inv.selected
                                                        ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                        }`}
                                                >
                                                    <td className="p-2.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={inv.selected}
                                                            onChange={() => toggleSelectInvoice(idx)}
                                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                                        {inv.vcn}
                                                    </td>
                                                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                        {inv.date}
                                                    </td>
                                                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                        {inv.dueDate}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {overdueDays > 0 ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                                                {overdueDays}d Overdue
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">Current</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                                        ₹{inv.originalAmount.toLocaleString("en-IN")}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                        ₹{inv.pendingAmount.toLocaleString("en-IN")}
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max={inv.pendingAmount}
                                                            value={inv.settledAmount || ""}
                                                            onChange={(e) => updateSettledAmount(idx, parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 text-xs text-right rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        ₹{remBal.toLocaleString("en-IN")}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Settlement Summary & Save Button */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div>
                                <span className="text-slate-500">Total Received Amount:</span>{" "}
                                <span className="font-bold text-slate-900 dark:text-white font-mono">
                                    ₹{currentReceiptAmountNum.toLocaleString("en-IN")}
                                </span>
                            </div>
                            {discountAllowedNum > 0 && (
                                <div>
                                    <span className="text-slate-500">Discount Allowed:</span>{" "}
                                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                        ₹{discountAllowedNum.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-500">Total Allocated:</span>{" "}
                                <span className={`font-bold font-mono ${isOverAllocated ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    ₹{roundedTotalAllocated.toLocaleString("en-IN")}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Unallocated / Advance:</span>{" "}
                                <span className={`font-bold font-mono ${unallocatedAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                                    ₹{unallocatedAmount.toLocaleString("en-IN")}
                                </span>
                            </div>
                            {isOverAllocated && (
                                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200">
                                    ⚠️ Allocated exceeds available funds!
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || isOverAllocated}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition cursor-pointer"
                        >
                            <FaSave size={13} />
                            {submitting ? "Saving Receipt..." : "Post Receipt Voucher"}
                        </button>
                    </div>
                </form>
            )}

            {/* TAB 2: RECEIPT HISTORY LIST */}
            {activeTab === "history" && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search receipt VCN, party name, ref no..."
                                value={historySearch}
                                onChange={(e) => {
                                    setHistorySearch(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={fetchHistory}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
                        >
                            <FaSync className={loading ? "animate-spin text-emerald-500" : ""} size={13} />
                        </button>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-3">Receipt VCN</th>
                                    <th className="p-3 font-mono">Date</th>
                                    <th className="p-3">Customer Party</th>
                                    <th className="p-3">Payment Mode</th>
                                    <th className="p-3">Ref / Cheque No</th>
                                    <th className="p-3 text-right font-mono">Amount (₹)</th>
                                    <th className="p-3 text-center">Print</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            <FaSync size={18} className="animate-spin text-emerald-500 mx-auto mb-2" />
                                            Loading receipt vouchers...
                                        </td>
                                    </tr>
                                ) : historyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No receipt vouchers recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    historyList.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {row.vcn}
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">
                                                {row.date}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                                {row.partyName}
                                                <span className="text-[10px] text-slate-400 block font-normal">
                                                    #{row.partyCode} {row.city ? `• ${row.city}` : ""}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                    {row.paymentMode}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                                                {row.refNo || "—"}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                ₹{Number(row.amount || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => setSelectedPrintVoucher(row)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="Print Slip"
                                                >
                                                    <FaPrint size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-slate-500">
                            Page {historyPage} of {historyTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={historyPage <= 1 || loading}
                                onClick={() => setHistoryPage((p) => p - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                            >
                                <FaChevronLeft size={10} />
                            </button>
                            <button
                                disabled={historyPage >= historyTotalPages || loading}
                                onClick={() => setHistoryPage((p) => p + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                            >
                                <FaChevronRight size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MARG PRINTABLE RECEIPT VOUCHER SLIP MODAL */}
            {selectedPrintVoucher && (
                <div
                    className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedPrintVoucher(null);
                    }}
                >
                    <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-emerald-800">
                                    MAABSOL PHARMA CRM
                                </h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                                    Official Payment Receipt Voucher Slip
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold font-mono text-emerald-600 block">
                                    #{selectedPrintVoucher.vcn}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    Date: {selectedPrintVoucher.date}
                                </span>
                            </div>
                        </div>

                        {/* Customer & Receipt Details */}
                        <div className="grid grid-cols-2 gap-4 text-xs p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                                <span className="text-slate-400 block uppercase font-bold text-[10px]">Received From (Party)</span>
                                <span className="font-bold text-sm text-slate-900 block mt-0.5">{selectedPrintVoucher.partyName}</span>
                                <span className="text-slate-500 font-mono">Party Code: #{selectedPrintVoucher.partyCode}</span>
                                {selectedPrintVoucher.city && <span className="text-slate-500 block">City: {selectedPrintVoucher.city}</span>}
                            </div>
                            <div className="text-right space-y-1">
                                <div>
                                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Payment Mode</span>
                                    <span className="font-bold text-slate-900">{selectedPrintVoucher.paymentMode}</span>
                                </div>
                                {selectedPrintVoucher.refNo && (
                                    <div>
                                        <span className="text-slate-400 block uppercase font-bold text-[10px]">Ref / UTR No</span>
                                        <span className="font-mono font-semibold">{selectedPrintVoucher.refNo}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Received Amount Display */}
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Received Amount</span>
                            <span className="text-2xl font-bold font-mono text-emerald-700">
                                ₹{Number(selectedPrintVoucher.amount).toLocaleString("en-IN")}
                            </span>
                        </div>

                        {/* Settled Invoices Breakdown */}
                        {selectedPrintVoucher.adjustedInvoices && selectedPrintVoucher.adjustedInvoices.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase text-slate-500">Invoices Settled</span>
                                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                            <tr>
                                                <th className="p-2">Invoice VCN</th>
                                                <th className="p-2 text-right">Settled Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedPrintVoucher.adjustedInvoices.map((inv: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="p-2 font-mono font-semibold">{inv.vcn}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                                        ₹{Number(inv.settledAmount).toLocaleString("en-IN")}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Signature Footer */}
                        <div className="pt-8 flex items-end justify-between text-xs text-slate-500 border-t border-slate-200">
                            <div className="text-center border-t border-slate-300 pt-1 w-32">
                                Customer Signature
                            </div>
                            <div className="text-center border-t border-slate-300 pt-1 w-40">
                                Authorized Signatory
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
                            <button
                                onClick={() => setSelectedPrintVoucher(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-md"
                            >
                                <FaPrint size={12} /> Print Receipt Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
