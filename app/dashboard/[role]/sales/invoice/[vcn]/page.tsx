"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvoiceView() {
    const params = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<any>(null);

    const rawVcn = params?.vcn;
    const vcnStr = Array.isArray(rawVcn) ? rawVcn[0] : (rawVcn || "");

    useEffect(() => {
        if (vcnStr) {
            loadInvoice(vcnStr);
        }
    }, [vcnStr]);

    const loadInvoice = async (targetVcn: string) => {
        try {
            const res = await fetch(`/api/sales/invoice/${encodeURIComponent(targetVcn)}`);
            const data = await res.json();
            setInvoice(data);
        } catch {
            setInvoice({ success: false, message: "Network error — could not load invoice." });
        }
    };

    if (!invoice) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
                <div className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    Loading invoice details…
                </div>
            </div>
        );
    }

    if (invoice.success === false || !invoice.header) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
                    <h3 className="text-lg font-bold text-slate-800">Invoice #{vcnStr || "N/A"} Not Found</h3>
                    <p className="mt-1 text-xs text-slate-500">{invoice.message || "The requested invoice or purchase voucher could not be located."}</p>
                    <button
                        onClick={() => router.push("/dashboard/sales/invoice")}
                        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-indigo-700"
                    >
                        &larr; Back to Invoices List
                    </button>
                </div>
            </div>
        );
    }

    const h = invoice.header;
    const c = invoice.customer;
    const s = invoice.summary;

    const money = (v: any) =>
        v === undefined || v === null || v === ""
            ? "-"
            : Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-slate-100 py-6 print:bg-white print:py-0">
            {/* Print rules: hide everything on the page except the invoice sheet itself
          (this reaches past the dashboard shell / sidebar / topbar too), and
          force Tailwind background colors to actually print instead of
          being stripped by the browser's default print behaviour. */}
            <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-printable,
          #invoice-printable * {
            visibility: visible;
          }
          html, body {
            height: auto !important;
          }
          #invoice-printable {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            box-shadow: none;
            border: none;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          #invoice-printable table {
            page-break-inside: auto;
          }
          #invoice-printable tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          @page {
            margin: 8mm;
          }

          /* Compact everything so the invoice fits on a single printed page */
          #invoice-printable {
            font-size: 11px;
          }
          #invoice-printable .invoice-header {
            padding: 14px 20px !important;
          }
          #invoice-printable .invoice-header h1 {
            font-size: 16px !important;
          }
          #invoice-printable .invoice-header .invoice-no {
            font-size: 15px !important;
          }
          #invoice-printable .invoice-section {
            padding: 10px 20px !important;
          }
          #invoice-printable table {
            font-size: 10px !important;
          }
          #invoice-printable table th,
          #invoice-printable table td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          #invoice-printable .summary-row {
            font-size: 10px !important;
          }
          #invoice-printable .grand-total {
            padding: 8px 14px !important;
          }
          #invoice-printable .grand-total .grand-total-amount {
            font-size: 14px !important;
          }
          #invoice-printable .invoice-footer {
            padding: 10px 20px !important;
            font-size: 9px !important;
          }
          #invoice-printable .invoice-footer .signatory-space {
            margin-bottom: 20px !important;
          }
        }
      `}</style>

            {/* Toolbar — hidden on print */}
            <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between px-4 print:hidden">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </button>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
                    </svg>
                    Print
                </button>
            </div>

            {/* Invoice sheet */}
            <div
                id="invoice-printable"
                className="mx-auto max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0"
            >
                {/* Letterhead */}
                <div className="invoice-header relative overflow-hidden bg-indigo-700 px-8 py-7">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                                {h?.TYPE === "P" ? "Purchase Invoice" : h?.TYPE === "PROFORMA" ? "Proforma Estimate" : "Tax Invoice"}
                            </p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                                {h?.VOUCHER || h?.VCN || "Invoice"}
                            </h1>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-widest text-indigo-200">
                                {h?.TYPE === "P" ? "Voucher No" : "Invoice No"}
                            </p>
                            <p className="invoice-no font-mono text-xl font-semibold text-white">{h?.VCN || h?.VOUCHER}</p>
                        </div>
                    </div>
                </div>

                {/* Meta strip */}
                <div className="invoice-section grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100 bg-indigo-50/50 px-8 py-5 sm:grid-cols-4">
                    <MetaField label="Date" value={h?.DATE} />
                    <MetaField label="Type" value={h?.TYPE === "P" ? "Purchase" : h?.TYPE === "PROFORMA" ? "Proforma" : "Sales"} />
                    <MetaField label="Voucher" value={h?.VOUCHER || h?.VCN} />
                    <MetaField label="Invoice No" value={h?.VCN || h?.VOUCHER} mono />
                </div>

                {/* Billed to / Party */}
                <div className="invoice-section border-b border-slate-200 px-8 py-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                        {h?.TYPE === "P" ? "Supplier / Party Details" : "Billed To Customer"}
                    </p>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <p className="text-base font-semibold text-slate-900">{c?.PARNAM || c?.NAME || h?.CODEP || "-"}</p>
                        </div>
                        <MetaField label="City" value={c?.CITY} />
                        <MetaField label="GSTIN" value={c?.GSTNO} mono />
                    </div>
                </div>

                {/* Items */}
                <div className="invoice-section px-8 py-6">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-indigo-600 text-left text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                <th className="py-2 pr-2 text-left">#</th>
                                <th className="py-2 pr-2 text-left">Product</th>
                                <th className="py-2 pr-2 text-left">Company</th>
                                <th className="py-2 pr-2 text-left">Batch</th>
                                <th className="py-2 pr-2 text-left">Expiry</th>
                                <th className="py-2 pr-2 text-right">Qty</th>
                                <th className="py-2 pr-2 text-right">Free</th>
                                <th className="py-2 pr-2 text-right">Rate</th>
                                <th className="py-2 pr-2 text-right">MRP</th>
                                <th className="py-2 pr-2 text-right">Tax %</th>
                                <th className="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoice.items.map((item: any, i: number) => (
                                <tr key={i} className="text-slate-700 odd:bg-indigo-50/30">
                                    <td className="py-2.5 pr-2 text-slate-400">{i + 1}</td>
                                    <td className="py-2.5 pr-2 font-medium text-slate-900">{item.product}</td>
                                    <td className="py-2.5 pr-2 text-slate-500">{item.company}</td>
                                    <td className="py-2.5 pr-2 font-mono text-xs text-slate-500">{item.batch}</td>
                                    <td className="py-2.5 pr-2 text-slate-500">{item.expiry}</td>
                                    <td className="py-2.5 pr-2 text-right tabular-nums">{item.qty}</td>
                                    <td className="py-2.5 pr-2 text-right tabular-nums text-slate-400">{item.free}</td>
                                    <td className="py-2.5 pr-2 text-right tabular-nums">{money(item.rate)}</td>
                                    <td className="py-2.5 pr-2 text-right tabular-nums">{money(item.mrp)}</td>
                                    <td className="py-2.5 pr-2 text-right tabular-nums">{item.taxPct !== undefined ? item.taxPct : item.tax || 0}%</td>
                                    <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-indigo-700">
                                        {money(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="invoice-section flex justify-end border-t border-slate-200 px-8 py-6">
                    <div className="w-full max-w-xs space-y-2 text-sm">
                        <SummaryRow label="Taxable Amount" value={money(s.taxable)} />
                        <SummaryRow label="CGST" value={money(s.cgst)} />
                        <SummaryRow label="SGST" value={money(s.sgst)} />
                        <SummaryRow label="Total Tax" value={money(s.tax)} />
                        <SummaryRow label="Round Off" value={money(s.round)} />
                        <div className="grand-total mt-2 flex items-center justify-between rounded-md bg-indigo-700 px-4 py-3 shadow-sm shadow-indigo-200">
                            <span className="text-sm font-semibold uppercase tracking-wide text-indigo-200">
                                Grand Total
                            </span>
                            <span className="grand-total-amount font-mono text-lg font-bold text-white">
                                ₹ {money(s.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="invoice-footer flex items-end justify-between border-t border-slate-200 bg-indigo-50/40 px-8 py-6 text-xs text-slate-400">
                    <p>This is a computer-generated invoice.</p>
                    <div className="text-right">
                        <p className="signatory-space mb-8">Authorised Signatory</p>
                        <p className="border-t border-indigo-200 pt-1">For {h.VOUCHER || "the company"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetaField({ label, value, mono = false }: { label: string; value?: any; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`mt-0.5 text-sm text-slate-800 ${mono ? "font-mono" : "font-medium"}`}>
                {value || "-"}
            </p>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="summary-row flex items-center justify-between text-slate-600">
            <span>{label}</span>
            <span className="font-mono tabular-nums text-slate-900">{value}</span>
        </div>
    );
}