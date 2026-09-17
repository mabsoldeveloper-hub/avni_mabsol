"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import SupplierHistoryPanel from "@/components/purchase/SupplierHistoryPanel";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaSave,
  FaBuilding,
  FaFileInvoice,
  FaBoxes,
  FaUser,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaReceipt,
  FaSearch,
  FaShieldAlt,
  FaSlidersH,
  FaListUl,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaTruck,
  FaUndoAlt,
  FaHistory,
} from "react-icons/fa";

interface BillItem {
  productId?: string;
  productCode?: string;
  companyName?: string;
  productName: string;
  hsnCode: string;
  batchNo: string;
  mfgDate?: string;
  expDate: string;
  mrp: number;
  qty: number;
  freeQty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  schemeDiscountPercent?: number;
  gstPercent: number;
  location?: string;
  itemRemark?: string;
}

interface SupplierMaster {
  id: string;
  code: string;
  name: string;
  gst: string;
  phone: string;
  city: string;
  address: string;
  isCreditor: boolean;
}

interface ProductMaster {
  id: string;
  code: string;
  name: string;
  hsn: string;
  purchaseRate: number;
  mrp: number;
  gstPercent: number;
  unit: string;
  companyName?: string;
}

interface POSelectOption {
  _id: string;
  poNumber: string;
  poDate: string;
  vendorName: string;
  vendorCode?: string;
  vendorGst?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  netTotal: number;
  items: any[];
}

// Column Visibility State
export interface ColumnConfig {
  itemCode: boolean;
  company: boolean;
  hsn: boolean;
  pack: boolean;
  batch: boolean;
  mfgDate: boolean;
  expDate: boolean;
  mrp: boolean;
  freeQty: boolean;
  grossAmt: boolean;
  tradeDisc: boolean;
  discAmt: boolean;
  schemeDisc: boolean;
  taxableAmt: boolean;
  gst: boolean;
  cgstAmt: boolean;
  sgstAmt: boolean;
  igstAmt: boolean;
  gstAmt: boolean;
  netCost: boolean;
  margin: boolean;
  location: boolean;
  itemRemark: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig = {
  itemCode: false,
  company: false,
  hsn: true,
  pack: true,
  batch: true,
  mfgDate: true,
  expDate: true,
  mrp: true,
  freeQty: true,
  grossAmt: false,
  tradeDisc: true,
  discAmt: false,
  schemeDisc: false,
  taxableAmt: true,
  gst: true,
  cgstAmt: false,
  sgstAmt: false,
  igstAmt: false,
  gstAmt: true,
  netCost: false,
  margin: false,
  location: false,
  itemRemark: false,
};

export const COLUMN_PRESETS: Record<string, { label: string; badge: string; config: ColumnConfig }> = {
  default: {
    label: "Pharma Standard",
    badge: "11 Cols",
    config: DEFAULT_COLUMNS,
  },
  all: {
    label: "Select All Fields",
    badge: "23 Cols",
    config: {
      itemCode: true,
      company: true,
      hsn: true,
      pack: true,
      batch: true,
      mfgDate: true,
      expDate: true,
      mrp: true,
      freeQty: true,
      grossAmt: true,
      tradeDisc: true,
      discAmt: true,
      schemeDisc: true,
      taxableAmt: true,
      gst: true,
      cgstAmt: true,
      sgstAmt: true,
      igstAmt: true,
      gstAmt: true,
      netCost: true,
      margin: true,
      location: true,
      itemRemark: true,
    },
  },
  taxBreakdown: {
    label: "Detailed Tax Split",
    badge: "12 Cols",
    config: {
      itemCode: false,
      company: false,
      hsn: true,
      pack: false,
      batch: true,
      mfgDate: false,
      expDate: true,
      mrp: true,
      freeQty: false,
      grossAmt: true,
      tradeDisc: true,
      discAmt: true,
      schemeDisc: false,
      taxableAmt: true,
      gst: true,
      cgstAmt: true,
      sgstAmt: true,
      igstAmt: true,
      gstAmt: true,
      netCost: false,
      margin: false,
      location: false,
      itemRemark: false,
    },
  },
  marginCost: {
    label: "Margin & Costing",
    badge: "10 Cols",
    config: {
      itemCode: false,
      company: true,
      hsn: false,
      pack: true,
      batch: true,
      mfgDate: false,
      expDate: true,
      mrp: true,
      freeQty: true,
      grossAmt: false,
      tradeDisc: true,
      discAmt: false,
      schemeDisc: false,
      taxableAmt: true,
      gst: true,
      cgstAmt: false,
      sgstAmt: false,
      igstAmt: false,
      gstAmt: false,
      netCost: true,
      margin: true,
      location: true,
      itemRemark: false,
    },
  },
  compact: {
    label: "Compact / Minimal",
    badge: "5 Cols",
    config: {
      itemCode: false,
      company: false,
      hsn: false,
      pack: true,
      batch: true,
      mfgDate: false,
      expDate: true,
      mrp: true,
      freeQty: false,
      grossAmt: false,
      tradeDisc: false,
      discAmt: false,
      schemeDisc: false,
      taxableAmt: false,
      gst: true,
      cgstAmt: false,
      sgstAmt: false,
      igstAmt: false,
      gstAmt: false,
      netCost: false,
      margin: false,
      location: false,
      itemRemark: false,
    },
  },
};

export const COLUMN_GROUPS = [
  {
    category: "Product & Packaging",
    tag: "Core",
    color: "amber",
    columns: [
      { key: "itemCode" as const, label: "Item / Product Code", desc: "SKU or system code" },
      { key: "company" as const, label: "Brand / Mfr Name", desc: "Pharma company or division" },
      { key: "hsn" as const, label: "HSN Code", desc: "Tax classification code" },
      { key: "pack" as const, label: "Pack / Unit", desc: "Strip, Box, Bottle size" },
    ],
  },
  {
    category: "Batch & Shelf Life",
    tag: "Dates",
    color: "blue",
    columns: [
      { key: "batch" as const, label: "Batch Number", desc: "Manufacturing batch code" },
      { key: "mfgDate" as const, label: "Mfg Date (MM/YY)", desc: "Production month/year" },
      { key: "expDate" as const, label: "Expiry Date (MM/YY)", desc: "Shelf expiry month/year" },
    ],
  },
  {
    category: "Pricing, Scheme & Discounts",
    tag: "Pricing",
    color: "emerald",
    columns: [
      { key: "mrp" as const, label: "MRP (₹)", desc: "Maximum Retail Price" },
      { key: "freeQty" as const, label: "Free / Bonus Qty", desc: "Deal / scheme bonus units" },
      { key: "grossAmt" as const, label: "Gross Amount (₹)", desc: "Billed Qty × Rate" },
      { key: "tradeDisc" as const, label: "Trade Disc %", desc: "Primary trade discount %" },
      { key: "discAmt" as const, label: "Discount Total (₹)", desc: "Total discount value in ₹" },
      { key: "schemeDisc" as const, label: "Scheme Disc %", desc: "Secondary scheme discount %" },
    ],
  },
  {
    category: "GST & Tax Breakdown",
    tag: "Taxation",
    color: "purple",
    columns: [
      { key: "taxableAmt" as const, label: "Taxable Value (₹)", desc: "Value subject to GST" },
      { key: "gst" as const, label: "GST Rate %", desc: "5%, 12%, 18%, 28%" },
      { key: "cgstAmt" as const, label: "CGST (₹)", desc: "Central GST (Intrastate)" },
      { key: "sgstAmt" as const, label: "SGST (₹)", desc: "State GST (Intrastate)" },
      { key: "igstAmt" as const, label: "IGST (₹)", desc: "Integrated GST (Interstate)" },
      { key: "gstAmt" as const, label: "Total GST (₹)", desc: "Combined tax amount" },
    ],
  },
  {
    category: "Costing, Margins & Storage",
    tag: "Analytics",
    color: "teal",
    columns: [
      { key: "netCost" as const, label: "Net Cost / Unit (₹)", desc: "Cost per unit with tax & free" },
      { key: "margin" as const, label: "Profit Margin %", desc: "Gross margin vs MRP" },
      { key: "location" as const, label: "Rack / Shelf / Bin", desc: "Storage location in store" },
      { key: "itemRemark" as const, label: "Item Note / Remark", desc: "Line-specific remarks" },
    ],
  },
];

function getGstStateCode(gstin?: string): string {
  if (!gstin) return "";
  const cleaned = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned.substring(0, 2))) {
    return cleaned.substring(0, 2);
  }
  return "";
}

