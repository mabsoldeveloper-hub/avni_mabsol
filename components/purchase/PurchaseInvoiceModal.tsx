"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaTimes,
  FaPrint,
  FaFilePdf,
  FaHandHoldingUsd,
  FaBuilding,
  FaTruck,
  FaReceipt,
  FaSearchPlus,
  FaSearchMinus,
  FaCompress,
  FaExpand,
} from "react-icons/fa";

export interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  bill: any | null;
  onClose: () => void;
  company?: any | null;
}

/**
 * Converts Indian Rupee number to words (Lakhs, Crores, Thousands, Rupees, Paise)
 */
export function numberToWordsIndian(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return "";
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Rupees Zero Only";

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertLessThanThousand(v: number): string {
    let str = "";
    if (v >= 100) {
      str += units[Math.floor(v / 100)] + " Hundred ";
      v %= 100;
    }
    if (v >= 20) {
      str += tens[Math.floor(v / 10)] + " ";
      v %= 10;
    }
    if (v > 0) {
      str += units[v] + " ";
    }
    return str.trim();
  }

  let words = "";
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) words += convertLessThanThousand(crore) + " Crore ";
  if (lakh > 0) words += convertLessThanThousand(lakh) + " Lakh ";
  if (thousand > 0) words += convertLessThanThousand(thousand) + " Thousand ";
  if (rem > 0) words += convertLessThanThousand(rem) + " ";

  const paise = Math.round((Math.abs(num) - n) * 100);
  let result = "Rupees " + words.trim();
  if (paise > 0) {
    result += " and " + convertLessThanThousand(paise) + " Paise";
  }
  return result + " Only";
}

/**
 * Formats ISO / YYYY-MM-DD date into Indian DD/MM/YYYY format
 */
export function formatIndianDate(dateStr?: string): string {
  if (!dateStr || dateStr === "N/A") return "N/A";
  const clean = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.slice(0, 10).split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
}

