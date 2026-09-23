"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import {
    FaArrowLeft,
    FaPlus,
    FaTrash,
    FaSave,
    FaSearch,
    FaSync,
    FaFileInvoice,
    FaBoxes,
    FaRupeeSign,
    FaCheckCircle,
    FaExclamationCircle,
    FaChevronLeft,
    FaChevronRight,
    FaTimes,
    FaCheck,
    FaListUl,
    FaPrint,
    FaUndoAlt,
    FaExclamationTriangle,
    FaRedo,
    FaWarehouse,
} from "react-icons/fa";

interface ReturnItem {
    id: string;
    code: number | string;
    product: string;
    batchNo: string;
    exp: string;
    qty: number;
    rate: number;
    taxP: number;
    disP: number;
    total: number;
}

export default function SalesReturnPage() {
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");

    // Common State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Metrics State
    const [metrics, setMetrics] = useState({
        totalReturnsAmount: 0,
        totalReturnsCount: 0,
        todayReturnsAmount: 0,
        todayReturnsCount: 0,
    });

    // Form State
    const [nextVcn, setNextVcn] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [partyCode, setPartyCode] = useState("");
    const [selectedPartyName, setSelectedPartyName] = useState("");
    const [selectedPartyCity, setSelectedPartyCity] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [originalVcn, setOriginalVcn] = useState("");
    const [reason, setReason] = useState("Damaged Stock");
    const [restockToInventory, setRestockToInventory] = useState(true);
    const [remarks, setRemarks] = useState("");

    // Modal State for Invoice Items Selection
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [fetchingInvoices, setFetchingInvoices] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

    // Print Credit Note Voucher Slip Modal
    const [selectedPrintReturn, setSelectedPrintReturn] = useState<any | null>(null);
    const [lastCreatedReturn, setLastCreatedReturn] = useState<any | null>(null);

    // Line Items for Return Table
    const [items, setItems] = useState<ReturnItem[]>([
        {
            id: "1",
            code: "",
            product: "",
            batchNo: "",
            exp: "",
            qty: 1,
            rate: 0,
            taxP: 12,
            disP: 0,
            total: 0,
        },
    ]);

    // History State
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historySearch, setHistorySearch] = useState("");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);

    // Initial Load
    useEffect(() => {
        fetchNextVcn();
        fetchCustomers();
        fetchProducts();
        fetchMetrics();
    }, []);

    useEffect(() => {
        if (activeTab === "history") {
            fetchHistory();
        }
    }, [activeTab, historyPage, historySearch]);

    const fetchNextVcn = async () => {
        try {
            const res = await fetch("/api/sales/sale-return?action=nextNumber");
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
            const res = await fetch("/api/sales/sale-return?action=metrics");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMetrics({
                        totalReturnsAmount: data.totalReturnsAmount || 0,
                        totalReturnsCount: data.totalReturnsCount || 0,
                        todayReturnsAmount: data.todayReturnsAmount || 0,
                        todayReturnsCount: data.todayReturnsCount || 0,
                    });
                }
            }
        } catch (err) {
            console.error("Failed to fetch return metrics:", err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch("/api/master/customer");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || data.customers || []);
                setCustomers(list);
            }
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/master/product");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || data.products || []);
                setProducts(list);
            }
        } catch (err) {
            console.error("Failed to fetch products:", err);
        }
    };

    const fetchCustomerInvoices = async (code: string) => {
        if (!code) return;
        setFetchingInvoices(true);
        try {
            const res = await fetch(`/api/sales/sale-return?action=customerInvoices&partyCode=${code}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.invoices)) {
                    setCustomerInvoices(data.invoices);
                    if (data.invoices.length > 0) {
                        setSelectedInvoice(data.invoices[0]);
                    } else {
                        setSelectedInvoice(null);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch customer invoices:", err);
        } finally {
            setFetchingInvoices(false);
        }
    };

    const handleCustomerChange = (code: string) => {
        setPartyCode(code);
        const c = customers.find((cust) => String(cust.CODEP || cust.ORDNO || cust.CODE) === String(code));
        const pName = c ? (c.PARNAM || c.NAME || code) : code;
        const pCity = c ? (c.CITY || "") : "";
        setSelectedPartyName(pName);
        setSelectedPartyCity(pCity);

        if (code) {
            fetchCustomerInvoices(code);
            setIsInvoiceModalOpen(true);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: historyPage.toString(),
                limit: "25",
                search: historySearch,
            });
            const res = await fetch(`/api/sales/sale-return?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setHistoryList(data.items || []);
                    setHistoryTotalPages(data.pagination?.totalPages || 1);
                }
            }
        } catch (err) {
            console.error("Failed to fetch return history:", err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate item total
    const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
        const updated = [...items];
        const item = { ...updated[index], [field]: value };

        if (field === "code") {
            const p = products.find((prod) => String(prod.CODE || prod.CODEP) === String(value));
            if (p) {
                item.product = p.PRODUCT || p.NAME;
                item.rate = p.PRATE || p.MRP || 0;
            }
        }

        const qty = Math.max(1, Number(item.qty || 1));
        const rate = Number(item.rate || 0);
        const taxP = Number(item.taxP || 0);
        const disP = Number(item.disP || 0);

        const gross = qty * rate;
        const disAmt = (gross * disP) / 100;
        const taxable = gross - disAmt;
        const taxAmt = (taxable * taxP) / 100;

        item.total = Math.round(taxable + taxAmt);
        updated[index] = item;
        setItems(updated);
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                id: Date.now().toString(),
                code: "",
                product: "",
                batchNo: "",
                exp: "",
                qty: 1,
                rate: 0,
                taxP: 12,
                disP: 0,
                total: 0,
            },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    // Add item from Invoice Popup into Return Table
    const addInvoiceItemToReturn = (invItem: any, vcn: string) => {
        setOriginalVcn(vcn);

        // Smart Product Code resolution against products master
        let matchedCode = String(invItem.code || "");
        const foundProduct = products.find(
            (p) =>
                String(p.CODE || p.CODEP) === matchedCode ||
                (p.PRODUCT || p.NAME || "").toLowerCase().trim() === String(invItem.product || "").toLowerCase().trim()
        );
        if (foundProduct) {
            matchedCode = String(foundProduct.CODE || foundProduct.CODEP);
        }

        const qty = Math.max(1, Number(invItem.qty || 1));
        const rate = Number(invItem.rate || (foundProduct ? foundProduct.PRATE || foundProduct.MRP : 0));
        const taxP = Number(invItem.taxP || 12);
        const disP = Number(invItem.disP || 0);

        const gross = qty * rate;
        const disAmt = (gross * disP) / 100;
        const taxable = gross - disAmt;
        const taxAmt = (taxable * taxP) / 100;
        const itemTotal = Math.round(taxable + taxAmt);

        const newItem: ReturnItem = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            code: matchedCode,
            product: invItem.product || (foundProduct ? foundProduct.PRODUCT || foundProduct.NAME : "Product"),
            batchNo: invItem.batchNo || "N/A",
            exp: invItem.exp || "",
            qty,
            rate,
            taxP,
            disP,
            total: itemTotal,
        };

        if (items.length === 1 && (!items[0].code || !items[0].product)) {
            setItems([newItem]);
        } else {
            setItems([...items, newItem]);
        }

        setIsInvoiceModalOpen(false);
    };

    // Add All Items from selected invoice into Return Table
    const addAllInvoiceItemsToReturn = (invoice: any) => {
        if (!invoice || !invoice.items || invoice.items.length === 0) return;
        setOriginalVcn(invoice.vcn);

        const newItems: ReturnItem[] = invoice.items.map((invItem: any) => {
            let matchedCode = String(invItem.code || "");
            const foundProduct = products.find(
                (p) =>
                    String(p.CODE || p.CODEP) === matchedCode ||
                    (p.PRODUCT || p.NAME || "").toLowerCase().trim() === String(invItem.product || "").toLowerCase().trim()
            );
            if (foundProduct) {
                matchedCode = String(foundProduct.CODE || foundProduct.CODEP);
            }

            const qty = Math.max(1, Number(invItem.qty || 1));
            const rate = Number(invItem.rate || (foundProduct ? foundProduct.PRATE || foundProduct.MRP : 0));
            const taxP = Number(invItem.taxP || 12);
            const disP = Number(invItem.disP || 0);

            const gross = qty * rate;
            const disAmt = (gross * disP) / 100;
            const taxable = gross - disAmt;
            const taxAmt = (taxable * taxP) / 100;
            const itemTotal = Math.round(taxable + taxAmt);

            return {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                code: matchedCode,
                product: invItem.product || (foundProduct ? foundProduct.PRODUCT || foundProduct.NAME : "Product"),
                batchNo: invItem.batchNo || "N/A",
                exp: invItem.exp || "",
                qty,
                rate,
                taxP,
                disP,
                total: itemTotal,
            };
        });

        setItems(newItems);
        setIsInvoiceModalOpen(false);
    };

    // Summary Calculations
    const totalQty = items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
    const totalTaxable = items.reduce((sum, i) => {
        const qty = Number(i.qty || 0);
        const rate = Number(i.rate || 0);
        const disP = Number(i.disP || 0);
        const gross = qty * rate;
        return sum + (gross - (gross * disP) / 100);
    }, 0);
    const totalTax = items.reduce((sum, i) => {
        const qty = Number(i.qty || 0);
        const rate = Number(i.rate || 0);
        const disP = Number(i.disP || 0);
        const taxP = Number(i.taxP || 0);
        const gross = qty * rate;
        const taxable = gross - (gross * disP) / 100;
        return sum + (taxable * taxP) / 100;
    }, 0);
    const netReturnAmount = Math.round(totalTaxable + totalTax);

    // Options for SearchableSelect
    const customerOptions: OptionItem[] = customers.map((c, idx) => {
        const code = String(c.CODEP || c.ORDNO || c.CODE || `cust-${idx}`);
        const name = String(c.PARNAM || c.NAME || c.MAILNAM || code);
        return {
            value: code,
            label: name,
            subLabel: `#${code}${c.CITY ? ` • ${c.CITY}` : ""}`,
        };
    });

    const productOptions: OptionItem[] = products.map((p, idx) => {
        const pCode = String(p.CODE || p.CODEP || `prod-${idx}`);
        const pName = String(p.PRODUCT || p.NAME || pCode);
        return {
            value: pCode,
            label: pName,
            subLabel: `#${pCode}`,
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

        const validItems = items.filter((i) => i.code || i.product);
        if (validItems.length === 0) {
            setErrorMsg("Please add at least one valid product for return");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                partyCode,
                date,
                originalVcn,
                reason,
                restockToInventory,
                remarks: `${remarks}${restockToInventory ? " [Stock Restocked]" : " [No Restock]"}`,
                items: validItems,
            };

            const res = await fetch("/api/sales/sale-return", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                const printData = {
                    vcn: json.vcn,
                    date,
                    partyCode,
                    partyName: selectedPartyName || partyCode,
                    city: selectedPartyCity,
                    originalVcn,
                    reason,
                    remarks,
                    items: validItems,
                    totalTaxable,
                    totalTax,
                    netReturnAmount,
                };

                setSuccessMsg(`Sales Return #${json.vcn} created successfully! Inventory updated & Credit Note posted.`);
                setSelectedPrintReturn(printData);
                setLastCreatedReturn(printData);

                // Reset form
                setPartyCode("");
                setSelectedPartyName("");
                setSelectedPartyCity("");
                setOriginalVcn("");
                setRemarks("");
                setItems([
                    {
                        id: "1",
                        code: "",
                        product: "",
                        batchNo: "",
                        exp: "",
                        qty: 1,
                        rate: 0,
                        taxP: 12,
                        disP: 0,
                        total: 0,
                    },
                ]);
                fetchNextVcn();
                fetchMetrics();
            } else {
                setErrorMsg(json.error || "Failed to create sales return");
            }
        } catch (err: any) {
            console.error("Sales return creation error:", err);
            setErrorMsg("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid p-3 sm:p-6 space-y-4 ">
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
                                Sales Return (Credit Note Entry)
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                Enterprise Return Mode
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Select customer, import sale invoices, restock product batches, and issue official Credit Notes.
                        </p>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "new"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <FaPlus size={11} /> New Credit Note
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "history"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <FaUndoAlt size={11} /> Return History
                    </button>
                </div>
            </div>

            {/* MARG EXECUTIVE SUMMARY KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total System Returns */}
                <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            Total Credit Notes Issued
                        </span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{metrics.totalReturnsAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {metrics.totalReturnsCount} Return Vouchers Total
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                        <FaUndoAlt size={18} />
                    </div>
                </div>

                {/* Today's Return Value */}
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                            Today's Returns
                        </span>
                        <span className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono">
                            ₹{metrics.todayReturnsAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {metrics.todayReturnsCount} Vouchers Issued Today
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <FaExclamationTriangle size={18} />
                    </div>
                </div>

                {/* Restock Inventory Status */}
                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Inventory Action
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                            {restockToInventory ? "Auto Restock Active" : "Damaged Bucket"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Batch Balance + Qty Added
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FaWarehouse size={18} />
                    </div>
                </div>

                {/* Next Voucher Series Preview */}
                <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                            Return VCN Series
                        </span>
                        <span className="text-xl font-bold text-purple-700 dark:text-purple-400 font-mono">
                            {nextVcn || "RET-XXXXX"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Auto Series Counter
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <FaFileInvoice size={18} />
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
                    {(selectedPrintReturn || lastCreatedReturn) && (
                        <button
                            type="button"
                            onClick={() => setSelectedPrintReturn(selectedPrintReturn || lastCreatedReturn)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition"
                        >
                            <FaPrint size={11} /> Print Credit Note Slip
                        </button>
                    )}
                </div>
            )}

            {/* TAB 1: NEW SALES RETURN */}
            {activeTab === "new" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Header Details Form Card */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Sales Return Header Details
                            </span>
                            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                                Return VCN: {nextVcn || "RET-XXXXX"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* Party / Customer Selector */}
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

                            {/* Return Date */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Return Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/40 text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Original Invoice VCN Button / Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Original Invoice VCN</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="e.g. INV-00125"
                                        value={originalVcn}
                                        onChange={(e) => setOriginalVcn(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/40 text-slate-900 dark:text-white font-mono"
                                    />
                                    {partyCode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                fetchCustomerInvoices(partyCode);
                                                setIsInvoiceModalOpen(true);
                                            }}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex-shrink-0"
                                            title="Pick Invoices & Items"
                                        >
                                            Pick Invoices
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Return Reason */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Return Reason</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/40 text-slate-900 dark:text-white"
                                >
                                    <option value="Damaged Stock">Damaged Stock</option>
                                    <option value="Near Expiry / Expired">Near Expiry / Expired</option>
                                    <option value="Customer Cancellation">Customer Cancellation</option>
                                    <option value="Excess Quantity">Excess Quantity</option>
                                    <option value="Quality Issue">Quality Issue</option>
                                </select>
                            </div>
                        </div>

                        {/* Restock Inventory Toggle Card */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <FaWarehouse className="text-emerald-500" size={15} />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block">
                                        Restock Product Batches in Inventory
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        When enabled, returned product quantities will be added back into ProductBatch balance.
                                    </span>
                                </div>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={restockToInventory}
                                    onChange={(e) => setRestockToInventory(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:peer-focus:ring-emerald-800 peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Return Item Table Card */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <FaBoxes className="text-rose-500" /> Returned Products Grid
                            </span>
                            <div className="flex items-center gap-2">
                                {partyCode && (
                                    <button
                                        type="button"
                                        onClick={() => setIsInvoiceModalOpen(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-xs transition"
                                    >
                                        <FaListUl size={10} /> Browse Sale Invoices & Select Items
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                                >
                                    <FaPlus size={10} /> Add Empty Row
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="p-2.5 min-w-[200px]">Product</th>
                                        <th className="p-2.5 min-w-[110px]">Batch No</th>
                                        <th className="p-2.5 w-20 text-center">Return Qty</th>
                                        <th className="p-2.5 w-24 text-right">Rate (₹)</th>
                                        <th className="p-2.5 w-20 text-right">Tax %</th>
                                        <th className="p-2.5 w-20 text-right">Dis %</th>
                                        <th className="p-2.5 w-28 text-right">Total (₹)</th>
                                        <th className="p-2.5 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                    {items.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            {/* Product Selector */}
                                            <td className="p-2">
                                                {products.length > 0 ? (
                                                    <SearchableSelect
                                                        options={productOptions}
                                                        value={String(item.code || "")}
                                                        onChange={(val) => updateItem(idx, "code", val)}
                                                        placeholder="Type or select product..."
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        placeholder="Product Name"
                                                        value={item.product ?? ""}
                                                        onChange={(e) => updateItem(idx, "product", e.target.value)}
                                                        className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                                    />
                                                )}
                                            </td>

                                            {/* Batch No */}
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Batch No"
                                                    value={item.batchNo ?? ""}
                                                    onChange={(e) => updateItem(idx, "batchNo", e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                                />
                                            </td>

                                            {/* Return Qty */}
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.qty ?? 1}
                                                    onChange={(e) => updateItem(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-full px-2 py-1.5 text-xs text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                                                />
                                            </td>

                                            {/* Rate */}
                                            <td className="p-2 text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.rate ?? 0}
                                                    onChange={(e) => updateItem(idx, "rate", parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 text-xs text-right rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                                />
                                            </td>

                                            {/* Tax % */}
                                            <td className="p-2 text-right">
                                                <input
                                                    type="number"
                                                    value={item.taxP ?? 0}
                                                    onChange={(e) => updateItem(idx, "taxP", parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 text-xs text-right rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                                />
                                            </td>

                                            {/* Discount % */}
                                            <td className="p-2 text-right">
                                                <input
                                                    type="number"
                                                    value={item.disP ?? 0}
                                                    onChange={(e) => updateItem(idx, "disP", parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 text-xs text-right rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                                                />
                                            </td>

                                            {/* Total */}
                                            <td className="p-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                ₹{item.total.toLocaleString("en-IN")}
                                            </td>

                                            {/* Delete Action */}
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Summary & Actions */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div>
                                <span className="text-slate-500">Total Items:</span>{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{items.length}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Total Return Qty:</span>{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{totalQty}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Taxable:</span>{" "}
                                <span className="font-bold text-slate-900 dark:text-white">₹{Math.round(totalTaxable).toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Tax GST:</span>{" "}
                                <span className="font-bold text-slate-900 dark:text-white">₹{Math.round(totalTax).toLocaleString("en-IN")}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                            <div>
                                <span className="text-xs text-slate-500 block">Net Credit Note Amount</span>
                                <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                                    ₹{netReturnAmount.toLocaleString("en-IN")}
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md hover:from-rose-500 hover:to-red-500 disabled:opacity-50 transition cursor-pointer"
                            >
                                <FaSave size={13} />
                                {submitting ? "Saving Sales Return..." : "Save Sales Return"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* TAB 2: RETURN HISTORY LIST */}
            {activeTab === "history" && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search return VCN, customer code, remarks..."
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
                            <FaSync className={loading ? "animate-spin text-rose-500" : ""} size={13} />
                        </button>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-3">Return VCN</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Customer Party</th>
                                    <th className="p-3">Reason / Remarks</th>
                                    <th className="p-3 text-right">Return Amount (₹)</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Print</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            <FaSync size={18} className="animate-spin text-rose-500 mx-auto mb-2" />
                                            Loading Sales Return history...
                                        </td>
                                    </tr>
                                ) : historyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No sales return vouchers found.
                                        </td>
                                    </tr>
                                ) : (
                                    historyList.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                                                {row.vcn}
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">
                                                {row.date}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                                {row.partyName}
                                                <span className="text-[10px] text-slate-400 block font-normal">
                                                    #{row.partyCode}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">
                                                {row.remarks || "—"}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                ₹{Number(row.amount || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => setSelectedPrintReturn(row)}
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="Print Credit Note"
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

            {/* POPUP MODAL 1: SELECT INVOICES & RETURN ITEMS */}
            {isInvoiceModalOpen && (
                <div
                    className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsInvoiceModalOpen(false);
                    }}
                >
                    <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
                                    <FaFileInvoice size={16} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Select Sale Invoice & Return Items
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Customer: <span className="font-semibold text-rose-600 dark:text-rose-400">{selectedPartyName || partyCode}</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsInvoiceModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Modal Content - 2 Panels */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[350px]">
                            {/* Left Panel: Sale Invoices List */}
                            <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/30 p-2 sm:p-3 space-y-2 flex-shrink-0">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                    Customer Sale Invoices ({customerInvoices.length})
                                </span>

                                {fetchingInvoices ? (
                                    <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center">
                                        <FaSync className="animate-spin text-rose-500 mb-2" size={16} />
                                        Fetching invoices...
                                    </div>
                                ) : customerInvoices.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        No past sale invoices found for this customer.
                                    </div>
                                ) : (
                                    customerInvoices.map((inv) => {
                                        const isSelected = selectedInvoice?.vcn === inv.vcn;
                                        return (
                                            <div
                                                key={inv.vcn}
                                                onClick={() => setSelectedInvoice(inv)}
                                                className={`p-3 rounded-xl border transition cursor-pointer ${isSelected
                                                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 shadow-xs"
                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/80 dark:hover:bg-slate-700/60"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                                                        #{inv.vcn}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {inv.date}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between mt-1.5 text-xs">
                                                    <span className="text-slate-500">{inv.itemsCount} Items</span>
                                                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                                                        ₹{inv.finalAmount.toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Right Panel: Invoice Items Breakdown */}
                            <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 bg-white dark:bg-slate-900">
                                {selectedInvoice ? (
                                    <>
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    Items in Invoice #{selectedInvoice.vcn}
                                                </span>
                                                <span className="text-[11px] text-slate-400 block">
                                                    Click any item to add to return list, or import all items.
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => addAllInvoiceItemsToReturn(selectedInvoice)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs hover:from-rose-500 hover:to-red-500 transition"
                                            >
                                                <FaCheck size={11} /> Import All Items
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pt-3 space-y-2">
                                            {selectedInvoice.items.length === 0 ? (
                                                <div className="py-8 text-center text-xs text-slate-400">
                                                    No item details available in this invoice.
                                                </div>
                                            ) : (
                                                selectedInvoice.items.map((invItem: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-rose-300 dark:hover:border-rose-800 transition flex items-center justify-between gap-3"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                                                    {invItem.product}
                                                                </span>
                                                                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">
                                                                    Batch: {invItem.batchNo}
                                                                </span>
                                                                {invItem.exp && (
                                                                    <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                                                        Exp: {invItem.exp}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5 font-mono">
                                                                <span>Qty: <strong className="text-slate-800 dark:text-slate-200 font-bold">{invItem.qty}</strong></span>
                                                                <span>Rate: <strong className="text-slate-800 dark:text-slate-200 font-bold">₹{invItem.rate}</strong></span>
                                                                <span>Tax: <strong className="text-slate-800 dark:text-slate-200">{invItem.taxP}%</strong></span>
                                                                <span>Dis: <strong className="text-slate-800 dark:text-slate-200">{invItem.disP}%</strong></span>
                                                                <span>Total: <strong className="text-rose-600 dark:text-rose-400 font-bold">₹{invItem.total}</strong></span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => addInvoiceItemToReturn(invItem, selectedInvoice.vcn)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 flex-shrink-0 transition"
                                                        >
                                                            + Add to Return
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                                        <FaFileInvoice size={28} className="mb-2 text-slate-300 dark:text-slate-700" />
                                        Select a sale invoice from the left panel to preview its line items.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* POPUP MODAL 2: MARG PRINTABLE CREDIT NOTE SLIP MODAL */}
            {selectedPrintReturn && (
                <div
                    className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedPrintReturn(null);
                    }}
                >
                    <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-rose-800">
                                    MAABSOL PHARMA CRM
                                </h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                                    Official Credit Note Voucher Slip
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold font-mono text-rose-600 block">
                                    #{selectedPrintReturn.vcn}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    Date: {selectedPrintReturn.date}
                                </span>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="grid grid-cols-2 gap-4 text-xs p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                                <span className="text-slate-400 block uppercase font-bold text-[10px]">Customer / Party</span>
                                <span className="font-bold text-sm text-slate-900 block mt-0.5">{selectedPrintReturn.partyName}</span>
                                <span className="text-slate-500 font-mono">Party Code: #{selectedPrintReturn.partyCode}</span>
                                {selectedPrintReturn.city && <span className="text-slate-500 block">City: {selectedPrintReturn.city}</span>}
                            </div>
                            <div className="text-right space-y-1">
                                <div>
                                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Original Sale Invoice</span>
                                    <span className="font-mono font-bold text-slate-900">{selectedPrintReturn.originalVcn || "N/A"}</span>
                                </div>
                                {selectedPrintReturn.reason && (
                                    <div>
                                        <span className="text-slate-400 block uppercase font-bold text-[10px]">Return Reason</span>
                                        <span className="font-semibold text-rose-600">{selectedPrintReturn.reason}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        {selectedPrintReturn.items && selectedPrintReturn.items.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase text-slate-500">Returned Items List</span>
                                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                            <tr>
                                                <th className="p-2">Product Name</th>
                                                <th className="p-2 font-mono">Batch</th>
                                                <th className="p-2 text-center font-mono">Qty</th>
                                                <th className="p-2 text-right font-mono">Rate (₹)</th>
                                                <th className="p-2 text-right font-mono">Total (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedPrintReturn.items.map((item: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="p-2 font-semibold">{item.product}</td>
                                                    <td className="p-2 font-mono">{item.batchNo || "N/A"}</td>
                                                    <td className="p-2 text-center font-mono font-bold">{item.qty}</td>
                                                    <td className="p-2 text-right font-mono">₹{item.rate}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-rose-700">
                                                        ₹{Number(item.total).toLocaleString("en-IN")}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Total Net Credit Note Display */}
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Net Credit Note Amount</span>
                            <span className="text-2xl font-bold font-mono text-rose-700">
                                ₹{Number(selectedPrintReturn.netReturnAmount || selectedPrintReturn.amount || 0).toLocaleString("en-IN")}
                            </span>
                        </div>

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
                                onClick={() => setSelectedPrintReturn(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition shadow-md"
                            >
                                <FaPrint size={12} /> Print Credit Note Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
