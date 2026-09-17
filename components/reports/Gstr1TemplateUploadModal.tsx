"use client";

import React, { useState, useRef } from "react";

interface Gstr1TemplateUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    month: number;
    year: number;
    companyId?: string;
    periodLabel?: string;
}

interface ChecklistItem {
    title: string;
    status: "pass" | "warn" | "info";
    detail: string;
}

interface AiValidationResult {
    isValid: boolean;
    templateVersion: string;
    isOfficialGovtTemplate: boolean;
    confidence: number;
    summary: string;
    checklist: ChecklistItem[];
    changesDetected: string[];
    aiNotes: string;
    source: "ai" | "rule-engine";
}

interface InspectionSummary {
    fileName: string;
    sheetCount: number;
    sheetNames: string[];
    hasMasterSheet: boolean;
    hasHelpSheet: boolean;
    detectedVersionEstimate?: string;
}

interface DataSummary {
    month: number;
    year: number;
    period: string;
    companyGstin: string;
    invoiceCount: number;
    totalValue: number;
    taxableValue: number;
    b2bCount: number;
    b2csCount: number;
    hsnItemCount: number;
}

export default function Gstr1TemplateUploadModal({
    isOpen,
    onClose,
    month,
    year,
    companyId,
    periodLabel,
}: Gstr1TemplateUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inspection, setInspection] = useState<InspectionSummary | null>(null);
    const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
    const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
            setError("Please upload an Excel workbook with .xlsx extension.");
            return;
        }
        setError(null);
        setFile(selectedFile);
        setInspection(null);
        setAiResult(null);
        setDataSummary(null);
        // Automatically verify
        verifyTemplate(selectedFile);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const verifyTemplate = async (fileToVerify: File) => {
        setVerifying(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", fileToVerify);
            formData.append("action", "verify");
            formData.append("month", String(month));
            formData.append("year", String(year));
            if (companyId) formData.append("companyId", companyId);

            const res = await fetch("/api/reports/gstr1/ai-template", {
                method: "POST",
                body: formData,
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || "Failed to inspect template.");
            }

            setInspection(json.inspection);
            setAiResult(json.aiValidation);
            if (json.dataSummary) {
                setDataSummary(json.dataSummary);
            }
        } catch (err: any) {
            setError(err?.message || "An error occurred while verifying the template.");
        } finally {
            setVerifying(false);
        }
    };

    const handleDownloadPopulatedExcel = async () => {
        if (!file) return;
        setGenerating(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("action", "fill");
            formData.append("month", String(month));
            formData.append("year", String(year));
            if (companyId) formData.append("companyId", companyId);

            const res = await fetch("/api/reports/gstr1/ai-template", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || "Failed to generate populated Excel.");
            }

            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") || "";
            const match = /filename="?([^";]+)"?/.exec(disposition);
            const downloadName = match?.[1] || `GSTR1_${periodLabel || `${month}_${year}`}_Template.xlsx`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err?.message || "Failed to populate and download Excel file.");
        } finally {
            setGenerating(false);
        }
    };

    const resetSelection = () => {
        setFile(null);
        setInspection(null);
        setAiResult(null);
        setDataSummary(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="gstr1-modal-overlay" onClick={onClose}>
            <div className="gstr1-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* ── Modal Header ── */}
                <div className="gstr1-modal-header">
                    <div className="gstr1-modal-title-area">
                        <div className="gstr1-modal-badge">
                            <span className="sparkle">✨</span> Smart AI Template Engine
                        </div>
                        <h2 className="gstr1-modal-title">Upload GST Template &amp; Auto-Fill</h2>
                        <p className="gstr1-modal-sub">
                            Govt updates GSTR-1 Excel template version? Upload any official <code>.xlsx</code> from the GST portal — Smart AI validates formatting, preserves formulas &amp; maps your sales data.
                        </p>
                    </div>
                    <button className="gstr1-modal-close" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                {/* ── Modal Body ── */}
                <div className="gstr1-modal-body">
                    {/* Step 1: Upload Box */}
                    {!file && (
                        <div
                            className={`gstr1-dropzone ${isDragging ? "dragging" : ""}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                }}
                            />
                            <div className="gstr1-dropzone-icon">📁</div>
                            <div className="gstr1-dropzone-title">
                                Drag &amp; drop official GSTR-1 Excel template here
                            </div>
                            <div className="gstr1-dropzone-sub">
                                or click to browse files (e.g. <code>GSTR1_Excel_Workbook_Template_V2.2.xlsx</code> or newer)
                            </div>
                            <div className="gstr1-dropzone-tip">
                                💡 Tip: Download blank template from <strong>gst.gov.in → Downloads → Offline Tools → GSTR-1 Excel Workbook Template</strong>
                            </div>
                        </div>
                    )}

                    {/* Step 2: File Selected & AI Processing */}
                    {file && (
                        <div className="gstr1-file-card">
                            <div className="gstr1-file-info">
                                <div className="gstr1-file-icon">📊</div>
                                <div className="gstr1-file-details">
                                    <div className="gstr1-file-name">{file.name}</div>
                                    <div className="gstr1-file-size">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Selected for {periodLabel || `Month ${month}/${year}`}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="gstr1-btn-change"
                                onClick={resetSelection}
                                disabled={verifying || generating}
                            >
                                Change File
                            </button>
                        </div>
                    )}

                    {/* Verifying Loader */}
                    {verifying && (
                        <div className="gstr1-ai-loading">
                            <div className="gstr1-ai-spinner" />
                            <div className="gstr1-ai-loading-text">
                                <strong>Smart AI is inspecting workbook structure...</strong>
                                <span>Scanning 32 worksheets, row 4 headers, formulas &amp; master validation sheets</span>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="gstr1-modal-error">
                            <span>⚠️</span>
                            <div>{error}</div>
                        </div>
                    )}

                    {/* Step 3: AI Verification Report */}
                    {aiResult && !verifying && (
                        <div className="gstr1-ai-report">
                            {/* Status Header */}
                            <div className={`gstr1-ai-status-banner ${aiResult.isValid ? "pass" : "warn"}`}>
                                <div className="gstr1-ai-status-icon">
                                    {aiResult.isValid ? "✅" : "⚠️"}
                                </div>
                                <div className="gstr1-ai-status-content">
                                    <div className="gstr1-ai-status-title">
                                        {aiResult.isValid
                                            ? "Template Successfully Verified & Ready to Fill"
                                            : "Template Partially Compatible"}
                                    </div>
                                    <div className="gstr1-ai-status-sub">{aiResult.summary}</div>
                                </div>
                                <div className="gstr1-source-pill">
                                    {aiResult.source === "ai" ? "⚡ Powered by Smart AI" : "⚡ Built-in Schema Engine"}
                                </div>
                            </div>

                            {/* Inspection Grid */}
                            <div className="gstr1-ai-grid">
                                <div className="gstr1-stat-card">
                                    <div className="gstr1-stat-lbl">Detected Version</div>
                                    <div className="gstr1-stat-val highlight">{aiResult.templateVersion}</div>
                                </div>
                                <div className="gstr1-stat-card">
                                    <div className="gstr1-stat-lbl">Worksheets</div>
                                    <div className="gstr1-stat-val">{inspection?.sheetCount || 32} Sheets</div>
                                </div>
                                <div className="gstr1-stat-card">
                                    <div className="gstr1-stat-lbl">Target Period</div>
                                    <div className="gstr1-stat-val">{periodLabel || `${month}/${year}`}</div>
                                </div>
                                <div className="gstr1-stat-card">
                                    <div className="gstr1-stat-lbl">CRM Invoices to Inject</div>
                                    <div className="gstr1-stat-val text-success">
                                        {dataSummary?.invoiceCount ?? "—"} Invoices
                                    </div>
                                </div>
                            </div>

                            {/* Checklist */}
                            {aiResult.checklist && aiResult.checklist.length > 0 && (
                                <div className="gstr1-checklist">
                                    <div className="gstr1-checklist-title">Inspection Checklist:</div>
                                    {aiResult.checklist.map((item, idx) => (
                                        <div key={idx} className={`gstr1-check-item ${item.status}`}>
                                            <span className="gstr1-check-icon">
                                                {item.status === "pass" ? "✔" : item.status === "warn" ? "!" : "ℹ"}
                                            </span>
                                            <div className="gstr1-check-text">
                                                <strong>{item.title}:</strong> {item.detail}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* AI Guidance Notes */}
                            {aiResult.aiNotes && (
                                <div className="gstr1-ai-note">
                                    <strong>AI Guidance:</strong> {aiResult.aiNotes}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ── */}
                <div className="gstr1-modal-footer">
                    <button
                        className="gstr1-modal-btn gstr1-btn-cancel"
                        onClick={onClose}
                        disabled={verifying || generating}
                    >
                        Close
                    </button>

                    {aiResult && aiResult.isValid && (
                        <button
                            className="gstr1-modal-btn gstr1-btn-generate"
                            onClick={handleDownloadPopulatedExcel}
                            disabled={verifying || generating}
                        >
                            {generating ? (
                                <>
                                    <span className="gstr1-btn-spinner" /> Populating &amp; Generating Excel…
                                </>
                            ) : (
                                <>⬇ Download Populated GSTR-1 Excel</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .gstr1-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                .gstr1-modal-content {
                    background: #ffffff;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 680px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    max-height: 90vh;
                    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes modalPop {
                    0% {
                        opacity: 0;
                        transform: scale(0.96) translateY(8px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .gstr1-modal-header {
                    padding: 20px 24px;
                    background: linear-gradient(135deg, #0f172a, #1e293b);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    position: relative;
                }
                .gstr1-modal-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(217, 70, 239, 0.18);
                    color: #f0abfc;
                    border: 1px solid rgba(217, 70, 239, 0.35);
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 9999px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }
                .gstr1-modal-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #ffffff;
                }
                .gstr1-modal-sub {
                    margin: 4px 0 0;
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.4;
                }
                .gstr1-modal-close {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: #cbd5e1;
                    font-size: 24px;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                }
                .gstr1-modal-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }
                .gstr1-modal-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .gstr1-dropzone {
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 32px 20px;
                    text-align: center;
                    cursor: pointer;
                    background: #f8fafc;
                    transition: all 0.2s;
                }
                .gstr1-dropzone:hover,
                .gstr1-dropzone.dragging {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
                .gstr1-dropzone-icon {
                    font-size: 40px;
                    margin-bottom: 8px;
                }
                .gstr1-dropzone-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                }
                .gstr1-dropzone-sub {
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 4px;
                }
                .gstr1-dropzone-tip {
                    font-size: 11px;
                    color: #475569;
                    background: #e2e8f0;
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 6px;
                    margin-top: 14px;
                }
                .gstr1-file-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 12px 16px;
                    border-radius: 10px;
                }
                .gstr1-file-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .gstr1-file-icon {
                    font-size: 28px;
                }
                .gstr1-file-name {
                    font-weight: 600;
                    font-size: 13px;
                    color: #0f172a;
                }
                .gstr1-file-size {
                    font-size: 11px;
                    color: #64748b;
                }
                .gstr1-btn-change {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .gstr1-btn-change:hover {
                    background: #f8fafc;
                }
                .gstr1-ai-loading {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 16px;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 10px;
                }
                .gstr1-ai-spinner {
                    width: 28px;
                    height: 28px;
                    border: 3px solid #bfdbfe;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                .gstr1-ai-loading-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .gstr1-ai-loading-text strong {
                    font-size: 13px;
                    color: #1e3a8a;
                }
                .gstr1-ai-loading-text span {
                    font-size: 11px;
                    color: #3b82f6;
                }
                .gstr1-modal-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #b91c1c;
                    border-radius: 8px;
                    font-size: 12px;
                }
                .gstr1-ai-status-banner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    margin-bottom: 12px;
                }
                .gstr1-ai-status-banner.pass {
                    background: #f0fdf4;
                    border: 1.5px solid #86efac;
                }
                .gstr1-ai-status-banner.warn {
                    background: #fffbeb;
                    border: 1.5px solid #fde68a;
                }
                .gstr1-ai-status-icon {
                    font-size: 22px;
                }
                .gstr1-ai-status-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #14532d;
                }
                .gstr1-ai-status-sub {
                    font-size: 11px;
                    color: #166534;
                }
                .gstr1-source-pill {
                    margin-left: auto;
                    font-size: 10px;
                    font-weight: 700;
                    color: #4338ca;
                    background: #e0e7ff;
                    padding: 4px 8px;
                    border-radius: 6px;
                    white-space: nowrap;
                }
                .gstr1-ai-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .gstr1-stat-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 8px 10px;
                    text-align: center;
                }
                .gstr1-stat-lbl {
                    font-size: 10px;
                    color: #64748b;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                .gstr1-stat-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 2px;
                }
                .gstr1-stat-val.highlight {
                    color: #2563eb;
                }
                .gstr1-checklist {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px 12px;
                    font-size: 11px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .gstr1-checklist-title {
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 2px;
                }
                .gstr1-check-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                }
                .gstr1-check-item.pass .gstr1-check-icon {
                    color: #16a34a;
                    font-weight: bold;
                }
                .gstr1-check-item.warn .gstr1-check-icon {
                    color: #d97706;
                    font-weight: bold;
                }
                .gstr1-check-text {
                    color: #475569;
                    line-height: 1.3;
                }
                .gstr1-ai-note {
                    margin-top: 10px;
                    padding: 8px 12px;
                    background: #fdf4ff;
                    border: 1px solid #f5d0fe;
                    border-radius: 8px;
                    font-size: 11px;
                    color: #86198f;
                }
                .gstr1-modal-footer {
                    padding: 14px 24px;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .gstr1-modal-btn {
                    padding: 8px 18px;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .gstr1-btn-cancel {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #475569;
                }
                .gstr1-btn-cancel:hover {
                    background: #f1f5f9;
                }
                .gstr1-btn-generate {
                    background: linear-gradient(135deg, #16a34a, #15803d);
                    border: 1.5px solid #166534;
                    color: #ffffff;
                    box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.25);
                }
                .gstr1-btn-generate:hover:not(:disabled) {
                    background: linear-gradient(135deg, #15803d, #14532d);
                    transform: translateY(-1px);
                }
                .gstr1-btn-generate:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .gstr1-btn-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
            `}</style>
        </div>
    );
}
