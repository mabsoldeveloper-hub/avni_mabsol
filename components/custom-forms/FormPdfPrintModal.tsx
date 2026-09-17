"use client";

import React, { useRef } from "react";
import { FaPrint, FaTimes, FaQrcode, FaCheckCircle, FaFileAlt } from "react-icons/fa";

interface FormPdfPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  submission: any;
}

export default function FormPdfPrintModal({
  isOpen,
  onClose,
  template,
  submission,
}: FormPdfPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !submission || !template) return null;

  // QR code now points to the PUBLIC FORM URL so scanning opens the actual form
  const publicFormUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/public-form/${template.formId}`
      : `/public-form/${template.formId}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    publicFormUrl
  )}&color=4f46e5&margin=8`;

  const submittedData = submission.data || {};

  const renderFieldValueHtml = (field: any, val: any): string => {
    if (val === undefined || val === null || val === "") return "<em style='color:#94a3b8'>—</em>";
    if (Array.isArray(val)) {
      const subFields = field.subFields || [];
      const headers = subFields.length
        ? subFields.map((sf: any) => `<th>${sf.label}</th>`).join("")
        : "<th>Data</th>";
      const rows = val
        .map((row: any) => {
          const cells = subFields.length
            ? subFields.map((sf: any) => `<td>${String(row[sf.key] ?? "—")}</td>`).join("")
            : `<td>${JSON.stringify(row)}</td>`;
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    if (typeof val === "string" && val.startsWith("data:image")) {
      return `<img src="${val}" alt="Signature" style="max-height:64px;object-fit:contain;border:1px solid #e2e8f0;border-radius:4px;padding:4px;background:#fff;" />`;
    }
    if (typeof val === "object" && val !== null && val.url) {
      return `<a href="${val.url}" style="color:#4f46e5;font-weight:700;">${val.name || "View File"}</a>`;
    }
    if (typeof val === "object" && val !== null && val.lat && val.lng) {
      return `<span style="font-weight:700;color:#0f172a;">${val.address || "GPS Stamp"}</span><br/><span style="font-size:10px;color:#64748b;font-family:monospace;">Lat: ${val.lat}, Lng: ${val.lng}</span>`;
    }
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  };

  const buildPrintHtml = (): string => {
    const fields = template.fields || [];
    const submittedDate = new Date(submission.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const fieldCells = fields
      .map((field: any) => {
        const val = submittedData[field.key];
        const isWide = Array.isArray(val);
        const spanStyle = isWide ? ' style="grid-column: span 2;"' : "";
        return `<div class="field-box"${spanStyle}><div class="field-label">${field.label}</div><div class="field-value">${renderFieldValueHtml(field, val)}</div></div>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${template.title} - Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter','Segoe UI',sans-serif;color:#1e293b;background:#fff;padding:32px 36px;font-size:12px;line-height:1.5;}
