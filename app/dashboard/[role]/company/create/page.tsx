"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./company-wizard.css";
import { useCompany } from "@/context/CompanyContext";
import { validateEmail, validateMobile } from "@/lib/constants/validation.constant";

const displayFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

const PHARMA_MODULES = [
  { id: "dashboard", label: "Executive AI Dashboard", desc: "KPI Cards, Performance Radar & Simulator" },
  { id: "sales", label: "Sales & Invoicing", desc: "Invoices, Credit Notes & Order Management" },
  { id: "purchase", label: "Purchase & Inward (GRN)", desc: "Purchase Bills, Debit Notes & Payments" },
  { id: "inventory", label: "Inventory & Expiry Control", desc: "Batch Tracking, Expiry Alerts & Valuation" },
  { id: "accounting", label: "Financial Accounts & Ledgers", desc: "Receipts, Ledgers & Outstanding Dues" },
  { id: "leads", label: "Pharma CRM & Leads", desc: "Lead Pipelines, Stages & Follow-ups" },
  { id: "fieldforce", label: "MR Fieldforce & Reporting", desc: "Doctor Calls, Chemist Visits & Tours" },
  { id: "reports", label: "Executive Reports & MIS", desc: "Sales Analytics, Territory & Tax Reports" },
  { id: "master", label: "Pharma Master Data", desc: "Products, Categories, Divisions & Areas" },
  { id: "custom_forms", label: "Custom Form Studio", desc: "Dynamic Inspections & Order Templates" },
];

interface GstOption {
  gstNo: string;
  companyName?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  status?: string;
}

interface Toast { id: string; message: string; type: "success" | "error" | "info"; }

