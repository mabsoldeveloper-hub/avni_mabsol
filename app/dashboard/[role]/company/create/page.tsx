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
  { id: "dashboard", label: "Executive AI & Standard Dashboard", desc: "KPI Cards, AI Smart Alerts, Radar & Targets" },
  { id: "sales", label: "Sales & Invoicing", desc: "Invoices, Orders, Receipts, Bad Debts & Sales vs Collection" },
  { id: "purchase", label: "Purchase & Inward (GRN)", desc: "Purchase Bills, AI Bill Entry, Debit Notes & Payments" },
  { id: "inventory", label: "Inventory & Expiry Control", desc: "Stock Overview, Batch Expiry Liquidator & Stock Ledger" },
  { id: "customer", label: "Customer & Party Accounts", desc: "Customer Directory, Ledgers & Contact Profiles" },
  { id: "master", label: "Pharma Master Data", desc: "Accounting Groups, MR Master, Products, HSN & Divisions" },
  { id: "area", label: "Territory & Area Management", desc: "Territory Assignment, Regional HQ, Zones & Maps" },
  { id: "compare", label: "Comparative Analytics & Radar", desc: "Financial Year Wise & Area Map Analytics" },
  { id: "leads", label: "Leads & Marketing Campaigns", desc: "Pipelines, Email Campaign, WhatsApp & Broadcast Hub" },
  { id: "custom-forms", label: "Custom Form Studio", desc: "Dynamic Inspection Forms, Order Templates & Builders" },
  { id: "financial-year", label: "Financial Year (FY) Control", desc: "Create, Switch & Manage Financial Years" },
  { id: "reports", label: "Executive Reports & MIS", desc: "Sales, Inward/Outward & GST Tax Reports" },
  { id: "mabsolcrmsync", label: "Desktop Sync Agent", desc: "Secure ERP Data Sync Bridge & Multi-Branch Sync" },
  { id: "users", label: "Users & Hierarchy Permissions", desc: "Staff Management, Roles & Hierarchy Assignment" },
  { id: "settings", label: "Settings & Customization", desc: "Company Settings, Menu Layouts, Voice AI & Notifications" },
  { id: "company", label: "Company & Branch Directory", desc: "Branch Entity Management & Multi-Branch Settings" },
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

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function CreateCompanyPage() {
  const router = useRouter();
  const { refreshCompanies } = useCompany();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Success Modal
  const [createdCompanyCode, setCreatedCompanyCode] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // GST options from existing user companies
  const [gstOptions, setGstOptions] = useState<GstOption[]>([]);
  const [loadingGsts, setLoadingGsts] = useState(true);
  const [useNewGst, setUseNewGst] = useState(false);

  // STEP 1: Company Profile & GST
  const [companyName, setCompanyName] = useState("");
  const [selectedGst, setSelectedGst] = useState<string>("");
  const [manualGst, setManualGst] = useState<string>("");
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
  const [logo, setLogo] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);

  // STEP 2: Contact & Authentication
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailErrMsg, setEmailErrMsg] = useState<string | null>(null);

  const [mobile, setMobile] = useState("");
  const [website, setWebsite] = useState("");

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STEP 3: Module Permissions
  const [enabledModules, setEnabledModules] = useState<string[]>(PHARMA_MODULES.map((m) => m.id));

  function showToast(message: string, type: Toast["type"] = "info") {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }
  function removeToast(id: string) {
    setToasts((p) => p.filter((t) => t.id !== id));
  }

  // Load existing GST options
  useEffect(() => {
    async function loadGsts() {
      try {
        setLoadingGsts(true);
        const res = await fetch("/api/company-master");
        const data = await res.json();
        if (Array.isArray(data)) {
          const opts: GstOption[] = [];
          data.forEach((co: any) => {
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

  async function handleGstSelect(gstin: string) {
    setSelectedGst(gstin);
    setGstVerified(false);
    setGstVerifyMsg(null);
    setErrorBanner(null);

    if (!gstin) {
      setCompanyName("");
      setAddress("");
      setCity("");
      setStateVal("");
      setPincode("");
      return;
    }

    const cached = gstOptions.find((o) => o.gstNo === gstin);
    if (cached?.companyName) {
      setCompanyName(cached.companyName);
      if (cached.state) setStateVal(cached.state);
      if (cached.city) setCity(cached.city);
      if (cached.address) setAddress(cached.address);
      if (cached.pincode) setPincode(cached.pincode);
    }

    await verifyGst(gstin);
  }

  async function verifyGst(raw?: string) {
    const currentActiveGst = gstOptions.length > 0 && !useNewGst ? selectedGst : manualGst;
    const gstin = (raw || currentActiveGst).trim().toUpperCase();
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
      if (resp.success && resp.data) {
        const d = resp.data;
        const name = d.businessName || d.legalName || d.tradeName || companyName;
        setGstVerified(true);
        setErrorBanner(null);
        setGstVerifyMsg({ text: `✓ ${name ? name + " — " : ""}${d.status || "Active"}`, ok: true });
        if (name) setCompanyName(name);
        if (d.address) setAddress(d.address);
        if (d.city) setCity(d.city);
        if (d.state) setStateVal(d.state);
        if (d.pincode) setPincode(d.pincode);
        if (d.pan) setPanNo(d.pan);
        showToast(name ? `✓ GSTIN Verified — ${name}` : `✓ GSTIN verified (${gstin})`, "success");
      } else {
        setGstVerified(false);
        setGstVerifyMsg({ text: resp.message || "Invalid GSTIN. Please check and retry.", ok: false });
        showToast(resp.message || "Invalid GSTIN", "error");
      }
    } catch {
      if (gstin.length === 15) {
        setGstVerified(true);
        setGstVerifyMsg({ text: `✓ GSTIN ${gstin} format verified`, ok: true });
        showToast(`GSTIN format accepted (${gstin})`, "info");
      } else {
        showToast("GST verification failed. Check your connection.", "error");
      }
    } finally {
      setVerifyingGst(false);
    }
  }

  // Email OTP handlers
  async function sendEmailOtp() {
    const emailErr = validateEmail(email);
    if (emailErr) {
      showToast(emailErr, "error");
      return;
    }
    setEmailSending(true);
    setEmailErrMsg(null);
    try {
      const res = await fetch("/api/auth/send-company-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailOtpSent(true);
        showToast(`Verification code sent to ${email}`, "success");
        setTimeout(() => (document.getElementById("email-otp-0") as HTMLInputElement)?.focus(), 120);
      } else {
        setEmailErrMsg(data.message || "Failed to send OTP");
        showToast(data.message || "Failed to send OTP", "error");
      }
    } catch {
      showToast("Failed to send email OTP", "error");
    } finally {
      setEmailSending(false);
    }
  }

  async function verifyEmailOtp() {
    if (emailOtp.length !== 6) {
      showToast("Enter the full 6-digit OTP", "error");
      return;
    }
    setEmailVerifying(true);
    setEmailErrMsg(null);
    try {
      const res = await fetch("/api/auth/verify-company-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: emailOtp.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailVerified(true);
        showToast("Email address verified successfully!", "success");
      } else {
        setEmailErrMsg(data.message || "Incorrect OTP code");
        showToast(data.message || "Incorrect OTP code", "error");
      }
    } catch {
      showToast("OTP verification failed", "error");
    } finally {
      setEmailVerifying(false);
    }
  }

  // Step Navigation
  function goNext() {
    setErrorBanner(null);
    const activeGst = gstOptions.length > 0 && !useNewGst ? selectedGst : manualGst;

    if (currentStep === 1) {
      if (!companyName.trim()) {
        setErrorBanner("Company legal name is required");
        return;
      }
      if (!activeGst || activeGst.length !== 15) {
        setErrorBanner("Please select or enter a valid 15-character GSTIN");
        return;
      }
      if (!gstVerified) {
        setErrorBanner("Please click Verify to validate the GSTIN before continuing");
        return;
      }
      setCurrentStep(2);
      showToast("Step 1 complete — Verify email & setup administrator login", "info");
    } else if (currentStep === 2) {
      const emailErr = validateEmail(email);
      if (emailErr) {
        setErrorBanner(emailErr);
        return;
      }
      if (!emailVerified) {
        setErrorBanner("Please verify your email address via OTP before continuing");
        return;
      }
      const mobErr = validateMobile(mobile);
      if (mobErr) {
        setErrorBanner(mobErr);
        return;
      }
      if (!password || password.length < 6) {
        setErrorBanner("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setErrorBanner("Passwords do not match — please re-enter");
        return;
      }
      setCurrentStep(3);
      showToast("Login setup complete — Configure permitted modules", "info");
    }
  }

  function goBack() {
    setErrorBanner(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  }

  function toggleModule(id: string) {
    setEnabledModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  // Submit Company Creation
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Logo file size must be less than 5MB", "error");
      return;
    }

    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setLogo(data.url);
        showToast("Company logo uploaded successfully", "success");
      } else {
        showToast(data.message || "Failed to upload logo", "error");
      }
    } catch {
      showToast("Failed to upload logo", "error");
    } finally {
      setLogoUploading(false);
    }
  };

  async function saveCompany() {
    if (enabledModules.length === 0) {
      setErrorBanner("Select at least one module");
      return;
    }
    if (!password || password.length < 6) {
      setErrorBanner("Please set an account password (minimum 6 characters)");
      return;
    }
    if (password !== confirmPassword) {
      setErrorBanner("Account passwords do not match");
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    const activeGst = gstOptions.length > 0 && !useNewGst ? selectedGst : manualGst;
    try {
      const res = await fetch("/api/company-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          ownerName: ownerName.trim() || companyName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.replace(/\D/g, ""),
          password,
          gstNo: activeGst,
          panNo,
          drugLicenseNo: drugLicense,
          website,
          address,
          city,
          state: stateVal,
          pincode,
          logo: logo || "",
          enabledModules,
          status: "Active",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const assignedCode = data.companyCode || data.company?.companyCode || "ASSIGNED";
        setCreatedCompanyCode(assignedCode);
        setShowSuccessModal(true);
        await refreshCompanies();
      } else {
        setErrorBanner(data.error || "Failed to create company");
        showToast(data.error || "Failed to create company", "error");
      }
    } catch {
      setErrorBanner("An unexpected error occurred while registering the company");
      showToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  }

  // OTP 6-box helper component
  function OtpBoxes({
    value,
    onChange,
    verified,
    onComplete,
  }: {
    value: string;
    onChange: (v: string) => void;
    verified: boolean;
    onComplete: () => void;
  }) {
    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        onChange(pasted);
        const nextIdx = Math.min(pasted.length, 5);
        setTimeout(() => (document.getElementById(`email-otp-${nextIdx}`) as HTMLInputElement)?.focus(), 50);
        if (pasted.length === 6) {
          setTimeout(onComplete, 80);
        }
      }
    };

    return (
      <div className="cw-otp-boxes" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            id={`email-otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ""}
            disabled={verified}
            className={`cw-otp-box ${verified ? "verified" : value[i] ? "filled" : ""}`}
            onChange={(e) => {
              const char = e.target.value.replace(/\D/g, "").slice(-1);
              const arr = value.padEnd(6, " ").split("");
              arr[i] = char || " ";
              const next = arr.join("").trimEnd();
              onChange(next);
              if (char && i < 5) {
                (document.getElementById(`email-otp-${i + 1}`) as HTMLInputElement)?.focus();
              }
              if (next.replace(/ /g, "").length === 6) {
                setTimeout(onComplete, 80);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                if (!value[i] && i > 0) {
                  const arr = value.padEnd(6, " ").split("");
                  arr[i - 1] = " ";
                  onChange(arr.join("").replace(/ /g, "").slice(0, 6));
                  (document.getElementById(`email-otp-${i - 1}`) as HTMLInputElement)?.focus();
                } else if (value[i]) {
                  const arr = value.padEnd(6, " ").split("");
                  arr[i] = " ";
                  onChange(arr.join("").replace(/ /g, "").slice(0, 6));
                }
              } else if (e.key === "ArrowLeft" && i > 0) {
                (document.getElementById(`email-otp-${i - 1}`) as HTMLInputElement)?.focus();
              } else if (e.key === "ArrowRight" && i < 5) {
                (document.getElementById(`email-otp-${i + 1}`) as HTMLInputElement)?.focus();
              }
            }}
          />
        ))}
      </div>
    );
  }

  const activeGst = gstOptions.length > 0 && !useNewGst ? selectedGst : manualGst;
  const companyPrefixPreview = companyName.trim()
    ? (companyName.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) || "CO") + "###"
    : "NAME###";

  return (
    <div className={`cw-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <div className="cw-bg-glow cw-glow-top" />
      <div className="cw-bg-glow cw-glow-bottom" />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="cw-modal-backdrop">
          <div className="cw-modal-box">
            <div className="cw-modal-icon-badge">✓</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
              Company Registered Successfully!
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              The new company entity and dedicated administrator account have been provisioned.
            </p>

            <div className="cw-modal-code-card">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", display: "block", marginBottom: "4px" }}>
                Auto-Generated Company CRM Code
              </span>
              <div className="cw-modal-code-text">{createdCompanyCode}</div>
              <span style={{ fontSize: "11.5px", color: "#2563eb", marginTop: "4px", display: "block" }}>
                (Derived from Company Name + Random Number)
              </span>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", fontSize: "12px", textAlign: "left", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ marginBottom: "4px" }}><strong>Company:</strong> {companyName}</div>
              <div style={{ marginBottom: "4px" }}><strong>Login Email:</strong> {email}</div>
              <div><strong>Data Isolation:</strong> Company-restricted tenant environment enabled</div>
            </div>

            <button
              type="button"
              className="cw-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: "14px" }}
              onClick={() => router.push("/dashboard/company/list")}
            >
              Continue to Company Directory →
            </button>
          </div>
        </div>
      )}

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
          {/* Brand Header */}
          <div className="cw-brand">
            <div className="cw-brand-icon">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 9L16 3L28 9V23L16 29L4 23V9Z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="rgba(255,255,255,0.1)" />
                <path d="M13 8H19V13.5H24.5V19H19V24.5H13V19H7.5V13.5H13V8Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <div className="cw-brand-text">
              <span className="cw-brand-name" style={{ fontFamily: "var(--font-display)" }}>MabsolCrm</span>
              <span className="cw-brand-sub">Register a New Enterprise / Branch</span>
            </div>
          </div>

          {/* Step Heading */}
          <div className="cw-heading-box">
            <h1 style={{ fontFamily: "var(--font-display)" }}>
              {currentStep === 1 && "Company Profile & GST Verification"}
              {currentStep === 2 && "Contact Details & Account Credentials"}
              {currentStep === 3 && "Configure Module Permissions & Review"}
            </h1>
            <p>
              {currentStep === 1 && "Select or enter your GSTIN to verify and auto-fill official company details."}
              {currentStep === 2 && "Verify your work email address with OTP and set up the administrator login password."}
              {currentStep === 3 && "Choose permitted operational modules and review company specifications before registration."}
            </p>
          </div>

          {/* Step Tracker */}
          <div className="cw-step-tracker">
            <button
              type="button"
              className={`cw-step-btn ${currentStep === 1 ? "active" : currentStep > 1 ? "done" : ""}`}
              onClick={() => setCurrentStep(1)}
            >
              <span className="cw-step-num">{currentStep > 1 ? "✓" : "1"}</span>
              <span className="cw-step-label">Company & GST</span>
            </button>
            <div className={`cw-step-line ${currentStep > 1 ? "filled" : ""}`} />
            <button
              type="button"
              className={`cw-step-btn ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`}
              onClick={() => { if (companyName && gstVerified) setCurrentStep(2); }}
            >
              <span className="cw-step-num">{currentStep > 2 ? "✓" : "2"}</span>
              <span className="cw-step-label">Email & Password</span>
            </button>
            <div className={`cw-step-line ${currentStep > 2 ? "filled" : ""}`} />
            <button
              type="button"
              className={`cw-step-btn ${currentStep === 3 ? "active" : ""}`}
              onClick={() => { if (emailVerified && password && password === confirmPassword) setCurrentStep(3); }}
            >
              <span className="cw-step-num">3</span>
              <span className="cw-step-label">Modules & Review</span>
            </button>
          </div>

          {errorBanner && (
            <div className="cw-error-banner"><span>⚠</span> {errorBanner}</div>
          )}

          {/* ─── STEP 1: COMPANY & GST ─── */}
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
                  <>
                    <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                      <div className={`cw-input-row ${gstVerified ? "verified" : ""}`} style={{ flex: 1 }}>
                        <span className="cw-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </span>
                        <select
                          value={selectedGst}
                          onChange={(e) => handleGstSelect(e.target.value)}
                          style={{
                            flex: 1,
                            padding: "9px 4px 9px 0",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: selectedGst ? "#0f172a" : "#94a3b8",
                            fontFamily: selectedGst ? "'IBM Plex Mono', monospace" : "inherit",
                            letterSpacing: selectedGst ? "0.04em" : 0,
                            textTransform: "uppercase",
                            cursor: "pointer",
                            appearance: "none",
                            width: "100%",
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
                      onClick={() => {
                        setUseNewGst(true);
                        setSelectedGst("");
                        setGstVerified(false);
                        setGstVerifyMsg(null);
                        setErrorBanner(null);
                      }}
                      style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "2px 0", textDecoration: "underline", alignSelf: "flex-start" }}
                    >
                      + Enter a different / new GSTIN
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`cw-input-row ${gstVerified ? "verified" : ""}`}>
                      <span className="cw-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
                        onClick={() => {
                          setUseNewGst(false);
                          setManualGst("");
                          setGstVerified(false);
                          setGstVerifyMsg(null);
                        }}
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

              {/* Company Logo Upload (5MB limit) */}
              <div className="cw-field">
                <label>Company Logo <span className="cw-field-hint">PNG, JPG, WEBP · Max 5MB</span></label>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#f8faff", padding: "12px 16px", borderRadius: "12px", border: "1.5px dashed #cbd5e1" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "12px", background: "white", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logoUploading ? (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563eb" }}>Uploading…</span>
                    ) : logo ? (
                      <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
                      <span>{logo ? "Change Logo" : "Upload Logo"}</span>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Upload enterprise emblem (Max 5MB). Displays in dashboards, headers & reports.
                    </span>
                  </div>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo("")}
                      style={{ marginLeft: "auto", fontSize: "11.5px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Company Legal Name & Code Info */}
              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Company Legal / Trade Name <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <input
                      placeholder="e.g. Sun Pharmaceutical Industries Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cw-field">
                  <label>
                    System Company Code
                    <span className="cw-field-hint">Auto-generated</span>
                  </label>
                  <div
                    style={{
                      background: "#f8faff",
                      border: "1px dashed #93c5fd",
                      borderRadius: "10px",
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minHeight: "42px",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>⚡</span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.05em" }}>
                        Preview: {companyPrefixPreview}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Auto-assigned as Company Name prefix + random number on registration
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Owner / Director Name</label>
                  <div className="cw-input-row">
                    <input
                      placeholder="e.g. Rajesh Kumar"
                      value={ownerName}
                      maxLength={80}
                      onChange={(e) => setOwnerName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                    />
                  </div>
                </div>

                <div className="cw-field">
                  <label>Drug License No (DL)</label>
                  <div className="cw-input-row">
                    <input
                      placeholder="e.g. DL/20B/21B/MH/99999"
                      value={drugLicense}
                      onChange={(e) => setDrugLicense(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="cw-section-divider"><span>Registered Office Address</span></div>

              <div className="cw-field">
                <label>Street / Premises Address</label>
                <div className="cw-input-row">
                  <span className="cw-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Plot 17, GIDC SEZ, Sector 28, Near Water Tank"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
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
                    <input
                      placeholder="e.g. 380024"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              </div>

              <div className="cw-nav-row">
                <button type="button" className="cw-btn-ghost" onClick={() => router.push("/dashboard/company/list")}>
                  Cancel
                </button>
                <button type="button" className="cw-btn-primary" onClick={goNext}>
                  Continue to Contact & Login →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: EMAIL VERIFICATION & PASSWORD ─── */}
          {currentStep === 2 && (
            <div className="cw-form-module">
              <div className="cw-section-divider"><span>Work Email Verification (OTP Required)</span></div>

              <div className="cw-field">
                <label>
                  Company Administrator Work Email <span className="req-star">*</span>
                  {emailVerified && <span style={{ color: "#10b981", textTransform: "none", fontWeight: 700 }}>✓ Verified</span>}
                </label>
                <div className={`cw-input-row ${emailVerified ? "verified" : ""}`}>
                  <span className="cw-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="e.g. admin@company.com"
                    value={email}
                    readOnly={emailVerified}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailOtpSent(false);
                      setEmailVerified(false);
                    }}
                  />
                  {!emailVerified && (
                    <button
                      type="button"
                      className="cw-inline-btn"
                      disabled={emailSending || emailOtpSent}
                      onClick={sendEmailOtp}
                    >
                      {emailSending ? "Sending…" : emailOtpSent ? "Sent ✓" : "Send OTP"}
                    </button>
                  )}
                </div>
                {emailErrMsg && (
                  <div className="cw-verified-box cw-error-box">
                    <span className="cw-verified-icon">!</span>
                    <span>{emailErrMsg}</span>
                  </div>
                )}
              </div>

              {emailOtpSent && !emailVerified && (
                <div className="cw-field">
                  <label>
                    Enter 6-Digit Email OTP
                    <span className="cw-field-hint">Check your email inbox & spam folder</span>
                  </label>
                  <OtpBoxes
                    value={emailOtp}
                    onChange={setEmailOtp}
                    verified={emailVerified}
                    onComplete={verifyEmailOtp}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="cw-btn-primary"
                      disabled={emailVerifying || emailOtp.length < 6}
                      onClick={verifyEmailOtp}
                      style={{ fontSize: "12px", padding: "7px 16px" }}
                    >
                      {emailVerifying ? "Verifying…" : "Verify Email OTP"}
                    </button>
                    <button
                      type="button"
                      className="cw-btn-ghost"
                      onClick={() => {
                        setEmailOtpSent(false);
                        setEmailOtp("");
                      }}
                      style={{ fontSize: "12px", padding: "7px 12px" }}
                    >
                      Resend
                    </button>
                  </div>
                </div>
              )}

              {emailVerified && (
                <div className="cw-verified-box">
                  <span className="cw-verified-icon">✓</span>
                  <span>Email <strong>{email}</strong> verified successfully. This will be the company login ID.</span>
                </div>
              )}

              <div className="cw-section-divider" style={{ marginTop: "14px" }}><span>Contact & Website</span></div>

              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Mobile / Contact Number <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon" style={{ fontSize: "11px", fontWeight: 700, color: "#475569", paddingLeft: "8px", width: "36px" }}>+91</span>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Contact phone number for branch communications (No OTP required)
                  </span>
                </div>

                <div className="cw-field">
                  <label>Company Website</label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M2 12h20M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <input
                      placeholder="e.g. https://company.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Set Account Password */}
              <div className="cw-section-divider" style={{ marginTop: "14px" }}><span>Company Administrator Password</span></div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: "1.5" }}>
                Set a secure password for this company&apos;s admin login. This user will only have access to this company&apos;s isolated database.
              </p>

              <div className="cw-grid-2">
                <div className="cw-field">
                  <label>Login Password <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="cw-pwd-toggle"
                      onClick={() => setShowPassword((p) => !p)}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="9" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: password.length >= 6 ? "#10b981" : "#ef4444" }}>
                      {password.length >= 6 ? "✓ Password length acceptable" : "Must be at least 6 characters"}
                    </div>
                  )}
                </div>

                <div className="cw-field">
                  <label>Confirm Password <span className="req-star">*</span></label>
                  <div className="cw-input-row">
                    <span className="cw-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="cw-pwd-toggle"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="9" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: confirmPassword === password ? "#10b981" : "#ef4444" }}>
                      {confirmPassword === password ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </div>
                  )}
                </div>
              </div>

              <div className="cw-nav-row">
                <button type="button" className="cw-btn-ghost" onClick={goBack}>
                  ← Back to Company & GST
                </button>
                <button type="button" className="cw-btn-primary" onClick={goNext}>
                  Configure Modules & Permissions →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: MODULE PERMISSIONS & REVIEW ─── */}
          {currentStep === 3 && (
            <div className="cw-form-module">
              <div className="cw-section-divider"><span>Company Profile Review</span></div>
              <div className="cw-review-grid">
                {[
                  ["Company Legal Name", companyName || "—"],
                  ["Company CRM Code", `Auto-assigned (${companyPrefixPreview})`],
                  ["GSTIN Number", activeGst || "Not provided"],
                  ["PAN Number", panNo || "Not provided"],
                  ["Admin Login Email", `${email} (Verified ✓)`],
                  ["Mobile Number", mobile ? `+91 ${mobile}` : "—"],
                  ["Registered Location", [city, stateVal, pincode].filter(Boolean).join(", ") || "—"],
                  ["Drug License", drugLicense || "Not provided"],
                ].map(([label, val]) => (
                  <div key={label} className="cw-review-item">
                    <span className="cw-review-label">{label}</span>
                    <span className="cw-review-val">{val}</span>
                  </div>
                ))}
              </div>

              <div className="cw-section-divider" style={{ marginTop: "18px" }}>
                <span>Module Permissions & Access Control</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 10px", lineHeight: "1.6" }}>
                Toggle module access for this enterprise. Users assigned to this company will only see enabled modules in navigation.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                <button
                  type="button"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() =>
                    setEnabledModules(
                      enabledModules.length === PHARMA_MODULES.length
                        ? ["dashboard"]
                        : PHARMA_MODULES.map((m) => m.id)
                    )
                  }
                >
                  {enabledModules.length === PHARMA_MODULES.length ? "Deselect All Modules" : "Select All Modules"}
                </button>
              </div>

              <div className="cw-module-grid">
                {PHARMA_MODULES.map((mod) => {
                  const on = enabledModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className={`cw-module-tile ${on ? "active" : ""}`}
                      onClick={() => toggleModule(mod.id)}
                    >
                      <div className="cw-module-check">
                        <div className="cw-module-check-inner" />
                      </div>
                      <div>
                        <p className="cw-module-label">{mod.label}</p>
                        <p className="cw-module-desc">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cw-nav-row" style={{ marginTop: "24px" }}>
                <button type="button" className="cw-btn-ghost" onClick={goBack}>
                  ← Back to Contact & Login
                </button>
                <button
                  type="button"
                  className="cw-btn-success"
                  disabled={loading}
                  onClick={saveCompany}
                  style={{ minWidth: "180px", padding: "12px 24px" }}
                >
                  {loading ? (
                    "Registering Company…"
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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