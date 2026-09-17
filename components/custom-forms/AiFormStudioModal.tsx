"use client";

import React, { useState } from "react";
import {
  FaMagic,
  FaTimes,
  FaRobot,
  FaStar,
  FaArrowRight,
  FaCheck,
  FaMicrochip,
  FaBolt,
  FaBrain,
  FaInfoCircle,
  FaExclamationTriangle,
  FaRedo,
  FaShieldAlt,
} from "react-icons/fa";

interface AiFormStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySchema: (schema: any, meta?: any) => void;
}

interface GeminiModelOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  badgeColor: string;
}

interface ApiAlertDetails {
  title: string;
  message: string;
  hint?: string;
  status?: number;
  isQuota?: boolean;
}

const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tag: "Recommended",
    desc: "Fastest response with top accuracy for CRM field schemas",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    tag: "Deep Reasoning",
    desc: "Advanced logic, complex sub-repeaters, and multi-step conditions",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    tag: "Lightweight",
    desc: "Ultra-fast generation with minimal token latency",
    badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    tag: "Latest",
    desc: "Continuously updated latest production Flash model",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  {
    id: "gemini-pro-latest",
    name: "Gemini Pro Latest",
    tag: "Pro Edition",
    desc: "Production pro-tier reasoning model for detailed clinical surveys",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
];