// Auto-generate a company code from name
function genCompanyCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "PHAR";
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}${rand}`;
}

export default function CreateCompanyPage() {
  const router = useRouter();
  const { refreshCompanies } = useCompany();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // GST options from existing user companies
  const [gstOptions, setGstOptions] = useState<GstOption[]>([]);
  const [loadingGsts, setLoadingGsts] = useState(true);
  const [useNewGst, setUseNewGst] = useState(false); // allow admin to enter a fresh GSTIN

  // STEP 1
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [selectedGst, setSelectedGst] = useState<string>("");        // chosen from dropdown
  const [manualGst, setManualGst] = useState<string>("");             // if no options, typed
  const [gstVerified, setGstVerified] = useState(false);
  const [gstVerifyMsg, setGstVerifyMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [panNo, setPanNo] = useState("");
  const [drugLicense, setDrugLicense] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // STEP 2
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailErrMsg, setEmailErrMsg] = useState<string | null>(null);

  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);
  const [mobileErrMsg, setMobileErrMsg] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STEP 3
  const [enabledModules, setEnabledModules] = useState<string[]>([
    "dashboard","sales","purchase","inventory","accounting","leads","fieldforce","reports","master",
  ]);

  function showToast(message: string, type: Toast["type"] = "info") {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }
  function removeToast(id: string) { setToasts((p) => p.filter((t) => t.id !== id)); }

  // ── Load GST options from all companies in this account ──
  useEffect(() => {
    async function loadGsts() {
      try {
        setLoadingGsts(true);
        const res = await fetch("/api/company-master");
        const data = await res.json();
        if (Array.isArray(data)) {
          const opts: GstOption[] = [];
          data.forEach((co: any) => {
            // Primary GST
            const pg = String(co.gstNo || "").trim();
            if (pg.length === 15) {
              opts.push({
                gstNo: pg,
                companyName: co.companyName,
                state: co.state,
                city: co.city,
                address: co.address,
                pincode: co.pincode,
              });
            }
            // Additional GSTINs
            if (Array.isArray(co.additionalGstins)) {
              co.additionalGstins.forEach((ag: any) => {
                const ag_gst = String(ag.gstNo || "").trim();
                if (ag_gst.length === 15) {
                  opts.push({
                    gstNo: ag_gst,
                    companyName: co.companyName,
                    state: ag.state || co.state,
                    city: ag.city || co.city,
                    address: ag.address || co.address,
                    pincode: ag.pincode || co.pincode,
                    status: ag.verified ? "Verified" : "Unverified",
                  });
                }
              });
            }
          });
          // De-duplicate by GSTIN number
          const seen = new Set<string>();
          const unique = opts.filter((o) => {
            if (seen.has(o.gstNo)) return false;
            seen.add(o.gstNo);
            return true;
          });
          setGstOptions(unique);
        }
      } catch {
        // silent
      } finally {
        setLoadingGsts(false);
      }
    }
    loadGsts();
  }, []);

  // ── When a GST is chosen from the dropdown, auto-fill from cached data or verify fresh ──
  async function handleGstSelect(gstin: string) {
    setSelectedGst(gstin);
    setGstVerified(false);
    setGstVerifyMsg(null);
    setErrorBanner(null);

    if (!gstin) {
      setCompanyName(""); setCompanyCode("");
      setAddress(""); setCity(""); setStateVal(""); setPincode("");
      return;
    }

    // Pre-fill from cached option first
    const cached = gstOptions.find((o) => o.gstNo === gstin);
    if (cached?.companyName) {
      setCompanyName(cached.companyName);
      setCompanyCode(genCompanyCode(cached.companyName));
      if (cached.state) setStateVal(cached.state);
      if (cached.city) setCity(cached.city);
      if (cached.address) setAddress(cached.address);
      if (cached.pincode) setPincode(cached.pincode);
    }

    // Verify fresh with government API (auto-triggers on select)
    await verifyGst(gstin);
  }

  // ── GST API verification ──
  // API returns: { success, data: { businessName, legalName, tradeName, pan, address, city, state, pincode, status } }
  async function verifyGst(raw?: string) {
    const gstin = (raw || manualGst).trim().toUpperCase();
    if (gstin.length !== 15) {
      showToast("Enter a valid 15-character GSTIN", "error");
      return;
    }
    setVerifyingGst(true);
    setGstVerifyMsg(null);
    try {
      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin }),
      });
      const resp = await res.json();
      // The route returns { success: true, data: {...}, message: '...' }
      if (resp.success && resp.data) {
        const d = resp.data;
        const name = d.businessName || d.legalName || d.tradeName || companyName;
        setGstVerified(true);
        setErrorBanner(null);
        setGstVerifyMsg({ text: `✓ ${name} — ${d.status || "Active"}`, ok: true });
        setCompanyName(name || companyName);
        setCompanyCode(genCompanyCode(name || companyName));
        if (d.address) setAddress(d.address);
        if (d.city) setCity(d.city);
        if (d.state) setStateVal(d.state);
        if (d.pincode) setPincode(d.pincode);
        showToast(`✓ GSTIN Verified — ${name}`, "success");
      } else {
        setGstVerified(false);
        setGstVerifyMsg({ text: resp.message || "Invalid GSTIN. Please check and retry.", ok: false });
        showToast(resp.message || "Invalid GSTIN", "error");
      }
    } catch {
      showToast("GST verification failed. Check your connection.", "error");
    } finally {
      setVerifyingGst(false);
    }
  }

  // ── Email OTP ──
  async function sendEmailOtp() {
    const emailErr = validateEmail(email);
    if (emailErr) { showToast(emailErr, "error"); return; }
    setEmailSending(true); setEmailErrMsg(null);
    try {
      const res = await fetch("/api/auth/send-company-email-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailOtpSent(true);
        showToast(`Verification code sent to ${email}`, "success");
      } else {
        setEmailErrMsg(data.message || "Failed to send OTP");
        showToast(data.message || "Failed to send OTP", "error");
      }
    } catch { showToast("Failed to send email OTP", "error"); } finally { setEmailSending(false); }
  }

  async function verifyEmailOtp() {
    if (emailOtp.length !== 6) { showToast("Enter the full 6-digit OTP", "error"); return; }
    setEmailVerifying(true); setEmailErrMsg(null);
    try {
      const res = await fetch("/api/auth/verify-company-email-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: emailOtp.trim() }),
      });
      const data = await res.json();
      if (data.success) { setEmailVerified(true); showToast("Email address verified!", "success"); }
      else { setEmailErrMsg(data.message || "Incorrect OTP"); showToast(data.message || "Incorrect OTP", "error"); }
    } catch { showToast("OTP verification failed", "error"); } finally { setEmailVerifying(false); }
  }

  // ── Mobile OTP ──
  async function sendMobileOtp() {
    const mobErr = validateMobile(mobile);
    if (mobErr) { showToast(mobErr, "error"); return; }
    const clean = mobile.replace(/\D/g, "");
    setMobileSending(true); setMobileErrMsg(null);
    try {
      const res = await fetch("/api/auth/send-company-mobile-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: clean }),
      });
      const data = await res.json();
      if (data.success) {
        setMobileOtpSent(true);
        const msg = data.deliveredLive ? `OTP sent to +91 ${clean}` : `OTP (Dev): ${data.otp}`;
        showToast(msg, "success");
      } else {
        setMobileErrMsg(data.message || "Failed to send OTP");
        showToast(data.message || "Failed to send OTP", "error");
      }
    } catch { showToast("Failed to send mobile OTP", "error"); } finally { setMobileSending(false); }
  }

  async function verifyMobileOtp() {
    if (mobileOtp.length !== 6) { showToast("Enter the full 6-digit OTP", "error"); return; }
    setMobileVerifying(true); setMobileErrMsg(null);
    try {
      const res = await fetch("/api/auth/verify-company-mobile-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.replace(/\D/g,""), otp: mobileOtp.trim() }),
      });
      const data = await res.json();
      if (data.success) { setMobileVerified(true); showToast("Mobile number verified!", "success"); }
      else { setMobileErrMsg(data.message || "Incorrect OTP"); showToast(data.message || "Incorrect OTP", "error"); }
    } catch { showToast("OTP verification failed", "error"); } finally { setMobileVerifying(false); }
  }

  // ── Step Navigation ──
  function goNext() {
    setErrorBanner(null);
    const activeGst = gstOptions.length > 0 ? selectedGst : manualGst;
    if (currentStep === 1) {
      if (!companyName.trim()) { setErrorBanner("Company legal name is required"); return; }
      if (!activeGst || activeGst.length !== 15) { setErrorBanner("Please select or enter a valid GSTIN"); return; }
      if (!gstVerified) { setErrorBanner("Please verify the GSTIN before continuing"); return; }
      setCurrentStep(2);
      showToast("Step 1 complete — Add contact & verify with OTP", "info");
    } else if (currentStep === 2) {
      const emailErr = validateEmail(email);
      if (emailErr) { setErrorBanner(emailErr); return; }
      if (!emailVerified) { setErrorBanner("Please verify your email address via OTP"); return; }
      const mobErr = validateMobile(mobile);
      if (mobErr) { setErrorBanner(mobErr); return; }
      if (!mobileVerified) { setErrorBanner("Please verify your mobile number via OTP"); return; }
      // Password validation
      if (!password || password.length < 8) { setErrorBanner("Password must be at least 8 characters"); return; }
      if (!/[a-zA-Z]/.test(password)) { setErrorBanner("Password must contain at least one letter"); return; }
      if (!/[0-9]/.test(password)) { setErrorBanner("Password must contain at least one number"); return; }
      if (password !== confirmPassword) { setErrorBanner("Passwords do not match — please re-enter"); return; }
      setCurrentStep(3);
      showToast("Contact verified — Configure permitted modules", "info");
    }
  }

  function goBack() {
    setErrorBanner(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  }

  function toggleModule(id: string) {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  }

  // ── Final Save ──
  async function saveCompany() {
    if (enabledModules.length === 0) { setErrorBanner("Select at least one module"); return; }
    setLoading(true); setErrorBanner(null);
    const activeGst = gstOptions.length > 0 ? selectedGst : manualGst;
    const finalCode = companyCode || genCompanyCode(companyName);
    try {
      const res = await fetch("/api/company-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: finalCode, companyName, ownerName, email: email.trim().toLowerCase(),
          mobile: mobile.replace(/\D/g, ""), password,
          gstNo: activeGst, panNo, drugLicenseNo: drugLicense, website,
          address, city, state: stateVal, pincode, enabledModules, status: "Active",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Company registered successfully!", "success");
        await refreshCompanies();
        setTimeout(() => router.push("/dashboard/company/list"), 1200);
      } else {
        setErrorBanner(data.error || "Failed to create company");
        showToast(data.error || "Failed to create company", "error");
      }
    } catch { setErrorBanner("An unexpected error occurred"); showToast("An unexpected error occurred", "error"); }
    finally { setLoading(false); }
  }

  // ── OTP Boxes — auto-advance on digit entry, auto-verify on last digit ──
  function OtpBoxes({
    value,
    onChange,
    verified,
    prefix,
    onComplete,
  }: {
    value: string;
    onChange: (v: string) => void;
    verified: boolean;
    prefix: string;
    onComplete?: () => void;
  }) {
    return (
      <div className="cw-otp-row">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            id={`${prefix}-otp-${i}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            autoComplete="one-time-code"
            className={`cw-otp-input ${verified ? "verified" : ""}`}
            value={value[i] || ""}
            readOnly={verified}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              onChange(pasted.padEnd(6, "").slice(0, 6));
              if (pasted.length === 6 && onComplete) {
                setTimeout(onComplete, 200);
              } else {
                const nextIdx = Math.min(pasted.length, 5);
                (document.getElementById(`${prefix}-otp-${nextIdx}`) as HTMLInputElement)?.focus();
              }
            }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              const arr = value.padEnd(6, " ").split("");
              arr[i] = v || " ";
              const next = arr.join("").replace(/ /g, "");
              onChange(next.slice(0, 6));
              // Auto-advance to next box
              if (v && i < 5) {
                (document.getElementById(`${prefix}-otp-${i + 1}`) as HTMLInputElement)?.focus();
              }
              // Auto-verify when all 6 digits filled
              if (v && i === 5 && next.replace(/ /g, "").length === 6 && onComplete) {
                setTimeout(onComplete, 300);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                if (!value[i] && i > 0) {
                  // Move back
                  const arr = value.padEnd(6, " ").split("");
                  arr[i - 1] = " ";
                  onChange(arr.join("").replace(/ /g, "").slice(0, 6));
                  (document.getElementById(`${prefix}-otp-${i - 1}`) as HTMLInputElement)?.focus();
                } else if (value[i]) {
                  // Clear current
                  const arr = value.padEnd(6, " ").split("");
                  arr[i] = " ";
                  onChange(arr.join("").replace(/ /g, "").slice(0, 6));
                }
              } else if (e.key === "ArrowLeft" && i > 0) {
                (document.getElementById(`${prefix}-otp-${i - 1}`) as HTMLInputElement)?.focus();
              } else if (e.key === "ArrowRight" && i < 5) {
                (document.getElementById(`${prefix}-otp-${i + 1}`) as HTMLInputElement)?.focus();
              }
            }}
          />
        ))}
      </div>
    );
  }

  const activeGst = gstOptions.length > 0 ? selectedGst : manualGst;

  return (
    <div className={`cw-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <div className="cw-bg-glow cw-glow-top" />
      <div className="cw-bg-glow cw-glow-bottom" />

      {/* Toasts */}
      <div className="cw-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`cw-toast cw-toast-${t.type}`}>
            <span className="cw-toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</span>
            <span className="cw-toast-msg">{t.message}</span>
            <button className="cw-toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="cw-container">
        <div className="cw-topbar">
          <button type="button" className="cw-back-btn" onClick={() => router.push("/dashboard/company/list")}>
            ← Back to Companies
          </button>
        </div>

        <div className="cw-wizard-card">
          {/* Brand */}
          <div className="cw-brand">
            <div className="cw-brand-icon">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 9L16 3L28 9V23L16 29L4 23V9Z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="rgba(255,255,255,0.1)" />
                <path d="M13 8H19V13.5H24.5V19H19V24.5H13V19H7.5V13.5H13V8Z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <div className="cw-brand-text">
              <span className="cw-brand-name" style={{ fontFamily: "var(--font-display)" }}>Mabsol Pharma CRM</span>
              <span className="cw-brand-sub">Register a New Pharma Enterprise</span>
            </div>
          </div>

          {/* Heading */}
          <div className="cw-heading-box">
            <h1 style={{ fontFamily: "var(--font-display)" }}>
              {currentStep === 1 && "Company Profile & GST Verification"}
              {currentStep === 2 && "Contact Details & OTP Verification"}
              {currentStep === 3 && "Configure Module Permissions"}
            </h1>
            <p>
              {currentStep === 1 && "Select your GSTIN to auto-fill legal company details from the government portal."}
              {currentStep === 2 && "Enter company contact info and verify email & mobile with one-time codes."}
              {currentStep === 3 && "Choose which modules this company's team can access. Unselected modules stay hidden."}
            </p>
          </div>

          {/* Step Tracker */}
          <div className="cw-step-tracker">
            <button type="button" className={`cw-step-btn ${currentStep === 1 ? "active" : currentStep > 1 ? "done" : ""}`} onClick={() => setCurrentStep(1)}>
              <span className="cw-step-num">{currentStep > 1 ? "✓" : "1"}</span>
              <span className="cw-step-label">Company & GST</span>
            </button>
            <div className={`cw-step-line ${currentStep > 1 ? "filled" : ""}`} />
            <button type="button" className={`cw-step-btn ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`} onClick={() => { if (companyName) setCurrentStep(2); }}>
              <span className="cw-step-num">{currentStep > 2 ? "✓" : "2"}</span>
              <span className="cw-step-label">Contact & OTP</span>
            </button>
            <div className={`cw-step-line ${currentStep > 2 ? "filled" : ""}`} />
            <button type="button" className={`cw-step-btn ${currentStep === 3 ? "active" : ""}`} onClick={() => { if (emailVerified && mobileVerified) setCurrentStep(3); }}>
              <span className="cw-step-num">3</span>
              <span className="cw-step-label">Modules & Save</span>
            </button>
          </div>

          {errorBanner && (
            <div className="cw-error-banner"><span>⚠</span> {errorBanner}</div>
          )}

          {/* ─── STEP 1 ─── */}
          {currentStep === 1 && (
            <div className="cw-form-module">

              {/* GST Selection */}
              <div className="cw-field">
                <label>
                  {gstOptions.length > 0 && !useNewGst ? "Select GSTIN from your account" : "Enter GSTIN"}
                  <span className="cw-field-hint">
                    {gstVerified ? "✓ Verified & Auto-filled" : "Validates via Government Portal"}
                  </span>
                </label>

                {loadingGsts ? (
                  <div className="cw-input-row" style={{ opacity: 0.6 }}>
                    <span className="cw-icon" style={{ fontSize: "13px" }}>⏳</span>
                    <input readOnly value="Loading your GSTINs…" />
                  </div>
                ) : gstOptions.length > 0 && !useNewGst ? (
                  /* ── Dropdown ── */
                  <>
                    <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                      <div className={`cw-input-row ${gstVerified ? "verified" : ""}`} style={{ flex: 1 }}>
                        <span className="cw-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                            <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <select
                          value={selectedGst}
                          onChange={(e) => handleGstSelect(e.target.value)}
                          style={{
                            flex: 1, padding: "9px 4px 9px 0", background: "transparent",
                            border: "none", outline: "none", fontSize: "12.5px", fontWeight: 600,
                            color: selectedGst ? "#0f172a" : "#94a3b8",
                            fontFamily: selectedGst ? "'IBM Plex Mono', monospace" : "inherit",
                            letterSpacing: selectedGst ? "0.04em" : 0,
                            textTransform: "uppercase", cursor: "pointer",
                            appearance: "none", width: "100%",
                          }}
                        >
                          <option value="">— Select a GSTIN from account —</option>
                          {gstOptions.map((g) => (
                            <option key={g.gstNo} value={g.gstNo}>
                              {g.gstNo}{g.state ? ` · ${g.state}` : ""}{g.status ? ` (${g.status})` : ""}
                            </option>
                          ))}
                        </select>
                        <span style={{ paddingRight: "8px", color: "#94a3b8", fontSize: "11px", flexShrink: 0 }}>▾</span>
                      </div>
                      <button
                        type="button"
                        className={`cw-inline-btn ${gstVerified ? "verified" : ""}`}
                        disabled={verifyingGst || !selectedGst || gstVerified}
                        onClick={() => verifyGst(selectedGst)}
                        style={{ margin: 0, borderRadius: "10px", padding: "0 14px" }}
                      >
                        {verifyingGst ? "Verifying…" : gstVerified ? "✓ Verified" : "Verify"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUseNewGst(true); setSelectedGst(""); setGstVerified(false); setGstVerifyMsg(null); setErrorBanner(null); }}
                      style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "2px 0", textDecoration: "underline", alignSelf: "flex-start" }}
                    >
                      + Enter a different / new GSTIN
                    </button>
                  </>
                ) : (
                  /* ── Manual input ── */
                  <>
                    <div className={`cw-input-row ${gstVerified ? "verified" : ""}`}>
                      <span className="cw-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                          <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <input
                        className="mono"
                        placeholder="e.g. 06AALCM8009M1Z1"
                        maxLength={15}
                        value={manualGst}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                          setManualGst(v);
                          setGstVerified(false);
                          setGstVerifyMsg(null);
                          if (v.length === 15) verifyGst(v);
                        }}
                      />
                      <button
                        type="button"
                        className={`cw-inline-btn ${gstVerified ? "verified" : ""}`}
                        disabled={verifyingGst || gstVerified || manualGst.length < 15}
                        onClick={() => verifyGst()}
                      >
                        {verifyingGst ? "Verifying…" : gstVerified ? "✓ Verified" : "Verify GST"}
                      </button>
                    </div>
                    {gstOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setUseNewGst(false); setManualGst(""); setGstVerified(false); setGstVerifyMsg(null); }}
                        style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "2px 0", textDecoration: "underline", alignSelf: "flex-start" }}
                      >
                        ← Back to account GSTINs
                      </button>
                    )}
                  </>
                )}

                {gstVerifyMsg && (
                  <div className={`cw-verified-box ${!gstVerifyMsg.ok ? "cw-error-box" : ""}`}>
                    <span className="cw-verified-icon">{gstVerifyMsg.ok ? "✓" : "!"}</span>
                    <span>{gstVerifyMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Company Name (auto-filled, editable) */}
              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Company Legal / Trade Name <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </span>
                    <input
                      placeholder="e.g. Sun Pharmaceutical Industries Ltd"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setCompanyCode(genCompanyCode(e.target.value));
                      }}
                    />
                  </div>
                </div>

                <div className="cw-field">
                  <label>
                    Company Code
                    <span className="cw-field-hint" style={{ textTransform: "none" }}>Auto-generated</span>
                  </label>
                  <div className="cw-input-row" style={{ background: "#f0f9ff", borderColor: "#0ea5e9", borderWidth: 1.5 }}>
                    <input
                      className="mono"
                      readOnly
                      value={companyCode || "Generates on GSTIN verify"}
                      style={{
                        cursor: "default",
                        color: companyCode ? "#0f172a" : "#94a3b8",
                        fontWeight: companyCode ? 700 : 400,
                        fontSize: companyCode ? "15px" : "13px",
                        letterSpacing: companyCode ? "0.08em" : "normal",
                        background: "transparent",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Owner / Director Name</label>
                  <div className="cw-input-row">
                    <input placeholder="e.g. Rajesh Kumar" value={ownerName} maxLength={80} onChange={(e) => setOwnerName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))} />
                  </div>
                </div>

                <div className="cw-field">
                  <label>Drug License No (DL)</label>
                  <div className="cw-input-row">
                    <input placeholder="e.g. DL/20B/21B/MH/99999" value={drugLicense} onChange={(e) => setDrugLicense(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="cw-section-divider"><span>Registered Address</span></div>

              <div className="cw-field">
                <label>Street / Premises Address</label>
                <div className="cw-input-row">
                  <span className="cw-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
                    </svg>
                  </span>
                  <textarea rows={2} placeholder="e.g. Plot 17, GIDC Pharma SEZ, Sector 28, Near Water Tank" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              <div className="cw-grid-3">
                <div className="cw-field">
                  <label>City</label>
                  <div className="cw-input-row">
                    <input placeholder="e.g. Ahmedabad" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                </div>
                <div className="cw-field">
                  <label>State</label>
                  <div className="cw-input-row">
                    <input placeholder="e.g. Gujarat" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
                  </div>
                </div>
                <div className="cw-field">
                  <label>Pincode</label>
                  <div className="cw-input-row">
                    <input placeholder="e.g. 380024" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g,""))} />
                  </div>
                </div>
              </div>

              <div className="cw-nav-row">
                <button type="button" className="cw-btn-ghost" onClick={() => router.push("/dashboard/company/list")}>Cancel</button>
                <button type="button" className="cw-btn-primary" onClick={goNext}>Continue to Contact →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {currentStep === 2 && (
            <div className="cw-form-module">
              <div className="cw-section-divider"><span>Email Address Verification</span></div>

              <div className="cw-field">
                <label>
                  Work Email Address <span className="req-star">*</span>
                  {emailVerified && <span style={{ color: "#10b981", textTransform: "none", fontWeight: 700 }}>✓ Verified</span>}
                </label>
                <div className={`cw-input-row ${emailVerified ? "verified" : ""}`}>
                  <span className="cw-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.8"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="e.g. accounts@company.com"
                    value={email}
                    readOnly={emailVerified}
                    onChange={(e) => { setEmail(e.target.value); setEmailOtpSent(false); setEmailVerified(false); }}
                  />
                  {!emailVerified && (
                    <button type="button" className="cw-inline-btn" disabled={emailSending || emailOtpSent} onClick={sendEmailOtp}>
                      {emailSending ? "Sending…" : emailOtpSent ? "Sent ✓" : "Send OTP"}
                    </button>
                  )}
                </div>
                {emailErrMsg && <div className="cw-verified-box cw-error-box"><span className="cw-verified-icon">!</span><span>{emailErrMsg}</span></div>}
              </div>

              {emailOtpSent && !emailVerified && (
                <div className="cw-field">
                  <label>6-Digit Email OTP <span className="cw-field-hint">Check inbox & spam folder</span></label>
                  <OtpBoxes prefix="email" value={emailOtp} onChange={setEmailOtp} verified={emailVerified} onComplete={verifyEmailOtp} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button type="button" className="cw-btn-primary" disabled={emailVerifying || emailOtp.length < 6} onClick={verifyEmailOtp} style={{ fontSize: "12px", padding: "7px 16px" }}>
                      {emailVerifying ? "Verifying…" : "Verify Email OTP"}
                    </button>
                    <button type="button" className="cw-btn-ghost" onClick={() => { setEmailOtpSent(false); setEmailOtp(""); }} style={{ fontSize: "12px", padding: "7px 12px" }}>Resend</button>
                  </div>
                </div>
              )}

              {emailVerified && (
                <div className="cw-verified-box">
                  <span className="cw-verified-icon">✓</span>
                  <span>Email <strong>{email}</strong> verified successfully.</span>
                </div>
              )}

              <div className="cw-section-divider" style={{ marginTop: "8px" }}><span>Mobile Number Verification</span></div>

              <div className="cw-field">
                <label>
                  Mobile / WhatsApp Number <span className="req-star">*</span>
                  {mobileVerified && <span style={{ color: "#10b981", textTransform: "none", fontWeight: 700 }}>✓ Verified</span>}
                </label>
                <div className={`cw-input-row ${mobileVerified ? "verified" : ""}`}>
                  <span className="cw-icon" style={{ fontSize: "11px", fontWeight: 700, color: "#475569", paddingLeft: "8px", width: "36px" }}>+91</span>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={mobile}
                    readOnly={mobileVerified}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g,"")); setMobileOtpSent(false); setMobileVerified(false); }}
                  />
                  {!mobileVerified && (
                    <button type="button" className="cw-inline-btn" disabled={mobileSending || mobileOtpSent} onClick={sendMobileOtp}>
                      {mobileSending ? "Sending…" : mobileOtpSent ? "Sent ✓" : "Send OTP"}
                    </button>
                  )}
                </div>
                {mobileErrMsg && <div className="cw-verified-box cw-error-box"><span className="cw-verified-icon">!</span><span>{mobileErrMsg}</span></div>}
              </div>

              {mobileOtpSent && !mobileVerified && (
                <div className="cw-field">
                  <label>6-Digit Mobile OTP <span className="cw-field-hint">Sent via WhatsApp / SMS</span></label>
                  <OtpBoxes
                    prefix="mobile"
                    value={mobileOtp}
                    onChange={setMobileOtp}
                    verified={mobileVerified}
                    onComplete={verifyMobileOtp}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button type="button" className="cw-btn-primary" disabled={mobileVerifying || mobileOtp.length < 6} onClick={verifyMobileOtp} style={{ fontSize: "12px", padding: "7px 16px" }}>
                      {mobileVerifying ? "Verifying…" : "Verify Mobile OTP"}
                    </button>
                    <button type="button" className="cw-btn-ghost" onClick={() => { setMobileOtpSent(false); setMobileOtp(""); }} style={{ fontSize: "12px", padding: "7px 12px" }}>Resend</button>
                  </div>
                </div>
              )}

              {mobileVerified && (
                <div className="cw-verified-box">
                  <span className="cw-verified-icon">✓</span>
                  <span>Mobile <strong>+91 {mobile}</strong> verified successfully.</span>
                </div>
              )}

              {/* ── Password & Confirm Password ── */}
              <div className="cw-section-divider" style={{ marginTop: "8px" }}><span>Set Account Password</span></div>

              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Password <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 chars, letter + number"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 8px", color: "#64748b", fontSize: "12px", flexShrink: 0 }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? "#10b981" : "#ef4444" }}>
                      {password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
                        ? "✓ Strong password"
                        : "Must be ≥8 chars with a letter and a number"}
                    </div>
                  )}
                </div>

                <div className="cw-field">
                  <label>Confirm Password <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 8px", color: "#64748b", fontSize: "12px", flexShrink: 0 }}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: confirmPassword === password ? "#10b981" : "#ef4444" }}>
                      {confirmPassword === password ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </div>
                  )}
                </div>
              </div>

              <div className="cw-section-divider" style={{ marginTop: "8px" }}><span>Optional Details</span></div>

              <div className="cw-field">
                <label>Company Website</label>
                <div className="cw-input-row">
                  <span className="cw-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M2 12h20M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" stroke="currentColor" strokeWidth="1.8"/>
                    </svg>
                  </span>
                  <input placeholder="e.g. https://sunpharma.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </div>

              <div className="cw-nav-row">
                <button type="button" className="cw-btn-ghost" onClick={goBack}>← Back</button>
                <button type="button" className="cw-btn-primary" onClick={goNext}>Configure Modules →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─── */}
          {currentStep === 3 && (
            <div className="cw-form-module">
              <div className="cw-section-divider"><span>Company Summary</span></div>
              <div className="cw-review-grid">
                {[
                  ["Company Name", companyName || "—"],
                  ["Company Code", companyCode || "Auto-generated"],
                  ["GSTIN", activeGst || "Not provided"],
                  ["PAN Number", panNo || "Not provided"],
                  ["Email", email || "—"],
                  ["Mobile", mobile ? `+91 ${mobile}` : "—"],
                  ["Location", [city, stateVal, pincode].filter(Boolean).join(", ") || "—"],
                  ["Drug License", drugLicense || "Not provided"],
                ].map(([label, val]) => (
                  <div key={label} className="cw-review-item">
                    <span className="cw-review-label">{label}</span>
                    <span className="cw-review-val">{val}</span>
                  </div>
                ))}
              </div>

              <div className="cw-section-divider" style={{ marginTop: "4px" }}><span>Module Permissions</span></div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 10px", lineHeight: "1.6" }}>
                Toggle module access for this enterprise. Team members only see enabled modules in navigation.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                <button
                  type="button"
                  style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setEnabledModules(enabledModules.length === PHARMA_MODULES.length ? ["dashboard"] : PHARMA_MODULES.map((m) => m.id))}
                >
                  {enabledModules.length === PHARMA_MODULES.length ? "Deselect All" : "Select All Modules"}
                </button>
              </div>

              <div className="cw-module-grid">
                {PHARMA_MODULES.map((mod) => {
                  const on = enabledModules.includes(mod.id);
                  return (
                    <div key={mod.id} className={`cw-module-tile ${on ? "active" : ""}`} onClick={() => toggleModule(mod.id)}>
                      <div className="cw-module-check"><div className="cw-module-check-inner" /></div>
                      <div>
                        <p className="cw-module-label">{mod.label}</p>
                        <p className="cw-module-desc">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cw-nav-row">
                <button type="button" className="cw-btn-ghost" onClick={goBack}>← Back</button>
                <button type="button" className="cw-btn-success" disabled={loading} onClick={saveCompany}>
                  {loading ? "Saving…" : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Register Company
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}