export default function PurchaseBillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPoId = searchParams.get("poId");

  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [suppliersList, setSuppliersList] = useState<SupplierMaster[]>([]);
  const [productsList, setProductsList] = useState<ProductMaster[]>([]);

  // Form State
  const [billNumberCustom, setBillNumberCustom] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [poId, setPoId] = useState<string | null>(urlPoId || null);
  const [poNumber, setPoNumber] = useState<string>("");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [remarks, setRemarks] = useState("");
  const [taxType, setTaxType] = useState<"Intrastate" | "Interstate">("Intrastate");

  // Column Customization Visibility Checkboxes
  const [showColSettings, setShowColSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);

  // Load saved column preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mabsol_purchase_cols_pref");
      if (saved) {
        const parsed = JSON.parse(saved);
        setColumns((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleApplyPreset = (presetKey: string) => {
    const preset = COLUMN_PRESETS[presetKey];
    if (preset) {
      setColumns(preset.config);
      try {
        localStorage.setItem("mabsol_purchase_cols_pref", JSON.stringify(preset.config));
      } catch { }
    }
  };

  // Toggle Column Visibility
  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("mabsol_purchase_cols_pref", JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  // Quick Multi-Product Selection Drawer
  const [showMultiProductModal, setShowMultiProductModal] = useState(false);
  const [prodSearch, setProdSearch] = useState("");

  // Supplier History Panel Toggle State
  const [showSupplierHistory, setShowSupplierHistory] = useState(true);

  // Initial Empty Row
  const [items, setItems] = useState<BillItem[]>([
    {
      productName: "",
      productCode: "",
      companyName: "",
      hsnCode: "",
      batchNo: "BATCH-01",
      expDate: "2027-12",
      mfgDate: "",
      mrp: 0,
      qty: 1,
      freeQty: 0,
      unit: "Box",
      rate: 0,
      discountPercent: 0,
      schemeDiscountPercent: 0,
      gstPercent: 12,
      location: "",
      itemRemark: "",
    },
  ]);

  // PO Import Modal state
  const [showPoModal, setShowPoModal] = useState(false);
  const [poList, setPoList] = useState<POSelectOption[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poSearch, setPoSearch] = useState("");

  // Fetch Master Data (Suppliers & Products)
  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

      const res = await fetch(`/api/purchase/master-options?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSuppliersList(json.suppliers || []);
          setProductsList(json.products || []);
        }
      }
    } catch (err) {
      console.error("Master Options Error:", err);
    } finally {
      setLoadingMasters(false);
    }
  }, [selectedCompany]);

  // Auto-Fetch Next Bill Number VCN
  const fetchNextBillVcn = useCallback(async () => {
    try {
      const res = await fetch("/api/purchase/invoice?action=nextNumber");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.nextVcn) {
          setBillNumberCustom(json.nextVcn);
        }
      }
    } catch (err) {
      console.error("Fetch Next Bill VCN Error:", err);
    }
  }, []);

  // Auto-import PO if poId parameter is provided in URL
  const fetchPoFromUrl = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/purchase/orders?id=${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.order) {
          const po = json.order;
          setPoId(po._id);
          setPoNumber(po.poNumber);
          setVendorName(po.vendorName || "");
          setVendorCode(po.vendorCode || "");
          setVendorGst(po.vendorGst || "");
          setVendorPhone(po.vendorPhone || "");
          setVendorAddress(po.vendorAddress || "");

          if (po.items && po.items.length > 0) {
            const importedItems: BillItem[] = po.items.map((it: any) => ({
              productId: it.productId || "",
              productCode: it.productCode || "",
              companyName: it.companyName || "",
              productName: it.productName || "",
              hsnCode: it.hsnCode || "30049099",
              batchNo: it.batchNo || "BATCH-01",
              expDate: it.expDate || "2027-12",
              mfgDate: it.mfgDate || "",
              mrp: Number(it.mrp || 0) || Math.round(Number(it.rate || 0) * 1.3),
              qty: Number(it.qty || 1),
              freeQty: Number(it.freeQty || 0),
              unit: it.unit || "Box",
              rate: Number(it.rate || 0),
              discountPercent: Number(it.discountPercent || 0),
              schemeDiscountPercent: Number(it.schemeDiscountPercent || 0),
              gstPercent: Number(it.gstPercent || 12),
              location: it.location || "",
              itemRemark: it.itemRemark || "",
            }));
            setItems(importedItems);
          }
        }
      }
    } catch (err) {
      console.error("Error importing PO from URL:", err);
    }
  }, []);

  useEffect(() => {
    fetchMasters();
    fetchNextBillVcn();
    if (urlPoId) {
      fetchPoFromUrl(urlPoId);
    }
  }, [fetchMasters, fetchNextBillVcn, urlPoId, fetchPoFromUrl]);

  // Auto-Detect Intrastate vs Interstate tax based on GST State Codes
  useEffect(() => {
    const compGst = selectedCompany?.gstNo || "";
    const compStateCode = getGstStateCode(compGst);
    const suppStateCode = getGstStateCode(vendorGst);

    if (compStateCode && suppStateCode) {
      if (compStateCode === suppStateCode) {
        setTaxType("Intrastate");
      } else {
        setTaxType("Interstate");
      }
    }
  }, [selectedCompany, vendorGst]);

  // Handle Supplier Selection
  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const supp = suppliersList.find((s) => s.id === supplierId || s.code === supplierId || s.name === supplierId);
    if (supp) {
      setVendorName(supp.name);
      setVendorCode(supp.code);
      setVendorGst(supp.gst);
      setVendorPhone(supp.phone);
      setVendorAddress(supp.address ? `${supp.address}, ${supp.city}` : supp.city);
    }
  };

  // Handle Product Selection for a Row
  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsList.find((p) => p.id === productId || p.code === productId);
    if (prod) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productCode: prod.code || "",
        productName: prod.name,
        companyName: prod.companyName || "",
        hsnCode: prod.hsn || "30049099",
        rate: prod.purchaseRate || 0,
        mrp: prod.mrp || Math.round((prod.purchaseRate || 0) * 1.3),
        gstPercent: prod.gstPercent || 12,
        unit: prod.unit || "Box",
        qty: updated[index].qty > 0 ? updated[index].qty : 1,
      };
      setItems(updated);
    }
  };

  // Quick Add Product from Catalog Modal
  const handleQuickAddProduct = (prod: ProductMaster) => {
    const newItem: BillItem = {
      productId: prod.id,
      productCode: prod.code || "",
      productName: prod.name,
      companyName: prod.companyName || "",
      hsnCode: prod.hsn || "30049099",
      batchNo: "BATCH-01",
      expDate: "2027-12",
      mfgDate: "",
      mrp: prod.mrp || Math.round((prod.purchaseRate || 0) * 1.3),
      qty: 1,
      freeQty: 0,
      unit: prod.unit || "Box",
      rate: prod.purchaseRate || 0,
      discountPercent: 0,
      schemeDiscountPercent: 0,
      gstPercent: prod.gstPercent || 12,
      location: "",
      itemRemark: "",
    };

    if (items.length === 1 && !items[0].productName) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  // Fetch pending POs when modal is opened
  const fetchPendingPOs = async () => {
    setLoadingPOs(true);
    try {
      const res = await fetch("/api/purchase/orders?status=Pending");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPoList(json.orders || []);
        }
      }
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoadingPOs(false);
    }
  };

  const openPoModal = () => {
    setShowPoModal(true);
    fetchPendingPOs();
  };

  // Import selected PO into Purchase Bill form
  const handleImportPO = (po: POSelectOption) => {
    setPoId(po._id);
    setPoNumber(po.poNumber);
    setVendorName(po.vendorName || "");
    setVendorCode(po.vendorCode || "");
    setVendorGst(po.vendorGst || "");
    setVendorPhone(po.vendorPhone || "");
    setVendorAddress(po.vendorAddress || "");

    if (po.items && po.items.length > 0) {
      const importedItems: BillItem[] = po.items.map((it: any) => ({
        productId: it.productId || "",
        productCode: it.productCode || "",
        companyName: it.companyName || "",
        productName: it.productName || "",
        hsnCode: it.hsnCode || "30049099",
        batchNo: it.batchNo || "BATCH-01",
        expDate: it.expDate || "2027-12",
        mfgDate: it.mfgDate || "",
        mrp: Number(it.mrp || 0) || Math.round(Number(it.rate || 0) * 1.3),
        qty: Number(it.qty || 1),
        freeQty: Number(it.freeQty || 0),
        unit: it.unit || "Box",
        rate: Number(it.rate || 0),
        discountPercent: Number(it.discountPercent || 0),
        schemeDiscountPercent: Number(it.schemeDiscountPercent || 0),
        gstPercent: Number(it.gstPercent || 12),
        location: it.location || "",
        itemRemark: it.itemRemark || "",
      }));
      setItems(importedItems);
    }

    setShowPoModal(false);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        productCode: "",
        companyName: "",
        hsnCode: "",
        batchNo: "BATCH-01",
        expDate: "2027-12",
        mfgDate: "",
        mrp: 0,
        qty: 1,
        freeQty: 0,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        schemeDiscountPercent: 0,
        gstPercent: 12,
        location: "",
        itemRemark: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Options for SearchableSelect
  const supplierOptions: OptionItem[] = suppliersList.map((s) => ({
    value: s.id,
    label: s.name,
    subLabel: `${s.code ? `Code: ${s.code}` : ""} ${s.city ? `| City: ${s.city}` : ""} ${s.gst ? `| GST: ${s.gst}` : ""}`,
  }));

  const productOptions: OptionItem[] = productsList.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `${p.companyName ? `Comp: ${p.companyName} | ` : ""}Rate: ₹${p.purchaseRate} | HSN: ${p.hsn}`,
  }));

  // Line & Overall Calculations
  const calculatedItems = items.map((it) => {
    const isSelected = (it.productName || "").trim() !== "" || Boolean(it.productId);
    const qty = isSelected ? Number(it.qty || 0) : 0;
    const freeQty = isSelected ? Number(it.freeQty || 0) : 0;
    const rate = isSelected ? Number(it.rate || 0) : 0;
    const mrp = Number(it.mrp || 0);
    const tradeDisc = Number(it.discountPercent || 0);
    const schemeDisc = Number(it.schemeDiscountPercent || 0);
    const gst = Number(it.gstPercent || 0);

    const gross = qty * rate;
    const tradeDiscAmt = gross * (tradeDisc / 100);
    const afterTradeDisc = Math.max(0, gross - tradeDiscAmt);
    const schemeDiscAmt = afterTradeDisc * (schemeDisc / 100);
    const totalDiscAmt = tradeDiscAmt + schemeDiscAmt;
    const taxable = Math.max(0, gross - totalDiscAmt);
    const gstAmt = taxable * (gst / 100);
    const lineTotal = taxable + gstAmt;

    const isInter = taxType === "Interstate";
    const igstAmt = isInter ? gstAmt : 0;
    const cgstAmt = isInter ? 0 : gstAmt / 2;
    const sgstAmt = isInter ? 0 : gstAmt / 2;

    const totalUnits = qty + freeQty;
    const netCostPerUnit = totalUnits > 0 ? lineTotal / totalUnits : rate;
    const profitMargin = mrp > 0 ? Math.max(0, ((mrp - netCostPerUnit) / mrp) * 100) : 0;

    return {
      ...it,
      isSelected,
      gross,
      tradeDiscAmt,
      schemeDiscAmt,
      discAmt: totalDiscAmt,
      taxable,
      gstAmt,
      cgstAmt,
      sgstAmt,
      igstAmt,
      lineTotal,
      netCostPerUnit,
      profitMargin,
    };
  });

  const subtotal = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gross : 0), 0);
  const totalDiscount = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.discAmt : 0), 0);
  const totalTax = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gstAmt : 0), 0);
  const totalCGST = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.cgstAmt : 0), 0);
  const totalSGST = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.sgstAmt : 0), 0);
  const totalIGST = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.igstAmt : 0), 0);
  const rawNet = subtotal - totalDiscount + totalTax;
  const netAmount = Math.round(rawNet);
  const roundOff = Math.round((netAmount - rawNet) * 100) / 100;
  const balance = Math.max(0, netAmount - paidAmount);

  const compStateCode = getGstStateCode(selectedCompany?.gstNo);
  const suppStateCode = getGstStateCode(vendorGst);
  const isInterstate = taxType === "Interstate";


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert("Please select or enter Supplier / Vendor Name");
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      alert("Please select at least one Product Item");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billNumber: billNumberCustom,
          supplierInvoiceNo,
          poId,
          poNumber,
          companyId: selectedCompany?._id,
          companyCode: selectedCompany?.companyCode,
          fyId: selectedFY?._id,
          fyCode: selectedFY?.fyCode,
          billDate,
          dueDate,
          vendorName,
          vendorCode,
          vendorGst,
          vendorPhone,
          vendorAddress,
          items: validItems,
          subtotal,
          totalDiscount,
          cgst: isInterstate ? 0 : totalCGST,
          sgst: isInterstate ? 0 : totalSGST,
          igst: isInterstate ? totalIGST : 0,
          totalTax,
          netAmount,
          paidAmount,
          paymentMode,
          remarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Purchase Bill ${json.bill.billNumber} created successfully!`);
        router.push("/dashboard/purchase/invoice");
      } else {
        alert(json.message || "Failed to create Purchase Bill");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving Purchase Bill");
    } finally {
      setSaving(false);
    }
  };

  const filteredPOs = poList.filter((po) =>
    po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
  );

  const filteredModalProducts = productsList.filter((p) =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.companyName || "").toLowerCase().includes(prodSearch.toLowerCase())
  );

  return (
    // <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
    <div className="container-fluid p-4 md:p-6 space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchase/invoice"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition shadow-xs"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Create Purchase Bill / Invoice
            </h1>
            <p className="text-xs text-slate-500">
              New purchase invoice, inward stock entry & supplier bill
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Product Catalog Trigger */}
          <button
            type="button"
            onClick={() => setShowMultiProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-xs"
          >
            <FaListUl /> Quick Add Products
          </button>

          {/* Customize Columns Trigger */}
          <button
            type="button"
            onClick={() => setShowColSettings(!showColSettings)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
          >
            <FaSlidersH /> Customize Columns ⚙️
          </button>

          {/* Import Purchase Order Trigger */}
          <button
            type="button"
            onClick={openPoModal}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold shadow-md transition-all"
          >
            <FaDownload /> Import from PO
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
          href="/dashboard/purchase/invoice/create"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white shadow-xs font-bold"
        >
          <FaPlus /> Create Bill
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
      </div>

      {/* Linked Purchase Order Alert Banner */}
      {poNumber && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FaTruck className="text-indigo-600" />
            <span>
              Linked Purchase Order: <strong>{poNumber}</strong> (All items & vendor pre-filled)
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setPoId(null); setPoNumber(""); }}
            className="text-xs text-indigo-600 hover:underline font-bold"
          >
            Unlink PO ✕
          </button>
        </div>
      )}

      {/* Auto GST State Code Alert Banner */}
      {(compStateCode || suppStateCode) && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-emerald-600" />
            <span>
              Company GST State: <strong>{compStateCode || "Local"}</strong> | Supplier GST State: <strong>{suppStateCode || "Local"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <FaCheckCircle className="text-emerald-600" />
            <span>Auto Applied: {isInterstate ? "IGST (Interstate)" : "CGST + SGST (Intrastate)"}</span>
          </div>
        </div>
      )}

      {/* Customizable Columns Settings Drawer */}
      {showColSettings && (
        <div className="bg-slate-50 dark:bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-xl animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-sm">
                <FaSlidersH />
              </div>
              <div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  Select Table Fields To Display (Checkboxes)
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50">
                    {Object.values(columns).filter(Boolean).length} / 23 Columns Active
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select or deselect any field to customize your purchase bill item entry table. Preferences are auto-saved.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("all")}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-xs cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const empty: any = {};
                  Object.keys(DEFAULT_COLUMNS).forEach((k) => (empty[k] = false));
                  setColumns(empty);
                  try {
                    localStorage.setItem("mabsol_purchase_cols_pref", JSON.stringify(empty));
                  } catch { }
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowColSettings(false)}
                className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </div>

          {/* Quick 1-Click Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Presets:</span>
            {Object.entries(COLUMN_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
              >
                <span>{preset.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                  {preset.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Categorized Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-2">
            {COLUMN_GROUPS.map((grp, gIdx) => (
              <div
                key={gIdx}
                className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 space-y-2 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5 mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {grp.category}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500">
                      {grp.tag}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {grp.columns.map((col) => {
                      const active = columns[col.key];
                      return (
                        <label
                          key={col.key}
                          title={col.desc}
                          className={`flex items-start gap-2 text-xs font-medium cursor-pointer select-none p-1.5 rounded-xl border transition ${active
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-950 dark:text-amber-200"
                              : "bg-slate-50/50 dark:bg-slate-900/40 border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleColumn(col.key)}
                            className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="leading-tight font-semibold text-[12px]">{col.label}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{col.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor & Invoice Settings Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaUser className="text-amber-600" /> Supplier & Invoice Header
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bill VCN Series (Customizable) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill VCN Number *
              </label>
              <input
                type="text"
                value={billNumberCustom}
                onChange={(e) => setBillNumberCustom(e.target.value)}
                placeholder="PUR-1001"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-extrabold text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Supplier Invoice No */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Inv / Bill No *
              </label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="Vendor Inv # (e.g. INV-9982)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Supplier Searchable Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Select Supplier (Sundry Creditor) *
              </label>
              <SearchableSelect
                options={supplierOptions}
                value={selectedSupplierId}
                onChange={handleSupplierSelect}
                placeholder={loadingMasters ? "Loading Suppliers..." : "Type/Search Supplier Name..."}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Name (Auto-filled) *
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Supplier Company Name"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier GSTIN
              </label>
              <input
                type="text"
                value={vendorGst}
                onChange={(e) => setVendorGst(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill Date
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tax Type Mode
              </label>
              <select
                value={taxType}
                onChange={(e: any) => setTaxType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              >
                <option value="Intrastate">Intrastate (CGST + SGST)</option>
                <option value="Interstate">Interstate (IGST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SUPPLIER HISTORY & LEDGER ANALYTICS PANEL */}
        {vendorName && showSupplierHistory && (
          <SupplierHistoryPanel
            vendorName={vendorName}
            vendorCode={vendorCode}
            vendorId={selectedSupplierId}
          />
        )}

        {/* Product Items Entry Table */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FaBoxes className="text-amber-600" /> Inward Purchased Products
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
            >
              <FaPlus /> Add Line Item
            </button>
          </div>

          <table className="w-full text-left text-xs min-w-max border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3 px-2 min-w-[260px]">Product Name *</th>
                {columns.itemCode && <th className="pb-3 px-2 min-w-[90px]">Code</th>}
                {columns.company && <th className="pb-3 px-2 min-w-[110px]">Brand / Mfr</th>}
                {columns.hsn && <th className="pb-3 px-2 min-w-[85px]">HSN</th>}
                {columns.pack && <th className="pb-3 px-2 min-w-[80px]">Pack</th>}
                {columns.batch && <th className="pb-3 px-2 min-w-[95px]">Batch</th>}
                {columns.mfgDate && <th className="pb-3 px-2 min-w-[125px]">Mfg Date</th>}
                {columns.expDate && <th className="pb-3 px-2 min-w-[125px]">Exp Date</th>}
                {columns.mrp && <th className="pb-3 px-2 text-right min-w-[90px]">MRP (₹)</th>}
                <th className="pb-3 px-2 text-right min-w-[75px]">Qty *</th>
                {columns.freeQty && <th className="pb-3 px-2 text-right min-w-[70px]">Free</th>}
                <th className="pb-3 px-2 text-right min-w-[90px]">Rate (₹) *</th>
                {columns.grossAmt && <th className="pb-3 px-2 text-right min-w-[85px]">Gross (₹)</th>}
                {columns.tradeDisc && <th className="pb-3 px-2 text-right min-w-[75px]">Disc %</th>}
                {columns.discAmt && <th className="pb-3 px-2 text-right min-w-[80px]">Disc (₹)</th>}
                {columns.schemeDisc && <th className="pb-3 px-2 text-right min-w-[75px]">Sch %</th>}
                {columns.taxableAmt && <th className="pb-3 px-2 text-right min-w-[95px]">Taxable</th>}
                {columns.gst && <th className="pb-3 px-2 text-right min-w-[75px]">GST %</th>}
                {columns.cgstAmt && <th className="pb-3 px-2 text-right min-w-[80px]">CGST (₹)</th>}
                {columns.sgstAmt && <th className="pb-3 px-2 text-right min-w-[80px]">SGST (₹)</th>}
                {columns.igstAmt && <th className="pb-3 px-2 text-right min-w-[80px]">IGST (₹)</th>}
                {columns.gstAmt && <th className="pb-3 px-2 text-right min-w-[90px]">GST Amt</th>}
                {columns.netCost && <th className="pb-3 px-2 text-right min-w-[90px]" title="Cost per unit with tax & free">Cost/Unit</th>}
                {columns.margin && <th className="pb-3 px-2 text-right min-w-[75px]" title="Gross Margin % vs MRP">Margin %</th>}
                {columns.location && <th className="pb-3 px-2 min-w-[95px]">Rack/Loc</th>}
                {columns.itemRemark && <th className="pb-3 px-2 min-w-[120px]">Remark</th>}
                <th className="pb-3 px-2 text-right min-w-[95px]">Total</th>
                <th className="pb-3 px-2 text-center w-10">✕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculatedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                  <td className="py-2.5 px-2 min-w-[260px]">
                    <SearchableSelect
                      options={productOptions}
                      value={item.productId || ""}
                      onChange={(val) => handleProductSelect(idx, val)}
                      placeholder="Search / Select Product..."
                    />
                  </td>
                  {columns.itemCode && (
                    <td className="py-2.5 px-2 min-w-[90px]">
                      <input
                        type="text"
                        value={item.productCode || ""}
                        onChange={(e) => handleItemChange(idx, "productCode", e.target.value)}
                        placeholder="Code"
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </td>
                  )}
                  {columns.company && (
                    <td className="py-2.5 px-2 min-w-[110px]">
                      <input
                        type="text"
                        value={item.companyName || ""}
                        onChange={(e) => handleItemChange(idx, "companyName", e.target.value)}
                        placeholder="Brand/Mfr"
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  {columns.hsn && (
                    <td className="py-2.5 px-2 min-w-[85px]">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </td>
                  )}
                  {columns.pack && (
                    <td className="py-2.5 px-2 min-w-[80px]">
                      <input
                        type="text"
                        value={item.unit || ""}
                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        placeholder="10*10"
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  {columns.batch && (
                    <td className="py-2.5 px-2 min-w-[95px]">
                      <input
                        type="text"
                        value={item.batchNo}
                        onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                      />
                    </td>
                  )}
                  {columns.mfgDate && (
                    <td className="py-2.5 px-2 min-w-[125px]">
                      <input
                        type="month"
                        value={item.mfgDate || ""}
                        onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  {columns.expDate && (
                    <td className="py-2.5 px-2 min-w-[125px]">
                      <input
                        type="month"
                        value={item.expDate}
                        onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold text-rose-600 dark:text-rose-400"
                      />
                    </td>
                  )}
                  {columns.mrp && (
                    <td className="py-2.5 px-2 min-w-[90px]">
                      <input
                        type="number"
                        step="0.01"
                        value={item.mrp || ""}
                        onChange={(e) => handleItemChange(idx, "mrp", Number(e.target.value))}
                        className="w-full min-w-0 px-2 py-1.5 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-2 min-w-[75px]">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, "qty", Math.max(1, Number(e.target.value)))}
                      className="w-full min-w-0 px-2 py-1.5 text-right font-bold rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  {columns.freeQty && (
                    <td className="py-2.5 px-2 min-w-[70px]">
                      <input
                        type="number"
                        min="0"
                        value={item.freeQty}
                        onChange={(e) => handleItemChange(idx, "freeQty", Math.max(0, Number(e.target.value)))}
                        className="w-full min-w-0 px-2 py-1.5 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 text-emerald-600 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-2 min-w-[90px]">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate || ""}
                      onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                      className="w-full min-w-0 px-2 py-1.5 text-right font-bold text-amber-600 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  {columns.grossAmt && (
                    <td className="py-2.5 px-2 text-right font-medium text-slate-600 dark:text-slate-300 min-w-[85px]">
                      ₹{item.gross.toFixed(2)}
                    </td>
                  )}
                  {columns.tradeDisc && (
                    <td className="py-2.5 px-2 min-w-[75px]">
                      <input
                        type="number"
                        step="0.1"
                        value={item.discountPercent || ""}
                        onChange={(e) => handleItemChange(idx, "discountPercent", Number(e.target.value))}
                        placeholder="0%"
                        className="w-full min-w-0 px-2 py-1.5 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  )}
                  {columns.discAmt && (
                    <td className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400 font-semibold min-w-[80px]">
                      {item.discAmt > 0 ? `-₹${item.discAmt.toFixed(2)}` : "₹0.00"}
                    </td>
                  )}
                  {columns.schemeDisc && (
                    <td className="py-2.5 px-2 min-w-[75px]">
                      <input
                        type="number"
                        step="0.1"
                        value={item.schemeDiscountPercent || ""}
                        onChange={(e) => handleItemChange(idx, "schemeDiscountPercent", Number(e.target.value))}
                        placeholder="0%"
                        className="w-full min-w-0 px-2 py-1.5 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  )}
                  {columns.taxableAmt && (
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-800 dark:text-slate-200 min-w-[95px]">
                      ₹{item.taxable.toFixed(2)}
                    </td>
                  )}
                  {columns.gst && (
                    <td className="py-2.5 px-2 min-w-[75px]">
                      <input
                        type="number"
                        step="0.1"
                        value={item.gstPercent}
                        onChange={(e) => handleItemChange(idx, "gstPercent", Number(e.target.value))}
                        className="w-full min-w-0 px-2 py-1.5 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  )}
                  {columns.cgstAmt && (
                    <td className="py-2.5 px-2 text-right text-slate-500 min-w-[80px]">
                      ₹{item.cgstAmt.toFixed(2)}
                    </td>
                  )}
                  {columns.sgstAmt && (
                    <td className="py-2.5 px-2 text-right text-slate-500 min-w-[80px]">
                      ₹{item.sgstAmt.toFixed(2)}
                    </td>
                  )}
                  {columns.igstAmt && (
                    <td className="py-2.5 px-2 text-right text-slate-500 min-w-[80px]">
                      ₹{item.igstAmt.toFixed(2)}
                    </td>
                  )}
                  {columns.gstAmt && (
                    <td className="py-2.5 px-2 text-right text-slate-500 min-w-[90px]">
                      ₹{item.gstAmt.toFixed(2)}
                    </td>
                  )}
                  {columns.netCost && (
                    <td className="py-2.5 px-2 text-right font-bold text-teal-600 dark:text-teal-400 min-w-[90px]" title="Cost per unit with tax & free">
                      ₹{item.netCostPerUnit.toFixed(2)}
                    </td>
                  )}
                  {columns.margin && (
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400 min-w-[75px]" title="Gross Margin % vs MRP">
                      {item.profitMargin > 0 ? `${item.profitMargin.toFixed(1)}%` : "0%"}
                    </td>
                  )}
                  {columns.location && (
                    <td className="py-2.5 px-2 min-w-[95px]">
                      <input
                        type="text"
                        value={item.location || ""}
                        onChange={(e) => handleItemChange(idx, "location", e.target.value)}
                        placeholder="Rack A-1"
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  {columns.itemRemark && (
                    <td className="py-2.5 px-2 min-w-[120px]">
                      <input
                        type="text"
                        value={item.itemRemark || ""}
                        onChange={(e) => handleItemChange(idx, "itemRemark", e.target.value)}
                        placeholder="Note..."
                        className="w-full min-w-0 px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-black text-amber-600 min-w-[95px]">
                    ₹{item.lineTotal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition cursor-pointer"
                    >
                      <FaTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Payment Settlement */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Paid Amount (Instant Settlement)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cash">Cash Payment</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Remaining Balance Amount
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-rose-600">
                  ₹{balance.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill Remarks / Internal Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter bill notes or payment instructions..."
                className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 rounded-3xl text-white shadow-xl space-y-3 border border-amber-500">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-100">Bill Financial Summary</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-amber-100">
                <span>Subtotal Gross:</span>
                <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-rose-200">
                <span>Total Discount:</span>
                <span>-₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Taxable Amount:</span>
                <span>₹{(subtotal - totalDiscount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {!isInterstate ? (
                <>
                  <div className="flex justify-between text-amber-100 text-[11px]">
                    <span>CGST (Intrastate):</span>
                    <span>₹{totalCGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-100 text-[11px]">
                    <span>SGST (Intrastate):</span>
                    <span>₹{totalSGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-amber-100 text-[11px]">
                  <span>IGST (Interstate):</span>
                  <span>₹{totalIGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-amber-100 font-bold">
                <span>Total GST Tax:</span>
                <span>₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-amber-400/40 pt-2 flex justify-between items-center">
                <span className="text-base font-black">Net Total Bill Value:</span>
                <span className="text-2xl font-black text-white">₹{netAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              <FaSave /> {saving ? "Saving Purchase Bill..." : "Save Purchase Bill"}
            </button>
          </div>
        </div>
      </form>

      {/* IMPORT PO MODAL */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaDownload className="text-amber-500" /> Select Pending Purchase Order to Import
              </h3>
              <button onClick={() => setShowPoModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search PO Number, Vendor Name..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {loadingPOs ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading pending Purchase Orders...</div>
            ) : filteredPOs.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                {filteredPOs.map((po) => (
                  <div key={po._id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between hover:border-amber-500 transition">
                    <div>
                      <p className="font-bold text-amber-600 dark:text-amber-400">{po.poNumber}</p>
                      <p className="text-slate-800 dark:text-white font-medium">{po.vendorName}</p>
                      <p className="text-[10px] text-slate-500">Date: {po.poDate} • Items: {po.items?.length || 0}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportPO(po)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition shadow-xs"
                    >
                      Import Items &rarr;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No pending Purchase Orders found.</div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MULTI-PRODUCT CATALOG MODAL */}
      {showMultiProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaListUl className="text-amber-500" /> Quick Product Selection Catalog
              </h3>
              <button onClick={() => setShowMultiProductModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search products by name, code, company..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {filteredModalProducts.map((prod) => (
                <div key={prod.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between hover:border-amber-500 transition">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                    <p className="text-[10px] text-slate-500">Code: {prod.code} • Rate: ₹{prod.purchaseRate} • HSN: {prod.hsn}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddProduct(prod)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowMultiProductModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
