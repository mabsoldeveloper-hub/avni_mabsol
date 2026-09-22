"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaSpinner,
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaBoxOpen,
  FaExclamationTriangle,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaCheckCircle,
  FaPercentage,
  FaGlobe,
  FaHome,
  FaBuilding,
  FaHistory,
  FaReceipt,
  FaExternalLinkAlt,
  FaChartLine,
  FaSlidersH,
  FaCheckSquare,
} from "react-icons/fa";

interface VisibleFields {
  code: boolean;
  pack: boolean;
  unit: boolean;
  hsn: boolean;
  batch: boolean;
  expiry: boolean;
  mfg: boolean;
  qty: boolean;
  freeQty: boolean;
  mrp: boolean;
  prate: boolean;
  rate: boolean;
  disc: boolean;
  cashDisc: boolean;
  tax: boolean;
  cess: boolean;
  companyName: boolean;
  rack: boolean;
  remark: boolean;
}

interface HistoryItem {
  product: string;
  name: string;
  qty: number;
  freeQty: number;
  rate: number;
  mrp: number;
  disc: number;
  cgst: number;
  sgst: number;
  igst: number;
  batch: string;
  expiry: string;
  amount: number;
}

interface CustomerInvoiceHistory {
  _id: string;
  vcn: string;
  date: string;
  type: string;
  billType?: string;
  isConverted?: boolean;
  convertedToVcn?: string;
  taxable: number;
  cgst: number;
  sgst: number;
  tax: number;
  round: number;
  finalAmount: number;
  pendingAmount: number;
  status: string;
  itemsCount: number;
  items: HistoryItem[];
}

interface CustomerHistorySummary {
  totalInvoices: number;
  totalAmount: number;
  totalTaxable: number;
  outstandingAmount: number;
  lastBillDate: string;
  lastBillVcn: string;
  topProducts: { name: string; qty: number; amount: number }[];
}

interface CustomerOption {
  _id: string;
  CODEP: string;
  ORDNO?: string;
  PARNAM: string;
  CITY?: string;
  STATE?: string;
  GSTNO?: string;
  GSTHED?: string;
  PRICE?: string; // Rate A, B, C, D, E, F, etc.
  BALANCE?: number;
}

interface BatchItem {
  batchNo: string;
  expiry?: string;
  stock?: number;
  mrp?: number;
  ratef?: number;
}

interface ProductOption {
  _id: string;
  PRODUCT?: string;
  CODE?: string;
  NAME: string;
  PACK?: string;
  UNIT?: string;
  MRP?: number;
  PRATE?: number;
  RATEF?: number;
  RATEA?: number;
  RATEB?: number;
  RATEC?: number;
  RATED?: number;
  RATEE?: number;
  RATEG?: number;
  CLBAL?: number;
  STOCK?: number;
  CGST?: number;
  IGST?: number;
  BATCH?: string;
  EXPIRY?: string;
  companyName?: string;
  batches?: BatchItem[];
}

interface InvoiceItem {
  productId: string;
  code: string;
  name: string;
  pack: string;
  unit: string;
  hsn: string;
  batch: string;
  expiry: string;
  mfg: string;
  qty: number;
  freeQty: number;
  mrp: number;
  prate: number;
  rate: number;
  disc: number;
  cashDisc: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  companyName: string;
  rack: string;
  remark: string;
  taxableAmount: number;
  taxAmount: number;
  finalAmount: number;
}

