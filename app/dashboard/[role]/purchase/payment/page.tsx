"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import SupplierHistoryPanel from "@/components/purchase/SupplierHistoryPanel";
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
  FaBuilding,
  FaFileCsv,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaShoppingBag,
  FaTruck,
  FaUndoAlt,
} from "react-icons/fa";

interface PendingBill {
  _id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  settledAmount: number;
  selected: boolean;
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
  gst: string;
  phone: string;
  city: string;
  address: string;
}

function PurchasePaymentContent() {
  const searchParams = useSearchParams();
  const urlVendorId = searchParams.get("vendorId");
  const urlVendorName = searchParams.get("vendorName");
  const urlBillId = searchParams.get("billId");

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
    totalPaymentsAmount: 0,
    totalPaymentsCount: 0,
    todayPaymentsAmount: 0,
    todayPaymentsCount: 0,
    totalPendingPayable: 0,
    pendingBillsCount: 0,
  });

  // Form State
  const [nextVcn, setNextVcn] = useState("");
  const [vcnCustom, setVcnCustom] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorCity, setVendorCity] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Payment Form Fields
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState<"Bank Transfer" | "Cash" | "UPI" | "Cheque" | "Draft">("Bank Transfer");
  const [refNo, setRefNo] = useState("");
  const [bankName, setBankName] = useState("HDFC Current Bank A/C");
  const [discountReceived, setDiscountReceived] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");

  // Bills State
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [fetchingBills, setFetchingBills] = useState(false);

  // Print Voucher Modal
  const [selectedPrintVoucher, setSelectedPrintVoucher] = useState<any | null>(null);
  const [lastCreatedVoucher, setLastCreatedVoucher] = useState<any | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch Vendor Pending Bills
  const fetchVendorBills = useCallback(async (vId: string, vName: string) => {
    if (!vId && !vName) {
      setPendingBills([]);
      return;
    }
    setFetchingBills(true);
    try {
      const params = new URLSearchParams();
      if (vId) params.set("vendorId", vId);
      if (vName) params.set("vendorName", vName);

      const res = await fetch(`/api/purchase/payment?action=vendorBills&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list: PendingBill[] = (data.bills || []).map((b: any) => ({
            _id: b._id,
            billNumber: b.billNumber,
            billDate: b.billDate,
            dueDate: b.dueDate,
            netAmount: b.netAmount,
            paidAmount: b.paidAmount,
            balanceAmount: b.balanceAmount,
            settledAmount: 0,
            selected: urlBillId ? b._id === urlBillId : false,
          }));
          setPendingBills(list);

          if (urlBillId) {
            const target = list.find((b) => b._id === urlBillId);
            if (target) {
              target.settledAmount = target.balanceAmount;
              setPaymentAmount(target.balanceAmount);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch vendor pending bills:", err);
    } finally {
      setFetchingBills(false);
    }
  }, [urlBillId]);

  const fetchNextVcn = async () => {
    try {
      const res = await fetch("/api/purchase/payment?action=nextNumber");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.nextVcn) {
          setNextVcn(data.nextVcn);
          setVcnCustom(data.nextVcn);
        }
      }
    } catch (err) {
      console.error("Failed to fetch next VCN:", err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/purchase/payment?action=metrics");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics({
            totalPaymentsAmount: data.totalPaymentsAmount || 0,
            totalPaymentsCount: data.totalPaymentsCount || 0,
            todayPaymentsAmount: data.todayPaymentsAmount || 0,
            todayPaymentsCount: data.todayPaymentsCount || 0,
            totalPendingPayable: data.totalPendingPayable || 0,
            pendingBillsCount: data.pendingBillsCount || 0,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch payment metrics:", err);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const params = new URLSearchParams();
      params.set("suppliersOnly", "true");
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);

      const res = await fetch(`/api/purchase/master-options?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSuppliers(json.suppliers || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [selectedCompany?._id, selectedFY?._id]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: historyPage.toString(),
        limit: "15",
        search: historySearch,
      });
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      if (selectedFY?.fyCode) params.set("fyCode", selectedFY.fyCode);

      const res = await fetch(`/api/purchase/payment?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistoryList(data.payments || []);
          setHistoryTotalPages(data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
    } finally {
      setLoading(false);
    }
  }, [historyPage, historySearch, selectedCompany?._id, selectedFY?._id, selectedFY?.fyCode]);

  // Initial Data Load
  useEffect(() => {
    fetchNextVcn();
    fetchSuppliers();
    fetchMetrics();
  }, [fetchSuppliers, selectedCompany?._id, selectedFY?._id]);

  // Auto-Select Vendor if vendorName or vendorId is passed in URL
  useEffect(() => {
    if (suppliers.length > 0 && (urlVendorName || urlVendorId)) {
      const supp = suppliers.find((s) => s.id === urlVendorId || s.name.toLowerCase() === (urlVendorName || "").toLowerCase());
      if (supp) {
        setVendorId(supp.id);
        setVendorCode(supp.code);
        setVendorName(supp.name);
        setVendorGst(supp.gst);
        setVendorPhone(supp.phone);
        setVendorCity(supp.city);
        fetchVendorBills(supp.id, supp.name);
      } else if (urlVendorName) {
        setVendorName(urlVendorName);
        fetchVendorBills("", urlVendorName);
      }
    }
  }, [suppliers, urlVendorId, urlVendorName, fetchVendorBills]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Supplier SearchableSelect options
  const supplierOptions: OptionItem[] = suppliers.map((s) => ({
    value: s.id || s.code || s.name,
    label: s.name,
    subLabel: `${s.code ? `#${s.code}` : ""}${s.city ? ` • ${s.city}` : ""}`,
  }));

  const handleSupplierSelect = (idOrCode: string) => {
    const supp = suppliers.find((s) => s.id === idOrCode || s.code === idOrCode || s.name === idOrCode);
    if (supp) {
      setVendorId(supp.id);
      setVendorCode(supp.code);
      setVendorName(supp.name);
      setVendorGst(supp.gst);
      setVendorPhone(supp.phone);
      setVendorCity(supp.city);
      fetchVendorBills(supp.id, supp.name);
    } else {
      setVendorId("");
      setVendorCode("");
      setVendorName("");
      setVendorGst("");
      setVendorPhone("");
      setVendorCity("");
      setPendingBills([]);
    }
  };

  // Auto Allocate Payment across pending bills
  const handleAutoAllocate = () => {
    const totalAmount = Number(paymentAmount) || 0;
    if (totalAmount <= 0) {
      setErrorMsg("Please enter a valid payment amount first to auto-allocate.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    let remainingToAllocate = totalAmount;
    const updated = pendingBills.map((bill) => {
      if (remainingToAllocate <= 0) {
        return { ...bill, settledAmount: 0, selected: false };
      }

      const allocate = Math.min(bill.balanceAmount, remainingToAllocate);
      remainingToAllocate -= allocate;

      return {
        ...bill,
        settledAmount: Math.round(allocate * 100) / 100,
        selected: allocate > 0,
      };
    });

    setPendingBills(updated);
  };

  const handleBillSelectToggle = (index: number) => {
    const updated = [...pendingBills];
    const item = updated[index];
    item.selected = !item.selected;
    if (item.selected) {
      item.settledAmount = item.balanceAmount;
    } else {
      item.settledAmount = 0;
    }
    setPendingBills(updated);

    const sum = updated.reduce((s, b) => s + (b.selected ? b.settledAmount : 0), 0);
    setPaymentAmount(sum > 0 ? sum : "");
  };

  const handleBillSettledAmountChange = (index: number, val: number) => {
    const updated = [...pendingBills];
    const item = updated[index];
    const amt = Math.min(item.balanceAmount, Math.max(0, val));
    item.settledAmount = amt;
    item.selected = amt > 0;
    setPendingBills(updated);

    const sum = updated.reduce((s, b) => s + b.settledAmount, 0);
    setPaymentAmount(sum > 0 ? sum : "");
  };

  // Calculated Totals
  const totalSettledInBills = pendingBills.reduce((s, b) => s + (b.settledAmount || 0), 0);
  const totalVendorPendingBalance = pendingBills.reduce((s, b) => s + (b.balanceAmount || 0), 0);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName) {
      setErrorMsg("Please select a Supplier/Vendor.");
      return;
    }

    const payAmt = Number(paymentAmount) || 0;
    if (payAmt <= 0) {
      setErrorMsg("Payment amount must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const settledBillsPayload = pendingBills
        .filter((b) => b.settledAmount > 0)
        .map((b) => ({
          billId: b._id,
          billNumber: b.billNumber,
          settledAmount: b.settledAmount,
        }));

      const payload = {
        voucherNo: vcnCustom || nextVcn,
        paymentDate,
        companyId: selectedCompany?._id || "",
        companyCode: selectedCompany?.companyCode || "",
        fyId: selectedFY?._id || "",
        fyCode: selectedFY?.fyCode || selectedFY?.fyName || "",
        vendorId,
        vendorCode,
        vendorName,
        vendorGst,
        vendorPhone,
        vendorCity,
        amount: payAmt,
        paymentMode,
        refNo,
        bankName,
        discountReceived: Number(discountReceived) || 0,
        settledBills: settledBillsPayload,
        remarks,
      };

      const res = await fetch("/api/purchase/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Payment Voucher ${data.paymentVoucher.voucherNo} created successfully!`);
        setLastCreatedVoucher(data.paymentVoucher);
        fetchNextVcn();
        fetchMetrics();

        // Reset form
        setVendorId("");
        setVendorCode("");
        setVendorName("");
        setVendorGst("");
        setVendorPhone("");
        setVendorCity("");
        setPaymentAmount("");
        setRefNo("");
        setBankName("HDFC Current Bank A/C");
        setDiscountReceived("");
        setRemarks("");
        setPendingBills([]);
      } else {
        setErrorMsg(data.message || "Failed to create Payment Voucher.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Voucher Handler
  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Payment Voucher? Settled bill balances will be restored.")) return;
    try {
      const res = await fetch(`/api/purchase/payment?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Payment Voucher deleted and bill balances restored.");
        fetchHistory();
        fetchMetrics();
      }
    } catch (err) {
      console.error("Delete Voucher Error:", err);
    }
  };

  const toggleRowExpand = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (historyList.length === 0) return;
    const headers = ["Voucher #", "Date", "Vendor Name", "Mode", "Ref #", "Bank Name", "Discount Rec (₹)", "Amount (₹)", "Status"];
    const csvRows = historyList.map((r) => [
      `"${r.voucherNo || ""}"`,
      `"${r.paymentDate || ""}"`,
      `"${r.vendorName || ""}"`,
      `"${r.paymentMode || ""}"`,
      `"${r.refNo || ""}"`,
      `"${r.bankName || ""}"`,
      r.discountReceived || 0,
      r.amount || 0,
      `"${r.status || "Approved"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20">
            <FaHandHoldingUsd />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Link href="/dashboard/purchase" className="hover:underline">Purchase</Link>
              <span>/</span>
              <span>Payment Entry & Vouchers</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Supplier Payment Entry</h1>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "new"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FaPlus className="text-xs" />
            <span>New Payment Voucher</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "history"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FaReceipt className="text-xs" />
            <span>Payment History</span>
          </button>
        </div>
      </div>

      {/* Interlinking Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link
          href="/dashboard/purchase/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaShoppingBag className="text-amber-500" /> Dashboard
        </Link>
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-amber-500" /> Invoices List
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaTruck className="text-indigo-500" /> Orders
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-rose-500" /> Outstanding
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white shadow-xs font-bold"
        >
          <FaReceipt /> Payment Entry
        </Link>
        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaUndoAlt className="text-orange-500" /> Return (Debit Note)
        </Link>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Payments Made</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{metrics.totalPaymentsAmount.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{metrics.totalPaymentsCount} Payment Vouchers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FaMoneyBillWave />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Today's Payments</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{metrics.todayPaymentsAmount.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{metrics.todayPaymentsCount} Paid Today</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FaReceipt />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Creditors Balance</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{metrics.totalPendingPayable.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 font-medium">{metrics.pendingBillsCount} Invoices Due</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
            <FaFileInvoiceDollar />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Payment VCN</p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{vcnCustom || nextVcn || "PAY-1001"}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto / Custom Series</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FaCheckCircle />
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaExclamationCircle className="text-lg shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:opacity-75">
            <FaTimes />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-lg shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <div className="flex items-center gap-3">
            {lastCreatedVoucher && (
              <button
                onClick={() => setSelectedPrintVoucher(lastCreatedVoucher)}
                className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition"
              >
                <FaPrint /> Print Voucher Slip
              </button>
            )}
            <button onClick={() => setSuccessMsg("")} className="hover:opacity-75">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: NEW PAYMENT ENTRY FORM */}
      {activeTab === "new" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header & Supplier Selection */}
          <div className="bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FaBuilding className="text-emerald-600" /> Supplier & Payment Voucher Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Voucher VCN *
                </label>
                <input
                  type="text"
                  value={vcnCustom}
                  onChange={(e) => setVcnCustom(e.target.value)}
                  placeholder="PAY-1001"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-extrabold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Supplier (Sundry Creditor) *
                </label>
                <SearchableSelect
                  options={supplierOptions}
                  value={vendorId || vendorCode}
                  onChange={handleSupplierSelect}
                  placeholder={loadingSuppliers ? "Loading Suppliers..." : "Type or search vendor..."}
                  loading={loadingSuppliers}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Vendor Name (Auto-filled) *
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor Name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e: any) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                  <option value="Cash">Cash Payment</option>
                  <option value="Draft">Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bank Account / Cash Source
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="HDFC Current Bank A/C">HDFC Current Bank A/C (..8920)</option>
                  <option value="ICICI Corporate Bank">ICICI Corporate Bank (..1044)</option>
                  <option value="SBI Current A/C">SBI Current A/C (..5512)</option>
                  <option value="Petty Cash Account">Petty Cash Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Ref / UTR / Cheque No
                </label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="UTR / Ref Number"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Discount Received / CD (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discountReceived}
                  onChange={(e) => setDiscountReceived(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* SUPPLIER HISTORY PANEL */}
          {vendorName && (
            <SupplierHistoryPanel
              vendorName={vendorName}
              vendorCode={vendorCode}
              vendorId={vendorId}
            />
          )}

          {/* PENDING INVOICES SETTLEMENT SECTION */}
          {vendorName && (
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaFileInvoiceDollar className="text-emerald-600" /> Pending Invoices For <span className="text-emerald-600">{vendorName}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total Supplier Pending Balance: <strong className="text-rose-600">₹{totalVendorPendingBalance.toLocaleString("en-IN")}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Payment Amount"
                      value={paymentAmount}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setPaymentAmount(val);
                        const totalAmt = Number(val) || 0;
                        if (totalAmt > 0 && pendingBills.length > 0) {
                          let remaining = totalAmt;
                          setPendingBills((prev) =>
                            prev.map((bill) => {
                              if (remaining <= 0) {
                                return { ...bill, settledAmount: 0, selected: false };
                              }
                              const allocate = Math.min(bill.balanceAmount, remaining);
                              remaining -= allocate;
                              return {
                                ...bill,
                                settledAmount: Math.round(allocate * 100) / 100,
                                selected: allocate > 0,
                              };
                            })
                          );
                        }
                      }}
                      className="pl-7 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoAllocate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <FaMagic /> Auto-Allocate
                  </button>
                </div>
              </div>

              {fetchingBills ? (
                <div className="py-8 text-center text-xs text-slate-400">Fetching pending invoices for {vendorName}...</div>
              ) : pendingBills.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase text-slate-500">
                        <th className="p-3 text-center w-10">Settle</th>
                        <th className="p-3">Bill Number</th>
                        <th className="p-3">Bill Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Net Amount (₹)</th>
                        <th className="p-3 text-right">Balance Due (₹)</th>
                        <th className="p-3 text-right w-36">Settling Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pendingBills.map((b, idx) => (
                        <tr key={b._id} className={b.selected ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={b.selected}
                              onChange={() => handleBillSelectToggle(idx)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-extrabold text-slate-900 dark:text-white">{b.billNumber}</td>
                          <td className="p-3 text-slate-500">{b.billDate || "N/A"}</td>
                          <td className="p-3 text-slate-500">{b.dueDate || "N/A"}</td>
                          <td className="p-3 text-right font-bold">₹{b.netAmount.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right font-black text-rose-600">₹{b.balanceAmount.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={b.settledAmount || ""}
                              onChange={(e) => handleBillSettledAmountChange(idx, Number(e.target.value))}
                              disabled={!b.selected}
                              className="w-full px-2 py-1 text-right font-bold rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No pending invoices found for this vendor. Payment will be saved as an advance credit voucher.
                </div>
              )}
            </div>
          )}

          {/* Financial Summary & Save */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Payment Voucher Remarks / Notes
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter cheque details, bank reference, or payment remarks..."
                className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-xl space-y-3 border border-emerald-500">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-100">Payment Voucher Summary</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-emerald-100">
                  <span>Payment Amount:</span>
                  <span>₹{Number(paymentAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-100">
                  <span>Discount Received:</span>
                  <span>₹{Number(discountReceived || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-100">
                  <span>Allocated To Invoices:</span>
                  <span>₹{totalSettledInBills.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-emerald-400/40 pt-2 flex justify-between items-center">
                  <span className="text-base font-black">Total Paid Amount:</span>
                  <span className="text-2xl font-black text-white">₹{Number(paymentAmount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
              >
                <FaSave /> {submitting ? "Saving Voucher..." : "Save Payment Voucher"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PAYMENT HISTORY REGISTER */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search Voucher #, Supplier, Ref UTR, Bank..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <FaFileCsv /> Export CSV
              </button>
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <FaSync className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Payment History...</div>
          ) : historyList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-3">Voucher #</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Ref / UTR No</th>
                    <th className="p-3 text-right">Discount (₹)</th>
                    <th className="p-3 text-right">Amount Paid (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyList.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{r.voucherNo}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{r.paymentDate}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{r.vendorName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 font-semibold rounded-lg text-[10px]">
                          {r.paymentMode || "Bank Transfer"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{r.refNo || "N/A"}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">₹{(r.discountReceived || 0).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                        ₹{(r.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-full text-[10px]">
                          {r.status || "Approved"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPrintVoucher(r)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition text-[11px]"
                            title="Print Voucher Slip"
                          >
                            <FaPrint />
                          </button>
                          <button
                            onClick={() => handleDeleteVoucher(r._id)}
                            className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition text-[11px]"
                            title="Delete Payment Voucher"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">No payment vouchers found.</div>
          )}
        </div>
      )}

      {/* PRINTABLE PAYMENT VOUCHER SLIP MODAL */}
      {selectedPrintVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaReceipt className="text-emerald-500" /> Payment Receipt Voucher #{selectedPrintVoucher.voucherNo}
                </h3>
                <p className="text-xs text-slate-500">Date: {selectedPrintVoucher.paymentDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <FaPrint /> Print Slip
                </button>
                <button onClick={() => setSelectedPrintVoucher(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-emerald-600">{selectedCompany?.companyName || "PHARMA DISTRIBUTORS"}</h2>
                  <p className="text-[11px] text-slate-500">GSTIN: {selectedCompany?.gstNo || "N/A"}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black uppercase">
                    PAYMENT RECEIPT
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Voucher #: {selectedPrintVoucher.voucherNo}</p>
                  <p className="text-[11px] text-slate-500">Date: {selectedPrintVoucher.paymentDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid To Vendor / Supplier</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedPrintVoucher.vendorName}</p>
                  <p className="text-slate-500">GSTIN: {selectedPrintVoucher.vendorGst || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Transaction Mode</span>
                  <p className="text-slate-700 dark:text-slate-300">Mode: <span className="font-bold text-emerald-600">{selectedPrintVoucher.paymentMode || "Bank Transfer"}</span></p>
                  <p className="text-slate-700 dark:text-slate-300">Ref / UTR: <span className="font-mono font-bold">{selectedPrintVoucher.refNo || "N/A"}</span></p>
                  <p className="text-slate-700 dark:text-slate-300">Bank: <span className="font-bold">{selectedPrintVoucher.bankName || "N/A"}</span></p>
                </div>
              </div>

              {selectedPrintVoucher.settledBills && selectedPrintVoucher.settledBills.length > 0 && (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">Settled Invoices Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border-b">
                          <th className="p-2">Invoice Number</th>
                          <th className="p-2 text-right">Settled Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {selectedPrintVoucher.settledBills.map((b: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium text-slate-900 dark:text-white">{b.billNumber}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">₹{Number(b.settledAmount || 0).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-3 text-xs border-t">
                <div className="w-64 space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount Received:</span>
                    <span className="font-semibold text-emerald-600">₹{(selectedPrintVoucher.discountReceived || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-black text-sm">
                    <span>Total Amount Paid:</span>
                    <span className="text-emerald-600">₹{(selectedPrintVoucher.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t print:hidden">
              <button
                onClick={() => setSelectedPrintVoucher(null)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
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

export default function PurchasePaymentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading payment page...</div>}>
      <PurchasePaymentContent />
    </Suspense>
  );
}
