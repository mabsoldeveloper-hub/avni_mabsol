"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import KPICards from "@/components/KPICards";
import DashboardCharts, { PurchaseDashboardCharts, CreditDashboardCharts } from "@/components/dashboard/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";
import LiquidMeters from "@/components/LiquidMeters";
import DashboardLiveClock from "@/components/dashboard/DashboardLiveClock";
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaSyncAlt,
    FaChartPie,
    FaChartLine,
    FaBoxes,
    FaWallet,
    FaTruck,
    FaCheckCircle,
    FaClock,
    FaPalette,
    FaCheck,
    FaUndoAlt,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import { SIDEBAR_PRESET_THEMES, SidebarThemeId } from "@/components/Sidebar";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

type TabType = "overview" | "sales" | "inventory" | "credit" | "purchase";

type BannerThemeId =
    | "auto"
    // Blue Shaders Collection
    | "royal_blue"
    | "ice_azure"
    | "cobalt_tech"
    | "ocean_sapphire"
    | "cyan_aqua"
    | "steel_blue"
    | "deep_navy"
    | "electric_navy"
    // Other Palettes
    | "amber"
    | "emerald"
    | "violet"
    | "rose"
    | "midnight"
    | "custom";

interface PresetTheme {
    id: BannerThemeId;
    name: string;
    category: "blue" | "other";
    color: string;
    gradient: string;
    borderColor: string;
    hoverShadow: string;
    textColor: string;
    subtextColor: string;
    tagColor: string;
    orb1: string;
    orb2: string;
    isDark?: boolean;
}

