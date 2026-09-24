"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import PharmaBackgroundCanvas from "@/components/PharmaBackgroundCanvas";
import CelestialCursor from "@/components/CelestialCursor";
import "./login.css";

const displayFont = Space_Grotesk({
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

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TILT_MAX_DEG = 7.5;

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const rememberMe = false;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("suspended") === "1" || params.get("suspended") === "true") {
        setError(
          "Your account has been deactivated or suspended by the Super Administrator. You cannot access this platform until re-approved by the Super Admin."
        );
      }
    }
  }, []);

  // Typing reactivity for ECG Heartbeat chip
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // 3D tilt for the form card and sync card
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const syncCardRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  type ThemeOption =
    | "auto"
    | "peach"
    | "oceanDeep"
    | "sapphire"
    | "cobalt"
    | "midnight"
    | "glacier"
    | "emerald"
    | "velvet"
    | "ember"
    | "mabsolSpecial"
    | "solidObsidian"
    | "solidNavy"
    | "solidZinc"
    | "solidSnow"
    | "solidSky"
    | "custom";

  const THEME_PRESETS: Array<{
    id: ThemeOption;
    label: string;
    category: "Auto" | "Blue Combos" | "Vibrant Combos" | "Single Color Combos" | "Custom";
    icon: string;
    badgeBg: string;
    accent: string;
    description: string;
  }> = [
    { id: "auto", label: "Auto Adaptive", category: "Auto", icon: "⏱️", badgeBg: "linear-gradient(135deg, #f97316, #38bdf8)", accent: "#38bdf8", description: "Auto-syncs with time of day" },
    
    // 5 High-End Blue Combos
    { id: "oceanDeep", label: "Ocean Deep Navy", category: "Blue Combos", icon: "🌊", badgeBg: "linear-gradient(135deg, #030712, #00f2fe)", accent: "#00f2fe", description: "Rich Deep Ocean Dark & Neon Cyan" },
    { id: "sapphire", label: "Sapphire Cyber", category: "Blue Combos", icon: "💎", badgeBg: "linear-gradient(135deg, #e0f2fe, #0284c7)", accent: "#0284c7", description: "Light Ice Blue & Sapphire Azure" },
    { id: "cobalt", label: "Cobalt Ultra", category: "Blue Combos", icon: "⚡", badgeBg: "linear-gradient(135deg, #090d2a, #3b82f6)", accent: "#3b82f6", description: "Royal Blue & Electric Cobalt" },
    { id: "midnight", label: "Cosmic Midnight", category: "Blue Combos", icon: "🌌", badgeBg: "linear-gradient(135deg, #0f0c29, #818cf8)", accent: "#818cf8", description: "Deep Indigo & Neon Starburst" },
    { id: "glacier", label: "Glacier Aquamarine", category: "Blue Combos", icon: "❄️", badgeBg: "linear-gradient(135deg, #f0fdfa, #06b6d4)", accent: "#06b6d4", description: "Frost Cyan & Aquamarine Sky" },
    
    // 5 Single Solid Color Minimal Themes (No Gradients)
    { id: "solidObsidian", label: "Solid Obsidian", category: "Single Color Combos", icon: "🖤", badgeBg: "#09090b", accent: "#a1a1aa", description: "Pure Solid Dark Minimal Charcoal" },
    { id: "solidNavy", label: "Solid Deep Navy", category: "Single Color Combos", icon: "💙", badgeBg: "#0b193c", accent: "#38bdf8", description: "Pure Solid Deep Navy Blue" },
    { id: "solidZinc", label: "Solid Zinc Gray", category: "Single Color Combos", icon: "🩶", badgeBg: "#18181b", accent: "#3f3f46", description: "Pure Solid Zinc Dark Industrial" },
    { id: "solidSnow", label: "Solid Pure Snow", category: "Single Color Combos", icon: "🤍", badgeBg: "#ffffff", accent: "#0284c7", description: "Pure Crisp Solid Clean White" },
    { id: "solidSky", label: "Solid Sky Soft", category: "Single Color Combos", icon: "🩵", badgeBg: "#e0f2fe", accent: "#0284c7", description: "Pure Soft Solid Sky Blue" },

    // Vibrant Combos
    { id: "peach", label: "Sunset Peach", category: "Vibrant Combos", icon: "🍑", badgeBg: "linear-gradient(135deg, #f97316, #fb923c)", accent: "#f97316", description: "Warm Sunset Apricot & Amber (Default)" },
    { id: "emerald", label: "Bio Emerald", category: "Vibrant Combos", icon: "🍃", badgeBg: "linear-gradient(135deg, #ecfdf5, #10b981)", accent: "#10b981", description: "Fresh Mint & Bio Emerald" },
    { id: "velvet", label: "Neon Velvet", category: "Vibrant Combos", icon: "🍇", badgeBg: "linear-gradient(135deg, #180b2c, #a855f7)", accent: "#a855f7", description: "Cyber Plum & Neon Violet Glow" },
    { id: "mabsolSpecial", label: "Mabsol Special", category: "Vibrant Combos", icon: "⭐", badgeBg: "linear-gradient(135deg, #343872, #fb8c00)", accent: "#fb8c00", description: "Signature Mabsol (#343872 & #fb8c00)" },
    { id: "ember", label: "Crimson Ember", category: "Vibrant Combos", icon: "🔥", badgeBg: "linear-gradient(135deg, #1c0a0e, #f43f5e)", accent: "#f43f5e", description: "Rose Flame & Charcoal Ember" },
    
    // Custom Theme
    { id: "custom", label: "Custom Colors", category: "Custom", icon: "🎨", badgeBg: "linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)", accent: "#ec4899", description: "Section-by-Section Color Pickers" },
  ];

  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>("mabsolSpecial");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Detailed Section-by-Section Custom Color States
  const [customBodyBg, setCustomBodyBg] = useState("#0b193c");
  const [customFormCardBg, setCustomFormCardBg] = useState("#0f172a");
  const [customSyncCardBg, setCustomSyncCardBg] = useState("#1e293b");
  const [customButtonBg, setCustomButtonBg] = useState("#0284c7");
  const [customAccent, setCustomAccent] = useState("#38bdf8");
  const [customBadgeBg, setCustomBadgeBg] = useState("#0f172a");
  const [customTextColor, setCustomTextColor] = useState("#ffffff");
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Animations toggle — default OFF (false)
  const [animationsEnabled, setAnimationsEnabled] = useState(false);

  // Load saved theme preference on client mount (prevents SSR Hydration Mismatch)
  useEffect(() => {
    setMounted(true);
    try {
      const localTheme = localStorage.getItem("mabsol_saved_theme") as ThemeOption | null;
      // If no theme saved OR old default "auto" was saved → force mabsolSpecial
      if (localTheme && localTheme !== "auto") {
        setSelectedTheme(localTheme);
        if (localTheme === "custom") setShowCustomDrawer(true);
      } else {
        // No saved theme or old "auto" — force mabsolSpecial as new default
        setSelectedTheme("mabsolSpecial");
        localStorage.setItem("mabsol_saved_theme", "mabsolSpecial");
      }

      const savedCustom = localStorage.getItem("mabsol_saved_custom_colors");
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (parsed.bodyBg) setCustomBodyBg(parsed.bodyBg);
        if (parsed.formCardBg) setCustomFormCardBg(parsed.formCardBg);
        if (parsed.syncCardBg) setCustomSyncCardBg(parsed.syncCardBg);
        if (parsed.buttonBg) setCustomButtonBg(parsed.buttonBg);
        if (parsed.accent) setCustomAccent(parsed.accent);
        if (parsed.badgeBg) setCustomBadgeBg(parsed.badgeBg);
        if (parsed.textColor) setCustomTextColor(parsed.textColor);
      }
    } catch (e) {}

    // Sync with MongoDB API in background
    fetch("/api/theme")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.selectedTheme) {
          // If MongoDB also has old "auto", override with mabsolSpecial
          const dbTheme = data.selectedTheme === "auto" ? "mabsolSpecial" : data.selectedTheme;
          setSelectedTheme(dbTheme);
          if (dbTheme === "custom") setShowCustomDrawer(true);
          if (data.customColors) {
            const cc = data.customColors;
            if (cc.bodyBg) setCustomBodyBg(cc.bodyBg);
            if (cc.formCardBg) setCustomFormCardBg(cc.formCardBg);
            if (cc.syncCardBg) setCustomSyncCardBg(cc.syncCardBg);
            if (cc.buttonBg) setCustomButtonBg(cc.buttonBg);
            if (cc.accent) setCustomAccent(cc.accent);
            if (cc.badgeBg) setCustomBadgeBg(cc.badgeBg);
            if (cc.textColor) setCustomTextColor(cc.textColor);
          }
        }
      })
      .catch((err) => console.log("MongoDB theme sync fallback", err));
  }, []);


  // Save selected theme to LocalStorage & MongoDB on change
  const selectThemeAndSave = (newTheme: ThemeOption) => {
    setSelectedTheme(newTheme);
    if (newTheme === "custom") {
      setShowCustomDrawer(true);
    } else {
      setShowCustomDrawer(false);
    }
    try {
      localStorage.setItem("mabsol_saved_theme", newTheme);
      localStorage.setItem(
        "mabsol_saved_custom_colors",
        JSON.stringify({
          bodyBg: customBodyBg,
          formCardBg: customFormCardBg,
          syncCardBg: customSyncCardBg,
          buttonBg: customButtonBg,
          accent: customAccent,
          badgeBg: customBadgeBg,
          textColor: customTextColor,
        })
      );
    } catch (e) {}

    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedTheme: newTheme,
        customColors: {
          bodyBg: customBodyBg,
          formCardBg: customFormCardBg,
          syncCardBg: customSyncCardBg,
          buttonBg: customButtonBg,
          accent: customAccent,
          badgeBg: customBadgeBg,
          textColor: customTextColor,
        },
      }),
    }).catch((err) => console.log("MongoDB theme save fallback", err));
  };

  const sanitizeHex = (val: string, fallback: string) => {
    if (!val) return fallback;
    const clean = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
    return fallback;
  };

  const CUSTOM_COLOR_FIELDS = [
    { id: "bodyBg", label: "Page Body", icon: "🏞️", val: customBodyBg, set: setCustomBodyBg, def: "#0b193c" },
    { id: "formCardBg", label: "Form Card", icon: "🎴", val: customFormCardBg, set: setCustomFormCardBg, def: "#0f172a" },
    { id: "syncCardBg", label: "Sync Card", icon: "📊", val: customSyncCardBg, set: setCustomSyncCardBg, def: "#1e293b" },
    { id: "buttonBg", label: "Action Button", icon: "🔘", val: customButtonBg, set: setCustomButtonBg, def: "#0284c7" },
    { id: "accent", label: "Accent Glow", icon: "✨", val: customAccent, set: setCustomAccent, def: "#38bdf8" },
    { id: "badgeBg", label: "Badges BG", icon: "🏷️", val: customBadgeBg, set: setCustomBadgeBg, def: "#0f172a" },
    { id: "textColor", label: "Text Color", icon: "✍️", val: customTextColor, set: setCustomTextColor, def: "#ffffff" },
  ];

  const applyQuickPalette = (p: { body: string; form: string; sync: string; btn: string; accent: string; badge: string; text: string }) => {
    setCustomBodyBg(p.body);
    setCustomFormCardBg(p.form);
    setCustomSyncCardBg(p.sync);
    setCustomButtonBg(p.btn);
    setCustomAccent(p.accent);
    setCustomBadgeBg(p.badge);
    setCustomTextColor(p.text);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetCustomColors = () => {
    setCustomBodyBg("#0b193c");
    setCustomFormCardBg("#0f172a");
    setCustomSyncCardBg("#1e293b");
    setCustomButtonBg("#0284c7");
    setCustomAccent("#38bdf8");
    setCustomBadgeBg("#0f172a");
    setCustomTextColor("#ffffff");
  };

  const [detectedPhase, setDetectedPhase] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Live real-time ERP event stream ticker items
  const LIVE_EVENTS = [
    { id: 1, title: "Invoice #INV-2291 synced", sub: "Batch #8491-X • 2s ago", amount: "+₹1,84,500", icon: "invoice" },
    { id: 2, title: "Cold-Chain Batch #CC-904", sub: "Warehouse Cold Store 4.2°C • 6s ago", amount: "QC Passed", icon: "qc" },
    { id: 3, title: "Territory Mumbai-East", sub: "Target 104.8% reached • 14s ago", amount: "+₹3,42,000", icon: "target" },
    { id: 4, title: "Doctor Rx Stream #DR-771", sub: "Apollo Hospitals Fleet • 28s ago", amount: "Dispatched", icon: "dispatch" },
  ];
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [isToastPaused, setIsToastPaused] = useState(false);

  useEffect(() => {
    if (isToastPaused) return;
    const interval = setInterval(() => {
      setCurrentEventIdx((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [isToastPaused, LIVE_EVENTS.length]);

  // Rich Sales Velocity data with labels and revenue tooltip info
  const barsData = [
    { label: "Q1", height: 32, rev: "₹34.2L" },
    { label: "Q2", height: 54, rev: "₹58.6L" },
    { label: "Q3", height: 42, rev: "₹46.1L" },
    { label: "Q4", height: 85, rev: "₹92.4L" },
    { label: "Q5", height: 62, rev: "₹68.0L" },
    { label: "Q6", height: 74, rev: "₹81.5L" },
  ];

  const emailIsValid = EMAIL_RE.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailIsValid;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setDetectedPhase("morning");
    } else if (hour >= 12 && hour < 17) {
      setDetectedPhase("afternoon");
    } else if (hour >= 17 && hour < 20) {
      setDetectedPhase("evening");
    } else {
      setDetectedPhase("night");
    }
  }, []);

  // Determine active theme based on auto detection or manual selection
  const effectiveTheme = selectedTheme === "auto"
    ? (detectedPhase === "morning" ? "peach" : detectedPhase === "afternoon" ? "sapphire" : detectedPhase === "evening" ? "emerald" : "oceanDeep")
    : selectedTheme;

  const activePreset = THEME_PRESETS.find((t) => t.id === effectiveTheme) || THEME_PRESETS[0];

  // Accent color map for dynamic cursor and particle canvas synchronization
  const activeAccent = effectiveTheme === "custom" ? customAccent : activePreset.accent;

  // CSS theme class name
  const themeClassName = effectiveTheme === "custom" ? "login-theme-custom" : `login-theme-${effectiveTheme}`;

  const getCelestialData = () => {
    switch (detectedPhase) {
      case "morning":
        return {
          greeting: "Good Morning",
          icon: "🌅",
          tag: "Dawn Shift Active",
          subtitle: "Sign in to access dawn pipeline, territory dispatch & real-time inventory.",
        };
      case "afternoon":
        return {
          greeting: "Good Afternoon",
          icon: "☀️",
          tag: "Midday Surge",
          subtitle: "Peak-hour throughput active. Real-time billing & ERP sync running.",
        };
      case "evening":
        return {
          greeting: "Good Evening",
          icon: "🌇",
          tag: "Twilight Settlement",
          subtitle: "End-of-day sales reconciliation, territory summaries & warehouse ledger ready.",
        };
      case "night":
      default:
        return {
          greeting: "Good Night",
          icon: "🌙",
          tag: "Night Operations",
          subtitle: "Overnight automated batch sync & encrypted ledger backups active.",
        };
    }
  };

  const celestial = getCelestialData();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Trigger typing pulse for ECG heartbeat
  const triggerTypingPulse = () => {
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1200);
  };

  const globalMouseRaf = useRef<number | null>(null);
  const cardTiltRaf = useRef<number | null>(null);
  const syncCardRaf = useRef<number | null>(null);

  // Global mousemove for 3D parallax on corner badges
  function handleGlobalMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!pageContainerRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (globalMouseRaf.current) return;
    globalMouseRaf.current = requestAnimationFrame(() => {
      globalMouseRaf.current = null;
      if (pageContainerRef.current) {
        const px = (clientX / window.innerWidth - 0.5) * -18;
        const py = (clientY / window.innerHeight - 0.5) * -18;
        pageContainerRef.current.style.setProperty("--badge-px", `${px.toFixed(1)}px`);
        pageContainerRef.current.style.setProperty("--badge-py", `${py.toFixed(1)}px`);
      }
    });
  }

  // Specular reflection & 3D tilt on the form card
  function handleCardTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = formCardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (cardTiltRaf.current) return;
    cardTiltRaf.current = requestAnimationFrame(() => {
      cardTiltRaf.current = null;
      if (formCardRef.current) {
        const percentX = (x / rect.width - 0.5) * 2;
        const percentY = (y / rect.height - 0.5) * 2;
        const rotateY = percentX * TILT_MAX_DEG;
        const rotateX = -percentY * TILT_MAX_DEG;

        formCardRef.current.style.transition = "none";
        formCardRef.current.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
        formCardRef.current.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
        formCardRef.current.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
        formCardRef.current.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
      }
    });
  }

  function handleCardTiltLeave() {
    if (cardTiltRaf.current) {
      cancelAnimationFrame(cardTiltRaf.current);
      cardTiltRaf.current = null;
    }
    const card = formCardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mouse-x", "50%");
    card.style.setProperty("--mouse-y", "50%");
  }

  // Specular reflection on the right sync card
  function handleSyncCardMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = syncCardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (syncCardRaf.current) return;
    syncCardRaf.current = requestAnimationFrame(() => {
      syncCardRaf.current = null;
      if (syncCardRef.current) {
        syncCardRef.current.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
        syncCardRef.current.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
      }
    });
  }

  function handleSyncCardLeave() {
    if (syncCardRaf.current) {
      cancelAnimationFrame(syncCardRaf.current);
      syncCardRaf.current = null;
    }
    const card = syncCardRef.current;
    if (!card) return;
    card.style.setProperty("--mouse-x", "50%");
    card.style.setProperty("--mouse-y", "50%");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setEmailTouched(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, rememberMe }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.directLogin) {
          if (data.user) {
            try {
              localStorage.setItem("mabsol_user", JSON.stringify(data.user));
            } catch {}
          }
          const destination = data.redirectUrl || (data.user?.isSuperAdmin || data.user?.roleType === "SuperAdmin" ? "/dashboard/super-admin" : "/dashboard");
          router.push(destination);
          return;
        }
        setStep("otp");
        setOtp(Array(OTP_LENGTH).fill(""));
        setResendTimer(RESEND_SECONDS);
        setTimeout(() => otpInputsRef.current[0]?.focus(), 50);
      } else {
        setError(data.message || "Couldn't sign you in. Check your details and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setResendTimer(RESEND_SECONDS);
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpInputsRef.current[0]?.focus(), 50);
      } else {
        setOtpError(data.message || "Couldn't resend the code. Try again.");
      }
    } catch {
      setOtpError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    triggerTypingPulse();
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(null);

    if (digit && index < OTP_LENGTH - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    triggerTypingPulse();
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    triggerTypingPulse();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    const lastFilled = Math.min(pasted.length, OTP_LENGTH) - 1;
    otpInputsRef.current[Math.max(lastFilled, 0)]?.focus();
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (verifyingOtp) return;

    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.user?.isSuperAdmin || data.user?.roleType === "SuperAdmin") {
          router.push("/dashboard/super-admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setOtpError(data.message || "That code didn't work. Please try again.");
      }
    } catch {
      setOtpError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  return (
    <div
      suppressHydrationWarning
      ref={pageContainerRef}
      onMouseMove={handleGlobalMouseMove}
      className={`login-page ${themeClassName} ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
      style={
        effectiveTheme === "custom"
          ? ({
              "--custom-body-bg": customBodyBg,
              "--custom-form-card-bg": customFormCardBg,
              "--custom-sync-card-bg": customSyncCardBg,
              "--custom-btn-bg": customButtonBg,
              "--custom-accent": customAccent,
              "--custom-badge-bg": customBadgeBg,
              "--custom-text-color": customTextColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* High Performance Dynamic Celestial Custom Cursor Pointer — only when animations ON */}
      {animationsEnabled && <CelestialCursor theme={effectiveTheme} accentColor={activeAccent} />}

      {/* High Performance Interactive Molecular Background Canvas — only when animations ON */}
      {animationsEnabled && <PharmaBackgroundCanvas accentColor={activeAccent} />}

      {/* Animations Toggle Button */}
      <button
        type="button"
        suppressHydrationWarning
        className={`anim-toggle-btn${animationsEnabled ? " anim-on" : " anim-off"}`}
        onClick={() => setAnimationsEnabled((v) => !v)}
        title={animationsEnabled ? "Turn off background & cursor animations" : "Turn on background & cursor animations"}
        aria-label={animationsEnabled ? "Animations ON — click to disable" : "Animations OFF — click to enable"}
      >
        <span className="anim-toggle-icon">{animationsEnabled ? "✨" : "🚫"}</span>
        <span className="anim-toggle-label">{animationsEnabled ? "Animations ON" : "Animations OFF"}</span>
      </button>

      {/* Floating Interactive Celestial Color Theme Selector & Customizer Capsule */}
      <div className="celestial-preview-capsule-wrapper" ref={dropdownRef}>
        <div className="celestial-preview-capsule">
          <button
            suppressHydrationWarning
            type="button"
            className="theme-selector-trigger"
            onClick={() => setDropdownOpen((v) => !v)}
            title="Select from 10 Premium Color Themes"
          >
            <span className="live-dot" style={{ backgroundColor: activeAccent }} />
            <span className="active-theme-icon">{activePreset.icon}</span>
            <span className="active-theme-name">{activePreset.label}</span>
            <span className="caret-icon">{dropdownOpen ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Theme Dropdown Menu */}
        {dropdownOpen && (
          <div className="theme-selector-dropdown">
            <div className="dropdown-header">
              <span>🎨 CHOOSE FROM PREMIUM COLOR THEMES</span>
            </div>

            {/* Single Color Minimal Themes (No Gradients) */}
            <div className="dropdown-category">
              <span className="cat-title">⬛ SINGLE SOLID COLOR MINIMAL (NO GRADIENT)</span>
              <div className="theme-grid">
                {THEME_PRESETS.filter((t) => t.category === "Single Color Combos").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-card-btn ${selectedTheme === t.id ? "active" : ""}`}
                    onClick={() => {
                      selectThemeAndSave(t.id);
                      setDropdownOpen(false);
                      setShowCustomDrawer(false);
                    }}
                  >
                    <span className="swatch-badge" style={{ background: t.badgeBg }} />
                    <span className="theme-btn-icon">{t.icon}</span>
                    <div className="theme-btn-info">
                      <span className="theme-btn-title">{t.label}</span>
                      <span className="theme-btn-desc">{t.description}</span>
                    </div>
                    {selectedTheme === t.id && <span className="active-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Blue Combos */}
            <div className="dropdown-category">
              <span className="cat-title">🔵 BLUE COMBOS</span>
              <div className="theme-grid">
                {THEME_PRESETS.filter((t) => t.category === "Blue Combos").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-card-btn ${selectedTheme === t.id ? "active" : ""}`}
                    onClick={() => {
                      selectThemeAndSave(t.id);
                      setDropdownOpen(false);
                      setShowCustomDrawer(false);
                    }}
                  >
                    <span className="swatch-badge" style={{ background: t.badgeBg }} />
                    <span className="theme-btn-icon">{t.icon}</span>
                    <div className="theme-btn-info">
                      <span className="theme-btn-title">{t.label}</span>
                      <span className="theme-btn-desc">{t.description}</span>
                    </div>
                    {selectedTheme === t.id && <span className="active-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibrant Combos */}
            <div className="dropdown-category">
              <span className="cat-title">✨ VIBRANT COMBOS</span>
              <div className="theme-grid">
                {THEME_PRESETS.filter((t) => t.category === "Vibrant Combos").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-card-btn ${selectedTheme === t.id ? "active" : ""}`}
                    onClick={() => {
                      selectThemeAndSave(t.id);
                      setDropdownOpen(false);
                      setShowCustomDrawer(false);
                    }}
                  >
                    <span className="swatch-badge" style={{ background: t.badgeBg }} />
                    <span className="theme-btn-icon">{t.icon}</span>
                    <div className="theme-btn-info">
                      <span className="theme-btn-title">{t.label}</span>
                      <span className="theme-btn-desc">{t.description}</span>
                    </div>
                    {selectedTheme === t.id && <span className="active-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto & Custom */}
            <div className="dropdown-category">
              <span className="cat-title">⏱️ AUTO &amp; 🎨 CUSTOM</span>
              <div className="theme-grid">
                {THEME_PRESETS.filter((t) => t.category === "Auto" || t.category === "Custom").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-card-btn ${selectedTheme === t.id ? "active" : ""}`}
                    onClick={() => {
                      selectThemeAndSave(t.id);
                      setDropdownOpen(false);
                      if (t.id === "custom") setShowCustomDrawer(true);
                      else setShowCustomDrawer(false);
                    }}
                  >
                    <span className="swatch-badge" style={{ background: t.badgeBg }} />
                    <span className="theme-btn-icon">{t.icon}</span>
                    <div className="theme-btn-info">
                      <span className="theme-btn-title">{t.label}</span>
                      <span className="theme-btn-desc">{t.description}</span>
                    </div>
                    {selectedTheme === t.id && <span className="active-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Floating Glass Custom Section Color Studio */}
        {showCustomDrawer && (
          <div className="custom-theme-studio-modal">
            <div className="studio-header">
              <div className="studio-title">
                <span className="studio-icon">🎨</span>
                <span>Custom Section Color Studio</span>
              </div>
              <div className="studio-actions">
                <button
                  type="button"
                  className="studio-btn reset"
                  onClick={resetCustomColors}
                  title="Reset to default colors"
                >
                  🔄 Reset
                </button>
                <button
                  type="button"
                  className="studio-btn close"
                  onClick={() => setShowCustomDrawer(false)}
                  title="Close customizer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick 1-Click Custom Combo Chips */}
            <div className="quick-combos-row">
              <span className="quick-label">⚡ Quick Combos:</span>
              <button
                type="button"
                className="combo-chip"
                onClick={() =>
                  applyQuickPalette({
                    body: "#0b193c",
                    form: "#0f172a",
                    sync: "#1e293b",
                    btn: "#0284c7",
                    accent: "#38bdf8",
                    badge: "#0f172a",
                    text: "#ffffff",
                  })
                }
              >
                🔵 Cyber Blue
              </button>
              <button
                type="button"
                className="combo-chip"
                onClick={() =>
                  applyQuickPalette({
                    body: "#1a0f00",
                    form: "#2a1a00",
                    sync: "#3a2400",
                    btn: "#d97706",
                    accent: "#fde047",
                    badge: "#2a1a00",
                    text: "#ffffff",
                  })
                }
              >
                👑 Royal Amber
              </button>
              <button
                type="button"
                className="combo-chip"
                onClick={() =>
                  applyQuickPalette({
                    body: "#14052b",
                    form: "#210a42",
                    sync: "#2e0e5c",
                    btn: "#9333ea",
                    accent: "#c084fc",
                    badge: "#210a42",
                    text: "#ffffff",
                  })
                }
              >
                🍇 Neon Violet
              </button>
              <button
                type="button"
                className="combo-chip"
                onClick={() =>
                  applyQuickPalette({
                    body: "#022c22",
                    form: "#064e3b",
                    sync: "#0f766e",
                    btn: "#10b981",
                    accent: "#34d399",
                    badge: "#064e3b",
                    text: "#ffffff",
                  })
                }
              >
                🍃 Emerald Mint
              </button>
            </div>

            {/* Section Color Cards Grid */}
            <div className="studio-color-grid">
              {CUSTOM_COLOR_FIELDS.map((field) => (
                <div key={field.id} className="studio-field-card">
                  <div className="field-info">
                    <span className="field-icon">{field.icon}</span>
                    <span className="field-label">{field.label}</span>
                  </div>
                  <div className="field-inputs">
                    <input
                      type="color"
                      className="color-circle-picker"
                      value={sanitizeHex(field.val, field.def)}
                      onChange={(e) => field.set(e.target.value)}
                      title={`Pick ${field.label} color`}
                    />
                    <input
                      type="text"
                      className="hex-code-input"
                      value={field.val}
                      onChange={(e) => field.set(e.target.value)}
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Aurora Gradient Mesh Orbs */}
      <div className="mesh" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      {/* Floating Holographic Ambient Badges with 3D Mouse Parallax */}
      <div className="floating-badge badge-tl" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 3c6 4 10 4 16 0M4 21c6-4 10-4 16 0" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 6v12M12 4v16M17 6v12" stroke="#00f2fe" strokeWidth="1.8" strokeDasharray="2 3" strokeLinecap="round" />
            <circle cx="7" cy="6" r="2" fill="#00f2fe" />
            <circle cx="17" cy="18" r="2" fill="#00f2fe" />
          </svg>
        </div>
        <div className="badge-content">
          <div className="badge-title-row">
            <span className="badge-radar-dot cyan-radar" />
            <span className="badge-title">Biotech Pipeline</span>
          </div>
          <span className="badge-value">Active &amp; Encrypted</span>
        </div>
      </div>

      <div className="floating-badge badge-tr" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" stroke="#10b981" strokeWidth="1.8" fill="rgba(16, 185, 129, 0.15)" />
            <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="badge-content">
          <div className="badge-title-row">
            <span className="badge-radar-dot emerald-radar" />
            <span className="badge-title">Pharma Compliance</span>
          </div>
          <span className="badge-value">21 CFR Part 11</span>
        </div>
      </div>

      <div className="floating-badge badge-bl" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#ff7700" strokeWidth="2" strokeLinejoin="round" fill="rgba(255, 119, 0, 0.25)" />
          </svg>
        </div>
        <div className="badge-content">
          <div className="badge-title-row">
            <span className="badge-radar-dot amber-radar" />
            <span className="badge-title">Sync Latency</span>
          </div>
          <span className="badge-value">&lt; 38ms Real-Time</span>
        </div>
      </div>

      <div className="floating-badge badge-br" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="12" width="4" height="9" rx="1.5" fill="#818cf8" />
            <rect x="10" y="7" width="4" height="14" rx="1.5" fill="#a78bfa" />
            <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#c084fc" />
            <path d="M4 10l7-5 6-2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="badge-content">
          <div className="badge-title-row">
            <span className="badge-radar-dot purple-radar" />
            <span className="badge-title">Batch Intelligence</span>
          </div>
          <span className="badge-value">Live ERP Stream</span>
        </div>
      </div>

      <div className="stage">
        {/* FORM CARD — 3D tilt + VisionOS Dynamic Specular Light Sheen */}
        <div
          className="glass-card form-card"
          ref={formCardRef}
          onMouseMove={handleCardTiltMove}
          onMouseLeave={handleCardTiltLeave}
        >
          {/* Card Border Ambient Glow Highlight */}
          <div className="card-border-glow" aria-hidden="true" />

          <div className="brand-header-row">
            <div className="brand-row">
              <span className="brand-mark">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffb347" />
                      <stop offset="50%" stopColor="#ff7700" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                    <filter id="brandGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff7700" floodOpacity="0.8" />
                    </filter>
                  </defs>
                  {/* 3D Hexagon Emblem */}
                  <path
                    d="M16 2.5 L28 9.5 L28 22.5 L16 29.5 L4 22.5 L4 9.5 Z"
                    stroke="url(#brandGrad)"
                    strokeWidth="2.2"
                    fill="rgba(255, 119, 0, 0.2)"
                    filter="url(#brandGlow)"
                  />
                  {/* Interlocking Medical Cross */}
                  <path
                    d="M13.5 8 H18.5 V13.5 H24 V18.5 H18.5 V24 H13.5 V18.5 H8 V13.5 H13.5 Z"
                    fill="url(#brandGrad)"
                  />
                  {/* Specular Glint Center */}
                  <circle cx="16" cy="16" r="2.8" fill="#ffffff" />
                  <circle cx="14.8" cy="14.8" r="1" fill="#ffffff" />
                </svg>
              </span>
              <span className="brand-name">MabsolCrm</span>
            </div>

            {/* Enterprise Security Chip */}
            <div className="security-status-chip">
              <span className="live-shield-dot" />
              <span className="security-text">256-Bit SSL • 21 CFR Part 11</span>
            </div>
          </div>

          {step === "credentials" ? (
            <>
              <h1>
                {celestial.greeting} <span className="greeting-icon">{celestial.icon}</span>
              </h1>
              <p className="lede">{celestial.subtitle}</p>

              <form onSubmit={handleLogin} noValidate>
                {error && (
                  <div className="error-banner" role="alert">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="email">Work Email</label>
                  <div className={`input-row ${showEmailError ? "input-row-error" : ""}`}>
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@pharmacy.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        triggerTypingPulse();
                      }}
                      onBlur={() => setEmailTouched(true)}
                      required
                      disabled={loading}
                      aria-invalid={showEmailError}
                    />
                  </div>
                  {showEmailError && (
                    <p className="field-error">Enter a valid email, e.g. name@example.com</p>
                  )}
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <label htmlFor="password">Password</label>
                    {capsLockOn && (
                      <span className="capslock-hint" role="status">
                        <span className="caps-icon">⇪</span> Caps Lock ON
                      </span>
                    )}
                  </div>
                  <div className="input-row">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="15.5" r="1.5" fill="currentColor" />
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        triggerTypingPulse();
                      }}
                      onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                      onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="toggle-visibility"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M6.6 6.7C4.5 8.1 3 10 2 12c1.8 3.6 5.5 7 10 7 1.7 0 3.3-.4 4.7-1.2M9.9 4.2A10.8 10.8 0 0112 4c4.5 0 8.2 3.4 10 7-.5 1-1.2 2.1-2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12c1.8-3.6 5.5-7 10-7s8.2 3.4 10 7c-1.8 3.6-5.5 7-10 7s-8.2-3.4-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" aria-hidden="true" /> : null}
                  <span>{loading ? "Authenticating Session…" : "Sign In to MabsolCrm"}</span>
                  {!loading && (
                    <svg className="btn-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <p className="switch-line">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="link-strong"
                    onClick={() => router.push("/register")}
                  >
                    Create an account →
                  </button>
                </p>
              </form>
            </>
          ) : (
            <>
              <h1>Verify your email</h1>
              <p className="lede">
                We sent a {OTP_LENGTH}-digit code to <strong>{email}</strong>. Enter it below to continue.
              </p>

              <form onSubmit={handleVerifyOtp} noValidate>
                {otpError && (
                  <div className="error-banner" role="alert">
                    <span className="error-icon">⚠️</span>
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="otp-0">Verification code</label>
                  <div className="otp-row" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        ref={(el) => {
                          otpInputsRef.current[i] = el;
                        }}
                        style={{ "--i": i } as React.CSSProperties}
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        disabled={verifyingOtp}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={verifyingOtp}>
                  {verifyingOtp ? <span className="spinner" aria-hidden="true" /> : null}
                  <span>{verifyingOtp ? "Verifying Token…" : "Verify & Continue"}</span>
                  {!verifyingOtp && (
                    <svg className="btn-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <p className="switch-line">
                  Didn't get the code?{" "}
                  <button
                    type="button"
                    className="link-strong"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || resending}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : resending ? "Sending…" : "Resend code"}
                  </button>
                </p>

                <p className="switch-line">
                  <button
                    type="button"
                    className="link-strong back-link"
                    onClick={() => {
                      setStep("credentials");
                      setOtpError(null);
                    }}
                  >
                    ← Back to login
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        {/* BEAM — Glowing Quantum Conduit Pipe with Multi-Packet Laser Stream */}
        <div className="beam-wrap" aria-hidden="true">
          <div className="beam-labels">
            <span>ERP</span>
            <span>CRM</span>
          </div>

          <div className={`beam-capsule ${isTyping ? "typing-active" : ""}`}>
            <span className="beam-track" />
            <span className="beam-node node-left" />
            
            {/* Continuous Multi-Packet Fiber-Optic Laser Stream */}
            <span className="beam-particle particle-1" />
            <span className="beam-particle particle-2" />
            <span className="beam-particle particle-3" />
            
            <span className="beam-node node-right" />

            {/* Central Heartbeat ECG Chip with Typing Reactivity */}
            <span className={`heartbeat-chip ${isTyping ? "typing-active" : ""}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f2fe" />
                    <stop offset="50%" stopColor="#ff9f43" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="ecgGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ff7700" floodOpacity="0.95" />
                  </filter>
                </defs>
                <path
                  d="M2 12h4l2-7 4 14 3-9 2 4h5"
                  stroke="url(#ecgGrad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#ecgGlow)"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* SYNC CARD — Highly detailed SaaS ERP-CRM live sync metrics + Specular Light Sheen */}
        <div
          className="glass-card sync-card"
          ref={syncCardRef}
          onMouseMove={handleSyncCardMove}
          onMouseLeave={handleSyncCardLeave}
          aria-hidden="true"
        >
          {/* Card Border Ambient Glow Highlight */}
          <div className="card-border-glow" aria-hidden="true" />

          <div className="sync-top">
            <div className="sync-dots">
              <span className="dot-red" /><span className="dot-yellow" /><span className="dot-green" />
            </div>
            <span className="live-pill">
              <span className="live-dot" />
              Live Sync Active
            </span>
          </div>

          <div className="sync-eyebrow-row">
            <span className="eyebrow">MISSION CONTROL • LIVE ERP</span>
          </div>
          <h2>Synced instantly</h2>

          <div className="sync-tiles">
            {/* Sales Velocity Tile with Organic Breathing Bars & Interactive Micro-Tooltips */}
            <div className="sync-tile velocity-tile">
              <div className="tile-header">
                <div>
                  <p className="tile-label">Sales Velocity</p>
                  <span className="tile-sublabel">Throughput / Qtr</span>
                </div>
                <span className="growth-pill">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  +24.8%
                </span>
              </div>
              <div className="mini-bars-wrapper">
                <div className="mini-bars">
                  {barsData.map((bar, i) => (
                    <div key={i} className="bar-col" data-tooltip={`${bar.label}: ${bar.rev}`}>
                      <span
                        className="bar-fill"
                        style={{ height: `${bar.height}%`, animationDelay: `${i * 65}ms` }}
                      >
                        <span className="bar-glow-cap" />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bars-baseline" />
              </div>
            </div>

            {/* Auto-Refresh Tile */}
            <div className="sync-tile refresh-tile">
              <div className="tile-header">
                <div>
                  <p className="tile-label">Refresh Cycle</p>
                  <span className="tile-sublabel">Continuous</span>
                </div>
                <span className="sync-status-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="spin-sync">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="metric-row">
                <p className="sync-value">60s</p>
                <div className="latency-capsule">
                  <span className="latency-dot" />
                  <span className="latency-badge">&lt; 38ms</span>
                </div>
              </div>
              <div className="sync-progress-track">
                <div className="sync-progress-bar" />
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Event Stream Ticker Notification */}
          <div
            className="sync-toast"
            onMouseEnter={() => setIsToastPaused(true)}
            onMouseLeave={() => setIsToastPaused(false)}
            title="Hover to pause live stream"
          >
            <div className="toast-icon-wrap">
              {LIVE_EVENTS[currentEventIdx].icon === "invoice" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {LIVE_EVENTS[currentEventIdx].icon === "qc" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {LIVE_EVENTS[currentEventIdx].icon === "target" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fb8c00" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="#fb8c00" strokeWidth="2" />
                  <circle cx="12" cy="12" r="1" fill="#fb8c00" />
                </svg>
              )}
              {LIVE_EVENTS[currentEventIdx].icon === "dispatch" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="1" y="3" width="14" height="13" rx="2" stroke="#818cf8" strokeWidth="2" />
                  <path d="M15 8h4l3 3v5h-7V8z" stroke="#818cf8" strokeWidth="2" />
                  <circle cx="5.5" cy="18.5" r="2" fill="#818cf8" />
                  <circle cx="17.5" cy="18.5" r="2" fill="#818cf8" />
                </svg>
              )}
            </div>
            <div className="toast-content" key={LIVE_EVENTS[currentEventIdx].id}>
              <p className="notif-title">{LIVE_EVENTS[currentEventIdx].title}</p>
              <p className="notif-sub">{LIVE_EVENTS[currentEventIdx].sub}</p>
            </div>
            <span className="amount-badge">{LIVE_EVENTS[currentEventIdx].amount}</span>
            <div className="toast-ticker-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}