export default function CreateSaleInvoicePage() {
  const router = useRouter();

  // Data Sources
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Invoice Form Header State
  const [selectedCustomerCode, setSelectedCustomerCode] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceVcn, setInvoiceVcn] = useState("");
  const [billType, setBillType] = useState<"S" | "PROFORMA">("S");
  const [convertFromVcn, setConvertFromVcn] = useState("");

  // Customer Invoice History State
  const [customerHistory, setCustomerHistory] = useState<CustomerInvoiceHistory[]>([]);
  const [historySummary, setHistorySummary] = useState<CustomerHistorySummary | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [expandedVcn, setExpandedVcn] = useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Checkbox field options for product entry form & invoice table (19 Available Fields)
  const [visibleFields, setVisibleFields] = useState<VisibleFields>({
    code: true,
    pack: true,
    unit: true,
    hsn: false,
    batch: true,
    expiry: true,
    mfg: false,
    qty: true,
    freeQty: true,
    mrp: true,
    prate: false,
    rate: true,
    disc: true,
    cashDisc: false,
    tax: true,
    cess: false,
    companyName: false,
    rack: false,
    remark: false,
  });

  const [isFieldControlOpen, setIsFieldControlOpen] = useState(false);
  const fieldControlRef = useRef<HTMLDivElement>(null);

  // Draft Item Entry Form State (All 19 customizable fields)
  const [draftProdCode, setDraftProdCode] = useState("");
  const [draftPack, setDraftPack] = useState("");
  const [draftUnit, setDraftUnit] = useState("Pcs");
  const [draftHsn, setDraftHsn] = useState("");
  const [draftBatch, setDraftBatch] = useState("");
  const [draftExpiry, setDraftExpiry] = useState("");
  const [draftMfg, setDraftMfg] = useState("");
  const [draftQty, setDraftQty] = useState<number | "">(1);
  const [draftFreeQty, setDraftFreeQty] = useState<number | "">(0);
  const [draftMrp, setDraftMrp] = useState<number | "">(0);
  const [draftPrate, setDraftPrate] = useState<number | "">(0);
  const [draftRate, setDraftRate] = useState<number | "">(0);
  const [draftDisc, setDraftDisc] = useState<number | "">(0);
  const [draftCashDisc, setDraftCashDisc] = useState<number | "">(0);
  const [draftCgst, setDraftCgst] = useState<number | "">(6);
  const [draftSgst, setDraftSgst] = useState<number | "">(6);
  const [draftIgst, setDraftIgst] = useState<number | "">(0);
  const [draftCess, setDraftCess] = useState<number | "">(0);
  const [draftCompanyName, setDraftCompanyName] = useState("");
  const [draftRack, setDraftRack] = useState("");
  const [draftRemark, setDraftRemark] = useState("");

  // Search Combobox States
  const [custSearch, setCustSearch] = useState("");
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const custDropdownRef = useRef<HTMLDivElement>(null);

  const [prodSearch, setProdSearch] = useState("");
  const [isProdDropdownOpen, setIsProdDropdownOpen] = useState(false);
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(
      (c) =>
        String(c.CODEP || "").trim().toUpperCase() === selectedCustomerCode.trim().toUpperCase() ||
        String(c.ORDNO || "").trim().toUpperCase() === selectedCustomerCode.trim().toUpperCase()
    );
  }, [customers, selectedCustomerCode]);

  // Company State Code & Customer State Code
  const companyGst = useMemo(() => String(company?.gstNo || company?.GSTNO || "").trim(), [company]);
  const companyStateCode = useMemo(() => (/^\d{2}/.test(companyGst) ? companyGst.slice(0, 2) : ""), [companyGst]);

  const customerGst = useMemo(() => String(selectedCustomer?.GSTNO || "").trim(), [selectedCustomer]);
  const customerStateCode = useMemo(() => (/^\d{2}/.test(customerGst) ? customerGst.slice(0, 2) : ""), [customerGst]);

  // Tax Category: Local (CGST+SGST) vs Central (IGST) by comparing Company GST vs Customer GST State Code
  const isLocalParty = useMemo(() => {
    if (!selectedCustomer) return true; // Default Local

    // 1. Compare State Codes from GSTIN (first 2 digits)
    if (companyStateCode && customerStateCode) {
      return companyStateCode === customerStateCode;
    }

    // 2. Explicit GSTHED in Customer Record
    const gstHed = String(selectedCustomer.GSTHED || "").trim().toUpperCase();
    if (
      gstHed.includes("CENTRAL") ||
      gstHed.includes("IGST") ||
      gstHed.includes("OUT") ||
      gstHed.includes("INTERSTATE")
    ) {
      return false; // Central Party -> IGST
    }
    if (gstHed.includes("LOCAL")) {
      return true; // Local Party -> CGST + SGST
    }

    // 3. Compare State Names
    const compState = String(company?.state || "").trim().toLowerCase();
    const custState = String(selectedCustomer.STATE || "").trim().toLowerCase();

    if (compState && custState) {
      return compState === custState;
    }

    return true; // Default Local
  }, [selectedCustomer, companyStateCode, customerStateCode, company]);

  // Filtered Customers by Search Query
  const filteredCustomers = useMemo(() => {
    const s = custSearch.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        String(c.PARNAM || "").toLowerCase().includes(s) ||
        String(c.CODEP || "").toLowerCase().includes(s) ||
        String(c.CITY || "").toLowerCase().includes(s) ||
        String(c.GSTNO || "").toLowerCase().includes(s)
    );
  }, [customers, custSearch]);

  // Invoice Line Items List
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Selected draft product
  const selectedProduct = useMemo(() => {
    return products.find(
      (p) =>
        String(p.PRODUCT || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase() ||
        String(p.CODE || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase() ||
        String(p.NAME || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase()
    );
  }, [products, draftProdCode]);

  // Filtered Products by Search Query
  const filteredProducts = useMemo(() => {
    const s = prodSearch.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        String(p.NAME || "").toLowerCase().includes(s) ||
        String(p.PRODUCT || p.CODE || "").toLowerCase().includes(s) ||
        String(p.PACK || "").toLowerCase().includes(s) ||
        String(p.companyName || "").toLowerCase().includes(s)
    );
  }, [products, prodSearch]);

  // Fetch customer invoice history when selected customer changes
  useEffect(() => {
    if (!selectedCustomerCode) {
      setCustomerHistory([]);
      setHistorySummary(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const codep = selectedCustomer?.CODEP || selectedCustomer?.ORDNO || selectedCustomerCode;
        const res = await fetch(`/api/sales/customer-history?code=${encodeURIComponent(codep)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setCustomerHistory(json.invoices || []);
            setHistorySummary(json.summary || null);
          }
        }
      } catch (err) {
        console.error("Error fetching customer history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedCustomerCode, selectedCustomer]);

  // Filtered History by Search Query
  const filteredHistory = useMemo(() => {
    const s = historySearch.trim().toLowerCase();
    if (!s) return customerHistory;
    return customerHistory.filter(
      (inv) =>
        inv.vcn.toLowerCase().includes(s) ||
        inv.date.toLowerCase().includes(s) ||
        inv.status.toLowerCase().includes(s) ||
        inv.items.some((it) => it.name.toLowerCase().includes(s) || it.product.toLowerCase().includes(s))
    );
  }, [customerHistory, historySearch]);

  useEffect(() => {
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceVcn(billType === "PROFORMA" ? `PRF-${Date.now().toString().slice(-6)}` : `INV-${Date.now().toString().slice(-6)}`);
    loadData();

    // Check if loaded with convertFrom query parameter
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const convertFrom = params.get("convertFrom") || params.get("proformaId") || "";
      if (convertFrom) {
        loadProformaInvoiceToConvert(convertFrom);
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(e.target as Node)) {
        setIsCustDropdownOpen(false);
      }
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(e.target as Node)) {
        setIsProdDropdownOpen(false);
      }
      if (fieldControlRef.current && !fieldControlRef.current.contains(e.target as Node)) {
        setIsFieldControlOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNextVcn(billType);
  }, [billType]);

  const fetchNextVcn = async (typeMode: "S" | "PROFORMA") => {
    try {
      const res = await fetch(`/api/sales/invoice/next-number?type=${typeMode}`);
      const json = await res.json();
      if (json.success && json.vcn) {
        setInvoiceVcn(json.vcn);
      }
    } catch {
      setInvoiceVcn(typeMode === "PROFORMA" ? `PRF-${Date.now().toString().slice(-6)}` : `INV-${Date.now().toString().slice(-6)}`);
    }
  };

  const loadProformaInvoiceToConvert = async (vcnToConvert: string) => {
    try {
      setLoadingInitial(true);
      const res = await fetch(`/api/sales/invoice/${encodeURIComponent(vcnToConvert)}`);
      const data = await res.json();
      if (data.success && data.header) {
        setBillType("S");
        setConvertFromVcn(vcnToConvert);
        if (data.header.CODEP) {
          setSelectedCustomerCode(data.header.CODEP);
        }
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const loadedItems: InvoiceItem[] = data.items.map((it: any, idx: number) => {
            const qty = Number(it.qty || 1);
            const freeQty = Number(it.freeQty || 0);
            const rate = Number(it.rate || 0);
            const mrp = Number(it.mrp || 0);
            const prate = Number(it.prate || 0);
            const disc = Number(it.disc || 0);
            const cashDisc = Number(it.cashDisc || 0);
            const cgst = Number(it.cgst || 0);
            const sgst = Number(it.sgst || 0);
            const igst = Number(it.igst || 0);
            const cess = Number(it.cess || 0);

            const gross = qty * rate;
            const discAmt = gross * (disc / 100);
            let taxable = gross - discAmt;
            if (cashDisc > 0) taxable -= taxable * (cashDisc / 100);
            const taxAmt = taxable * ((cgst + sgst + igst) / 100);
            const finalAmt = Math.round(taxable + taxAmt);

            return {
              productId: it.code || `PROD-${idx}`,
              code: it.code || "",
              name: it.product || it.name || "Item",
              pack: it.pack || "",
              unit: it.unit || "",
              hsn: it.hsn || "",
              batch: it.batch || "DEFAULT",
              expiry: it.expiry || "",
              mfg: it.mfg || "",
              qty,
              freeQty,
              mrp,
              prate,
              rate,
              disc,
              cashDisc,
              cgst,
              sgst,
              igst,
              cess,
              companyName: it.company || "",
              rack: "",
              remark: it.remark || "",
              taxableAmount: taxable,
              taxAmount: taxAmt,
              finalAmount: finalAmt,
            };
          });
          setItems(loadedItems);
        }
        setSuccessMsg(`Proforma Invoice #${vcnToConvert} loaded! Change items if needed and click Create to generate Final Tax Invoice.`);
      }
    } catch (err) {
      console.error("Failed to load Proforma invoice:", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      const [resCust, resProd, resComp] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/company-settings"),
      ]);

      if (resCust.ok) {
        const jsonCust = await resCust.json();
        if (Array.isArray(jsonCust)) setCustomers(jsonCust);
      }

      if (resProd.ok) {
        const jsonProd = await resProd.json();
        if (Array.isArray(jsonProd)) setProducts(jsonProd);
      }

      if (resComp.ok) {
        const jsonComp = await resComp.json();
        if (jsonComp && typeof jsonComp === "object") setCompany(jsonComp);
      }
    } catch (err) {
      console.error("Failed to load invoice initial data", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Auto-populate batch, expiry, rate, mrp, pack, unit, hsn, prate, company, and tax
  useEffect(() => {
    if (selectedProduct) {
      setDraftPack(selectedProduct.PACK || "");
      setDraftUnit(selectedProduct.UNIT || "Pcs");
      setDraftHsn((selectedProduct as any).HSN || (selectedProduct as any).SCODE || "");
      setDraftPrate(Number(selectedProduct.PRATE || 0));
      setDraftCompanyName(selectedProduct.companyName || "");
      setDraftRack((selectedProduct as any).RACK || (selectedProduct as any).GODWON || "");

      // Check customer price tier (RATEA, RATEB, RATEC, RATED, RATEE, RATEF, etc.)
      const rateTier = String(selectedCustomer?.PRICE || "RATEF").trim().toUpperCase();

      let rateToUse = Number(selectedProduct.RATEF || selectedProduct.MRP || 0);

      if (rateTier === "RATEA" && selectedProduct.RATEA) rateToUse = Number(selectedProduct.RATEA);
      else if (rateTier === "RATEB" && selectedProduct.RATEB) rateToUse = Number(selectedProduct.RATEB);
      else if (rateTier === "RATEC" && selectedProduct.RATEC) rateToUse = Number(selectedProduct.RATEC);
      else if (rateTier === "RATED" && selectedProduct.RATED) rateToUse = Number(selectedProduct.RATED);
      else if (rateTier === "RATEE" && selectedProduct.RATEE) rateToUse = Number(selectedProduct.RATEE);
      else if (rateTier === "RATEG" && selectedProduct.RATEG) rateToUse = Number(selectedProduct.RATEG);

      setDraftRate(rateToUse);
      setDraftMrp(Number(selectedProduct.MRP || 0));

      // Local vs Central Tax Logic
      const rawCgst = Number(selectedProduct.CGST || 6);
      const totalGstPct = Number(selectedProduct.IGST) || rawCgst * 2;

      if (isLocalParty) {
        setDraftCgst(totalGstPct / 2);
        setDraftSgst(totalGstPct / 2);
        setDraftIgst(0);
      } else {
        setDraftCgst(0);
        setDraftSgst(0);
        setDraftIgst(totalGstPct);
      }

      // Batches Auto-population
      if (selectedProduct.batches && selectedProduct.batches.length > 0) {
        const firstBatch = selectedProduct.batches[0];
        setDraftBatch(firstBatch.batchNo || "DEFAULT");
        setDraftExpiry(firstBatch.expiry || "");
      } else if (selectedProduct.BATCH) {
        setDraftBatch(selectedProduct.BATCH);
        setDraftExpiry(selectedProduct.EXPIRY || "");
      } else {
        setDraftBatch("DEFAULT");
        setDraftExpiry("");
      }
    }
  }, [selectedProduct, selectedCustomer, isLocalParty]);

  // When user selects a specific batch from batch dropdown
  const handleBatchSelect = (batchNo: string) => {
    setDraftBatch(batchNo);
    if (selectedProduct?.batches) {
      const b = selectedProduct.batches.find(
        (x) => x.batchNo.trim().toUpperCase() === batchNo.trim().toUpperCase()
      );
      if (b) {
        if (b.expiry) setDraftExpiry(b.expiry);
        if (b.ratef && Number(b.ratef) > 0) setDraftRate(Number(b.ratef));
        if (b.mrp && Number(b.mrp) > 0) setDraftMrp(Number(b.mrp));
      }
    }
  };

  // Add Item Handler with all 19 Customizable Fields
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setErrorMsg("Please select a valid product first!");
      return;
    }

    const qtyNum = Number(draftQty) || 1;
    const freeQtyNum = Number(draftFreeQty) || 0;
    const rateNum = Number(draftRate) || 0;
    const mrpNum = Number(draftMrp) || Number(selectedProduct.MRP || 0);
    const prateNum = Number(draftPrate) || 0;
    const discNum = Number(draftDisc) || 0;
    const cashDiscNum = Number(draftCashDisc) || 0;
    const cessNum = Number(draftCess) || 0;

    const cgstNum = isLocalParty ? Number(draftCgst) || 0 : 0;
    const sgstNum = isLocalParty ? Number(draftSgst) || 0 : 0;
    const igstNum = !isLocalParty ? Number(draftIgst) || 0 : 0;

    const grossAmount = qtyNum * rateNum;
    const discAmount = grossAmount * (discNum / 100);
    let taxableAmount = grossAmount - discAmount;

    if (cashDiscNum > 0) {
      taxableAmount -= taxableAmount * (cashDiscNum / 100);
    }

    const taxAmount = taxableAmount * ((cgstNum + sgstNum + igstNum) / 100);
    const cessAmount = taxableAmount * (cessNum / 100);
    const finalAmount = taxableAmount + taxAmount + cessAmount;

    const newItem: InvoiceItem = {
      productId: String(selectedProduct._id || selectedProduct.PRODUCT || selectedProduct.CODE),
      code: String(selectedProduct.PRODUCT || selectedProduct.CODE || selectedProduct.NAME),
      name: selectedProduct.NAME,
      pack: draftPack || selectedProduct.PACK || "",
      unit: draftUnit || selectedProduct.UNIT || "Pcs",
      hsn: draftHsn || (selectedProduct as any).HSN || "",
      batch: draftBatch || selectedProduct.BATCH || "DEFAULT",
      expiry: draftExpiry || selectedProduct.EXPIRY || "",
      mfg: draftMfg || "",
      qty: qtyNum,
      freeQty: freeQtyNum,
      mrp: mrpNum,
      prate: prateNum,
      rate: rateNum,
      disc: discNum,
      cashDisc: cashDiscNum,
      cgst: cgstNum,
      sgst: sgstNum,
      igst: igstNum,
      cess: cessNum,
      companyName: draftCompanyName || selectedProduct.companyName || "",
      rack: draftRack || "",
      remark: draftRemark || "",
      taxableAmount,
      taxAmount,
      finalAmount,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset draft item form
    setDraftProdCode("");
    setProdSearch("");
    setDraftQty(1);
    setDraftFreeQty(0);
    setDraftRate(0);
    setDraftMrp(0);
    setDraftPrate(0);
    setDraftDisc(0);
    setDraftCashDisc(0);
    setDraftCess(0);
    setDraftBatch("");
    setDraftExpiry("");
    setDraftMfg("");
    setDraftRemark("");
    setErrorMsg("");
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Invoice Summary Computations
  const invoiceSummary = useMemo(() => {
    const totalTaxable = items.reduce((acc, item) => acc + item.taxableAmount, 0);
    const totalCgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.cgst / 100), 0);
    const totalSgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.sgst / 100), 0);
    const totalIgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.igst / 100), 0);
    const totalCess = items.reduce((acc, item) => acc + item.taxableAmount * (item.cess / 100), 0);
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
    const grossTotal = totalTaxable + totalTax;
    const finalAmount = Math.round(grossTotal);
    const roundOff = Number((finalAmount - grossTotal).toFixed(2));

    return {
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalCess,
      totalTax,
      grossTotal,
      finalAmount,
      roundOff,
    };
  }, [items]);

  // Submit Invoice to API
  const handleSubmitInvoice = async () => {
    if (!selectedCustomerCode) {
      setErrorMsg("Please select a customer for the invoice!");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Please add at least one product item to the invoice!");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");

      const codepToUse = selectedCustomer?.CODEP || selectedCustomer?.ORDNO || selectedCustomerCode;

      const payload = {
        VCN: invoiceVcn,
        DATE: invoiceDate,
        CODEP: codepToUse,
        billType: billType,
        convertFromVcn: convertFromVcn,
        items: items.map((item) => ({
          PRODUCT: item.code,
          NAME: item.name,
          PACK: item.pack,
          UNIT: item.unit,
          HSN: item.hsn,
          QTY: item.qty,
          FREEQTY: item.freeQty,
          LPRATE: item.rate,
          MRP: item.mrp,
          PRATE: item.prate,
          DISC: item.disc,
          CASHDISC: item.cashDisc,
          BATCH: item.batch,
          EXPIRY: item.expiry,
          MFG: item.mfg,
          CGST: item.cgst,
          SGST: item.sgst,
          IGST: item.igst,
          CESS: item.cess,
          REMARK: item.remark,
        })),
      };

      const res = await fetch("/api/sales/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate Sale Invoice");
      }

      setSuccessMsg(`Sale Invoice #${data.data?.vcn || invoiceVcn} created successfully! Redirecting...`);
      setTimeout(() => {
        router.push("/dashboard/sales/invoice");
      }, 1200);
    } catch (err: any) {
      console.error("Submit Sale Invoice error:", err);
      setErrorMsg(err.message || "Something went wrong while saving the invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/invoice"
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/70 backdrop-blur-md border border-white/70 shadow-sm text-slate-600 hover:text-slate-900 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FaFileInvoiceDollar className="text-indigo-600" /> Generate New Sale Invoice
            </h2>
            <p className="text-xs text-slate-500">
              Live Billing with Company GST State ({companyStateCode || "24"}) vs Customer GST Matching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            VCN: #{invoiceVcn || "INV-..."}
          </span>
        </div>
      </div>

      {/* Success / Error Message Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <FaCheckCircle className="text-emerald-600 flex-shrink-0" size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 flex-shrink-0" size={15} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800 text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Form Container - Liquid Glass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2-Columns: Invoice Header & Product Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Customer & Invoice Info */}
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
            
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FaUserCheck className="text-indigo-600" /> Customer & Billing Info
              </span>
              {companyGst ? (
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <FaBuilding className="text-slate-400" size={10} /> Our GST: <span className="font-bold text-slate-700">{companyGst}</span>
                </span>
              ) : null}
            </h3>

            {/* BILL MODE SELECTOR (Tax Invoice vs Proforma / Kaccha Bill) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span>Billing Type Mode:</span>
                <span className="text-[10px] text-slate-500 font-medium">({billType === "PROFORMA" ? "Proforma / Kaccha Bill Mode" : "Final Tax Invoice / Pakka Bill Mode"})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillType("S");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billType === "S"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <FaReceipt size={12} /> Tax Invoice (Pakka Bill)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillType("PROFORMA");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billType === "PROFORMA"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <FaFileInvoiceDollar size={12} /> Proforma / Kaccha Bill
                </button>
              </div>
            </div>

            {/* Conversion Mode Active Banner */}
            {convertFromVcn && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] uppercase tracking-wider font-extrabold">Conversion Mode Active</span>
                  <span>Converting Proforma Invoice <strong className="text-amber-950">#{convertFromVcn}</strong> into Final Tax Invoice.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConvertFromVcn("")}
                  className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* SEARCHABLE CUSTOMER COMBOBOX */}
              <div className="relative" ref={custDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search & Select Customer <span className="text-rose-500">*</span>
                </label>
                {loadingInitial ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <FaSpinner className="animate-spin text-indigo-600" /> Loading customers...
                  </div>
                ) : (
                  <div>
                    <div
                      onClick={() => setIsCustDropdownOpen((prev) => !prev)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white/90 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-indigo-600 shadow-sm"
                    >
                      <span className={selectedCustomer ? "font-bold text-slate-800" : "text-slate-400"}>
                        {selectedCustomer ? `${selectedCustomer.PARNAM} (${selectedCustomer.CODEP || selectedCustomer.ORDNO})` : "-- Search & Select Customer --"}
                      </span>
                      <FaChevronDown className="text-slate-400 text-[10px]" />
                    </div>

                    {/* Customer Search Dropdown Menu */}
                    {isCustDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                          <FaSearch size={11} className="text-slate-400 ml-1" />
                          <input
                            type="text"
                            value={custSearch}
                            onChange={(e) => setCustSearch(e.target.value)}
                            placeholder="Search by customer name, code, city, GST..."
                            autoFocus
                            className="w-full bg-transparent text-xs outline-none text-slate-800"
                          />
                          {custSearch && (
                            <button onClick={() => setCustSearch("")} className="text-slate-400 hover:text-slate-600">
                              <FaTimes size={10} />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-slate-400">No customers matching "{custSearch}"</div>
                          ) : (
                            filteredCustomers.map((c, idx) => (
                              <div
                                key={`${c.CODEP}-${idx}`}
                                onClick={() => {
                                  setSelectedCustomerCode(c.CODEP || c.ORDNO || "");
                                  setIsCustDropdownOpen(false);
                                }}
                                className={`p-2.5 hover:bg-indigo-50/70 cursor-pointer transition flex items-center justify-between ${
                                  selectedCustomerCode === (c.CODEP || c.ORDNO) ? "bg-indigo-50 font-bold text-indigo-900" : "text-slate-700"
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-slate-800">{c.PARNAM}</div>
                                  <div className="text-[10px] text-slate-500">
                                    Code: {c.CODEP || c.ORDNO} {c.CITY ? `• 📍 ${c.CITY}` : ""} {c.PRICE ? `• Rate: ${c.PRICE}` : ""}
                                  </div>
                                </div>
                                {c.BALANCE ? (
                                  <div className="text-[10px] font-semibold text-slate-600">
                                    Bal: ₹{Number(c.BALANCE).toLocaleString("en-IN")}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white/80 font-medium"
                />
              </div>
            </div>

            {/* Selected Customer Details & Local vs Central Tax Category Banner */}
            {selectedCustomer && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-indigo-900">{selectedCustomer.PARNAM}</span>
                  {selectedCustomer.CITY ? <span className="text-slate-600 ml-2">📍 {selectedCustomer.CITY}</span> : null}
                  {selectedCustomer.GSTNO ? <span className="text-slate-600 ml-2">📜 GST: {selectedCustomer.GSTNO}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  {/* LOCAL VS CENTRAL BADGE BASED ON COMPANY GST VS CUSTOMER GST */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                    isLocalParty
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}>
                    {isLocalParty ? <FaHome size={11} /> : <FaGlobe size={11} />}
                    {isLocalParty ? "LOCAL SALE (CGST + SGST)" : "CENTRAL SALE (IGST)"}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-semibold border border-indigo-200">
                    Rate: {selectedCustomer.PRICE || "Rate F"}
                  </span>
                  <span className="font-semibold text-slate-700">
                    Outstanding: ₹{Number(selectedCustomer.BALANCE || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Customer Purchase & Invoice History Section */}
          {selectedCustomer && (
            <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FaHistory className="text-indigo-600" /> Customer Purchase & Invoice History
                </h3>

                <div className="flex items-center gap-2">
                  {historySummary && historySummary.totalInvoices > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                      {historySummary.totalInvoices} Invoices • ₹{historySummary.totalAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsHistoryCollapsed((prev) => !prev)}
                    className="p-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 transition text-xs"
                    title={isHistoryCollapsed ? "Expand History" : "Collapse History"}
                  >
                    {isHistoryCollapsed ? <FaChevronDown size={12} /> : <FaChevronUp size={12} />}
                  </button>
                </div>
              </div>

              {!isHistoryCollapsed && (
                <div className="space-y-4 pt-1">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-indigo-600 font-medium">
                      <FaSpinner className="animate-spin" size={16} />
                      Loading customer invoice history...
                    </div>
                  ) : customerHistory.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      <FaReceipt className="mx-auto text-slate-300 mb-1" size={24} />
                      No previous invoice history found for <span className="font-semibold text-slate-700">{selectedCustomer.PARNAM}</span>. This will be their first sale invoice.
                    </div>
                  ) : (
                    <>
                      {/* Summary Metrics Cards */}
                      {historySummary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 shadow-sm">
                            <div className="text-[10px] uppercase font-bold text-indigo-500">Total Invoices</div>
                            <div className="text-sm font-extrabold text-indigo-950 mt-0.5">
                              {historySummary.totalInvoices} <span className="text-[10px] font-normal text-indigo-600">bills</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 shadow-sm">
                            <div className="text-[10px] uppercase font-bold text-emerald-600">Total Sales Value</div>
                            <div className="text-sm font-extrabold text-emerald-950 mt-0.5">
                              ₹{historySummary.totalAmount.toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 shadow-sm">
                            <div className="text-[10px] uppercase font-bold text-amber-600">Outstanding Bal</div>
                            <div className="text-sm font-extrabold text-amber-950 mt-0.5">
                              ₹{(selectedCustomer.BALANCE || historySummary.outstandingAmount || 0).toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 shadow-sm">
                            <div className="text-[10px] uppercase font-bold text-blue-600">Last Bill Date</div>
                            <div className="text-sm font-extrabold text-blue-950 mt-0.5 truncate">
                              {historySummary.lastBillDate || "N/A"}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top Purchased Products Pills */}
                      {historySummary?.topProducts && historySummary.topProducts.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                            <FaChartLine className="text-indigo-500" size={12} /> Top Purchased Products by this Customer (Click to auto-select):
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {historySummary.topProducts.map((tp, idx) => (
                              <span
                                key={idx}
                                onClick={() => {
                                  setDraftProdCode(tp.name);
                                  setProdSearch(tp.name);
                                  setIsProdDropdownOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm text-[11px] font-semibold text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer transition"
                                title="Click to auto-load medicine in Product Entry Form"
                              >
                                <span className="text-indigo-600 font-bold">{tp.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                  Total Qty: {tp.qty}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* History Search & Counter */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Filter past invoices by VCN, Date, or Medicine name..."
                            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          {historySearch && (
                            <button
                              onClick={() => setHistorySearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              <FaTimes size={10} />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          Showing {filteredHistory.length} of {customerHistory.length} invoices
                        </span>
                      </div>

                      {/* Invoices List / Table */}
                      <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 shadow-inner divide-y divide-slate-100 text-xs">
                        {filteredHistory.length === 0 ? (
                          <div className="p-4 text-center text-slate-400">
                            No past invoices matching "{historySearch}"
                          </div>
                        ) : (
                          filteredHistory.map((inv) => {
                            const isExpanded = expandedVcn === inv.vcn;
                            return (
                              <div key={inv.vcn} className="transition">
                                {/* Row Header */}
                                <div
                                  onClick={() => setExpandedVcn(isExpanded ? null : inv.vcn)}
                                  className={`p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-indigo-50/50 ${
                                    isExpanded ? "bg-indigo-50/80 font-medium" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                                      #{inv.vcn.replace(/^INV-/, "")}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <span>VCN: #{inv.vcn}</span>
                                        {(inv.type === "PROFORMA" || inv.billType === "PROFORMA" || inv.status === "Proforma") ? (
                                          inv.isConverted || inv.status === "Converted" ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-300">
                                              ✓ Converted
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                              📋 Proforma (Kaccha)
                                            </span>
                                          )
                                        ) : (
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              inv.status === "Paid"
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                : inv.status === "Partial"
                                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                                : "bg-rose-100 text-rose-800 border-rose-300"
                                            }`}
                                          >
                                            {inv.status}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                        <span>📅 {inv.date || "N/A"}</span>
                                        <span>• {inv.itemsCount} items</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-extrabold text-slate-900 text-sm">
                                        ₹{inv.finalAmount.toLocaleString("en-IN")}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        Taxable: ₹{inv.taxable.toLocaleString("en-IN")} • Tax: ₹{inv.tax.toLocaleString("en-IN")}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {(inv.type === "PROFORMA" || inv.billType === "PROFORMA" || inv.status === "Proforma") &&
                                        !inv.isConverted &&
                                        inv.status !== "Converted" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              loadProformaInvoiceToConvert(inv.vcn);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] transition shadow-sm cursor-pointer flex items-center gap-1"
                                            title="Convert this Kaccha Bill into a Final Tax Invoice"
                                          >
                                            ⚡ Convert
                                          </button>
                                        )}
                                      <Link
                                        href={`/dashboard/sales/invoice/${encodeURIComponent(inv.vcn)}`}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                        title="View Full Invoice"
                                      >
                                        <FaExternalLinkAlt size={11} />
                                      </Link>
                                      <button
                                        type="button"
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                      >
                                        {isExpanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Item Details */}
                                {isExpanded && (
                                  <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] space-y-2 animate-in fade-in duration-150">
                                    <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                                      Invoice Line Items Breakdown ({inv.items.length}):
                                    </div>
                                    {inv.items.length === 0 ? (
                                      <div className="text-slate-400 italic">No line items detailed for this invoice.</div>
                                    ) : (
                                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                        <table className="w-full text-left divide-y divide-slate-200">
                                          <thead className="bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                            <tr>
                                              <th className="p-2">Item Name / Code</th>
                                              <th className="p-2">Batch</th>
                                              <th className="p-2 text-right">Qty</th>
                                              <th className="p-2 text-right">Free</th>
                                              <th className="p-2 text-right">Rate</th>
                                              <th className="p-2 text-right">Total (₹)</th>
                                              <th className="p-2 text-center">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {inv.items.map((it, iIdx) => (
                                              <tr key={iIdx} className="hover:bg-slate-50">
                                                <td className="p-2 font-medium text-slate-800">
                                                  {it.name} <span className="text-[9px] text-slate-400">({it.product})</span>
                                                </td>
                                                <td className="p-2 text-slate-600">{it.batch || "N/A"}</td>
                                                <td className="p-2 text-right font-bold text-indigo-700">{it.qty}</td>
                                                <td className="p-2 text-right text-slate-500">{it.freeQty || 0}</td>
                                                <td className="p-2 text-right text-slate-700">₹{it.rate}</td>
                                                <td className="p-2 text-right font-extrabold text-slate-900">
                                                  ₹{it.amount.toLocaleString("en-IN")}
                                                </td>
                                                <td className="p-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDraftProdCode(it.product || it.name);
                                                      setProdSearch(it.name);
                                                      if (it.qty) setDraftQty(it.qty);
                                                      if (it.rate) setDraftRate(it.rate);
                                                      if (it.batch) setDraftBatch(it.batch);
                                                    }}
                                                    className="px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold transition cursor-pointer"
                                                    title="Auto-select this past item"
                                                  >
                                                    + Pick
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card 2: Product Line Item Add Form */}
          <div className="relative isolate rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4 z-20">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/5 to-transparent overflow-hidden" />

            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FaBoxOpen className="text-emerald-600" /> Add Product Item ({isLocalParty ? "Local CGST+SGST" : "Central IGST"})
              </h3>

              {/* FIELD CONTROL CHECKBOX POPOVER TOGGLE */}
              <div className="relative" ref={fieldControlRef}>
                <button
                  type="button"
                  onClick={() => setIsFieldControlOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-300 shadow-sm text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer"
                >
                  <FaSlidersH className="text-indigo-600" size={12} />
                  <span>Customize Fields ({Object.values(visibleFields).filter(Boolean).length}/19)</span>
                  <FaChevronDown className="text-slate-400 text-[10px] ml-0.5" />
                </button>

                {/* CHECKBOXES POPOVER MENU (ALL 19 CATEGORIZED FIELDS) */}
                {isFieldControlOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-[460px] z-50 rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 space-y-3 animate-in fade-in zoom-in duration-150 text-xs max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 sticky top-0 bg-white z-10">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FaCheckSquare className="text-indigo-600" size={14} /> Customize Available Fields
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFieldControlOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>

                    {/* Category 1: Item Identity & Location */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Item Identity & Location</div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 font-medium">
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.code} onChange={() => setVisibleFields(p => ({...p, code: !p.code}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Product Code</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.pack} onChange={() => setVisibleFields(p => ({...p, pack: !p.pack}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Pack Size</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.unit} onChange={() => setVisibleFields(p => ({...p, unit: !p.unit}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Unit (Box/Pcs)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.hsn} onChange={() => setVisibleFields(p => ({...p, hsn: !p.hsn}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>HSN Code</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.companyName} onChange={() => setVisibleFields(p => ({...p, companyName: !p.companyName}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Manufacturer</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.rack} onChange={() => setVisibleFields(p => ({...p, rack: !p.rack}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Rack Location</span>
                        </label>
                      </div>
                    </div>

                    {/* Category 2: Batch & Dates */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Batch & Dates</div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 font-medium">
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.batch} onChange={() => setVisibleFields(p => ({...p, batch: !p.batch}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Batch Number</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.expiry} onChange={() => setVisibleFields(p => ({...p, expiry: !p.expiry}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Expiry Date</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.mfg} onChange={() => setVisibleFields(p => ({...p, mfg: !p.mfg}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>MFG Date</span>
                        </label>
                      </div>
                    </div>

                    {/* Category 3: Quantities & Rates */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Quantities & Rates</div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 font-medium">
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.qty} onChange={() => setVisibleFields(p => ({...p, qty: !p.qty}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Billing Qty</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.freeQty} onChange={() => setVisibleFields(p => ({...p, freeQty: !p.freeQty}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Free Qty (Scheme)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.mrp} onChange={() => setVisibleFields(p => ({...p, mrp: !p.mrp}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>MRP (₹)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.prate} onChange={() => setVisibleFields(p => ({...p, prate: !p.prate}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Purchase Rate</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.rate} onChange={() => setVisibleFields(p => ({...p, rate: !p.rate}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Sale Rate (₹)</span>
                        </label>
                      </div>
                    </div>

                    {/* Category 4: Discounts & Taxes */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Discounts & Taxes</div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 font-medium">
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.disc} onChange={() => setVisibleFields(p => ({...p, disc: !p.disc}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Trade Disc (%)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.cashDisc} onChange={() => setVisibleFields(p => ({...p, cashDisc: !p.cashDisc}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Cash Disc (%)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.tax} onChange={() => setVisibleFields(p => ({...p, tax: !p.tax}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Tax (GST %)</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.cess} onChange={() => setVisibleFields(p => ({...p, cess: !p.cess}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Cess (%)</span>
                        </label>
                      </div>
                    </div>

                    {/* Category 5: Remarks */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Remarks & Notes</div>
                      <div className="grid grid-cols-1 gap-1 text-slate-700 font-medium">
                        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                          <input type="checkbox" checked={visibleFields.remark} onChange={() => setVisibleFields(p => ({...p, remark: !p.remark}))} className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                          <span>Item Remark / Note</span>
                        </label>
                      </div>
                    </div>

                    {/* Preset Controls */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] sticky bottom-0 bg-white z-10">
                      <button
                        type="button"
                        onClick={() => setVisibleFields({
                          code: true, pack: true, unit: true, hsn: true, batch: true, expiry: true, mfg: true,
                          qty: true, freeQty: true, mrp: true, prate: true, rate: true, disc: true, cashDisc: true,
                          tax: true, cess: true, companyName: true, rack: true, remark: true,
                        })}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Select All (19)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleFields({
                          code: true, pack: true, unit: true, hsn: false, batch: true, expiry: true, mfg: false,
                          qty: true, freeQty: true, mrp: true, prate: false, rate: true, disc: true, cashDisc: false,
                          tax: true, cess: false, companyName: false, rack: false, remark: false,
                        })}
                        className="text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Pharma Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleFields({
                          code: false, pack: false, unit: false, hsn: false, batch: false, expiry: false, mfg: false,
                          qty: true, freeQty: false, mrp: false, prate: false, rate: true, disc: false, cashDisc: false,
                          tax: true, cess: false, companyName: false, rack: false, remark: false,
                        })}
                        className="text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        Minimal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">

              {/* Row 1: Medicine Selection, Pack, Unit, HSN, Code, Company, Rack */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* SEARCHABLE PRODUCT COMBOBOX */}
                <div className="sm:col-span-2 relative" ref={prodDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Medicine Product <span className="text-rose-500">*</span>
                  </label>
                  {loadingInitial ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <FaSpinner className="animate-spin text-emerald-600" /> Loading products...
                    </div>
                  ) : (
                    <div>
                      <div
                        onClick={() => setIsProdDropdownOpen((prev) => !prev)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white/90 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-emerald-600 shadow-sm"
                      >
                        <span className={selectedProduct ? "font-bold text-slate-800" : "text-slate-400"}>
                          {selectedProduct
                            ? `${selectedProduct.NAME} ${selectedProduct.PACK ? `(${selectedProduct.PACK})` : ""} [Stock: ${selectedProduct.CLBAL || selectedProduct.STOCK || 0}]`
                            : "-- Search & Select Medicine Product --"}
                        </span>
                        <FaChevronDown className="text-slate-400 text-[10px]" />
                      </div>

                      {/* Product Search Dropdown Menu */}
                      {isProdDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                            <FaSearch size={11} className="text-slate-400 ml-1" />
                            <input
                              type="text"
                              value={prodSearch}
                              onChange={(e) => setProdSearch(e.target.value)}
                              placeholder="Search medicine by name, code, pack, company..."
                              autoFocus
                              className="w-full bg-transparent text-xs outline-none text-slate-800"
                            />
                            {prodSearch && (
                              <button onClick={() => setProdSearch("")} className="text-slate-400 hover:text-slate-600">
                                <FaTimes size={10} />
                              </button>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                            {filteredProducts.length === 0 ? (
                              <div className="p-3 text-center text-slate-400">No medicine products matching "{prodSearch}"</div>
                            ) : (
                              filteredProducts.map((p, idx) => {
                                const code = p.PRODUCT || p.CODE || p.NAME || "";
                                const stock = Number(p.CLBAL || p.STOCK || 0);
                                const isSelected = draftProdCode === code;
                                return (
                                  <div
                                    key={`${code}-${idx}`}
                                    onClick={() => {
                                      setDraftProdCode(code);
                                      setIsProdDropdownOpen(false);
                                    }}
                                    className={`p-2.5 hover:bg-emerald-50/70 cursor-pointer transition flex items-center justify-between ${
                                      isSelected ? "bg-emerald-50 font-bold text-emerald-900" : "text-slate-700"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-800">
                                        {p.NAME} {p.PACK ? <span className="text-[10px] text-slate-500">({p.PACK})</span> : null}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        MRP: ₹{p.MRP || 0} {p.companyName && p.companyName !== "N/A" && p.companyName !== "ZZZZZZ 144" ? `• ${p.companyName}` : ""}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                                      }`}>
                                        Stock: {stock}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Batch Selection Field */}
                {visibleFields.batch && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
                    {selectedProduct && selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                      <select
                        value={draftBatch}
                        onChange={(e) => handleBatchSelect(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-emerald-800"
                      >
                        {selectedProduct.batches.map((b, idx) => (
                          <option key={`${b.batchNo}-${idx}`} value={b.batchNo}>
                            {b.batchNo} {b.expiry ? `(Exp: ${b.expiry})` : ""} {b.stock ? `[Stock: ${b.stock}]` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={draftBatch}
                        onChange={(e) => setDraftBatch(e.target.value)}
                        placeholder="Batch No"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                      />
                    )}
                  </div>
                )}

                {/* Expiry Date */}
                {visibleFields.expiry && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={draftExpiry}
                      onChange={(e) => setDraftExpiry(e.target.value)}
                      placeholder="MM/YY or YYYY-MM"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {/* Optional Item Identity Extra Fields */}
                {visibleFields.pack && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pack Size</label>
                    <input
                      type="text"
                      value={draftPack}
                      onChange={(e) => setDraftPack(e.target.value)}
                      placeholder="e.g. 10x10, 100ml"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {visibleFields.unit && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value)}
                      placeholder="Box / Pcs"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {visibleFields.hsn && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={draftHsn}
                      onChange={(e) => setDraftHsn(e.target.value)}
                      placeholder="HSN / SAC"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {visibleFields.mfg && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">MFG Date</label>
                    <input
                      type="text"
                      value={draftMfg}
                      onChange={(e) => setDraftMfg(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {visibleFields.companyName && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer / Brand</label>
                    <input
                      type="text"
                      value={draftCompanyName}
                      onChange={(e) => setDraftCompanyName(e.target.value)}
                      placeholder="Company Name"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}

                {visibleFields.rack && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rack Location</label>
                    <input
                      type="text"
                      value={draftRack}
                      onChange={(e) => setDraftRack(e.target.value)}
                      placeholder="Rack / Shelf"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                    />
                  </div>
                )}
              </div>

              {/* Row 2: Quantities, Rates, Discounts & Taxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {visibleFields.qty && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value ? Number(e.target.value) : "")}
                      placeholder="1"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-bold text-slate-800"
                    />
                  </div>
                )}

                {visibleFields.freeQty && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Free Qty (Scheme)</label>
                    <input
                      type="number"
                      min="0"
                      value={draftFreeQty}
                      onChange={(e) => setDraftFreeQty(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-medium text-slate-800"
                    />
                  </div>
                )}

                {visibleFields.prate && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftPrate}
                      onChange={(e) => setDraftPrate(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 text-slate-600"
                    />
                  </div>
                )}

                {visibleFields.mrp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftMrp}
                      onChange={(e) => setDraftMrp(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-medium text-slate-700"
                    />
                  </div>
                )}

                {visibleFields.rate && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Rate (₹) {selectedCustomer?.PRICE ? `[${selectedCustomer.PRICE}]` : "[Rate F]"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftRate}
                      onChange={(e) => setDraftRate(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0.00"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-bold text-emerald-700"
                    />
                  </div>
                )}

                {visibleFields.disc && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Disc (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftDisc}
                      onChange={(e) => setDraftDisc(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0%"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-indigo-700"
                    />
                  </div>
                )}

                {visibleFields.cashDisc && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cash Disc (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftCashDisc}
                      onChange={(e) => setDraftCashDisc(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0%"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-indigo-700"
                    />
                  </div>
                )}

                {/* Dynamic Tax Inputs: CGST+SGST for Local vs IGST for Central */}
                {visibleFields.tax && (
                  isLocalParty ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">CGST / SGST (%)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={draftCgst}
                          onChange={(e) => setDraftCgst(e.target.value ? Number(e.target.value) : "")}
                          placeholder="CGST"
                          className="w-full px-2 py-2 text-[11px] rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={draftSgst}
                          onChange={(e) => setDraftSgst(e.target.value ? Number(e.target.value) : "")}
                          placeholder="SGST"
                          className="w-full px-2 py-2 text-[11px] rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">IGST (%) [Central]</label>
                      <input
                        type="number"
                        step="0.01"
                        value={draftIgst}
                        onChange={(e) => setDraftIgst(e.target.value ? Number(e.target.value) : "")}
                        placeholder="IGST %"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-600 outline-none bg-blue-50/50 font-bold text-blue-800"
                      />
                    </div>
                  )
                )}

                {visibleFields.cess && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cess (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftCess}
                      onChange={(e) => setDraftCess(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0%"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-medium"
                    />
                  </div>
                )}
              </div>

              {visibleFields.remark && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Remark / Note</label>
                  <input
                    type="text"
                    value={draftRemark}
                    onChange={(e) => setDraftRemark(e.target.value)}
                    placeholder="Optional item note or instructions..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                  />
                </div>
              )}

              {/* Stock Warning Banner if (Qty + FreeQty) > Stock */}
              {selectedProduct && (Number(draftQty || 0) + Number(draftFreeQty || 0)) > Number(selectedProduct.CLBAL || selectedProduct.STOCK || 0) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                  <FaExclamationTriangle className="text-amber-600 flex-shrink-0" />
                  <span>Warning: Total Qty (Billing: {draftQty} + Free: {draftFreeQty}) exceeds Available Stock ({selectedProduct.CLBAL || selectedProduct.STOCK || 0}).</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <FaPlus size={11} /> Add to Invoice Table
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Added Items Table */}
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Invoice Items List ({items.length})</span>
            </h3>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No items added yet. Use the form above to add medicine products to this invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product</th>
                      {visibleFields.code && <th className="py-2.5 px-3">Code</th>}
                      {visibleFields.pack && <th className="py-2.5 px-3">Pack</th>}
                      {visibleFields.hsn && <th className="py-2.5 px-3">HSN</th>}
                      {visibleFields.batch && <th className="py-2.5 px-3">Batch</th>}
                      {visibleFields.expiry && <th className="py-2.5 px-3">Expiry</th>}
                      {visibleFields.qty && (
                        <th className="py-2.5 px-3 text-right">
                          Qty {visibleFields.freeQty ? "+ Free" : ""}
                        </th>
                      )}
                      {visibleFields.mrp && <th className="py-2.5 px-3 text-right">MRP (₹)</th>}
                      {visibleFields.rate && <th className="py-2.5 px-3 text-right">Rate (₹)</th>}
                      {visibleFields.disc && <th className="py-2.5 px-3 text-right">Disc %</th>}
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      {visibleFields.tax && (
                        <th className="py-2.5 px-3 text-right">
                          {isLocalParty ? "CGST + SGST" : "IGST"}
                        </th>
                      )}
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.name} {item.companyName ? <span className="text-[10px] text-slate-400 font-normal">({item.companyName})</span> : ""}
                        </td>
                        {visibleFields.code && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{item.code}</td>}
                        {visibleFields.pack && <td className="py-2.5 px-3 text-slate-600">{item.pack}</td>}
                        {visibleFields.hsn && <td className="py-2.5 px-3 text-slate-500">{item.hsn || "-"}</td>}
                        {visibleFields.batch && <td className="py-2.5 px-3 text-slate-600">{item.batch}</td>}
                        {visibleFields.expiry && <td className="py-2.5 px-3 text-slate-500">{item.expiry || "-"}</td>}
                        {visibleFields.qty && (
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {item.qty} {visibleFields.freeQty && item.freeQty > 0 ? <span className="text-emerald-600 text-[10px]">(+{item.freeQty} Free)</span> : ""}
                          </td>
                        )}
                        {visibleFields.mrp && <td className="py-2.5 px-3 text-right text-slate-600">₹{item.mrp.toFixed(2)}</td>}
                        {visibleFields.rate && <td className="py-2.5 px-3 text-right text-emerald-700">₹{item.rate.toFixed(2)}</td>}
                        {visibleFields.disc && <td className="py-2.5 px-3 text-right text-indigo-700">{item.disc > 0 ? `${item.disc}%` : "-"}</td>}
                        <td className="py-2.5 px-3 text-right">₹{item.taxableAmount.toFixed(2)}</td>
                        {visibleFields.tax && (
                          <td className="py-2.5 px-3 text-right text-amber-600">
                            {item.igst > 0 ? `₹${item.taxAmount.toFixed(2)} (${item.igst}%)` : `₹${item.taxAmount.toFixed(2)} (${item.cgst + item.sgst}%)`}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{item.finalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 transition cursor-pointer"
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1-Column: Invoice Summary & Submit Action */}
        <div className="space-y-6">
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-6 space-y-5 sticky top-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/5 to-transparent" />
            
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 m-0 flex items-center justify-between">
              <span>Invoice Summary</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isLocalParty ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
              }`}>
                {isLocalParty ? "Local" : "Central"}
              </span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-semibold text-slate-800">₹{invoiceSummary.totalTaxable.toFixed(2)}</span>
              </div>

              {isLocalParty ? (
                <>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>CGST Amount:</span>
                    <span className="font-semibold text-slate-800">₹{invoiceSummary.totalCgst.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>SGST Amount:</span>
                    <span className="font-semibold text-slate-800">₹{invoiceSummary.totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-blue-800 font-medium">
                  <span>IGST Amount (Central):</span>
                  <span className="font-semibold text-blue-900">₹{invoiceSummary.totalIgst.toFixed(2)}</span>
                </div>
              )}

              {invoiceSummary.totalCess > 0 && (
                <div className="flex items-center justify-between text-amber-800 font-medium">
                  <span>Cess Amount:</span>
                  <span className="font-semibold text-amber-900">₹{invoiceSummary.totalCess.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-semibold text-slate-600">{invoiceSummary.roundOff.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                <span className="text-lg font-black text-indigo-700">₹{invoiceSummary.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={handleSubmitInvoice}
                disabled={submitting || items.length === 0 || !selectedCustomerCode}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#343872] to-indigo-700 shadow-lg hover:from-[#2a2d5c] hover:to-indigo-800 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    <span>Generating Sale Invoice...</span>
                  </>
                ) : (
                  <>
                    <FaFileInvoiceDollar size={14} />
                    <span>Generate Sale Invoice</span>
                  </>
                )}
              </button>

              <Link
                href="/dashboard/sales/invoice"
                className="block text-center py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
