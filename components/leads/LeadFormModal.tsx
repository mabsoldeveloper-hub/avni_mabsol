"use client";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/context/UserContext";

const LEAD_TYPES = [
  "Doctor", "Chemist/Retailer", "Hospital/Nursing Home",
  "Stockist/Distributor", "Export/International", "B2B Bulk Buyer",
  "Direct/OTC Customer", "Franchise Inquiry", "Generic Store", "Other",
];
const STAGES = ["New", "Contacted", "Qualified", "Sample Delivered", "Quotation Shared", "Negotiation", "Won", "Lost"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const SOURCES = [
  "Field Visit", "Website Form", "IndiaMART", "TradeIndia", "JustDial",
  "Facebook Ads", "Google Ads", "WhatsApp Inquiry", "Email Inquiry",
  "Reference/Referral", "Exhibition/Trade Show", "Cold Call", "Walk-in", "Excel Import", "Other",
];
const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

interface Props {
  onClose: () => void;
  onSaved: (lead: any) => void;
  initialData?: any;
  activeCompanyId?: string;
  activeFyId?: string;
  activeFyCode?: string;
}

// ─── OTP Field Component ───────────────────────────────────────────────────────
interface OtpFieldProps {
  type: "whatsapp" | "email";
  value: string;
  verified: boolean;
  onVerified: () => void;
  inp: React.CSSProperties;
}

function OtpVerifyBlock({ type, value, verified, onVerified, inp }: OtpFieldProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async () => {
    if (!value.trim()) {
      setError(type === "whatsapp" ? "WhatsApp number daalen" : "Email address daalen");
      return;
    }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/leads/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP send failed");
      setOtpSent(true);
      setCountdown(60); // 60s before resend
    } catch (err: any) {
      setError(err.message);
    } finally { setSending(false); }
  };

  const handleVerify = async () => {
    if (!otpInput.trim() || otpInput.length < 6) {
      setError("6-digit OTP daalen");
      return;
    }
    setVerifying(true); setError("");
    try {
      const res = await fetch("/api/leads/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value, otp: otpInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onVerified();
    } catch (err: any) {
      setError(err.message);
      setOtpInput("");
    } finally { setVerifying(false); }
  };

  const icon = type === "whatsapp" ? "💬" : "📧";
  const label = type === "whatsapp" ? "WhatsApp" : "Email";

  if (verified) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 8,
        padding: "8px 14px", background: "#dcfce7", borderRadius: 10,
        border: "1.5px solid #86efac",
      }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 13 }}>
          {label} Verified!
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!otpSent ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !value.trim()}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: sending ? "wait" : "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 12,
              opacity: (!value.trim() || sending) ? 0.6 : 1,
              whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            {sending ? "⏳ Sending..." : `${icon} Send OTP`}
          </button>
          {error && <span style={{ color: "#dc2626", fontSize: 12 }}>{error}</span>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{
                ...inp,
                width: 150,
                textAlign: "center",
                letterSpacing: "6px",
                fontSize: 18,
                fontWeight: 800,
                padding: "8px 12px",
              }}
              placeholder="------"
              maxLength={6}
              value={otpInput}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") handleVerify(); }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || otpInput.length < 6}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none",
                cursor: verifying ? "wait" : "pointer",
                background: otpInput.length === 6
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : "#e2e8f0",
                color: otpInput.length === 6 ? "#fff" : "#94a3b8",
                fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {verifying ? "⏳ Checking..." : "✅ Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtpInput(""); setError(""); }}
              style={{
                padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#64748b", cursor: "pointer",
                fontWeight: 600, fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {icon} OTP bheja gaya {type === "whatsapp" ? "WhatsApp pe" : "email pe"}.
            </span>
            {countdown > 0 ? (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                style={{
                  background: "none", border: "none", color: "#6366f1",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0,
                }}
              >
                Resend OTP
              </button>
            )}
          </div>
          {error && (
            <div style={{
              padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, color: "#dc2626", fontSize: 12,
            }}>
              ❌ {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function LeadFormModal({ onClose, onSaved, initialData, activeCompanyId, activeFyId, activeFyCode }: Props) {
  const { user: currentUser } = useUser();
  const isAdmin = (() => {
    if (!currentUser) return false;
    const roleType = (currentUser.roleType || "").toUpperCase();
    const roleName = (currentUser.roleId?.roleName || currentUser.role || "").toLowerCase();
    if (roleType === "MR" || roleType === "RSM" || roleType === "ZSM" || roleName === "employee") return false;
    return roleType === "ADMIN" || roleName.includes("admin") || roleName.includes("superadmin") || currentUser.isAdmin === true || currentUser.isSuperAdmin === true || !currentUser.roleType;
  })();

  const isEdit = !!initialData?._id;
  const [activeTab, setActiveTab] = useState<"basic"|"contact"|"business"|"pipeline">("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);

  // OTP verification states
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  // Track previous values to reset verification when value changes
  const [verifiedWhatsappValue, setVerifiedWhatsappValue] = useState("");
  const [verifiedEmailValue, setVerifiedEmailValue] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsersList(data);
        else if (data?.users) setUsersList(data.users);
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    partyName: initialData?.partyName || "",
    leadType: initialData?.leadType || "Doctor",
    speciality: initialData?.speciality || "",
    contactPerson: initialData?.contactPerson || "",
    phone: initialData?.phone || "",
    altPhone: initialData?.altPhone || "",
    email: initialData?.email || "",
    whatsapp: initialData?.whatsapp || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
    country: initialData?.country || "India",
    gstin: initialData?.gstin || "",
    dlNumber: initialData?.dlNumber || "",
    clinicHospitalName: initialData?.clinicHospitalName || "",
    stage: initialData?.stage || "New",
    priority: initialData?.priority || "Medium",
    source: initialData?.source || "Field Visit",
    referredBy: initialData?.referredBy || "",
    assignedTo: initialData?.assignedTo?._id || initialData?.assignedTo || "",
    assignedToName: initialData?.assignedToName || "",
    estimatedMonthlyValue: initialData?.estimatedMonthlyValue || 0,
    estimatedDealValue: initialData?.estimatedDealValue || 0,
    creditTermsRequested: initialData?.creditTermsRequested || "",
    nextFollowUpDate: initialData?.nextFollowUpDate
      ? new Date(initialData.nextFollowUpDate).toISOString().slice(0, 10) : "",
    nextFollowUpNote: initialData?.nextFollowUpNote || "",
    tags: (initialData?.tags || []) as string[],
    internalNotes: initialData?.internalNotes || "",
    interestedProducts: initialData?.interestedProducts?.join(", ") || "",
    country_export: initialData?.country_export || "",
    incoterms: initialData?.incoterms || "",
    moq: initialData?.moq || "",
  });

  const set = useCallback((field: string, val: any) =>
    setForm(prev => ({ ...prev, [field]: val })), []);

  // Reset OTP if value changes
  const handleWhatsappChange = (val: string) => {
    set("whatsapp", val);
    if (whatsappVerified && val !== verifiedWhatsappValue) {
      setWhatsappVerified(false);
      setVerifiedWhatsappValue("");
    }
  };
  const handleEmailChange = (val: string) => {
    set("email", val);
    if (emailVerified && val !== verifiedEmailValue) {
      setEmailVerified(false);
      setVerifiedEmailValue("");
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { set("tags", [...form.tags, t]); setTagInput(""); }
  };

  // ─── Validation before save ───────────────────────────────────────────────
  const canSave = (() => {
    if (isEdit) return true; // No OTP for edit
    // If WhatsApp is filled → must be verified
    if (form.whatsapp.trim() && !whatsappVerified) return false;
    // If Email is filled → must be verified
    if (form.email.trim() && !emailVerified) return false;
    return true;
  })();

  const getSaveBlockReason = () => {
    if (isEdit) return "";
    if (form.whatsapp.trim() && !whatsappVerified) return "WhatsApp OTP verify karna zaroori hai";
    if (form.email.trim() && !emailVerified) return "Email OTP verify karna zaroori hai";
    return "";
  };

  const handleSubmit = async () => {
    if (!form.partyName.trim()) { setError("Party/Doctor name is required"); return; }
    if (!form.phone.trim()) { setError("Phone number is required"); return; }
    if (!canSave) { setError(getSaveBlockReason()); setActiveTab("contact"); return; }
    setLoading(true); setError("");
    try {
      const payload = {
        ...form,
        companyId: initialData?.companyId || activeCompanyId,
        fyId: initialData?.fyId || activeFyId,
        fyCode: initialData?.fyCode || activeFyCode,
        interestedProducts: form.interestedProducts
          ? form.interestedProducts.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        estimatedMonthlyValue: Number(form.estimatedMonthlyValue) || 0,
        estimatedDealValue: Number(form.estimatedDealValue) || 0,
        nextFollowUpDate: form.nextFollowUpDate || null,
      };
      const url = isEdit ? `/api/leads/${initialData._id}` : "/api/leads";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? `⚠️ ${data.message}` : data.error || "Something went wrong");
        return;
      }
      onSaved(data.lead);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    Low:    { color: "#16a34a", bg: "#dcfce7", label: "⬇ Low" },
    Medium: { color: "#d97706", bg: "#fef3c7", label: "➡ Medium" },
    High:   { color: "#ea580c", bg: "#ffedd5", label: "⬆ High" },
    Urgent: { color: "#dc2626", bg: "#fee2e2", label: "🔥 Urgent" },
  };

  const TABS = [
    { key: "basic",    label: "📋 Basic Info" },
    { key: "contact",  label: "📞 Contact" },
    { key: "business", label: "🏢 Business" },
    { key: "pipeline", label: "🎯 Pipeline" },
  ] as const;

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 12,
    padding: "10px 14px", fontSize: 14, outline: "none",
    background: "#f8fafc", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const grid2: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
  };

  // Verification status badge for Contact tab label
  const contactBadge = !isEdit && (form.whatsapp.trim() || form.email.trim()) ? (
    whatsappVerified && emailVerified ? " ✅" :
    (!form.whatsapp.trim() && emailVerified) ? " ✅" :
    (!form.email.trim() && whatsappVerified) ? " ✅" :
    " 🔐"
  ) : "";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
        width: "100%", maxWidth: 760, maxHeight: "95vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
              {isEdit ? "✏️ Edit Lead" : "➕ Add New Lead"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {isEdit ? `Editing: ${initialData.partyName}` : "Capture a new business opportunity"}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10,
            color: "#fff", width: 36, height: 36, cursor: "pointer",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 6, padding: "12px 20px",
          background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              background: activeTab === t.key ? "#6366f1" : "transparent",
              color: activeTab === t.key ? "#fff" : "#64748b",
              boxShadow: activeTab === t.key ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
            }}>
              {t.label}{t.key === "contact" ? contactBadge : ""}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {error && (
            <div style={{
              marginBottom: 16, padding: "12px 16px", background: "#fef2f2",
              border: "1px solid #fca5a5", borderRadius: 12, color: "#dc2626", fontSize: 14,
            }}>{error}</div>
          )}

          {/* BASIC INFO */}
          {activeTab === "basic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={lbl}>Party / Doctor / Company Name *</label>
                <input style={inp} placeholder=""
                  value={form.partyName} onChange={e => set("partyName", e.target.value)} />
              </div>
              <div style={grid2}>
                <div>
                  <label style={lbl}>Lead Type *</label>
                  <select style={inp} value={form.leadType} onChange={e => set("leadType", e.target.value)}>
                    {LEAD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Speciality / Category</label>
                  <input style={inp} placeholder="e.g. Cardiologist, Wholesale"
                    value={form.speciality} onChange={e => set("speciality", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Lead Source *</label>
                  <select style={inp} value={form.source} onChange={e => set("source", e.target.value)}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {form.source === "Reference/Referral" && (
                  <div>
                    <label style={lbl}>Referred By</label>
                    <input style={inp} placeholder="Name of referrer"
                      value={form.referredBy} onChange={e => set("referredBy", e.target.value)} />
                  </div>
                )}
                {form.leadType === "Hospital/Nursing Home" && (
                  <div>
                    <label style={lbl}>Hospital / Clinic Name</label>
                    <input style={inp} placeholder="Hospital or Clinic name"
                      value={form.clinicHospitalName} onChange={e => set("clinicHospitalName", e.target.value)} />
                  </div>
                )}
              </div>
              {/* Tags */}
              <div>
                <label style={lbl}>Tags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {form.tags.map((t: string) => (
                    <span key={t} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#eef2ff", color: "#6366f1", borderRadius: 20,
                      padding: "4px 12px", fontSize: 13, fontWeight: 600,
                    }}>
                      #{t}
                      <button onClick={() => set("tags", form.tags.filter((x: string) => x !== t))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Add tag and press +"
                    value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                  <button onClick={addTag} style={{
                    background: "#6366f1", color: "#fff", border: "none", borderRadius: 12,
                    width: 42, height: 42, fontSize: 20, cursor: "pointer", flexShrink: 0,
                  }}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* CONTACT */}
          {activeTab === "contact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* OTP Info Banner (only for new lead) */}
              {!isEdit && (
                <div style={{
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                  border: "1.5px solid #c7d2fe",
                  borderRadius: 12,
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🔐</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4338ca" }}>
                      OTP Verification Required
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6366f1" }}>
                      WhatsApp number aur/ya email fill karne par OTP se verify karna hoga. Fields khali rakhne par verification skip hoga.
                    </p>
                  </div>
                </div>
              )}

              <div style={grid2}>
                <div>
                  <label style={lbl}>Contact Person</label>
                  <input style={inp} placeholder="Owner / Manager name"
                    value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Phone *</label>
                  <input style={inp} placeholder="10-digit mobile"
                    value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Alt. Phone</label>
                  <input style={inp} placeholder="Alternate number"
                    value={form.altPhone} onChange={e => set("altPhone", e.target.value)} />
                </div>

                {/* WhatsApp with OTP */}
                <div>
                  <label style={lbl}>
                    WhatsApp Number
                    {!isEdit && form.whatsapp.trim() && (
                      <span style={{
                        marginLeft: 6, fontSize: 10,
                        color: whatsappVerified ? "#16a34a" : "#f59e0b",
                        fontWeight: 800,
                      }}>
                        {whatsappVerified ? "● Verified" : "● Verify Required"}
                      </span>
                    )}
                  </label>
                  <input
                    style={{
                      ...inp,
                      borderColor: !isEdit && form.whatsapp.trim()
                        ? whatsappVerified ? "#86efac" : "#fcd34d"
                        : "#e2e8f0",
                    }}
                    placeholder="WhatsApp number"
                    value={form.whatsapp}
                    onChange={e => handleWhatsappChange(e.target.value)}
                  />
                  {!isEdit && (
                    <OtpVerifyBlock
                      type="whatsapp"
                      value={form.whatsapp}
                      verified={whatsappVerified}
                      onVerified={() => {
                        setWhatsappVerified(true);
                        setVerifiedWhatsappValue(form.whatsapp);
                      }}
                      inp={inp}
                    />
                  )}
                </div>

                {/* Email with OTP */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>
                    Email
                    {!isEdit && form.email.trim() && (
                      <span style={{
                        marginLeft: 6, fontSize: 10,
                        color: emailVerified ? "#16a34a" : "#f59e0b",
                        fontWeight: 800,
                      }}>
                        {emailVerified ? "● Verified" : "● Verify Required"}
                      </span>
                    )}
                  </label>
                  <input
                    style={{
                      ...inp,
                      borderColor: !isEdit && form.email.trim()
                        ? emailVerified ? "#86efac" : "#fcd34d"
                        : "#e2e8f0",
                    }}
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                  />
                  {!isEdit && (
                    <OtpVerifyBlock
                      type="email"
                      value={form.email}
                      verified={emailVerified}
                      onVerified={() => {
                        setEmailVerified(true);
                        setVerifiedEmailValue(form.email);
                      }}
                      inp={inp}
                    />
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Address</label>
                  <input style={inp} placeholder="Full address"
                    value={form.address} onChange={e => set("address", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} placeholder="City"
                    value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <select style={inp} value={form.state} onChange={e => set("state", e.target.value)}>
                    <option value="">Select State</option>
                    {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Pincode</label>
                  <input style={inp} placeholder="6-digit pincode"
                    value={form.pincode} onChange={e => set("pincode", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Country</label>
                  <input style={inp} placeholder="India"
                    value={form.country} onChange={e => set("country", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* BUSINESS */}
          {activeTab === "business" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={grid2}>
                <div>
                  <label style={lbl}>GSTIN</label>
                  <input style={inp} placeholder="GST Number" value={form.gstin} onChange={e => set("gstin", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Drug License No.</label>
                  <input style={inp} placeholder="DL Number" value={form.dlNumber} onChange={e => set("dlNumber", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Est. Monthly Value (₹)</label>
                  <input style={inp} type="number" placeholder="0"
                    value={form.estimatedMonthlyValue} onChange={e => set("estimatedMonthlyValue", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Est. Deal Value (₹)</label>
                  <input style={inp} type="number" placeholder="0"
                    value={form.estimatedDealValue} onChange={e => set("estimatedDealValue", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Credit Terms Requested</label>
                  <input style={inp} placeholder="e.g. 30 days, COD"
                    value={form.creditTermsRequested} onChange={e => set("creditTermsRequested", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Interested Products</label>
                  <input style={inp} placeholder="Comma separated product names"
                    value={form.interestedProducts} onChange={e => set("interestedProducts", e.target.value)} />
                </div>
                {form.leadType === "Export/International" && (<>
                  <div>
                    <label style={lbl}>Export Country</label>
                    <input style={inp} placeholder="Country" value={form.country_export} onChange={e => set("country_export", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Incoterms</label>
                    <input style={inp} placeholder="FOB, CIF, EXW" value={form.incoterms} onChange={e => set("incoterms", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>MOQ</label>
                    <input style={inp} placeholder="e.g. 5000 units" value={form.moq} onChange={e => set("moq", e.target.value)} />
                  </div>
                </>)}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Internal Notes</label>
                  <textarea style={{ ...inp, height: 100, resize: "vertical" as const }}
                    placeholder="Internal notes for your team..."
                    value={form.internalNotes} onChange={e => set("internalNotes", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* PIPELINE */}
          {activeTab === "pipeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={lbl}>Stage</label>
                <select style={inp} value={form.stage} onChange={e => set("stage", e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>👤 Assign to Executive / User</label>
                <select style={inp} value={form.assignedTo} onChange={e => {
                  const u = usersList.find((x: any) => x._id === e.target.value);
                  setForm(prev => ({
                    ...prev,
                    assignedTo: e.target.value,
                    assignedToName: u ? u.name : "",
                  }));
                }}>
                  <option value="">Default (Auto-assign to Me)</option>
                  {usersList.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.roleType ? `(${u.roleType})` : ""} {u.email ? `- ${u.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Priority</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {PRIORITIES.map(p => {
                    const pc = priorityConfig[p];
                    const active = form.priority === p;
                    return (
                      <button key={p} type="button" onClick={() => set("priority", p)} style={{
                        flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer",
                        border: `2px solid ${active ? pc.color : "#e2e8f0"}`,
                        background: active ? pc.color : "#fff",
                        color: active ? "#fff" : "#64748b",
                        fontWeight: 700, fontSize: 13, transition: "all 0.2s",
                        transform: active ? "scale(1.05)" : "scale(1)",
                      }}>{pc.label}</button>
                    );
                  })}
                </div>
              </div>
              <div style={grid2}>
                <div>
                  <label style={lbl}>Next Follow-up Date</label>
                  <input style={inp} type="date" value={form.nextFollowUpDate}
                    onChange={e => set("nextFollowUpDate", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Follow-up Note</label>
                  <input style={inp} placeholder="What to discuss"
                    value={form.nextFollowUpNote} onChange={e => set("nextFollowUpNote", e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px", borderTop: "1px solid #e2e8f0",
          background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {TABS.map(t => (
              <span key={t.key} style={{
                height: 8, borderRadius: 10, transition: "all 0.2s",
                width: activeTab === t.key ? 24 : 8,
                background: activeTab === t.key ? "#6366f1" : "#cbd5e1",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* OTP status reminder */}
            {!isEdit && !canSave && (
              <span style={{
                fontSize: 12, color: "#f59e0b", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                🔐 {getSaveBlockReason()}
              </span>
            )}
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 14, fontWeight: 600,
            }}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!isEdit && !canSave)}
              title={!canSave ? getSaveBlockReason() : ""}
              style={{
                padding: "10px 24px", borderRadius: 12, border: "none",
                cursor: (loading || (!isEdit && !canSave)) ? "not-allowed" : "pointer",
                background: loading
                  ? "#a5b4fc"
                  : (!isEdit && !canSave)
                    ? "#e2e8f0"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: (!isEdit && !canSave) ? "#94a3b8" : "#fff",
                fontWeight: 700, fontSize: 14,
                boxShadow: (!isEdit && !canSave) ? "none" : "0 4px 15px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Saving..." : isEdit ? "✅ Update Lead" : "✅ Save Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