export default function PurchaseInvoiceModal({
  isOpen,
  bill,
  onClose,
  company,
}: PurchaseInvoiceModalProps) {
  // Zoom scale state for desktop/laptop preview (80%, 90%, 100%)
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isOpen || !bill) return null;

  // Compute clean display data & fallbacks
  const billNo = bill.billNumber || "N/A";
  const suppInvNo = bill.supplierInvoiceNo || bill.poNumber || "N/A";
  const rawBillDate = bill.billDate || "N/A";
  const billDate = formatIndianDate(rawBillDate);
  const rawDueDate = bill.dueDate || "";
  const dueDate = rawDueDate ? formatIndianDate(rawDueDate) : "Net 30 Days";
  const poNumber = bill.poNumber || "Direct Inward";
  const paymentStatus = bill.paymentStatus || "Pending";
  const remarks = bill.remarks || "";

  // Recipient / Buyer (Current Organization)
  const buyerName = company?.companyName || "MABSOL PHARMACEUTICALS PVT LTD";
  const buyerAddress = [
    company?.address,
    company?.city,
    company?.state ? `${company.state}${company?.pincode ? ` - ${company.pincode}` : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ") || "Industrial Area, Pharma Hub";
  const buyerGst = company?.gstNo || "06AAACX1234F1Z9";
  const buyerPan = company?.panNo || (buyerGst.length >= 12 ? buyerGst.substring(2, 12) : "AAACX1234F");
  const buyerDl = company?.drugLicenseNo || "DL: 20B/HR-8842, 21B/HR-8843";
  const buyerPhone = company?.mobile || company?.email || "+91 98765 43210";

  // Supplier / Vendor
  const vendorName = bill.vendorName || "Supplier / Vendor";
  const vendorAddress = bill.vendorAddress || "Registered Vendor Location";
  const vendorGst = bill.vendorGst || "N/A";
  const vendorPhone = bill.vendorPhone || "N/A";
  const vendorCode = bill.vendorCode || "VEN-REC";

  // Is Inter-state or Intra-state
  const compState = buyerGst.substring(0, 2);
  const suppState = (bill.vendorGst || "").substring(0, 2);
  const isInterstate = Boolean(
    compState && suppState && compState !== suppState && suppState !== "N/"
  ) || (bill.igst && Number(bill.igst) > 0);

  // Process items and compute line totals
  const items = Array.isArray(bill.items) && bill.items.length > 0 ? bill.items : [];

  const processedItems = items.map((it: any, index: number) => {
    const qty = Number(it.qty || 1);
    const freeQty = Number(it.freeQty || 0);
    const rate = Number(it.rate || 0);
    const mrp = Number(it.mrp || 0) || Math.round(rate * 1.3 * 100) / 100;
    const disc = Number(it.discountPercent || 0);
    const gstPercent = Number(it.gstPercent || (it.taxPercent ?? 12));

    const gross = qty * rate;
    const discAmt = gross * (disc / 100);
    const taxable = it.taxableAmount !== undefined ? Number(it.taxableAmount) : Math.max(0, gross - discAmt);
    const gstAmt = it.gstAmount !== undefined ? Number(it.gstAmount) : taxable * (gstPercent / 100);
    const lineTotal = it.total !== undefined ? Number(it.total) : taxable + gstAmt;

    return {
      sno: index + 1,
      productName: it.productName || "Product Description",
      productCode: it.productCode || "",
      companyName: it.companyName || "",
      location: it.location || "",
      itemRemark: it.itemRemark || "",
      hsnCode: it.hsnCode || "30049099",
      batchNo: it.batchNo || "BATCH-01",
      expDate: it.expDate || "-",
      mfgDate: it.mfgDate || "-",
      unit: it.unit || "Box",
      qty,
      freeQty,
      mrp,
      rate,
      disc,
      discAmt,
      taxable,
      gstPercent,
      gstAmt,
      lineTotal,
    };
  });

  // Calculate financial totals
  const calculatedSubtotal = processedItems.reduce((sum: number, it: any) => sum + (it.qty * it.rate), 0);
  const calculatedDiscount = processedItems.reduce((sum: number, it: any) => sum + it.discAmt, 0);
  const calculatedTaxable = processedItems.reduce((sum: number, it: any) => sum + it.taxable, 0);
  const calculatedTax = processedItems.reduce((sum: number, it: any) => sum + it.gstAmt, 0);

  const subtotal = bill.subtotal !== undefined && Number(bill.subtotal) > 0 ? Number(bill.subtotal) : calculatedSubtotal;
  const totalDiscount = bill.totalDiscount !== undefined ? Number(bill.totalDiscount) : calculatedDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount) || calculatedTaxable;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = bill.igst !== undefined && Number(bill.igst) > 0 ? Number(bill.igst) : calculatedTax;
  } else {
    const halfTax = calculatedTax / 2;
    cgst = bill.cgst !== undefined && Number(bill.cgst) > 0 ? Number(bill.cgst) : halfTax;
    sgst = bill.sgst !== undefined && Number(bill.sgst) > 0 ? Number(bill.sgst) : halfTax;
  }

  const totalTax = isInterstate ? igst : cgst + sgst;
  const netAmount = Number(bill.netAmount || 0) || Math.round(taxableAmount + totalTax);
  const roundOff = bill.roundOff !== undefined ? Number(bill.roundOff) : Math.round((netAmount - (taxableAmount + totalTax)) * 100) / 100;
  const paidAmount = Number(bill.paidAmount || 0);
  const balanceAmount = Number(bill.balanceAmount ?? (netAmount - paidAmount));

  const amountInWords = numberToWordsIndian(netAmount);

  // Group items by GST % for Tax Summary Breakdown
  const gstTaxSummary = useMemo(() => {
    const map: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
    processedItems.forEach((it: any) => {
      const rate = it.gstPercent;
      if (!map[rate]) {
        map[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      map[rate].taxable += it.taxable;
      if (isInterstate) {
        map[rate].igst += it.gstAmt;
      } else {
        map[rate].cgst += it.gstAmt / 2;
        map[rate].sgst += it.gstAmt / 2;
      }
      map[rate].totalTax += it.gstAmt;
    });
    return Object.entries(map).map(([rate, vals]) => ({
      rate: Number(rate),
      ...vals,
    }));
  }, [processedItems, isInterstate]);

  // Build complete, self-contained professional print HTML with embedded CSS
  const buildPrintHtml = (): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Purchase_Bill_${billNo}_${suppInvNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #0f172a;
      font-size: 10px;
      line-height: 1.35;
      padding: 10px;
    }
    .bill-box {
      max-width: 800px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 16px 18px;
      background: #ffffff;
    }
    
    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      background: #d97706;
      color: #ffffff;
      font-weight: 900;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
    .sub-head {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #b45309;
      letter-spacing: 0.5px;
    }
    .main-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #020617;
      line-height: 1.1;
    }
    .header-right {
      text-align: right;
    }
    .copy-pill {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .gst-rule {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 600;
    }

    /* 2 Col Letterhead */
    .letterhead {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .col-buyer {
      padding: 10px 12px;
      background: #fffdf5;
      border-right: 1px solid #cbd5e1;
    }
    .col-vendor {
      padding: 10px 12px;
      background: #f8fafc;
    }
    .col-badge {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .col-buyer .col-badge { color: #92400e; }
    .col-vendor .col-badge { color: #475569; }
    .ent-name {
      font-size: 13px;
      font-weight: 900;
      color: #020617;
      margin-bottom: 2px;
      line-height: 1.2;
      word-break: break-word;
    }
    .ent-address {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 8px;
      word-break: break-word;
    }
    .ent-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 8px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 9px;
    }
    .meta-lbl { color: #64748b; font-weight: 600; }
    .meta-val { color: #0f172a; font-weight: 700; font-family: monospace; }

    /* Metadata Bar */
    .meta-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 12px;
      gap: 6px;
    }
    .strip-col {
      border-right: 1px solid #e2e8f0;
      padding-right: 4px;
    }
    .strip-col:last-child {
      border-right: none;
      text-align: right;
    }
    .strip-lbl {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .strip-val {
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
      word-break: break-all;
    }
    .status-tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .st-paid { background: #dcfce7; color: #166534; }
    .st-partial { background: #dbeafe; color: #1e40af; }
    .st-pending { background: #fee2e2; color: #991b1b; }

    /* Items Table */
    .table-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    table.it-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    table.it-tbl th {
      background: #0f172a;
      color: #ffffff;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 5px;
      letter-spacing: 0.4px;
    }
    table.it-tbl td {
      padding: 5px 5px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.it-tbl tr:nth-child(even) td {
      background: #f8fafc;
    }
    .p-title { font-weight: 800; color: #020617; font-size: 9.5px; line-height: 1.2; }
    .p-code { font-size: 8px; color: #64748b; font-family: monospace; }
    .t-cen { text-align: center; }
    .t-rgt { text-align: right; }
    .f-mono { font-family: monospace; }
    .f-bold { font-weight: 700; }
    .f-blk { font-weight: 900; }

    /* Bottom Grid */
    .bot-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .tax-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .tax-h {
      background: #f1f5f9;
      padding: 4px 8px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
    }
    table.tax-t {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }
    table.tax-t th {
      background: #f8fafc;
      color: #475569;
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.tax-t td {
      padding: 4px 6px;
      border-bottom: 1px solid #f1f5f9;
      font-family: monospace;
    }
    
    .words-box {
      border: 1px solid #fde68a;
      background: #fffdf5;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 8px;
    }
    .w-lbl {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #92400e;
      margin-bottom: 2px;
    }
    .w-val {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      font-style: italic;
    }

    .rem-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 8.5px;
      color: #475569;
    }
    
    .totals-box {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      overflow: hidden;
      background: #f8fafc;
    }
    .tot-r {
      display: flex;
      justify-content: space-between;
      padding: 4px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9.5px;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
    }
    .grand-total-amount {
      font-size: 15px;
      color: #f59e0b;
      font-family: monospace;
      font-weight: 900;
    }
    .pay-r {
      display: flex;
      justify-content: space-between;
      padding: 4px 10px;
      font-size: 9.5px;
      background: #ffffff;
    }

    /* Footer */
    .foot-box {
      border-top: 1.5px solid #0f172a;
      padding-top: 10px;
    }
    .foot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 8.5px;
    }
    .dec-txt {
      color: #64748b;
      line-height: 1.35;
      margin-top: 2px;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      text-align: center;
    }
    .sig-blk {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding-top: 26px;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 3px;
    }
    .sig-t { font-weight: 800; text-transform: uppercase; color: #1e293b; font-size: 8.5px; }
    .sig-s { font-size: 7.5px; color: #64748b; }
  </style>
</head>
<body>
  <div class="bill-box">
    <!-- Header -->
    <div class="header-row">
      <div class="header-left">
        <div class="logo-badge">M</div>
        <div>
          <span class="sub-head">Pharmaceutical Inward Record</span>
          <h1 class="main-title">Tax Invoice / Purchase Bill</h1>
        </div>
      </div>
      <div class="header-right">
        <span class="copy-pill">ORIGINAL FOR RECIPIENT</span>
        <div class="gst-rule">GST Inward Invoice &bull; Rule 46 of CGST</div>
      </div>
    </div>

    <!-- Letterhead -->
    <div class="letterhead">
      <div class="col-buyer">
        <div class="col-badge">&#9632; Billed To / Consignee (Buyer):</div>
        <div class="ent-name">${buyerName}</div>
        <div class="ent-address">${buyerAddress}</div>
        <div class="ent-grid">
          <div><span class="meta-lbl">GSTIN:</span> <span class="meta-val">${buyerGst}</span></div>
          <div><span class="meta-lbl">PAN:</span> <span class="meta-val">${buyerPan}</span></div>
          <div style="grid-column: span 2;"><span class="meta-lbl">Drug License No:</span> <span class="meta-val">${buyerDl}</span></div>
          <div style="grid-column: span 2;"><span class="meta-lbl">Contact:</span> <span class="meta-val">${buyerPhone}</span></div>
        </div>
      </div>
      <div class="col-vendor">
        <div class="col-badge">&#9632; Billed By / Supplier (Vendor):</div>
        <div class="ent-name">${vendorName}</div>
        <div class="ent-address">${vendorAddress}</div>
        <div class="ent-grid">
          <div><span class="meta-lbl">GSTIN:</span> <span class="meta-val">${vendorGst}</span></div>
          <div><span class="meta-lbl">Vendor Code:</span> <span class="meta-val">${vendorCode}</span></div>
          <div style="grid-column: span 2;"><span class="meta-lbl">Phone:</span> <span class="meta-val">${vendorPhone}</span></div>
          <div style="grid-column: span 2;"><span class="meta-lbl">Tax Supply:</span> <span style="font-weight:700;color:#4338ca;">${isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</span></div>
        </div>
      </div>
    </div>

    <!-- Metadata Strip -->
    <div class="meta-strip">
      <div class="strip-col">
        <span class="strip-lbl">Bill Number</span>
        <span class="strip-val" style="color:#b45309;">${billNo}</span>
      </div>
      <div class="strip-col">
        <span class="strip-lbl">Supplier Inv No</span>
        <span class="strip-val">${suppInvNo}</span>
      </div>
      <div class="strip-col">
        <span class="strip-lbl">Invoice Date</span>
        <span class="strip-val">${billDate}</span>
      </div>
      <div class="strip-col">
        <span class="strip-lbl">Due Date / Terms</span>
        <span class="strip-val">${dueDate}</span>
      </div>
      <div class="strip-col">
        <span class="strip-lbl">Linked PO #</span>
        <span class="strip-val" style="color:#4338ca;">${poNumber}</span>
      </div>
      <div class="strip-col">
        <span class="strip-lbl">Payment Status</span>
        <span class="status-tag ${paymentStatus === "Paid" ? "st-paid" : paymentStatus === "Partial" ? "st-partial" : "st-pending"}">${paymentStatus}</span>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-box">
      <table class="it-tbl">
        <thead>
          <tr>
            <th class="t-cen" style="width:25px;">#</th>
            <th style="text-align:left;">Description of Goods / Products</th>
            <th class="t-cen">HSN/SAC</th>
            <th class="t-cen">Batch No</th>
            <th class="t-cen">Exp.</th>
            <th class="t-rgt">Qty</th>
            <th class="t-rgt">MRP (₹)</th>
            <th class="t-rgt">Rate (₹)</th>
            <th class="t-rgt">Dis%</th>
            <th class="t-rgt">Taxable (₹)</th>
            <th class="t-cen">GST%</th>
            <th class="t-rgt">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${processedItems.length > 0 ? processedItems.map((item: any) => `
            <tr>
              <td class="t-cen f-mono" style="color:#64748b;">${item.sno}</td>
              <td>
                <div class="p-title">${item.productName}</div>
                ${(item.productCode || item.companyName || item.location) ? `
                  <div class="p-code" style="font-size:7.5px;color:#64748b;">
                    ${[item.productCode ? 'Code: ' + item.productCode : '', item.companyName ? 'Brand: ' + item.companyName : '', item.location ? 'Loc: ' + item.location : ''].filter(Boolean).join(' &bull; ')}
                  </div>
                ` : ""}
              </td>
              <td class="t-cen f-mono" style="color:#475569;">${item.hsnCode}</td>
              <td class="t-cen f-mono f-bold">${item.batchNo}</td>
              <td class="t-cen f-mono" style="color:#475569;">${item.expDate}</td>
              <td class="t-rgt f-blk">${item.qty} ${item.unit}${item.freeQty > 0 ? ` <span style="color:#16a34a;font-size:7.5px;">+${item.freeQty} Free</span>` : ""}</td>
              <td class="t-rgt f-mono" style="color:#475569;">${item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "-"}</td>
              <td class="t-rgt f-mono f-bold">₹${item.rate.toFixed(2)}</td>
              <td class="t-rgt f-mono" style="color:#475569;">${item.disc > 0 ? `${item.disc}%` : "0%"}</td>
              <td class="t-rgt f-mono f-bold">₹${item.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="t-cen f-mono" style="font-weight:600;">${item.gstPercent}%</td>
              <td class="t-rgt f-mono f-blk">₹${item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `).join("") : `
            <tr><td colspan="12" style="text-align:center;padding:12px;color:#64748b;font-style:italic;">Purchase summary invoice line entry &bull; Net Total: ₹${netAmount.toLocaleString("en-IN")}</td></tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- Bottom Tax & Totals Grid -->
    <div class="bot-grid">
      <div>
        <div class="tax-box">
          <div class="tax-h">GST Tax Analysis Breakdown</div>
          <table class="tax-t">
            <thead>
              <tr>
                <th style="text-align:left;">Tax Rate</th>
                <th style="text-align:right;">Taxable (₹)</th>
                ${isInterstate ? `<th style="text-align:right;">IGST (₹)</th>` : `
                  <th style="text-align:right;">CGST (₹)</th>
                  <th style="text-align:right;">SGST (₹)</th>
                `}
                <th style="text-align:right;">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${gstTaxSummary.length > 0 ? gstTaxSummary.map((row: any) => `
                <tr>
                  <td style="font-weight:700;">${row.rate}% GST</td>
                  <td style="text-align:right;">₹${row.taxable.toFixed(2)}</td>
                  ${isInterstate ? `<td style="text-align:right;">₹${row.igst.toFixed(2)}</td>` : `
                    <td style="text-align:right;">₹${row.cgst.toFixed(2)}</td>
                    <td style="text-align:right;">₹${row.sgst.toFixed(2)}</td>
                  `}
                  <td style="text-align:right;font-weight:700;">₹${row.totalTax.toFixed(2)}</td>
                </tr>
              `).join("") : `
                <tr><td colspan="${isInterstate ? 3 : 4}" style="text-align:center;color:#94a3b8;font-style:italic;">Summary tax entry</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <div class="words-box">
          <div class="w-lbl">Total Amount in Words:</div>
          <div class="w-val">${amountInWords}</div>
        </div>

        <div class="rem-box">
          <strong>Bill Remarks / Storage Notes:</strong><br/>
          <span>${remarks || "All pharmaceutical goods received verified against supplier delivery challan."}</span><br/>
          <span style="font-size:7.5px;color:#94a3b8;">Store medicines in a cool, dry & dark place below 25°C. Protect from direct heat & moisture.</span>
        </div>
      </div>

      <div>
        <div class="totals-box">
          <div class="tot-r">
            <span style="color:#64748b;">Subtotal (Gross):</span>
            <span class="f-mono f-bold">₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${totalDiscount > 0 ? `
            <div class="tot-r" style="color:#15803d;">
              <span>Total Discount:</span>
              <span class="f-mono f-bold">-₹${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ""}
          <div class="tot-r" style="background:#f1f5f9;font-weight:700;">
            <span>Taxable Value:</span>
            <span class="f-mono">₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${isInterstate ? `
            <div class="tot-r">
              <span style="color:#64748b;">Integrated Tax (IGST):</span>
              <span class="f-mono f-bold">₹${igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : `
            <div class="tot-r">
              <span style="color:#64748b;">Central Tax (CGST):</span>
              <span class="f-mono">₹${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="tot-r">
              <span style="color:#64748b;">State Tax (SGST):</span>
              <span class="f-mono">₹${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          `}
          <div class="tot-r">
            <span style="color:#64748b;">Total Tax:</span>
            <span class="f-mono f-bold">₹${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${roundOff !== 0 ? `
            <div class="tot-r" style="font-size:8.5px;color:#64748b;">
              <span>Round Off:</span>
              <span class="f-mono">${roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
            </div>
          ` : ""}
          <div class="grand-total-row">
            <span style="color:#fbbf24;letter-spacing:0.5px;">Net Bill Total:</span>
            <span class="grand-total-amount">₹${netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="pay-r">
            <span style="color:#64748b;">Amount Paid:</span>
            <span class="f-mono f-bold" style="color:#15803d;">₹${paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="pay-r" style="border-top:1px solid #f1f5f9;">
            <span style="color:#64748b;">Balance Due:</span>
            <span class="f-mono f-bold" style="color:#be123c;">₹${balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer & Signatures -->
    <div class="foot-box">
      <div class="foot-grid">
        <div>
          <strong style="text-transform:uppercase;letter-spacing:0.5px;color:#1e293b;">Statutory Pharma Declaration:</strong>
          <p class="dec-txt">Certified that the particulars given above are true and correct, and the drugs/goods received have been inwarded from a registered licensed vendor under valid pharmaceutical compliance.</p>
          <p style="font-size:7.5px;color:#94a3b8;margin-top:6px;font-family:monospace;">Document Generated on ${new Date().toLocaleString("en-IN")} &bull; Mabsol CRM Secured System</p>
        </div>
        <div class="sig-grid">
          <div class="sig-blk">
            <span class="sig-t">Store In-Charge</span>
            <span class="sig-s">(Goods Received By)</span>
          </div>
          <div class="sig-blk">
            <span class="sig-t">Authorized Signatory</span>
            <span class="sig-s">For ${buyerName}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
  };

  // Dedicated Print / PDF Pop-up Window for 100% reliable PDF Generation
  const handleOpenPdfWindow = () => {
    const printWindow = window.open("", "_blank", "width=1020,height=840");
    if (!printWindow) {
      alert("Please allow pop-ups in your browser to print / save the PDF.");
      return;
    }

    const html = buildPrintHtml();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Clean Browser Print Trigger using the same bulletproof print window
  const handleDirectPrint = () => {
    handleOpenPdfWindow();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 md:p-4 overflow-hidden">
      {/* Dynamic Global Print Stylesheet */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #purchase-bill-printable,
          #purchase-bill-printable * {
            visibility: visible !important;
          }
          #purchase-bill-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            border: 1px solid #334155 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            transform: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col h-[96vh] max-h-[96vh] overflow-hidden">
        {/* TOP TOOLBAR - Actions (Print, PDF, Pay, Zoom, Close) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-900 text-white border-b border-slate-800 no-print shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <FaReceipt className="text-sm sm:text-base" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-black tracking-wide text-white truncate">
                  Purchase Invoice / Bill
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  #{billNo}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${paymentStatus === "Paid"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : paymentStatus === "Partial"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                >
                  {paymentStatus}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Supplier Inv: <span className="font-semibold text-slate-200">{suppInvNo}</span> &bull; Date:{" "}
                <span className="font-semibold text-slate-200">{billDate}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons & Zoom Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls (hidden on mobile, visible on sm+) */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="p-1 hover:text-amber-400 transition"
                title="Zoom Out"
              >
                <FaSearchMinus size={11} />
              </button>
              <span className="px-1 text-[11px] font-mono text-slate-300 w-9 text-center font-bold">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 hover:text-amber-400 transition"
                title="Zoom In"
              >
                <FaSearchPlus size={11} />
              </button>
              <button
                onClick={() => setZoomLevel(zoomLevel === 100 ? 85 : 100)}
                className="p-1 hover:text-amber-400 transition border-l border-slate-700 ml-0.5 pl-1.5"
                title="Toggle Fit / 100%"
              >
                {zoomLevel === 100 ? <FaCompress size={10} /> : <FaExpand size={10} />}
              </button>
            </div>

            {/* Direct Print / Save PDF Button */}
            <button
              onClick={handleOpenPdfWindow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-rose-900/30 transition hover:scale-105 active:scale-95"
              title="Download PDF or Print Invoice"
            >
              <FaFilePdf className="text-xs sm:text-sm" /> Download / Print PDF
            </button>

            {/* Quick Print Trigger */}
            <button
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold border border-slate-700 transition"
              title="Quick Print"
            >
              <FaPrint size={11} /> <span className="hidden sm:inline">Print</span>
            </button>

            {/* Settle / Pay Bill Button */}
            <Link
              href="/dashboard/purchase/payment"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition shadow-sm"
              title="Make Payment Entry"
            >
              <FaHandHoldingUsd size={11} /> <span className="hidden sm:inline">Settle / Pay</span>
            </Link>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close (Esc)"
            >
              <FaTimes className="text-xs sm:text-sm" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE INVOICE SHEET PREVIEW (Full 2D scroll with zero cut-off) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-5 md:p-6 bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center">
          {/* ZOOM / SCALE WRAPPER */}
          <div
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : "none",
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
            }}
            className="w-full flex justify-center min-w-0"
          >
            {/* THE AUTHENTIC A4 PRINTABLE BILL */}
            <div
              id="purchase-bill-printable"
              className="w-full max-w-[830px] min-w-0 bg-white text-slate-900 shadow-xl border border-slate-300 rounded-xl p-3.5 sm:p-6 md:p-7 text-[11px] leading-snug break-words"
            >
              {/* HEADER BANNER / TITLE STRIP */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-slate-900 pb-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                    M
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                      Pharmaceutical Inward Record
                    </span>
                    <h1 className="text-base sm:text-xl font-black text-slate-950 tracking-tight leading-none uppercase truncate sm:whitespace-normal">
                      Tax Invoice / Purchase Bill
                    </h1>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
                    ORIGINAL FOR RECIPIENT
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">
                    GST Inward Invoice &bull; Rule 46 of CGST
                  </p>
                </div>
              </div>

              {/* TWO-COLUMN ENTITY LETTERHEAD: BUYER (INWARD TO) & SUPPLIER (BILLED BY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-300 rounded-lg overflow-hidden mb-3">
                {/* Recipient / Consignee (Buyer) */}
                <div className="p-2.5 sm:p-3 bg-amber-50/40 border-b sm:border-b-0 sm:border-r border-slate-300 min-w-0">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider mb-1">
                    <FaBuilding size={10} /> Billed To / Consignee (Buyer):
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-950 leading-tight mb-1 break-words">
                    {buyerName}
                  </h2>
                  <p className="text-slate-600 text-[10px] leading-normal break-words">{buyerAddress}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 mt-2 pt-2 border-t border-amber-200/70 text-[9.5px]">
                    <div>
                      <span className="text-slate-400 font-semibold">GSTIN:</span>{" "}
                      <span className="font-mono font-bold text-slate-900 break-all">{buyerGst}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">PAN:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{buyerPan}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-semibold">Drug License No:</span>{" "}
                      <span className="font-bold text-slate-900 break-words">{buyerDl}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-semibold">Contact:</span>{" "}
                      <span className="font-medium text-slate-800">{buyerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Supplier / Vendor (Consignor) */}
                <div className="p-2.5 sm:p-3 bg-slate-50 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-600 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider mb-1">
                    <FaTruck size={10} /> Billed By / Supplier (Vendor):
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight mb-1 break-words">
                    {vendorName}
                  </h2>
                  <p className="text-slate-600 text-[10px] leading-normal break-words">{vendorAddress}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 mt-2 pt-2 border-t border-slate-200 text-[9.5px]">
                    <div>
                      <span className="text-slate-400 font-semibold">GSTIN:</span>{" "}
                      <span className="font-mono font-bold text-slate-900 break-all">{vendorGst}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Vendor Code:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{vendorCode}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-semibold">Phone:</span>{" "}
                      <span className="font-medium text-slate-800">{vendorPhone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-semibold">Tax Supply:</span>{" "}
                      <span className="font-bold text-indigo-700">
                        {isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* INVOICE METADATA STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 border border-slate-300 rounded-lg bg-slate-50/80 p-2 sm:p-2.5 mb-3 text-[10px] gap-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="sm:px-1.5">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Bill Number</span>
                  <span className="font-black text-slate-950 text-xs font-mono text-amber-700 break-all">{billNo}</span>
                </div>
                <div className="sm:px-1.5 pt-1 sm:pt-0">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Supplier Inv No</span>
                  <span className="font-bold text-slate-900 text-[10.5px] font-mono break-all">{suppInvNo}</span>
                </div>
                <div className="sm:px-1.5 pt-1 sm:pt-0">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Invoice Date</span>
                  <span className="font-bold text-slate-900">{billDate}</span>
                </div>
                <div className="sm:px-1.5 pt-1 sm:pt-0">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Due Date / Terms</span>
                  <span className="font-semibold text-slate-800">{dueDate}</span>
                </div>
                <div className="sm:px-1.5 pt-1 sm:pt-0">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Linked PO #</span>
                  <span className="font-semibold text-indigo-700 break-all">{poNumber}</span>
                </div>
                <div className="sm:px-1.5 pt-1 sm:pt-0 text-left sm:text-right">
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Payment Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-black text-[9.5px] uppercase ${paymentStatus === "Paid"
                      ? "bg-emerald-100 text-emerald-800"
                      : paymentStatus === "Partial"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                      }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>

              {/* PURCHASED ITEMS TABLE - WITH HORIZONTAL SCROLL PROTECTOR */}
              <div className="border border-slate-300 rounded-lg overflow-x-auto mb-3 bg-white">
                <table className="w-full min-w-[680px] text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold tracking-wide uppercase text-[9px]">
                      <th className="py-2 px-1.5 text-center w-7">#</th>
                      <th className="py-2 px-2 min-w-[140px]">Description of Goods / Products</th>
                      <th className="py-2 px-1 text-center">HSN/SAC</th>
                      <th className="py-2 px-1 text-center">Batch No</th>
                      <th className="py-2 px-1 text-center">Exp.</th>
                      <th className="py-2 px-1 text-right">Qty</th>
                      <th className="py-2 px-1 text-right">MRP (₹)</th>
                      <th className="py-2 px-1 text-right">Rate (₹)</th>
                      <th className="py-2 px-1 text-right">Dis%</th>
                      <th className="py-2 px-1.5 text-right">Taxable (₹)</th>
                      <th className="py-2 px-1 text-center">GST%</th>
                      <th className="py-2 px-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {processedItems.length > 0 ? (
                      processedItems.map((item: any) => (
                        <tr key={item.sno} className="hover:bg-amber-50/20 odd:bg-white even:bg-slate-50/50">
                          <td className="py-2 px-1.5 text-center text-slate-400 font-mono">{item.sno}</td>
                          <td className="py-2 px-2 min-w-[140px]">
                            <div className="font-bold text-slate-950 leading-tight">{item.productName}</div>
                            {(item.productCode || item.companyName || item.location) && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[8.5px] text-slate-500 font-mono mt-0.5">
                                {item.productCode && <span>Code: {item.productCode}</span>}
                                {item.companyName && <span>&bull; Mfr: {item.companyName}</span>}
                                {item.location && <span>&bull; Loc: {item.location}</span>}
                              </div>
                            )}
                            {item.itemRemark && (
                              <div className="text-[8px] text-slate-400 italic mt-0.5">{item.itemRemark}</div>
                            )}
                          </td>
                          <td className="py-2 px-1 text-center font-mono text-slate-600">{item.hsnCode}</td>
                          <td className="py-2 px-1 text-center font-mono font-bold text-slate-800">{item.batchNo}</td>
                          <td className="py-2 px-1 text-center text-slate-600 font-mono">{item.expDate}</td>
                          <td className="py-2 px-1 text-right font-black text-slate-900 whitespace-nowrap">
                            {item.qty} {item.unit}
                            {item.freeQty > 0 && (
                              <span className="block text-[8px] text-emerald-600 font-bold">+{item.freeQty} Free</span>
                            )}
                          </td>
                          <td className="py-2 px-1 text-right font-mono text-slate-600 whitespace-nowrap">
                            {item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 px-1 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            ₹{item.rate.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right font-mono text-slate-600 whitespace-nowrap">
                            {item.disc > 0 ? `${item.disc}%` : "0%"}
                          </td>
                          <td className="py-2 px-1.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ₹{item.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {item.gstPercent}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                            ₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-4 px-3 text-center text-slate-500 italic">
                          Purchase summary invoice line entry &bull; Net Bill Total: ₹{netAmount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* GST BREAKDOWN & FINANCIAL SUMMARY GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
                {/* Left Column (lg:col-span-7): GST Rate-wise Table + Amount in Words + Bank/Remarks */}
                <div className="lg:col-span-7 space-y-2.5 min-w-0">
                  {/* GST Tax Rate breakdown table */}
                  <div className="border border-slate-300 rounded-lg overflow-x-auto">
                    <div className="bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase text-slate-700 border-b border-slate-200">
                      GST Tax Analysis Breakdown
                    </div>
                    <table className="w-full min-w-[280px] text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-1 px-2">Tax Rate</th>
                          <th className="py-1 px-2 text-right">Taxable (₹)</th>
                          {isInterstate ? (
                            <th className="py-1 px-2 text-right">IGST (₹)</th>
                          ) : (
                            <>
                              <th className="py-1 px-2 text-right">CGST (₹)</th>
                              <th className="py-1 px-2 text-right">SGST (₹)</th>
                            </>
                          )}
                          <th className="py-1 px-2 text-right">Total Tax (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {gstTaxSummary.length > 0 ? (
                          gstTaxSummary.map((row) => (
                            <tr key={row.rate} className="hover:bg-slate-50">
                              <td className="py-1 px-2 font-bold whitespace-nowrap">{row.rate}% GST</td>
                              <td className="py-1 px-2 text-right whitespace-nowrap">₹{row.taxable.toFixed(2)}</td>
                              {isInterstate ? (
                                <td className="py-1 px-2 text-right whitespace-nowrap">₹{row.igst.toFixed(2)}</td>
                              ) : (
                                <>
                                  <td className="py-1 px-2 text-right whitespace-nowrap">₹{row.cgst.toFixed(2)}</td>
                                  <td className="py-1 px-2 text-right whitespace-nowrap">₹{row.sgst.toFixed(2)}</td>
                                </>
                              )}
                              <td className="py-1 px-2 text-right font-bold text-slate-900 whitespace-nowrap">₹{row.totalTax.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isInterstate ? 3 : 4} className="py-2 px-2 text-center text-slate-400 italic">
                              Summary tax entry
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Amount in Words Card */}
                  <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-2 sm:p-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                      Total Amount in Words:
                    </span>
                    <p className="font-bold text-slate-900 text-[9.5px] sm:text-[10px] italic leading-tight break-words">
                      {amountInWords}
                    </p>
                  </div>

                  {/* Remarks / Terms Box */}
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/60 text-[9px] text-slate-600">
                    <span className="font-bold text-slate-800 block">Bill Remarks / Storage Notes:</span>
                    <p className="mt-0.5 text-slate-600 italic break-words">
                      {remarks || "All pharmaceutical goods received verified against supplier delivery challan."}
                    </p>
                    <p className="text-[8.5px] text-slate-400 mt-1">
                      Store medicines in a cool, dry & dark place below 25°C. Protect from direct heat & moisture.
                    </p>
                  </div>
                </div>

                {/* Right Column (lg:col-span-5): Financial Totals Table */}
                <div className="lg:col-span-5 min-w-0">
                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50/60">
                    <div className="divide-y divide-slate-200 text-[10px]">
                      <div className="flex justify-between px-3 py-1.5">
                        <span className="text-slate-500 font-medium">Subtotal (Gross):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className="flex justify-between px-3 py-1.5 text-emerald-700">
                          <span className="font-medium">Total Discount:</span>
                          <span className="font-mono font-bold">
                            -₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between px-3 py-1.5 bg-slate-100/50 font-semibold">
                        <span className="text-slate-700">Taxable Value:</span>
                        <span className="font-mono text-slate-900">
                          ₹{taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {isInterstate ? (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-slate-500 font-medium">Integrated Tax (IGST):</span>
                          <span className="font-mono font-semibold text-slate-900">
                            ₹{igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between px-3 py-1.5">
                            <span className="text-slate-500 font-medium">Central Tax (CGST):</span>
                            <span className="font-mono font-semibold text-slate-900">
                              ₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between px-3 py-1.5">
                            <span className="text-slate-500 font-medium">State Tax (SGST):</span>
                            <span className="font-mono font-semibold text-slate-900">
                              ₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between px-3 py-1.5">
                        <span className="text-slate-500 font-medium">Total Tax:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {roundOff !== 0 && (
                        <div className="flex justify-between px-3 py-1">
                          <span className="text-slate-400 text-[9px]">Round Off:</span>
                          <span className="font-mono text-[9px] text-slate-600">
                            {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                          </span>
                        </div>
                      )}

                      {/* Grand Net Total */}
                      <div className="flex justify-between items-center px-3 py-2 sm:py-2.5 bg-slate-900 text-white font-black">
                        <span className="text-xs uppercase tracking-wide text-amber-400">Net Bill Total:</span>
                        <span className="font-mono text-sm sm:text-base text-white">
                          ₹{netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Payment Status / Balance Breakdown */}
                      <div className="bg-slate-100 p-2 sm:p-2.5 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold">Amount Paid:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold">Balance Due:</span>
                          <span className="font-mono font-bold text-rose-700">
                            ₹{balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUTORY DECLARATION & SIGNATURE BLOCKS */}
              <div className="border-t-2 border-slate-300 pt-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-[9px]">
                  {/* Left: Declaration */}
                  <div>
                    <p className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Statutory Pharma Declaration:
                    </p>
                    <p className="text-slate-500 leading-normal">
                      Certified that the particulars given above are true and correct, and the drugs/goods received have been inwarded from a registered licensed vendor under valid pharmaceutical compliance.
                    </p>
                    <p className="text-slate-400 mt-2 font-mono text-[8px]">
                      Document Generated on {new Date().toLocaleString("en-IN")} &bull; Mabsol CRM Secured System
                    </p>
                  </div>

                  {/* Right: Dual Signatures */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                    <div className="flex flex-col justify-between pt-6 sm:pt-8 border-b border-slate-400">
                      <span className="text-slate-700 font-bold uppercase text-[9px]">
                        Store In-Charge
                      </span>
                      <span className="text-[8px] text-slate-400 pb-0.5">(Goods Received By)</span>
                    </div>

                    <div className="flex flex-col justify-between pt-6 sm:pt-8 border-b border-slate-400">
                      <span className="text-slate-700 font-bold uppercase text-[9px]">
                        Authorized Signatory
                      </span>
                      <span className="text-[8px] text-slate-400 pb-0.5 break-words">For {buyerName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 no-print shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {processedItems.length} Line Items
            </span>
            &bull;
            <span>
              Net: <strong className="text-amber-600">₹{netAmount.toLocaleString("en-IN")}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPdfWindow}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <FaFilePdf /> Download / Print PDF
            </button>
            <Link
              href="/dashboard/purchase/payment"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <FaHandHoldingUsd /> Settle / Pay
            </Link>
            <button
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
