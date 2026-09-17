"use client";

import React, { useState } from "react";
import {
  FaTimes,
  FaBookOpen,
  FaRocket,
  FaSlidersH,
  FaExchangeAlt,
  FaShareAlt,
  FaSignature,
  FaMapMarkerAlt,
  FaCloudUploadAlt,
  FaCalculator,
  FaTable,
  FaStar,
  FaICursor,
  FaHashtag,
  FaCalendar,
  FaChevronDown,
  FaList,
  FaCheckSquare,
  FaLightbulb,
  FaKeyboard,
  FaCheckCircle,
  FaArrowRight,
  FaMagic,
  FaShieldAlt,
  FaSync,
} from "react-icons/fa";

interface BuilderGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPresets?: () => void;
  onOpenAi?: () => void;
}

export default function BuilderGuideModal({
  isOpen,
  onClose,
  onOpenPresets,
  onOpenAi,
}: BuilderGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"quickstart" | "fields" | "tips">("quickstart");

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "Set Basic Form Details",
      icon: FaSlidersH,
      badge: "Step 1",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      description:
        "Give your form a recognizable Title (e.g. 'MR Daily Call Report' or 'Chemist POB Booking'), pick a Category, and add a brief description for respondents.",
      tip: "Pick a matching Category (e.g. MR Field Work) to keep forms neatly organized.",
    },
    {
      step: 2,
      title: "Add & Arrange Fields",
      icon: FaRocket,
      badge: "Step 2",
      badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      description:
        "Click on any field button on the left sidebar to add it to your canvas. You can use standard fields (Text, Date), Pharma specials (GPS, Signature, Upload), or import existing DB tables.",
      tip: "Want it done in 2 seconds? Use ⚡ 1-Click Presets or ✨ AI Studio to generate all fields instantly!",
    },
    {
      step: 3,
      title: "Add Smart IF/THEN Logic (Optional)",
      icon: FaExchangeAlt,
      badge: "Step 3",
      badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      description:
        "Switch to the 'Logic' tab to create conditional rules. For example: SHOW 'Sample Quantity' only if 'Sample Given' equals 'Yes'.",
      tip: "Keeps forms short and clean by hiding irrelevant questions until needed.",
    },
    {
      step: 4,
      title: "Configure Access & Share",
      icon: FaShareAlt,
      badge: "Step 4",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      description:
        "In 'Settings', choose whether the form is for Internal CRM Staff only, Public Shareable Link (with instant QR code), or PIN Protected. Then click 'Save Form'!",
      tip: "Enable Manager Approval Workflow if MR submissions must be audited by RSM / ZSM.",
    },
  ];

  const fieldTypes = [
    {
      name: "Text Line",
      icon: FaICursor,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Single-line text entry for brief input.",
      example: "Doctor Name, Chemist Shop Name, HQ / Territory",
    },
    {
      name: "Number",
      icon: FaHashtag,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Numeric input with step validation.",
      example: "Quantity, Chemist Pin Code, Call Count, Unit Price",
    },
    {
      name: "Date",
      icon: FaCalendar,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Date picker with full calendar interface.",
      example: "DCR Reporting Date, Bill Date, Expiry Date",
    },
    {
      name: "Dropdown",
      icon: FaChevronDown,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Select one option from a predefined list.",
      example: "Work Type (Field Work, Joint Work, Leave), Division",
    },
    {
      name: "Textarea",
      icon: FaList,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Multi-line expandable box for long descriptions.",
      example: "Discussion Feedback, Doctor Concerns, Meeting Remarks",
    },
    {
      name: "Checkbox",
      icon: FaCheckSquare,
      category: "Standard",
      categoryColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      what: "Yes / No toggle or confirmation checkbox.",
      example: "Product Detailing Done, Sample Handed Over, Verified",
    },
    {
      name: "E-Signature Pad",
      icon: FaSignature,
      category: "Pharma Special",
      categoryColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      what: "Interactive HTML5 canvas for finger/mouse signatures.",
      example: "Doctor signature on sample acknowledgment or Chemist signoff",
    },
    {
      name: "GPS Stamp",
      icon: FaMapMarkerAlt,
      category: "Pharma Special",
      categoryColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
      what: "Captures live device latitude, longitude, and reverse address.",
      example: "MR Field visit audit & location verification against doctor clinic",
    },
    {
      name: "File / Photo",
      icon: FaCloudUploadAlt,
      category: "Pharma Special",
      categoryColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
      what: "Uploads images, PDFs, or receipts directly to secure storage.",
      example: "Travel hotel bills, Petrol slips, Drug License photos, Rx slips",
    },
    {
      name: "Line Items Repeater Table",
      icon: FaTable,
      category: "Advanced",
      categoryColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
      what: "Multi-row grid where respondents can add unlimited rows.",
      example: "Multiple sample medicines distributed, itemized travel expenses",
    },
    {
      name: "Formula Calc",
      icon: FaCalculator,
      category: "Advanced",
      categoryColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      what: "Auto-calculates values dynamically using math expressions.",
      example: "POB Total: `[qty] * [rate]`, Expense Total: `[da] + [ta]`",
    },
    {
      name: "5-Star Rating / NPS",
      icon: FaStar,
      category: "Advanced",
      categoryColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      what: "Interactive 1 to 5 star rating or Net Promoter satisfaction score.",
      example: "Doctor brand satisfaction rating, meeting effectiveness score",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
              <FaBookOpen />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate sm:whitespace-normal">
                Custom Form Builder Guide
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-100 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Learn how to build, customize, and publish enterprise pharma forms in minutes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shrink-0"
            title="Close Guide"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 sm:pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "quickstart"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaRocket className="text-xs" /> 4-Step Quickstart
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "fields"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaSlidersH className="text-xs" /> 12 Field Types Cheatsheet
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "tips"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaLightbulb className="text-xs" /> Pro Tips & Shortcuts
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* TAB 1: 4-STEP QUICKSTART */}
          {activeTab === "quickstart" && (
            <div className="space-y-6">
              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <FaMagic className="text-indigo-600 dark:text-indigo-400" /> Short on time? Launch in 1-Click!
                  </h4>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300 mt-1">
                    Pick a ready-made Pharma template (DCR, Chemist POB, Doctor Survey) or let AI construct your entire form.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onOpenPresets && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPresets();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <FaRocket className="text-[10px]" /> Pharma Presets
                    </button>
                  )}
                  {onOpenAi && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAi();
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <FaMagic className="text-[10px]" /> AI Studio
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.step}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.badgeColor}`}>
                          {s.badge}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          <Icon className="text-xs" />
                        </div>
                      </div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {s.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {s.description}
                      </p>
                      <div className="text-[11px] bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 flex items-start gap-2">
                        <FaLightbulb className="text-amber-500 shrink-0 mt-0.5 text-xs" />
                        <span>{s.tip}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: 12 FIELD TYPES CHEATSHEET */}
          {activeTab === "fields" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Click any field on the left sidebar in the designer to insert it. Here is what each type is designed for:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fieldTypes.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <div
                      key={ft.name}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                            <Icon />
                          </div>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {ft.name}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ft.categoryColor}`}>
                          {ft.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {ft.what}
                      </p>
                      <div className="text-[10px] bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Example: </span>
                        {ft.example}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PRO TIPS & SHORTCUTS */}
          {activeTab === "tips" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Keyboard Shortcuts */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FaKeyboard className="text-indigo-500" /> Keyboard Shortcuts
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <span>Undo Last Change</span>
                      <kbd className="px-2 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px] shadow-xs">
                        Ctrl + Z
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <span>Redo Change</span>
                      <kbd className="px-2 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px] shadow-xs">
                        Ctrl + Y
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Section Grouping Tip */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FaSlidersH className="text-indigo-500" /> Section Grouping
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Giving the same <strong>Section Group</strong> name (e.g. &quot;Doctor Visit Details&quot;) to multiple fields automatically wraps them inside a beautiful grouped card on the published form.
                  </p>
                </div>

                {/* Public Sharing & QR Code */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FaShareAlt className="text-emerald-500" /> Public Links & QR Codes
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Want chemists or doctors to fill out a feedback survey on their own phones? Set Access Mode to <strong>&quot;Public Shareable Link&quot;</strong> in the Settings tab. They don&apos;t need to log into CRM!
                  </p>
                </div>

                {/* Approvals */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FaShieldAlt className="text-rose-500" /> Manager Approval Gate
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Turn on <strong>&quot;Manager Approval Workflow&quot;</strong> for sensitive submissions like MR Expense claims or Chemist Credit limits. Form submissions remain &quot;Pending&quot; until approved.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <span className="text-[11px] text-slate-400 text-center sm:text-left">
            Tip: You can re-open this guide anytime using the 📖 Walkthrough button in the header.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            Got it, Let&apos;s Build! <FaArrowRight className="text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
