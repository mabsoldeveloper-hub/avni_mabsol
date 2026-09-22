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
  FaBuilding,
  FaPhoneAlt,
  FaIdCard,
  FaFileCsv,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaSlidersH,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaReceipt,
  FaDownload,
} from "react-icons/fa";

interface ReturnItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  hsnCode: string;
  batchNo: string;
  expDate: string;
  qty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
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

interface ProductOption {
  id: string;
  code: string;
  name: string;
  hsn: string;
  purchaseRate: number;
  mrp: number;
  gstPercent: number;
  unit: string;
}

// Column Visibility State
interface ColumnConfig {
  hsn: boolean;
  batch: boolean;
  expDate: boolean;
  rate: boolean;
  qty: boolean;
  tradeDisc: boolean;
  gst: boolean;
  taxableAmt: boolean;
  gstAmt: boolean;
}

function PurchaseReturnContent() {
  const searchParams = useSearchParams();
  const urlBillId = searchParams.get("billId");
  const urlBillNo = searchParams.get("billNo");

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  // State
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
  const [vcnCustom, setVcnCustom] = useState("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorCity, setVendorCity] = useState("");
  const [originalBillNo, setOriginalBillNo] = useState("");
  const [reason, setReason] = useState("Damaged Stock");
  const [deductFromInventory, setDeductFromInventory] = useState(true);
  const [remarks, setRemarks] = useState("");

  // Column Settings State
  const [showColSettings, setShowColSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig>({
    hsn: true,
    batch: true,
    expDate: true,
    rate: true,
    qty: true,
    tradeDisc: true,
    gst: true,
    taxableAmt: true,
    gstAmt: true,
  });

  // Masters
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Vendor Bills Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [vendorBills, setVendorBills] = useState<any[]>([]);
  const [fetchingBills, setFetchingBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  // Voucher Print Modal
  const [selectedPrintReturn, setSelectedPrintReturn] = useState<any | null>(null);
  const [lastCreatedReturn, setLastCreatedReturn] = useState<any | null>(null);

  // Line Items
  const [items, setItems] = useState<ReturnItem[]>([
    {
      id: "1",
      productId: "",
      productCode: "",
      productName: "",
      hsnCode: "30049099",
      batchNo: "BATCH-01",
      expDate: "",
      qty: 1,
      unit: "Box",
      rate: 0,
      discountPercent: 0,
      gstPercent: 12,
      taxableAmount: 0,
      gstAmount: 0,
      total: 0,
    },
  ]);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Auto-import bill from URL parameter if provided
  const fetchBillFromUrl = useCallback(async (idOrNo: string) => {
    try {
      const res = await fetch(`/api/purchase/invoice?id=${idOrNo}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.bill) {
          const bill = json.bill;
          setVendorId(bill.vendorId || "");
          setVendorCode(bill.vendorCode || "");
          setVendorName(bill.vendorName || "");
          setVendorGst(bill.vendorGst || "");
          setVendorPhone(bill.vendorPhone || "");
          setVendorAddress(bill.vendorAddress || "");
          setVendorCity(bill.vendorCity || "");
          setOriginalBillNo(bill.billNumber || bill.supplierInvoiceNo || "");

          if (bill.items && Array.isArray(bill.items) && bill.items.length > 0) {
            const imported: ReturnItem[] = bill.items.map((item: any, idx: number) => {
              const qty = item.qty || 1;
              const rate = item.rate || 0;
              const disP = item.discountPercent || 0;
              const gstP = item.gstPercent || 12;

              const baseTotal = qty * rate;
              const disAmt = baseTotal * (disP / 100);
              const taxable = baseTotal - disAmt;
              const gstAmt = taxable * (gstP / 100);
              const finalTot = taxable + gstAmt;

              return {
                id: (idx + 1).toString(),
                productId: item.productId || "",
                productCode: item.productCode || "",
                productName: item.productName || "Product",
                hsnCode: item.hsnCode || "30049099",
                batchNo: item.batchNo || "BATCH-01",
                expDate: item.expDate || "",
                qty,
                unit: item.unit || "Box",
                rate,
                discountPercent: disP,
                gstPercent: gstP,
                taxableAmount: Math.round(taxable * 100) / 100,
                gstAmount: Math.round(gstAmt * 100) / 100,
                total: Math.round(finalTot * 100) / 100,
              };
            });
            setItems(imported);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching bill from URL:", err);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchNextVcn();
    fetchMasters();
    fetchMetrics();
    if (urlBillId || urlBillNo) {
      fetchBillFromUrl(urlBillId || urlBillNo || "");
    }
  }, [fetchBillFromUrl, urlBillId, urlBillNo]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, historyPage, historySearch, selectedCompany?._id, selectedFY?._id, selectedFY?.fyCode]);

  const fetchNextVcn = async () => {
    try {
      const res = await fetch("/api/purchase/purchase-return?action=nextNumber");
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
      const res = await fetch("/api/purchase/purchase-return?action=metrics");
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

  const fetchMasters = async () => {
    try {
      const res = await fetch("/api/purchase/master-options");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSuppliers(json.suppliers || []);
          setProducts(json.products || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch master options:", err);
    }
  };

  const fetchHistory = async () => {
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

      const res = await fetch(`/api/purchase/purchase-return?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistoryList(data.returns || []);
          setHistoryTotalPages(data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch return history:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Supplier Options for SearchableSelect
  const supplierOptions: OptionItem[] = suppliers.map((s) => ({
    value: s.id || s.code,
    label: s.name,
    subLabel: `#${s.code}${s.city ? ` • ${s.city}` : ""}`,
  }));

  // Product Options for SearchableSelect
  const productOptions: OptionItem[] = products.map((p) => ({
    value: p.id || p.code,
    label: p.name,
    subLabel: `Code: ${p.code} • Rate: ₹${p.purchaseRate} • GST: ${p.gstPercent}%`,
  }));

  const handleSupplierSelect = (idOrCode: string) => {
    const supp = suppliers.find((s) => s.id === idOrCode || s.code === idOrCode);
    if (supp) {
      setVendorId(supp.id);
      setVendorCode(supp.code);
      setVendorName(supp.name);
      setVendorGst(supp.gst);
      setVendorPhone(supp.phone);
      setVendorAddress(supp.address);
      setVendorCity(supp.city);
    } else {
      setVendorId("");
      setVendorCode("");
      setVendorName("");
      setVendorGst("");
      setVendorPhone("");
      setVendorAddress("");
      setVendorCity("");
    }
  };

  // Fetch Vendor Bills for original bill item loading
  const handleOpenBillModal = async () => {
    if (!vendorName && !vendorId) {
      setErrorMsg("Please select a Supplier/Vendor first.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    setIsBillModalOpen(true);
    setFetchingBills(true);
    try {
      const params = new URLSearchParams();
      if (vendorId) params.set("vendorId", vendorId);
      if (vendorName) params.set("vendorName", vendorName);

      const res = await fetch(`/api/purchase/purchase-return?action=vendorBills&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVendorBills(data.bills || []);
        }
      }
    } catch (err) {
      console.error("Error fetching vendor bills:", err);
    } finally {
      setFetchingBills(false);
    }
  };

  const handleImportBillItems = (bill: any) => {
    setSelectedBill(bill);
    setOriginalBillNo(bill.billNumber || bill.supplierInvoiceNo || "");

    if (bill.items && Array.isArray(bill.items) && bill.items.length > 0) {
      const imported: ReturnItem[] = bill.items.map((item: any, idx: number) => {
        const qty = item.qty || 1;
        const rate = item.rate || 0;
        const disP = item.discountPercent || 0;
        const gstP = item.gstPercent || 12;

        const baseTotal = qty * rate;
        const disAmt = baseTotal * (disP / 100);
        const taxable = baseTotal - disAmt;
        const gstAmt = taxable * (gstP / 100);
        const finalTot = taxable + gstAmt;

        return {
          id: (idx + 1).toString(),
          productId: item.productId || "",
          productCode: item.productCode || "",
          productName: item.productName || "Product",
          hsnCode: item.hsnCode || "30049099",
          batchNo: item.batchNo || "BATCH-01",
          expDate: item.expDate || "",
          qty,
          unit: item.unit || "Box",
          rate,
          discountPercent: disP,
          gstPercent: gstP,
          taxableAmount: Math.round(taxable * 100) / 100,
          gstAmount: Math.round(gstAmt * 100) / 100,
          total: Math.round(finalTot * 100) / 100,
        };
      });
      setItems(imported);
    }
    setIsBillModalOpen(false);
  };

  // Line Items Row Handlers
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: "",
        productCode: "",
        productName: "",
        hsnCode: "30049099",
        batchNo: "BATCH-01",
        expDate: "",
        qty: 1,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        gstPercent: 12,
        taxableAmount: 0,
        gstAmount: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ReturnItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    const qty = Number(current.qty || 0);
    const rate = Number(current.rate || 0);
    const disP = Number(current.discountPercent || 0);
    const gstP = Number(current.gstPercent || 0);

    const baseTotal = qty * rate;
    const disAmt = baseTotal * (disP / 100);
    const taxable = Math.max(0, baseTotal - disAmt);
    const gstAmt = taxable * (gstP / 100);
    const total = taxable + gstAmt;

    updated[index] = {
      ...current,
      taxableAmount: Math.round(taxable * 100) / 100,
      gstAmount: Math.round(gstAmt * 100) / 100,
      total: Math.round(total * 100) / 100,
    };

    setItems(updated);
  };

  const handleSelectProductForItem = (index: number, idOrCode: string) => {
    const prod = products.find((p) => p.id === idOrCode || p.code === idOrCode);
    if (prod) {
      const updated = [...items];
      const qty = updated[index].qty > 0 ? updated[index].qty : 1;
      const rate = prod.purchaseRate || 0;
      const disP = updated[index].discountPercent || 0;
      const gstP = prod.gstPercent || 12;

      const baseTotal = qty * rate;
      const disAmt = baseTotal * (disP / 100);
      const taxable = baseTotal - disAmt;
      const gstAmt = taxable * (gstP / 100);

      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        hsnCode: prod.hsn || "30049099",
        rate: rate,
        gstPercent: gstP,
        unit: prod.unit || "Box",
        taxableAmount: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstAmt * 100) / 100,
        total: Math.round((taxable + gstAmt) * 100) / 100,
      };
      setItems(updated);
    }
  };

  // Calculations
  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const calculatedDiscount = items.reduce((sum, item) => sum + ((item.qty * item.rate) * (item.discountPercent / 100)), 0);
  const calculatedTaxable = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const calculatedTotalTax = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const cgst = calculatedTotalTax / 2;
  const sgst = calculatedTotalTax / 2;
  const grossTotal = calculatedTaxable + calculatedTotalTax;
  const netAmount = Math.round(grossTotal);
  const roundOff = Math.round((netAmount - grossTotal) * 100) / 100;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName) {
      setErrorMsg("Please select or enter Supplier/Vendor name.");
      return;
    }

    const validItems = items.filter((i) => i.productName.trim() !== "" && i.qty > 0);
    if (validItems.length === 0) {
      setErrorMsg("Please add at least 1 item with a product name and quantity > 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        vcn: vcnCustom || nextVcn,
        returnDate,
        originalBillNo,
        companyId: selectedCompany?._id || "",
        companyCode: selectedCompany?.companyCode || "",
        fyId: selectedFY?._id || "",
        fyCode: selectedFY?.fyCode || selectedFY?.fyName || "",
        vendorId,
        vendorCode,
        vendorName,
        vendorGst,
        vendorPhone,
        vendorAddress,
        vendorCity,
        reason,
        deductFromInventory,
        items: validItems,
        subtotal: calculatedTaxable,
        totalDiscount: calculatedDiscount,
        cgst,
        sgst,
        igst: 0,
        totalTax: calculatedTotalTax,
        roundOff,
        netAmount,
        remarks,
      };

      const res = await fetch("/api/purchase/purchase-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Debit Note ${data.purchaseReturn.vcn} created successfully!`);
        setLastCreatedReturn(data.purchaseReturn);
        fetchNextVcn();
        fetchMetrics();

        // Reset form
        setVendorId("");
        setVendorCode("");
        setVendorName("");
        setVendorGst("");
        setVendorPhone("");
        setVendorAddress("");
        setVendorCity("");
        setOriginalBillNo("");
        setRemarks("");
        setItems([
          {
            id: "1",
            productId: "",
            productCode: "",
            productName: "",
            hsnCode: "30049099",
            batchNo: "BATCH-01",
            expDate: "",
            qty: 1,
            unit: "Box",
            rate: 0,
            discountPercent: 0,
            gstPercent: 12,
            taxableAmount: 0,
            gstAmount: 0,
            total: 0,
          },
        ]);
      } else {
        setErrorMsg(data.message || "Failed to create Purchase Return.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Return Handler
  const handleDeleteReturn = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Purchase Return entry?")) return;
    try {
      const res = await fetch(`/api/purchase/purchase-return?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Purchase Return deleted.");
        fetchHistory();
        fetchMetrics();
      }
    } catch (err) {
      console.error("Delete Return Error:", err);
    }
  };

  const toggleRowExpand = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (historyList.length === 0) return;
    const headers = ["Debit Note VCN", "Date", "Vendor Name", "Vendor GST", "Original Bill No", "Reason", "Items Qty", "Net Amount (₹)", "Status"];
    const csvRows = historyList.map((r) => [
      `"${r.vcn || ""}"`,
      `"${r.returnDate || ""}"`,
      `"${r.vendorName || ""}"`,
      `"${r.vendorGst || ""}"`,
      `"${r.originalBillNo || ""}"`,
      `"${r.reason || ""}"`,
      r.items ? r.items.reduce((s: number, i: any) => s + (i.qty || 0), 0) : 0,
      r.netAmount || 0,
      `"${r.status || "Approved"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Returns_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl shadow-lg shadow-amber-500/20">
            <FaUndoAlt />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Link href="/dashboard/purchase" className="hover:underline">Purchase</Link>
              <span>/</span>
              <span>Purchase Return (Debit Note)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Return & Debit Note</h1>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "new"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FaPlus className="text-xs" />
            <span>New Return (Debit Note)</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "history"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FaListUl className="text-xs" />
            <span>Return History</span>
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
          <FaFileInvoice className="text-amber-500" /> Invoices List
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaReceipt className="text-emerald-500" /> Payment Entry
        </Link>
        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 text-white shadow-xs font-bold"
        >
          <FaUndoAlt /> Return (Debit Note)
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Returns Amount</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{metrics.totalReturnsAmount.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">{metrics.totalReturnsCount} Debit Notes Total</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
            <FaRupeeSign />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Today's Returns</p>
            <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">₹{metrics.todayReturnsAmount.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">{metrics.todayReturnsCount} Returns Today</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl">
            <FaFileInvoice />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventory Handling</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Auto Deduct</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Stock Updated Realtime</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FaWarehouse />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next VCN Voucher</p>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{vcnCustom || nextVcn || "DN-1001"}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto / Custom Series</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
            <FaBoxes />
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
            <Link
              href="/dashboard/reports/purchase-return"
              className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-amber-700 transition"
            >
              <FaFileInvoiceDollar /> View in Debit Note Report ↗
            </Link>
            {lastCreatedReturn && (
              <button
                onClick={() => setSelectedPrintReturn(lastCreatedReturn)}
                className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition"
              >
                <FaPrint /> Print Slip
              </button>
            )}
            <button onClick={() => setSuccessMsg("")} className="hover:opacity-75">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: NEW PURCHASE RETURN FORM */}
      {activeTab === "new" && (
        <div className="space-y-6">
          {/* Form Header Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowColSettings(!showColSettings)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                <FaSlidersH /> Customize Columns ⚙️
              </button>
              <button
                type="button"
                onClick={handleOpenBillModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-xs transition"
              >
                <FaFileInvoice /> Import Vendor Purchase Bill
              </button>
            </div>

            {originalBillNo && (
              <div className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                Imported from Bill: #{originalBillNo}
              </div>
            )}
          </div>

          {/* Customizable Columns Panel */}
          {showColSettings && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 animate-fadeIn space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <FaSlidersH /> Select Table Fields To Display (Checkboxes):
                </span>
                <button
                  onClick={() => setShowColSettings(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Close ✕
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {[
                  { key: "hsn", label: "HSN Code" },
                  { key: "batch", label: "Batch No" },
                  { key: "expDate", label: "Expiry Date" },
                  { key: "rate", label: "Rate (₹)" },
                  { key: "qty", label: "Return Qty" },
                  { key: "tradeDisc", label: "Trade Disc %" },
                  { key: "gst", label: "GST %" },
                  { key: "taxableAmt", label: "Taxable Value" },
                  { key: "gstAmt", label: "GST Amount" },
                ].map((col) => {
                  const active = columns[col.key as keyof ColumnConfig];
                  return (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/60 dark:border-white/10"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleColumn(col.key as keyof ColumnConfig)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Form */}
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FaBuilding className="text-amber-500" /> Supplier Details & Return Reasons
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Debit Note VCN *
                  </label>
                  <input
                    type="text"
                    value={vcnCustom}
                    onChange={(e) => setVcnCustom(e.target.value)}
                    placeholder="DN-1001"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-extrabold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
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
                    placeholder="Type or search vendor..."
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
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Original Bill / Inv #</span>
                    {originalBillNo && (
                      <button
                        type="button"
                        onClick={() => fetchBillFromUrl(originalBillNo)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 underline font-bold hover:text-amber-700"
                      >
                        ⚡ Import Items
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={originalBillNo}
                    onChange={(e) => setOriginalBillNo(e.target.value)}
                    placeholder="e.g. PUR-1001 or INV-9981"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Return Reason Category *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="Damaged Stock">Damaged Stock</option>
                    <option value="Expired Product">Expired Product</option>
                    <option value="Near Expiry Return">Near Expiry Return</option>
                    <option value="Rate Difference">Rate Difference / Discount Issue</option>
                    <option value="Shortage / Missing">Shortage / Missing Items</option>
                    <option value="Quality Issue">Quality Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Vendor GSTIN
                  </label>
                  <input
                    type="text"
                    value={vendorGst}
                    onChange={(e) => setVendorGst(e.target.value)}
                    placeholder="GSTIN Number"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deductFromInventory}
                      onChange={(e) => setDeductFromInventory(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span>Auto-Deduct Stock from Warehouse</span>
                  </label>
                </div>
              </div>
            </div>

            {/* SUPPLIER HISTORY PANEL */}
            {vendorName && (
              <SupplierHistoryPanel
                vendorName={vendorName}
                vendorCode={vendorCode}
                vendorId={vendorId}
                onSelectBill={handleImportBillItems}
              />
            )}

            {/* Line Items Entry Table */}
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4 overflow-x-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaBoxes className="text-orange-500" /> Items To Return To Vendor
                </h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  <FaPlus /> Add Line Item
                </button>
              </div>

              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-2 min-w-[200px]">Product Name *</th>
                    {columns.hsn && <th className="pb-3 px-2 w-24">HSN</th>}
                    {columns.batch && <th className="pb-3 px-2 w-24">Batch</th>}
                    {columns.expDate && <th className="pb-3 px-2 w-28">Exp Date</th>}
                    {columns.rate && <th className="pb-3 px-2 text-right w-24">Rate (₹)</th>}
                    {columns.qty && <th className="pb-3 px-2 text-right w-24">Return Qty *</th>}
                    {columns.tradeDisc && <th className="pb-3 px-2 text-right w-20">Dis %</th>}
                    {columns.gst && <th className="pb-3 px-2 text-right w-20">GST %</th>}
                    {columns.taxableAmt && <th className="pb-3 px-2 text-right w-28">Taxable</th>}
                    {columns.gstAmt && <th className="pb-3 px-2 text-right w-24">GST Amt</th>}
                    <th className="pb-3 px-2 text-right w-28">Total</th>
                    <th className="pb-3 px-2 text-center w-10">✕</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                      <td className="py-2.5 px-2">
                        <SearchableSelect
                          options={productOptions}
                          value={item.productId || item.productCode}
                          onChange={(val) => handleSelectProductForItem(idx, val)}
                          placeholder="Select Product..."
                        />
                      </td>
                      {columns.hsn && (
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </td>
                      )}
                      {columns.batch && (
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={item.batchNo}
                            onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </td>
                      )}
                      {columns.expDate && (
                        <td className="py-2.5 px-2">
                          <input
                            type="month"
                            value={item.expDate}
                            onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </td>
                      )}
                      {columns.rate && (
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate || ""}
                            onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                            className="w-full px-2 py-1 text-right font-bold rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-orange-600"
                          />
                        </td>
                      )}
                      {columns.qty && (
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, "qty", Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1 text-right font-bold rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </td>
                      )}
                      {columns.tradeDisc && (
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.1"
                            value={item.discountPercent || ""}
                            onChange={(e) => handleItemChange(idx, "discountPercent", Number(e.target.value))}
                            className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </td>
                      )}
                      {columns.gst && (
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.1"
                            value={item.gstPercent}
                            onChange={(e) => handleItemChange(idx, "gstPercent", Number(e.target.value))}
                            className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </td>
                      )}
                      {columns.taxableAmt && (
                        <td className="py-2.5 px-2 text-right font-semibold">
                          ₹{item.taxableAmount.toFixed(2)}
                        </td>
                      )}
                      {columns.gstAmt && (
                        <td className="py-2.5 px-2 text-right text-slate-500">
                          ₹{item.gstAmount.toFixed(2)}
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-right font-black text-orange-600">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                        >
                          <FaTrash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Save */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Return Remarks / Internal Notes
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter reason details, debit note reference, or return instructions..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 p-6 rounded-3xl text-white shadow-xl space-y-3 border border-orange-500">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-100">Debit Note Summary</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-amber-100">
                    <span>Gross Return Value:</span>
                    <span>₹{calculatedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-rose-200">
                    <span>Discount Reversed:</span>
                    <span>-₹{calculatedDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-100">
                    <span>Taxable Return Value:</span>
                    <span>₹{calculatedTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-100">
                    <span>GST Tax (CGST+SGST):</span>
                    <span>₹{calculatedTotalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-orange-400/40 pt-2 flex justify-between items-center">
                    <span className="text-base font-black">Net Return Debit Amount:</span>
                    <span className="text-2xl font-black text-white">₹{netAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-amber-50 text-orange-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                >
                  <FaSave /> {submitting ? "Saving Return..." : "Save & Generate Debit Note"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: RETURN HISTORY REGISTER */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search VCN, Supplier, Invoice No, Reason..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Return History...</div>
          ) : historyList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-3">Debit Note VCN</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Original Bill No</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3 text-right">Net Return (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyList.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                      <td className="p-3 font-extrabold text-orange-600 dark:text-orange-400">{r.vcn}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{r.returnDate}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{r.vendorName}</td>
                      <td className="p-3 font-mono text-slate-500">{r.originalBillNo || "N/A"}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 font-bold rounded-full text-[10px]">
                          {r.reason}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                        ₹{(r.netAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-full text-[10px]">
                          {r.status || "Approved"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPrintReturn(r)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-600 hover:text-white rounded-lg transition text-[11px]"
                            title="Print Voucher Slip"
                          >
                            <FaPrint />
                          </button>
                          <button
                            onClick={() => handleDeleteReturn(r._id)}
                            className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition text-[11px]"
                            title="Delete Return Entry"
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
            <div className="py-16 text-center text-xs text-slate-400 font-medium">No purchase return vouchers found.</div>
          )}
        </div>
      )}

      {/* VENDOR BILLS MODAL FOR IMPORTING ITEMS */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaFileInvoice className="text-amber-500" /> Select Vendor Purchase Bill To Import
              </h3>
              <button onClick={() => setIsBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            {fetchingBills ? (
              <div className="py-8 text-center text-xs text-slate-400">Fetching past bills for {vendorName}...</div>
            ) : vendorBills.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                {vendorBills.map((b) => (
                  <div key={b._id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between hover:border-amber-500 transition">
                    <div>
                      <p className="font-bold text-amber-600 dark:text-amber-400">{b.billNumber || b.supplierInvoiceNo}</p>
                      <p className="text-slate-800 dark:text-white font-medium">{b.vendorName}</p>
                      <p className="text-[10px] text-slate-500">Date: {b.billDate || b.date} • Amount: ₹{(b.netAmount || b.FINAL || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportBillItems(b)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition"
                    >
                      Import Items &rarr;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No past purchase bills found for this vendor.</div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE DEBIT NOTE SLIP MODAL */}
      {selectedPrintReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaUndoAlt className="text-orange-500" /> Debit Note Voucher #{selectedPrintReturn.vcn}
                </h3>
                <p className="text-xs text-slate-500">Date: {selectedPrintReturn.returnDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <FaPrint /> Print Slip
                </button>
                <button onClick={() => setSelectedPrintReturn(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-orange-600">{selectedCompany?.companyName || "PHARMA DISTRIBUTORS"}</h2>
                  <p className="text-[11px] text-slate-500">GSTIN: {selectedCompany?.gstNo || "N/A"}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-black uppercase">
                    DEBIT NOTE / RETURN
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">VCN #: {selectedPrintReturn.vcn}</p>
                  <p className="text-[11px] text-slate-500">Date: {selectedPrintReturn.returnDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Returned To Supplier</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedPrintReturn.vendorName}</p>
                  <p className="text-slate-500">GSTIN: {selectedPrintReturn.vendorGst || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Return Reason & Original Bill</span>
                  <p className="text-slate-700 dark:text-slate-300">Reason: <span className="font-bold text-orange-600">{selectedPrintReturn.reason}</span></p>
                  <p className="text-slate-700 dark:text-slate-300">Original Bill #: <span className="font-bold">{selectedPrintReturn.originalBillNo || "N/A"}</span></p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">Returned Products Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border-b">
                      <th className="p-2">Product Name</th>
                      <th className="p-2">HSN</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedPrintReturn.items && selectedPrintReturn.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-slate-900 dark:text-white">{item.productName}</td>
                        <td className="p-2 text-slate-500">{item.hsnCode || "-"}</td>
                        <td className="p-2 text-right font-bold">{item.qty}</td>
                        <td className="p-2 text-right">₹{item.rate}</td>
                        <td className="p-2 text-right font-bold text-orange-600">₹{item.total || (item.qty * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 text-xs border-t">
                <div className="w-64 space-y-1 text-right">
                  <div className="flex justify-between border-t pt-1 font-black text-sm">
                    <span>Net Return Value:</span>
                    <span className="text-orange-600">₹{(selectedPrintReturn.netAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t print:hidden">
              <button
                onClick={() => setSelectedPrintReturn(null)}
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

export default function PurchaseReturnPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading purchase return...</div>}>
      <PurchaseReturnContent />
    </Suspense>
  );
}