const PRESET_THEMES: PresetTheme[] = [
    {
        id: "auto",
        name: "Auto (Time)",
        category: "other",
        color: "linear-gradient(135deg, #f59e0b, #ec4899, #6366f1)",
        gradient: "",
        borderColor: "",
        hoverShadow: "",
        textColor: "",
        subtextColor: "",
        tagColor: "",
        orb1: "",
        orb2: "",
    },
    // ==================== BLUE SHADERS COLLECTION ====================
    {
        id: "royal_blue",
        name: "Royal Navy",
        category: "blue",
        color: "#2563eb",
        gradient: "from-[#ffffff]/98 via-[#eff6ff]/95 to-[#dbeafe]/90",
        borderColor: "border-blue-300/80 hover:border-blue-400/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(37,99,235,0.18)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-blue-50/90 text-blue-900 border-blue-200/80",
        orb1: "bg-blue-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-indigo-300/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "ice_azure",
        name: "Ice Azure",
        category: "blue",
        color: "#0284c7",
        gradient: "from-[#ffffff]/98 via-[#f0f9ff]/95 to-[#e0f2fe]/90",
        borderColor: "border-sky-300/80 hover:border-sky-400/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.16)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-sky-50/90 text-sky-900 border-sky-200/80",
        orb1: "bg-sky-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-cyan-200/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "cobalt_tech",
        name: "Cobalt Tech",
        category: "blue",
        color: "#4f46e5",
        gradient: "from-[#ffffff]/98 via-[#eef2ff]/95 to-[#e0e7ff]/90",
        borderColor: "border-indigo-300/80 hover:border-indigo-400/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(79,70,229,0.18)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-indigo-50/90 text-indigo-900 border-indigo-200/80",
        orb1: "bg-indigo-500/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-blue-400/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "ocean_sapphire",
        name: "Sapphire",
        category: "blue",
        color: "#0ea5e9",
        gradient: "from-[#ffffff]/98 via-[#f0f7ff]/95 to-[#e0f0fe]/90",
        borderColor: "border-sky-200/80 hover:border-sky-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.15)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-sky-50/90 text-sky-900 border-sky-200/80",
        orb1: "bg-sky-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-blue-300/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "cyan_aqua",
        name: "Cyber Aqua",
        category: "blue",
        color: "#06b6d4",
        gradient: "from-[#ffffff]/98 via-[#ecfeff]/95 to-[#cffafe]/90",
        borderColor: "border-cyan-300/70 hover:border-cyan-400/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(6,182,212,0.16)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-cyan-50/90 text-cyan-900 border-cyan-200/80",
        orb1: "bg-cyan-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-blue-300/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "steel_blue",
        name: "Steel Blue",
        category: "blue",
        color: "#64748b",
        gradient: "from-[#ffffff]/98 via-[#f1f5f9]/95 to-[#e2e8f0]/90",
        borderColor: "border-slate-300/80 hover:border-blue-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(100,116,139,0.16)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-slate-100/90 text-slate-800 border-slate-300/80",
        orb1: "bg-blue-300/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-slate-400/12 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "deep_navy",
        name: "Navy Dark",
        category: "blue",
        color: "#001f54",
        gradient: "from-[#0a1128]/98 via-[#001f54]/95 to-[#034078]/92",
        borderColor: "border-sky-500/30 hover:border-sky-400/50",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(2,132,199,0.3)]",
        textColor: "text-white",
        subtextColor: "text-sky-200/80",
        tagColor: "bg-sky-950/70 text-sky-300 border-sky-500/40",
        orb1: "bg-blue-500/20 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-cyan-500/15 group-hover:scale-115 transition-all duration-700",
        isDark: true,
    },
    {
        id: "electric_navy",
        name: "Electric Dark",
        category: "blue",
        color: "#1e3a8a",
        gradient: "from-[#0b0f19]/98 via-[#111827]/95 to-[#1e1b4b]/92",
        borderColor: "border-blue-500/40 hover:border-blue-400/60",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(59,130,246,0.3)]",
        textColor: "text-white",
        subtextColor: "text-blue-200/80",
        tagColor: "bg-blue-950/70 text-blue-300 border-blue-500/40",
        orb1: "bg-blue-500/25 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-indigo-500/20 group-hover:scale-115 transition-all duration-700",
        isDark: true,
    },
    // ==================== OTHER EXECUTIVE PALETTES ====================
    {
        id: "amber",
        name: "Amber Gold",
        category: "other",
        color: "#f59e0b",
        gradient: "from-[#ffffff]/98 via-[#fffbf6]/95 to-[#fff5eb]/90",
        borderColor: "border-amber-200/70 hover:border-amber-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(245,158,11,0.15)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-amber-50/90 text-amber-900 dark:text-amber-300 border-amber-200/80",
        orb1: "bg-amber-300/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-orange-200/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "emerald",
        name: "Emerald Mint",
        category: "other",
        color: "#10b981",
        gradient: "from-[#ffffff]/98 via-[#f0fdf4]/95 to-[#dcfce7]/90",
        borderColor: "border-emerald-200/80 hover:border-emerald-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.15)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-emerald-50/90 text-emerald-900 border-emerald-200/80",
        orb1: "bg-emerald-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-teal-300/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "violet",
        name: "Royal Violet",
        category: "other",
        color: "#8b5cf6",
        gradient: "from-[#ffffff]/98 via-[#faf5ff]/95 to-[#f3e8ff]/90",
        borderColor: "border-purple-200/80 hover:border-purple-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(168,85,247,0.15)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-purple-50/90 text-purple-900 border-purple-200/80",
        orb1: "bg-purple-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-indigo-300/15 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "rose",
        name: "Sunset Rose",
        category: "other",
        color: "#f43f5e",
        gradient: "from-[#ffffff]/98 via-[#fff1f2]/95 to-[#ffe4e6]/90",
        borderColor: "border-rose-200/80 hover:border-rose-300/90",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(244,63,94,0.15)]",
        textColor: "text-slate-900",
        subtextColor: "text-slate-600",
        tagColor: "bg-rose-50/90 text-rose-900 border-rose-200/80",
        orb1: "bg-rose-400/15 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-orange-300/12 group-hover:scale-115 transition-all duration-700",
    },
    {
        id: "midnight",
        name: "Midnight Dark",
        category: "other",
        color: "#1e293b",
        gradient: "from-[#0f172a]/98 via-[#1e293b]/95 to-[#0f172a]/92",
        borderColor: "border-indigo-500/30 hover:border-indigo-400/50",
        hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.25)]",
        textColor: "text-white",
        subtextColor: "text-indigo-200/80",
        tagColor: "bg-indigo-950/60 text-indigo-300 border-indigo-500/30",
        orb1: "bg-indigo-500/20 group-hover:scale-115 transition-all duration-700",
        orb2: "bg-cyan-500/12 group-hover:scale-115 transition-all duration-700",
        isDark: true,
    },
];

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to check if a hex color is dark
function isColorDark(hex: string) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const num = parseInt(c, 16);
    if (isNaN(num)) return false;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 130;
}

