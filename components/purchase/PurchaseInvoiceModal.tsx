"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FaTimes,
  FaPrint,
  FaDownload,
  FaCheckCircle,
  FaMoneyBillWave,
  FaBoxes,
  FaTruck,
  FaReceipt,
} from "react-icons/fa";

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  bill: any;
  onClose: () => void;
  company?: any;
}

const money = (value: any) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const text = (value: any, fallback = "-") => {
  const v = String(value ?? "").trim();
  return v || fallback;
};

export default function PurchaseInvoiceModal({
  isOpen,
  bill,
  onClose,
  company,
}: PurchaseInvoiceModalProps) {
  const [details, setDetails] = useState<any>(bill || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !bill?._id) return;

    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ id: String(bill._id) });
        const res = await fetch(`/api/purchase/invoice?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!cancelled && json?.success && json?.bill) {
          setDetails(json.bill);
        } else if (!cancelled) {
          setDetails(bill);
        }
      } catch (error) {
        console.error("Purchase invoice detail error:", error);
        if (!cancelled) setDetails(bill);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, bill?._id]);

  const items = Array.isArray(details?.items) ? details.items : [];

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.gross ?? Number(item.qty || 0) * Number(item.rate || 0)),
      0
    );

    const discount = items.reduce(
      (sum: number, item: any) => sum + Number(item.discountAmount || 0),
      0
    );

    const taxable = items.reduce(
      (sum: number, item: any) => sum + Number(item.taxableAmount || 0),
      0
    );

    const gst = items.reduce(
      (sum: number, item: any) => sum + Number(item.gstAmount || 0),
      0
    );

    const calculatedNet = taxable + gst;

    return {
      subtotal,
      discount,
      taxable,
      gst,
      net: Number(details?.netAmount ?? calculatedNet ?? 0),
    };
  }, [items, details?.netAmount]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const companyName =
    company?.companyName || company?.name || "MABSOL INFOTECH PRIVATE LIMITED";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 print:bg-white print:p-0">
      <div className="w-full max-w-6xl h-[94vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col print:h-auto print:max-w-none print:rounded-none print:shadow-none">
        {/* Toolbar */}
        <div className="shrink-0 bg-slate-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FaReceipt className="text-amber-400" />
            Purchase Invoice Preview
            {loading && (
              <span className="text-slate-400 font-normal">Loading items...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              <FaDownload /> Download / Print PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/30 hover:bg-white/10 text-xs font-bold"
            >
              <FaPrint /> Print
            </button>

            <button
              type="button"
              onClose ={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20"
              onClick={onClose}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Invoice */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-5 md:p-8 print:overflow-visible print:bg-white print:p-0">
          <div className="mx-auto max-w-5xl bg-white shadow-sm print:max-w-none print:shadow-none">
            <div className="p-5 md:p-8 space-y-5 text-slate-800">
              {/* Header */}
              <div className="flex items-start justify-between gap-5 border-b-2 border-slate-900 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    {company?.logo && (
                      <img
                        src={company.logo}
                        alt="Company Logo"
                        className="h-12 w-12 object-contain"
                      />
                    )}
                    <div>
                      <h1 className="text-xl md:text-2xl font-black uppercase">
                        {companyName}
                      </h1>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {text(company?.address)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        GSTIN: {text(company?.gstNo || company?.gstin)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-xl font-black uppercase">Purchase Bill</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Marg MDIS / DIS Source
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                    <FaCheckCircle /> {text(details?.paymentStatus, "Pending")}
                  </span>
                </div>
              </div>

              {/* Supplier + Bill info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-2">
                    Billed By / Supplier (Vendor)
                  </p>
                  <h3 className="text-lg font-black">
                    {text(details?.vendorName, "Supplier")}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px]">
                    <span>Vendor Code</span>
                    <strong>{text(details?.vendorCode)}</strong>
                    <span>GSTIN</span>
                    <strong>{text(details?.vendorGst)}</strong>
                    <span>Phone</span>
                    <strong>{text(details?.vendorPhone)}</strong>
                    <span>Address</span>
                    <strong>{text(details?.vendorAddress)}</strong>
                  </div>
                </div>

                <div className="border rounded-xl p-4">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-2">
                    Invoice Details
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <span>Bill Number</span>
                    <strong>{text(details?.billNumber)}</strong>
                    <span>Supplier Inv No</span>
                    <strong>{text(details?.supplierInvoiceNo)}</strong>
                    <span>Invoice Date</span>
                    <strong>{text(details?.billDate)}</strong>
                    <span>Due Date</span>
                    <strong>{text(details?.dueDate)}</strong>
                    <span>PO Number</span>
                    <strong>{text(details?.poNumber)}</strong>
                    <span>Payment</span>
                    <strong>{text(details?.paymentStatus, "Pending")}</strong>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase">
                    <FaBoxes /> Goods / Products
                  </div>
                  <div className="text-[10px] font-bold">
                    {items.length} Line Item{items.length === 1 ? "" : "s"}
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading Marg DIS items...
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-12 text-center text-xs text-rose-500 font-bold">
                    No DIS item rows found for this Marg purchase voucher.
                    <div className="text-[10px] text-slate-400 font-normal mt-1">
                      Header found in MDIS, but item voucher linkage did not match.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-100 border-b">
                        <tr>
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-left">HSN/SAC</th>
                          <th className="p-2 text-left">Batch</th>
                          <th className="p-2 text-left">Exp.</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Free</th>
                          <th className="p-2 text-right">MRP</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Disc.</th>
                          <th className="p-2 text-right">Taxable</th>
                          <th className="p-2 text-right">GST</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item: any, index: number) => (
                          <tr key={item._id || `${item.productCode}-${index}`}>
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2 min-w-[180px]">
                              <div className="font-bold">
                                {text(item.productName)}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {text(item.productCode)} · {text(item.unit)}
                              </div>
                            </td>
                            <td className="p-2">{text(item.hsnCode)}</td>
                            <td className="p-2">{text(item.batchNo)}</td>
                            <td className="p-2">{text(item.expDate)}</td>
                            <td className="p-2 text-right font-bold">
                              {Number(item.qty || 0)}
                            </td>
                            <td className="p-2 text-right">
                              {Number(item.freeQty || 0)}
                            </td>
                            <td className="p-2 text-right">
                              {money(item.mrp)}
                            </td>
                            <td className="p-2 text-right">
                              {money(item.rate)}
                            </td>
                            <td className="p-2 text-right">
                              {Number(item.discountPercent || 0).toFixed(2)}%
                            </td>
                            <td className="p-2 text-right">
                              {money(item.taxableAmount)}
                            </td>
                            <td className="p-2 text-right">
                              {money(item.gstAmount)}
                            </td>
                            <td className="p-2 text-right font-black">
                              {money(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Tax + totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <h3 className="text-[10px] font-black uppercase mb-3">
                    GST Tax Analysis Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span>Taxable Value</span>
                    <strong className="text-right">{money(totals.taxable)}</strong>
                    <span>Total GST</span>
                    <strong className="text-right">{money(totals.gst)}</strong>
                    <span>CGST</span>
                    <strong className="text-right">{money(details?.cgst)}</strong>
                    <span>SGST</span>
                    <strong className="text-right">{money(details?.sgst)}</strong>
                    <span>IGST</span>
                    <strong className="text-right">{money(details?.igst)}</strong>
                  </div>
                </div>

                <div className="border rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal (Gross)</span>
                    <strong>{money(totals.subtotal)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discount</span>
                    <strong>{money(totals.discount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxable Value</span>
                    <strong>{money(totals.taxable)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tax</span>
                    <strong>{money(totals.gst)}</strong>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center bg-slate-950 text-white -mx-4 px-4 py-3">
                    <span className="font-black">NET BILL TOTAL</span>
                    <strong className="text-xl">{money(totals.net)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Amount Paid</span>
                    <strong>{money(details?.paidAmount)}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600 font-black">
                    <span>Balance Due</span>
                    <strong>{money(details?.balanceAmount)}</strong>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border rounded-xl p-4 text-[10px] text-slate-500">
                <div className="flex items-center gap-2 font-black text-slate-700 mb-1">
                  <FaTruck /> Bill Remarks / Notes
                </div>
                <p>{text(details?.remarks, "No remarks")}</p>
                <p className="mt-2">
                  Source: Marg MDIS / DIS Purchase Register
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="text-xs font-bold text-slate-500">
            {items.length} Line Items · Net: {money(totals.net)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold"
            >
              <FaDownload /> Download / Print PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible !important; }
          .fixed.inset-0 { position: static !important; background: white !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  );
}
