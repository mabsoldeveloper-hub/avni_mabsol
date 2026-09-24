"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import { useToast } from "@/context/ToastContext";
import "./register.css";
import { API } from "@/lib/api";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

interface AdditionalGstItem {
  id: string;
  branchName: string;
  gstNo: string;
  state: string;
  stateCode: string;
  verified: boolean;
  address: string;
  city: string;
  pincode: string;
  email: string;
  mobile: string;
  password?: string;
  confirmPassword?: string;
  showPassword?: boolean;
  showConfirm?: boolean;
  isVerifying?: boolean;
  emailVerified?: boolean;
  emailOtpSent?: boolean;
  emailOtp?: string;
  emailSending?: boolean;
  emailVerifying?: boolean;
  emailCountdown?: number;
}

function SquareOtpInput({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "");
    if (!clean) {
      const nextArr = [...digits];
      nextArr[index] = "";
      onChange(nextArr.join(""));
      return;
    }

    const lastDigit = clean.slice(-1);
    const nextArr = [...digits];
    nextArr[index] = lastDigit;
    const combined = nextArr.join("");
    onChange(combined);

    if (index < 5 && lastDigit) {
      const nextInput = document.getElementById(`${idPrefix}-digit-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const prevInput = document.getElementById(`${idPrefix}-digit-${index - 1}`) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      const prevInput = document.getElementById(`${idPrefix}-digit-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      const nextInput = document.getElementById(`${idPrefix}-digit-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    const targetIdx = Math.min(5, pasted.length - 1);
    const targetInput = document.getElementById(`${idPrefix}-digit-${targetIdx}`) as HTMLInputElement;
    targetInput?.focus();
  };

  return (
    <div className="otp-square-grid">
      {digits.map((digit, i) => (
        <input
          key={i}
          id={`${idPrefix}-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          className={`otp-square-input ${digit ? "filled" : ""}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Wizard Step: 1 = Head Office & Account, 2 = Branch Details (if branches >= 1) or Review (if 0 branches), 3 = Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    if (type === "success") {
      toast.success(message);
    } else if (type === "error") {
      toast.error(message);
    } else {
      toast.info(message);
    }
  }

  // ---------- STEP 1: Head Office & Account Setup ----------
  const [companyName, setCompanyName] = useState("");
  const [branchCount, setBranchCount] = useState<number>(0);

  const [primaryGst, setPrimaryGst] = useState("");
  const [isPrimaryGstVerified, setIsPrimaryGstVerified] = useState(false);
  const [isVerifyingPrimaryGst, setIsVerifyingPrimaryGst] = useState(false);
  const [gstVerifyMessage, setGstVerifyMessage] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [drugLicenseNo, setDrugLicenseNo] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 60-Second Countdown Timers for OTP
  const [mobileCountdown, setMobileCountdown] = useState<number>(0);
  const [emailCountdown, setEmailCountdown] = useState<number>(0);

  // Terms and Conditions
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // ---------- STEP 2: Dedicated Branch Details ----------
  const [additionalGsts, setAdditionalGsts] = useState<AdditionalGstItem[]>([]);
  const [activeBranchIndex, setActiveBranchIndex] = useState<number>(0);

  // Timer Effect for 60s Countdowns
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const hasBranchCountdown = additionalGsts.some((b) => (b.emailCountdown || 0) > 0);
    if (mobileCountdown > 0 || emailCountdown > 0 || hasBranchCountdown) {
      timer = setInterval(() => {
        setMobileCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setAdditionalGsts((prev) => {
          let changed = false;
          const next = prev.map((b) => {
            if ((b.emailCountdown || 0) > 0) {
              changed = true;
              return { ...b, emailCountdown: (b.emailCountdown || 0) - 1 };
            }
            return b;
          });
          return changed ? next : prev;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mobileCountdown, emailCountdown, additionalGsts]);

  function handleCopyHeadOfficeGst(idx: number) {
    const list = [...additionalGsts];
    if (!list[idx]) return;
    list[idx].gstNo = primaryGst;
    list[idx].state = state;
    list[idx].city = city;
    list[idx].address = address;
    list[idx].pincode = pincode;
    list[idx].verified = isPrimaryGstVerified;
    setAdditionalGsts(list);
    showToast(`Copied Head Office GST & Address to Branch #${idx + 1}`, "info");
  }

  function handleCopyHeadOfficePhone(idx: number) {
    const list = [...additionalGsts];
    if (!list[idx]) return;
    list[idx].mobile = mobile;
    setAdditionalGsts(list);
    showToast(`Copied Head Office Phone (+91 ${mobile}) to Branch #${idx + 1}`, "info");
  }

  // Branch email duplicate check on blur
  async function handleBranchEmailBlur(idx: number) {
    const br = additionalGsts[idx];
    if (!br || !br.email) return;
    const cleanBrEmail = br.email.trim().toLowerCase();
    if (!cleanBrEmail.includes("@")) return;

    // Check against Head Office Email
    const cleanHoEmail = email.trim().toLowerCase();
    if (cleanBrEmail === cleanHoEmail) {
      showToast(`Branch #${idx + 1} email cannot be the same as Head Office email (${cleanHoEmail}).`, "error");
      return;
    }

    // Check against other branches
    for (let i = 0; i < additionalGsts.length; i++) {
      if (i !== idx && (additionalGsts[i].email || "").trim().toLowerCase() === cleanBrEmail) {
        showToast(`Branch #${idx + 1} email is already used for Branch #${i + 1}. Each branch must have a unique email.`, "error");
        return;
      }
    }

    // Check against Database
    try {
      const res = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanBrEmail }),
      });
      const json = await res.json();
      if (json.exists) {
        showToast(`Branch #${idx + 1} email "${cleanBrEmail}" is already registered in the database.`, "error");
      }
    } catch {
      // Ignore
    }
  }

  // Send Email OTP for Branch
  async function handleSendBranchEmailOtp(idx: number) {
    const br = additionalGsts[idx];
    if (!br || br.emailSending || (br.emailCountdown || 0) > 0) return;
    const cleanBrEmail = (br.email || "").trim().toLowerCase();
    if (!cleanBrEmail || !cleanBrEmail.includes("@")) {
      showToast("Please enter a valid email address for this branch", "error");
      return;
    }

    // Check against Head Office Email
    if (cleanBrEmail === email.trim().toLowerCase()) {
      showToast(`Branch #${idx + 1} email cannot be the same as Head Office email`, "error");
      return;
    }

    // Check against other branches
    for (let i = 0; i < additionalGsts.length; i++) {
      if (i !== idx && (additionalGsts[i].email || "").trim().toLowerCase() === cleanBrEmail) {
        showToast(`Branch #${idx + 1} email is already used for Branch #${i + 1}`, "error");
        return;
      }
    }

    const updated = [...additionalGsts];
    updated[idx].emailSending = true;
    setAdditionalGsts(updated);

    try {
      // 1. Check if email exists in system
      const checkRes = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanBrEmail }),
      });
      const checkJson = await checkRes.json();
      if (checkJson.exists) {
        showToast(checkJson.message || `Branch email "${cleanBrEmail}" is already registered in the system.`, "error");
        const list = [...additionalGsts];
        list[idx].emailSending = false;
        setAdditionalGsts(list);
        return;
      }

      // 2. Send OTP
      const res = await fetch(API.SEND_EMAIL_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanBrEmail }),
      });
      const json = await res.json();
      const nextList = [...additionalGsts];
      nextList[idx].emailSending = false;
      if (json.success) {
        nextList[idx].emailOtpSent = true;
        nextList[idx].emailCountdown = 60;
        setAdditionalGsts(nextList);
        showToast(`Verification code sent to Branch #${idx + 1} email (${cleanBrEmail})!`, "success");
      } else {
        setAdditionalGsts(nextList);
        showToast(json.message || "Failed to send branch email OTP", "error");
      }
    } catch {
      const nextList = [...additionalGsts];
      nextList[idx].emailSending = false;
      setAdditionalGsts(nextList);
      showToast("Network error sending OTP to branch email", "error");
    }
  }

  // Verify Email OTP for Branch
  async function handleVerifyBranchEmailOtp(idx: number) {
    const br = additionalGsts[idx];
    if (!br || br.emailVerifying || !br.emailOtp) return;
    const cleanBrEmail = (br.email || "").trim().toLowerCase();

    const updated = [...additionalGsts];
    updated[idx].emailVerifying = true;
    setAdditionalGsts(updated);

    try {
      const res = await fetch(API.VERIFY_EMAIL_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanBrEmail, otp: br.emailOtp.trim() }),
      });
      const json = await res.json();
      const nextList = [...additionalGsts];
      nextList[idx].emailVerifying = false;
      if (json.success) {
        nextList[idx].emailVerified = true;
        nextList[idx].emailOtpSent = false;
        nextList[idx].emailCountdown = 0;
        setAdditionalGsts(nextList);
        showToast(`Branch #${idx + 1} email verified successfully!`, "success");
      } else {
        setAdditionalGsts(nextList);
        showToast(json.message || "Incorrect branch email verification code", "error");
      }
    } catch {
      const nextList = [...additionalGsts];
      nextList[idx].emailVerifying = false;
      setAdditionalGsts(nextList);
      showToast("Branch verification failed. Please try again.", "error");
    }
  }

  // ---------- GENERAL STATE ----------
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Dynamic Step Configuration
  const totalSteps = branchCount > 0 ? 3 : 2;
  const reviewStepNumber = totalSteps;
  const branchStepNumber = 2;

  // Validation States for Enabling Next/Submit Buttons
  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isStep1Valid = Boolean(
    companyName.trim() &&
    name.trim() &&
    primaryGst.trim() &&
    address.trim() &&
    city.trim() &&
    state.trim() &&
    pincode.trim().length === 6 &&
    cleanMobileDigits.length === 10 &&
    mobileVerified &&
    email.trim().includes("@") &&
    emailVerified &&
    password &&
    password.length >= 6 &&
    confirmPassword &&
    password === confirmPassword
  );

  const isStep2Valid =
    branchCount === 0 ||
    (additionalGsts.length >= branchCount &&
      additionalGsts.slice(0, branchCount).every(
        (br) =>
          br.branchName.trim() &&
          (br.mobile || "").replace(/\D/g, "").length === 10 &&
          (br.email || "").trim().includes("@") &&
          (br.email || "").trim().toLowerCase() !== email.trim().toLowerCase() &&
          Boolean(br.emailVerified) &&
          br.password &&
          br.password.length >= 6 &&
          br.confirmPassword &&
          br.password === br.confirmPassword
      ));

  // Handle Branch Count Change
  function handleBranchCountChange(count: number) {
    const validCount = Math.max(0, count);
    setBranchCount(validCount);

    if (validCount === 0) {
      setAdditionalGsts([]);
      return;
    }

    if (validCount > additionalGsts.length) {
      const diff = validCount - additionalGsts.length;
      const newItems: AdditionalGstItem[] = [];
      for (let i = 0; i < diff; i++) {
        const itemIdx = additionalGsts.length + i + 1;
        newItems.push({
          id: `gst_${Date.now()}_${Math.random().toString(36).substr(2, 4)}_${itemIdx}`,
          branchName: "",
          gstNo: "",
          state: "",
          stateCode: "",
          verified: false,
          address: "",
          city: "",
          pincode: "",
          email: "",
          mobile: "",
          password: "",
          confirmPassword: "",
          showPassword: false,
          showConfirm: false,
          emailVerified: false,
          emailOtpSent: false,
          emailOtp: "",
        });
      }
      setAdditionalGsts([...additionalGsts, ...newItems]);
    } else if (validCount < additionalGsts.length) {
      setAdditionalGsts(additionalGsts.slice(0, validCount));
    }
  }

  // ==========================================
  // REAL GST VERIFICATION HANDLER
  // ==========================================
  async function handleVerifyPrimaryGst() {
    const cleanGst = primaryGst.trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      showToast("Please enter a 15-character GSTIN", "error");
      return;
    }

    setIsVerifyingPrimaryGst(true);
    setGstVerifyMessage(null);

    try {
      const res = await fetch(API.VERIFY_GST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: cleanGst }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        setIsPrimaryGstVerified(true);
        setPrimaryGst(d.gstin || cleanGst);

        if (!companyName && (d.businessName || d.legalName || d.tradeName)) {
          setCompanyName(d.businessName || d.legalName || d.tradeName);
        }

        const resolvedState = d.state || d.stateName || "";
        if (resolvedState) setState(resolvedState);
        if (d.city) setCity(d.city);
        if (d.address) setAddress(d.address);
        if (d.pincode) setPincode(d.pincode);

        const displayName = d.businessName || d.legalName || d.tradeName;
        const statusLabel = displayName
          ? `✓ Verified: ${displayName}`
          : resolvedState
          ? `✓ Verified: ${resolvedState}`
          : `✓ GSTIN Verified`;

        setGstVerifyMessage(statusLabel);
        showToast(statusLabel, "success");
      } else {
        setIsPrimaryGstVerified(false);
        const err = json.message || "GST verification failed from API";
        setGstVerifyMessage(err);
        showToast(err, "error");
      }
    } catch {
      setIsPrimaryGstVerified(false);
      setGstVerifyMessage("Unable to verify GSTIN. Please check connection.");
      showToast("Network error connecting to GST service", "error");
    } finally {
      setIsVerifyingPrimaryGst(false);
    }
  }

  // Auto Postal PIN lookup
  async function handlePincodeBlur() {
    if (!pincode || pincode.trim().length !== 6) return;
    try {
      const res = await fetch(API.VERIFY_GST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pincode.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!city && json.data.city) setCity(json.data.city);
        if (!state && json.data.state) setState(json.data.state);
        showToast(`Postal PIN resolved: ${json.data.city || ""}, ${json.data.state || ""}`, "info");
      }
    } catch {
      // Ignore
    }
  }

  // Branch GST verification
  async function handleVerifyBranchGst(index: number) {
    const item = additionalGsts[index];
    const cleanGst = (item.gstNo || "").trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      showToast("Please enter a 15-character GSTIN", "error");
      return;
    }

    const updated = [...additionalGsts];
    updated[index].isVerifying = true;
    setAdditionalGsts(updated);

    try {
      const res = await fetch(API.VERIFY_GST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: cleanGst }),
      });
      const json = await res.json();

      const nextList = [...additionalGsts];
      nextList[index].isVerifying = false;

      if (json.success && json.data) {
        const d = json.data;
        nextList[index].verified = true;
        const branchState = d.state || d.stateName || "";
        nextList[index].state = branchState;
        nextList[index].stateCode = d.stateCode || "";
        nextList[index].city = d.city || "";
        nextList[index].address = d.address || "";
        nextList[index].pincode = d.pincode || "";

        const autoName = d.tradeName || d.legalName || d.businessName || "";
        if (autoName && (!nextList[index].branchName || nextList[index].branchName.startsWith("Branch #"))) {
          nextList[index].branchName = autoName;
        }

        setAdditionalGsts(nextList);
        showToast(branchState ? `✓ Branch GST verified for ${branchState}!` : "✓ Branch GST verified!", "success");
      } else {
        setAdditionalGsts(nextList);
        showToast(json.message || "Failed to verify branch GSTIN", "error");
      }
    } catch {
      const nextList = [...additionalGsts];
      nextList[index].isVerifying = false;
      setAdditionalGsts(nextList);
      showToast("Network error verifying branch GST", "error");
    }
  }

  // Real-time duplicate check
  async function handleEmailBlur() {
    if (!email || emailVerified) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) return;

    try {
      const res = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const json = await res.json();
      if (json.exists) {
        showToast(json.message || "This email address is already registered.", "error");
      }
    } catch {
      // Ignore
    }
  }

  async function handleMobileBlur() {
    if (!mobile || mobileVerified) return;
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) return;

    try {
      const res = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile }),
      });
      const json = await res.json();
      if (json.exists) {
        showToast(json.message || "This mobile number is already registered.", "error");
      }
    } catch {
      // Ignore
    }
  }

  // ==========================================
  // OTP SEND & VERIFY HANDLERS
  // ==========================================
  async function handleSendEmailOtp() {
    if (emailSending) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setEmailSending(true);
    try {
      // 1. Check if email is already registered in the system
      const checkRes = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const checkJson = await checkRes.json();
      if (checkJson.exists) {
        showToast(checkJson.message || "This email address is already registered in the system.", "error");
        return;
      }

      // 2. Send OTP only if email does not exist
      const res = await fetch(API.SEND_EMAIL_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailOtpSent(true);
        setEmailCountdown(60);
        showToast("Verification code sent to your email!", "success");
      } else {
        showToast(json.message || "Failed to send email OTP", "error");
      }
    } catch {
      showToast("Network error sending OTP. Please check connection.", "error");
    } finally {
      setEmailSending(false);
    }
  }

  async function handleVerifyEmailOtp() {
    if (emailVerifying || !emailOtp) return;
    setEmailVerifying(true);
    try {
      const res = await fetch(API.VERIFY_EMAIL_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: emailOtp.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        setEmailCountdown(0);
        showToast("Email verified successfully!", "success");
      } else {
        showToast(json.message || "Incorrect email verification code", "error");
      }
    } catch {
      showToast("Verification failed", "error");
    } finally {
      setEmailVerifying(false);
    }
  }

  async function handleSendMobileOtp() {
    if (mobileSending || mobileCountdown > 0) return;
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    setMobileSending(true);
    try {
      // 1. Check if mobile number is already registered
      const checkRes = await fetch(API.CHECK_EXISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile }),
      });
      const checkJson = await checkRes.json();
      if (checkJson.exists) {
        showToast(checkJson.message || "This mobile number is already registered in the system.", "error");
        return;
      }

      // 2. Send Mobile OTP only if mobile does not exist
      const res = await fetch(API.SEND_MOBILE_OTP , {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile }),
      });
      const json = await res.json();
      if (json.success) {
        setMobileOtpSent(true);
        setMobileCountdown(60);
        showToast(`Verification code sent to WhatsApp (+91 ${cleanMobile})`, "success");
      } else {
        showToast(json.message || "Failed to send WhatsApp OTP", "error");
      }
    } catch {
      showToast("Failed to send WhatsApp OTP", "error");
    } finally {
      setMobileSending(false);
    }
  }

  async function handleVerifyMobileOtp() {
    if (mobileVerifying || !mobileOtp) return;
    setMobileVerifying(true);
    try {
      const res = await fetch(API.VERIFY_MOBILE_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), otp: mobileOtp.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMobileVerified(true);
        setMobileOtpSent(false);
        setMobileCountdown(0);
        showToast("Mobile verified successfully!", "success");
      } else {
        showToast(json.message || "Incorrect verification code", "error");
      }
    } catch {
      showToast("Verification failed", "error");
    } finally {
      setMobileVerifying(false);
    }
  }

  // ==========================================
  // STEP TRANSITIONS & SUBMISSION
  // ==========================================
  function goToNextStep() {
    setErrorBanner(null);

    if (currentStep === 1) {
      // Validate Company Name
      if (!companyName.trim()) {
        const msg = "Company name is required";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }

      // Validate Address, City, State
      if (!address.trim()) {
        const msg = "Full address is required";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }

      // Validate Mobile & Email
      const cleanMobile = mobile.replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        const msg = "Please enter a valid 10-digit phone number";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      if (!mobileVerified) {
        const msg = "Please verify your phone number with the OTP before continuing";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }

      if (!email.trim() || !email.includes("@")) {
        const msg = "Please enter a valid email address";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      if (!emailVerified) {
        const msg = "Please verify your work email with the OTP before continuing";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }

      // Validate Password
      if (!password || password.length < 6) {
        const msg = "Password must be at least 6 characters";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      if (password !== confirmPassword) {
        const msg = "Passwords do not match. Please re-enter.";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }

      // Next Step Routing
      if (branchCount > 0) {
        setCurrentStep(branchStepNumber);
        showToast(`Proceeding to fill details for ${branchCount} branch(es)`, "info");
      } else {
        setCurrentStep(reviewStepNumber);
        showToast("Head office details verified! Please review.", "info");
      }
    } else if (currentStep === branchStepNumber && branchCount > 0) {
      // Validate branches
      for (let i = 0; i < additionalGsts.length; i++) {
        const br = additionalGsts[i];
        if (!br.branchName.trim()) {
          const msg = `Please enter the branch company name for Branch #${i + 1}`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }
        const cleanBrMob = (br.mobile || "").replace(/\D/g, "");
        if (cleanBrMob.length !== 10) {
          const msg = `Please enter a valid 10-digit phone number for Branch #${i + 1}`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }
        const cleanBrEmail = (br.email || "").trim().toLowerCase();
        if (!cleanBrEmail || !cleanBrEmail.includes("@")) {
          const msg = `Please enter a valid email address for Branch #${i + 1}`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }

        // Must not match Head Office email
        const cleanHoEmail = email.trim().toLowerCase();
        if (cleanBrEmail === cleanHoEmail) {
          const msg = `Branch #${i + 1} email cannot be the same as Head Office email (${cleanHoEmail}). Please enter a unique email for this branch.`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }

        // Must not duplicate other branches
        for (let j = 0; j < i; j++) {
          if ((additionalGsts[j].email || "").trim().toLowerCase() === cleanBrEmail) {
            const msg = `Branch #${i + 1} email is already used for Branch #${j + 1}. Each branch must have a unique email.`;
            setErrorBanner(msg);
            showToast(msg, "error");
            setActiveBranchIndex(i);
            return;
          }
        }

        if (!br.emailVerified) {
          const msg = `Please verify the email OTP for Branch #${i + 1} (${br.email})`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }

        if (!br.password || br.password.length < 6) {
          const msg = `Please enter a password of at least 6 characters for Branch #${i + 1}`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }

        if (br.password !== br.confirmPassword) {
          const msg = `Passwords do not match for Branch #${i + 1}. Please re-enter.`;
          setErrorBanner(msg);
          showToast(msg, "error");
          setActiveBranchIndex(i);
          return;
        }
      }
      setCurrentStep(reviewStepNumber);
      showToast("Branch details verified! Please review your submission.", "info");
    }
  }

  // Final Registration Submission
  async function handleCompleteRegistration() {
    if (loading) return;
    setLoading(true);
    setErrorBanner(null);

    try {
      const adminName = name.trim() || companyName.trim();
      const payload = {
        name: adminName,
        email: email.trim().toLowerCase(),
        mobile: mobile.replace(/\D/g, ""),
        password,
        role: "Admin",
        companyName: companyName.trim(),
        gstNo: primaryGst.trim().toUpperCase(),
        drugLicenseNo: drugLicenseNo.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        additionalGstins: branchCount > 0 ? additionalGsts.slice(0, branchCount) : [],
        termsAccepted: true,
      };

      const res = await fetch(API.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        showToast("🎉 Workspace created successfully! Redirecting to login...", "success");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setErrorBanner(json.message || "Registration failed. Please try again.");
        showToast(json.message || "Registration failed", "error");
      }
    } catch {
      setErrorBanner("An unexpected error occurred while setting up your workspace.");
      showToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`clean-signup-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>

      {/* Background Soft Glow Ambience */}
      <div className="bg-glow bg-glow-top" />
      <div className="bg-glow bg-glow-bottom" />

      <div className="clean-signup-container">
   
        <div className="clean-wizard-card">
          {/* Brand Header */}
          <div className="brand-header">
            <div className="brand-mark-box">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="cleanBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffb347" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 2.5 L28 9.5 L28 22.5 L16 29.5 L4 22.5 L4 9.5 Z"
                  stroke="url(#cleanBrandGrad)"
                  strokeWidth="2.2"
                  fill="rgba(249, 115, 22, 0.12)"
                />
                <path
                  d="M13.5 8 H18.5 V13.5 H24 V18.5 H18.5 V24 H13.5 V18.5 H8 V13.5 H13.5 Z"
                  fill="url(#cleanBrandGrad)"
                />
                <circle cx="16" cy="16" r="2.8" fill="#ffffff" />
              </svg>
            </div>
            <div className="brand-text-col">
              <span className="brand-name">MabsolCrm</span>
              <span className="brand-tagline">Enterprise CRM Onboarding</span>
            </div>
          </div>

          <div className="wizard-heading-box">
            <h1>Create Your MabsolCrm Account</h1>
            <p className="wizard-subtext">
              Set up your company, verify GSTINs with live government verification, and launch your MabsolCrm workspace.
            </p>
          </div>

          {/* Dynamic Step Progress Bar */}
          <div className="clean-step-tracker">
            <button
              type="button"
              className={`step-btn ${currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""}`}
              onClick={() => setCurrentStep(1)}
            >
              <span className="step-num">{currentStep > 1 ? "✓" : "1"}</span>
              <span className="step-txt">Head Office &amp; Account</span>
            </button>
            <div className={`step-line ${currentStep > 1 ? "filled" : ""}`} />

            {branchCount > 0 && (
              <>
                <button
                  type="button"
                  className={`step-btn ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}
                  onClick={() => { if (companyName) setCurrentStep(2); }}
                >
                  <span className="step-num">{currentStep > 2 ? "✓" : "2"}</span>
                  <span className="step-txt">Branch Details ({branchCount})</span>
                </button>
                <div className={`step-line ${currentStep > 2 ? "filled" : ""}`} />
              </>
            )}

            <button
              type="button"
              className={`step-btn ${currentStep === reviewStepNumber ? "active" : ""}`}
              onClick={() => { if (emailVerified && mobileVerified) setCurrentStep(reviewStepNumber); }}
            >
              <span className="step-num">{totalSteps}</span>
              <span className="step-txt">Review &amp; Launch</span>
            </button>
          </div>

          {errorBanner && <div className="clean-error-banner">{errorBanner}</div>}

     
          {currentStep === 1 && (
            <div className="clean-form-module">
              {/* Row 1: Company Name & How many main branches select */}
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> Company Name
                  </label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> How many main branches do you want to add?
                  </label>
                  <div className="clean-input-row">
                    <select
                      className="clean-select"
                      value={branchCount}
                      onChange={(e) => handleBranchCountChange(Number(e.target.value))}
                    >
                      <option value={0}>0 Main Branch (Head Office Only)</option>
                      <option value={1}>1 Main Branch</option>
                      <option value={2}>2 Main Branches</option>
                      <option value={3}>3 Main Branches</option>
                      <option value={4}>4 Main Branches</option>
                      <option value={5}>5 Main Branches</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 1.5: Administrator / Owner Full Name */}
              <div className="clean-field">
                <label>
                  <span className="req-star">*</span> Administrator / Owner Full Name
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Enter full name of administrator"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                    required
                  />
                </div>
              </div>

              {/* Row 2: GST Number + Verify Button */}
              <div className="clean-field">
                <div className="clean-label-row">
                  <label>
                    <span className="req-star">*</span> GST Number
                  </label>
                  <span className="field-hint">Auto-fills Address, City, State &amp; PIN</span>
                </div>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="ENTER GSTIN (E.G. 22AAAAA0000A1Z5)"
                    maxLength={15}
                    value={primaryGst}
                    onChange={(e) => {
                      setPrimaryGst(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                      setIsPrimaryGstVerified(false);
                      setGstVerifyMessage(null);
                    }}
                  />
                  <button
                    type="button"
                    className={`clean-inline-btn ${isPrimaryGstVerified ? "is-verified" : ""}`}
                    disabled={isVerifyingPrimaryGst || isPrimaryGstVerified}
                    onClick={handleVerifyPrimaryGst}
                  >
                    {isVerifyingPrimaryGst ? "Verifying…" : isPrimaryGstVerified ? "✓ Verified" : "Verify GST"}
                  </button>
                </div>
                {gstVerifyMessage && (
                  <div className={`gst-verified-pill ${isPrimaryGstVerified ? "is-verified" : "is-error"}`}>
                    {gstVerifyMessage}
                  </div>
                )}
              </div>

              {/* Row 3: Full Address */}
              <div className="clean-field">
                <label>
                  <span className="req-star">*</span> Full Address
                </label>
                <div className="clean-input-row">
                  <input
                    type="text"
                    placeholder="Enter complete address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 4: State & City */}
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> State
                  </label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="Enter State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> City
                  </label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="Enter City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Postal Code & Phone Number with OTP */}
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> Postal Code
                  </label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      onBlur={handlePincodeBlur}
                      required
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <div className="clean-label-row">
                    <label>
                      <span className="req-star">*</span> Phone Number
                    </label>
                    {mobileVerified && <span className="verified-badge">✓ Phone Verified</span>}
                  </div>
                  <div className="clean-input-row">
                    <input
                      type="tel"
                      placeholder="10-digit phone number"
                      maxLength={10}
                      value={mobile}
                      disabled={mobileVerified}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      onBlur={handleMobileBlur}
                      required
                    />
                    <button
                      type="button"
                      className={`clean-inline-btn ${mobileVerified ? "is-verified" : ""}`}
                      disabled={mobileVerified || mobileSending || mobileCountdown > 0 || mobile.replace(/\D/g, "").length !== 10}
                      onClick={handleSendMobileOtp}
                    >
                      {mobileVerified
                        ? "✓ Verified"
                        : mobileSending
                        ? "Sending…"
                        : mobileCountdown > 0
                        ? `Resend in ${mobileCountdown}s`
                        : "Send OTP"}
                    </button>
                  </div>
                </div>
              </div>

              {mobileOtpSent && !mobileVerified && (
                <div className="clean-otp-box">
                  <label>Enter 6-digit WhatsApp OTP sent to +91 {mobile}</label>
                  <div className="otp-compact-row">
                    <SquareOtpInput
                      idPrefix="mobile-otp"
                      value={mobileOtp}
                      onChange={setMobileOtp}
                      disabled={mobileVerifying}
                    />
                    <button
                      type="button"
                      className="clean-otp-confirm-btn"
                      disabled={mobileVerifying || mobileOtp.length < 6}
                      onClick={handleVerifyMobileOtp}
                    >
                      {mobileVerifying ? "Verifying…" : "Confirm OTP ✓"}
                    </button>
                  </div>
                </div>
              )}

              {/* Row 6: Email Address with OTP */}
              <div className="clean-field">
                <div className="clean-label-row">
                  <label>
                    <span className="req-star">*</span> Email Address
                  </label>
                  {emailVerified && <span className="verified-badge">✓ Email Verified</span>}
                </div>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    disabled={emailVerified}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    required
                  />
                  <button
                    type="button"
                    className={`clean-inline-btn ${emailVerified ? "is-verified" : ""}`}
                    disabled={emailVerified || emailSending || emailCountdown > 0 || !email.includes("@")}
                    onClick={handleSendEmailOtp}
                  >
                    {emailVerified
                      ? "✓ Verified"
                      : emailSending
                      ? "Sending…"
                      : emailCountdown > 0
                      ? `Resend in ${emailCountdown}s`
                      : "Send OTP"}
                  </button>
                </div>
              </div>

              {emailOtpSent && !emailVerified && (
                <div className="clean-otp-box">
                  <label>Enter 6-digit verification code sent to {email}</label>
                  <div className="otp-compact-row">
                    <SquareOtpInput
                      idPrefix="email-otp"
                      value={emailOtp}
                      onChange={setEmailOtp}
                      disabled={emailVerifying}
                    />
                    <button
                      type="button"
                      className="clean-otp-confirm-btn"
                      disabled={emailVerifying || emailOtp.length < 6}
                      onClick={handleVerifyEmailOtp}
                    >
                      {emailVerifying ? "Verifying…" : "Confirm OTP ✓"}
                    </button>
                  </div>
                </div>
              )}

              {/* Row 7: Password & Confirm Password */}
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> Password
                  </label>
                  <div className="clean-input-row">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="clean-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>

                <div className="clean-field">
                  <label>
                    <span className="req-star">*</span> Confirm Password
                  </label>
                  <div className="clean-input-row">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="clean-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drug License Optional */}
              <div className="clean-field">
                <label>
                  <span>Drug License Number (Optional)</span>
                  <span className="field-hint">Pharma License 20B/21B</span>
                </label>
                <div className="clean-input-row">
                  <input
                    type="text"
                    placeholder="Enter Drug License Number (Optional)"
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: DEDICATED BRANCH DETAILS (ONLY IF BRANCHES >= 1)
             ======================================================== */}
          {currentStep === branchStepNumber && branchCount > 0 && additionalGsts.length > 0 && (
            <div className="clean-form-module">
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                  🏢 Configure Your {branchCount} Additional Branch {branchCount === 1 ? "Office" : "Offices"}
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0 }}>
                  Select a branch tab below to enter its details. You can copy Head Office details with a single click.
                </p>
              </div>

              {/* Horizontal Branch Tab Navigation Bar */}
              <div className="branch-nav-tabs">
                {additionalGsts.map((br, idx) => {
                  const isBranchComplete = Boolean(
                    br.branchName?.trim() &&
                    (br.mobile || "").replace(/\D/g, "").length === 10 &&
                    br.email?.trim().includes("@") &&
                    br.emailVerified &&
                    br.password &&
                    br.password.length >= 6 &&
                    br.confirmPassword &&
                    br.password === br.confirmPassword
                  );

                  return (
                    <button
                      key={br.id}
                      type="button"
                      className={`branch-nav-tab ${activeBranchIndex === idx ? "active" : ""}`}
                      onClick={() => setActiveBranchIndex(idx)}
                    >
                      <span>🏢 Branch #{idx + 1}</span>
                      {br.branchName && !br.branchName.startsWith("Branch #") && (
                        <span style={{ opacity: 0.85, fontSize: "11.5px" }}>({br.branchName.slice(0, 14)})</span>
                      )}
                      {isBranchComplete ? (
                        <span style={{ color: activeBranchIndex === idx ? "#ffffff" : "#10b981", fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: activeBranchIndex === idx ? "#ffd4b2" : "#f59e0b", fontSize: "11px", fontWeight: 600 }}>
                          (Incomplete)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Branch Card Form */}
              {(() => {
                const idx = activeBranchIndex < additionalGsts.length ? activeBranchIndex : 0;
                const item = additionalGsts[idx] || additionalGsts[0];
                if (!item) return null;

                return (
                  <div key={item.id} className="clean-branch-card">
                    <div className="branch-card-header">
                      <span className="branch-card-title">
                        🏢 Main Branch #{idx + 1} {item.branchName ? `— ${item.branchName}` : ""}
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                        Branch {idx + 1} of {additionalGsts.length}
                      </span>
                    </div>

                    {/* Branch Company Name */}
                    <div className="clean-field">
                      <label>
                        <span className="req-star">*</span> Branch Company / Unit Name
                      </label>
                      <div className="clean-input-row">
                        <input
                          type="text"
                          placeholder="Enter branch company name"
                          value={item.branchName}
                          onChange={(e) => {
                            const list = [...additionalGsts];
                            list[idx].branchName = e.target.value;
                            setAdditionalGsts(list);
                          }}
                          required
                        />
                      </div>
                    </div>

                    {/* Branch GST Number */}
                    <div className="clean-field">
                      <div className="clean-label-row" style={{ marginBottom: "4px" }}>
                        <label>
                          <span>GST Number</span>
                        </label>
                        {primaryGst && (
                          <button
                            type="button"
                            className="same-as-ho-btn"
                            onClick={() => handleCopyHeadOfficeGst(idx)}
                            title="Copy GST & Address from Head Office"
                          >
                            📋 Same GST as Head Office
                          </button>
                        )}
                      </div>
                      <div className="clean-input-row">
                        <input
                          type="text"
                          placeholder="ENTER GSTIN (E.G. 22AAAAA0000A1Z5)"
                          maxLength={15}
                          value={item.gstNo}
                          onChange={(e) => {
                            const list = [...additionalGsts];
                            list[idx].gstNo = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            list[idx].verified = false;
                            setAdditionalGsts(list);
                          }}
                        />
                        <button
                          type="button"
                          className={`clean-inline-btn ${item.verified ? "is-verified" : ""}`}
                          disabled={item.isVerifying || item.verified}
                          onClick={() => handleVerifyBranchGst(idx)}
                        >
                          {item.isVerifying ? "Verifying…" : item.verified ? "✓ Verified" : "Verify GST"}
                        </button>
                      </div>
                    </div>

                    {/* Full Address */}
                    <div className="clean-field">
                      <label>Full Address</label>
                      <div className="clean-input-row">
                        <input
                          type="text"
                          placeholder="Enter complete address"
                          value={item.address}
                          onChange={(e) => {
                            const list = [...additionalGsts];
                            list[idx].address = e.target.value;
                            setAdditionalGsts(list);
                          }}
                        />
                      </div>
                    </div>

                    {/* State & City */}
                    <div className="clean-grid-2">
                      <div className="clean-field">
                        <label>State</label>
                        <div className="clean-input-row">
                          <input
                            type="text"
                            placeholder="Enter State"
                            value={item.state}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].state = e.target.value;
                              setAdditionalGsts(list);
                            }}
                          />
                        </div>
                      </div>

                      <div className="clean-field">
                        <label>City</label>
                        <div className="clean-input-row">
                          <input
                            type="text"
                            placeholder="Enter City"
                            value={item.city}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].city = e.target.value;
                              setAdditionalGsts(list);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Postal Code & Phone Number */}
                    <div className="clean-grid-2">
                      <div className="clean-field">
                        <label>Postal Code</label>
                        <div className="clean-input-row">
                          <input
                            type="text"
                            placeholder="6-digit pincode"
                            maxLength={6}
                            value={item.pincode}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].pincode = e.target.value.replace(/\D/g, "");
                              setAdditionalGsts(list);
                            }}
                          />
                        </div>
                      </div>

                      <div className="clean-field">
                        <div className="clean-label-row" style={{ marginBottom: "4px" }}>
                          <label>
                            <span className="req-star">*</span> Phone Number
                          </label>
                          {mobile && (
                            <button
                              type="button"
                              className="same-as-ho-btn"
                              onClick={() => handleCopyHeadOfficePhone(idx)}
                              title="Copy Phone from Head Office"
                            >
                              📋 Same as Head Office
                            </button>
                          )}
                        </div>
                        <div className="clean-input-row">
                          <input
                            type="tel"
                            placeholder="10-digit phone number"
                            maxLength={10}
                            value={item.mobile}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].mobile = e.target.value.replace(/\D/g, "");
                              setAdditionalGsts(list);
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Branch Email with OTP Verification */}
                    <div className="clean-field">
                      <div className="clean-label-row" style={{ marginBottom: "4px" }}>
                        <label>
                          <span className="req-star">*</span> Branch Email Address
                        </label>
                        {item.emailVerified ? (
                          <span className="verified-badge">✓ Email Verified</span>
                        ) : (
                          <span className="field-hint">Must be unique & verified for this branch</span>
                        )}
                      </div>
                      <div className="clean-input-row">
                        <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        <input
                          type="email"
                          placeholder="Enter branch email address"
                          value={item.email}
                          disabled={item.emailVerified}
                          onChange={(e) => {
                            const list = [...additionalGsts];
                            list[idx].email = e.target.value.toLowerCase().trim();
                            list[idx].emailVerified = false;
                            list[idx].emailOtpSent = false;
                            list[idx].emailOtp = "";
                            setAdditionalGsts(list);
                          }}
                          onBlur={() => handleBranchEmailBlur(idx)}
                          required
                        />
                        <button
                          type="button"
                          className={`clean-inline-btn ${item.emailVerified ? "is-verified" : ""}`}
                          disabled={
                            item.emailVerified ||
                            item.emailSending ||
                            (item.emailCountdown || 0) > 0 ||
                            !item.email ||
                            !item.email.includes("@")
                          }
                          onClick={() => handleSendBranchEmailOtp(idx)}
                        >
                          {item.emailVerified
                            ? "✓ Verified"
                            : item.emailSending
                            ? "Sending…"
                            : (item.emailCountdown || 0) > 0
                            ? `Resend in ${item.emailCountdown}s`
                            : "Send OTP"}
                        </button>
                      </div>
                    </div>

                    {item.emailOtpSent && !item.emailVerified && (
                      <div className="clean-otp-box">
                        <label>Enter 6-digit verification code sent to {item.email}</label>
                        <div className="otp-compact-row">
                          <SquareOtpInput
                            idPrefix={`branch-${idx}-email-otp`}
                            value={item.emailOtp || ""}
                            onChange={(val) => {
                              const list = [...additionalGsts];
                              list[idx].emailOtp = val;
                              setAdditionalGsts(list);
                            }}
                            disabled={item.emailVerifying}
                          />
                          <button
                            type="button"
                            className="clean-otp-confirm-btn"
                            disabled={item.emailVerifying || (item.emailOtp || "").length < 6}
                            onClick={() => handleVerifyBranchEmailOtp(idx)}
                          >
                            {item.emailVerifying ? "Verifying…" : "Confirm OTP ✓"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Branch Account Password & Confirm Password */}
                    <div className="clean-grid-2" style={{ marginTop: "16px" }}>
                      <div className="clean-field">
                        <label>
                          <span className="req-star">*</span> Branch Login Password
                        </label>
                        <div className="clean-input-row">
                          <input
                            type={item.showPassword ? "text" : "password"}
                            placeholder="Create password (min 6 chars)"
                            value={item.password || ""}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].password = e.target.value;
                              setAdditionalGsts(list);
                            }}
                            required
                          />
                          <button
                            type="button"
                            className="clean-inline-btn"
                            style={{ width: "auto", padding: "0 12px", background: "none", color: "#64748b", border: "none" }}
                            onClick={() => {
                              const list = [...additionalGsts];
                              list[idx].showPassword = !list[idx].showPassword;
                              setAdditionalGsts(list);
                            }}
                          >
                            {item.showPassword ? "🙈" : "👁"}
                          </button>
                        </div>
                      </div>

                      <div className="clean-field">
                        <label>
                          <span className="req-star">*</span> Confirm Branch Password
                        </label>
                        <div className="clean-input-row">
                          <input
                            type={item.showConfirm ? "text" : "password"}
                            placeholder="Confirm branch password"
                            value={item.confirmPassword || ""}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].confirmPassword = e.target.value;
                              setAdditionalGsts(list);
                            }}
                            required
                          />
                          <button
                            type="button"
                            className="clean-inline-btn"
                            style={{ width: "auto", padding: "0 12px", background: "none", color: "#64748b", border: "none" }}
                            onClick={() => {
                              const list = [...additionalGsts];
                              list[idx].showConfirm = !list[idx].showConfirm;
                              setAdditionalGsts(list);
                            }}
                          >
                            {item.showConfirm ? "🙈" : "👁"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {item.verified && (
                      <div className="branch-verified-tag">
                        ✓ Verified State: <strong>{item.state}</strong> ({item.city || "Branch Location"}) {item.address ? `• ${item.address}` : ""}
                      </div>
                    )}

                    {/* Branch Pagination Controls */}
                    <div className="branch-pagination-row">
                      <button
                        type="button"
                        className="clean-btn-back"
                        disabled={idx === 0}
                        onClick={() => setActiveBranchIndex((prev) => Math.max(0, prev - 1))}
                      >
                        ← Previous Branch
                      </button>

                      {idx < additionalGsts.length - 1 ? (
                        <button
                          type="button"
                          className="clean-btn-primary"
                          style={{ padding: "8px 18px", fontSize: "13px" }}
                          onClick={() => {
                            const cur = additionalGsts[idx];
                            const curMob = (cur?.mobile || "").replace(/\D/g, "");
                            if (!cur?.branchName?.trim()) {
                              const msg = `Please enter the branch company name for Branch #${idx + 1}`;
                              setErrorBanner(msg);
                              showToast(msg, "error");
                              return;
                            }
                            if (curMob.length !== 10) {
                              const msg = `Please enter a 10-digit phone number for Branch #${idx + 1}`;
                              setErrorBanner(msg);
                              showToast(msg, "error");
                              return;
                            }
                            if (!cur?.emailVerified) {
                              const msg = `Please verify the email OTP for Branch #${idx + 1}`;
                              setErrorBanner(msg);
                              showToast(msg, "error");
                              return;
                            }
                            if (!cur?.password || cur.password.length < 6) {
                              const msg = `Please enter a password of at least 6 characters for Branch #${idx + 1}`;
                              setErrorBanner(msg);
                              showToast(msg, "error");
                              return;
                            }
                            if (cur.password !== cur.confirmPassword) {
                              const msg = `Passwords do not match for Branch #${idx + 1}. Please re-enter.`;
                              setErrorBanner(msg);
                              showToast(msg, "error");
                              return;
                            }
                            setActiveBranchIndex((prev) => Math.min(additionalGsts.length - 1, prev + 1));
                          }}
                        >
                          Next Branch ({idx + 2} of {additionalGsts.length}) →
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="clean-btn-primary"
                          style={{ padding: "8px 18px", fontSize: "13px" }}
                          onClick={goToNextStep}
                        >
                          Proceed to Review →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================
              STEP 3: REVIEW & INSTANT LAUNCH
             ======================================================== */}
          {currentStep === reviewStepNumber && (
            <div className="clean-form-module">
              <div className="clean-review-card">
                <div className="review-item">
                  <span className="rev-label">Head Office Company</span>
                  <span className="rev-val">{companyName || "N/A"}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Primary Head Office GSTIN</span>
                  <span className="rev-val mono-font">
                    {primaryGst || "Unregistered"} {isPrimaryGstVerified ? "✓" : ""}
                  </span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Head Office Address</span>
                  <span className="rev-val">
                    {address ? `${address}, ` : ""}{city ? `${city}, ` : ""}{state || "India"} {pincode ? `(${pincode})` : ""}
                  </span>
                </div>
                {drugLicenseNo && (
                  <div className="review-item">
                    <span className="rev-label">Drug License No.</span>
                    <span className="rev-val mono-font">{drugLicenseNo}</span>
                  </div>
                )}
                <div className="review-item">
                  <span className="rev-label">Main Branches</span>
                  <span className="rev-val">
                    {branchCount > 0
                      ? `${branchCount} Dedicated Branch ${branchCount === 1 ? "Entity" : "Entities"}`
                      : "0 (Single Head Office)"}
                  </span>
                </div>

                {additionalGsts.length > 0 && (
                  <div className="review-branch-box">
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#f97316" }}>
                      Registered Branch Entities:
                    </span>
                    {additionalGsts.map((br, i) => (
                      <div key={br.id} className="review-branch-item">
                        <div className="rev-branch-name">
                          🏢 Branch #{i + 1}: {br.branchName || `Branch #${i + 1}`} {br.verified ? "✓" : ""}
                        </div>
                        <div className="rev-branch-meta">
                          <strong>GSTIN:</strong> {br.gstNo || "Not Specified"} • <strong>Location:</strong> {br.city ? `${br.city}, ` : ""}{br.state || "India"} {br.pincode ? `(${br.pincode})` : ""}
                        </div>
                        {(br.email || br.mobile) && (
                          <div className="rev-branch-meta">
                            {br.email ? `✉ ${br.email}` : ""} {br.mobile ? `• 📞 +91 ${br.mobile}` : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="review-item" style={{ marginTop: "6px", borderTop: "1.5px solid #e2e8f0", paddingTop: "10px" }}>
                  <span className="rev-label">Administrator</span>
                  <span className="rev-val">{name || companyName}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Verified Email Address</span>
                  <span className="rev-val">{email}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Verified Phone Number</span>
                  <span className="rev-val mono-font">+91 {mobile}</span>
                </div>

                {/* Terms and Conditions Checkbox */}
                <div className={`terms-checkbox-box ${termsAccepted ? "checked" : ""}`}>
                  <label className="terms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="terms-checkbox-input"
                    />
                    <span>
                      I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>, and confirm that all company, GST, and branch details are accurate and authorized.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Buttons */}
          <div className="clean-wizard-actions">
            {currentStep > 1 && (
              <button
                type="button"
                className="clean-btn-back"
                onClick={() => setCurrentStep((s) => (s - 1))}
                disabled={loading}
              >
                ← Back
              </button>
            )}

            {currentStep < reviewStepNumber ? (
              <button
                type="button"
                className="clean-btn-primary"
                onClick={goToNextStep}
                disabled={currentStep === 1 && !isStep1Valid}
              >
                {currentStep === 1 && branchCount > 0
                  ? `Next: Branch Details (${branchCount} ${branchCount === 1 ? "Branch" : "Branches"}) →`
                  : "Next: Review & Launch →"}
              </button>
            ) : (
              <button
                type="button"
                className="clean-btn-launch"
                onClick={handleCompleteRegistration}
                disabled={loading || !termsAccepted}
              >
                {loading ? "Creating MabsolCrm Workspace…" : "🚀 Complete Registration & Launch Workspace"}
              </button>
            )}
          </div>

          {/* Card Footer Note */}
          <div className="clean-card-footer">
            <span>Already have an account?</span>
            <Link href="/login" className="clean-login-link">
              Sign In to Your Workspace →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}