export default function DashboardContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
    const hasSpokenRef = useRef(false);

    // Banner color theme customization state
    const [bannerTheme, setBannerTheme] = useState<BannerThemeId>("auto");
    const [customBannerColor, setCustomBannerColor] = useState<string>("#3b82f6");
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const [customizerTab, setCustomizerTab] = useState<"banner" | "sidebar">("banner");
    const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeId>("default");
    const [sidebarCustomHex, setSidebarCustomHex] = useState<string>("#001f54");
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedVoice = localStorage.getItem("dashboard_voice_enabled");
            if (savedVoice !== null) {
                setVoiceEnabled(savedVoice !== "false");
            }
            const savedTheme = localStorage.getItem("dashboard_banner_theme");
            if (savedTheme) {
                setBannerTheme(savedTheme as BannerThemeId);
            }
            const savedCustomColor = localStorage.getItem("dashboard_banner_custom_hex");
            if (savedCustomColor) {
                setCustomBannerColor(savedCustomColor);
            }
            const savedSidebarTheme = localStorage.getItem("sidebar_theme");
            if (savedSidebarTheme) {
                setSidebarTheme(savedSidebarTheme as SidebarThemeId);
            }
            const savedSidebarCustom = localStorage.getItem("sidebar_custom_hex");
            if (savedSidebarCustom) {
                setSidebarCustomHex(savedSidebarCustom);
            }
        }
    }, []);

    // Sync with sidebar changes from other components
    useEffect(() => {
        const handleSidebarChanged = () => {
            if (typeof window !== "undefined") {
                const savedTheme = localStorage.getItem("sidebar_theme");
                if (savedTheme) setSidebarTheme(savedTheme as SidebarThemeId);
                const savedCustom = localStorage.getItem("sidebar_custom_hex");
                if (savedCustom) setSidebarCustomHex(savedCustom);
            }
        };
        window.addEventListener("sidebar-theme-changed", handleSidebarChanged);
        return () => window.removeEventListener("sidebar-theme-changed", handleSidebarChanged);
    }, []);

    // Outside click listener to close color picker popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setShowColorPicker(false);
            }
        };
        if (showColorPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showColorPicker]);

    const handleSelectTheme = (themeId: BannerThemeId) => {
        setBannerTheme(themeId);
        if (typeof window !== "undefined") {
            localStorage.setItem("dashboard_banner_theme", themeId);
        }
    };

    const handleCustomColorChange = (hex: string) => {
        setCustomBannerColor(hex);
        setBannerTheme("custom");
        if (typeof window !== "undefined") {
            localStorage.setItem("dashboard_banner_theme", "custom");
            localStorage.setItem("dashboard_banner_custom_hex", hex);
        }
    };

    const handleSelectSidebarTheme = (themeId: SidebarThemeId) => {
        setSidebarTheme(themeId);
        if (typeof window !== "undefined") {
            localStorage.setItem("sidebar_theme", themeId);
            window.dispatchEvent(new Event("sidebar-theme-changed"));
        }
    };

    const handleSidebarCustomColorChange = (hex: string) => {
        setSidebarCustomHex(hex);
        setSidebarTheme("custom");
        if (typeof window !== "undefined") {
            localStorage.setItem("sidebar_theme", "custom");
            localStorage.setItem("sidebar_custom_hex", hex);
            window.dispatchEvent(new Event("sidebar-theme-changed"));
        }
    };

    const toggleVoice = () => {
        setVoiceEnabled((prev) => {
            const next = !prev;
            if (typeof window !== "undefined") {
                localStorage.setItem("dashboard_voice_enabled", String(next));
                if (!next && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                } else if (next && "speechSynthesis" in window) {
                    // Instantly speak greeting when user turns voice ON
                    setTimeout(() => speakGreeting(), 150);
                }
            }
            return next;
        });
    };

    const speakGreeting = useCallback((customText?: string) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        const isMuted = localStorage.getItem("dashboard_voice_enabled") === "false";
        if (isMuted) return;

        window.speechSynthesis.cancel();
        window.speechSynthesis.resume(); // Fix Chrome paused audio queue bug

        const hour = new Date().getHours();
        let greetingPhrase = "";
        if (hour >= 5 && hour < 12) {
            greetingPhrase = "Good Morning, Sir";
        } else if (hour >= 12 && hour < 17) {
            greetingPhrase = "Good Afternoon, Sir";
        } else if (hour >= 17 && hour < 20) {
            greetingPhrase = "Good Evening, Sir";
        } else {
            greetingPhrase = "Good Night, Sir";
        }

        const utterance = new SpeechSynthesisUtterance(customText || greetingPhrase);
        utterance.lang = "en-IN";

        // Prioritize Indian English / Indian Accent voices (en-IN / hi-IN)
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(
            (v) =>
                v.lang === "en-IN" ||
                v.lang === "en_IN" ||
                v.lang.toLowerCase().includes("in") ||
                v.name.toLowerCase().includes("india") ||
                v.name.toLowerCase().includes("ravi") ||
                v.name.toLowerCase().includes("heera") ||
                v.name.toLowerCase().includes("neerja") ||
                v.name.toLowerCase().includes("swara") ||
                v.name.toLowerCase().includes("google english (india)")
        ) || voices.find((v) => v.lang.startsWith("en"));

        if (indianVoice) {
            utterance.voice = indianVoice;
        }

        utterance.rate = 0.95; // Crisp, warm executive pace
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        return () => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: json.isMrRestricted,
                        territories: json.territories || [],
                        allowedCompanyCodes: json.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    const loadDashboard = useCallback(async () => {
        if (!data) {
            setLoading(true);
        }
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) {
                params.set("companyId", selectedCompany._id);
            }
            if (selectedFY) {
                if (selectedFY.isAll) {
                    params.set("fyId", "ALL");
                } else if (selectedFY._id) {
                    params.set("fyId", selectedFY._id);
                    if (selectedFY.startDate && selectedFY.endDate) {
                        const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                        const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                        params.set("startDate", s);
                        params.set("endDate", e);
                    }
                }
            }

            const queryString = params.toString();
            const url = queryString ? `/api/dashboard?${queryString}` : "/api/dashboard";

            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Dashboard API returned status ${res.status}`);
                return;
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCompany?._id, selectedFY?._id, data]);

    const handleManualRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [selectedCompany?._id, selectedFY?._id]);

    // Dynamic Celestial Time Info according to local hour
    const getCelestialTimeInfo = () => {
        const hour = new Date().getHours();
        let activePhase: "morning" | "afternoon" | "evening" | "night";

        if (hour >= 5 && hour < 12) activePhase = "morning";
        else if (hour >= 12 && hour < 17) activePhase = "afternoon";
        else if (hour >= 17 && hour < 20) activePhase = "evening";
        else activePhase = "night";

        // Base content info for each time of day
        let content = {
            phase: activePhase,
            greeting: "Good Afternoon",
            tag: "☀️ MIDDAY SURGE • ACTIVE STREAM",
            tagColor: "bg-orange-50/80 text-orange-900 dark:text-orange-300 border-orange-200/60 hover:bg-orange-100/60",
            subtitle: "Peak-hour transaction throughput, real-time invoices & territory velocity",
            gradient: "from-[#ffffff]/98 via-[#fff9f4]/95 to-[#fff3e8]/90",
            borderColor: "border-orange-200/60 hover:border-orange-300/80",
            hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(249,115,22,0.12)]",
            textColor: "text-slate-900",
            subtextColor: "text-slate-600",
            orb1: "bg-orange-300/12 group-hover:scale-115 transition-all duration-700",
            orb2: "bg-amber-200/10 group-hover:scale-115 transition-all duration-700",
            isDark: false,
            customStyles: undefined as any,
            icon: (
                <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 via-amber-500 to-orange-500 shadow-[0_2px_8px_rgba(249,115,22,0.35)] group-hover:scale-110 transition-all duration-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-[spin_16s_linear_infinite] group-hover:animate-[spin_5s_linear_infinite]">
                        <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
                        <path d="M12 1v3m0 16v3M1 12h3m16 0h3m-4.22-6.78l-2.12 2.12m-9.32 9.32l-2.12 2.12m0-13.56l2.12 2.12m9.32 9.32l2.12 2.12" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                </span>
            ),
        };

        if (activePhase === "morning") {
            content = {
                phase: "morning",
                greeting: "Good Morning",
                tag: "🌅 DAWN ENERGY • PEAK FOCUS",
                tagColor: "bg-amber-50/80 text-amber-900 dark:text-amber-300 border-amber-200/60 hover:bg-amber-100/60",
                subtitle: "Morning dispatch pipeline, sales velocity & batch distribution health",
                gradient: "from-[#ffffff]/98 via-[#fffbf6]/95 to-[#fff5eb]/90",
                borderColor: "border-amber-200/60 hover:border-amber-300/80",
                hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(245,158,11,0.12)]",
                textColor: "text-slate-900",
                subtextColor: "text-slate-600",
                orb1: "bg-amber-300/12 group-hover:scale-115 transition-all duration-700",
                orb2: "bg-rose-200/10 group-hover:scale-115 transition-all duration-700",
                isDark: false,
                customStyles: undefined,
                icon: (
                    <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 shadow-[0_2px_8px_rgba(251,191,36,0.35)] group-hover:scale-110 transition-all duration-300">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:rotate-45 transition-transform duration-500">
                            <circle cx="12" cy="12" r="5" fill="#ffffff" />
                            <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.17-6.83l-1.42 1.42m-9.82 9.82l-1.42 1.42m0-12.66l1.42 1.42m9.82 9.82l1.42 1.42" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                    </span>
                ),
            };
        } else if (activePhase === "afternoon") {
            // Already initialized as afternoon
        } else if (activePhase === "evening") {
            content = {
                phase: "evening",
                greeting: "Good Evening",
                tag: "🌇 TWILIGHT WRAP • SETTLEMENT MODE",
                tagColor: "bg-rose-50/80 text-rose-900 dark:text-rose-300 border-rose-200/60 hover:bg-rose-100/60",
                subtitle: "End-of-day sales reconciliation, territory summaries & warehouse ledger",
                gradient: "from-[#ffffff]/98 via-[#fff7f5]/95 to-[#fef2f0]/90",
                borderColor: "border-rose-200/60 hover:border-rose-300/80",
                hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(244,63,94,0.12)]",
                textColor: "text-slate-900",
                subtextColor: "text-slate-600",
                orb1: "bg-rose-300/12 group-hover:scale-115 transition-all duration-700",
                orb2: "bg-indigo-200/10 group-hover:scale-115 transition-all duration-700",
                isDark: false,
                customStyles: undefined,
                icon: (
                    <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 via-orange-500 to-indigo-500 shadow-[0_2px_8px_rgba(244,63,94,0.35)] group-hover:scale-110 transition-all duration-300">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-y-[-2px] transition-transform duration-300">
                            <path d="M12 4v4m0 10v2M4.93 6.93l2.83 2.83M3 16h18M6 19h12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="12" cy="13" r="3.5" fill="#ffffff" />
                        </svg>
                    </span>
                ),
            };
        } else {
            content = {
                phase: "night",
                greeting: "Good Night",
                tag: "🌙 NIGHT OPS • AUTOMATED SYNC",
                tagColor: "bg-indigo-950/60 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60",
                subtitle: "Overnight automated batch sync, encrypted ERP backups & ledger locks",
                gradient: "from-[#0f172a]/98 via-[#1e293b]/95 to-[#0f172a]/92",
                borderColor: "border-indigo-500/30 hover:border-indigo-400/50",
                hoverShadow: "hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.25)]",
                textColor: "text-white",
                subtextColor: "text-indigo-200/80",
                orb1: "bg-indigo-500/20 group-hover:scale-115 transition-all duration-700",
                orb2: "bg-cyan-500/12 group-hover:scale-115 transition-all duration-700",
                isDark: true,
                customStyles: undefined,
                icon: (
                    <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 shadow-[0_2px_8px_rgba(99,102,241,0.35)] group-hover:scale-110 transition-all duration-300">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:rotate-[-12deg] transition-transform duration-300">
                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#ffffff" />
                            <circle cx="17" cy="6" r="1" fill="#ffffff" className="animate-ping" />
                            <circle cx="19" cy="9" r="0.8" fill="#ffffff" />
                        </svg>
                    </span>
                ),
            };
        }

        // Apply Custom Theme Override if user selected a preset or custom color
        if (bannerTheme === "custom") {
            const dark = isColorDark(customBannerColor);
            const bgGrad = dark
                ? `linear-gradient(135deg, ${hexToRgba(customBannerColor, 0.95)} 0%, #0f172a 100%)`
                : `linear-gradient(135deg, #ffffff 0%, ${hexToRgba(customBannerColor, 0.08)} 50%, ${hexToRgba(customBannerColor, 0.18)} 100%)`;

            return {
                ...content,
                gradient: "",
                borderColor: "",
                hoverShadow: "",
                textColor: dark ? "text-white" : "text-slate-900",
                subtextColor: dark ? "text-slate-300" : "text-slate-600",
                tagColor: dark ? "bg-white/10 text-white border-white/20" : "",
                orb1: "",
                orb2: "",
                isDark: dark,
                customStyles: {
                    container: {
                        background: bgGrad,
                        border: `1.5px solid ${hexToRgba(customBannerColor, dark ? 0.4 : 0.35)}`,
                        boxShadow: `0 16px 40px -12px ${hexToRgba(customBannerColor, dark ? 0.35 : 0.2)}`,
                    },
                    tag: dark
                        ? undefined
                        : {
                              background: hexToRgba(customBannerColor, 0.12),
                              color: customBannerColor,
                              borderColor: hexToRgba(customBannerColor, 0.3),
                          },
                    orb1: { background: hexToRgba(customBannerColor, dark ? 0.25 : 0.18) },
                    orb2: { background: hexToRgba(customBannerColor, dark ? 0.18 : 0.12) },
                },
            };
        } else if (bannerTheme !== "auto") {
            const matched = PRESET_THEMES.find((t) => t.id === bannerTheme);
            if (matched) {
                return {
                    ...content,
                    gradient: matched.gradient,
                    borderColor: matched.borderColor,
                    hoverShadow: matched.hoverShadow,
                    textColor: matched.textColor,
                    subtextColor: matched.subtextColor,
                    tagColor: matched.tagColor,
                    orb1: matched.orb1,
                    orb2: matched.orb2,
                    isDark: !!matched.isDark,
                    customStyles: undefined,
                };
            }
        }

        return content;
    };

    const celestial = getCelestialTimeInfo();

    const tabs = [
        { id: "overview", label: "Executive Overview", icon: FaChartPie, badge: "Live" },
        { id: "sales", label: "Sales & Revenue", icon: FaChartLine, badge: "Sales" },
        { id: "inventory", label: "Inventory & Expiry", icon: FaBoxes, badge: "Stock" },
        { id: "credit", label: "Credit & Receivables", icon: FaWallet, badge: "Dues" },
        { id: "purchase", label: "Purchase & Vendors", icon: FaTruck, badge: "Inward" },
    ];

    const activeIndicatorColor =
        bannerTheme === "custom"
            ? customBannerColor
            : bannerTheme === "auto"
            ? "#f59e0b"
            : PRESET_THEMES.find((t) => t.id === bannerTheme)?.color || "#3b82f6";

    return (
        <div className="flex flex-col gap-5 min-h-screen">
            {/* ==================== DYNAMIC CELESTIAL EXECUTIVE BANNER WITH COLOR CUSTOMIZATION ==================== */}
            <div
                style={celestial.customStyles?.container}
                className={`group relative isolate rounded-2xl sm:rounded-3xl ${
                    celestial.gradient ? `bg-gradient-to-br ${celestial.gradient}` : ""
                } p-4 sm:p-5 md:p-6 ${celestial.textColor} ${
                    celestial.borderColor ? `border-[1.5px] ${celestial.borderColor}` : ""
                } ${
                    celestial.hoverShadow ? `shadow-[0_12px_36px_-12px_rgba(249,115,22,0.08),0_4px_12px_rgba(0,0,0,0.02)] ${celestial.hoverShadow}` : ""
                } backdrop-blur-3xl transition-all duration-500 z-30`}
            >
                {/* Inner Overflow-Hidden Layer for Glow Orbs & Specular Highlight */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
                    <div
                        style={celestial.customStyles?.orb1}
                        className={`absolute -bottom-20 -right-20 w-56 sm:w-72 h-56 sm:h-72 rounded-full ${celestial.orb1} blur-3xl`}
                    />
                    <div
                        style={celestial.customStyles?.orb2}
                        className={`absolute -top-20 -left-20 w-56 sm:w-72 h-56 sm:h-72 rounded-full ${celestial.orb2} blur-3xl`}
                    />
                </div>

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 z-10">
                    <div>
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
                            <span
                                style={celestial.customStyles?.tag}
                                className={`text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-widest px-2.5 sm:px-3 py-0.5 rounded-full border shadow-xs backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-default ${celestial.tagColor}`}
                            >
                                {celestial.tag}
                            </span>
                            {selectedCompany?.companyName && (
                                <span className={`text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full border shadow-xs transition-all duration-200 hover:scale-105 cursor-default ${celestial.isDark ? 'bg-indigo-900/60 text-sky-300 border-indigo-400/30' : 'bg-sky-500/10 text-sky-700 border-sky-400/30'}`}>
                                    <FaBuilding size={9} className={celestial.isDark ? 'text-sky-400' : 'text-sky-600'} /> {selectedCompany.companyName}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight font-sans flex items-center gap-2.5 sm:gap-3">
                            {celestial.icon}
                            <span>{celestial.greeting}</span>
                        </h2>
                        <p className={`text-[11px] sm:text-xs font-medium mt-1 leading-snug sm:leading-normal ${celestial.subtextColor}`}>
                            {celestial.subtitle}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        {/* Banner Color & Theme Customizer Dropdown Popover */}
                        <div className="relative" ref={colorPickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowColorPicker((prev) => !prev)}
                                title="Customize banner color and theme"
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl backdrop-blur-xl border text-[11px] sm:text-xs shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
                                    showColorPicker
                                        ? "bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-indigo-500/40"
                                        : celestial.isDark
                                        ? "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                                        : "bg-white/90 hover:bg-white border-slate-200/80 text-slate-800"
                                }`}
                            >
                                <FaPalette size={11} className={showColorPicker ? "text-amber-400" : celestial.isDark ? "text-sky-300" : "text-indigo-600"} />
                                <span className="font-bold text-[10.5px] sm:text-[11px] hidden sm:inline">Color</span>
                                {/* Color preview swatch dot */}
                                <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/80 shadow-xs flex-shrink-0"
                                    style={{
                                        background:
                                            bannerTheme === "auto"
                                                ? "linear-gradient(135deg, #f59e0b, #ec4899, #6366f1)"
                                                : activeIndicatorColor,
                                    }}
                                />
                            </button>

                            {/* Elegant Glassmorphic Color Palette Popover */}
                            {showColorPicker && (
                                <div className="absolute right-0 top-full mt-2.5 w-84 sm:w-96 max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-3.5 sm:p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
                                    {/* Header & Section Tab Switcher */}
                                    <div className="pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <FaPalette size={12} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">Theme Customizer</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Customize Banner & Sidebar</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (customizerTab === "banner") {
                                                        handleSelectTheme("auto");
                                                    } else {
                                                        handleSelectSidebarTheme("default");
                                                    }
                                                }}
                                                className="text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                                title="Reset current section to default theme"
                                            >
                                                <FaUndoAlt size={9} /> Reset
                                            </button>
                                        </div>

                                        {/* 2-Tab Navigation Switcher */}
                                        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
                                            <button
                                                type="button"
                                                onClick={() => setCustomizerTab("banner")}
                                                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    customizerTab === "banner"
                                                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                            >
                                                <span>📊 Header Banner</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCustomizerTab("sidebar")}
                                                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    customizerTab === "sidebar"
                                                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                            >
                                                <span>📑 Sidebar Menu</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* TAB 1: HEADER BANNER CUSTOMIZER */}
                                    {customizerTab === "banner" && (
                                        <div>
                                            {/* Blue Shaders Collection */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
                                                    🌊 Banner Blue Shades
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                                    8 Shades
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3.5">
                                                {PRESET_THEMES.filter((t) => t.category === "blue").map((theme) => {
                                                    const isSelected = bannerTheme === theme.id;
                                                    return (
                                                        <button
                                                            key={theme.id}
                                                            type="button"
                                                            onClick={() => handleSelectTheme(theme.id)}
                                                            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                                                isSelected
                                                                    ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/40 scale-102"
                                                                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-50/50 hover:border-sky-300 dark:hover:bg-slate-800/80"
                                                            }`}
                                                            title={theme.name}
                                                        >
                                                            <div
                                                                className="w-5 h-5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center transition-transform group-hover:scale-110"
                                                                style={{ background: theme.color }}
                                                            >
                                                                {isSelected && <FaCheck size={8} className="text-white drop-shadow-sm" />}
                                                            </div>
                                                            <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                                                {theme.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Other Executive Palettes */}
                                            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                ✨ Other Executive Palettes
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3.5">
                                                {PRESET_THEMES.filter((t) => t.category === "other").map((theme) => {
                                                    const isSelected = bannerTheme === theme.id;
                                                    return (
                                                        <button
                                                            key={theme.id}
                                                            type="button"
                                                            onClick={() => handleSelectTheme(theme.id)}
                                                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                                                isSelected
                                                                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/30 scale-102"
                                                                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-slate-300"
                                                            }`}
                                                            title={theme.name}
                                                        >
                                                            <div
                                                                className="w-4.5 h-4.5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center transition-transform group-hover:scale-110"
                                                                style={{ background: theme.color }}
                                                            >
                                                                {isSelected && <FaCheck size={7.5} className="text-white drop-shadow-sm" />}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                                                {theme.name.replace(" (Time)", "")}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Custom Color Section */}
                                            <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                                                <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                    <span>🎨 Custom Banner Color</span>
                                                    {bannerTheme === "custom" && (
                                                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                                                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer group">
                                                        <input
                                                            type="color"
                                                            value={customBannerColor}
                                                            onChange={(e) => handleCustomColorChange(e.target.value)}
                                                            className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
                                                            title="Click to choose custom banner color"
                                                        />
                                                    </div>
                                                    <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                                        <span className="text-slate-400 text-xs font-mono select-none">#</span>
                                                        <input
                                                            type="text"
                                                            value={customBannerColor.replace("#", "")}
                                                            onChange={(e) => {
                                                                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                                                                if (raw.length === 6) {
                                                                    handleCustomColorChange("#" + raw);
                                                                } else {
                                                                    setCustomBannerColor("#" + raw);
                                                                }
                                                            }}
                                                            placeholder="3B82F6"
                                                            className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
                                                            maxLength={6}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCustomColorChange(customBannerColor)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                            bannerTheme === "custom"
                                                                ? "bg-indigo-600 text-white shadow-xs"
                                                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                                                        }`}
                                                    >
                                                        {bannerTheme === "custom" ? "Applied" : "Apply"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: SIDEBAR MENU CUSTOMIZER */}
                                    {customizerTab === "sidebar" && (
                                        <div>
                                            {/* Blue Shaders Collection */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
                                                    🌊 Sidebar Blue Shades
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                                    7 Shades
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3.5">
                                                {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "blue").map((theme) => {
                                                    const isSelected = sidebarTheme === theme.id;
                                                    return (
                                                        <button
                                                            key={theme.id}
                                                            type="button"
                                                            onClick={() => handleSelectSidebarTheme(theme.id)}
                                                            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                                                isSelected
                                                                    ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/40 scale-102"
                                                                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-50/50 hover:border-sky-300 dark:hover:bg-slate-800/80"
                                                            }`}
                                                            title={theme.name}
                                                        >
                                                            <div
                                                                className="w-5 h-5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center transition-transform group-hover:scale-110"
                                                                style={{ background: theme.color }}
                                                            >
                                                                {isSelected && <FaCheck size={8} className="text-white drop-shadow-sm" />}
                                                            </div>
                                                            <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                                                {theme.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Other Sidebar Palettes */}
                                            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                ✨ Other Sidebar Palettes
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3.5">
                                                {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "other").map((theme) => {
                                                    const isSelected = sidebarTheme === theme.id;
                                                    return (
                                                        <button
                                                            key={theme.id}
                                                            type="button"
                                                            onClick={() => handleSelectSidebarTheme(theme.id)}
                                                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                                                isSelected
                                                                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/30 scale-102"
                                                                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-slate-300"
                                                            }`}
                                                            title={theme.name}
                                                        >
                                                            <div
                                                                className="w-4.5 h-4.5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center transition-transform group-hover:scale-110"
                                                                style={{ background: theme.color }}
                                                            >
                                                                {isSelected && <FaCheck size={7.5} className="text-white drop-shadow-sm" />}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                                                {theme.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Custom Sidebar Color Section */}
                                            <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                                                <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                    <span>🎨 Custom Sidebar Color</span>
                                                    {sidebarTheme === "custom" && (
                                                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                                                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer group">
                                                        <input
                                                            type="color"
                                                            value={sidebarCustomHex}
                                                            onChange={(e) => handleSidebarCustomColorChange(e.target.value)}
                                                            className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
                                                            title="Click to choose custom sidebar color"
                                                        />
                                                    </div>
                                                    <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                                        <span className="text-slate-400 text-xs font-mono select-none">#</span>
                                                        <input
                                                            type="text"
                                                            value={sidebarCustomHex.replace("#", "")}
                                                            onChange={(e) => {
                                                                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                                                                if (raw.length === 6) {
                                                                    handleSidebarCustomColorChange("#" + raw);
                                                                } else {
                                                                    setSidebarCustomHex("#" + raw);
                                                                }
                                                            }}
                                                            placeholder="001F54"
                                                            className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
                                                            maxLength={6}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSidebarCustomColorChange(sidebarCustomHex)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                            sidebarTheme === "custom"
                                                                ? "bg-sky-600 text-white shadow-xs"
                                                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                                                        }`}
                                                    >
                                                        {sidebarTheme === "custom" ? "Applied" : "Apply"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DashboardLiveClock isDark={celestial.isDark} />
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="group relative overflow-hidden flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all duration-200 text-[11px] sm:text-xs font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {/* Animated light-sweep reflection */}
                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />
                            <FaSyncAlt size={10.5} className={`text-orange-400 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                            <span className="whitespace-nowrap">{refreshing ? "Syncing..." : "Refresh"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-2.5 sm:gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 backdrop-blur-xl px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-xs">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={15} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            Aap sirf apni assigned territory ka dashboard data dekh sakte hain.
                            {mrTerritoryInfo.territories.length > 0 && (
                                <>
                                    {" "}Assigned:
                                    {" "}
                                    {Array.from(
                                        new Set(
                                            mrTerritoryInfo.territories.map(
                                                (t) => t.companyName || t.companyCode
                                            )
                                        )
                                    ).join(", ")}
                                </>
                            )}
                        </p>
                        {mrTerritoryInfo.territories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {mrTerritoryInfo.territories.map((t, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-800"
                                    >
                                        <FaBuilding size={8} />
                                        {t.companyName || t.companyCode}
                                        {t.divisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.divisionName}
                                            </>
                                        ) : null}
                                        {t.subDivisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.subDivisionName}
                                            </>
                                        ) : null}
                                        {t.categoryName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.categoryName}
                                            </>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== FLOATING CALM LUXURY GLASS TAB BAR (MOBILE SWIPEABLE RIBBON) ==================== */}
            <div className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-1 px-1 sm:mx-0 sm:px-0">
                <div className="inline-flex sm:flex sm:flex-wrap items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-2xl backdrop-saturate-180 shadow-xs min-w-max sm:min-w-0">
                    {tabs.map((tab) => {
                        const IconComponent = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`
                                    relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold
                                    transition-all duration-300 cursor-pointer border flex-shrink-0 whitespace-nowrap
                                    ${isActive
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md scale-[1.02]"
                                        : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                                    }
                                `}
                            >
                                <IconComponent size={13} className={isActive ? "text-orange-400 dark:text-orange-500" : "opacity-70"} />
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${isActive
                                    ? "bg-orange-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}>
                                    {tab.badge}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ==================== TAB CONTENT RENDERING (ZERO-CLS SKELETON) ==================== */}
            {loading && !data ? (
                <div className="flex flex-col gap-5 animate-pulse">
                    {/* KPI Cards Placeholder Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="h-32 rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-orange-400/20 shadow-xs p-5 flex flex-col justify-between">
                                <div className="flex justify-between items-center">
                                    <div className="h-3.5 w-24 bg-orange-200/60 dark:bg-slate-700 rounded-full" />
                                    <div className="h-8 w-8 bg-orange-200/60 dark:bg-slate-700 rounded-xl" />
                                </div>
                                <div>
                                    <div className="h-7 w-32 bg-orange-300/60 dark:bg-slate-600 rounded-lg mb-2" />
                                    <div className="h-3 w-20 bg-orange-200/40 dark:bg-slate-700 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Charts Placeholder Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="h-80 rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-orange-400/20 p-6 flex flex-col justify-between">
                            <div className="h-4 w-40 bg-orange-200/60 dark:bg-slate-700 rounded-full" />
                            <div className="h-56 bg-orange-50/50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        </div>
                        <div className="h-80 rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-orange-400/20 p-6 flex flex-col justify-between">
                            <div className="h-4 w-40 bg-orange-200/60 dark:bg-slate-700 rounded-full" />
                            <div className="h-56 bg-orange-50/50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* TAB 1: EXECUTIVE OVERVIEW */}
                    {activeTab === "overview" && (
                        <>
                            <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                            <KPICards kpis={data?.kpis} />
                            <DashboardCharts charts={data?.charts} />
                            <AnalyticsCards analytics={data?.analytics} />
                        </>
                    )}

                    {/* TAB 2: SALES & REVENUE */}
                    {activeTab === "sales" && (
                        <>
                            <KPICards kpis={data?.kpis} />
                            <DashboardCharts charts={data?.charts} />
                        </>
                    )}

                    {/* TAB 3: INVENTORY & EXPIRY */}
                    {activeTab === "inventory" && (
                        <>
                            <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                            <KPICards kpis={data?.kpis} />
                            <DashboardCharts charts={data?.charts} />
                        </>
                    )}

                    {/* TAB 4: CREDIT & RECEIVABLES */}
                    {activeTab === "credit" && (
                        <>
                            <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                            <KPICards kpis={data?.kpis} />
                            <CreditDashboardCharts charts={data?.charts} />
                        </>
                    )}

                    {/* TAB 5: PURCHASE & VENDORS */}
                    {activeTab === "purchase" && (
                        <>
                            <KPICards kpis={data?.kpis} />
                            <PurchaseDashboardCharts charts={data?.charts} />
                            <AnalyticsCards analytics={data?.analytics} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}