.header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px;}
.brand-name{font-size:18px;font-weight:900;color:#4f46e5;letter-spacing:1px;text-transform:uppercase;}
.brand-tagline{font-size:10px;color:#94a3b8;font-weight:600;margin-top:2px;}
.doc-title{font-size:15px;font-weight:800;color:#0f172a;margin-top:8px;}
.doc-cat{display:inline-block;margin-top:4px;font-size:10px;font-weight:700;color:#6366f1;background:#eef2ff;padding:2px 10px;border-radius:99px;text-transform:uppercase;}
.qr-block{display:flex;flex-direction:column;align-items:center;gap:4px;}
.qr-block img{width:80px;height:80px;border:2px solid #e2e8f0;border-radius:8px;padding:3px;}
.qr-label{font-size:9px;font-weight:700;color:#64748b;text-align:center;text-transform:uppercase;}
.meta-section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;border-radius:10px;margin-bottom:24px;}
.meta-label{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;}
.meta-val{font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;}
.meta-sub{font-size:10px;color:#475569;margin-top:1px;font-family:monospace;}
.badge-ok{display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;}
.section-title{font-size:11px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #e0e7ff;padding-bottom:6px;margin-bottom:16px;margin-top:8px;}
.field-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;}
.field-box{background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #6366f1;padding:10px 12px;border-radius:6px;break-inside:avoid;}
.field-label{font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;}
.field-value{font-size:13px;font-weight:600;color:#0f172a;word-break:break-word;white-space:pre-wrap;}
table{width:100%;border-collapse:collapse;margin-top:4px;}
th{background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:800;text-transform:uppercase;padding:7px 10px;text-align:left;border:1px solid #c7d2fe;}
td{border:1px solid #e2e8f0;padding:7px 10px;font-size:11px;color:#1e293b;}
tr:nth-child(even) td{background:#f8fafc;}
.footer{margin-top:40px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#94a3b8;font-weight:600;}
.footer-stamp{background:#f1f5f9;border:1px solid #e2e8f0;padding:3px 12px;border-radius:6px;font-family:monospace;font-size:10px;color:#64748b;}
@media print{body{padding:20px 24px;}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand-name">Mabsol Pharma CRM</div>
    <div class="brand-tagline">Enterprise Custom Form Studio</div>
    <div class="doc-title">${template.title}</div>
    ${template.category ? `<span class="doc-cat">${template.category}</span>` : ""}
  </div>
  <div class="qr-block">
    <img src="${qrCodeUrl}" alt="QR"/>
    <div class="qr-label">Scan to Fill Form</div>
  </div>
</div>
<div class="meta-section">
  <div>
    <div class="meta-label">Submitted By</div>
    <div class="meta-val">${submission.submittedBy?.userName || "CRM User"}</div>
    <div class="meta-sub">${submission.submittedBy?.userEmail || "—"}</div>
  </div>
  <div>
    <div class="meta-label">Date &amp; Time</div>
    <div class="meta-val">${submittedDate}</div>
    <div class="meta-sub">ID: ${submission._id}</div>
  </div>
  <div>
    <div class="meta-label">Approval Status</div>
    <div class="meta-val"><span class="badge-ok">&#10004; ${submission.status || "Submitted"}</span></div>
  </div>
</div>
<div class="section-title">&#9642; Submission Form Responses</div>
<div class="field-grid">${fieldCells}</div>
<div class="footer">
  <div>Generated via Mabsol Pharma CRM Form Studio</div>
  <div class="footer-stamp">SEC-CONFIRMED &middot; ${new Date().toLocaleDateString("en-IN")}</div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = buildPrintHtml();
    const win = window.open("", "_blank", "width=960,height=720");
    if (!win) { alert("Please allow pop-ups to print the PDF."); return; }
    win.document.write(html);
    win.document.close();
  };

  const renderPreviewValue = (field: any, val: any) => {
    if (val === undefined || val === null || val === "") {
      return <span className="text-slate-400 italic text-xs">—</span>;
    }
    if (Array.isArray(val)) {
      const subFields = field.subFields || [];
      return (
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                {subFields.map((sf: any) => (
                  <th key={sf.key} className="px-2 py-1.5 text-left text-indigo-700 font-bold uppercase bg-indigo-50 border border-indigo-200 text-[10px]">
                    {sf.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {val.map((row: any, rIdx: number) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {subFields.map((sf: any) => (
                    <td key={sf.key} className="px-2 py-1.5 border border-slate-200 text-slate-700">
                      {String(row[sf.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (typeof val === "string" && val.startsWith("data:image")) {
      return <img src={val} alt="Signature" className="h-14 object-contain border border-slate-200 rounded bg-white p-1 mt-1" />;
    }
    if (typeof val === "object" && val !== null && (val as any).url) {
      return <a href={(val as any).url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline text-xs">{(val as any).name || "View File"}</a>;
    }
    if (typeof val === "object" && val !== null && (val as any).lat) {
      return (
        <span className="text-xs font-semibold text-slate-700">
          {(val as any).address || "GPS Stamp"} <span className="text-slate-400 font-mono text-[10px]">(Lat: {(val as any).lat}, Lng: {(val as any).lng})</span>
        </span>
      );
    }
    if (typeof val === "boolean") return <span>{val ? "✅ Yes" : "❌ No"}</span>;
    return <span className="font-semibold text-slate-800">{String(val)}</span>;
  };

  const fields = template.fields || [];
  const submittedDate = new Date(submission.createdAt || Date.now()).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FaFileAlt className="text-indigo-400" />
            <span className="font-bold text-sm">Printable Form Report Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <FaPrint /> Print / Export PDF
            </button>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-900 p-6">
          <div
            ref={printRef}
            className="bg-white text-slate-900 rounded-2xl shadow-lg border border-slate-200 p-8 max-w-3xl mx-auto"
            style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-5 mb-6">
              <div>
                <div className="text-xl font-black text-indigo-600 tracking-widest uppercase">Mabsol Pharma CRM</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Enterprise Custom Form Studio</div>
                <div className="text-base font-bold text-slate-900 mt-2">{template.title}</div>
                {template.category && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {template.category}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0 ml-4">
                <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 border-2 border-indigo-200 rounded-lg p-1 object-contain" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Scan to Fill</span>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted By</div>
                <div className="font-bold text-slate-800 mt-1 text-sm">{submission.submittedBy?.userName || "CRM User"}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{submission.submittedBy?.userEmail || "—"}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date &amp; Time</div>
                <div className="font-bold text-slate-800 mt-1 text-sm">{submittedDate}</div>
                <div className="text-[10px] font-mono text-indigo-600 mt-0.5">ID: {submission._id}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Approval Status</div>
                <div className="mt-1 flex items-center gap-1.5 font-bold text-emerald-700 text-sm">
                  <FaCheckCircle className="text-emerald-500" />
                  {submission.status || "Submitted"}
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4 flex items-center gap-2">
              <FaQrcode /> Submission Form Responses
            </div>

            {/* Field Grid — 2 column */}
            <div className="grid grid-cols-2 gap-3">
              {fields.map((field: any) => {
                const val = submittedData[field.key];
                const isWide = Array.isArray(val);
                return (
                  <div
                    key={field.key}
                    className={`bg-slate-50 border border-slate-200 border-l-4 border-l-indigo-400 rounded-lg p-3 ${isWide ? "col-span-2" : "col-span-1"}`}
                  >
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{field.label}</div>
                    <div className="text-sm text-slate-800">{renderPreviewValue(field, val)}</div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <div>Generated automatically via Mabsol Pharma CRM Form Studio</div>
              <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded font-mono text-slate-500">
                SEC-CONFIRMED &middot; {new Date().toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
