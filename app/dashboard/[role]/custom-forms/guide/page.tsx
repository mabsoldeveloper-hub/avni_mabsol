"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaSlidersH,
  FaMagic,
  FaSignature,
  FaMapMarkerAlt,
  FaCloudUploadAlt,
  FaTable,
  FaStar,
  FaExchangeAlt,
  FaShieldAlt,
  FaSyncAlt,
  FaChartBar,
  FaCheck,
  FaArrowRight,
  FaPlus,
  FaList,
  FaQrcode,
  FaExternalLinkAlt,
  FaFileAlt,
  FaPaperPlane,
} from "react-icons/fa";

export default function FormStudioGuidePage() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const capabilities = [
    {
      id: "templates",
      category: "1-Click Presets",
      icon: FaMagic,
      title: "1-Click Ready Pharma CRM Templates Library",
      badge: "Instant Setup",
      accent: "from-violet-500 to-indigo-600",
      description:
        "Instantly launch pre-configured enterprise Pharma forms in 1 click without manual configuration.",
      details: [
        "MR Daily Call Report (DCR) & Sampling Form",
        "Doctor Feedback & Brand Preference Survey",
        "Chemist POB Order Booking Form",
        "MR Expense Claim & Travel Bill Form",
        "New Chemist / Stockist Registration Form",
      ],
    },
    {
      id: "signature",
      category: "E-Signatures",
      icon: FaSignature,
      title: "Digital HTML5 E-Signature Pad",
      badge: "Touch & Mouse",
      accent: "from-purple-500 to-violet-600",
      description:
        "Capture authentic doctor signatures, chemist verifications, and MR signoffs directly on touchscreens or desktop mice.",
      details: [
        "HTML5 smooth canvas drawing pad",
        "Clear & Undo controls",
        "Base64 PNG automatic encoding",
        "High-res modal inspection viewer",
      ],
    },
    {
      id: "gps",
      category: "Geolocation",
      icon: FaMapMarkerAlt,
      title: "GPS Geo-Location Field Stamp",
      badge: "Live Verification",
      accent: "from-rose-500 to-pink-600",
      description:
        "Stamp exact GPS coordinates, latitude, longitude, and reverse-geocoded address for field visits and shop verification.",
      details: [
        "One-click browser GPS location stamp",
        "Automatic address reverse-geocoding",
        "Direct Google Maps open link",
        "Verification proof for manager audits",
      ],
    },
    {
      id: "fileUpload",
      category: "Media Uploads",
      icon: FaCloudUploadAlt,
      title: "Server File & Photo Uploader",
      badge: "Upload & Store",
      accent: "from-indigo-500 to-blue-600",
      description:
        "Upload Rx cards, travel receipts, hotel bills, and drug license copies directly to the server with instant file inspection.",
      details: [
        "Dedicated API route `/api/custom-forms/upload`",
        "Upload progress spinner and size tracking",
        "Supports JPG, PNG, PDF, and DOC files",
        "Direct `View File` preview and download links",
      ],
    },
    {
      id: "repeaterTable",
      category: "Sub-Grids",
      icon: FaTable,
      title: "Multi-Row Line Items Repeater Tables",
      badge: "Dynamic Sub-Table",
      accent: "from-cyan-500 to-teal-600",
      description:
        "Allow respondents to add multiple product sample line items, quantities, and notes dynamically inside a single form.",
      details: [
        "Dynamic Add / Delete row item controls",
        "Customizable sub-field columns (Product, Qty, Rate, Notes)",
        "Automatic tabular formatting in data views",
        "Full sub-grid inspect modal dialog",
      ],
    },
    {
      id: "rating",
      category: "Surveys",
      icon: FaStar,
      title: "5-Star Rating & NPS Feedback Scale",
      badge: "Customer Insights",
      accent: "from-amber-500 to-orange-600",
      description:
        "Interactive 5-star rating control for measuring product efficacy, doctor satisfaction, and chemist feedback.",
      details: [
        "Hover & click 5-star interactive control",
        "NPS score calculation support",
        "Categorical visual charts in analytics",
      ],
    },
    {
      id: "logic",
      category: "IF/THEN Logic",
      icon: FaExchangeAlt,
      title: "Visual IF / THEN Conditional Rules Engine",
      badge: "Smart Branching",
      accent: "from-emerald-500 to-teal-600",
      description:
        "Dynamically SHOW, HIDE, or REQUIRE target fields based on answers to previous questions.",
      details: [
        "Equals, Not Equals, Contains, Greater Than, Less Than, Is Filled",
        "SHOW target field dynamically",
        "HIDE irrelevant fields automatically",
        "REQUIRE mandatory fields conditionally",
      ],
    },
    {
      id: "security",
      category: "Access & Workflow",
      icon: FaShieldAlt,
      title: "Security, PIN Access & Manager Approval",
      badge: "Enterprise Security",
      accent: "from-sky-500 to-indigo-600",
      description:
        "Control who can fill out forms, password-protect with PIN codes, share public QR links, and route submissions to managers.",
      details: [
        "Internal CRM, Public Link, or PIN Protection",
        "Public Shareable QR Code & Iframe Embed Link",
        "Manager Review Workflow (`Under Review` -> `Approved` / `Rejected`)",
        "Approval history logs with manager remarks",
      ],
    },
    {
      id: "autoSync",
      category: "Database Sync",
      icon: FaSyncAlt,
      title: "Auto Database Master Sync Engine",
      badge: "Zero Manual Entry",
      accent: "from-violet-600 to-purple-700",
      description:
        "Automatically write submitted or approved form entries directly into real MongoDB collections (e.g. Sales Orders, Customers).",
      details: [
        "Target model mapping (`Customer`, `SalesOrder`, `MrCallLog`, `MrDcr`)",
        "Field-to-database column mapping",
        "Automatic database record creation upon submission",
        "Sync status tracking & record IDs",
      ],
    },
    {
      id: "aiStudio",
      category: "AI Automation",
      icon: FaMagic,
      title: "🤖 AI-Powered Prompt-to-Form Studio",
      badge: "Prompt-to-Form",
      accent: "from-purple-600 to-pink-600",
      description:
        "Type natural language prompts (e.g. 'Doctor feedback form with sample requests') to generate full form schemas in seconds.",
      details: [
        "Natural language AI prompt parser",
        "Quick preset templates for DCR, Surveys, Expenses, and POBs",
        "Smart field type inference & section layout",
        "1-Click apply directly into Form Builder canvas",
      ],
    },
    {
      id: "whatsappShare",
      category: "Distribution",
      icon: FaQrcode,
      title: "📱 WhatsApp, SMS & Dynamic QR Code Generator",
      badge: "1-Click Share",
      accent: "from-emerald-500 to-teal-600",
      description:
        "Instantly share public and PIN-protected forms with Doctors and Chemists via WhatsApp, SMS, or downloadable QR Codes.",
      details: [
        "1-Click WhatsApp Web & Business API deep-linking",
        "SMS pre-filled message generator",
        "High-res downloadable PNG QR Code for clinic standees",
        "PIN protection & public access toggles",
      ],
    },
    {
      id: "offlineSync",
      category: "Offline Resilience",
      icon: FaSyncAlt,
      title: "📶 Offline PWA Resilience & Auto-Drafting Engine",
      badge: "Auto-Save Draft",
      accent: "from-amber-500 to-orange-600",
      description:
        "Auto-saves form progress to local storage every 5 seconds, ensuring no data loss in remote hospital basements or low-network areas.",
      details: [
        "Local storage background auto-save every 5 seconds",
        "Restore Unsaved Draft alert banner on page reload",
        "Automatic draft cleanup upon successful submission",
        "Offline-first field data resilience",
      ],
    },
    {
      id: "pdfExport",
      category: "Reports & Printing",
      icon: FaFileAlt,
      title: "📄 Branded PDF Export & Print Engine",
      badge: "Print & Export PDF",
      accent: "from-indigo-600 to-blue-700",
      description:
        "Transform submitted form entries into branded PDF reports complete with company header, e-signatures, GPS maps, and QR stamps.",
      details: [
        "Official Mabsol Pharma CRM branded header & logo",
        "Itemized sub-table grid printing for POB & Expense bills",
        "E-Signature & GPS Verification stamp embedding",
        "1-Click browser print & PDF download engine",
      ],
    },
    {
      id: "analytics",
      category: "Analytics",
      icon: FaChartBar,
      title: "Real-time Visual Analytics & KPI Dashboard",
      badge: "Live Metrics",
      accent: "from-rose-600 to-pink-600",
      description:
        "Analyze submission volume, approval rates, daily submission timeline charts, and top submitter leaderboards.",
      details: [
        "Total Submissions, Approval Rate %, Pending & Rejected KPIs",
        "Daily Submissions Trend timeline visualization",
        "Top Respondents & Staff leaderboard ranking",
        "One-click CSV Export for Excel reporting",
      ],
    },
  ];

  const filtered = activeTab === "all"
    ? capabilities
    : capabilities.filter((c) => c.id === activeTab || c.category.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-4 relative overflow-hidden border border-indigo-950/50">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-indigo-500/30 text-indigo-300 rounded-full inline-block border border-indigo-400/30">
              Form Studio Capabilities & Usage Guide
            </span>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <FaSlidersH className="text-indigo-400" />
              Custom Form Studio - Feature Showcase & Guide
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Form Studio is a complete **No-Code Application & Workflow Automation Suite** for Pharma CRM. 
              Build multi-step forms, capture digital e-signatures, GPS stamps, file uploads, sub-table line items, and auto-sync entries directly into your database.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/custom-forms/builder"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <FaPlus /> Create Custom Form
            </Link>
            <Link
              href="/dashboard/custom-forms"
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-white/20"
            >
              <FaList /> Saved Forms Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Filter Pills */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Filter Feature Modules:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: "all", label: "All Capabilities" },
            { id: "aiStudio", label: "🤖 AI Assistant" },
            { id: "whatsappShare", label: "📱 WhatsApp & QR" },
            { id: "offlineSync", label: "📶 Offline Drafts" },
            { id: "pdfExport", label: "📄 PDF Reports" },
            { id: "templates", label: "🪄 Pharma Presets" },
            { id: "signature", label: "✒️ E-Signatures" },
            { id: "gps", label: "📍 GPS Stamps" },
            { id: "fileUpload", label: "📁 File Uploader" },
            { id: "repeaterTable", label: "📦 Line Items Table" },
            { id: "logic", label: "⚡ IF/THEN Logic" },
            { id: "security", label: "🔒 Access & Approval" },
            { id: "autoSync", label: "🔄 Auto DB Sync" },
            { id: "analytics", label: "📊 Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full">
        {filtered.map((cap) => {
          const IconComp = cap.icon;
          return (
            <div
              key={cap.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${cap.accent} text-white flex items-center justify-center text-xl font-bold shadow-md`}
                  >
                    <IconComp />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
                    {cap.badge}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {cap.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                    {cap.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {cap.description}
                </p>

                <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-700">
                  {cap.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <FaCheck className="text-emerald-500 text-[10px] shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs">
                <Link
                  href="/dashboard/custom-forms/builder"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Try in Form Builder <FaArrowRight className="text-[10px]" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Summary Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-extrabold">Ready to Build Enterprise Forms?</h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Choose a 1-click preset template or design your custom form with digital signatures, GPS stamps, file uploads, and manager approval workflows.
          </p>
        </div>

        <Link
          href="/dashboard/custom-forms/builder"
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all shrink-0 flex items-center gap-2"
        >
          <FaMagic /> Launch Form Designer
        </Link>
      </div>
    </div>
  );
}