export default function AiFormStudioModal({
  isOpen,
  onClose,
  onApplySchema,
}: AiFormStudioModalProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [generating, setGenerating] = useState(false);
  const [errorAlert, setErrorAlert] = useState<ApiAlertDetails | null>(null);
  const [warningAlert, setWarningAlert] = useState<{
    alert: ApiAlertDetails;
    pendingSchema: any;
    meta: any;
  } | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const presets = [
    {
      title: "📋 Doctor Call DCR & Sampling",
      category: "Field Operations",
      prompt:
        "Create an MR Daily Call Report form with Doctor selection, discussion notes, sample quantity repeater, and live GPS stamp.",
    },
    {
      title: "⭐ Doctor Brand Preference Survey",
      category: "Market Research",
      prompt:
        "Create a Doctor Feedback Survey with rating questions, specialty select dropdown, and prescription preference.",
    },
    {
      title: "💸 MR Expense & Travel Claim",
      category: "HR & Accounts",
      prompt:
        "Create an MR Daily Travel Expense Claim Form with expense itemized list repeater, travel type, and file upload receipt proof.",
    },
    {
      title: "🏪 Chemist POB & Stockist Booking",
      category: "Sales & Orders",
      prompt:
        "Create a Chemist POB Order Booking Form with party name, product items repeater table, unit rates, and signature.",
    },
    {
      title: "💰 Monthly Salary & Payroll Settlement",
      category: "HR & Payroll",
      prompt:
        "Create an Employee Monthly Salary Management and Payroll Disbursement form with employee code, designation, total working days, basic salary, HRA, TA/DA allowances, deductions (PF, ESI, TDS), net pay, and HR signature.",
    },
  ];

  const quickPromptChips = [
    { label: "+ Doctor Signature", text: " with doctor digital e-signature stamp" },
    { label: "+ Live GPS Stamp", text: " with field audit live GPS coordinates" },
    { label: "+ Sample Repeater", text: " including sample items repeater table (product, qty, batch)" },
    { label: "+ Expense Receipt", text: " with hotel & travel receipt photo upload" },
    { label: "+ 5-Star Rating", text: " with brand efficacy 1-5 star rating" },
    { label: "+ Salary Deductions", text: " with basic pay, allowances, PF, ESI, and net salary calculation" },
  ];

  if (!isOpen) return null;

  const currentModelMeta =
    GEMINI_MODELS.find((m) => m.id === selectedModel) || GEMINI_MODELS[0];

  const handleApplyPromptChip = (chipText: string) => {
    setPrompt((prev) => (prev ? `${prev.trim()}${chipText}` : chipText.replace(/^ with /, "Create a form with ")));
  };

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt !== undefined ? customPrompt : prompt;
    if (!textToUse.trim()) {
      setErrorAlert({
        title: "Prompt Required",
        message: "Please enter a custom prompt or pick a preset to generate a form.",
        hint: "Type what you want or select one of the Quick Pharma Presets.",
      });
      return;
    }

    try {
      setErrorAlert(null);
      setWarningAlert(null);
      setGenerating(true);

      const res = await fetch("/api/custom-forms/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUse,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok && !data.success) {
        setErrorAlert(
          data.errorDetails || {
            title: `Request Failed (HTTP ${res.status})`,
            message: data.error || "Failed to communicate with AI generation endpoint.",
            hint: "Please check your network connection or verify GEMINI_API_KEY in .env.",
          }
        );
        return;
      }

      if (data.success && data.formSchema) {
        // If Google Gemini free tier rate limit was reached or returned warning
        if (data.warning) {
          setWarningAlert({
            alert: data.warning,
            pendingSchema: data.formSchema,
            meta: data,
          });
          return;
        }

        // Pure Gemini success! Apply directly to form builder canvas
        onApplySchema(data.formSchema, data);
        onClose();
      } else {
        setErrorAlert({
          title: "AI Generation Error",
          message: data.error || "No valid schema was returned by Gemini.",
          hint: "Try picking a different model or tweaking your prompt.",
        });
      }
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setErrorAlert({
        title: "Network / Client Exception",
        message: err.message || "Could not contact AI generation server.",
        hint: "Ensure the local dev server is active and accessible.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptWarningFallback = () => {
    if (warningAlert?.pendingSchema) {
      onApplySchema(warningAlert.pendingSchema, warningAlert.meta);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generating) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-4 sm:p-5 text-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner text-amber-300">
                <FaMagic className="text-lg sm:text-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    Form Studio AI Assistant
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                    Enterprise AI
                  </span>
                </div>
                <p className="text-xs text-purple-100 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Architect complete enterprise forms in seconds using AI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={generating}
              aria-label="Close modal"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 disabled:opacity-50"
            >
              <FaTimes className="text-sm sm:text-base" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
          {/* Warning / Quota Alert Banner (Free Tier & Fallback Notification) */}
          {warningAlert && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                  <FaExclamationTriangle className="text-amber-500 shrink-0 text-base" />
                  <span>{warningAlert.alert.title}</span>
                </div>
                <button
                  onClick={() => setWarningAlert(null)}
                  className="text-amber-500 hover:text-amber-700 text-xs"
                >
                  <FaTimes />
                </button>
              </div>

              <p className="text-amber-900 dark:text-amber-100 leading-relaxed font-medium">
                {warningAlert.alert.message}
              </p>

              {warningAlert.alert.hint && (
                <div className="p-2.5 bg-amber-100/70 dark:bg-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                  💡 {warningAlert.alert.hint}
                </div>
              )}

              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptWarningFallback}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <FaCheck /> Load Offline Form Schema Now
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <FaRedo className="text-xs" /> Retry with AI (Wait a bit)
                </button>
              </div>
            </div>
          )}

          {/* Critical Error Alert Banner */}
          {errorAlert && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                  <FaInfoCircle className="text-rose-500 shrink-0 text-base" />
                  <span>{errorAlert.title}</span>
                </div>
                <button
                  onClick={() => setErrorAlert(null)}
                  className="text-rose-500 hover:text-rose-700 text-xs"
                >
                  <FaTimes />
                </button>
              </div>

              <p className="text-rose-900 dark:text-rose-100 leading-relaxed font-medium">
                {errorAlert.message}
              </p>

              {errorAlert.hint && (
                <div className="p-2.5 bg-rose-100/70 dark:bg-rose-900/30 rounded-xl text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                  💡 {errorAlert.hint}
                </div>
              )}
            </div>
          )}

          {/* Model Selection Panel */}
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FaMicrochip className="text-violet-600 dark:text-violet-400" />
                AI Model Architecture Selector
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>AI Neural Engine Active</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={generating}
                  className="w-full pl-3 pr-8 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer disabled:opacity-60 transition-all shadow-2xs"
                >
                  {GEMINI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} — [{model.tag}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${currentModelMeta.badgeColor}`}
                >
                  {currentModelMeta.tag}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              💡 {currentModelMeta.desc}
            </p>
          </div>

          {/* Quick AI Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaStar className="text-amber-500" /> Quick Pharma Presets
              </label>
              <span className="text-[10px] text-slate-400">1-Click Load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {presets.map((item, idx) => {
                const isSelected = activePreset === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActivePreset(idx);
                      setPrompt(item.prompt);
                    }}
                    disabled={generating}
                    className={`p-3 text-left rounded-2xl border transition-all group relative ${
                      isSelected
                        ? "bg-violet-50 dark:bg-violet-950/40 border-violet-400 dark:border-violet-600 ring-1 ring-violet-400"
                        : "bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50/50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-violet-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <span className="text-[9px] font-semibold text-slate-400 shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom AI Prompt Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaRobot className="text-indigo-500" /> Custom AI Prompt
              </label>
              {prompt.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setActivePreset(null);
                  }}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold"
                >
                  Clear Prompt
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (activePreset !== null) setActivePreset(null);
              }}
              disabled={generating}
              placeholder="e.g. Create a Hospital Chemist Order Booking form with stockist selection, medicine repeater table with batch and pack size, live GPS stamp, and manager approval sign..."
              className="w-full p-3 sm:p-3.5 text-xs border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500 resize-none leading-relaxed transition-all shadow-inner"
            />

            {/* Quick Inspiration Chips */}
            <div className="space-y-1 pt-0.5">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <span>Quick Add to Prompt:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPromptChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPromptChip(chip.text)}
                    disabled={generating}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700/60 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 rounded-lg text-[10px] font-medium transition-colors border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-700 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all text-center disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={generating || !prompt.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {generating ? (
              <>
                <FaMagic className="animate-spin text-amber-300" />
                <span>Architecting with {currentModelMeta.name}...</span>
              </>
            ) : (
              <>
                <FaMagic className="text-amber-300" />
                <span>Generate Form Schema with AI</span>
                <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
